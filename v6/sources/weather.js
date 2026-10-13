// general weather from Open-Meteo (free, no key)
import { getJson } from './http.js';

// WMO weather code -> [general condition the scene uses, label to show]
function condition(code) {
  if (code === 0) return ['clear', 'Clear'];
  if (code <= 2) return ['partly', code === 1 ? 'Mostly clear' : 'Partly cloudy'];
  if (code === 3) return ['cloudy', 'Overcast'];
  if (code <= 48) return ['fog', 'Fog'];
  if (code <= 57) return ['rain', 'Drizzle'];
  if (code <= 67) return ['rain', 'Rain'];
  if (code <= 77) return ['snow', 'Snow'];
  if (code <= 82) return ['rain', 'Showers'];
  if (code <= 86) return ['snow', 'Snow showers'];
  return ['storm', 'Thunderstorm'];
}

export async function weather(obs) {
  const d = await getJson(`https://api.open-meteo.com/v1/forecast?latitude=${obs.lat}&longitude=${obs.lon}` +
    '&current=temperature_2m,apparent_temperature,weather_code,cloud_cover' +
    '&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1');

  const [kind, label] = condition(d.current.weather_code);
  return {
    kind,
    label,
    cloud: d.current.cloud_cover,
    temp: Math.round(d.current.temperature_2m),
    feels: Math.round(d.current.apparent_temperature),
    high: Math.round(d.daily.temperature_2m_max[0]),
    low: Math.round(d.daily.temperature_2m_min[0]),
    utcOffset: d.utc_offset_seconds,
  };
}
