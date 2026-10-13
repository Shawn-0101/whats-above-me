// hand-drawn SVG art for the scene. every function returns an SVG string.
// colours come from CSS vars where they should follow time of day.

let uid = 0;
const id = p => `${p}${++uid}`;

// tiny seeded random so the same object always gets the same look
export function rng(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------- planes ----------------
const WIDE = /^(A33|A34|A35|A38|B74|B76|B77|B78|IL96)/;
const SMALL = /^(C1|C2|PA|SR2|DA4|P28|BE|TB|DR4|R44|EC|AS3|H)/;

export function plane(item) {
  const t = (item.type || '').toUpperCase();
  const kind = WIDE.test(t) ? 'wide' : SMALL.test(t) || item.altitudeKm < 2.5 ? 'small' : /^AT|^DH8|^SF3|^F50/.test(t) ? 'prop' : 'narrow';
  const flip = item.track > 180 && item.track < 360; // heading west faces left
  const g = id('pl');
  const body = {
    wide: `<path d="M8 30 Q4 26 10 24 L112 22 Q126 22 132 27 Q126 33 112 33 L14 34 Q8 34 8 30Z" fill="url(#${g})"/>
           <path d="M20 24 L8 6 L18 6 L36 23Z" fill="url(#${g})"/>
           <path d="M54 29 L82 46 L94 46 L76 29Z" fill="var(--plane-shade)"/>
           <ellipse cx="72" cy="38" rx="9" ry="3.6" fill="var(--plane-shade)"/>
           <g fill="var(--plane-window)">${Array.from({ length: 14 }, (_, i) => `<circle cx="${38 + i * 5.4}" cy="26.6" r="0.9"/>`).join('')}</g>`,
    narrow: `<path d="M10 30 Q6 26 12 25 L100 23.5 Q112 23.5 117 28 Q112 32.5 100 32.5 L16 33 Q10 33 10 30Z" fill="url(#${g})"/>
             <path d="M22 25 L12 8 L21 8 L36 24.5Z" fill="url(#${g})"/>
             <path d="M52 29.5 L74 42 L84 42 L70 29.5Z" fill="var(--plane-shade)"/>
             <ellipse cx="66" cy="35.5" rx="7" ry="3" fill="var(--plane-shade)"/>
             <g fill="var(--plane-window)">${Array.from({ length: 10 }, (_, i) => `<circle cx="${40 + i * 5.2}" cy="27.4" r="0.85"/>`).join('')}</g>`,
    prop: `<path d="M14 30 Q10 26.5 16 26 L96 25.5 Q106 25.5 110 29 Q106 32.5 96 32.5 L20 33 Q14 33 14 30Z" fill="url(#${g})"/>
           <path d="M24 26.5 L16 10 L24 10 L38 26Z" fill="url(#${g})"/>
           <rect x="52" y="20" width="34" height="3.4" rx="1.7" fill="var(--plane-shade)"/>
           <rect x="62" y="22.5" width="12" height="5" rx="2" fill="var(--plane-shade)"/>
           <ellipse class="prop-spin" cx="75" cy="25" rx="1.2" ry="7" fill="var(--plane-window)" opacity=".5"/>`,
    small: `<path d="M24 30 Q20 27.5 26 27 L80 26.5 Q90 26.5 92 29.5 Q90 32 80 32 L30 32.5 Q24 32.5 24 30Z" fill="url(#${g})"/>
            <path d="M32 27.5 L26 16 L32 16 L42 27Z" fill="url(#${g})"/>
            <rect x="44" y="22" width="30" height="2.6" rx="1.3" fill="var(--plane-shade)"/>
            <path d="M68 26.5 Q72 22 78 26.5Z" fill="var(--plane-window)" opacity=".8"/>
            <ellipse class="prop-spin" cx="93" cy="29.5" rx="1" ry="6" fill="var(--plane-window)" opacity=".5"/>`,
  }[kind];
  const w = { wide: 140, narrow: 124, prop: 116, small: 100 }[kind];
  return `<svg class="art plane plane-${kind}" viewBox="0 0 ${w} 52" style="--flip:${flip ? -1 : 1}">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--plane-top)"/><stop offset="1" stop-color="var(--plane-belly)"/></linearGradient></defs>
    ${body}
    <circle class="nav nav-red" cx="${kind === 'wide' ? 88 : 78}" cy="${kind === 'wide' ? 46 : 42}" r="1.6"/>
    <circle class="nav nav-strobe" cx="${kind === 'wide' ? 10 : 14}" cy="${kind === 'small' ? 17 : 8}" r="1.5"/>
  </svg>`;
}

// ---------------- balloon ----------------
export function balloon() {
  const g = id('bl');
  return `<svg class="art balloon" viewBox="0 0 60 120">
    <defs><radialGradient id="${g}" cx=".38" cy=".32" r=".75">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e8ecf7"/><stop offset="1" stop-color="#9fa9cf"/></radialGradient></defs>
    <ellipse cx="30" cy="30" rx="24" ry="27" fill="url(#${g})"/>
    <path d="M24 56 Q30 60 36 56 L33 60 L27 60Z" fill="#c9cfe6"/>
    <path d="M30 60 Q34 80 29 100" stroke="#dfe4f5" stroke-width="0.8" fill="none" opacity=".8"/>
    <rect x="25" y="100" width="9" height="11" rx="1.5" fill="#f2f4fa"/>
    <rect x="27" y="103" width="5" height="2" fill="#8fa0d6"/>
  </svg>`;
}

// ---------------- satellites ----------------
function panel(x, y, w, h, rot = 0) {
  const cells = [];
  for (let i = 1; i < 4; i++) cells.push(`<line x1="${x + (w * i) / 4}" y1="${y}" x2="${x + (w * i) / 4}" y2="${y + h}"/>`);
  return `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="var(--panel)"/>
    <g stroke="var(--panel-line)" stroke-width=".6">${cells.join('')}<line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}"/></g>
    <rect class="glint" x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="url(#glint)"/>
  </g>`;
}

export function satellite(item) {
  const n = item.name.toUpperCase();
  const r = rng(item.name);
  if (/^ISS/.test(n)) {
    return `<svg class="art sat iss" viewBox="0 0 160 90">
      <rect x="10" y="42" width="140" height="5" rx="2" fill="#d8dcea"/>
      ${panel(14, 10, 14, 30)}${panel(32, 10, 14, 30)}${panel(14, 50, 14, 30)}${panel(32, 50, 14, 30)}
      ${panel(114, 10, 14, 30)}${panel(132, 10, 14, 30)}${panel(114, 50, 14, 30)}${panel(132, 50, 14, 30)}
      <rect x="62" y="34" width="36" height="21" rx="6" fill="#eef0f7"/>
      <rect x="72" y="28" width="16" height="34" rx="5" fill="#e3e6f1"/>
      <rect x="54" y="38" width="10" height="13" rx="3" fill="#c9cede"/>
      <rect x="96" y="38" width="12" height="13" rx="3" fill="#c9cede"/>
      <rect x="64" y="58" width="32" height="6" rx="2" fill="#f4d58a" opacity=".85"/>
    </svg>`;
  }
  if (/^CSS|TIANHE|TIANGONG/.test(n)) {
    return `<svg class="art sat tiangong" viewBox="0 0 130 90">
      <rect x="40" y="38" width="50" height="14" rx="7" fill="#eceff7"/>
      <rect x="58" y="14" width="14" height="62" rx="7" fill="#e1e5f0"/>
      ${panel(6, 36, 30, 18)}${panel(94, 36, 30, 18)}
      ${panel(50, 0, 30, 12)}${panel(50, 78, 30, 12)}
    </svg>`;
  }
  if (/^HST|HUBBLE/.test(n)) {
    return `<svg class="art sat hubble" viewBox="0 0 120 70">
      <rect x="36" y="22" width="52" height="26" rx="6" fill="#dfe3ee"/>
      <rect x="80" y="20" width="14" height="30" rx="3" fill="#c3c9da"/>
      <rect x="36" y="22" width="18" height="26" rx="5" fill="#f2e3b8"/>
      ${panel(40, 2, 40, 14)}${panel(40, 54, 40, 14)}
      <circle cx="94" cy="35" r="5" fill="#2a3150"/>
    </svg>`;
  }
  // generic designs, picked by orbit or name
  const design = item.altitudeKm > 30000 ? 'dish' : item.altitudeKm > 15000 ? 'panels' : ['panels', 'cube', 'dish', 'panels'][Math.floor(r() * 4)];
  const foil = r() > 0.5 ? '#e7c46d' : '#d9dde9';
  if (design === 'cube') {
    return `<svg class="art sat cube" viewBox="0 0 70 50">
      <rect x="27" y="17" width="16" height="16" rx="2" fill="${foil}"/>
      <path d="M27 17 L31 13 L47 13 L43 17Z" fill="#f5f0dc" opacity=".8"/>
      ${panel(4, 19, 20, 12)}${panel(46, 19, 20, 12)}
    </svg>`;
  }
  if (design === 'dish') {
    return `<svg class="art sat dish" viewBox="0 0 110 70">
      <rect x="44" y="24" width="22" height="22" rx="3" fill="${foil}"/>
      <path d="M40 22 Q55 4 70 22Z" fill="#f2f3f8"/>
      <line x1="55" y1="10" x2="55" y2="20" stroke="#cfd4e4" stroke-width="1.2"/>
      ${panel(4, 28, 36, 14)}${panel(70, 28, 36, 14)}
    </svg>`;
  }
  return `<svg class="art sat panels" viewBox="0 0 120 50">
    <rect x="50" y="15" width="20" height="20" rx="3" fill="${foil}"/>
    <rect x="46" y="23" width="4" height="4" fill="#cfd4e4"/><rect x="70" y="23" width="4" height="4" fill="#cfd4e4"/>
    ${panel(6, 15, 40, 20)}${panel(74, 15, 40, 20)}
  </svg>`;
}

// a row of dots for "84 Starlink also up here"
export function train(count) {
  const dots = Math.min(12, Math.max(5, Math.round(count / 6)));
  return `<svg class="art train" viewBox="0 0 220 40">
    ${Array.from({ length: dots }, (_, i) => `<circle cx="${10 + i * (200 / dots)}" cy="${30 - i * (20 / dots)}" r="2.1" fill="#f4f6ff" opacity="${0.95 - i * 0.05}"/>`).join('')}
  </svg>`;
}

// ---------------- meteors / fireballs ----------------
export function fireball() {
  const g = id('fb');
  return `<svg class="art fireball" viewBox="0 0 160 60">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffd9a8" stop-opacity="0"/><stop offset=".8" stop-color="#ffe7c4" stop-opacity=".9"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>
    <path d="M4 52 L148 10" stroke="url(#${g})" stroke-width="4" stroke-linecap="round"/>
    <circle cx="148" cy="10" r="6" fill="#fff6e6"/>
  </svg>`;
}

// ---------------- moon, sun, planets ----------------
export function moon(item) {
  // phaseDeg: 0 new, 90 first quarter, 180 full, 270 last quarter
  const p = item.phaseDeg ?? 180;
  const k = Math.cos((p * Math.PI) / 180); // 1 new .. -1 full
  const waxing = p < 180;
  const R = 46, cx = 50, cy = 50;
  // shadow = half-disc on the dark side + an ellipse that grows/shrinks the terminator
  const sweepOuter = waxing ? 0 : 1;
  const rx = Math.abs(k) * R;
  const sweepInner = (k > 0) === waxing ? 1 : 0;
  const shadow = `M${cx} ${cy - R} A${R} ${R} 0 0 ${sweepOuter} ${cx} ${cy + R} A${rx} ${R} 0 0 ${sweepInner} ${cx} ${cy - R}Z`;
  const g = id('mn');
  return `<svg class="art moon" viewBox="0 0 100 100">
    <defs><radialGradient id="${g}" cx=".4" cy=".38" r=".7">
      <stop offset="0" stop-color="#fbf8ee"/><stop offset=".7" stop-color="#e6e3d6"/><stop offset="1" stop-color="#bfc1c9"/></radialGradient></defs>
    <circle cx="50" cy="50" r="${R}" fill="url(#${g})"/>
    <g fill="#c9c7bd" opacity=".55">
      <circle cx="36" cy="38" r="9"/><circle cx="60" cy="30" r="5"/><circle cx="62" cy="62" r="11"/>
      <circle cx="34" cy="66" r="4"/><circle cx="74" cy="46" r="3.5"/></g>
    <path d="${shadow}" fill="#0c1230" opacity=".86"/>
  </svg>`;
}

export function sun() {
  return `<svg class="art sun" viewBox="0 0 100 100">
    <defs><radialGradient id="sunG"><stop offset="0" stop-color="#fffbe8"/><stop offset=".55" stop-color="#ffe7a6"/><stop offset="1" stop-color="#ffcf6e" stop-opacity="0"/></radialGradient></defs>
    <circle cx="50" cy="50" r="48" fill="url(#sunG)"/><circle cx="50" cy="50" r="22" fill="#fffaf0"/>
  </svg>`;
}

const PLANETS = {
  Mercury: ['#d7d2cb', '#8f8a86'], Venus: ['#fff4d6', '#e3c98d'], Mars: ['#ffb38a', '#c4543a'],
  Jupiter: ['#f3e1c4', '#c39b6d'], Saturn: ['#f5e6c2', '#cdb07a'], Uranus: ['#d6f6f8', '#7ccbd6'], Neptune: ['#bcd3ff', '#3f63d6'],
};
export function planet(item) {
  const [a, b] = PLANETS[item.name] || ['#fff', '#aaa'];
  const g = id('pn');
  const bands = item.name === 'Jupiter'
    ? `<g opacity=".45" fill="#a9784c"><rect x="10" y="40" width="80" height="5"/><rect x="10" y="54" width="80" height="7"/><ellipse cx="62" cy="61" rx="6" ry="3" fill="#c0563b"/></g>` : '';
  const sat = item.name === 'Saturn';
  const R = sat ? 26 : 34;
  const ringBack = sat ? `<g transform="rotate(-16 50 50)"><ellipse cx="50" cy="50" rx="46" ry="12" fill="none" stroke="#d9c79a" stroke-width="5" opacity=".55"/></g>` : '';
  const ringFront = sat ? `<g transform="rotate(-16 50 50)" clip-path="url(#${g}f)"><ellipse cx="50" cy="50" rx="46" ry="12" fill="none" stroke="#efe0b6" stroke-width="5"/></g>` : '';
  return `<svg class="art planet" viewBox="0 0 100 100">
    <defs><radialGradient id="${g}" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
      <clipPath id="${g}c"><circle cx="50" cy="50" r="${R}"/></clipPath>
      <clipPath id="${g}f"><rect x="0" y="50" width="100" height="50"/></clipPath></defs>
    ${ringBack}
    <circle cx="50" cy="50" r="${R}" fill="url(#${g})"/>
    <g clip-path="url(#${g}c)">${bands}</g>
    ${ringFront}
  </svg>`;
}

// ---------------- stars ----------------
const STAR_TINT = {
  Betelgeuse: '#ffb27a', Antares: '#ff9b6b', Aldebaran: '#ffc08a', Arcturus: '#ffd29a', Pollux: '#ffd9a8', Capella: '#fff0c8',
  Rigel: '#cfe0ff', Vega: '#dfe8ff', Sirius: '#e8f0ff', Spica: '#cfdcff', Deneb: '#eef2ff', Regulus: '#dfe7ff', Altair: '#f4f6ff',
};
export function star(item) {
  const c = STAR_TINT[item.name] || '#f7f8ff';
  const g = id('st');
  return `<svg class="art namedstar" viewBox="0 0 60 60" style="--tint:${c}">
    <defs><radialGradient id="${g}"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>
    <circle cx="30" cy="30" r="22" fill="url(#${g})" opacity=".55"/>
    <path d="M30 6 L32 28 L54 30 L32 32 L30 54 L28 32 L6 30 L28 28Z" fill="${c}" opacity=".9"/>
    <circle cx="30" cy="30" r="3.2" fill="#fff"/>
  </svg>`;
}

// ---------------- asteroid ----------------
export function asteroid(item) {
  const r = rng(item.name);
  const pts = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * Math.PI * 2, d = 26 + r() * 12;
    return `${(50 + Math.cos(a) * d * 1.2).toFixed(1)},${(50 + Math.sin(a) * d * 0.85).toFixed(1)}`;
  }).join(' ');
  const g = id('as');
  return `<svg class="art asteroid" viewBox="0 0 100 100">
    <defs><radialGradient id="${g}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#b8b2aa"/><stop offset="1" stop-color="#4f4a52"/></radialGradient></defs>
    <polygon points="${pts}" fill="url(#${g})"/>
    <circle cx="${40 + r() * 20}" cy="${40 + r() * 15}" r="5" fill="#5a5560" opacity=".6"/>
    <circle cx="${55 + r() * 10}" cy="${55 + r() * 8}" r="3" fill="#5a5560" opacity=".5"/>
  </svg>`;
}

