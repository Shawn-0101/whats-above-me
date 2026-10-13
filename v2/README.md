# What's Above Me: v2 (web app)

The v1 calculation, moved behind an Express server with a JSON API and a basic web page. It also adds **every active satellite** and **live planes**.

## What's new since v1

| v1 | v2 |
|---|---|
| Terminal script | Express server + web page |
| Space stations only | All ~12,000 active satellites |
| No planes | Live planes from ADS-B |
| Everything above the horizon | Adjustable "min elevation" so "above you" means roughly overhead |
| One file | Code split into a `sources/` folder, one file per data source |

## Setup

Needs Node.js 18 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000, enter coordinates and press **Look up**.

## Project structure

```
v2/
├── server.js              Express server and the /api/above route
├── sources/
│   ├── geo.js             Shared maths (degrees/radians, look angles)
│   ├── satellites.js      CelesTrak TLEs + satellite.js
│   ├── aircraft.js        Live planes from adsb.lol
│   └── solar-system.js    Sun, Moon, planets via astronomy-engine
└── public/
    ├── index.html         The page
    ├── style.css
    └── app.js             Calls the API and draws the results
```

## API

```
GET /api/above?lat=53.4219&lon=-6.4745&minEl=20
```

| Param | Meaning | Default |
|---|---|---|
| `lat` | Latitude, -90 to 90 | required |
| `lon` | Longitude, -180 to 180 | required |
| `minEl` | Only include things at least this many degrees above the horizon | 20 |

Example response (shortened):

```json
{
  "lat": 53.4219,
  "lon": -6.4745,
  "minEl": 20,
  "time": "2026-10-12T17:20:37.992Z",
  "sources": {
    "satellites": "ok (12,347 checked)",
    "aircraft": "ok",
    "solarSystem": "ok"
  },
  "items": [
    {
      "kind": "Aircraft",
      "name": "RYR4KD",
      "detail": "B38M · EI-HEN · 812 km/h",
      "altitudeKm": 10.9,
      "distanceKm": 14.2,
      "elevation": 50.1,
      "azimuth": 120.4
    }
  ]
}
```

Items are sorted closest first. If one source fails, the rest still come back and `sources` says which one failed.

## How it works

**Server (`server.js`)**
1. Checks the query values and returns a `400` if they're out of range.
2. Runs satellites and planes at the same time with `Promise.allSettled`, so a slow or broken API doesn't block the others.
3. Adds the Sun, Moon and planets (calculated locally, no API).
4. Sorts everything by distance and sends it back as JSON.

**Satellites (`sources/satellites.js`)**
- Downloads the full active list from CelesTrak and saves it to `tle-active.txt`.
- Reuses that file for 2 hours (CelesTrak blocks repeat downloads), and falls back to the old copy if a refresh fails.
- If two requests arrive while it's downloading, they share the same download.
- Propagates every satellite with SGP4 and keeps the ones above `minEl`. That's about 12,000 calculations per request, which takes well under a second.

**Planes (`sources/aircraft.js`)**
- Asks adsb.lol for everything within 150 nautical miles.
- Planes give a latitude, longitude and altitude instead of an orbit, so `lookAt()` in `geo.js` converts that point into elevation, azimuth and distance.

**Page (`public/app.js`)**
- Sends the form values to `/api/above`, groups the results by kind and shows up to 40 per group.
- "Use my location" fills the form from the browser's location.

## Why "min elevation"?

In v1 anything above the horizon counted. For satellites that means objects thousands of kilometres away, low on the horizon. Setting a minimum angle (20° by default) makes "above you" mean "fairly high in your sky". Because it's an angle, the area it covers grows with height on its own: roughly 17 km around you for a plane at 10 km, and around 700 km for the ISS.

## Limits

- Plain list, no visuals yet
- Starlink can fill the satellite list
- No balloons, aurora, meteors, asteroids or stars yet

## Data sources

| Data | Source | Key needed |
|---|---|---|
| Satellites | [CelesTrak](https://celestrak.org) + [satellite.js](https://github.com/shashwatak/satellite-js) | No |
| Planes | [adsb.lol](https://api.adsb.lol) | No |
| Sun, Moon, planets | [astronomy-engine](https://github.com/cosinekitty/astronomy) | No |
