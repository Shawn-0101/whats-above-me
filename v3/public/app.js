// talks to /api/above and draws each layer of the sky

const $ = id => document.getElementById(id);
const MAX_ROWS = 40; // starlink alone can be hundreds

// ---- formatting ----
const compass = az => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(az / 45) % 8];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function km(value) {
  if (value == null) return '';
  if (value > 1e7) return `${(value / 149597870.7).toFixed(2)} AU`;
  if (value >= 100) return `${Math.round(value).toLocaleString('en-IE')} km`;
  return `${value.toFixed(1)} km`;
}

function distance(it) {
  return it.lightYears ? `${it.lightYears.toLocaleString('en-IE')} ly` : km(it.distanceKm);
}

function where(it) {
  const parts = [];
  if (it.altitudeKm != null && it.kind !== 'Aurora') parts.push(`${km(it.altitudeKm)} up`);
  if (it.elevation != null && it.kind !== 'Aurora') parts.push(`${compass(it.azimuth)}, ${Math.round(it.elevation)}°`);
  return parts.join(' · ');
}

function row(it) {
  return `<tr class="${it.past ? 'past' : ''}">
    <td><div class="kind">${esc(it.kind)}</div>${esc(it.name)}${it.detail ? `<div class="small">${esc(it.detail)}</div>` : ''}</td>
    <td class="num">${distance(it)}<div class="small">${where(it)}</div></td>
  </tr>`;
}

function render(data) {
  // top of the sky first, like looking up
  $('results').innerHTML = data.layers.slice().reverse().map(layer => {
    const list = layer.items;
    return `<section>
      <h2>${esc(layer.name)} <span>${esc(layer.range)} · ${list.length}</span></h2>
      ${list.length ? `<table>${list.slice(0, MAX_ROWS).map(row).join('')}</table>` : '<p class="empty">Nothing here right now.</p>'}
      ${list.length > MAX_ROWS ? `<div class="more">+${list.length - MAX_ROWS} more</div>` : ''}
    </section>`;
  }).join('');
}

// ---- fetching ----
async function lookUp() {
  const q = new URLSearchParams({ lat: $('lat').value, lon: $('lon').value, minEl: $('minEl').value || 0 });
  $('status').textContent = 'Fetching live data...';
  $('results').innerHTML = '';

  try {
    const res = await fetch(`/api/above?${q}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const total = data.layers.reduce((n, l) => n + l.items.length, 0);
    const failed = Object.entries(data.sources).filter(([, v]) => v.startsWith('failed'));
    $('status').innerHTML = `${total} things above you at ${new Date(data.time).toLocaleTimeString('en-IE')} · ${data.satelliteCatalog.toLocaleString('en-IE')} satellites checked` +
      (failed.length ? `<br><span class="bad">Couldn't load ${failed.map(([k, v]) => `${k} (${esc(v.slice(8))})`).join(', ')}</span>` : '');
    render(data);
  } catch (e) {
    $('status').innerHTML = `<span class="bad">${esc(e.message || 'Request failed')}. Is the server running?</span>`;
  }
}

$('form').addEventListener('submit', e => {
  e.preventDefault();
  lookUp();
});

$('here').addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition(
    pos => {
      $('lat').value = pos.coords.latitude.toFixed(4);
      $('lon').value = pos.coords.longitude.toFixed(4);
      lookUp();
    },
    () => { $('status').innerHTML = '<span class="bad">Location blocked. Type coordinates instead.</span>'; }
  );
});
