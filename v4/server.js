// What's Above Me - v4
// ghosts + backup satellite data (the filter lives in the page)
// npm start -> http://localhost:3000

import express from 'express';
import { observer } from './sources/geo.js';
import { satellites, satelliteNote } from './sources/satellites.js';
import { stationGhosts } from './sources/ghosts.js';
import { aircraft } from './sources/aircraft.js';
import { balloons } from './sources/balloons.js';
import { aurora } from './sources/aurora.js';
import { fireballs } from './sources/fireballs.js';
import { asteroids } from './sources/asteroids.js';
import { solarSystem } from './sources/solar-system.js';
import { stars } from './sources/stars.js';
import { groupIntoLayers } from './layers.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// GET /api/above?lat=53.42&lon=-6.47&minEl=20
app.get('/api/above', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const minEl = req.query.minEl != null ? Number(req.query.minEl) : 20;

  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: 'Latitude must be -90 to 90 and longitude -180 to 180.' });
  }
  if (!isFinite(minEl) || minEl < 0 || minEl > 90) {
    return res.status(400).json({ error: 'Min elevation must be 0 to 90.' });
  }

  const now = new Date();
  const obs = observer(lat, lon);

  // all the live sources at once. one failing shouldn't kill the rest
  const jobs = {
    satellites: satellites(obs, now, minEl),
    aircraft: aircraft(obs),
    balloons: balloons(obs),
    aurora: aurora(obs),
    fireballs: fireballs(obs),
    asteroids: asteroids(),
    ghosts: stationGhosts(obs, now, minEl),
  };
  const names = Object.keys(jobs);
  const results = await Promise.allSettled(Object.values(jobs));

  const sources = {};
  const items = [];
  let satChecked = 0;

  results.forEach((r, i) => {
    const name = names[i];
    if (r.status === 'rejected') {
      sources[name] = `failed: ${r.reason?.message || r.reason}`;
      return;
    }
    let list = r.value;
    if (name === 'satellites') { satChecked = list.checked; list = list.items; }
    sources[name] = 'ok';
    items.push(...list);
  });

  // these are pure maths, no api
  items.push(...solarSystem(obs, now), ...stars(obs, now));
  sources.solarSystem = sources.stars = 'ok';
  if (sources.satellites === 'ok' && satelliteNote()) sources.satellites = `ok (${satelliteNote()})`;

  // keep things above the cutoff. aurora/asteroids/ghosts don't have a real "now" position
  const visible = items.filter(it => it.notPlaced || it.ghost || it.kind === 'Aurora' || it.elevation >= minEl);

  res.json({ lat, lon, minEl, time: now.toISOString(), satelliteCatalog: satChecked, sources, layers: groupIntoLayers(visible) });
});

app.listen(PORT, () => console.log(`What's Above Me running at http://localhost:${PORT}`));
