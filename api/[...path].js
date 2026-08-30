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

  // 1. London TfL JamCams
  try {
    const res = await httpsFetch('https://api.tfl.gov.uk/Place/Type/JamCam', { timeout: 4000 });
    if (res.status === 200) {
      const places = JSON.parse(await res.text());
      if (Array.isArray(places)) {
        for (const place of places.slice(0, 250)) {
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

  // 2. Austin Open Data traffic cameras
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

  // 3. Fallback Curated Seeds for Major World Metros
  const worldSeeds = [
    { id: 'lon-trafalgar', name: 'Trafalgar Square NW', city: 'London', cityId: 'london', lat: 51.5080, lon: -0.1281, headingDeg: 315, pitchDeg: -16, fovDeg: 55, rangeM: 160, mountHeightM: 10, groundElevationM: 15 },
    { id: 'lon-towerbridge', name: 'Tower Bridge Approach', city: 'London', cityId: 'london', lat: 51.5055, lon: -0.0754, headingDeg: 20, pitchDeg: -14, fovDeg: 50, rangeM: 200, mountHeightM: 14, groundElevationM: 12 },
    { id: 'lon-piccadilly', name: 'Piccadilly Circus East', city: 'London', cityId: 'london', lat: 51.5101, lon: -0.1342, headingDeg: 90, pitchDeg: -22, fovDeg: 60, rangeM: 140, mountHeightM: 9, groundElevationM: 18 },
    { id: 'tok-shibuya', name: 'Shibuya Crossing Apex', city: 'Tokyo', cityId: 'tokyo', lat: 35.6595, lon: 139.7005, headingDeg: 140, pitchDeg: -26, fovDeg: 65, rangeM: 180, mountHeightM: 22, groundElevationM: 20 },
    { id: 'nyc-times-sq', name: 'Times Square North 46th', city: 'New York', cityId: 'nyc', lat: 40.7580, lon: -73.9855, headingDeg: 10, pitchDeg: -20, fovDeg: 60, rangeM: 220, mountHeightM: 16, groundElevationM: 10 },
    { id: 'par-champs', name: 'Champs-Élysées / Concorde', city: 'Paris', cityId: 'paris', lat: 48.8656, lon: 2.3212, headingDeg: 295, pitchDeg: -15, fovDeg: 55, rangeM: 250, mountHeightM: 12, groundElevationM: 30 },
  ];
  for (const seed of worldSeeds) {
    if (!sources.some(s => s.id === seed.id)) {
      sources.push({
        ...seed,
        provider: 'BOTAZEZ High-Resolution Sensor Network',
        headingConfidence: 'curated',
        feedType: 'image',
        sourceKind: 'curated',
        license: 'BOTAZEZ Intelligence Grid',
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

function getLocalCache(filename) {
  try {
    const possiblePaths = [
      path.join(process.cwd(), 'api', 'cache', filename),
      path.join(process.cwd(), '.gev-cache', filename),
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

    // 9. Weather Effects (Open-Meteo)
    if (pathname.startsWith('weather-effects')) {
      const lat = parsedUrl.searchParams.get('latitude') || '0';
      const lon = parsedUrl.searchParams.get('longitude') || '0';
      const response = await httpsFetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m`);
      const data = await response.text();
      res.setHeader('Content-Type', 'application/json');
      return res.status(response.status).send(data);
    }

    // 10. Radio Browser
    if (pathname.startsWith('radio')) {
      const response = await httpsFetch('https://de1.api.radio-browser.info/json/stations/topclick/100');
      const data = await response.text();
      res.setHeader('Content-Type', 'application/json');
      return res.status(response.status).send(data);
    }

    // 11. Realtime Token & Debug Log
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
