// sun, moon and planets, all calculated locally with astronomy-engine
import * as Astro from 'astronomy-engine';

const AU_KM = 149597870.7;
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

export function solarSystem(obs, now, minEl) {
  const o = new Astro.Observer(obs.lat, obs.lon, 0);

  return BODIES.map(body => {
    const eq = Astro.Equator(body, now, o, true, true); // ra/dec as seen from here
    const hor = Astro.Horizon(now, o, eq.ra, eq.dec, 'normal'); // -> elevation + compass direction
    const ill = Astro.Illumination(body, now);

    return {
      kind: body === 'Sun' ? 'Star' : body === 'Moon' ? 'Moon' : 'Planet',
      name: body,
      detail: body === 'Moon' ? `${Math.round(ill.phase_fraction * 100)}% lit` : body === 'Sun' ? '' : `magnitude ${ill.mag.toFixed(1)}`,
      distanceKm: eq.dist * AU_KM,
      elevation: hor.altitude,
      azimuth: hor.azimuth,
    };
  }).filter(b => b.elevation >= minEl);
}
