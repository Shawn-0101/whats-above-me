// What's Above Me - v6
// the scene: entry, ground, scrolling sky, illustrations, hover cards, weather effects

import * as Art from './art.js';

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// top of the page first. lo/hi are the altitude (km) or distance (ly for stars) range drawn on a log scale
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

// sky colours [top, bottom] by height through the bands (p: 0 ground .. 1 deep space)
const GROUND_SKY = {
  night: [['#1c2b78', '#3552b0'], ['#16226a', '#2a43a0'], ['#0f185a', '#1c2c80']],
  twilight: [['#121b52', '#4a4f9a'], ['#0f174a', '#2f3a86'], ['#0b1240', '#1d2870']],
  sunset: [['#2a3a8f', '#f0a07a'], ['#22307e', '#7d6aa8'], ['#121c5a', '#2c3a8a']],
  day: [['#2f7ad8', '#a9d6f7'], ['#2565c8', '#5ea2e6'], ['#1a48a6', '#2f6cc8']],
};
const HIGH_SKY = [[0.375, '#0c1248', '#16206a'], [0.5, '#0a0d36', '#181a58'], [0.625, '#070a24', '#0e1240'], [0.75, '#05071a', '#0a0d2c'], [1, '#03040c', '#060816']];
const STAR_GROUND = { night: 1, twilight: 0.55, sunset: 0.12, day: 0 };

const state = {
  place: null, demo: false, data: null, showAll: false,
  phase: 'night', weather: 'partly', cloud: 40,
  bandEls: [], bandBox: [], items: new Map(), timer: null,
  scroll: -1, w: 0, h: 0, p: 0,
};

