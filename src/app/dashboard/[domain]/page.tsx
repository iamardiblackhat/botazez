'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { domainBySlug, layersFor } from '@/lib/domains';
import { DOMAIN_FEEDS, activeLayersForDomain } from '@/lib/domainFeeds';

const OsirisMap = dynamic(() => import('@/components/OsirisMap'), { ssr: false });
const CameraViewer = dynamic(() => import('@/components/CameraViewer'), { ssr: false });

/** Generic "top items" reader — every feed differs in shape, so this reads
 *  whatever a raw item is most likely to be called rather than assuming one
 *  schema across domains. */
function itemLabel(item: any): string {
  return item?.name || item?.title || item?.callsign || item?.place || item?.description
    || item?.headline || item?.location || item?.city || 'Unnamed item';
}

export default function DomainDashboardPage() {
  const params = useParams<{ domain: string }>();
  const slug = params?.domain as string;
  const domain = domainBySlug(slug);

  const dataRef = useRef<any>({});
  const [dataVersion, setDataVersion] = useState(0);
  const [activeCamera, setActiveCamera] = useState<any>(null);

  const fetchAll = useCallback(async () => {
    const feeds = DOMAIN_FEEDS[slug] || [];
    await Promise.all(feeds.map(async (feed) => {
      try {
        const res = await fetch(feed.url, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        const shaped = feed.transform ? feed.transform(json) : json;
        dataRef.current = { ...dataRef.current, ...shaped };
      } catch (e) {
        console.warn(`[dashboard/${slug}] feed failed:`, feed.url, e instanceof Error ? e.message : e);
      }
    }));
    setDataVersion((v) => v + 1);
  }, [slug]);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 60000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  if (!domain) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-void)', color: 'var(--text-primary)' }}>
        <p className="font-mono text-[13px]" style={{ color: 'var(--text-muted)' }}>Unknown domain &ldquo;{slug}&rdquo;.</p>
        <Link href="/dashboard" className="font-mono text-[12px] underline" style={{ color: 'var(--gold-primary)' }}>← Back to the dashboard</Link>
      </main>
    );
  }

  const data = dataRef.current;
  const activeLayers = activeLayersForDomain(domain.slug);
  const layers = layersFor(domain);

  // Total live count across every dataKey this domain's layers reference.
  const seenKeys = new Set<string>();
  let liveTotal = 0;
  for (const l of layers) {
    for (const dk of l.dataKeys) {
      if (seenKeys.has(dk)) continue;
      seenKeys.add(dk);
      const arr = data[dk];
      if (Array.isArray(arr)) liveTotal += arr.length;
    }
  }

  const isSurveillance = domain.slug === 'surveillance';
  const cameras: any[] = Array.isArray(data.cameras) ? data.cameras : [];
  const liveFeeds: any[] = Array.isArray(data.live_feeds) ? data.live_feeds : [];

  // For non-surveillance domains: a flat, generic "top items" list from the
  // first populated dataKey, so every domain page shows real live content
  // even before it gets a bespoke widget.
  const topItems: any[] = (() => {
    for (const l of layers) {
      for (const dk of l.dataKeys) {
        const arr = data[dk];
        if (Array.isArray(arr) && arr.length) return arr.slice(0, 25);
      }
    }
    return [];
  })();

  return (
    <main className="min-h-screen w-full flex flex-col" style={{ background: 'var(--bg-void)', color: 'var(--text-primary)' }} key={dataVersion}>
      <header className="flex items-center gap-4 px-6 py-4 md:px-8" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
        <Link href="/dashboard" className="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Hub
        </Link>
        <div className="h-4 w-px" style={{ background: 'var(--border-secondary)' }} />
        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: domain.accent }} />
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text-heading)' }}>{domain.name}</h1>
        <span className="hidden md:inline text-[13px]" style={{ color: 'var(--text-secondary)' }}>{domain.summary}</span>
        <span className="ml-auto font-mono text-[13px] font-bold tabular-nums" style={{ color: domain.accent }}>
          {liveTotal.toLocaleString()} live
        </span>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Focused map — this domain's layers only, always on */}
        <div className="relative flex-1 min-h-[340px] lg:min-h-0">
          <OsirisMap data={data} activeLayers={activeLayers} theme="light" projection="mercator" />
        </div>

        {/* Always-visible side dock — no hover, no click-to-reveal */}
        <aside
          className="lg:w-[360px] flex-shrink-0 overflow-y-auto p-4 flex flex-col gap-3"
          style={{ borderLeft: '1px solid var(--border-secondary)', background: 'var(--bg-panel)' }}
        >
          <p className="text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{domain.description}</p>

          <div className="flex flex-wrap gap-1.5">
            {domain.sources.map((s) => (
              <span key={s} className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: 'var(--hover-accent)', color: 'var(--text-muted)' }}>
                {s}
              </span>
            ))}
          </div>

          {isSurveillance ? (
            <>
              <div>
                <h2 className="font-mono text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Cameras — {cameras.length}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {cameras.slice(0, 20).map((cam) => (
                    <button
                      key={cam.id}
                      onClick={() => setActiveCamera(cam)}
                      className="glass-panel-interactive rounded-lg overflow-hidden text-left"
                      style={{ aspectRatio: '4/3' }}
                    >
                      {cam.feed_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cam.feed_url} alt={cam.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {cam.name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="font-mono text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Live news — {liveFeeds.length}
                </h2>
                <div className="flex flex-col gap-1.5">
                  {liveFeeds.slice(0, 12).map((feed: any, i: number) => (
                    <a key={i} href={feed.url} target="_blank" rel="noreferrer" className="glass-panel-interactive rounded-md px-3 py-2 text-[12px]" style={{ color: 'var(--text-primary)' }}>
                      {feed.name || feed.title || feed.channel || 'Live feed'}
                    </a>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Live items — {topItems.length}
              </h2>
              <div className="flex flex-col gap-1.5">
                {topItems.map((item: any, i: number) => (
                  <div key={i} className="glass-panel-interactive rounded-md px-3 py-2 text-[12px]" style={{ color: 'var(--text-primary)' }}>
                    {itemLabel(item)}
                  </div>
                ))}
                {topItems.length === 0 && (
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Loading live data…</p>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {activeCamera && <CameraViewer camera={activeCamera} onClose={() => setActiveCamera(null)} />}
    </main>
  );
}
