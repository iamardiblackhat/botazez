/*
   BOTAZEZ — ARDI platform page (route: /ardi).
   Full-page adaptation of the in-dashboard ArdiPanel modal: same
   CAPABILITIES set, imagery and copy, restyled for the light theme.
*/

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck, Radar, Eye, Activity, Lock, Terminal, Crosshair, ArrowUpRight, Globe,
  type LucideIcon,
} from 'lucide-react';
import FeatureCard from '@/components/marketing/FeatureCard';
import ArdiCollage from '@/components/marketing/ArdiCollage';

// External ARDI destination — update to the live ARDI platform URL.
const ARDI_URL = 'https://botazez.com';
const ARDI_INSTAGRAM = 'https://www.instagram.com/ardi.blackhat/';

export const metadata: Metadata = {
  title: 'ARDI — Autonomous Recon & Defense Intelligence',
  description:
    'ARDI is the advanced operations platform behind Botazez — cybersecurity testing, live threat monitoring, OSINT analysis, surveillance and investigative workflows in one secure command surface.',
};

interface CapabilityEntry {
  icon: LucideIcon;
  title: string;
  description: string;
}

// Same capability set as src/components/ArdiPanel.tsx.
const CAPABILITIES: CapabilityEntry[] = [
  { icon: ShieldCheck, title: 'Cybersecurity Testing', description: 'Offensive and defensive validation against your own perimeter.' },
  { icon: Activity, title: 'Threat Monitoring', description: 'Continuous risk surveillance across live signal sources.' },
  { icon: Radar, title: 'OSINT Analysis', description: 'Open-source intelligence fusion from dozens of public feeds.' },
  { icon: Crosshair, title: 'Operational Intelligence', description: 'Decision-grade signal, filtered down from the noise.' },
  { icon: Eye, title: 'Surveillance & Investigation', description: 'Investigative workflows built around real casework.' },
  { icon: Terminal, title: 'Secure Tooling', description: 'A hardened operator toolkit that stays inside your control.' },
];

const STRIP = [
  { icon: Activity, label: 'Live Monitoring' },
  { icon: Lock, label: 'Secure by Design' },
  { icon: Crosshair, label: 'Advanced Dashboard Ops' },
];

export default function ArdiPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="tl-hero">
        <div className="tl-container tl-hero-inner">
          <span className="tl-eyebrow">Autonomous Recon &amp; Defense Intelligence</span>
          <h1>
            Operational intelligence,{' '}
            <span className="tl-gradient-text">built for the defender.</span>
          </h1>
          <p>
            ARDI is the advanced operations platform behind Botazez — pairing cybersecurity testing,
            live threat monitoring and OSINT-grade analysis with surveillance and investigative
            workflows in one secure command surface.
          </p>

          <ArdiCollage />

          <div className="tl-hero-cta">
            <a href={ARDI_URL} target="_blank" rel="noopener noreferrer" className="tl-btn-primary">
              Explore ARDI
              <ArrowUpRight className="w-[18px] h-[18px]" aria-hidden="true" />
            </a>
            <a href={ARDI_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="tl-btn-ghost">
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5.5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              @ardi.blackhat
            </a>
          </div>
        </div>
      </section>

      {/* ── Capability grid ── */}
      <section className="tl-section">
        <div className="tl-container">
          <span className="tl-eyebrow">Capabilities</span>
          <h2 className="tl-h2">One secure command surface</h2>
          <p className="tl-lede">
            Everything an operator needs to test, watch and investigate — without stitching together
            half a dozen disconnected tools.
          </p>
          <div className="tl-grid">
            {CAPABILITIES.map(({ icon: Icon, ...capability }, index) => (
              <FeatureCard
                key={capability.title}
                {...capability}
                icon={<Icon className="w-5 h-5" strokeWidth={2} />}
                index={index}
              />
            ))}
          </div>

          <div className="tl-chip-row" style={{ marginTop: 32 }}>
            {STRIP.map(({ icon: Icon, label }) => (
              <span key={label} className="tl-chip">
                <Icon className="w-4 h-4" style={{ color: 'var(--leaf-600)' }} aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="tl-section tl-section-tint">
        <div className="tl-container">
          <div className="tl-panel" style={{ textAlign: 'center' }}>
            <h2 className="tl-h2">Powered by Botazez</h2>
            <p className="tl-lede" style={{ margin: '0 auto' }}>
              The same live intelligence grid that drives the Botazez dashboard feeds ARDI&apos;s
              operational picture. Take the dashboard for a spin, then talk to us about ARDI.
            </p>
            <div className="tl-hero-cta">
              <Link href="/dashboard" className="tl-btn-primary">
                <Globe className="w-[18px] h-[18px]" aria-hidden="true" />
                Launch Dashboard
              </Link>
              <a href={ARDI_URL} target="_blank" rel="noopener noreferrer" className="tl-btn-sun">
                Visit botazez.com
                <ArrowUpRight className="w-[18px] h-[18px]" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
