// What's Above Me - v5
// the scene: pick a place, land on the ground, scroll up through the sky.
// objects are simple glowing markers for now, hover one for details

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// top of the page first. lo/hi = the height (km) or distance (ly for stars) range, drawn on a log scale
const BANDS = [
  { id: 'stars', short: 'Stars', name: 'The stars', range: 'Light-years away', fact: 'The brightest stars over you right now. Their light left them years ago.', vh: 140, lo: 4, hi: 3000 },
  { id: 'solar', short: 'Solar system', name: 'The solar system', range: '384,000 km and beyond', fact: 'The Moon, the Sun and the planets that are up in your sky.', vh: 140, lo: 3e5, hi: 5e9 },
  { id: 'orbit', name: 'High orbit', range: '10,000 to 36,000 km', fact: 'GPS satellites circle at 20,200 km. Geostationary ones hang still at 35,786 km.', vh: 115, lo: 1e4, hi: 4.2e4 },
  { id: 'exosphere', name: 'Exosphere', range: '600 to 10,000 km', fact: 'The air thins out into space. Weather and science satellites live here.', vh: 115, lo: 600, hi: 1e4 },
  { id: 'thermosphere', name: 'Thermosphere', range: '85 to 600 km', fact: 'Aurora glows here. The ISS and most Starlink satellites orbit in this layer.', vh: 150, lo: 85, hi: 600 },
  { id: 'mesosphere', name: 'Mesosphere', range: '50 to 85 km', fact: 'The coldest layer, around -90 °C. Most meteors burn up here.', vh: 110, lo: 50, hi: 85 },
  { id: 'stratosphere', name: 'Stratosphere', range: '12 to 50 km', fact: 'Calm, dry air and the ozone layer. Weather balloons climb here before they burst.', vh: 120, lo: 12, hi: 50 },
  { id: 'troposphere', name: 'Troposphere', range: '0 to 12 km', fact: 'Where all the weather happens. Airliners cruise near the top.', vh: 170, lo: 0, hi: 12 },
  { id: 'ground', vh: 100 },
];

// sky colours [top, bottom] as you rise (p: 0 = ground, 1 = deep space). the ground colours change with time of day
const GROUND_SKY = {
  night: [['#1c2b78', '#3552b0'], ['#16226a', '#2a43a0'], ['#0f185a', '#1c2c80']],
  twilight: [['#121b52', '#4a4f9a'], ['#0f174a', '#2f3a86'], ['#0b1240', '#1d2870']],
  sunset: [['#2a3a8f', '#f0a07a'], ['#22307e', '#7d6aa8'], ['#121c5a', '#2c3a8a']],
  day: [['#2f7ad8', '#a9d6f7'], ['#2565c8', '#5ea2e6'], ['#1a48a6', '#2f6cc8']],
};
const HIGH_SKY = [[0.375, '#0c1248', '#16206a'], [0.5, '#0a0d36', '#181a58'], [0.625, '#070a24', '#0e1240'], [0.75, '#05071a', '#0a0d2c'], [1, '#03040c', '#060816']];
const STAR_GROUND = { night: 1, twilight: 0.55, sunset: 0.12, day: 0 }; // how visible stars are from the ground

const state = {
  place: null, data: null, showAll: false,
  phase: 'night', weather: 'partly',
  bandEls: [], bandBox: [], timer: null,
  scroll: -1, h: 0, p: 0,
};

// ---------------- helpers ----------------
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => `rgb(${hex(a).map((v, i) => Math.round(lerp(v, hex(b)[i], t))).join(',')})`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const compass = az => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((az % 360) + 360) % 360 / 45) % 8];

