/**
 * Vercel Serverless API Proxy for BOTAZEZ (God's Eye View)
 * Handles all live data proxying and Groq voice intelligence natively on Vercel.
 */

import https from 'node:https';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let _openskyToken = null;
let _openskyTokenExpiry = 0;

function httpsFetch(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
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

    req.on('error', (err) => reject(err));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getOpenSkyToken() {
  const now = Date.now();
  if (_openskyToken && now < _openskyTokenExpiry - 60000) return _openskyToken;

  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

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

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const parsedUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/^\/api\/?/, '');
  const search = parsedUrl.search;

  try {
    // 1. Groq Chat & Map Intelligence
    if (pathname.startsWith('groq/chat')) {
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) return res.status(503).json({ error: 'GROQ_API_KEY is not configured on Vercel' });

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
              content: 'You are ARDI, the voice intelligence system for BOTAZEZ Global Intelligence Platform. Be concise, authoritative, and helpful (1-3 sentences). If the user asks to navigate somewhere, mention the destination.'
            },
            { role: 'user', content: userPrompt }
          ],
        }),
      });
      const data = await groqRes.json();
      const reply = data.choices?.[0]?.message?.content || 'Command acknowledged.';
      return res.status(200).json({ reply });
    }

    // 2. OpenSky Live Aircraft
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
        const token = await getOpenSkyToken();
        const headers = { Accept: 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        
        const upstream = await httpsFetch('https://opensky-network.org/api/states/all?extended=1', { headers });
        const data = await upstream.text();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=5');
        return res.status(upstream.status).send(data);
      }
    }

    // 3. Realtime Token / Voice Standby
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

    // 4. Celestrak Satellites
    if (pathname.startsWith('celestrak')) {
      const upstream = await httpsFetch(`https://celestrak.org/NORAD/elements/gp.php${search}`);
      const data = await upstream.text();
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      return res.status(upstream.status).send(data);
    }

    // 5. Overpass (Roads / Buildings / Features)
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

    // 6. Military Aircraft (adsb.lol)
    if (pathname.startsWith('adsblol')) {
      if (pathname.includes('trace')) {
        const hex = parsedUrl.searchParams.get('hex') || '';
        const response = await httpsFetch(`https://adsb.lol/data/traces/${hex.slice(-2)}/trace_full_${hex}.json`);
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        return res.status(response.status).send(data);
      } else {
        const response = await httpsFetch('https://api.adsb.lol/v2/mil');
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=5');
        return res.status(response.status).send(data);
      }
    }

    // 7. Rocket Launches
    if (pathname.startsWith('launches')) {
      const response = await httpsFetch(`https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=20&mode=normal`);
      const data = await response.text();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(response.status).send(data);
    }

    // 8. NASA FIRMS (Active Fires)
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

    // 9. Weather Observations (Open-Meteo)
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
      const response = await httpsFetch(`https://de1.api.radio-browser.info/json/stations/topclick/100`);
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
