// live planes from adsb.lol (free, no key)
import { getJson } from './http.js';
import { lookAt } from './geo.js';

const FT_TO_KM = 0.0003048;
const KNOTS_TO_KMH = 1.852;

export async function aircraft(obs) {
  // radius is in nautical miles (max 250). 150 nm covers anything high enough to matter
  const data = await getJson(`https://api.adsb.lol/v2/point/${obs.lat}/${obs.lon}/150`);

  return (data.ac || [])
    .filter(a => a.lat != null && typeof (a.alt_geom ?? a.alt_baro) === 'number') // alt_baro is "ground" on the ground
    .map(a => {
      const altKm = (a.alt_geom ?? a.alt_baro) * FT_TO_KM;
      return {
        kind: 'Aircraft',
        name: (a.flight || '').trim() || a.r || a.hex, // callsign, else registration, else hex code
        detail: [a.t, a.r, a.gs ? `${Math.round(a.gs * KNOTS_TO_KMH)} km/h` : null].filter(Boolean).join(' · '),
        altitudeKm: altKm,
        track: a.track ?? a.true_heading ?? 90, // heading, so the art can face the right way
        type: a.t || '', // aircraft type code, e.g. B38M
        ...lookAt(obs, a.lat, a.lon, altKm),
      };
    });
}
