'use client';

/*
   BOTAZEZ — marketing navigation.
   Sticky, light-themed top bar with a gradient accent rule.
   Styling comes exclusively from the `.theme-light`-scoped `.tl-*`
   classes in globals.css — no dashboard (dark) classes are used.
*/

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Hexagon } from 'lucide-react';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/ardi', label: 'ARDI' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="tl-nav">
      <nav className="tl-container tl-nav-inner" aria-label="Primary">
        <Link href="/" className="tl-brand">
          <span className="tl-brand-mark" aria-hidden="true">
            <Hexagon className="w-4 h-4" strokeWidth={2.4} />
          </span>
          BOTAZEZ
        </Link>

        <div className="tl-nav-links">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="tl-nav-link"
              data-active={href === '/' ? pathname === '/' : pathname.startsWith(href)}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
