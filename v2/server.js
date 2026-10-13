// What's Above Me - v2
// express server + JSON API + basic web page
// npm start -> http://localhost:3000

import express from 'express';
import { observer } from './sources/geo.js';
import { satellites } from './sources/satellites.js';
import { aircraft } from './sources/aircraft.js';
import { solarSystem } from './sources/solar-system.js';

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

  // run the live sources at the same time, one failing shouldn't kill the rest
  const [satRes, planeRes] = await Promise.allSettled([
    satellites(obs, now, minEl),
    aircraft(obs, minEl),
  ]);

  const sources = {};
  const items = [];

  if (satRes.status === 'fulfilled') {
    items.push(...satRes.value.items);
    sources.satellites = `ok (${satRes.value.checked.toLocaleString('en-IE')} checked)`;
  } else {
    sources.satellites = `failed: ${satRes.reason.message}`;
  }

  if (planeRes.status === 'fulfilled') {
    items.push(...planeRes.value);
    sources.aircraft = 'ok';
  } else {
    sources.aircraft = `failed: ${planeRes.reason.message}`;
  }

  items.push(...solarSystem(obs, now, minEl));
  sources.solarSystem = 'ok';

  items.sort((a, b) => a.distanceKm - b.distanceKm); // closest first

  res.json({ lat, lon, minEl, time: now.toISOString(), sources, items });
});

app.listen(PORT, () => console.log(`What's Above Me running at http://localhost:${PORT}`));