// tiny seeded random, so the same thing always lands in the same spot
function rng(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), h | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmtDist(it) {
  if (it.lightYears) return `${it.lightYears.toLocaleString('en-IE')} light-years`;
  const km = it.distanceKm;
  if (km == null) return '';
  if (km > 5e6) return `${(km / 149597870.7).toFixed(2)} AU`;
  if (km >= 100) return `${Math.round(km).toLocaleString('en-IE')} km`;
  return `${km.toFixed(1)} km`;
}
function fmtAlt(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString('en-IE')} km`;
}
function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400 * 2) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 60) return `${Math.round(s / 86400)} days ago`;
  if (s < 86400 * 730) return `${Math.round(s / 86400 / 30)} months ago`;
  return `${Math.round(s / 86400 / 365)} years ago`;
}

// ---------------- "interesting only" filter ----------------
const MEGA = /STARLINK|ONEWEB|KUIPER|QIANFAN|GUOWANG|GLOBALSTAR|IRIDIUM|ORBCOMM|LEMUR|FLOCK/i;
const FAMOUS = /^(ISS|CSS|TIANHE|HST)/i;
const nearest = (arr, n) => arr.slice().sort((a, b) => a.distanceKm - b.distanceKm).slice(0, n);

function pick(items, all) {
  const ghosts = items.filter(i => i.ghost);
  const live = items.filter(i => !i.ghost);
  const sats = live.filter(i => i.kind === 'Satellite');
  const mega = sats.filter(s => MEGA.test(s.name) && !FAMOUS.test(s.name));

  // each mega-constellation becomes one object you can hover
  const trains = [];
  const groups = {};
  mega.forEach(s => (groups[s.name.split(/[-\s]/)[0]] ||= []).push(s));
  for (const [k, list] of Object.entries(groups)) {
    const avg = f => list.reduce((a, s) => a + s[f], 0) / list.length;
    const label = k[0] + k.slice(1).toLowerCase();
    trains.push({
      kind: 'Constellation', name: `${list.length} ${label} satellites`, count: list.length,
      detail: `Part of the ${label} network. Closest one is ${fmtDist(nearest(list, 1)[0])} away.`,
      altitudeKm: avg('altitudeKm'), distanceKm: nearest(list, 1)[0].distanceKm, elevation: avg('elevation'), azimuth: avg('azimuth'),
    });
  }

  if (all) return [...live.filter(i => !mega.includes(i)), ...trains, ...ghosts].slice(0, 80);

  const keep = [];
  const planes = live.filter(i => i.kind === 'Aircraft');
  const p = nearest(planes, 3);
  const highest = planes.slice().sort((a, b) => b.altitudeKm - a.altitudeKm)[0];
  if (highest && !p.includes(highest)) p.push(highest);
  keep.push(...p);
  const others = sats.filter(s => !mega.includes(s) && !FAMOUS.test(s.name));
  keep.push(...sats.filter(s => FAMOUS.test(s.name)), ...nearest(others, 3));
  keep.push(...live.filter(i => i.kind === 'Weather balloon'));
  keep.push(...live.filter(i => i.kind === 'Aurora' && !i.name.startsWith('No')));
  keep.push(...live.filter(i => i.kind === 'Moon' || i.name === 'Sun'));
  keep.push(...live.filter(i => i.kind === 'Planet' && i.mag < 5));
  keep.push(...live.filter(i => i.kind === 'Star' && i.lightYears).sort((a, b) => a.mag - b.mag).slice(0, 6));
  keep.push(...nearest(live.filter(i => i.kind === 'Asteroid'), 2));
  return [...live.filter(i => keep.includes(i)), ...trains, ...ghosts];
}

// native tooltip text for now. v6 replaces this with proper hover cards
function tooltip(it) {
  const lines = [it.name];
  if (it.ghost) lines.push(`Last here ${ago(it.seenAt)}`);
  if (it.distanceKm != null || it.lightYears) lines.push(`Distance: ${fmtDist(it)}`);
  if (it.altitudeKm != null && it.kind !== 'Aurora') lines.push(`Height: ${fmtAlt(it.altitudeKm)}`);
  if (it.elevation != null && it.kind !== 'Aurora') lines.push(`${compass(it.azimuth)}, ${Math.round(it.elevation)}° up`);
  if (it.detail) lines.push(it.detail);
  return lines.join('\n');
}

function labelFor(it) {
  if (it.ghost) return `${it.name.replace(' was last here', '')} · ${ago(it.seenAt)}`;
  if (it.kind === 'Satellite' && !FAMOUS.test(it.name)) return ''; // too many to label
  return it.name;
}

// ---------------- building the world ----------------
// simple hills + lake. colours come from css vars so they follow time of day
const LAND = `<svg class="land" viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <path d="M0 380 C200 350 400 372 700 362 C1000 352 1300 336 1600 352 L1600 400 L0 400Z" fill="var(--far)"/>
  <rect x="0" y="384" width="1600" height="110" fill="var(--water)"/>
  <path d="M0 500 C300 470 700 488 1000 455 C1200 436 1450 450 1600 466 L1600 600 L0 600Z" fill="var(--near)"/>
  <path d="M0 500 C300 470 700 488 1000 455 C1200 436 1450 450 1600 466" stroke="var(--rim)" stroke-width="2" fill="none" opacity=".35"/>
