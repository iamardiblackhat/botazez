import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DOMAINS, domainBySlug, layersFor } from '@/lib/domains';

export function generateStaticParams() {
  return DOMAINS.map(d => ({ slug: d.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const domain = domainBySlug(slug);
  if (!domain) return { title: 'Domain not found — Botazez' };
  return {
    title: `${domain.name} intelligence — Botazez`,
    description: domain.summary,
  };
}

export default async function DomainPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const domain = domainBySlug(slug);
  if (!domain) notFound();

  const layers = layersFor(domain);
  const index = DOMAINS.findIndex(d => d.slug === domain.slug);
  const next = DOMAINS[(index + 1) % DOMAINS.length];

  return (
    <>
      <header className="tl-section tl-section--tight">
        <p className="tl-eyebrow">
          <Link href="/intel" className="tl-breadcrumb">Domains</Link> · {domain.name}
        </p>
        <h1 className="tl-h1">{domain.name}</h1>
        <p className="tl-lede">{domain.description}</p>

        <div className="tl-stat-row">
          <div className="tl-stat">
            <span className="tl-stat-value" style={{ color: domain.accent }}>{layers.length}</span>
            <span className="tl-stat-label">Live layers</span>
          </div>
          <div className="tl-stat">
            <span className="tl-stat-value" style={{ color: domain.accent }}>{domain.sources.length}</span>
            <span className="tl-stat-label">Upstream sources</span>
          </div>
          <div className="tl-stat">
            <span className="tl-stat-value" style={{ color: domain.accent }}>{domain.endpoints.length}</span>
            <span className="tl-stat-label">API endpoints</span>
          </div>
        </div>
      </header>

      {/* Layers — the information-first table this domain contributes */}
      <section className="tl-section tl-section--tight">
        <h2 className="tl-h2">Layers</h2>
        <p className="tl-body">
          Each layer can be toggled independently on the live surface. Counts update from the
          upstream feed as data arrives.
        </p>
        <div className="tl-table-wrap">
          <table className="tl-table">
            <thead>
              <tr>
                <th scope="col">Layer</th>
                <th scope="col">Feed key</th>
                <th scope="col">Marker</th>
              </tr>
            </thead>
            <tbody>
              {layers.map(layer => (
                <tr key={layer.key}>
                  <th scope="row">{layer.label}</th>
                  <td><code>{layer.dataKeys.join(', ')}</code></td>
                  <td>
                    <span className="tl-swatch" style={{ background: layer.colour }} aria-hidden />
                    <span className="tl-swatch-label">{layer.colour}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tl-section tl-section--tight">
        <div className="tl-split">
          <div>
            <h2 className="tl-h2">Sources</h2>
            <ul className="tl-list">
              {domain.sources.map(s => <li key={s}>{s}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="tl-h2">Endpoints</h2>
            <ul className="tl-list tl-list--mono">
              {domain.endpoints.map(e => <li key={e}><code>{e}</code></li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="tl-section tl-section--tight">
        <div className="tl-next-row">
          <Link href="/dashboard" className="tl-btn-primary">Open the live surface</Link>
          <Link href={`/intel/${next.slug}`} className="tl-btn-ghost">Next: {next.name} →</Link>
        </div>
      </section>
    </>
  );
}
