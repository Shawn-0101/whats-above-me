// place search + naming "use my location"
import { getJson } from './http.js';

// "dunboyne" -> list of matching places (Open-Meteo geocoding, free, no key)
export async function searchPlaces(query) {
  const d = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`);
  return (d.results || []).map(r => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

// lat/lon -> a town name (OpenStreetMap Nominatim, max 1 request a second)
export async function placeName(lat, lon) {
  const d = await getJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&lat=${lat}&lon=${lon}`);
  const a = d.address || {};
  return {
    name: a.town || a.city || a.village || a.suburb || a.county || 'Your location',
    region: [a.county, a.country].filter(Boolean).join(', '),
  };
}
