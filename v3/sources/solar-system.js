// sun, moon and planets, all calculated locally with astronomy-engine
import * as Astro from 'astronomy-engine';
import { AU_KM } from './geo.js';

const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

export function solarSystem(obs, now) {
  const o = new Astro.Observer(obs.lat, obs.lon, 0);

  return BODIES.map(body => {
    const eq = Astro.Equator(body, now, o, true, true); // ra/dec as seen from here
    const hor = Astro.Horizon(now, o, eq.ra, eq.dec, 'normal'); // -> elevation + compass direction
    const ill = Astro.Illumination(body, now);

    return {
      kind: body === 'Sun' ? 'Star' : body === 'Moon' ? 'Moon' : 'Planet',
      name: body,
      detail: body === 'Moon' ? `${Math.round(ill.phase_fraction * 100)}% lit` : body === 'Sun' ? '' : `magnitude ${ill.mag.toFixed(1)}`,
      mag: ill.mag,
      distanceKm: eq.dist * AU_KM,
      elevation: hor.altitude,
      azimuth: hor.azimuth,
    };
  });
}
