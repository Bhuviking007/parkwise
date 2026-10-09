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
