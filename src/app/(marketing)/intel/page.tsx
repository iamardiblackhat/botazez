import type { Metadata } from 'next';
import Link from 'next/link';
import { DOMAINS, layersFor } from '@/lib/domains';

export const metadata: Metadata = {
  title: 'Intelligence Domains — Botazez',
  description:
    'Every intelligence domain Botazez monitors, organised by category: aviation, maritime, space, surveillance, natural hazards, conflict, infrastructure and cyber.',
};

export default function IntelIndexPage() {
  const totalLayers = DOMAINS.reduce((n, d) => n + layersFor(d).length, 0);

  return (
    <>
      <header className="tl-section tl-section--tight">
        <p className="tl-eyebrow">Coverage</p>
        <h1 className="tl-h1">Intelligence domains</h1>
        <p className="tl-lede">
          Botazez monitors {DOMAINS.length} domains across {totalLayers} live layers. Each has
          its own page: what it watches, where the data comes from, and how to read it —
          before you ever open the globe.
        </p>
      </header>

      <section className="tl-section tl-section--tight">
        <div className="tl-domain-grid">
          {DOMAINS.map(domain => {
            const layers = layersFor(domain);
            return (
              <Link key={domain.slug} href={`/intel/${domain.slug}`} className="tl-domain-card">
                <span className="tl-domain-rule" style={{ background: domain.accent }} />
                <h2 className="tl-domain-name">{domain.name}</h2>
                <p className="tl-domain-summary">{domain.summary}</p>
                <dl className="tl-domain-meta">
                  <div>
                    <dt>Layers</dt>
                    <dd>{layers.length}</dd>
                  </div>
                  <div>
                    <dt>Sources</dt>
                    <dd>{domain.sources.length}</dd>
                  </div>
                  <div>
                    <dt>Endpoints</dt>
                    <dd>{domain.endpoints.length}</dd>
                  </div>
                </dl>
                <span className="tl-domain-cta">Open domain →</span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
