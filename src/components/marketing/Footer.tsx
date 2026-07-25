/*
   BOTAZEZ — marketing footer.
   Link set mirrors the project README (Live Demo, Report Bug,
   Request Feature, Discord, Patreon).
*/

import Link from 'next/link';
import { Hexagon } from 'lucide-react';

const EXTERNAL_LINKS = [
  { href: 'https://osirislive.app', label: 'Live Demo' },
  { href: 'https://github.com/simplifaisoul/osiris/issues', label: 'Report Bug' },
  { href: 'https://github.com/simplifaisoul/osiris/issues', label: 'Request Feature' },
  { href: 'https://discord.gg/umBykEpb98', label: 'Discord' },
  { href: 'https://www.patreon.com/posts/159077425', label: 'Patreon' },
];

const INTERNAL_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/ardi', label: 'ARDI' },
];

export default function Footer() {
  return (
    <footer className="tl-footer">
      <div className="tl-container">
        <div className="tl-footer-inner">
          <div>
            <Link href="/" className="tl-brand">
              <span className="tl-brand-mark" aria-hidden="true">
                <Hexagon className="w-4 h-4" strokeWidth={2.4} />
              </span>
              BOTAZEZ
            </Link>
            <p className="tl-card-desc" style={{ marginTop: 12, maxWidth: '42ch' }}>
              Open-source intelligence, fused into a single live picture of the world.
            </p>
          </div>

          <nav className="tl-footer-links" aria-label="Site">
            {INTERNAL_LINKS.map(({ href, label }) => (
              <Link key={label} href={href} className="tl-footer-link">
                {label}
              </Link>
            ))}
          </nav>

          <nav className="tl-footer-links" aria-label="Community">
            {EXTERNAL_LINKS.map(({ href, label }) => (
              <a
                key={label}
                href={href}
                className="tl-footer-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <p className="tl-footer-note">
          Botazez is free and open source under the MIT license. Data is aggregated from public
          feeds and is provided for situational awareness only.
        </p>
      </div>
    </footer>
  );
}
