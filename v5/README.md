# What's Above Me: v5 (the scene)

The list becomes a place you scroll through. Search for a town (or use your location), land on the ground, and scroll **up** through every layer of the sky into space. The sky matches the real time of day, and the weather shows on the ground.

Objects are simple glowing markers in this version. The illustrations come in v6.

## What's new since v4

| v4 | v5 |
|---|---|
| Type coordinates | **Place search** + "Use my location" (with a town name) |
| A list of layers | A tall scrolling scene: ground at the bottom, stars at the top |
| No weather | Live temperature, condition, high/low, feels like |
| Same colours always | Sky and land follow the real sun: day, sunset, twilight, night |
| | Altimeter showing your height as you scroll |
| | Twinkling star field that fades in as you rise |
| | Remembers your last place |
| | Refreshes every 60 seconds |

## Setup

Needs Node.js 18 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000 in Chrome or Edge, search a place, then scroll up.

## Project structure

```
v5/
├── server.js              /api/above, /api/geocode, /api/reverse
├── layers.js
├── sources/
│   ├── weather.js         NEW: Open-Meteo weather
│   ├── places.js          NEW: place search + town name for a lat/lon
│   ├── solar-system.js    Now also: moon phase + skyInfo() for time of day
│   ├── aircraft.js        Now also: heading + aircraft type (for v6 art)
│   └── ...                (same as v4)
└── public/
    ├── index.html         Entry card, top bar, altimeter, world
    ├── style.css          Scene layout, time-of-day colours, markers
    └── app.js             Scene building, scrolling, star canvas, search
```

## API

### `GET /api/above?lat=..&lon=..&minEl=..`
Same as v4, plus:

```json
{
  "sky": { "sunAlt": -18.2, "phase": "night" },
  "weather": { "kind": "partly", "label": "Partly cloudy", "cloud": 45, "temp": 10, "feels": 7, "high": 15, "low": 8, "utcOffset": 3600 }
}
```

### `GET /api/geocode?q=dunboyne`
Up to 6 matches: `[{ "name": "Dunboyne", "region": "Leinster, Ireland", "lat": 53.42, "lon": -6.47 }]`

### `GET /api/reverse?lat=53.42&lon=-6.47`
`{ "name": "Dunboyne", "region": "County Meath, Ireland" }`. Falls back to "Your location" if it fails.

## How it works

**Time of day:** `skyInfo()` works out how high the sun is:

| Sun altitude | Phase |
|---|---|
| above 6° | day |
| -4° to 6° | sunset |
| -12° to -4° | twilight |
| below -12° | night |

The page sets `<body data-phase="...">`, and CSS swaps the land and water colours. The sky gradient starts from that phase's colours at the ground and fades to black higher up.

**Weather:** Open-Meteo returns a WMO weather code. `weather.js` maps it to a general condition (clear, partly, cloudy, fog, rain, snow, storm) plus a label.

**The scroll world (`public/app.js`)**
- The page is one tall column of bands, one per layer, with the ground at the bottom. On load it scrolls straight to the bottom.
- **Left/right:** from compass direction, as if you're facing south (south in the middle, north at both edges).
- **Up/down:** from height inside the layer on a log scale, so 600 km and 10,000 km both fit.
- Overlapping markers get nudged apart.
- **One animation loop:** `requestAnimationFrame` only recalculates when `scrollY` changes. It converts the scroll position back into a height for the altimeter, blends the sky colour, and sets how bright the stars are.
- **Stars:** drawn on a fixed canvas. Their brightness depends on height, time of day and cloud.
- **Layer titles:** an IntersectionObserver fades each title in the first time you reach it.

**Search:** waits 220 ms after you stop typing, and ignores replies to older searches (`searchSeq`) so results never arrive out of order. Arrow keys and Enter work.

**Hover:** each marker has a native tooltip with distance, height, direction and detail.

## Limits

- Markers instead of illustrations
- No animation beyond fades and twinkling
- Basic browser tooltips
- No offline/sample mode

## Data sources

| Data | Source | Key needed |
|---|---|---|
| Place search | [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) | No |
| Town name for your location | [OpenStreetMap Nominatim](https://nominatim.org) | No |
| Weather | [Open-Meteo](https://open-meteo.com) | No |
| Satellites | [CelesTrak](https://celestrak.org) + [satellite.js](https://github.com/shashwatak/satellite-js) | No |
| Planes | [adsb.lol](https://api.adsb.lol) | No |
| Weather balloons | [SondeHub](https://sondehub.org) | No |
| Aurora | [NOAA SWPC](https://www.swpc.noaa.gov) | No |
| Fireballs | [NASA CNEOS](https://cneos.jpl.nasa.gov/fireballs/) | No |
| Asteroids | [JPL SBDB Close-Approach API](https://ssd-api.jpl.nasa.gov/doc/cad.html) | No |
| Sun, Moon, planets, stars | [astronomy-engine](https://github.com/cosinekitty/astronomy) | No |