// ---------------- helpers ----------------
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`;
};
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const compass = az => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((az % 360) + 360) % 360 / 45) % 8];

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
const PRETTY = { 'ISS (ZARYA)': 'International Space Station', 'CSS (TIANHE)': 'Tiangong space station', HST: 'Hubble Space Telescope' };
const pretty = it => PRETTY[it.name] || it.name;

// ---------------- interesting filter ----------------
const MEGA = /STARLINK|ONEWEB|KUIPER|QIANFAN|GUOWANG|GLOBALSTAR|IRIDIUM|ORBCOMM|LEMUR|FLOCK/i;
const FAMOUS = /^(ISS|CSS|TIANHE|HST)/i;
const nearest = (arr, n) => arr.slice().sort((a, b) => a.distanceKm - b.distanceKm).slice(0, n);

function pick(items, all) {
  const ghosts = items.filter(i => i.ghost);
  const live = items.filter(i => !i.ghost);
  const sats = live.filter(i => i.kind === 'Satellite');
  const mega = sats.filter(s => MEGA.test(s.name) && !FAMOUS.test(s.name));

  // a mega-constellation becomes one "train" object
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

// ---------------- art + labels per item ----------------
function artFor(it) {
  switch (it.kind) {
    case 'Aircraft': {
      const right = !(it.track > 180 && it.track < 360);
      const trail = it.altitudeKm > 7.5 ? `<span class="contrail ${right ? 'to-right' : 'to-left'}"></span>` : '';
      const dx = right ? 50 : -50;
      return `<span class="mover" style="--fly-dx:${dx}px;--fly:${30 + (it.altitudeKm * 2)}s">${trail}${Art.plane(it)}</span>`;
    }
    case 'Weather balloon': return Art.balloon();
    case 'Satellite': return Art.satellite(it);
    case 'Constellation': return Art.train(it.count);
    case 'Fireball': return Art.fireball();
    case 'Moon': return Art.moon(it);
    case 'Planet': return `<span class="planet-${it.name}">${Art.planet(it)}</span>`;
    case 'Asteroid': return Art.asteroid(it);
    case 'Aurora': return '<span class="hitzone" style="display:block"></span>';
    case 'Star': return it.name === 'Sun' ? Art.sun() : Art.star(it);
    default: return Art.star(it);
  }
}

function tagFor(it) {
  if (it.ghost) return `Last here ${ago(it.seenAt)}`;
  if (it.kind === 'Aircraft') return it.name;
  if (it.kind === 'Satellite') return FAMOUS.test(it.name) ? pretty(it).replace(' space station', '').replace('International Space Station', 'ISS').replace(' Space Telescope', '') : '';
  if (it.kind === 'Constellation') return it.name;
  if (it.kind === 'Weather balloon') return 'Weather balloon';
  if (it.kind === 'Aurora') return '';
  if (it.kind === 'Asteroid') return it.name;
  return it.name;
}

// parallax: positive = moves faster than the page (near), negative = slower (far)
const DEPTH = { Aircraft: 0.06, 'Weather balloon': 0.04, Satellite: -0.04, Constellation: -0.04, Moon: -0.12, Planet: -0.1, Star: -0.16, Asteroid: -0.08, Fireball: 0, Aurora: 0 };

// ---------------- world building ----------------
function bandHTML(b) {
  if (b.id === 'ground') {
    return `<section class="band band-ground" data-band="ground">
      <div class="clouds" id="groundClouds"></div>
      <div class="hero" id="hero"></div>
      <div class="ground-land">${Art.landscape(state.place?.name || 'land')}</div>
      <div class="rise-hint"><i class="ph ph-arrow-up"></i>Scroll up to rise</div>
    </section>`;
  }
  return `<section class="band" data-band="${b.id}" style="height:${b.vh}vh">
    ${b.id === 'troposphere' ? '<div class="clouds" id="tropoClouds"></div>' : ''}
    ${b.id === 'thermosphere' ? '<div class="aurora" id="aurora" hidden><span style="left:6%"></span><span style="left:26%;animation-delay:-3s"></span><span style="left:46%;animation-delay:-6s"></span><span style="left:66%;animation-delay:-1.5s"></span></div>' : ''}
    <header class="band-head"><h2>${b.name}</h2><p class="range">${b.range}</p><p class="fact">${b.fact}</p></header>
    <div class="objs"></div>
  </section>`;
}

function buildWorld() {
  state.cloudKey = null;
  const world = $('#world');
  world.innerHTML = BANDS.map(bandHTML).join('');
  state.bandEls = [...world.querySelectorAll('.band')];
  state.items.clear();

  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); }
  }, { threshold: 0.12 });
  state.bandEls.forEach(el => io.observe(el));
}

function xFor(it) {
  if (it.azimuth == null) return 30 + Art.rng(it.name)() * 50;
  // facing south: S in the middle, N at both edges
  return 12 + (((it.azimuth - 180 + 540) % 360) / 360) * 72;
}
function yFor(it, b) {
  const v = b.id === 'stars' ? it.lightYears : b.id === 'solar' ? it.distanceKm : it.altitudeKm;
  let t;
  if (b.id === 'troposphere') t = clamp(v / b.hi, 0, 1);
  else t = clamp((Math.log(v) - Math.log(b.lo)) / (Math.log(b.hi) - Math.log(b.lo)), 0, 1);
  return 26 + 62 * (1 - t);
}

function renderObjects() {
  const layers = Object.fromEntries(state.data.layers.map(l => [l.id, l.items]));
  let count = 0;

  for (const b of BANDS) {
    if (b.id === 'ground') continue;
    const band = state.bandEls.find(el => el.dataset.band === b.id);
    const box = band.querySelector('.objs');
    const list = pick(layers[b.id] || [], state.showAll);
    count += list.filter(i => !i.ghost && i.kind !== 'Aurora').length;

    // positions in px so we can nudge overlaps apart
    const bandH = (b.vh / 100) * innerHeight;
    const placed = list.map(it => ({ it, x: xFor(it), y: (yFor(it, b) / 100) * bandH }));
    placed.sort((a, c) => a.y - c.y);
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
        const A = placed[i], B = placed[j];
        if (Math.abs(A.x - B.x) < 9 && Math.abs(A.y - B.y) < 90) {
          B.y = clamp(B.y + 50, bandH * 0.2, bandH * 0.94);
          B.x = clamp(B.x + (B.x >= A.x ? 4 : -4), 10, 86);
        }
      }
    }

    const existing = new Map([...box.children].map(el => [el.dataset.key, el]));
    const seen = new Set();
    placed.forEach(({ it, x, y }, i) => {
      const key = `${it.kind}|${it.name}`;
      seen.add(key);
      const left = it.kind === 'Aurora' ? 50 : x;
      const top = it.kind === 'Aurora' ? 52 : (y / bandH) * 100;
      let el = existing.get(key);
      if (!el) {
        el = document.createElement('button');
        el.type = 'button';
        el.className = `obj${it.ghost ? ' ghost' : ''}${it.kind === 'Aurora' ? ' aurora-hit' : ''}`;
        el.dataset.key = key;
        el.dataset.depth = DEPTH[it.kind] ?? 0;
        const tag = tagFor(it);
        el.innerHTML = `<span class="inner"><span class="pose" style="--delay:${Math.min(i * 70, 700)}ms">
          <span class="pose-in" style="position:relative;display:block">${it.ghost ? '<span class="ghostring"></span>' : ''}${artFor(it)}</span>
          ${tag ? `<span class="tag">${esc(tag)}</span>` : ''}</span></span>`;
        box.appendChild(el);
      }
      el.style.left = `${left}%`;
      el.style.top = `${top}%`;
      el.setAttribute('aria-label', `${pretty(it)}, ${fmtDist(it)}`);
      state.items.set(el, it);
    });
    for (const [k, el] of existing) if (!seen.has(k)) { state.items.delete(el); el.remove(); }

    // aurora curtains
    if (b.id === 'thermosphere') {
      const a = list.find(i => i.kind === 'Aurora');
      const chance = a ? parseInt(a.name) || 0 : 0;
      const aur = $('#aurora');
      aur.hidden = !a || !chance;
      aur.style.setProperty('--aur', clamp(0.25 + chance / 25, 0.25, 0.95));
    }
  }

  const empty = BANDS.filter(b => b.id !== 'ground');
  empty.forEach(b => {
    const band = state.bandEls.find(el => el.dataset.band === b.id);
    let note = band.querySelector('.band-empty');
    const has = band.querySelector('.objs').children.length > 0 || (b.id === 'troposphere');
    if (!has && !note) { note = document.createElement('p'); note.className = 'band-empty'; note.textContent = 'Nothing passing over right now.'; band.appendChild(note); }
    if (has && note) note.remove();
  });
  return count;
}

// ---------------- weather + hero ----------------
function renderWeather() {
  const w = state.data.weather;
  const sky = state.data.sky;
  state.phase = sky.phase;
  state.weather = w?.kind || 'partly';
  state.cloud = w?.cloud ?? 30;
  document.body.dataset.phase = state.phase;
  document.body.dataset.weather = state.weather;

  // clouds: how many depends on the general condition, not 1:1 cover. only redraw when it changes
  const cloudKey = `${state.place.name}|${state.weather}`;
  if (state.cloudKey === cloudKey && $('#groundClouds').childElementCount) return placeReflection();
  state.cloudKey = cloudKey;
  const n = { clear: 1, partly: 5, cloudy: 10, fog: 4, rain: 10, storm: 11, snow: 8 }[state.weather] ?? 4;
  const r = Art.rng(`${state.place.name}${state.weather}`);
  const make = (count, yMin, yMax, xMin = -10) => Array.from({ length: count }, (_, i) => {
    const w = 260 + r() * 300;
    const x = xMin + r() * (100 - xMin);
    const op = state.weather === 'clear' ? 0.35 : 0.55 + r() * 0.35;
    return `<div class="cloudwrap" style="left:${x.toFixed(1)}%;top:${(yMin + r() * (yMax - yMin)).toFixed(1)}%;width:${w.toFixed(0)}px;--op:${op.toFixed(2)};--dx:${(40 + r() * 90).toFixed(0)}px;--dur:${(80 + r() * 90).toFixed(0)}s;animation-delay:${(-r() * 80).toFixed(0)}s">${Art.cloud(`${i}${r()}`)}</div>`;
  }).join('');
  $('#groundClouds').innerHTML = make(Math.ceil(n * 0.45), 2, 30, 36) + (state.weather === 'fog' ? '<div class="mist"></div>' : '');
  $('#tropoClouds').innerHTML = make(Math.floor(n * 0.55), 66, 94);
  placeReflection();
}

function placeReflection() {
  // water reflection follows the moon at night, the sun by day
  const items = state.data.layers.find(l => l.id === 'solar')?.items || [];
  const src = items.find(i => i.name === (state.phase === 'day' || state.phase === 'sunset' ? 'Sun' : 'Moon'));
  const refl = document.querySelector('.refl');
  if (refl) {
    refl.setAttribute('cx', src ? (xFor(src) / 100) * 1600 : 640);
    refl.style.opacity = src ? 1 : 0.35;
  }
}

function renderHero(count) {
  const w = state.data.weather;
  $('#hero').innerHTML = `
    <div class="place"><i class="ph ph-map-pin"></i>${esc(state.place.name)}</div>
    ${w ? `<div class="temp">${w.temp}°</div>
    <div class="cond">${esc(w.label)}</div>
    <div class="hilo">↑ ${w.high}° / ↓ ${w.low}°</div>
    <div class="feels">Feels like ${w.feels}°</div>` : `<div class="cond" style="margin-top:18px">Weather unavailable right now</div>`}
    <div class="count"><i class="ph ph-binoculars"></i>${count} things above you right now</div>`;
  $('#topPlace').textContent = state.place.name;
}

// ---------------- layout measuring ----------------
function measure() {
  state.w = innerWidth; state.h = innerHeight;
  state.bandBox = state.bandEls.map(el => ({ top: el.offsetTop, height: el.offsetHeight }));
  const total = document.documentElement.scrollHeight;
  $('#altTicks').innerHTML = state.bandBox.slice(1).map(b => `<span style="top:${(b.top / total) * 100}%"></span>`).join('');
  stars.resize();
  fx.resize();
  state.scroll = -1;
}

// altitude under the middle of the screen
function altitudeAt(centerY) {
  for (let i = 0; i < state.bandBox.length; i++) {
    const box = state.bandBox[i], b = BANDS[i];
    if (centerY < box.top + box.height || i === state.bandBox.length - 1) {
      const frac = clamp((box.top + box.height - centerY) / box.height, 0, 1);
      const p = (BANDS.length - 1 - i + frac) / (BANDS.length - 1);
      if (b.id === 'ground') return { text: 'Ground', layer: 'Where you are', p: 0 };
      if (b.id === 'stars') return { text: `${Math.round(b.lo * (b.hi / b.lo) ** frac).toLocaleString('en-IE')} ly`, layer: b.short || b.name, p };
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

function starAlpha(p) {
  let g = STAR_GROUND[state.phase];
  if (['cloudy', 'rain', 'storm', 'snow', 'fog'].includes(state.weather)) g *= 0.25;
  else if (state.weather === 'partly') g *= 0.8;
  const t = clamp((p - 0.08) / 0.3, 0, 1);
  return g + (1 - g) * t * t * (3 - 2 * t);
}

// ---------------- frame loop ----------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(64, now - last); last = now;
  if (state.bandBox.length) {
    const sy = scrollY;
    if (sy !== state.scroll) {
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
      if (!reduceMotion) parallax(center);
    }
    stars.draw(now, starAlpha(state.p), state.p);
    fx.draw(now, dt);
  }
  requestAnimationFrame(frame);
}

function parallax(center) {
  for (const [el] of state.items) {
    const f = +el.dataset.depth;
    if (!f) continue;
    const r = el.offsetParent; // .objs
    if (!r) continue;
    const y = r.parentElement.offsetTop + el.offsetTop;
    const d = y - center;
    if (Math.abs(d) > state.h * 1.4) continue;
    el.firstElementChild.style.transform = `translate3d(0, ${(d * f).toFixed(1)}px, 0)`;
  }
}

// ---------------- star canvas ----------------
const stars = (() => {
  const c = $('#stars'), ctx = c.getContext('2d');
  let W = 0, H = 0, dpr = 1, list = [], milky = null;
  const r = Art.rng('sky');
  const tints = ['#ffffff', '#dfe8ff', '#fff2dc', '#cfdcff', '#ffe2c4'];
  for (let i = 0; i < 950; i++) {
    const big = r() > 0.97;
    list.push({ x: r(), y: r(), s: big ? 1.3 + r() * 0.9 : 0.35 + r() * 0.8, c: tints[Math.floor(r() * tints.length)], tw: 0.6 + r() * 2.2, ph: r() * 7 });
  }
  function buildMilky() {
    milky = document.createElement('canvas');
    milky.width = W; milky.height = Math.round(H * 1.4);
    const m = milky.getContext('2d');
    const rr = Art.rng('milky');
    for (let i = 0; i < 70; i++) {
      const t = rr();
      const x = t * W, y = milky.height * (0.85 - t * 0.7) + (rr() - 0.5) * H * 0.18;
      const rad = (60 + rr() * 140) * dpr;
      const g = m.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(190, 200, 255, ${0.05 + rr() * 0.05})`);
      g.addColorStop(1, 'rgba(190, 200, 255, 0)');
      m.fillStyle = g; m.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 1800; i++) {
      const t = rr();
      const x = t * W, y = milky.height * (0.85 - t * 0.7) + (rr() - 0.5) * H * 0.14 * (1 + rr());
      m.fillStyle = `rgba(235, 238, 255, ${0.2 + rr() * 0.5})`;
      m.fillRect(x, y, dpr * (0.5 + rr() * 0.6), dpr * (0.5 + rr() * 0.6));
    }
  }
  return {
    resize() {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = c.width = Math.round(innerWidth * dpr);
      H = c.height = Math.round(innerHeight * dpr);
      buildMilky();
    },
    draw(now, alpha, p) {
      ctx.clearRect(0, 0, W, H);
      if (alpha < 0.01) return;
      const VH = H * 1.4;
      const rise = (document.documentElement.scrollHeight - scrollY - innerHeight) * dpr * 0.08;
      const off = rise % VH;
      // milky way shows once the sky is properly dark
      const mwA = alpha * clamp((p - 0.15) / 0.4, 0, 1) * (STAR_GROUND[state.phase] > 0.9 ? 1 : 0.6) + (state.phase === 'night' && p < 0.15 ? 0.35 * alpha : 0);
      if (mwA > 0.01 && milky) {
        ctx.globalAlpha = mwA;
        ctx.drawImage(milky, 0, off - VH * 0.2);
        ctx.drawImage(milky, 0, off - VH * 0.2 - VH);
      }
      const t = now / 1000;
      for (const s of list) {
        let y = (s.y * VH + off) % VH - H * 0.2;
        if (y < -4 || y > H + 4) continue;
        const tw = reduceMotion ? 1 : 0.7 + 0.3 * Math.sin(t * s.tw + s.ph);
        ctx.globalAlpha = alpha * tw;
        ctx.fillStyle = s.c;
        ctx.beginPath();
        ctx.arc(s.x * W, y, s.s * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
})();

// ---------------- weather + meteor canvas ----------------
const fx = (() => {
  const c = $('#fx'), ctx = c.getContext('2d');
  let W = 0, H = 0, dpr = 1, drops = [], meteors = [], nextFlash = 0;
  const r = Art.rng('fx');
  return {
    resize() {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = c.width = Math.round(innerWidth * dpr);
      H = c.height = Math.round(innerHeight * dpr);
      drops = Array.from({ length: 260 }, () => ({ x: r() * W, y: r() * H, l: (8 + r() * 14) * dpr, v: (0.7 + r() * 0.6) * dpr, d: 0.4 + r() * 0.8 }));
    },
    draw(now, dt) {
      ctx.clearRect(0, 0, W, H);
      if (reduceMotion) return;
      const near = clamp(1 - state.p * 7, 0, 1); // weather only near the ground
      const wx = state.weather;
      if (near > 0 && (wx === 'rain' || wx === 'storm' || wx === 'snow')) {
        const snow = wx === 'snow';
        ctx.strokeStyle = snow ? 'rgba(255,255,255,.85)' : 'rgba(200,215,255,.45)';
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = dpr;
        ctx.globalAlpha = near;
        for (const d of drops) {
          if (snow) {
            d.y += d.v * dt * 0.06; d.x += Math.sin(now / 900 + d.d * 9) * 0.3 * dpr;
            ctx.beginPath(); ctx.arc(d.x, d.y, 1.6 * d.d * dpr, 0, 7); ctx.fill();
          } else {
            d.y += d.v * dt * 0.9; d.x -= d.v * dt * 0.12;
            ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.14, d.y - d.l); ctx.stroke();
          }
          if (d.y > H) { d.y = -20; d.x = r() * W * 1.1; }
          if (d.x < -20) d.x = W;
        }
        ctx.globalAlpha = 1;
      }
      // lightning
      if (wx === 'storm' && near > 0.3 && now > nextFlash) {
        nextFlash = now + 7000 + r() * 8000;
        $('#flash').animate([{ opacity: 0 }, { opacity: 0.32 }, { opacity: 0.05 }, { opacity: 0.2 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' });
      }
      // shooting stars when the sky is dark enough
      if (starAlpha(state.p) > 0.6 && r() < dt / 6000) {
        meteors.push({ x: (0.2 + r() * 0.8) * W, y: r() * H * 0.5, a: Math.PI * (0.78 + r() * 0.1), born: now, life: 650 + r() * 400, len: (120 + r() * 120) * dpr });
      }
      meteors = meteors.filter(m => now - m.born < m.life);
      for (const m of meteors) {
        const t = (now - m.born) / m.life;
        const hx = m.x + Math.cos(m.a) * m.len * 2 * t, hy = m.y + Math.sin(m.a) * m.len * 2 * t;
        const g = ctx.createLinearGradient(hx, hy, hx - Math.cos(m.a) * m.len, hy - Math.sin(m.a) * m.len);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - t)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.6 * dpr;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(m.a) * m.len, hy - Math.sin(m.a) * m.len); ctx.stroke();
      }
    },
  };
})();

// ---------------- hover card ----------------
const card = $('#card');
let hideTimer = null, lastHide = 0;

function showCard(el) {
  const it = state.items.get(el);
  if (!it) return;
  clearTimeout(hideTimer);
  const rows = [];
  if (it.ghost) {
    rows.push(['Last here', ago(it.seenAt)]);
    rows.push(['When', new Date(it.seenAt).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })]);
  }
  if (it.distanceKm != null || it.lightYears) rows.push(['Distance', fmtDist(it)]);
  if (it.altitudeKm != null && it.kind !== 'Aurora') rows.push(['Height', fmtAlt(it.altitudeKm)]);
  if (it.elevation != null && it.azimuth != null && it.kind !== 'Aurora') rows.push([it.ghost ? 'Was' : 'In your sky', `${compass(it.azimuth)}, ${Math.round(it.elevation)}° up`]);
  const icon = { Aircraft: 'airplane-tilt', 'Weather balloon': 'balloon', Moon: 'moon', Planet: 'planet', Fireball: 'shooting-star', Aurora: 'sparkle' }[it.kind];
  const kind = it.ghost ? 'Ghost' : it.kind === 'Constellation' ? 'Satellites' : it.name === 'Sun' ? 'Our star' : it.kind;
  card.innerHTML = `
    <div class="k">${it.ghost ? '<i class="ph ph-ghost"></i>' : icon ? `<i class="ph ph-${icon}"></i>` : ''}${esc(kind)}</div>
    <div class="n">${esc(it.kind === 'Aurora' ? `Aurora: ${it.name}` : pretty(it))}</div>
    <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    ${it.detail ? `<p class="d">${esc(it.detail)}</p>` : ''}`;
  card.classList.toggle('is-ghost', !!it.ghost);

  const rect = el.getBoundingClientRect();
  card.hidden = false;
  const cw = card.offsetWidth, ch = card.offsetHeight;
  const right = rect.right + 16 + cw < innerWidth - 110;
  const x = right ? rect.right + 16 : rect.left - 16 - cw;
  const y = clamp(rect.top + rect.height / 2 - ch / 2, 70, innerHeight - ch - 16);
  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
  card.style.setProperty('--origin', right ? 'left center' : 'right center');
  // once one card was just open, the next one appears instantly
  card.classList.toggle('instant', performance.now() - lastHide < 300 || card.classList.contains('on'));
  requestAnimationFrame(() => card.classList.add('on'));
}
function hideCard() {
  hideTimer = setTimeout(() => {
    card.classList.remove('on', 'instant');
    lastHide = performance.now();
  }, 60);
}
document.addEventListener('pointerover', e => { const el = e.target.closest('.obj'); if (el) showCard(el); });
document.addEventListener('pointerout', e => { const el = e.target.closest('.obj'); if (el && !el.contains(e.relatedTarget)) hideCard(); });
document.addEventListener('focusin', e => { const el = e.target.closest('.obj'); if (el) showCard(el); });
document.addEventListener('focusout', e => { if (e.target.closest('.obj')) hideCard(); });
addEventListener('scroll', () => { if (card.classList.contains('on')) hideCard(); }, { passive: true });

