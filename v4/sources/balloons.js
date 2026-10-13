// weather balloons (radiosondes) from SondeHub
import { getJson } from './http.js';
import { lookAt } from './geo.js';

export async function balloons(obs) {
  // anything heard in the last 3 hours within 400 km
  const data = await getJson(`https://api.v2.sondehub.org/sondes?lat=${obs.lat}&lon=${obs.lon}&distance=400000&last=10800`);

  return Object.entries(data || {})
    .filter(([, s]) => s.lat != null && s.alt != null)
    .map(([serial, s]) => ({
      kind: 'Weather balloon',
      name: serial,
      detail: [s.type, s.datetime ? `last seen ${new Date(s.datetime).toLocaleTimeString('en-IE')}` : null].filter(Boolean).join(' · '),
      altitudeKm: s.alt / 1000, // sondehub gives metres
      ...lookAt(obs, s.lat, s.lon, s.alt / 1000),
    }));
}
