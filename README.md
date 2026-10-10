# Parkwise — multipage smart parking hackathon website

## Pages
- `index.html` — overview dashboard
- `parking.html` — searchable/filterable parking zones with demo reservation actions
- `violations.html` — violation queue with status filters and resolve actions
- `reports.html` — citizen issue submission and recent report feed
- `insights.html` — illustrative occupancy and zone analytics
- `settings.html` — local demo preferences and reset action

## Run locally
Extract the ZIP and open `index.html` in a modern browser. No build tool or install is required. All pages share `styles.css` and `app.js`. Google Fonts load from the internet; system fallbacks are included.

## Publish online
Upload the extracted folder to a static host such as Netlify or publish the files through GitHub Pages. Keep the files together in the same folder so page links and shared assets work.

## Important demo limitations
This is a front-end hackathon prototype. Parking capacities, occupancy, vehicle plates, reports, and violations are examples only. Reservations, resolved alerts, settings, and newly submitted reports are saved to the current browser with `localStorage`; they are not sent to a city authority or shared with other users. A real deployment would need a backend, authentication, verified map/sensor feeds, privacy safeguards, and integrations with relevant municipal systems.


## Online parking map data
The Find Parking page can query OpenStreetMap through Nominatim (place search) and Overpass API (mapped parking facilities and explicitly tagged no-parking/no-stopping restrictions) for locations in India. This requires an internet connection and may be limited by public service availability/rate limits. OpenStreetMap coverage is incomplete and these tags are not an authoritative legal determination. No live occupancy or open-space count is supplied. The sample parking cards remain demo data. Data attribution: © OpenStreetMap contributors (https://www.openstreetmap.org/copyright). The page also links to Greater Chennai Corporation road resources; its parking-road list should be verified manually before treating it as authoritative.


## Theme
Dark theme is enabled by default. Change it in Settings; the preference is saved in localStorage and shared across all pages.


## Deploy online data (important)

The browser-only Overpass calls can fail with `Failed to fetch` because of CORS or network restrictions. This version uses a Netlify Function as a same-origin server-side proxy. Deploy the **contents of this folder** to Netlify (the `netlify.toml` and `netlify/functions/parking.js` files must remain in place). Then open the deployed site and use Parking Finder. Opening the HTML directly or using only `python -m http.server` will not run the Netlify Function; online map-data search will therefore require deployment to Netlify. Geocoding still uses Photon/Nominatim from the browser. Map coverage is incomplete and this does not provide live parking occupancy.


## Run locally with the backend (Windows)

1. Extract the ZIP.
2. Open the `parkwise-multipage` folder.
3. Double-click `run-local.bat`.
4. Keep the terminal window open.
5. Open `http://127.0.0.1:8000/parking.html`.
6. Search for a location. The browser calls the local Python server at `/api/parking`; Python then contacts the OpenStreetMap Overpass endpoints.

Requirements: Python 3 installed and available as `py` in Command Prompt. No extra Python packages are needed. Do not open the HTML file directly and do not start `python -m http.server`; use `run-local.bat`.

If the app still reports that all data endpoints failed, the local proxy is running but your computer/network cannot reach the providers, or the providers are temporarily unavailable. The detailed provider errors should appear in the message. The app's geocoding still uses Photon/Nominatim in the browser. OpenStreetMap coverage may be incomplete and mapped parking does not indicate live occupancy.


## Accounts and roles (prototype)
`accounts.html` adds a role-preview screen for Citizen, Parking Operator, Traffic Officer, and Administrator. The selected profile is stored in browser localStorage and controls page visibility in the front-end. This is a UI demo only, NOT real authentication or secure authorization: anyone can change local storage or JavaScript. Do not use it to protect real user data or grant production admin powers. For production, add a trusted authentication provider and server-side role checks (for example, Supabase Auth + Postgres row-level security) before enabling real reservations or enforcement workflows.


## Sign-up and login (Supabase Auth)
This project now includes `auth.html`, `auth.js`, and `auth-config.js` for email/password sign-up, sign-in, session persistence, and sign-out using Supabase Auth. Supabase handles password hashing and the authentication endpoints use HTTPS; Parkwise does not store raw passwords.

### Enable it
1. Create a project at https://supabase.com/dashboard.
2. In Project Settings → API, copy the Project URL and the publishable key (or legacy anon key).
3. Edit `auth-config.js`: replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY` with those public values. Never use a `service_role` or secret key in browser code.
4. In Supabase Authentication → URL Configuration, set the Site URL to `https://parkwise-pranav.netlify.app` and add `https://parkwise-pranav.netlify.app/auth.html` to Redirect URLs. For local testing, also allow `http://127.0.0.1:8000/auth.html`.
5. Commit and push the files to GitHub; Netlify should redeploy. Then open `/auth.html` and create an account. If email confirmation is enabled, follow the confirmation email first.

### Security scope
This enables real identity authentication and redirects unauthenticated browsers to the sign-in page once Supabase is configured. Browser-side route guarding is not a substitute for server-side authorization. The current demo parking, reservation, report, and role-preview data is still browser-side; do not treat local role selection or localStorage as trusted permissions. Before using real records, add a database and Row Level Security (RLS) policies; assign operator/officer/admin roles only from a trusted server-side process. Keep the Supabase publishable/anon key public as intended, but never publish secret/service-role keys.


## Test Administrator login (manual sign-in; no auto-login)
- Username alias: `Bhuviking007`
- Account email: `bkgaming208@gmail.com`
- Display role: `Test Administrator` only when the authenticated Supabase user's trusted `app_metadata.role` is set to `test_administrator`.
- The login form accepts either the username alias or the email address. It does **not** create the hosted account or bypass the password. No password is embedded in the public source code.
- Create this user once in Supabase Dashboard → Authentication → Users → Add user, then assign the trusted app metadata role through an admin-only process. The user remains in Supabase across code/ZIP updates; you do not need to sign up again after each update.
- Keep the password private and unique. Never put a Supabase service-role/secret key in frontend files. A displayed role is not sufficient authorization: enforce privileged actions server-side and with database RLS.


## Server-side accounts (no Supabase)

Parkwise now uses its own Python server and SQLite database for account creation, password verification, and sessions. No Supabase account or API key is required. Do not open the HTML files directly; start the server and browse to `http://127.0.0.1:8000/auth.html`.

### Create the initial Test Administrator once

The account identity defaults to username `Bhuviking007` and email `bkgaming208@gmail.com`. Set the password as a server environment variable before the first launch. The password is never stored in source code; only a salted scrypt password hash is stored in SQLite. Example in PowerShell:

```powershell
$env:PARKWISE_ADMIN_PASSWORD = Read-Host "Set the Test Administrator password"
py server.py
```

Run that from the `parkwise-multipage` folder. Use a strong unique password (10+ characters). The account is seeded once in `parkwise.sqlite3`; subsequent source updates do not require signup again as long as you preserve the database file and persistent disk. If you want the exact same password as an earlier demo, set it only in your private server environment—not in a committed file.

Optional environment variables: `PARKWISE_ADMIN_USERNAME`, `PARKWISE_ADMIN_EMAIL`, `PARKWISE_DB_PATH`, `HOST`, and `PORT`. The role is assigned during trusted server-side seeding, not from browser form input. Citizen signup cannot self-assign administrator role.

### Deployment note

This is a server-backed app, not a static-only Netlify site. Netlify static hosting cannot run this Python server or preserve its SQLite database by itself. Deploy `server.py` to a Python-capable host with persistent storage, set `PARKWISE_ADMIN_PASSWORD` in that host's environment settings, and point the domain to that service. Use HTTPS in production. SQLite is suitable for a small demo; for a larger multi-instance production deployment, use a managed database and add rate limiting, CSRF protection, backups, and account recovery.


## Netlify JavaScript authentication (no Supabase)

This version uses a Netlify Function (`netlify/functions/auth.mjs`) and Netlify Blobs for persistent account records. Passwords are stored as PBKDF2 hashes, and sessions use an HttpOnly, signed cookie. The account dictionary and password hashes are held server-side—not in browser JavaScript.

### Configure once in Netlify

In **Site configuration → Environment variables**, add:

- `PARKWISE_SESSION_SECRET`: a randomly generated secret with at least 32 characters.
- `PARKWISE_ADMIN_PASSWORD`: a strong, unique password for the Test Administrator.
- `PARKWISE_ADMIN_USERNAME`: `Bhuviking007` (optional; this is the default).
- `PARKWISE_ADMIN_EMAIL`: `bkgaming208@gmail.com` (optional; this is the default).

Never put these values in a committed JavaScript file. Redeploy after setting variables. The Test Administrator record is bootstrapped server-side at first successful admin login; it is not automatically logged in. General users can sign up from the login screen. Netlify Blobs must be available for the site.

Netlify must deploy this repository as a site with Functions enabled. If your existing deployment uses a different publish directory/build command, merge the `netlify.toml` settings with your existing build settings rather than overwriting unrelated settings. The redirect maps `/api/auth/me`, `/api/auth/login`, `/api/auth/signup`, and `/api/auth/logout` to the server-side function.

### Security notes

A JavaScript object encrypted in frontend code is not a safe account database: users can inspect shipped code and recover embedded keys. This implementation keeps account records and secrets server-side. For production, add rate limiting, account recovery/email verification, and audit the authorization checks on every sensitive API. Netlify Blobs is persistent storage, but this lightweight account index is best suited to a demo rather than high-concurrency enterprise auth.


## Optional login behavior
Public Parkwise pages do not redirect visitors to the login screen. Visitors can browse without an account and open `auth.html` only when they choose to sign in or create an account. No automatic login is performed.


## Hardcoded demo admin (requested)
The Netlify Function contains a demo admin username/email/password and a session-signing secret, so the demo can be tested without setting those environment variables. Login is still manual. These values are inside server-side Function code, not frontend browser JS. However, if the GitHub repository is public, anyone can read the credentials and signing secret from the source. This is demo-only and must not be used for real admin data or production privileges. Change them before public use.


Recent update: Settings now offers Theme-tinted surfaces (default) and Neutral surfaces. Theme-tinted mode adjusts the card/background tint to match each accent; Neutral surfaces keeps a charcoal/slate dark appearance. Account creation now requires matching password confirmation and includes accessible show/hide eye buttons on password fields. The server validates password confirmation too.
