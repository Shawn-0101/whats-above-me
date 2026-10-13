// shared maths helpers
import * as sat from 'satellite.js';

export const deg = r => r * 180 / Math.PI;
export const rad = d => d * Math.PI / 180;
export const AU_KM = 149597870.7;
const R_EARTH = 6371;

// observer in the format satellite.js wants (radians + km)
export function observer(lat, lon, heightKm = 0) {
  return { lat, lon, gd: { latitude: rad(lat), longitude: rad(lon), height: heightKm } };
}

// elevation / azimuth / distance from the observer to any point (lat, lon, alt in km)
// used for anything that reports a position instead of an orbit (planes, balloons, fireballs)
export function lookAt(obs, lat, lon, altKm) {
  const target = sat.geodeticToEcf({ latitude: rad(lat), longitude: rad(lon), height: altKm });
  const look = sat.ecfToLookAngles(obs.gd, target);
  return { elevation: deg(look.elevation), azimuth: deg(look.azimuth), distanceKm: look.rangeSat };
}

// distance along the ground between two points (haversine)
export function groundKm(lat1, lon1, lat2, lon2) {
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(a));
}
