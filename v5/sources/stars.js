// the brightest named stars. positions are J2000, close enough for this
import * as Astro from 'astronomy-engine';

// [name, right ascension (hours), declination (degrees), distance (light-years), magnitude]
const STARS = [
  ['Sirius', 6.7525, -16.716, 8.6, -1.46], ['Canopus', 6.3992, -52.696, 310, -0.74], ['Arcturus', 14.261, 19.182, 36.7, -0.05],
  ['Vega', 18.6156, 38.784, 25, 0.03], ['Capella', 5.2782, 45.998, 42.9, 0.08], ['Rigel', 5.2423, -8.202, 860, 0.13],
  ['Procyon', 7.655, 5.225, 11.5, 0.34], ['Betelgeuse', 5.9195, 7.407, 550, 0.5], ['Altair', 19.8464, 8.868, 16.7, 0.77],
  ['Aldebaran', 4.5987, 16.509, 65, 0.85], ['Antares', 16.4901, -26.432, 550, 1.06], ['Spica', 13.4199, -11.161, 250, 0.98],
  ['Pollux', 7.7553, 28.026, 33.8, 1.14], ['Fomalhaut', 22.9608, -29.622, 25, 1.16], ['Deneb', 20.6905, 45.28, 2600, 1.25],
  ['Regulus', 10.1395, 11.967, 79, 1.35], ['Castor', 7.5767, 31.888, 51, 1.58], ['Polaris', 2.5303, 89.264, 433, 1.98],
];

export function stars(obs, now) {
  const o = new Astro.Observer(obs.lat, obs.lon, 0);

  return STARS.map(([name, ra, dec, ly, mag]) => {
    const hor = Astro.Horizon(now, o, ra, dec, 'normal'); // same trick as the planets
    return { kind: 'Star', name, detail: `magnitude ${mag}`, mag, lightYears: ly, elevation: hor.altitude, azimuth: hor.azimuth };
  });
}
