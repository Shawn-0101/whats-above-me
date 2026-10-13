// ghosts: the last time the space stations were overhead
// no history needed, we just run the orbit backwards
import * as sat from 'satellite.js';
import { loadTles } from './satellites.js';
import { deg } from './geo.js';

const STATIONS = [['ISS (ZARYA)', 'ISS'], ['CSS (TIANHE)', 'Tiangong space station']];
const LOOK_BACK = 72 * 3600; // 3 days, tles get less accurate further back
const STEP = 20; // seconds

export async function stationGhosts(obs, now, minEl) {
  const sats = await loadTles();
  const cutoff = Math.max(minEl, 10);
  const out = [];

  for (const [tleName, label] of STATIONS) {
    const s = sats.find(x => x.name === tleName);
    if (!s) continue;

    let wasBelow = false;
    for (let t = 0; t <= LOOK_BACK; t += STEP) {
      const when = new Date(now.getTime() - t * 1000);
      const pv = sat.propagate(s.rec, when);
      if (!pv?.position || typeof pv.position === 'boolean') break;

      const gmst = sat.gstime(when);
      const look = sat.ecfToLookAngles(obs.gd, sat.eciToEcf(pv.position, gmst));
      const el = deg(look.elevation);

      if (el < cutoff) { wasBelow = true; continue; }
      if (!wasBelow) continue; // it's overhead right now, so it's live not a ghost

      out.push({
        kind: 'Satellite',
        name: `${label} was last here`,
        detail: `${Math.round(el)}° above you at the time`,
        seenAt: when.toISOString(),
        altitudeKm: sat.eciToGeodetic(pv.position, gmst).height,
        distanceKm: look.rangeSat,
        elevation: el,
        azimuth: deg(look.azimuth),
        ghost: true,
      });
      break;
    }
  }
  return out;
}
