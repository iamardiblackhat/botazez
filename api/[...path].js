/**
 * Vercel Serverless API Proxy for BOTAZEZ (God's Eye View)
 * Handles all live data proxying natively on Vercel without third-party containers.
 */

let _openskyToken = null;
let _openskyTokenExpiry = 0;

async function getOpenSkyToken() {
  const now = Date.now();
  if (_openskyToken && now < _openskyTokenExpiry - 60000) return _openskyToken;

  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(
      'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`,
      }
    );
    const data = await res.json();
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
    // 1. OpenSky Live Aircraft
    if (pathname.startsWith('opensky')) {
      if (pathname === 'opensky-track') {
        const icao24 = parsedUrl.searchParams.get('icao24') || '';
        const token = await getOpenSkyToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(`https://opensky-network.org/api/tracks/all?icao24=${encodeURIComponent(icao24)}&time=0`, { headers });
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        return res.status(response.status).send(data);
      } else {
        const token = await getOpenSkyToken();
        const headers = { Accept: 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        
        const upstream = await fetch('https://opensky-network.org/api/states/all?extended=1', { headers });
        const data = await upstream.text();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=5');
        return res.status(upstream.status).send(data);
      }
    }

    // 2. Celestrak Satellites
    if (pathname.startsWith('celestrak')) {
      const upstream = await fetch(`https://celestrak.org/NORAD/elements/gp.php${search}`);
      const data = await upstream.text();
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      return res.status(upstream.status).send(data);
    }

    // 3. Overpass (Roads / Buildings / Features)
    if (pathname.startsWith('overpass')) {
      const body = req.body || '';
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: typeof body === 'string' ? body : new URLSearchParams(body).toString(),
      });
      const data = await response.text();
      res.setHeader('Content-Type', 'application/json');
      return res.status(response.status).send(data);
    }

    // 4. Military Aircraft (adsb.lol)
    if (pathname.startsWith('adsblol')) {
      if (pathname.includes('trace')) {
        const hex = parsedUrl.searchParams.get('hex') || '';
        const response = await fetch(`https://adsb.lol/data/traces/${hex.slice(-2)}/trace_full_${hex}.json`);
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        return res.status(response.status).send(data);
      } else {
        const response = await fetch('https://api.adsb.lol/v2/mil');
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=5');
        return res.status(response.status).send(data);
      }
    }

    // 5. Rocket Launches
    if (pathname.startsWith('launches')) {
      const response = await fetch(`https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=20&mode=normal`);
      const data = await response.text();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(response.status).send(data);
    }

    // 6. NASA FIRMS (Active Fires)
    if (pathname.startsWith('firms')) {
      const firmsKey = process.env.FIRMS_MAP_KEY;
      if (!firmsKey) {
        return res.status(200).json({ features: [], note: 'FIRMS_MAP_KEY not set' });
      }
      const response = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsKey}/VIIRS_SNPP_NRT/world/1`);
      const data = await response.text();
      res.setHeader('Content-Type', 'text/plain');
      return res.status(response.status).send(data);
    }

    // 7. Weather Observations (Open-Meteo)
    if (pathname.startsWith('weather-effects')) {
      const lat = parsedUrl.searchParams.get('latitude') || '0';
      const lon = parsedUrl.searchParams.get('longitude') || '0';
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m`);
      const data = await response.text();
      res.setHeader('Content-Type', 'application/json');
      return res.status(response.status).send(data);
    }

    // 8. Radio Browser
    if (pathname.startsWith('radio')) {
      const response = await fetch(`https://de1.api.radio-browser.info/json/stations/topclick/100`);
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
