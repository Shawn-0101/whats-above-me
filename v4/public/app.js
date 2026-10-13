// talks to /api/above, filters down to the interesting stuff and draws each layer

const $ = id => document.getElementById(id);
let last = null; // last response, so the toggle can redraw without refetching

// ---- formatting ----
const compass = az => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(az / 45) % 8];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function km(value) {
  if (value == null) return '';
  if (value > 1e7) return `${(value / 149597870.7).toFixed(2)} AU`;
  if (value >= 100) return `${Math.round(value).toLocaleString('en-IE')} km`;
  return `${value.toFixed(1)} km`;
}

const distance = it => it.lightYears ? `${it.lightYears.toLocaleString('en-IE')} ly` : km(it.distanceKm);
const height = it => it.altitudeKm != null && it.kind !== 'Aurora' ? `${km(it.altitudeKm)} up` : '';
const angle = it => it.elevation != null && it.kind !== 'Aurora' && !it.ghost ? `${compass(it.azimuth)}, ${Math.round(it.elevation)}°` : '';

function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400 * 2) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 60) return `${Math.round(s / 86400)} days ago`;
  if (s < 86400 * 730) return `${Math.round(s / 86400 / 30)} months ago`;
  return `${Math.round(s / 86400 / 365)} years ago`;
}

// ---- the "interesting only" filter ----
const MEGA = /STARLINK|ONEWEB|KUIPER|QIANFAN|GUOWANG|GLOBALSTAR|IRIDIUM|ORBCOMM|LEMUR|FLOCK/i;
const FAMOUS = /^(ISS|CSS|TIANHE|HST)/i;
const nearest = (arr, n) => arr.slice().sort((a, b) => a.distanceKm - b.distanceKm).slice(0, n);

function interesting(items) {
  const ghosts = items.filter(i => i.ghost);
  const live = items.filter(i => !i.ghost);
  const keep = [];
  const notes = [];

  // planes: nearest 3 + the highest one
  const planes = live.filter(i => i.kind === 'Aircraft');
  const pick = nearest(planes, 3);
  const highest = planes.slice().sort((a, b) => b.altitudeKm - a.altitudeKm)[0];
  if (highest && !pick.includes(highest)) pick.push(highest);
  keep.push(...pick);

  // satellites: famous ones always, a few nearest others, big constellations become a count
  const sats = live.filter(i => i.kind === 'Satellite');
  const famous = sats.filter(s => FAMOUS.test(s.name));
  const mega = sats.filter(s => MEGA.test(s.name) && !famous.includes(s));
  const other = sats.filter(s => !famous.includes(s) && !mega.includes(s));
  keep.push(...famous, ...nearest(other, 3));

  if (mega.length) {
    const counts = {};
    mega.forEach(s => { const k = s.name.split(/[-\s]/)[0]; counts[k] = (counts[k] || 0) + 1; });
    const list = Object.entries(counts).map(([k, n]) => `${n} ${k[0] + k.slice(1).toLowerCase()}`).join(', ');
    notes.push(`${list} satellites also up here`);
  }

  // rare stuff: keep all balloons, aurora only if there's a chance
  keep.push(...live.filter(i => i.kind === 'Weather balloon'));
  keep.push(...live.filter(i => i.kind === 'Aurora' && !i.name.startsWith('No')));

  // sky: moon, sun, planets you can actually see, brightest stars, closest asteroids
  keep.push(...live.filter(i => i.kind === 'Moon' || i.name === 'Sun'));
  keep.push(...live.filter(i => i.kind === 'Planet' && i.mag < 5));
  keep.push(...live.filter(i => i.kind === 'Star' && i.lightYears).sort((a, b) => a.mag - b.mag).slice(0, 6));
  keep.push(...nearest(live.filter(i => i.kind === 'Asteroid'), 2));

  const shown = live.filter(i => keep.includes(i)); // keeps the server's distance order
  const hidden = live.length - shown.length - mega.length;
  if (hidden > 0) notes.push(`${hidden} less interesting things hidden`);
  return { shown, ghosts, notes };
}

// ---- drawing ----
function row(it) {
  return `<div class="item">
    <div class="l"><div class="kind">${esc(it.kind)}</div>${esc(it.name)}${it.detail ? `<div class="small">${esc(it.detail)}</div>` : ''}</div>
    <div class="r">${distance(it)}<div class="small">${[height(it), angle(it)].filter(Boolean).join(' · ')}</div></div>
  </div>`;
}

function ghostRow(it) {
  return `<div class="item ghost">
    <div class="l"><div class="kind"><span class="tag">Ghost</span>${esc(it.kind)}</div>${esc(it.name)}
      <div class="small">${esc(new Date(it.seenAt).toLocaleString('en-IE'))}${it.detail ? ` · ${esc(it.detail)}` : ''}</div></div>
    <div class="r"><div class="ago">${ago(it.seenAt)}</div><div class="small">${[height(it), `${distance(it)} away`].filter(Boolean).join(' · ')}</div></div>
  </div>`;
}

function render() {
  if (!last) return;
  const all = $('all').checked;

  $('results').innerHTML = last.layers.slice().reverse().map(layer => {
    const { shown, ghosts, notes } = all
      ? { shown: layer.items.filter(i => !i.ghost).slice(0, 80), ghosts: layer.items.filter(i => i.ghost), notes: [] }
      : interesting(layer.items);

    const body = shown.map(row).join('')
      + notes.map(n => `<div class="note">${esc(n)}</div>`).join('')
      + ghosts.map(ghostRow).join('');

    return `<section>
      <h2>${esc(layer.name)} <span>${esc(layer.range)}</span></h2>
      ${body || '<p class="empty">Nothing here right now.</p>'}
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
    last = data;

    const failed = Object.entries(data.sources).filter(([, v]) => v.startsWith('failed'));
    const satNote = data.sources.satellites?.startsWith('ok (') ? ` · ${esc(data.sources.satellites.slice(4, -1))}` : '';
    $('status').innerHTML = `As of ${new Date(data.time).toLocaleTimeString('en-IE')} · ${data.satelliteCatalog.toLocaleString('en-IE')} satellites checked${satNote}` +
      (failed.length ? `<br><span class="bad">Couldn't load ${failed.map(([k, v]) => `${k} (${esc(v.slice(8))})`).join(', ')}</span>` : '');
    render();
  } catch (e) {
    $('status').innerHTML = `<span class="bad">${esc(e.message || 'Request failed')}. Is the server running?</span>`;
  }
}

$('form').addEventListener('submit', e => {
  e.preventDefault();
  lookUp();
});

$('all').addEventListener('change', render);

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
