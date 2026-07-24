
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * OSIRIS — Space Weather API
 * Real-time solar activity from NOAA Space Weather Prediction Center
 * (Kp index, alerts, X-ray flares — no key needed), plus NASA's own
 * DONKI (coronal mass ejections) and NeoWs (near-Earth object close
 * approaches) layered on top. NASA_API_KEY env var if set, otherwise
 * falls back to the public DEMO_KEY (rate-limited but always works).
 */

const NASA_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';

export async function GET() {
  try {
    const today = new Date();
    const startDate = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endDate = today.toISOString().slice(0, 10);

    const [kpRes, alertsRes, flareRes, cmeRes, neoRes] = await Promise.allSettled([
      fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json', {
        signal: AbortSignal.timeout(8000),
      }).then(r => r.json()),
      fetch('https://services.swpc.noaa.gov/json/alerts.json', {
        signal: AbortSignal.timeout(8000),
      }).then(r => r.json()),
      fetch('https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json', {
        signal: AbortSignal.timeout(8000),
      }).then(r => r.json()),
      // NASA DONKI — coronal mass ejections, last 3 days
      fetch(`https://api.nasa.gov/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_KEY}`, {
        signal: AbortSignal.timeout(8000),
      }).then(r => r.json()),
      // NASA NeoWs — near-Earth object close approaches, today
      fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${endDate}&end_date=${endDate}&api_key=${NASA_KEY}`, {
        signal: AbortSignal.timeout(8000),
      }).then(r => r.json()),
    ]);

    // Latest Kp index (geomagnetic storm indicator)
    let kpIndex = 0;
    let kpTimestamp = '';
    if (kpRes.status === 'fulfilled' && Array.isArray(kpRes.value) && kpRes.value.length > 0) {
      const latest = kpRes.value[kpRes.value.length - 1];
      kpIndex = parseFloat(latest.kp_index || latest.Kp || 0);
      kpTimestamp = latest.time_tag || '';
    }

    // Storm level from Kp
    let stormLevel = 'Quiet';
    let stormColor = '#00E676';
    if (kpIndex >= 8) { stormLevel = 'Extreme (G5)'; stormColor = '#FF1744'; }
    else if (kpIndex >= 7) { stormLevel = 'Severe (G4)'; stormColor = '#FF3D3D'; }
    else if (kpIndex >= 6) { stormLevel = 'Strong (G3)'; stormColor = '#FF9500'; }
    else if (kpIndex >= 5) { stormLevel = 'Moderate (G2)'; stormColor = '#FFD700'; }
    else if (kpIndex >= 4) { stormLevel = 'Minor (G1)'; stormColor = '#FFD700'; }
    else if (kpIndex >= 3) { stormLevel = 'Unsettled'; stormColor = '#D4AF37'; }

    // Recent alerts
    const alerts: any[] = [];
    if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value)) {
      for (const alert of alertsRes.value.slice(0, 10)) {
        alerts.push({
          id: alert.product_id || `alert-${Date.now()}`,
          issue_datetime: alert.issue_datetime,
          message: (alert.message || '').substring(0, 200),
        });
      }
    }

    // Recent solar flares
    const flares: any[] = [];
    if (flareRes.status === 'fulfilled' && Array.isArray(flareRes.value)) {
      for (const flare of flareRes.value.slice(0, 5)) {
        if (!flare.max_class) continue;
        flares.push({
          class: flare.max_class,
          begin: flare.begin_time,
          peak: flare.max_time,
          end: flare.end_time,
        });
      }
    }

    // NASA DONKI — recent coronal mass ejections
    const cmeEvents: any[] = [];
    if (cmeRes.status === 'fulfilled' && Array.isArray(cmeRes.value)) {
      for (const cme of cmeRes.value.slice(-5).reverse()) {
        const analysis = Array.isArray(cme.cmeAnalyses) && cme.cmeAnalyses.length > 0 ? cme.cmeAnalyses[0] : null;
        cmeEvents.push({
          id: cme.activityID,
          start_time: cme.startTime,
          source_location: cme.sourceLocation || '',
          speed_km_s: analysis?.speed ?? null,
          is_earth_directed: !!analysis?.isMostAccurate && !!analysis?.enlilList?.length,
          note: (cme.note || '').substring(0, 220),
        });
      }
    }

    // NASA NeoWs — near-Earth objects making a close approach today
    let neoToday: any[] = [];
    let neoHazardousCount = 0;
    if (neoRes.status === 'fulfilled' && neoRes.value?.near_earth_objects) {
      const todaysNeos = neoRes.value.near_earth_objects[endDate] || [];
      neoToday = todaysNeos.map((n: any) => {
        const approach = n.close_approach_data?.[0];
        return {
          id: n.id,
          name: (n.name || '').replace(/[()]/g, ''),
          is_hazardous: !!n.is_potentially_hazardous_asteroid,
          diameter_m_max: n.estimated_diameter?.meters?.estimated_diameter_max ?? null,
          miss_distance_km: approach ? parseFloat(approach.miss_distance?.kilometers || '0') : null,
          velocity_kph: approach ? parseFloat(approach.relative_velocity?.kilometers_per_hour || '0') : null,
        };
      }).sort((a: any, b: any) => (a.miss_distance_km ?? Infinity) - (b.miss_distance_km ?? Infinity));
      neoHazardousCount = neoToday.filter((n: any) => n.is_hazardous).length;
    }

    return NextResponse.json({
      kp_index: kpIndex,
      storm_level: stormLevel,
      storm_color: stormColor,
      kp_timestamp: kpTimestamp,
      alerts,
      solar_flares: flares,
      cme_events: cmeEvents,
      neo_today: neoToday,
      neo_hazardous_count: neoHazardousCount,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Space Weather API error:', error);
    return NextResponse.json({
      kp_index: 0, storm_level: 'Unknown', storm_color: '#555',
      alerts: [], solar_flares: [], cme_events: [], neo_today: [], neo_hazardous_count: 0,
      error: 'Failed to fetch space weather data',
    }, { status: 500 });
  }
}
