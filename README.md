# What's Above Me

A web app that shows what's above you at any moment, layer by layer, from planes and weather balloons up through the atmosphere to satellites, planets and stars. You start on the ground in an illustrated scene and scroll up into space. All of it comes from free public data, no API keys needed.

This repo builds the project up in versions, from a first test of the idea to the finished app. Each folder is a working snapshot with its own README explaining what changed and how it works.

## Versions

| Version | Folder | What it adds |
|---|---|---|
| v1 | [`v1/`](v1) | Proof of concept: a terminal script for space stations, Sun, Moon and planets |
| v2 | [`v2/`](v2) | Express server, JSON API and a basic web page; all satellites and live planes |
| v3 | [`v3/`](v3) | Balloons, aurora, fireballs, asteroids and stars, grouped into the layers of the sky |
| v4 | [`v4/`](v4) | "Interesting only" filter, ghosts (last time something was overhead), backup satellite data |
| v5 | [`v5/`](v5) | The scene: place search, live weather, time-of-day sky, scroll from the ground up to space |
| v6 | [`v6/`](v6) | Illustrations, animation, hover cards, weather effects, sample-data mode, Docker |

## Running a version

```bash
cd v6
npm install
npm start
```

Then open http://localhost:3000. v1 is a terminal script instead: `node above.js 53.4219 -6.4745`.

## Data sources

| Data | Source |
|---|---|
| Satellite orbits | [CelesTrak](https://celestrak.org) |
| Planes | [adsb.lol](https://api.adsb.lol) |
| Weather balloons | [SondeHub](https://sondehub.org) |
| Aurora | [NOAA SWPC](https://www.swpc.noaa.gov) |
| Fireballs | [NASA CNEOS](https://cneos.jpl.nasa.gov/fireballs/) |
| Asteroids | [JPL SBDB Close-Approach API](https://ssd-api.jpl.nasa.gov/doc/cad.html) |
| Weather + place search | [Open-Meteo](https://open-meteo.com) |
| Town names | [OpenStreetMap Nominatim](https://nominatim.org) |
| Sun, Moon, planets, stars | [astronomy-engine](https://github.com/cosinekitty/astronomy) (calculated locally) |

## Built with

Node.js, Express, [satellite.js](https://github.com/shashwatak/satellite-js), [astronomy-engine](https://github.com/cosinekitty/astronomy), vanilla JS, SVG and Canvas.

## License

MIT