// ---------------- data ----------------
async function fetchSky() {
  const q = new URLSearchParams({ lat: state.place.lat, lon: state.place.lon, minEl: 10, ...(state.demo ? { demo: 1 } : {}) });
  const res = await fetch(`/api/above?${q}`);
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || 'Could not load the sky');
  return d;
}

function render() {
  renderWeather();
  const count = renderObjects();
  renderHero(count);
}

async function refresh() {
  try {
    state.data = await fetchSky();
    render();
  } catch { } // keep the last good sky
}

// ---------------- entry flow ----------------
const input = $('#place'), results = $('#results');
let searchTimer = null, found = [], active = -1, searchSeq = 0;

function showResults() {
  if (!found.length) { results.innerHTML = '<li class="none">No places found</li>'; results.hidden = false; return; }
  results.innerHTML = found.map((p, i) => `<li role="option" data-i="${i}" aria-selected="${i === active}">${esc(p.name)}<small>${esc(p.region)}</small></li>`).join('');
  results.hidden = false;
}
input.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = input.value.trim();
  if (q.length < 2) { results.hidden = true; return; }
  searchTimer = setTimeout(async () => {
    const seq = ++searchSeq;
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (seq !== searchSeq) return;
      if (!res.ok) throw new Error(d.error);
      found = d; active = d.length ? 0 : -1;
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

$('#demoBtn').addEventListener('click', () => go({ name: 'Dunboyne', region: 'Meath, Ireland', lat: 53.4219, lon: -6.4745 }, true));

function loadRecent() {
  try {
    const p = JSON.parse(localStorage.getItem('wam-place'));
    if (p?.name) {
      const b = $('#recent');
      b.innerHTML = `<i class="ph ph-clock-counter-clockwise"></i>${esc(p.name)}`;
      b.hidden = false;
      b.onclick = () => go(p);
    }
  } catch { }
}

function showError(msg) {
  const e = $('#entryError');
  e.textContent = msg; e.hidden = !msg;
}
function setLoading(text) {
  const on = !!text;
  $('#loading').hidden = !on;
  $('#search').hidden = on;
  document.querySelector('.entry-actions').hidden = on;
  $('#demoBtn').hidden = on;
  if (on) { $('#loadingText').textContent = text; showError(''); }
}

async function go(place, demo = false) {
  results.hidden = true;
  state.place = place; state.demo = demo;
  setLoading(`Looking up the sky over ${place.name}`);
  try {
    state.data = await fetchSky();
  } catch (e) {
    setLoading(null);
    showError(`${e.message}. Check the server is running, or try the sample data.`);
    return;
  }
  if (!demo) try { localStorage.setItem('wam-place', JSON.stringify(place)); } catch { }

  buildWorld();
  render();
  document.body.classList.add('leaving');
  await new Promise(r => setTimeout(r, 380));
  document.body.classList.remove('is-entry', 'scrolled');
  measure();
  history.scrollRestoration = 'manual';
  scrollTo(0, document.documentElement.scrollHeight);
  requestAnimationFrame(() => document.body.classList.add('ready'));
  setLoading(null);

  clearInterval(state.timer);
  state.timer = setInterval(refresh, 60000);
}

$('#changePlace').addEventListener('click', () => {
  clearInterval(state.timer);
  document.body.classList.remove('ready', 'leaving');
  document.body.classList.add('is-entry');
  input.value = '';
  loadRecent();
  setTimeout(() => input.focus(), 50);
});
$('#showAll').addEventListener('change', e => { state.showAll = e.target.checked; if (state.data) { const n = renderObjects(); renderHero(n); } });
addEventListener('resize', () => { if (state.bandEls.length) { measure(); renderObjects(); } else { stars.resize(); fx.resize(); } });

// entry backdrop: a calm night sky behind the card
stars.resize(); fx.resize();
(function idle(now) {
  if (!state.bandBox.length) { stars.draw(now, 0.9, 0.3); requestAnimationFrame(idle); }
})(performance.now());
requestAnimationFrame(frame);
loadRecent();
input.focus();
