// talks to /api/above and draws the results

const $ = id => document.getElementById(id);
const MAX_ROWS = 40; // starlink alone can be hundreds
const ORDER = ['Aircraft', 'Satellite', 'Moon', 'Planet', 'Star'];
const TITLES = { Aircraft: 'Planes', Satellite: 'Satellites', Moon: 'Moon', Planet: 'Planets', Star: 'Sun' };

// ---- formatting ----
const compass = az => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(az / 45) % 8];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function km(value) {
  if (value == null) return '';
  if (value > 1e7) return `${(value / 149597870.7).toFixed(2)} AU`;
  if (value >= 100) return `${Math.round(value).toLocaleString('en-IE')} km`;
  return `${value.toFixed(1)} km`;
}

function row(it) {
  const height = it.altitudeKm != null ? `${km(it.altitudeKm)} up · ` : '';
  return `<tr>
    <td>${esc(it.name)}${it.detail ? `<div class="small">${esc(it.detail)}</div>` : ''}</td>
    <td class="num">${km(it.distanceKm)}<div class="small">${height}${compass(it.azimuth)}, ${Math.round(it.elevation)}°</div></td>
  </tr>`;
}

function render(data) {
  // group by kind, keep the server's closest-first order
  const groups = {};
  for (const it of data.items) (groups[it.kind] ||= []).push(it);

  $('results').innerHTML = ORDER.filter(k => groups[k]).map(k => {
    const list = groups[k];
    return `<section>
      <h2>${TITLES[k]} <span>${list.length}</span></h2>
      <table>${list.slice(0, MAX_ROWS).map(row).join('')}</table>
      ${list.length > MAX_ROWS ? `<div class="more">+${list.length - MAX_ROWS} more</div>` : ''}
    </section>`;
  }).join('') || '<p class="small">Nothing above that elevation right now. Try a lower min elevation.</p>';
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

    const failed = Object.entries(data.sources).filter(([, v]) => v.startsWith('failed'));
    $('status').innerHTML = `${data.items.length} things above you at ${new Date(data.time).toLocaleTimeString('en-IE')}` +
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
