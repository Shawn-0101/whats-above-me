# What's Above Me

A web app that shows what's above you at any moment, layer by layer, from planes and weather balloons up through the atmosphere to satellites, planets and stars. All of it comes from free public data.

## Versions

| Version | Folder | What it adds | Status |
|---|---|---|---|
| v1 | [`v1/`](v1) | Proof of concept: a terminal script for space stations, Sun, Moon and planets | Done |
| v2 | `v2/` | Express server, JSON API and a basic web page; all satellites and live planes | Planned |
| v3 | `v3/` | More sources (balloons, aurora, fireballs, asteroids, stars), grouped into atmosphere layers | Planned |
| v4 | `v4/` | "Interesting only" filter, ghosts (last time something was overhead), satellite data caching | Planned |
| v5 | `v5/` | The scene: place search, live weather, time-of-day sky, scroll from the ground up to space | Planned |
| v6 | `v6/` | Illustrations, animation, hover cards, weather effects, sample-data mode, deployment | Planned |

## Running a version

```bash
cd v1
npm install
node above.js 53.4219 -6.4745
```

Each version's README has its own instructions.

## Data sources

| Data | Source |
|---|---|
| Satellite orbits | [CelesTrak](https://celestrak.org) |
| Sun, Moon, planets | [astronomy-engine](https://github.com/cosinekitty/astronomy) (calculated locally) |

More sources are added in later versions.

## License

MIT
