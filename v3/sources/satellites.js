// every active satellite, from CelesTrak TLEs + satellite.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sat from 'satellite.js';
import { deg } from './geo.js';

const TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';
const TLE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tle-active.txt');
const MAX_AGE = 2 * 3600e3; // celestrak 403s you if you grab the same file within ~2h

let cache = { at: 0, sats: [] };
let loading = null; // so two requests at once don't both download

function parse(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const sats = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    try {
      sats.push({ name: lines[i].trim(), rec: sat.twoline2satrec(lines[i + 1], lines[i + 2]) });
    } catch { } // skip any broken entry
  }
  return sats;
}

async function refresh() {
  let age = Infinity;
  try { age = Date.now() - fs.statSync(TLE_FILE).mtimeMs; } catch { }

  // copy on disk is fresh enough, don't bother celestrak
  if (age < MAX_AGE) return { at: Date.now() - age, sats: parse(fs.readFileSync(TLE_FILE, 'utf8')) };

  try {
    const res = await fetch(TLE_URL, {
      headers: { 'User-Agent': 'whats-above-me (hobby project)' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`CelesTrak HTTP ${res.status}`);
    const text = await res.text();
    fs.writeFileSync(TLE_FILE, text);
    return { at: Date.now(), sats: parse(text) };
  } catch (e) {
    if (age === Infinity) throw e;
    // old copy is better than nothing, try again in 15 min
    console.warn(`satellite refresh failed (${e.message}), using old copy`);
    return { at: Date.now() - MAX_AGE + 15 * 60e3, sats: parse(fs.readFileSync(TLE_FILE, 'utf8')) };
  }
}

async function loadTles() {
  if (cache.sats.length && Date.now() - cache.at < MAX_AGE) return cache.sats;
  loading ??= refresh().then(c => { cache = c; return c.sats; }).finally(() => { loading = null; });
  return loading;
}

export async function satellites(obs, now, minEl) {
  const sats = await loadTles();
  const gmst = sat.gstime(now);
  const out = [];

  for (const s of sats) {
    const pv = sat.propagate(s.rec, now);
    if (!pv?.position || typeof pv.position === 'boolean') continue;

    const look = sat.ecfToLookAngles(obs.gd, sat.eciToEcf(pv.position, gmst));
    const elevation = deg(look.elevation);
    if (elevation < minEl) continue; // not "above" us

    const v = pv.velocity; // km/s
    out.push({
      kind: 'Satellite',
      name: s.name,
      detail: `${Math.round(Math.hypot(v.x, v.y, v.z) * 3600).toLocaleString('en-IE')} km/h`,
      altitudeKm: sat.eciToGeodetic(pv.position, gmst).height,
      distanceKm: look.rangeSat,
      elevation,
      azimuth: deg(look.azimuth),
    });
  }
  return { items: out, checked: sats.length };
}
