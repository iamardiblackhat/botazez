/*
   BOTAZEZ — Homepage (route: /).
   Static, light-themed marketing entry point. All styling comes from
   the `.theme-light`-scoped `.tl-*` classes in globals.css.
*/

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Plane, Anchor, Camera, Activity, Flame, Newspaper, CloudSun, Satellite,
  ShieldAlert, Crosshair, Bitcoin, ShieldCheck, Radar, Eye, Terminal, Globe,
  type LucideIcon,
} from 'lucide-react';
import FeatureCard from '@/components/marketing/FeatureCard';
import GlobePreview from '@/components/marketing/GlobePreview';

export const metadata: Metadata = {
  title: 'Botazez — Live Open Source Intelligence',
  description:
    'Botazez fuses live flight tracking, maritime traffic, worldwide CCTV, seismic activity, wildfires, conflict zones and OSINT tooling into one real-time intelligence picture.',
};

interface DomainEntry {
  icon: LucideIcon;
  title: string;
  description: string;
  meta: string;
}

// Copy source: the "Key Capabilities" table in README.md.
const DOMAINS: DomainEntry[] = [
  { icon: Plane, title: 'Aviation', description: 'Commercial, private, military and business-jet traffic tracked live across the globe.', meta: 'OpenSky Network' },
  { icon: Anchor, title: 'Maritime', description: '39 global ports and 10 strategic chokepoints mapped with standing naval intelligence.', meta: 'Static naval intel' },
  { icon: Camera, title: 'CCTV', description: 'Over 2,000 public street and highway cameras, streamable straight from the map.', meta: 'TfL · WSDOT · Caltrans · NYC DOT' },
  { icon: Activity, title: 'Seismic', description: 'Real-time M2.5+ earthquake reporting, plotted the moment it lands on the wire.', meta: 'USGS Earthquake API' },
  { icon: Flame, title: 'Fires', description: 'Active wildfire hotspots detected from orbit and refreshed throughout the day.', meta: 'NASA FIRMS' },
  { icon: Newspaper, title: 'News', description: '24/7 live broadcast streams from 25+ global networks, pinned to where they report.', meta: '25+ global broadcasters' },
  { icon: CloudSun, title: 'Weather', description: 'Severe weather and natural-event tracking for storms, floods and volcanic activity.', meta: 'NASA EONET' },
  { icon: Satellite, title: 'Space', description: 'Satellite orbits and solar weather, including flare and geomagnetic storm alerts.', meta: 'NOAA SWPC · N2YO' },
  { icon: ShieldAlert, title: 'Cyber', description: 'CVE threat intelligence plus browser-based port, DNS, WHOIS and SSL reconnaissance.', meta: 'NVD · custom scanner' },
  { icon: Crosshair, title: 'Conflict', description: '13 active conflict and tension zones with severity-coded situational markers.', meta: 'Static OSINT intel' },
  { icon: Bitcoin, title: 'Crypto', description: 'BTC and ETH wallet tracing with automatic OFAC SDN sanctions cross-checking.', meta: 'blockstream.info · Blockscout · OpenSanctions' },
];

// Condensed from src/components/ArdiPanel.tsx's CAPABILITIES array.
const ARDI_TEASER = [
  { icon: ShieldCheck, label: 'Cybersecurity Testing' },
  { icon: Activity, label: 'Threat Monitoring' },
  { icon: Radar, label: 'OSINT Analysis' },
  { icon: Eye, label: 'Surveillance & Investigation' },
  { icon: Terminal, label: 'Secure Tooling' },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="tl-hero">
        <div className="tl-container tl-hero-grid">
          <div className="tl-hero-inner">
            <span className="tl-eyebrow">Open Source Intelligence</span>
            <h1>
              The whole planet,{' '}
              <span className="tl-gradient-text">one live picture.</span>
            </h1>
            <p>
              Botazez pulls flights, ships, cameras, earthquakes, wildfires, satellites, cyber threats
              and breaking news out of two dozen public feeds and renders them together on a single
              GPU-accelerated globe — free and open source. That&rsquo;s it, spinning opposite —
              live right now, not a mock-up.
            </p>
            <div className="tl-hero-cta">
              <Link href="/dashboard" className="tl-btn-primary">
                <Globe className="w-[18px] h-[18px]" aria-hidden="true" />
                Launch Dashboard
              </Link>
              <Link href="/ardi" className="tl-btn-ghost">
                <ShieldCheck className="w-[18px] h-[18px]" aria-hidden="true" />
                Meet ARDI
              </Link>
            </div>
            <div className="tl-hero-stats">
              <span>11 intel domains</span>
              <span>20+ live feeds</span>
              <span>WebGL rendered</span>
              <span>MIT licensed</span>
            </div>
          </div>
          <GlobePreview />
        </div>
      </section>

      {/* ── Domain grid ── */}
      <section className="tl-section" id="domains">
        <div className="tl-container">
          <div className="tl-section-head">
            <div>
              <span className="tl-eyebrow">Coverage</span>
              <h2 className="tl-h2">Every domain, read on its own terms</h2>
              <p className="tl-lede">
                Eleven intelligence domains, each a toggleable layer on the live globe and each
                with its own page — what it watches, which feeds supply it, and how to read it.
              </p>
            </div>
            <Link href="/intel" className="tl-btn-ghost tl-section-head-cta">
              All domains →
            </Link>
          </div>
          <div className="tl-grid">
            {DOMAINS.map(({ icon: Icon, ...domain }, index) => (
              <FeatureCard
                key={domain.title}
                {...domain}
                icon={<Icon className="w-5 h-5" strokeWidth={2} />}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── ARDI teaser ── */}
      <section className="tl-section tl-section-tint" id="ardi">
        <div className="tl-container">
          <div className="tl-panel">
            <span className="tl-eyebrow">ARDI Platform</span>
            <h2 className="tl-h2">Operational intelligence, built for the defender.</h2>
            <p className="tl-lede">
              ARDI — Autonomous Recon &amp; Defense Intelligence — is the advanced operations
              platform behind Botazez, pairing cybersecurity testing, live threat monitoring and
              OSINT-grade analysis with surveillance and investigative workflows in one secure
              command surface.
            </p>
            <div className="tl-chip-row">
              {ARDI_TEASER.map(({ icon: Icon, label }) => (
                <span key={label} className="tl-chip">
                  <Icon className="w-4 h-4" style={{ color: 'var(--leaf-600)' }} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
            <div className="tl-hero-cta" style={{ justifyContent: 'flex-start' }}>
              <Link href="/ardi" className="tl-btn-primary">
                Learn more about ARDI
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