</svg>`;

function bandHTML(b) {
  if (b.id === 'ground') {
    return `<section class="band band-ground" data-band="ground">
      <div class="hero" id="hero"></div>
      ${LAND}
      <div class="rise-hint">Scroll up to rise</div>
    </section>`;
  }
  return `<section class="band" data-band="${b.id}" style="height:${b.vh}vh">
    <header class="band-head"><h2>${b.name}</h2><p class="range">${b.range}</p><p class="fact">${b.fact}</p></header>
    <div class="objs"></div>
  </section>`;
}

function buildWorld() {
  $('#world').innerHTML = BANDS.map(bandHTML).join('');
  state.bandEls = [...document.querySelectorAll('.band')];

  // fade each layer's title in the first time you reach it
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); }
  }, { threshold: 0.12 });
  state.bandEls.forEach(el => io.observe(el));
}

// left/right from compass direction (facing south: S in the middle, N at both edges)
function xFor(it) {
  if (it.azimuth == null) return 30 + rng(it.name)() * 50;
  return 12 + (((it.azimuth - 180 + 540) % 360) / 360) * 72;
}

// up/down from height inside the band, log scale (troposphere is linear)
function yFor(it, b) {
  const v = b.id === 'stars' ? it.lightYears : b.id === 'solar' ? it.distanceKm : it.altitudeKm;
  const t = b.id === 'troposphere'
    ? clamp(v / b.hi, 0, 1)
    : clamp((Math.log(v) - Math.log(b.lo)) / (Math.log(b.hi) - Math.log(b.lo)), 0, 1);
  return 26 + 62 * (1 - t); // % from the top of the band
}

function renderObjects() {
  const layers = Object.fromEntries(state.data.layers.map(l => [l.id, l.items]));
  let count = 0;

  for (const b of BANDS) {
    if (b.id === 'ground') continue;
    const band = state.bandEls.find(el => el.dataset.band === b.id);
    const list = pick(layers[b.id] || [], state.showAll);
    count += list.filter(i => !i.ghost && i.kind !== 'Aurora').length;

    // work in px so overlapping markers can be nudged apart
    const bandH = (b.vh / 100) * innerHeight;
    const placed = list.map(it => ({ it, x: xFor(it), y: (yFor(it, b) / 100) * bandH })).sort((a, c) => a.y - c.y);
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
        const A = placed[i], B = placed[j];
        if (Math.abs(A.x - B.x) < 8 && Math.abs(A.y - B.y) < 50) {
          B.y = clamp(B.y + 40, bandH * 0.2, bandH * 0.94);
          B.x = clamp(B.x + (B.x >= A.x ? 4 : -4), 10, 86);
        }
      }
    }

    band.querySelector('.objs').innerHTML = placed.map(({ it, x, y }) => {
      const left = it.kind === 'Aurora' ? 50 : x;
      const top = it.kind === 'Aurora' ? 52 : (y / bandH) * 100;
      const label = labelFor(it);
      return `<button type="button" class="obj${it.ghost ? ' ghost' : ''}${it.name === 'Sun' ? ' sun' : ''}" data-kind="${esc(it.kind)}"
        style="left:${left}%;top:${top}%" title="${esc(tooltip(it))}">
        <span class="dot"></span>${label ? `<span class="label">${esc(label)}</span>` : ''}
      </button>`;
    }).join('');

    // empty layer note
    let note = band.querySelector('.band-empty');
    if (!placed.length && !note) band.insertAdjacentHTML('beforeend', '<p class="band-empty">Nothing passing over right now.</p>');
    if (placed.length && note) note.remove();
  }
  return count;
}

function renderHero(count) {
  const w = state.data.weather;
  $('#hero').innerHTML = `
    <div class="place">${esc(state.place.name)}</div>
    ${w ? `<div class="temp">${w.temp}°</div>
      <div class="cond">${esc(w.label)}</div>
      <div class="hilo">↑ ${w.high}° / ↓ ${w.low}°</div>
      <div class="feels">Feels like ${w.feels}°</div>` : '<div class="cond">Weather unavailable right now</div>'}
    <div class="count">${count} things above you right now</div>`;
  $('#topPlace').textContent = state.place.name;
}

function render() {
  state.phase = state.data.sky.phase;
  state.weather = state.data.weather?.kind || 'partly';
  document.body.dataset.phase = state.phase;
  document.body.dataset.weather = state.weather;
  renderHero(renderObjects());
}

// ---------------- scrolling: sky colour + altimeter ----------------
function measure() {
  state.h = innerHeight;
  state.bandBox = state.bandEls.map(el => ({ top: el.offsetTop, height: el.offsetHeight }));
  const total = document.documentElement.scrollHeight;
  $('#altTicks').innerHTML = state.bandBox.slice(1).map(b => `<span style="top:${(b.top / total) * 100}%"></span>`).join('');
  stars.resize();
  state.scroll = -1;
}

// turns a scroll position back into a height, using each band's scale
function altitudeAt(centerY) {
  for (let i = 0; i < state.bandBox.length; i++) {
    const box = state.bandBox[i], b = BANDS[i];
    if (centerY < box.top + box.height || i === state.bandBox.length - 1) {
      const frac = clamp((box.top + box.height - centerY) / box.height, 0, 1);
      const p = (BANDS.length - 1 - i + frac) / (BANDS.length - 1);
      if (b.id === 'ground') return { text: 'Ground', layer: 'Where you are', p: 0 };
      if (b.id === 'stars') return { text: `${Math.round(b.lo * (b.hi / b.lo) ** frac).toLocaleString('en-IE')} ly`, layer: b.short, p };
      const km = b.id === 'troposphere' ? b.hi * frac : b.lo * (b.hi / b.lo) ** frac;
      const text = b.id === 'solar' ? (km > 5e6 ? `${(km / 149597870.7).toFixed(1)} AU` : `${Math.round(km / 1000).toLocaleString('en-IE')}k km`) : fmtAlt(km);
      return { text, layer: b.short || b.name, p };
    }
  }
  return { text: '', layer: '', p: 0 };
}

function skyAt(p) {
  const g = GROUND_SKY[state.phase];
  const stops = [[0, ...g[0]], [0.125, ...g[1]], [0.25, ...g[2]], ...HIGH_SKY];
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i][0]) {
      const [p0, t0, b0] = stops[i - 1], [p1, t1, b1] = stops[i];
      const t = (p - p0) / (p1 - p0);
      return [mix(t0, t1, t), mix(b0, b1, t)];
    }
  }
  return [stops.at(-1)[1], stops.at(-1)[2]];
}

// stars fade in as you rise. clouds hide them near the ground
function starAlpha(p) {
  let g = STAR_GROUND[state.phase];
  if (['cloudy', 'rain', 'storm', 'snow', 'fog'].includes(state.weather)) g *= 0.25;
  const t = clamp((p - 0.08) / 0.3, 0, 1);
  return g + (1 - g) * t * t * (3 - 2 * t);
}

function frame(now) {
  if (state.bandBox.length) {
    const sy = scrollY;
    if (sy !== state.scroll) { // only redo the maths when the page actually moved
      state.scroll = sy;
      const center = sy + state.h / 2;
      const a = altitudeAt(center);
      state.p = a.p;
      $('#altValue').textContent = a.text;
      $('#altLayer').textContent = a.layer;
      const total = document.documentElement.scrollHeight;
      $('#altDot').style.top = `${(center / total) * 100}%`;
      const [top, bot] = skyAt(a.p);
      $('#sky').style.background = `linear-gradient(${top}, ${bot})`;
      if (sy < total - state.h - 60) document.body.classList.add('scrolled');
    }
    stars.draw(now, starAlpha(state.p));
  }
  requestAnimationFrame(frame);
}

// ---------------- star canvas ----------------
const stars = (() => {
  const c = $('#stars'), ctx = c.getContext('2d');
  const r = rng('sky');
  let W = 0, H = 0, dpr = 1;
  const list = Array.from({ length: 800 }, () => ({ x: r(), y: r(), s: 0.35 + r() * 1.1, tw: 0.6 + r() * 2.2, ph: r() * 7 }));

  return {
    resize() {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = c.width = Math.round(innerWidth * dpr);
      H = c.height = Math.round(innerHeight * dpr);
    },
    draw(now, alpha) {
      ctx.clearRect(0, 0, W, H);
      if (alpha < 0.01) return;
      const VH = H * 1.4;
      const off = ((document.documentElement.scrollHeight - scrollY - innerHeight) * dpr * 0.08) % VH; // drift slowly as you scroll
      ctx.fillStyle = '#fff';
      for (const s of list) {
        const y = (s.y * VH + off) % VH - H * 0.2;
        if (y < -4 || y > H + 4) continue;
        ctx.globalAlpha = alpha * (0.7 + 0.3 * Math.sin(now / 1000 * s.tw + s.ph)); // twinkle
        ctx.beginPath();
        ctx.arc(s.x * W, y, s.s * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
})();

// ---------------- data ----------------
async function fetchSky() {
  const q = new URLSearchParams({ lat: state.place.lat, lon: state.place.lon, minEl: 10 });
  const res = await fetch(`/api/above?${q}`);
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || 'Could not load the sky');
  return d;
}

async function refresh() {
  try {
    state.data = await fetchSky();
    render();
  } catch { } // keep the last good sky
}

// ---------------- entry: search / location ----------------
const input = $('#place'), results = $('#results');
let searchTimer = null, found = [], active = -1, searchSeq = 0;

function showResults() {
  results.innerHTML = found.length
    ? found.map((p, i) => `<li role="option" data-i="${i}" aria-selected="${i === active}">${esc(p.name)}<small>${esc(p.region)}</small></li>`).join('')
    : '<li class="none">No places found</li>';
  results.hidden = false;
}

input.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = input.value.trim();
  if (q.length < 2) { results.hidden = true; return; }

  // wait till they stop typing, and ignore replies to old searches
  searchTimer = setTimeout(async () => {
    const seq = ++searchSeq;
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (seq !== searchSeq) return;
      if (!res.ok) throw new Error(d.error);
      found = d;
      active = d.length ? 0 : -1;
      showResults();
    } catch (e) {
      showError(`${e.message || 'Place search failed'}. Is the server running?`);
    }
  }, 220);
});

input.addEventListener('keydown', e => {
  if (results.hidden || !found.length) return;
  if (e.key === 'ArrowDown') { active = (active + 1) % found.length; showResults(); e.preventDefault(); }
  if (e.key === 'ArrowUp') { active = (active - 1 + found.length) % found.length; showResults(); e.preventDefault(); }
  if (e.key === 'Enter' && active >= 0) go(found[active]);
  if (e.key === 'Escape') results.hidden = true;
});
results.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) go(found[+li.dataset.i]); });

$('#locate').addEventListener('click', () => {
  if (!navigator.geolocation) return showError('Your browser does not share location. Search for a place instead.');
  setLoading('Finding you');
  navigator.geolocation.getCurrentPosition(async p => {
    const lat = +p.coords.latitude.toFixed(4), lon = +p.coords.longitude.toFixed(4);
    let name = { name: 'Your location', region: '' };
    try { name = await (await fetch(`/api/reverse?lat=${lat}&lon=${lon}`)).json(); } catch { }
    go({ ...name, lat, lon });
  }, () => { setLoading(null); showError('Location was blocked. Search for a place instead.'); }, { timeout: 12000 });
});

function loadRecent() {
  try {
    const p = JSON.parse(localStorage.getItem('wam-place'));
    if (p?.name) {
      const b = $('#recent');
      b.textContent = p.name;
      b.hidden = false;
      b.onclick = () => go(p);
    }
  } catch { } // storage can be blocked, it's only a shortcut
}

function showError(msg) {
  const e = $('#entryError');
  e.textContent = msg;
  e.hidden = !msg;
}

function setLoading(text) {
  const on = !!text;
  $('#loading').hidden = !on;
  $('#search').hidden = on;
  $('.entry-actions').hidden = on;
  if (on) { $('#loadingText').textContent = text; showError(''); }
}

async function go(place) {
  results.hidden = true;
  state.place = place;
  setLoading(`Looking up the sky over ${place.name}`);
  try {
    state.data = await fetchSky();
  } catch (e) {
    setLoading(null);
    showError(`${e.message}. Check the server is running.`);
    return;
  }
  try { localStorage.setItem('wam-place', JSON.stringify(place)); } catch { }

  buildWorld();
  render();
  document.body.classList.remove('is-entry', 'scrolled');
  measure();
  history.scrollRestoration = 'manual';
  scrollTo(0, document.documentElement.scrollHeight); // start at the bottom, on the ground
  requestAnimationFrame(() => document.body.classList.add('ready'));
  setLoading(null);

  clearInterval(state.timer);
  state.timer = setInterval(refresh, 60000);
}

$('#changePlace').addEventListener('click', () => {
  clearInterval(state.timer);
  document.body.classList.remove('ready');
  document.body.classList.add('is-entry');
  input.value = '';
  loadRecent();
  setTimeout(() => input.focus(), 50);
});

$('#showAll').addEventListener('change', e => {
  state.showAll = e.target.checked;
  if (state.data) renderHero(renderObjects());
});

addEventListener('resize', () => {
  if (state.bandEls.length) { measure(); renderObjects(); } else stars.resize();
});

// calm starry sky behind the entry card
stars.resize();
(function idle(now) {
  if (!state.bandBox.length) { stars.draw(now, 0.9); requestAnimationFrame(idle); }
})(performance.now());
requestAnimationFrame(frame);
loadRecent();
input.focus();
