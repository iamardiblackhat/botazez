'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plane, Ship, Satellite, Camera, CloudLightning, AlertTriangle, Factory, Network as NetworkIcon, ArrowUpRight } from 'lucide-react';
import { DOMAINS, layersFor } from '@/lib/domains';

const DOMAIN_ICONS: Record<string, typeof Plane> = {
  aviation: Plane,
  maritime: Ship,
  space: Satellite,
  surveillance: Camera,
  hazards: CloudLightning,
  threat: AlertTriangle,
  infrastructure: Factory,
  network: NetworkIcon,
};

/** Which live count from /api/stats represents each domain on the hub. */
const DOMAIN_STAT_KEY: Record<string, string> = {
  aviation: 'flights',
  maritime: 'maritime',
  space: 'sats',
  surveillance: 'cctv',
  hazards: 'weather',
  threat: 'incidents',
  infrastructure: 'nuclear',
  network: 'malware',
};

export default function DashboardHub() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setStats(d.stats || null); })
      .catch(() => { /* tiles just show without a live count */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <main
      className="min-h-screen w-full"
      style={{ background: 'var(--bg-void)', color: 'var(--text-primary)' }}
    >
      <header className="px-6 pt-10 pb-6 md:px-10 md:pt-14">
        <p
          className="font-mono text-[11px] tracking-[0.3em] uppercase mb-2"
          style={{ color: 'var(--gold-primary)' }}
        >
          Command Center
        </p>
        <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight" style={{ color: 'var(--text-heading)' }}>
          Botazez Dashboard
        </h1>
        <p className="mt-2 max-w-xl text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          Pick a domain below to open its own live command center — every feed for that domain,
          always visible, in one place.
        </p>
      </header>

      <section className="px-6 pb-16 md:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DOMAINS.map((domain, i) => {
            const Icon = DOMAIN_ICONS[domain.slug] ?? Plane;
            const statKey = DOMAIN_STAT_KEY[domain.slug];
            const liveCount = stats && statKey ? stats[statKey] : undefined;
            const layerCount = layersFor(domain).length;

            return (
              <motion.div
                key={domain.slug}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={`/dashboard/${domain.slug}`}
                  className="glass-panel-interactive group block h-full rounded-2xl p-5"
                  style={{ borderTop: `3px solid ${domain.accent}` }}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: `${domain.accent}1A`, color: domain.accent }}
                    >
                      <Icon size={20} strokeWidth={2} />
                    </div>
                    <ArrowUpRight
                      size={18}
                      className="opacity-0 -translate-y-1 translate-x-1 transition-all duration-200 group-hover:opacity-60 group-hover:translate-y-0 group-hover:translate-x-0"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </div>

                  <h2 className="mt-4 text-[16px] font-semibold" style={{ color: 'var(--text-heading)' }}>
                    {domain.name}
                  </h2>
                  <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                    {domain.summary}
                  </p>

                  <div
                    className="mt-4 flex items-baseline justify-between border-t pt-3"
                    style={{ borderColor: 'var(--border-secondary)' }}
                  >
                    <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      {layerCount} live layer{layerCount === 1 ? '' : 's'}
                    </span>
                    <span
                      className="font-mono text-[15px] font-bold tabular-nums"
                      style={{ color: domain.accent }}
                    >
                      {liveCount === undefined ? '···' : liveCount.toLocaleString()}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8">
          <Link
            href="/dashboard/full"
            className="font-mono text-[12px] uppercase tracking-wider underline decoration-dotted underline-offset-4"
            style={{ color: 'var(--text-muted)' }}
          >
            Open the full combined map instead →
          </Link>
        </div>
      </section>
    </main>
  );
}
