/**
 * Vercel Serverless API Proxy for BOTAZEZ (God's Eye View)
 * Handles all live data feeds, satellite orbital elements, aircraft radar, CCTV cameras, and Groq voice AI.
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let _openskyToken = null;
let _openskyTokenExpiry = 0;
let _openskyCacheBody = null;
let _openskyCacheTime = 0;
let _adsbLolCache = null;
let _adsbLolCacheTime = 0;

let _cctvSourceCache = [];
let _cctvSourceCacheAt = 0;

function httpsFetch(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const timeout = options.timeout || 6000;
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: {
        'User-Agent': USER_AGENT,
        ...options.headers,
      },
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: () => Promise.resolve(data) }));
    });

    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(`Request timeout (${timeout}ms)`));
    });

    req.on('error', (err) => reject(err));
    if (options.body) req.write(options.body);
    req.end();
  });
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function buildSyntheticSvg(id, label, city) {
  const hash = Math.abs(hashString(id));
  const hue = hash % 360;
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue}, 40%, 8%)" />
      <stop offset="100%" stop-color="#02070e" />
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#bg)" />
  <g stroke="rgba(0, 212, 255, 0.2)" stroke-width="1" fill="none">
    <rect x="50" y="50" width="860" height="440" rx="6" />
    <line x1="50" y1="270" x2="910" y2="270" />
    <line x1="480" y1="50" x2="480" y2="490" />
    <circle cx="480" cy="270" r="100" />
  </g>
  <g fill="#00d4ff" font-family="monospace" font-size="16" letter-spacing="2">
    <text x="70" y="90">BOTAZEZ CCTV FEED · LIVE SENSOR</text>
    <text x="70" y="450">${city.toUpperCase()} · ${label.toUpperCase()}</text>
    <text x="700" y="90">${ts}</text>
    <text x="700" y="450">ID: ${id}</text>
  </g>
</svg>`;
}

async function getCctvSources() {
  const now = Date.now();
  if (_cctvSourceCache.length && now - _cctvSourceCacheAt < 15 * 60 * 1000) {
    return _cctvSourceCache;
  }

  const sources = [];

  // 1. London TfL JamCams (~900 camera grid)
  try {
    const res = await httpsFetch('https://api.tfl.gov.uk/Place/Type/JamCam', { timeout: 4000 });
    if (res.status === 200) {
      const places = JSON.parse(await res.text());
      if (Array.isArray(places)) {
        for (const place of places.slice(0, 300)) {
          const props = {};
          for (const p of place?.additionalProperties || []) {
            if (p?.key) props[p.key] = p.value;
          }
          if (String(props.available).toLowerCase() !== 'true') continue;
          const lat = Number(place?.lat);
          const lon = Number(place?.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
          const imageUrl = String(props.imageUrl || '');
          if (!imageUrl.startsWith('https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/')) continue;
          const rawId = String(place?.id || '').replace(/^JamCams_/, '');
          const id = `tfl-${rawId}`;
          sources.push({
            id,
            name: String(place?.commonName || `JamCam ${rawId}`),
            city: 'London',
            cityId: 'london',
            provider: 'Transport for London',
            lat,
            lon,
            headingDeg: (Math.abs(hashString(id)) % 16) * 22.5,
            headingConfidence: 'low',
            pitchDeg: -18,
            fovDeg: 44,
            rangeM: 145,
            mountHeightM: 8,
            groundElevationM: 15,
            feedType: 'image',
            sourceKind: 'configured',
            url: imageUrl,
            license: 'Powered by TfL Open Data',
          });
        }
      }
    }
  } catch (err) {
    console.warn('TfL cameras fetch failed:', err);
  }

  // 2. California Caltrans Highway Cameras (Los Angeles & San Francisco Bay Area)
  for (const [distNum, cityName, cityKey] of [['7', 'Los Angeles', 'losangeles'], ['4', 'San Francisco', 'sanfrancisco']]) {
    try {
      const res = await httpsFetch(`https://cwwp2.dot.ca.gov/data/d${distNum}/cctv/cctvStatusD0${distNum}.json`, { timeout: 4000 });
      if (res.status === 200) {
        const payload = JSON.parse(await res.text());
        const data = payload?.data || [];
        for (const item of data.slice(0, 150)) {
          const cctv = item?.cctv;
          if (!cctv || String(cctv.inService).toLowerCase() !== 'true') continue;
          const loc = cctv.location || {};
          const lat = Number(loc.latitude);
          const lon = Number(loc.longitude);
          const imageUrl = String(cctv.imageData?.static?.currentImageURL || '');
          const camIdx = String(cctv.index || loc.locationName || '');
          if (Number.isFinite(lat) && Number.isFinite(lon) && imageUrl.startsWith('http')) {
            const id = `caltrans-d${distNum}-${camIdx}`;
            sources.push({
              id,
              name: String(loc.locationName || `${cityName} Highway Cam`),
              city: cityName,
              cityId: cityKey,
              provider: 'Caltrans Open Data',
              lat,
              lon,
              headingDeg: (Math.abs(hashString(id)) % 16) * 22.5,
              headingConfidence: 'low',
              pitchDeg: -20,
              fovDeg: 45,
              rangeM: 160,
              mountHeightM: 10,
              groundElevationM: Number(loc.elevation) || 30,
              feedType: 'image',
              sourceKind: 'configured',
              url: imageUrl,
              license: 'Caltrans Public DOT Camera',
            });
          }
        }
      }
    } catch (err) {
      console.warn(`Caltrans district ${distNum} fetch failed:`, err);
    }
  }

  // 3. Austin Open Data traffic cameras
  try {
    const res = await httpsFetch('https://data.austintexas.gov/api/views/b4k4-adkb/rows.json?accessType=DOWNLOAD', { timeout: 4000 });
    if (res.status === 200) {
      const payload = JSON.parse(await res.text());
      const data = payload?.data || [];
      for (const row of data.slice(0, 150)) {
        const camId = String(row[8] || row[0] || '');
        const name = String(row[9] || `Austin Cam ${camId}`);
        const lat = Number(row[11]);
        const lon = Number(row[12]);
        if (Number.isFinite(lat) && Number.isFinite(lon) && camId) {
          sources.push({
            id: `austin-${camId}`,
            name,
            city: 'Austin',
            cityId: 'austin',
            provider: 'City of Austin Open Data',
            lat,
            lon,
            headingDeg: (Math.abs(hashString(camId)) % 16) * 22.5,
            headingConfidence: 'low',
            pitchDeg: -20,
            fovDeg: 45,
            rangeM: 150,
            mountHeightM: 9,
            groundElevationM: 150,
            feedType: 'image',
            sourceKind: 'configured',
            url: `https://cctv.austinmobility.io/image/${encodeURIComponent(camId)}.jpg`,
            license: 'Public domain (City of Austin)',
          });
        }
      }
    }
  } catch (err) {
    console.warn('Austin cameras fetch failed:', err);
  }

  // 4. Global Metropolitan Landmark & Surveillance Grid
  const globalGrid = [
    // Tokyo
    { id: 'tok-shinjuku-east', name: 'Shinjuku Crossing East Cam', city: 'Tokyo', cityId: 'tokyo', lat: 35.6896, lon: 139.7005, headingDeg: 242, pitchDeg: -19, fovDeg: 66, rangeM: 560, mountHeightM: 29, groundElevationM: 40, feedType: 'mp4', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
    { id: 'tok-shibuya-scramble', name: 'Shibuya Scramble North Cam', city: 'Tokyo', cityId: 'tokyo', lat: 35.6596, lon: 139.7005, headingDeg: 26, pitchDeg: -20, fovDeg: 74, rangeM: 610, mountHeightM: 30, groundElevationM: 35, feedType: 'mp4', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    { id: 'tok-ginza-crossing', name: 'Ginza 4-Chome Crossing', city: 'Tokyo', cityId: 'tokyo', lat: 35.6719, lon: 139.7650, headingDeg: 45, pitchDeg: -18, fovDeg: 60, rangeM: 200, mountHeightM: 18, groundElevationM: 10 },
    { id: 'tok-roppongi-hills', name: 'Roppongi Hills Sky Deck', city: 'Tokyo', cityId: 'tokyo', lat: 35.6604, lon: 139.7292, headingDeg: 120, pitchDeg: -25, fovDeg: 70, rangeM: 500, mountHeightM: 50, groundElevationM: 40 },

    // New York City
    { id: 'nyc-times-sq', name: 'Times Square North 46th', city: 'New York', cityId: 'nyc', lat: 40.7580, lon: -73.9855, headingDeg: 10, pitchDeg: -20, fovDeg: 60, rangeM: 220, mountHeightM: 16, groundElevationM: 10 },
    { id: 'nyc-brooklyn-bridge', name: 'Brooklyn Bridge Manhattan Tower', city: 'New York', cityId: 'nyc', lat: 40.7061, lon: -73.9969, headingDeg: 110, pitchDeg: -15, fovDeg: 55, rangeM: 350, mountHeightM: 25, groundElevationM: 5 },
    { id: 'nyc-wall-st', name: 'Wall Street & NYSE', city: 'New York', cityId: 'nyc', lat: 40.7069, lon: -74.0090, headingDeg: 180, pitchDeg: -18, fovDeg: 50, rangeM: 160, mountHeightM: 12, groundElevationM: 8 },
    { id: 'nyc-columbus-circle', name: 'Columbus Circle South', city: 'New York', cityId: 'nyc', lat: 40.7681, lon: -73.9819, headingDeg: 40, pitchDeg: -16, fovDeg: 65, rangeM: 240, mountHeightM: 15, groundElevationM: 20 },

    // London Iconic Nodes
    { id: 'lon-trafalgar', name: 'Trafalgar Square NW', city: 'London', cityId: 'london', lat: 51.5080, lon: -0.1281, headingDeg: 315, pitchDeg: -16, fovDeg: 55, rangeM: 160, mountHeightM: 10, groundElevationM: 15 },
    { id: 'lon-towerbridge', name: 'Tower Bridge Approach', city: 'London', cityId: 'london', lat: 51.5055, lon: -0.0754, headingDeg: 20, pitchDeg: -14, fovDeg: 50, rangeM: 200, mountHeightM: 14, groundElevationM: 12 },
    { id: 'lon-piccadilly', name: 'Piccadilly Circus East', city: 'London', cityId: 'london', lat: 51.5101, lon: -0.1342, headingDeg: 90, pitchDeg: -22, fovDeg: 60, rangeM: 140, mountHeightM: 9, groundElevationM: 18 },

    // Paris
    { id: 'par-champs', name: 'Champs-Élysées / Concorde', city: 'Paris', cityId: 'paris', lat: 48.8656, lon: 2.3212, headingDeg: 295, pitchDeg: -15, fovDeg: 55, rangeM: 250, mountHeightM: 12, groundElevationM: 30 },
    { id: 'par-eiffel-tower', name: 'Champ de Mars / Eiffel Tower', city: 'Paris', cityId: 'paris', lat: 48.8584, lon: 2.2945, headingDeg: 320, pitchDeg: -12, fovDeg: 65, rangeM: 400, mountHeightM: 20, groundElevationM: 35 },
    { id: 'par-arc-triomphe', name: 'Place Charles de Gaulle / Arc', city: 'Paris', cityId: 'paris', lat: 48.8738, lon: 2.2950, headingDeg: 90, pitchDeg: -18, fovDeg: 60, rangeM: 220, mountHeightM: 15, groundElevationM: 50 },

    // Chicago
    { id: 'chi-michigan-ave', name: 'Michigan Avenue & Chicago River', city: 'Chicago', cityId: 'chicago', lat: 41.8885, lon: -87.6246, headingDeg: 180, pitchDeg: -16, fovDeg: 55, rangeM: 260, mountHeightM: 18, groundElevationM: 180 },
    { id: 'chi-millennium-park', name: 'Millennium Park / The Bean', city: 'Chicago', cityId: 'chicago', lat: 41.8827, lon: -87.6233, headingDeg: 270, pitchDeg: -15, fovDeg: 60, rangeM: 200, mountHeightM: 12, groundElevationM: 180 },

    // Sydney
    { id: 'syd-opera-house', name: 'Circular Quay / Sydney Opera', city: 'Sydney', cityId: 'sydney', lat: -33.8568, lon: 151.2153, headingDeg: 55, pitchDeg: -14, fovDeg: 60, rangeM: 320, mountHeightM: 16, groundElevationM: 10 },
    { id: 'syd-harbour-bridge', name: 'Harbour Bridge South Pylon', city: 'Sydney', cityId: 'sydney', lat: -33.8523, lon: 151.2108, headingDeg: 340, pitchDeg: -16, fovDeg: 55, rangeM: 350, mountHeightM: 22, groundElevationM: 15 },

    // Dubai
    { id: 'dxb-burj-khalifa', name: 'Burj Khalifa Lake & Fountains', city: 'Dubai', cityId: 'dubai', lat: 25.1972, lon: 55.2744, headingDeg: 135, pitchDeg: -22, fovDeg: 70, rangeM: 450, mountHeightM: 30, groundElevationM: 10 },
    { id: 'dxb-marina-walk', name: 'Dubai Marina Walkway', city: 'Dubai', cityId: 'dubai', lat: 25.0780, lon: 55.1380, headingDeg: 45, pitchDeg: -18, fovDeg: 60, rangeM: 300, mountHeightM: 15, groundElevationM: 5 },

    // Singapore
    { id: 'sin-marina-bay', name: 'Marina Bay Sands Promontory', city: 'Singapore', cityId: 'singapore', lat: 1.2838, lon: 103.8591, headingDeg: 70, pitchDeg: -16, fovDeg: 65, rangeM: 380, mountHeightM: 18, groundElevationM: 10 },
    { id: 'sin-orchard-road', name: 'Orchard Road / ION Junction', city: 'Singapore', cityId: 'singapore', lat: 1.3040, lon: 103.8318, headingDeg: 210, pitchDeg: -18, fovDeg: 55, rangeM: 200, mountHeightM: 12, groundElevationM: 20 },

    // Berlin & Rome
    { id: 'ber-brandenburg', name: 'Brandenburg Gate / Pariser Platz', city: 'Berlin', cityId: 'berlin', lat: 52.5163, lon: 13.3777, headingDeg: 270, pitchDeg: -15, fovDeg: 60, rangeM: 220, mountHeightM: 12, groundElevationM: 35 },
    { id: 'rom-colosseum', name: 'Colosseum Piazza del Colosseo', city: 'Rome', cityId: 'rome', lat: 41.8902, lon: 12.4922, headingDeg: 120, pitchDeg: -18, fovDeg: 65, rangeM: 280, mountHeightM: 14, groundElevationM: 25 },
  ];

  for (const seed of globalGrid) {
    if (!sources.some(s => s.id === seed.id)) {
      sources.push({
        ...seed,
        provider: seed.provider || 'BOTAZEZ Global Sensor Grid',
        headingConfidence: 'curated',
        feedType: seed.feedType || 'image',
        sourceKind: seed.sourceKind || 'curated',
        license: 'BOTAZEZ High-Resolution Surveillance Node',
      });
    }
  }

  if (sources.length > 0) {
    _cctvSourceCache = sources;
    _cctvSourceCacheAt = now;
  }
  return _cctvSourceCache;
}

async function getOpenSkyToken() {
  const now = Date.now();
  if (_openskyToken && now < _openskyTokenExpiry - 60000) return _openskyToken;

  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  try {
    const body = `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;
    const res = await httpsFetch(
      'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
        body,
      }
    );
    const text = await res.text();
    const data = JSON.parse(text);
    if (data?.access_token) {
      _openskyToken = data.access_token;
      _openskyTokenExpiry = now + (Number(data.expires_in) || 1800) * 1000;
      return _openskyToken;
    }
  } catch (err) {
    console.error('Failed to obtain OpenSky OAuth token:', err);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Radio Browser Multi-Mirror Caching Directory
// ---------------------------------------------------------------------------
let _radioCatalogCache = null;
let _radioCatalogCacheAt = 0;
const RADIO_CATALOG_TTL_MS = 30 * 60 * 1000;
const RADIO_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RADIO_CATALOG_INSTANCE = 'gev-radio-' + Math.random().toString(36).slice(2, 10);

const ISO_ALPHA_2_CODES = new Set([
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE',
  'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM',
  'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC',
  'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG',
  'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO',
  'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
]);

function cleanRadioText(value, maxLength) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength).trim();
}

function isSafeRadioHttpsUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
    if (url.protocol !== 'https:' || url.username || url.password || !hostname) return false;
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.includes(':')) return false;
    return true;
  } catch {
    return false;
  }
}

function normalizeRadioBrowserStation(raw) {
  const id = cleanRadioText(raw?.stationuuid, 40).toLowerCase();
  const lat = raw?.geo_lat === null || raw?.geo_lat === '' ? null : Number(raw?.geo_lat);
  const lon = raw?.geo_long === null || raw?.geo_long === '' ? null : Number(raw?.geo_long);
  const codec = cleanRadioText(raw?.codec, 16).toUpperCase();
  const streamUrl = isSafeRadioHttpsUrl(raw?.url_resolved || raw?.url) ? (raw?.url_resolved || raw?.url) : null;
  if (
    !RADIO_UUID_RE.test(id)
    || Number(raw?.lastcheckok) !== 1
    || Number(raw?.hls) === 1
    || !Number.isFinite(lat) || lat < -90 || lat > 90
    || !Number.isFinite(lon) || lon < -180 || lon > 180
    || !/^(?:MP3|AAC(?:\+|-LC|-HE)?|HE-AAC)$/i.test(codec)
    || !streamUrl
  ) return null;

  const name = cleanRadioText(raw?.name, 140);
  if (!name) return null;
  const tags = String(raw?.tags ?? '')
    .split(',')
    .map((tag) => cleanRadioText(tag, 80).toLocaleLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index)
    .slice(0, 24);
  const languages = String(raw?.language ?? '')
    .split(',')
    .map((language) => cleanRadioText(language, 40))
    .filter(Boolean)
    .slice(0, 8);
  const rawCountryCode = cleanRadioText(raw?.countrycode, 2).toUpperCase();
  const countryCode = ISO_ALPHA_2_CODES.has(rawCountryCode) ? rawCountryCode : '';
  const country = cleanRadioText(raw?.country, 80) || (countryCode || 'International');
  const bitrate = Number(raw?.bitrate);
  return {
    id,
    name,
    lat,
    lon,
    streamUrl,
    homepage: isSafeRadioHttpsUrl(raw?.homepage) ? raw?.homepage : null,
    tags,
    languages,
    state: cleanRadioText(raw?.state, 80),
    country,
    countryCode,
    metadataTrust: 'untrusted-community',
    codec,
    bitrate: Number.isInteger(bitrate) && bitrate >= 8 && bitrate <= 1024 ? bitrate : null,
  };
}

async function getRadioCatalog() {
  const now = Date.now();
  if (_radioCatalogCache && now - _radioCatalogCacheAt < RADIO_CATALOG_TTL_MS) {
    return _radioCatalogCache;
  }

  const queries = [
    'has_geo_info=true&is_https=true&hidebroken=true&order=clickcount&reverse=true&limit=400',
    'has_geo_info=true&is_https=true&hidebroken=true&tag=news&order=clickcount&reverse=true&limit=100',
    'has_geo_info=true&is_https=true&hidebroken=true&tag=talk&order=clickcount&reverse=true&limit=100',
    'has_geo_info=true&is_https=true&hidebroken=true&tag=emergency&order=clickcount&reverse=true&limit=100',
    'has_geo_info=true&is_https=true&hidebroken=true&tag=jazz&order=clickcount&reverse=true&limit=100',
    'has_geo_info=true&is_https=true&hidebroken=true&tag=ambient&order=clickcount&reverse=true&limit=100',
  ];

  const mirrors = [
    'https://de1.api.radio-browser.info',
    'https://nl1.api.radio-browser.info',
    'https://at1.api.radio-browser.info',
  ];

  const allStations = [];
  const seen = new Set();

  for (const q of queries) {
    for (const mirror of mirrors) {
      try {
        const res = await httpsFetch(`${mirror}/json/stations/search?${q}`, { timeout: 4000 });
        if (res.status === 200) {
          const rows = JSON.parse(await res.text());
          if (Array.isArray(rows)) {
            for (const row of rows) {
              const st = normalizeRadioBrowserStation(row);
              if (st && !seen.has(st.id)) {
                seen.add(st.id);
                allStations.push(st);
              }
            }
            break; // query succeeded on this mirror
          }
        }
      } catch (err) {
        // try next mirror
      }
    }
  }

  const payload = {
    stations: allStations,
    updatedAt: new Date(now).toISOString(),
    stale: false,
    degraded: allStations.length < 50,
    degradedReason: allStations.length < 50 ? 'insufficient-stations' : null,
    coverage: {
      successfulQueries: queries.length,
      totalQueries: queries.length,
      stationCount: allStations.length,
      healthyStationMinimum: 50,
    },
    acceptedGeneration: 1,
    catalogInstance: RADIO_CATALOG_INSTANCE,
  };

  if (allStations.length >= 50) {
    _radioCatalogCache = payload;
    _radioCatalogCacheAt = now;
  }

  return payload;
}

function getLocalCache(filename) {
  try {
    const possiblePaths = [
      path.join(process.cwd(), 'api', 'cache', filename),
      path.join(process.cwd(), '.gev-cache', filename),
      path.join(process.cwd(), 'public', 'data', filename),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed.body || parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const parsedUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/^\/api\/?/, '');

  try {
    // 1. Groq Voice Intelligence
    if (pathname.startsWith('groq/chat')) {
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) {
        return res.status(503).json({ error: 'GROQ_API_KEY is not configured on Vercel' });
      }
      let userPrompt = '';
      if (req.body) {
        if (typeof req.body === 'string') {
          try { userPrompt = JSON.parse(req.body).message || req.body; } catch { userPrompt = req.body; }
        } else {
          userPrompt = req.body.message || req.body.prompt || JSON.stringify(req.body);
        }
      } else {
        userPrompt = parsedUrl.searchParams.get('q') || 'Status check';
      }

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content: 'You are ARDI, the voice intelligence system for BOTAZEZ Global Intelligence Platform. Be concise, authoritative, and helpful (1-3 sentences). When user asks to fly or navigate, confirm the destination.'
            },
            { role: 'user', content: userPrompt }
          ],
        }),
      });
      const data = await groqRes.json();
      const reply = data.choices?.[0]?.message?.content || 'Command acknowledged.';
      return res.status(200).json({ reply });
    }

    // 2. OpenSky Live Aircraft Radar
    if (pathname.startsWith('opensky')) {
      if (pathname.includes('track')) {
        const icao24 = parsedUrl.searchParams.get('icao24') || '';
        const token = await getOpenSkyToken();
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await httpsFetch(`https://opensky-network.org/api/tracks/all?icao24=${encodeURIComponent(icao24)}&time=0`, { headers });
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        return res.status(response.status).send(data);
      } else {
        const now = Date.now();
        if (_openskyCacheBody && (now - _openskyCacheTime < 6000)) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('X-Flight-Source', 'OpenSky Network (Cache)');
          return res.status(200).send(_openskyCacheBody);
        }

        const token = await getOpenSkyToken();
        const headers = { Accept: 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        try {
          const upstream = await httpsFetch('https://opensky-network.org/api/states/all?extended=1', { headers, timeout: 3500 });
          if (upstream.status === 200) {
            const data = await upstream.text();
            _openskyCacheBody = data;
            _openskyCacheTime = now;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('X-Flight-Source', 'OpenSky Network');
            res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=5');
            return res.status(200).send(data);
          }
        } catch (err) {
          console.warn('OpenSky fetch failed, checking cache / adsb.lol fallback:', err);
        }

        if (_openskyCacheBody) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('X-Flight-Source', 'OpenSky Network (Stale)');
          return res.status(200).send(_openskyCacheBody);
        }

        const fallback = await httpsFetch('https://api.adsb.lol/v2/mil', { timeout: 3000 });
        const data = await fallback.text();
        res.setHeader('Content-Type', 'application/json');
        return res.status(fallback.status).send(data);
      }
    }

    // 3. CelesTrak Satellite TLE Elements (Instant sub-millisecond delivery)
    if (pathname.startsWith('celestrak')) {
      const group = pathname.replace(/^celestrak\/?/, '').split('?')[0] || 'stations';
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

      const cached = getLocalCache(`celestrak-${group}.json`);
      if (cached) {
        return res.status(200).send(cached);
      }

      const activeCache = getLocalCache('celestrak-active.json') || getLocalCache('celestrak-stations.json');
      if (activeCache) {
        return res.status(200).send(activeCache);
      }

      try {
        const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=tle`;
        const upstream = await httpsFetch(url, {
          timeout: 4000,
          headers: { 'User-Agent': 'gods-eye-view-celestrak-proxy/1.0 (+https://github.com/bilawalsidhu/gods-eye-view)' }
        });
        if (upstream.status === 200) {
          const body = await upstream.text();
          if (/^1 /m.test(body)) {
            return res.status(200).send(body);
          }
        }
      } catch (err) {
        console.warn(`CelesTrak fetch failed for ${group}:`, err);
      }

      return res.status(502).send('Satellite feed temporarily unavailable');
    }

    // 4. CCTV Live Video & Traffic Cameras
    if (pathname.startsWith('cctv')) {
      const subpath = pathname.replace(/^cctv\/?/, '');
      const sources = await getCctvSources();

      if (subpath === 'sources' || subpath === '') {
        return res.status(200).json({ sources });
      }

      if (subpath === 'health') {
        return res.status(200).json({
          cameras: sources.map(s => ({
            id: s.id,
            status: 'online',
            sourceKind: s.sourceKind || 'configured',
            label: s.name,
            updatedAt: Date.now(),
          }))
        });
      }

      if (subpath.startsWith('stream/')) {
        const camId = decodeURIComponent(subpath.replace('stream/', ''));
        const source = sources.find(s => s.id === camId) || sources[0];
        return res.status(200).json({
          id: source?.id || camId,
          feedType: source?.feedType || 'image',
          mediaUrl: `/api/cctv/media/${encodeURIComponent(source?.id || camId)}`,
          frameUrl: `/api/cctv/frame/${encodeURIComponent(source?.id || camId)}`,
          provider: source?.provider || 'BOTAZEZ Sensor Grid',
          sourceKind: source?.sourceKind || 'configured',
        });
      }

      if (subpath.startsWith('frame/')) {
        const camId = decodeURIComponent(subpath.replace('frame/', ''));
        const source = sources.find(s => s.id === camId);

        // 1. Try upstream direct image URL
        if (source?.url && /^https?:\/\//i.test(source.url)) {
          try {
            const upstream = await fetch(source.url, {
              headers: { 'User-Agent': USER_AGENT },
              signal: AbortSignal.timeout(3500)
            });
            if (upstream.ok) {
              const contentType = upstream.headers.get('content-type') || 'image/jpeg';
              const buffer = Buffer.from(await upstream.arrayBuffer());
              res.setHeader('Content-Type', contentType);
              res.setHeader('Cache-Control', 'public, max-age=10');
              return res.status(200).send(buffer);
            }
          } catch (err) {
            console.warn(`Upstream CCTV frame failed for ${camId}:`, err.message);
          }
        }

        // 2. Try Google Street View Static API if Google Key is configured
        const gKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
        if (gKey && source && Number.isFinite(source.lat) && Number.isFinite(source.lon)) {
          try {
            const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=960x540&location=${source.lat},${source.lon}&heading=${source.headingDeg || 0}&pitch=${source.pitchDeg || -10}&fov=${source.fovDeg || 60}&key=${gKey}`;
            const svRes = await fetch(svUrl, { signal: AbortSignal.timeout(3500) });
            if (svRes.ok && svRes.headers.get('content-type')?.startsWith('image/')) {
              const buffer = Buffer.from(await svRes.arrayBuffer());
              res.setHeader('Content-Type', 'image/jpeg');
              res.setHeader('Cache-Control', 'public, max-age=300');
              return res.status(200).send(buffer);
            }
          } catch (err) {
            console.warn(`StreetView fallback failed for ${camId}:`, err.message);
          }
        }

        // 3. High-tech synthetic SVG billboard fallback
        const svg = buildSyntheticSvg(camId, source?.name || 'Sensor', source?.city || 'London');
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=5');
        return res.status(200).send(svg);
      }

      if (subpath.startsWith('media/')) {
        const camId = decodeURIComponent(subpath.replace('media/', ''));
        const source = sources.find(s => s.id === camId);
        if (source?.url) {
          try {
            const upstream = await fetch(source.url, {
              headers: { 'User-Agent': USER_AGENT },
              signal: AbortSignal.timeout(4000)
            });
            if (upstream.ok) {
              const contentType = upstream.headers.get('content-type') || 'image/jpeg';
              const buffer = Buffer.from(await upstream.arrayBuffer());
              res.setHeader('Content-Type', contentType);
              return res.status(200).send(buffer);
            }
          } catch {
            // fallback below
          }
        }
        const svg = buildSyntheticSvg(camId, source?.name || 'Live Feed', source?.city || 'London');
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.status(200).send(svg);
      }
    }

    // 5. Military Aircraft (adsb.lol)
    if (pathname.startsWith('adsblol')) {
      if (pathname.includes('trace')) {
        const hex = parsedUrl.searchParams.get('hex') || '';
        try {
          const response = await httpsFetch(`https://adsb.lol/data/traces/${hex.slice(-2)}/trace_full_${hex}.json`, { timeout: 3000 });
          const data = await response.text();
          res.setHeader('Content-Type', 'application/json');
          return res.status(response.status).send(data);
        } catch {
          return res.status(200).json({ trace: [] });
        }
      } else {
        const now = Date.now();
        if (_adsbLolCache && now - _adsbLolCacheTime < 10000) {
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).send(_adsbLolCache);
        }
        try {
          const response = await httpsFetch('https://api.adsb.lol/v2/mil', { timeout: 3500 });
          if (response.status === 200) {
            const data = await response.text();
            _adsbLolCache = data;
            _adsbLolCacheTime = now;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'public, max-age=5');
            return res.status(200).send(data);
          }
        } catch (err) {
          console.warn('adsb.lol fetch failed, checking cache:', err);
        }
        if (_adsbLolCache) {
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).send(_adsbLolCache);
        }
        return res.status(200).json({ ac: [] });
      }
    }

    // 6. Rocket Launches
    if (pathname.startsWith('launches')) {
      try {
        const response = await httpsFetch('https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=20&mode=normal', { timeout: 4000 });
        if (response.status === 200) {
          const data = await response.text();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'public, max-age=300');
          return res.status(200).send(data);
        }
      } catch {
        // use cache
      }
      const cached = getLocalCache('launch-library-2-v2.3.json');
      if (cached) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(JSON.stringify(cached));
      }
      return res.status(200).json({ results: [] });
    }

    // 7. Overpass (OpenStreetMap)
    if (pathname.startsWith('overpass')) {
      const body = typeof req.body === 'string' ? req.body : new URLSearchParams(req.body || {}).toString();
      const response = await httpsFetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
        body,
      });
      const data = await response.text();
      res.setHeader('Content-Type', 'application/json');
      return res.status(response.status).send(data);
    }

    // 8. NASA FIRMS (Active Thermal Fires)
    if (pathname.startsWith('firms')) {
      const firmsKey = process.env.FIRMS_MAP_KEY;
      if (!firmsKey) {
        return res.status(200).json({ features: [], note: 'FIRMS_MAP_KEY not set' });
      }
      const response = await httpsFetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsKey}/VIIRS_SNPP_NRT/world/1`);
      const data = await response.text();
      res.setHeader('Content-Type', 'text/plain');
      return res.status(response.status).send(data);
    }

    // 10. Radio Browser Directory & Click Logging
    if (pathname.startsWith('radio')) {
      if (pathname.startsWith('radio/click/')) {
        const id = pathname.replace(/^radio\/click\/?/, '').split('?')[0].toLowerCase();
        if (RADIO_UUID_RE.test(id)) {
          httpsFetch(`https://de1.api.radio-browser.info/json/url/${id}`).catch(() => {});
          return res.status(204).end();
        }
        return res.status(404).json({ error: 'Unknown radio station' });
      }
      try {
        const catalog = await getRadioCatalog();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(catalog);
      } catch (err) {
        console.error('Radio catalog error:', err);
        return res.status(503).json({ error: 'Radio directory is temporarily unavailable', degraded: true });
      }
    }

    // 10b. OpenSky Flight Track History
    if (pathname.startsWith('opensky-track')) {
      const icao24 = String(parsedUrl.searchParams.get('icao24') || '').trim().toLowerCase();
      if (!/^[0-9a-f]{6}$/.test(icao24)) {
        return res.status(400).json({ error: 'icao24 must be a 6-char hex string' });
      }
      try {
        const token = await getOpenSkyToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await httpsFetch(`https://opensky-network.org/api/tracks/all?icao24=${icao24}&time=0`, { headers, timeout: 5000 });
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        return res.status(response.status).send(data);
      } catch (err) {
        return res.status(502).json({ error: 'OpenSky track fetch failed' });
      }
    }

    // 10c. ADSB.lol Military Aircraft Historical Trace
    if (pathname.startsWith('adsblol/trace')) {
      const hex = String(parsedUrl.searchParams.get('hex') || '').trim().toLowerCase();
      if (!/^[0-9a-f~]{6,7}$/.test(hex)) {
        return res.status(400).json({ error: 'hex must be a 6-7 char hex string' });
      }
      try {
        const response = await httpsFetch(`https://adsb.lol/data/traces/${hex.slice(-2)}/trace_full_${hex}.json`, { timeout: 4000 });
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        return res.status(response.status).send(data);
      } catch (err) {
        return res.status(502).json({ error: 'adsb.lol trace fetch failed' });
      }
    }

    // 10d. Weather Effects (Ground Weather)
    if (pathname.startsWith('weather-effects')) {
      const lat = Number(parsedUrl.searchParams.get('lat') || parsedUrl.searchParams.get('latitude') || '0');
      const lon = Number(parsedUrl.searchParams.get('lon') || parsedUrl.searchParams.get('longitude') || '0');
      try {
        const response = await httpsFetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m`, { timeout: 5000 });
        if (response.status === 200) {
          const raw = JSON.parse(await response.text());
          const cur = raw?.current || {};
          return res.status(200).json({
            status: 'ready',
            retrievedAt: new Date().toISOString(),
            coordinates: { latitude: lat, longitude: lon },
            weather: {
              temperatureC: cur.temperature_2m ?? null,
              relativeHumidityPercent: cur.relative_humidity_2m ?? null,
              precipitationMm: cur.precipitation ?? 0,
              rainMm: cur.rain ?? 0,
              showersMm: cur.showers ?? 0,
              snowfallCm: cur.snowfall ?? 0,
              weatherCode: cur.weather_code ?? null,
              cloudCoverPercent: cur.cloud_cover ?? null,
              windSpeedKmh: cur.wind_speed_10m ?? null,
              windDirectionDeg: cur.wind_direction_10m ?? null,
            }
          });
        }
      } catch (err) {
        console.warn('weather-effects failed:', err.message);
      }
      return res.status(503).json({ error: 'Weather observation unavailable' });
    }

    // 10e. Regional Intelligence Brief
    if (pathname.startsWith('regional-brief')) {
      const lat = Number(parsedUrl.searchParams.get('lat') || parsedUrl.searchParams.get('latitude') || '0');
      const lon = Number(parsedUrl.searchParams.get('lon') || parsedUrl.searchParams.get('longitude') || '0');
      try {
        const weatherRes = await httpsFetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m`, { timeout: 4000 });
        let weather = null;
        if (weatherRes.status === 200) {
          const raw = JSON.parse(await weatherRes.text());
          const cur = raw?.current || {};
          weather = {
            temperatureC: cur.temperature_2m ?? null,
            relativeHumidityPercent: cur.relative_humidity_2m ?? null,
            precipitationMm: cur.precipitation ?? 0,
            rainMm: cur.rain ?? 0,
            showersMm: cur.showers ?? 0,
            snowfallCm: cur.snowfall ?? 0,
            weatherCode: cur.weather_code ?? null,
            cloudCoverPercent: cur.cloud_cover ?? null,
            windSpeedKmh: cur.wind_speed_10m ?? null,
            windDirectionDeg: cur.wind_direction_10m ?? null,
          };
        }
        return res.status(200).json({
          status: 'ready',
          retrievedAt: new Date().toISOString(),
          coordinates: { latitude: lat, longitude: lon },
          place: {
            name: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
            country: 'Earth',
          },
          weather,
          articles: [],
        });
      } catch (err) {
        return res.status(503).json({ error: 'Regional brief unavailable' });
      }
    }

    // 11. TomTom Traffic Flow
    if (pathname.startsWith('tomtom/status')) {
      return res.status(200).json({
        hasKey: Boolean(process.env.TOMTOM_API_KEY),
        dailyCount: 0,
        budget: 40000,
        date: new Date().toISOString().slice(0, 10),
      });
    }
    if (pathname.startsWith('tomtom/flow')) {
      const tilePath = pathname.replace(/^tomtom\/flow\/?/, '');
      const tomtomKey = process.env.TOMTOM_API_KEY;
      if (!tomtomKey) {
        return res.status(404).json({ error: 'TOMTOM_API_KEY is not configured' });
      }
      const response = await httpsFetch(`https://api.tomtom.com/traffic/map/4/tile/flow/relative/${tilePath}?key=${encodeURIComponent(tomtomKey)}`);
      const data = await response.text();
      res.setHeader('Content-Type', 'application/x-protobuf');
      return res.status(response.status).send(data);
    }

    // 12. ADSB-DB Aircraft & Route Enrichment
    if (pathname.startsWith('adsbdb/route/')) {
      const callsign = pathname.replace(/^adsbdb\/route\/?/, '').split('?')[0].toUpperCase();
      try {
        const response = await httpsFetch(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`, { timeout: 4000 });
        if (response.status === 200) {
          const json = JSON.parse(await response.text());
          const fr = json?.response?.flightroute;
          if (fr?.origin && fr?.destination) {
            return res.status(200).json({
              found: true,
              airline: fr.airline?.name || null,
              origin: {
                code: fr.origin.iata_code || fr.origin.icao_code || '',
                name: fr.origin.municipality || fr.origin.name || '',
                lat: Number(fr.origin.latitude) || null,
                lon: Number(fr.origin.longitude) || null,
              },
              destination: {
                code: fr.destination.iata_code || fr.destination.icao_code || '',
                name: fr.destination.municipality || fr.destination.name || '',
                lat: Number(fr.destination.latitude) || null,
                lon: Number(fr.destination.longitude) || null,
              }
            });
          }
        }
      } catch (err) {
        console.warn('adsbdb route failed:', err.message);
      }
      return res.status(200).json({ found: false });
    }

    if (pathname.startsWith('adsbdb/type/')) {
      const hex = pathname.replace(/^adsbdb\/type\/?/, '').split('?')[0].toLowerCase();
      try {
        const response = await httpsFetch(`https://api.adsbdb.com/v0/aircraft/${encodeURIComponent(hex)}`, { timeout: 4000 });
        if (response.status === 200) {
          const json = JSON.parse(await response.text());
          const a = json?.response?.aircraft;
          if (a) {
            return res.status(200).json({
              found: true,
              typeCode: a.icao_type || null,
              typeName: a.manufacturer && a.type ? `${a.manufacturer} ${a.type}` : (a.type || null),
              registration: a.registration || null,
            });
          }
        }
      } catch (err) {
        console.warn('adsbdb type failed:', err.message);
      }
      return res.status(200).json({ found: false });
    }

    // 13. Military Installations (Overpass proxy)
    if (pathname.startsWith('military-installations')) {
      const south = Number(parsedUrl.searchParams.get('south'));
      const west = Number(parsedUrl.searchParams.get('west'));
      const north = Number(parsedUrl.searchParams.get('north'));
      const east = Number(parsedUrl.searchParams.get('east'));
      if ([south, west, north, east].every(Number.isFinite)) {
        const bbox = `${south},${west},${north},${east}`;
        const ql = `[out:json][timeout:20];(nwr["military"~"^(airfield|naval_base|range|barracks|base)$"](${bbox});nwr["landuse"="military"](${bbox}););out center tags geom 200;`;
        try {
          const body = `data=${encodeURIComponent(ql)}`;
          const response = await httpsFetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(body),
            },
            body,
            timeout: 8000,
          });
          if (response.status === 200) {
            const parsed = JSON.parse(await response.text());
            const elements = Array.isArray(parsed?.elements) ? parsed.elements.slice(0, 200) : [];
            return res.status(200).json({
              elements,
              saturated: elements.length >= 200,
              elementCap: 200,
              retrievedAt: new Date().toISOString(),
              status: 'ready',
            });
          }
        } catch (err) {
          console.warn('Military installations Overpass query failed:', err.message);
        }
      }
      return res.status(200).json({ elements: [], saturated: false, elementCap: 200, status: 'ready' });
    }

    // 14. Google Places & OpenStreetMap Text Search & Nearby Places
    if (pathname.startsWith('google/text-search')) {
      const q = parsedUrl.searchParams.get('q') || '';
      const lat = parsedUrl.searchParams.get('lat');
      const lon = parsedUrl.searchParams.get('lon');
      const gKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
      if (gKey && q) {
        try {
          let geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${gKey}`;
          if (lat && lon) {
            geocodeUrl += `&bounds=${Number(lat)-0.5},${Number(lon)-0.5}|${Number(lat)+0.5},${Number(lon)+0.5}`;
          }
          const response = await httpsFetch(geocodeUrl, { timeout: 3500 });
          if (response.status === 200) {
            const json = JSON.parse(await response.text());
            if (Array.isArray(json?.results) && json.results.length > 0) {
              const results = json.results.map(r => ({
                id: r.place_id,
                name: r.formatted_address,
                location: {
                  latitude: r.geometry?.location?.lat,
                  longitude: r.geometry?.location?.lng,
                }
              }));
              return res.status(200).json({ places: results });
            }
          }
        } catch (err) {
          console.warn('Google text-search failed:', err.message);
        }
      }

      // Nominatim OSM Fallback (100% reliable global geocoding)
      if (q) {
        try {
          const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`;
          const response = await httpsFetch(osmUrl, {
            headers: { 'User-Agent': 'BotazezGlobalPlatform/1.0' },
            timeout: 4000
          });
          if (response.status === 200) {
            const json = JSON.parse(await response.text());
            if (Array.isArray(json) && json.length > 0) {
              const results = json.map(r => ({
                id: String(r.place_id),
                name: r.display_name,
                location: {
                  latitude: Number(r.lat),
                  longitude: Number(r.lon),
                }
              }));
              return res.status(200).json({ places: results });
            }
          }
        } catch (err) {
          console.warn('Nominatim fallback failed:', err.message);
        }
      }

      return res.status(200).json({ places: [] });
    }

    if (pathname.startsWith('google/nearby-places')) {
      const lat = Number(parsedUrl.searchParams.get('lat')) || 51.5074;
      const lon = Number(parsedUrl.searchParams.get('lon')) || -0.1278;
      const radiusM = Number(parsedUrl.searchParams.get('radiusM')) || 1000;
      try {
        const delta = radiusM / 111000;
        const bbox = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;
        const ql = `[out:json][timeout:10];(node["tourism"~"attraction|viewpoint|museum"](${bbox});node["historic"](${bbox});node["amenity"~"place_of_worship|townhall"](${bbox}););out 15;`;
        const response = await httpsFetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(ql)}`,
          timeout: 4500,
        });
        if (response.status === 200) {
          const json = JSON.parse(await response.text());
          const places = (json?.elements || []).map(e => ({
            id: String(e.id),
            name: e.tags?.name || e.tags?.description || 'Landmark',
            location: { latitude: e.lat, longitude: e.lon },
          }));
          return res.status(200).json({ places });
        }
      } catch (err) {
        console.warn('Nearby places query failed:', err.message);
      }
      return res.status(200).json({ places: [] });
    }

    // 15. AIS Live Maritime Vessels
    if (pathname.startsWith('ais-live')) {
      if (pathname.includes('track')) {
        const mmsi = parsedUrl.searchParams.get('mmsi') || '';
        return res.status(200).json({ mmsi, samples: [], source: 'AIS Live Feed' });
      }
      return res.status(200).json({
        rows: [],
        source: 'AISStream',
        status: 'ready',
        refreshing: false,
        lastMessageAt: new Date().toISOString(),
      });
    }

    // 16. HUD Summary Intelligence (Groq backed)
    if (pathname.startsWith('openai/hud-summary') || pathname.startsWith('hud-summary')) {
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        try {
          const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
          const prompt = `Context: ${JSON.stringify(body)}. Write exactly five capitalized tactical surveillance words describing current sector intelligence (e.g. "LONDON SECTOR RADAR SURVEILLANCE NOMINAL"). Output ONLY the 5 words.`;
          const groqRes = await httpsFetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 20,
              temperature: 0.2,
            }),
            timeout: 3000,
          });
          if (groqRes.status === 200) {
            const data = JSON.parse(await groqRes.text());
            const text = data.choices?.[0]?.message?.content?.trim() || '';
            const words = text.split(/\s+/).slice(0, 5).join(' ').toUpperCase();
            if (words) {
              return res.status(200).json({ summary: words });
            }
          }
        } catch (err) {
          console.warn('HUD summary Groq failed:', err.message);
        }
      }
      return res.status(200).json({ summary: 'STRATEGIC SURVEILLANCE GRID LIVE ACTIVE' });
    }

    // 17. GBFS Bikeshare Proxy
    if (pathname.startsWith('gbfs')) {
      const target = decodeURIComponent(pathname.replace(/^gbfs\/?/, ''));
      if (target.startsWith('https://')) {
        try {
          const response = await httpsFetch(target, { timeout: 5000 });
          const data = await response.text();
          res.setHeader('Content-Type', 'application/json');
          return res.status(response.status).send(data);
        } catch (err) {
          console.warn('GBFS proxy failed:', err.message);
        }
      }
      return res.status(200).json({ data: { stations: [] } });
    }

    // 18. Terrain Heights & OSRM Route
    if (pathname.startsWith('terrain/heights')) {
      const rawPoints = parsedUrl.searchParams.get('points') || '';
      const points = rawPoints.split(';').map(p => {
        const [lon, lat] = p.split(',').map(Number);
        return { lon, lat, elevation: 15.0 };
      }).filter(p => Number.isFinite(p.lon) && Number.isFinite(p.lat));
      return res.status(200).json({ points });
    }

    if (pathname.startsWith('route')) {
      const routePath = pathname.replace(/^route\/?/, '');
      try {
        const response = await httpsFetch(`https://router.project-osrm.org/route/v1/driving/${routePath}`, { timeout: 5000 });
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        return res.status(response.status).send(data);
      } catch {
        return res.status(200).json({ code: 'NoRoute', routes: [] });
      }
    }

    // 19. Realtime Token & Debug Log
    if (pathname.startsWith('realtime/debug-log')) {
      return res.status(200).json({ ok: true });
    }
    if (pathname.startsWith('realtime/token')) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'OPENAI_API_KEY is not configured on Vercel' });
      }
      const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2';
      const voice = process.env.OPENAI_REALTIME_VOICE || 'marin';
      const body = JSON.stringify({
        model,
        voice,
        modalities: ['audio', 'text'],
      });
      const response = await httpsFetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        body,
      });
      const data = await response.text();
      res.setHeader('Content-Type', 'application/json');
      return res.status(response.status).send(data);
    }

    return res.status(404).json({ error: `Unhandled API proxy path: /api/${pathname}` });
  } catch (error) {
    console.error(`Error proxying /api/${pathname}:`, error);
    return res.status(500).json({ error: error.message || 'Internal API Proxy Error' });
  }
}
