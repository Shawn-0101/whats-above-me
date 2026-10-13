// aurora chance from NOAA's OVATION forecast + the current Kp index
import { getJson } from './http.js';

export async function aurora(obs) {
  const [ovation, kp] = await Promise.all([
    getJson('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json'),
    getJson('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json').catch(() => null), // nice to have
  ]);

  // the grid is whole degrees, with longitude as 0-360
  const lon360 = Math.round((obs.lon + 360) % 360);
  const lat = Math.round(obs.lat);
  const cell = ovation.coordinates.find(c => c[0] === lon360 && c[1] === lat);
  const chance = cell ? cell[2] : 0;

  // kp comes back as a table, last row is the latest. format has changed before so check both
  let kpNow = null;
  if (Array.isArray(kp) && kp.length) {
    const last = kp[kp.length - 1];
    kpNow = Array.isArray(last) ? Number(last[1]) : Number(last.Kp ?? last.kp_index ?? last.estimated_kp);
  }

  return [{
    kind: 'Aurora',
    name: chance > 0 ? `${chance}% chance overhead` : 'No aurora overhead',
    detail: `Glows 100 to 300 km up${kpNow != null && !isNaN(kpNow) ? ` · Kp ${kpNow}` : ''}`,
    altitudeKm: 200, // middle of where it glows
    distanceKm: 200,
    elevation: 90,
    azimuth: 0,
  }];
}
