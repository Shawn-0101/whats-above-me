// the layers of the sky, bottom to top. max = top of the layer in km
export const LAYERS = [
  { id: 'troposphere', name: 'Troposphere', range: '0 to 12 km', max: 12 },
  { id: 'stratosphere', name: 'Stratosphere', range: '12 to 50 km', max: 50 },
  { id: 'mesosphere', name: 'Mesosphere', range: '50 to 85 km', max: 85 },
  { id: 'thermosphere', name: 'Thermosphere', range: '85 to 600 km', max: 600 },
  { id: 'exosphere', name: 'Exosphere', range: '600 to 10,000 km', max: 10000 },
  { id: 'orbit', name: 'High Earth orbit', range: '10,000 km +', max: Infinity },
  { id: 'solar', name: 'Solar system', range: 'Moon, Sun, planets, asteroids', max: null },
  { id: 'stars', name: 'Stars', range: 'light-years away', max: null },
];

// which layer does an item belong in
function layerFor(item) {
  if (item.lightYears) return 'stars';
  if (item.altitudeKm == null) return 'solar'; // no height = moon, planets, asteroids
  return LAYERS.find(l => l.max !== null && item.altitudeKm <= l.max).id;
}

export function groupIntoLayers(items) {
  const layers = LAYERS.map(l => ({ id: l.id, name: l.name, range: l.range, items: [] }));
  const byId = Object.fromEntries(layers.map(l => [l.id, l]));

  for (const it of items) byId[layerFor(it)].items.push(it);

  // closest first inside each layer
  for (const l of layers) l.items.sort((a, b) => (a.distanceKm ?? a.lightYears ?? 0) - (b.distanceKm ?? b.lightYears ?? 0));
  return layers;
}
