// shared maths helpers
import * as sat from 'satellite.js';

export const deg = r => r * 180 / Math.PI;
export const rad = d => d * Math.PI / 180;

// observer in the format satellite.js wants (radians + km)
export function observer(lat, lon, heightKm = 0) {
  return { lat, lon, gd: { latitude: rad(lat), longitude: rad(lon), height: heightKm } };
}

// elevation / azimuth / distance from the observer to any point (lat, lon, alt in km)
// used for planes, which give us lat/lon/alt instead of an orbit
export function lookAt(obs, lat, lon, altKm) {
  const target = sat.geodeticToEcf({ latitude: rad(lat), longitude: rad(lon), height: altKm });
  const look = sat.ecfToLookAngles(obs.gd, target);
  return { elevation: deg(look.elevation), azimuth: deg(look.azimuth), distanceKm: look.rangeSat };
}