// ---------------- clouds ----------------
export function cloud(seed, tone = 1) {
  const r = rng(seed);
  const g = id('cl'), f = id('cf');
  const puffs = Array.from({ length: 7 }, (_, i) => {
    const x = 50 + i * 38 + r() * 14, y = 70 - Math.sin((i / 6) * Math.PI) * 26 + r() * 8, rad = 24 + r() * 22;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rad.toFixed(0)}"/>`;
  }).join('');
  return `<svg class="art cloud" viewBox="0 0 360 140" style="--tone:${tone}">
    <defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--cloud-top)"/><stop offset="1" stop-color="var(--cloud-bot)"/></linearGradient>
      <filter id="${f}" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <g fill="url(#${g})" filter="url(#${f})">${puffs}<rect x="40" y="70" width="280" height="38" rx="19"/></g>
  </svg>`;
}

// ---------------- person ----------------
// seen from behind, holding a phone up to the sky
export function person() {
  return `<svg class="person" viewBox="0 0 120 260" aria-hidden="true">
    <defs>
      <linearGradient id="jacketG" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="var(--jacket-dark)"/><stop offset=".7" stop-color="var(--jacket)"/><stop offset="1" stop-color="var(--rim)"/></linearGradient>
      <linearGradient id="pantsG" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="var(--pants-dark)"/><stop offset=".75" stop-color="var(--pants)"/><stop offset="1" stop-color="var(--rim)" stop-opacity=".7"/></linearGradient>
      <radialGradient id="phoneGlow"><stop offset="0" stop-color="#cfe3ff" stop-opacity=".9"/><stop offset="1" stop-color="#cfe3ff" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="62" cy="216" rx="34" ry="5" fill="#000" opacity=".25"/>
    <g class="p-body">
      <!-- legs -->
      <path d="M46 116 L43 200 Q43 208 49 208 L58 208 L61 120Z" fill="url(#pantsG)"/>
      <path d="M63 120 L66 206 Q66 210 72 210 L80 210 L81 116Z" fill="url(#pantsG)"/>
      <path d="M40 206 Q40 214 50 215 L62 215 Q64 210 58 206Z" fill="var(--shoe)"/>
      <path d="M64 208 Q63 216 74 216 L86 216 Q88 211 80 208Z" fill="var(--shoe)"/>
      <!-- jacket -->
      <path d="M42 60 Q62 50 82 60 L88 120 Q64 128 38 120Z" fill="url(#jacketG)"/>
      <path d="M50 58 Q62 47 75 58 Q62 64 50 58Z" fill="var(--jacket-dark)"/>
      <path d="M38 118 Q64 126 88 118 L88 123 Q64 131 38 123Z" fill="var(--jacket-dark)" opacity=".6"/>
      <!-- arm in pocket -->
      <path d="M80 64 Q90 86 82 106" stroke="url(#jacketG)" stroke-width="13" stroke-linecap="round" fill="none"/>
      <!-- head -->
      <g class="p-head">
        <rect x="56" y="44" width="12" height="10" rx="4" fill="var(--skin-dark)"/>
        <ellipse cx="63" cy="36" rx="12.5" ry="13.5" fill="var(--hair)"/>
        <path d="M76 34 Q78 42 72 46" stroke="var(--skin)" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M49 33 Q50 20 64 20 Q78 21 77 34 Q64 30 49 33Z" fill="var(--cap)"/>
        <path d="M52 31 Q42 28 37 32 Q45 35 54 34Z" fill="var(--cap-dark)"/>
        <path d="M70 21 Q77 25 77 33" stroke="var(--rim)" stroke-width="1.4" fill="none" opacity=".7"/>
      </g>
      <!-- raised arm with phone -->
      <g class="p-arm">
        <path d="M50 66 L31 58 L24 37" stroke="url(#jacketG)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="23" cy="33" r="5" fill="var(--skin)"/>
        <circle class="p-glow" cx="19" cy="20" r="18" fill="url(#phoneGlow)"/>
        <g transform="rotate(-16 19 22)">
          <rect x="13" y="12" width="12" height="20" rx="2.4" fill="#1b2240"/>
          <rect class="p-screen" x="14.3" y="13.5" width="9.4" height="17" rx="1.5" fill="#bcd6ff"/>
        </g>
      </g>
    </g>
  </svg>`;
}

