// sample sky used by ?demo=1 (preview when APIs are down, or offline)
const ago = mins => new Date(Date.now() - mins * 60e3).toISOString();

export function demoItems() {
  return [
    // planes
    { kind: 'Aircraft', name: 'RYR4KD', type: 'B38M', detail: 'B38M · EI-HEN · 812 km/h', altitudeKm: 10.9, distanceKm: 14.2, elevation: 50, azimuth: 120, track: 95 },
    { kind: 'Aircraft', name: 'EIN63E', type: 'A333', detail: 'A333 · EI-GCF · 860 km/h', altitudeKm: 11.6, distanceKm: 28.5, elevation: 24, azimuth: 250, track: 280 },
    { kind: 'Aircraft', name: 'EAI32', type: 'AT76', detail: 'AT76 · EI-FMV · 430 km/h', altitudeKm: 4.2, distanceKm: 9.8, elevation: 25, azimuth: 205, track: 40 },
    { kind: 'Aircraft', name: 'EIBDR', type: 'C172', detail: 'C172 · EI-BDR · 180 km/h', altitudeKm: 1.1, distanceKm: 3.4, elevation: 19, azimuth: 160, track: 300 },
    // balloon
    { kind: 'Weather balloon', name: 'V4621187', detail: 'RS41-SGP · launched from Valentia', altitudeKm: 24.3, distanceKm: 120, elevation: 11, azimuth: 230 },
    // aurora
    { kind: 'Aurora', name: '8% chance overhead', detail: 'Glows 100 to 300 km up · Kp 4', altitudeKm: 200, distanceKm: 200, elevation: 90, azimuth: 0 },
    // satellites
    { kind: 'Satellite', name: 'ISS (ZARYA)', detail: '27,580 km/h', altitudeKm: 418, distanceKm: 560, elevation: 46, azimuth: 215 },
    { kind: 'Satellite', name: 'NOAA 19', detail: '26,900 km/h', altitudeKm: 860, distanceKm: 1380, elevation: 33, azimuth: 75 },
    { kind: 'Satellite', name: 'COSMOS 2545', detail: '25,400 km/h', altitudeKm: 1480, distanceKm: 2100, elevation: 38, azimuth: 300 },
    { kind: 'Satellite', name: 'HST', detail: '27,300 km/h', altitudeKm: 525, distanceKm: 1100, elevation: 22, azimuth: 150 },
    { kind: 'Satellite', name: 'GPS BIIF-8 (PRN 03)', detail: '13,900 km/h', altitudeKm: 20190, distanceKm: 21800, elevation: 55, azimuth: 175 },
    { kind: 'Satellite', name: 'INTELSAT 35E', detail: '11,070 km/h', altitudeKm: 35786, distanceKm: 38900, elevation: 29, azimuth: 190 },
    ...Array.from({ length: 14 }, (_, i) => ({
      kind: 'Satellite', name: `STARLINK-${31200 + i * 7}`, detail: '27,320 km/h',
      altitudeKm: 545 + i, distanceKm: 900 + i * 40, elevation: 20 + i * 2, azimuth: 40 + i * 9,
    })),
    // ghosts
    { kind: 'Satellite', name: 'ISS was last here', seenAt: ago(212), detail: '61° above you at the time', altitudeKm: 421, distanceKm: 470, elevation: 61, azimuth: 140, ghost: true },
    { kind: 'Fireball', name: 'Last fireball within 500 km', seenAt: '2024-03-17T21:41:12Z', detail: '310 km from you', altitudeKm: 71, distanceKm: 320, elevation: 12, azimuth: 290, ghost: true },
    // asteroids
    { kind: 'Asteroid', name: '2026 SK3', detail: 'Closest approach 2026-Oct-21 04:12 UTC · 9.8 km/s', distanceKm: 2.1e6, notPlaced: true },
    { kind: 'Asteroid', name: '2019 UN13', detail: 'Closest approach 2026-Nov-02 18:40 UTC · 12.4 km/s', distanceKm: 5.6e6, notPlaced: true },
  ];
}

export const demoWeather = {
  kind: 'partly', label: 'Partly cloudy', cloud: 45, temp: 10, feels: 7, high: 15, low: 8, utcOffset: 3600,
};
