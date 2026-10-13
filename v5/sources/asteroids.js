// asteroids passing close to earth in the next 60 days (JPL close-approach API)
import { getJson } from './http.js';
import { AU_KM } from './geo.js';

export async function asteroids() {
  // within 0.05 AU (~7.5 million km), closest first
  const data = await getJson('https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&date-max=%2B60&dist-max=0.05&sort=dist');
  if (!data.data) return [];
  const f = Object.fromEntries(data.fields.map((name, i) => [name, i]));

  return data.data.slice(0, 5).map(r => ({
    kind: 'Asteroid',
    name: r[f.des],
    detail: `Closest approach ${r[f.cd]} UTC · ${Number(r[f.v_rel]).toFixed(1)} km/s`,
    distanceKm: Number(r[f.dist]) * AU_KM,
    elevation: null, // no sky position, just a distance
    azimuth: null,
    notPlaced: true,
  }));
}