// ---------------- landscape ----------------
export function landscape(seed = 'land') {
  const r = rng(seed);
  // grass tufts along the near hill
  const hillY = x => {
    // matches the near-hill path below
    if (x < 1000) return 500 - (x / 1000) * 45 + Math.sin(x / 160) * 6;
    return 455 - Math.sin(((x - 1000) / 600) * Math.PI) * 18 + (x - 1000) * 0.02;
  };
  let tufts = '';
  for (let i = 0; i < 150; i++) {
    const x = r() * 1600, base = hillY(x) + 4 + r() * 70, h = 10 + r() * 22;
    const c = r() > 0.82 ? 'var(--grass-2)' : 'var(--grass-1)';
    const lean = (r() - 0.5) * 10;
    tufts += `<path d="M${x.toFixed(0)} ${base.toFixed(0)} q${(lean / 2).toFixed(1)} ${(-h / 2).toFixed(1)} ${lean.toFixed(1)} ${(-h).toFixed(1)} M${(x + 4).toFixed(0)} ${base.toFixed(0)} q${(lean / 3).toFixed(1)} ${(-h / 2.5).toFixed(1)} ${(lean * 1.4).toFixed(1)} ${(-h * 0.8).toFixed(1)}" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }
  let flowers = '';
  for (let i = 0; i < 26; i++) {
    const x = r() * 1600, y = hillY(x) + 10 + r() * 60;
    flowers += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.6 + r() * 1.6).toFixed(1)}" fill="var(--flower)"/>`;
  }
  let shimmer = '';
  for (let i = 0; i < 22; i++) {
    const x = r() * 1500, y = 392 + r() * 70, w = 20 + r() * 70;
    shimmer += `<rect class="shimmer" style="animation-delay:${(-r() * 6).toFixed(1)}s" x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="1.6" rx=".8" fill="var(--rim)"/>`;
  }
  return `<svg class="land" viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <linearGradient id="waterG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--water-top)"/><stop offset="1" stop-color="var(--water-bot)"/></linearGradient>
      <linearGradient id="nearG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--near-top)"/><stop offset="1" stop-color="var(--near-bot)"/></linearGradient>
      <linearGradient id="reflG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--rim)" stop-opacity=".55"/><stop offset="1" stop-color="var(--rim)" stop-opacity="0"/></linearGradient>
      <filter id="soft" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>
      <filter id="softer" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>
    <!-- far ridges -->
    <path d="M0 380 C120 350 220 362 340 372 C460 380 560 356 700 366 C820 374 900 360 1020 352 C1140 344 1260 340 1380 354 C1480 364 1550 360 1600 352 L1600 400 L0 400Z" fill="var(--far)" filter="url(#soft)"/>
    <path d="M1080 372 C1180 330 1300 320 1420 334 C1500 344 1560 340 1600 330 L1600 400 L1080 400Z" fill="var(--far-2)" filter="url(#soft)"/>
    <!-- lake -->
    <rect x="0" y="384" width="1600" height="110" fill="url(#waterG)"/>
    <ellipse class="refl" cx="640" cy="430" rx="70" ry="48" fill="url(#reflG)" filter="url(#softer)"/>
    <g class="shimmers" opacity=".45">${shimmer}</g>
    <!-- far shore -->
    <path d="M0 392 C80 384 180 386 260 392 C320 396 380 394 440 390 L440 398 L0 398Z" fill="var(--far-2)" filter="url(#soft)" opacity=".8"/>
    <!-- near hill -->
    <path d="M0 500 C300 470 700 488 1000 455 C1100 440 1250 436 1400 450 C1500 458 1560 466 1600 466 L1600 600 L0 600Z" fill="url(#nearG)"/>
    <path d="M0 500 C300 470 700 488 1000 455 C1100 440 1250 436 1400 450 C1500 458 1560 466 1600 466" stroke="var(--rim)" stroke-width="3" fill="none" opacity=".35" filter="url(#soft)"/>
    <!-- rocks -->
    <g fill="var(--rock)">
      <ellipse cx="240" cy="532" rx="38" ry="13"/><ellipse cx="300" cy="545" rx="20" ry="8"/>
      <ellipse cx="760" cy="520" rx="16" ry="6"/><ellipse cx="1500" cy="512" rx="30" ry="10"/></g>
    <g fill="var(--rim)" opacity=".25"><ellipse cx="232" cy="525" rx="22" ry="4"/><ellipse cx="1492" cy="506" rx="16" ry="3"/></g>
    <g class="grass">${tufts}${flowers}</g>
    <svg x="1105" y="262" width="100" height="216" viewBox="0 0 120 260" overflow="visible">${person().replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
  </svg>`;
}
