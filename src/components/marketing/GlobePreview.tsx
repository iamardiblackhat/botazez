'use client';

/*
   BOTAZEZ — homepage hero globe.
   The actual Cesium Earth from /dashboard, carrying real live traffic,
   dropped into the hero as a look-don't-touch preview (input disabled,
   slow ambient auto-rotate) so the front page shows the product instead
   of describing it. Same data shape /dashboard feeds BotazezGlobe —
   just three feeds instead of thirty, fetched once client-side.
*/

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const BotazezGlobe = dynamic(() => import('@/components/BotazezGlobe'), { ssr: false });

const PREVIEW_LAYERS = { flights: true, earthquakes: true, fires: true };

const EQ_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

export default function GlobePreview() {
  const dataRef = useRef<any>({});
  const [, setTick] = useState(0);
  const [counts, setCounts] = useState({ flights: 0, earthquakes: 0, fires: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const merge = (patch: Record<string, any>) => {
      if (cancelled) return;
      dataRef.current = { ...dataRef.current, ...patch };
      setTick(t => t + 1);
      setCounts({
        flights: dataRef.current.commercial_flights?.length ?? 0,
        earthquakes: dataRef.current.earthquakes?.length ?? 0,
        fires: dataRef.current.fires?.length ?? 0,
      });
    };

    fetch('/api/flights').then(r => r.ok ? r.json() : null).then(d => d && merge(d)).catch(() => {});
    fetch('/api/fires').then(r => r.ok ? r.json() : null).then(d => d && merge({ fires: d.fires })).catch(() => {});
    fetch(EQ_URL).then(r => r.ok ? r.json() : null).then(d => d && merge({
      earthquakes: (d.features || []).map((f: any) => ({
        lat: f.geometry?.coordinates?.[1] || 0,
        lng: f.geometry?.coordinates?.[0] || 0,
        magnitude: f.properties?.mag,
        place: f.properties?.place,
      })),
    })).catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const total = counts.flights + counts.earthquakes + counts.fires;

  return (
    <div className="tl-hero-globe-frame">
      <span className="tl-hero-globe-corner tl-hero-globe-corner--tl" aria-hidden="true" />
      <span className="tl-hero-globe-corner tl-hero-globe-corner--tr" aria-hidden="true" />
      <span className="tl-hero-globe-corner tl-hero-globe-corner--bl" aria-hidden="true" />
      <span className="tl-hero-globe-corner tl-hero-globe-corner--br" aria-hidden="true" />

      <BotazezGlobe
        data={dataRef.current}
        activeLayers={PREVIEW_LAYERS}
        theme="light"
        interactive={false}
        autoRotate
        initialHeight={9_500_000}
        onReady={() => setReady(true)}
      />

      <div className="tl-hero-globe-badge">
        <span className="tl-hero-globe-dot animate-data-pulse" aria-hidden="true" />
        {ready ? `${total} tracked live now` : 'Connecting to live feeds…'}
      </div>
    </div>
  );
}
