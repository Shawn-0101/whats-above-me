# What's Above Me: v1 (proof of concept)

A small Node.js script that lists what's in the sky above a location right now.

This version answers one question before anything else gets built: **can I actually calculate what's above a set of coordinates?** No server and no UI, just the maths and a printed table.

## What it shows

- Space stations (ISS, Tiangong and a few others)
- The Sun, Moon and planets

For each object above the horizon you get:

| Column | Meaning |
|---|---|
| Distance | Straight-line distance from you |
| Height | Height above the ground (satellites only) |
| Where | Compass direction and how many degrees above the horizon |

## Setup

Needs Node.js 18 or newer.

```bash
npm install
node above.js <lat> <lon>
```

Example (Dunboyne, Co. Meath):

```bash
node above.js 53.4219 -6.4745
```

```
Above 53.4219, -6.4745 at 10/10/2026, 20:35:30

Name                    Kind                Distance        Height           Where
----------------------------------------------------------------------------------
Saturn                  planet               8.44 AU                     E, 17° up
Uranus                  planet              18.76 AU                     NE, 3° up
Neptune                 planet              28.91 AU                    SE, 19° up

ISS is below your horizon right now (3,715 km away, -10°)
```

West longitudes and south latitudes are negative.

## How it works

**Satellites**
1. Downloads orbit data (TLEs) for the space stations from [CelesTrak](https://celestrak.org).
2. Saves it to `tle-stations.txt` and reuses it for 2 hours, because CelesTrak blocks repeat downloads.
3. Uses [satellite.js](https://github.com/shashwatak/satellite-js) (the SGP4 model) to work out where each satellite is right now.
4. Converts that position into elevation, azimuth and distance from your location.

**Sun, Moon and planets**
1. Uses [astronomy-engine](https://github.com/cosinekitty/astronomy) to get each body's position in the sky.
2. Converts it to elevation and azimuth for your location. No API needed, it's all calculated locally.

Anything with an elevation above 0° is above your horizon.

## Checking the results

Compare the output with [Heavens-Above](https://www.heavens-above.com) (ISS) or [Stellarium Web](https://stellarium-web.org) (planets) for the same place and time. Directions and angles should match within a degree or two.

## Limits

- Only the space stations, not all satellites
- No planes, weather, stars or anything else yet
- Prints to the terminal only

## Built with

- [satellite.js](https://github.com/shashwatak/satellite-js)
- [astronomy-engine](https://github.com/cosinekitty/astronomy)
- [CelesTrak](https://celestrak.org) orbit data
