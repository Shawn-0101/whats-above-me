# What's Above Me: v3 (more sources + layers)

Adds weather balloons, aurora, fireballs, asteroids and bright stars, then groups everything into the layers of the sky: troposphere, stratosphere, mesosphere, thermosphere, exosphere, high orbit, solar system and stars.

## What's new since v2

| v2 | v3 |
|---|---|
| Satellites, planes, Sun/Moon/planets | + weather balloons, aurora, fireballs, asteroids, 18 bright stars |
| One flat list grouped by kind | Grouped by **layer of the sky**, shown top to bottom |
| Each source filtered by elevation itself | Server filters in one place (some items have no "now" position) |
| Each source did its own `fetch` | Shared `getJson()` helper with headers and a timeout |

## Setup

Needs Node.js 18 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000, enter coordinates and press **Look up**.

## Project structure

```
v3/
├── server.js              Express server and the /api/above route
├── layers.js              Layer definitions + groupIntoLayers()
├── sources/
│   ├── http.js            getJson() with headers + timeout
│   ├── geo.js             Shared maths (look angles, ground distance)
│   ├── satellites.js      CelesTrak TLEs + satellite.js
│   ├── aircraft.js        Live planes from adsb.lol
│   ├── balloons.js        Weather balloons from SondeHub
│   ├── aurora.js          NOAA OVATION aurora forecast + Kp
│   ├── fireballs.js       NASA CNEOS fireball records
│   ├── asteroids.js       JPL close-approach data
│   ├── solar-system.js    Sun, Moon, planets via astronomy-engine
│   └── stars.js           Bright named stars via astronomy-engine
└── public/
    ├── index.html
    ├── style.css
    └── app.js             Calls the API and draws each layer
```

## API

```
GET /api/above?lat=53.4219&lon=-6.4745&minEl=20
```

| Param | Meaning | Default |
|---|---|---|
| `lat` | Latitude, -90 to 90 | required |
| `lon` | Longitude, -180 to 180 | required |
| `minEl` | Minimum degrees above the horizon | 20 |

The response now has `layers` instead of a flat `items` list:

```json
{
  "lat": 53.4219, "lon": -6.4745, "minEl": 20,
  "time": "2026-10-13T17:40:00.000Z",
  "satelliteCatalog": 12347,
  "sources": { "satellites": "ok", "aircraft": "ok", "balloons": "ok", "aurora": "failed: HTTP 503", "...": "..." },
  "layers": [
    { "id": "troposphere", "name": "Troposphere", "range": "0 to 12 km", "items": [ ... ] },
    { "id": "stars", "name": "Stars", "range": "light-years away", "items": [ ... ] }
  ]
}
```

Every item has the same shape: `kind, name, detail, distanceKm, altitudeKm, elevation, azimuth`. Stars use `lightYears` instead of `distanceKm`.

## Layers

| Layer | Range | Usually contains |
|---|---|---|
| Troposphere | 0 to 12 km | Planes |
| Stratosphere | 12 to 50 km | Weather balloons |
| Mesosphere | 50 to 85 km | Fireballs |
| Thermosphere | 85 to 600 km | Aurora, ISS, Starlink |
| Exosphere | 600 to 10,000 km | Weather and science satellites |
| High Earth orbit | 10,000 km + | GPS, geostationary |
| Solar system | | Moon, Sun, planets, asteroids |
| Stars | light-years | Bright named stars |

`layers.js` picks the layer from `altitudeKm`. No altitude means solar system; `lightYears` means stars.

## How the new sources work

| Source | How |
|---|---|
| **Balloons** | SondeHub returns every radiosonde heard in the last 3 hours within 400 km. Each reports lat/lon/alt, so `lookAt()` turns it into angles, same as planes. |
| **Aurora** | NOAA publishes a grid of aurora probability on whole degrees. Round your lat/lon (longitude as 0 to 360) and read your cell. The latest Kp index is added as detail. |
| **Fireballs** | CNEOS records are historical. Keep the ones within 500 km (haversine distance in `groundKm()`), take the newest, and mark it `past: true`. |
| **Asteroids** | JPL's close-approach API lists the closest upcoming passes. There's no sky position, so they're marked `notPlaced` and only show a distance. |
| **Stars** | 18 bright stars with fixed RA/Dec. `Astro.Horizon()` converts them to elevation and azimuth, exactly like the planets. |

The server filters by `minEl` after collecting everything, but lets aurora, asteroids and past fireballs through since they don't have a real "where is it now" position.

## Limits

- Still a plain list
- Starlink still floods the satellite rows
- If CelesTrak blocks you and there's no saved copy, satellites disappear

## Data sources

| Data | Source | Key needed |
|---|---|---|
| Satellites | [CelesTrak](https://celestrak.org) + [satellite.js](https://github.com/shashwatak/satellite-js) | No |
| Planes | [adsb.lol](https://api.adsb.lol) | No |
| Weather balloons | [SondeHub](https://sondehub.org) | No |
| Aurora | [NOAA SWPC](https://www.swpc.noaa.gov) | No |
| Fireballs | [NASA CNEOS](https://cneos.jpl.nasa.gov/fireballs/) | No |
| Asteroids | [JPL SBDB Close-Approach API](https://ssd-api.jpl.nasa.gov/doc/cad.html) | No |
| Sun, Moon, planets, stars | [astronomy-engine](https://github.com/cosinekitty/astronomy) | No |
