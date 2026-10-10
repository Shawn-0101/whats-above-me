// What's Above Me - v1
// proof of concept: what's in the sky above a lat/lon right now?
// usage: node above.js <lat> <lon>

import fs from 'node:fs';
import * as sat from 'satellite.js';
import * as Astro from 'astronomy-engine';

const TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle';
const TLE_FILE = 'tle-stations.txt';
const TLE_MAX_AGE = 2 * 3600e3; // celestrak only updates every ~2h anyway
const AU_KM = 149597870.7;

const deg = r => r * 180 / Math.PI;
const rad = d => d * Math.PI / 180;

// ---- read input ----
const [lat, lon] = process.argv.slice(2).map(Number);
if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
  console.log('usage: node above.js <lat> <lon>');
  console.log('e.g.   node above.js 53.4219 -6.4745');
  process.exit(1);
}
const now = new Date();

// ---- satellites ----

// celestrak blocks you if you grab the same file too often, so keep a local copy
async function loadTles() {
  const age = fs.existsSync(TLE_FILE) ? Date.now() - fs.statSync(TLE_FILE).mtimeMs : Infinity;

  if (age > TLE_MAX_AGE) {
    try {
      const res = await fetch(TLE_URL, { headers: { 'User-Agent': 'whats-above-me (hobby project)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(TLE_FILE, await res.text());
    } catch (e) {
      if (age === Infinity) throw new Error(`couldn't download satellite data (${e.message})`);
      console.warn(`couldn't refresh satellite data (${e.message}), using the old copy\n`);
    }
  }

  // TLE files are groups of 3 lines: name, line 1, line 2
  const lines = fs.readFileSync(TLE_FILE, 'utf8').split(/\r?\n/).filter(l => l.trim());
  const sats = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    sats.push({ name: lines[i].trim(), rec: sat.twoline2satrec(lines[i + 1], lines[i + 2]) });
  }
  return sats;
}

function satellites(tles) {
  const observer = { latitude: rad(lat), longitude: rad(lon), height: 0 }; // height in km
  const gmst = sat.gstime(now); // earth's rotation angle right now

  return tles.map(s => {
    const pv = sat.propagate(s.rec, now); // where is it right now (space coords)
    if (!pv?.position || typeof pv.position === 'boolean') return null; // dead/bad tle

    const look = sat.ecfToLookAngles(observer, sat.eciToEcf(pv.position, gmst));
    return {
      name: s.name,
      kind: 'satellite',
      elevation: deg(look.elevation), // degrees above the horizon
      azimuth: deg(look.azimuth), // compass direction, 0 = north
      distanceKm: look.rangeSat, // straight line from you
      altitudeKm: sat.eciToGeodetic(pv.position, gmst).height, // height above the ground
    };
  }).filter(Boolean);
}

// ---- sun, moon, planets ----

function solarSystem() {
  const observer = new Astro.Observer(lat, lon, 0);
  const bodies = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

  return bodies.map(body => {
    const eq = Astro.Equator(body, now, observer, true, true); // position in the sky (ra/dec)
    const hor = Astro.Horizon(now, observer, eq.ra, eq.dec, 'normal'); // turn it into "how high + which way"
    return {
      name: body,
      kind: body === 'Moon' ? 'moon' : body === 'Sun' ? 'star' : 'planet',
      elevation: hor.altitude,
      azimuth: hor.azimuth,
      distanceKm: eq.dist * AU_KM,
    };
  });
}

// ---- output ----

const compass = az => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(az / 45) % 8];

function fmtKm(km) {
  if (km == null) return '';
  if (km > 1e7) return `${(km / AU_KM).toFixed(2)} AU`;
  return `${Math.round(km).toLocaleString('en-IE')} km`;
}

function row(o) {
  return [
    o.name.padEnd(22),
    o.kind.padEnd(10),
    fmtKm(o.distanceKm).padStart(16),
    fmtKm(o.altitudeKm).padStart(12),
    `${compass(o.azimuth)}, ${Math.round(o.elevation)}° up`.padStart(14),
  ].join('  ');
}

async function main() {
  let sats = [];
  try {
    sats = satellites(await loadTles());
  } catch (e) {
    console.warn(`${e.message}, skipping satellites\n`);
  }

  const everything = [...sats, ...solarSystem()];
  const above = everything.filter(o => o.elevation > 0).sort((a, b) => a.distanceKm - b.distanceKm);

  console.log(`Above ${lat}, ${lon} at ${now.toLocaleString('en-IE')}\n`);
  console.log(['Name'.padEnd(22), 'Kind'.padEnd(10), 'Distance'.padStart(16), 'Height'.padStart(12), 'Where'.padStart(14)].join('  '));
  console.log('-'.repeat(82));
  above.forEach(o => console.log(row(o)));
  if (!above.length) console.log('nothing above the horizon right now');

  // handy for checking the maths even when it's not up
  const iss = sats.find(s => s.name.startsWith('ISS'));
  if (iss && iss.elevation <= 0) {
    console.log(`\nISS is below your horizon right now (${fmtKm(iss.distanceKm)} away, ${Math.round(iss.elevation)}°)`);
  }
}

main();
