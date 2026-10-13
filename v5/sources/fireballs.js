// bright meteors recorded by NASA CNEOS. it's historical, so the latest one near you becomes a ghost
import { getJson } from './http.js';
import { lookAt, groundKm } from './geo.js';

const RANGE_KM = 500;

export async function fireballs(obs) {
  const data = await getJson('https://ssd-api.jpl.nasa.gov/fireball.api');
  const f = Object.fromEntries(data.fields.map((name, i) => [name, i])); // column name -> index

  const near = data.data
    .filter(r => r[f.lat] && r[f.lon])
    .map(r => {
      const lat = Number(r[f.lat]) * (r[f['lat-dir']] === 'S' ? -1 : 1);
      const lon = Number(r[f.lon]) * (r[f['lon-dir']] === 'W' ? -1 : 1);
      return { r, lat, lon, ground: groundKm(obs.lat, obs.lon, lat, lon) };
    })
    .filter(x => x.ground < RANGE_KM)
    .sort((a, b) => b.r[f.date].localeCompare(a.r[f.date])); // newest first

  if (!near.length) return [];

  const x = near[0];
  const altKm = x.r[f.alt] ? Number(x.r[f.alt]) : 75; // some records have no altitude
  return [{
    kind: 'Fireball',
    name: `Last fireball within ${RANGE_KM} km`,
    detail: `${Math.round(x.ground)} km from you${x.r[f.alt] ? '' : ' · altitude unknown, shown at ~75 km'}`,
    seenAt: x.r[f.date].replace(' ', 'T') + 'Z', // cneos dates are UTC
    altitudeKm: altKm,
    ...lookAt(obs, x.lat, x.lon, altKm),
    ghost: true,
  }];
}
