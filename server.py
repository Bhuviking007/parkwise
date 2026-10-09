#!/usr/bin/env python3
"""Local Parkwise development server with a lightweight geocoding proxy."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import json, os, socket, sys

HOST = "127.0.0.1"
PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/geocode":
            params = parse_qs(parsed.query)
            query = params.get("q", [""])[0].strip()
            if not query:
                self.send_json(400, {"error": "Enter a place name to search."})
                return
            # Photon is a separate geocoding service; the map itself loads directly
            # from OpenStreetMap tiles and does not depend on Overpass.
            try:
                url = "https://photon.komoot.io/api/?q=" + quote(query) + "&limit=1&lang=en"
                request = Request(url, headers={"Accept":"application/json", "User-Agent":"ParkwiseLocalDemo/1.0"})
                with urlopen(request, timeout=15) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                features = payload.get("features", [])
                if not features:
                    self.send_json(404, {"error":"No matching place was found. Try a shorter place name."})
                    return
                feature = features[0]
                coords = feature.get("geometry", {}).get("coordinates", [])
                if len(coords) < 2:
                    self.send_json(502, {"error":"The location service returned no coordinates."})
                    return
                props = feature.get("properties", {})
                # Prefer India matches when Photon returns several international results.
                if "india" not in query.lower():
                    india_feature = next((f for f in features if "india" in str(f.get("properties", {}).get("country", "")).lower()), None)
                    if india_feature:
                        feature = india_feature
                        coords = feature.get("geometry", {}).get("coordinates", [])
                        props = feature.get("properties", {})
                display = ", ".join(str(props[k]) for k in ("name", "city", "state", "country") if props.get(k))
                self.send_json(200, {"lat": coords[1], "lon": coords[0], "display_name": display or query})
            except HTTPError as exc:
                self.send_json(502, {"error": f"Location service returned HTTP {exc.code}."})
            except (URLError, TimeoutError, socket.timeout, json.JSONDecodeError, OSError) as exc:
                self.send_json(502, {"error": "Could not reach the location service. Check your internet connection and try again."})
            return
        return super().do_GET()

if __name__ == "__main__":
    os.chdir(ROOT)
    print("Parkwise local server starting...")
    print("Open: http://127.0.0.1:8000/parking.html")
    print("Press Ctrl+C to stop.")
    try:
        ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
    except OSError as exc:
        print(f"Could not start server: {exc}")
        print("Port 8000 may already be in use. Close the other server and try again.")
        sys.exit(1)
