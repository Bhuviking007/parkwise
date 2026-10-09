#!/usr/bin/env python3
"""Parkwise server: static site, SQLite-backed accounts/sessions, and geocoding proxy."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from http.cookies import SimpleCookie
import json, os, socket, sys, sqlite3, secrets, hashlib, hmac, time, re, threading

HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))
ROOT = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("PARKWISE_DB_PATH", os.path.join(ROOT, "parkwise.sqlite3"))
SESSION_SECONDS = 7 * 24 * 60 * 60
LOCK = threading.RLock()

def connect():
    c = sqlite3.connect(DB_PATH, timeout=15)
    c.row_factory = sqlite3.Row
    return c

def password_hash(password):
    salt = secrets.token_bytes(16)
    value = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return salt.hex() + ":" + value.hex()

def password_ok(password, stored):
    try:
        salt, expected = stored.split(":", 1)
        actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False

def init_db():
    with LOCK, connect() as c:
        c.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE COLLATE NOCASE NOT NULL, email TEXT UNIQUE COLLATE NOCASE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'citizen', created_at INTEGER NOT NULL)")
        c.execute("CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL)")
        # One-time seed: account identity is stable across code updates; password stays in server environment.
        username = os.environ.get("PARKWISE_ADMIN_USERNAME", "Bhuviking007")
        email = os.environ.get("PARKWISE_ADMIN_EMAIL", "bkgaming208@gmail.com")
        password = os.environ.get("PARKWISE_ADMIN_PASSWORD", "")
        existing = c.execute("SELECT id FROM users WHERE username=? OR email=?", (username, email)).fetchone()
        if not existing and password:
            c.execute("INSERT INTO users(username,email,password_hash,role,created_at) VALUES(?,?,?,?,?)",
                      (username, email, password_hash(password), "test_administrator", int(time.time())))
            print("Initial Test Administrator account created.")
        elif not existing:
            print("Test Administrator not seeded: set PARKWISE_ADMIN_PASSWORD in server environment before first launch.")
        c.execute("DELETE FROM sessions WHERE expires_at < ?", (int(time.time()),))

def safe_user(row):
    return {"username": row["username"], "email": row["email"], "role": row["role"]}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_json(self, status, payload, extra_headers=None):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for k, v in extra_headers:
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def token(self):
        cookies = SimpleCookie(self.headers.get("Cookie", ""))
        return cookies["parkwise_session"].value if cookies.get("parkwise_session") else ""

    def current_user(self):
        token = self.token()
        if not token: return None
        digest = hashlib.sha256(token.encode()).hexdigest()
        with LOCK, connect() as c:
            return c.execute("SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?", (digest, int(time.time()))).fetchone()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/auth/me":
            user = self.current_user()
            self.send_json(200, {"authenticated": bool(user), "user": safe_user(user) if user else None})
            return
        if parsed.path == "/api/geocode":
            query = parse_qs(parsed.query).get("q", [""])[0].strip()
            if not query:
                self.send_json(400, {"error": "Enter a place name to search."}); return
            try:
                url = "https://photon.komoot.io/api/?q=" + quote(query) + "&limit=5&lang=en"
                req = Request(url, headers={"Accept":"application/json", "User-Agent":"Parkwise/1.0"})
                with urlopen(req, timeout=12) as response: payload = json.loads(response.read().decode())
                features = payload.get("features", [])
                if not features:
                    self.send_json(404, {"error":"No matching place was found."}); return
                feature = features[0]
                if "india" not in query.lower():
                    feature = next((f for f in features if "india" in str(f.get("properties", {}).get("country", "")).lower()), feature)
                coords = feature.get("geometry", {}).get("coordinates", [])
                props = feature.get("properties", {})
                if len(coords) < 2: self.send_json(502, {"error":"Location service returned no coordinates."}); return
                display = ", ".join(str(props[k]) for k in ("name","city","state","country") if props.get(k))
                self.send_json(200, {"lat":coords[1],"lon":coords[0],"display_name":display or query})
            except (HTTPError, URLError, TimeoutError, socket.timeout, json.JSONDecodeError, OSError) as exc:
                self.send_json(502, {"error":"Could not reach the location service. Try again."})
            return
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/auth/"):
            self.send_json(404, {"error":"Not found."}); return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 16384: self.send_json(413, {"error":"Request too large."}); return
            body = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(body, dict): raise ValueError()
        except (ValueError, json.JSONDecodeError):
            self.send_json(400, {"error":"Invalid request."}); return

        if path == "/api/auth/logout":
            token = self.token()
            if token:
                with LOCK, connect() as c:
                    c.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(token.encode()).hexdigest(),))
            self.send_json(200, {"ok":True}, [("Set-Cookie","parkwise_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0")])
            return

        if path == "/api/auth/signup":
            email = str(body.get("identifier","")).strip().lower()
            password = str(body.get("password",""))
            name = str(body.get("name","")).strip()
            if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
                self.send_json(400, {"error":"Enter a valid email address to create an account."}); return
            if len(password) < 10:
                self.send_json(400, {"error":"Use a password with at least 10 characters."}); return
            username = re.sub(r"[^A-Za-z0-9_.-]", "", name)[:30] or email.split("@",1)[0][:30]
            with LOCK, connect() as c:
                if c.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
                    self.send_json(409, {"error":"An account with this email already exists. Sign in instead."}); return
                base, n = username, 1
                while c.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone():
                    n += 1; username = f"{base[:25]}{n}"
                c.execute("INSERT INTO users(username,email,password_hash,role,created_at) VALUES(?,?,?,?,?)",
                          (username,email,password_hash(password),"citizen",int(time.time())))
            self.send_json(201, {"ok":True,"message":"Account created. You can now sign in."}); return

        if path == "/api/auth/login":
            identifier = str(body.get("identifier","")).strip()
            password = str(body.get("password",""))
            with LOCK, connect() as c:
                row = c.execute("SELECT * FROM users WHERE username=? OR email=?", (identifier,identifier)).fetchone()
                if not row or not password_ok(password, row["password_hash"]):
                    self.send_json(401, {"error":"Invalid username/email or password."}); return
                token = secrets.token_urlsafe(32)
                digest = hashlib.sha256(token.encode()).hexdigest()
                expiry = int(time.time()) + SESSION_SECONDS
                c.execute("DELETE FROM sessions WHERE user_id=?", (row["id"],))
                c.execute("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)", (digest,row["id"],expiry))
                user = safe_user(row)
            cookie = f"parkwise_session={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={SESSION_SECONDS}"
            if self.headers.get("X-Forwarded-Proto","").lower() == "https": cookie += "; Secure"
            self.send_json(200, {"ok":True,"user":user}, [("Set-Cookie",cookie)])
            return
        self.send_json(404, {"error":"Unknown authentication endpoint."})

if __name__ == "__main__":
    os.chdir(ROOT)
    init_db()
    print(f"Parkwise server listening at http://{HOST}:{PORT}")
    print("Open http://127.0.0.1:8000/auth.html for manual sign-in.")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
