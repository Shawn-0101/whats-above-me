// every active satellite, from CelesTrak TLEs + satellite.js
//
// celestrak 403s you if you grab the same file within ~2h, so:
// - save it to disk and reuse it for 2h (survives restarts)
// - share one download between requests
// - if a refresh fails, use the old copy
// - if there's no copy at all, grab the small groups (stations + brightest) instead
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sat from 'satellite.js';
import { UA } from './http.js';
import { deg } from './geo.js';

const BASE = 'https://celestrak.org/NORAD/elements/gp.php?FORMAT=tle&GROUP=';
const TLE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tle-cache.txt');
const MAX_AGE = 2 * 3600e3;
const RETRY_SOON = MAX_AGE - 15 * 60e3; // pretend it's this old so we retry in 15 min

let cache = { at: 0, sats: [], note: '' };
let loading = null;

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

async function download(group) {
  const res = await fetch(BASE + group, { headers: UA, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`CelesTrak HTTP ${res.status}`);
  return res.text();
}

async function refresh() {
  let disk = null;
  try { disk = { at: fs.statSync(TLE_FILE).mtimeMs, text: fs.readFileSync(TLE_FILE, 'utf8') }; } catch { }

  // copy on disk is fresh enough, don't bother celestrak
  if (disk && Date.now() - disk.at < MAX_AGE) return { at: disk.at, sats: parse(disk.text), note: '' };

  try {
    const text = await download('active');
    fs.writeFileSync(TLE_FILE, text);
    return { at: Date.now(), sats: parse(text), note: '' };
  } catch (e) {
    if (disk) {
      const hrs = Math.round((Date.now() - disk.at) / 3600e3);
      console.warn(`satellite refresh failed (${e.message}), using ${hrs}h old copy`);
      return { at: Date.now() - RETRY_SOON, sats: parse(disk.text), note: `using ${hrs}h old orbit data` };
    }

    // nothing saved: the small groups still cover the ISS, Tiangong and ~100 brightest
    console.warn(`satellite download failed (${e.message}), trying small groups`);
    const parts = await Promise.allSettled(['stations', 'visual'].map(download));
    const text = parts.filter(p => p.status === 'fulfilled').map(p => p.value).join('\n');
    if (!text.trim()) throw e;
    return { at: Date.now() - RETRY_SOON, sats: parse(text), note: 'full list blocked, showing bright satellites only' };
  }
}

export async function loadTles() {
  if (cache.sats.length && Date.now() - cache.at < MAX_AGE) return cache.sats;
  loading ??= refresh().then(c => { cache = c; return c.sats; }).finally(() => { loading = null; });
  return loading;
}

export const satelliteNote = () => cache.note;

export async function satellites(obs, now, minEl) {
  const sats = await loadTles();
  const gmst = sat.gstime(now);
  const out = [];

  for (const s of sats) {
    const pv = sat.propagate(s.rec, now);
    if (!pv?.position || typeof pv.position === 'boolean') continue;

    const look = sat.ecfToLookAngles(obs.gd, sat.eciToEcf(pv.position, gmst));
    const elevation = deg(look.elevation);
    if (elevation < minEl) continue; // filter early, 12k of these

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
