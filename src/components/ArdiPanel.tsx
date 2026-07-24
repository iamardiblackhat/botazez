'use client';

/*
   BOTAZEZ — ARDI Promotional Poster Panel
   Premium in-dashboard brand showcase for the ARDI platform.
   Replaces the legacy support/donation chip. Self-contained: renders
   the launcher chip + the full poster modal (matches TokenPanel pattern).
*/

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Radar, Eye, Activity, Lock, Terminal, Crosshair, ArrowUpRight } from 'lucide-react';

// External ARDI destination — update to the live ARDI platform URL.
const ARDI_URL = 'https://botazez.com';

const IMAGES = {
  hero: '/ardi/ardi-hero.jpg',   // arms raised — energetic
  ops: '/ardi/ardi-ops.jpg',     // hooded — cyber operative (centerpiece)
  guide: '/ardi/ardi-guide.jpg', // presenter — gesturing
};

const CAPABILITIES: { icon: any; label: string; desc: string }[] = [
  { icon: ShieldCheck, label: 'Cybersecurity Testing', desc: 'Offensive & defensive validation' },
  { icon: Activity, label: 'Threat Monitoring', desc: 'Continuous risk surveillance' },
  { icon: Radar, label: 'OSINT Analysis', desc: 'Open-source intelligence fusion' },
  { icon: Crosshair, label: 'Operational Intelligence', desc: 'Decision-grade signal' },
  { icon: Eye, label: 'Surveillance & Investigation', desc: 'Investigative workflows' },
  { icon: Terminal, label: 'Secure Tooling', desc: 'Hardened operator toolkit' },
];

function ImgWithFallback({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={className} style={{ ...style, display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 50% 40%, rgba(20,241,149,0.14), rgba(4,4,10,0.9) 70%)' }}>
        <span className="font-mono font-bold tracking-[0.35em] text-[#14F195]" style={{ fontSize: 22 }}>ARDI</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} style={style} onError={() => setFailed(true)} draggable={false} />;
}

export default function ArdiPanel({ compact = false }: { compact?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* ── Launcher chip (replaces donation chip) ── */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open ARDI platform showcase"
        className={`ardi-chip pointer-events-auto glass-panel flex items-center font-mono tracking-widest transition-all hover:opacity-95 ${compact ? 'gap-1.5 px-3 py-2 text-[15px]' : 'gap-2 px-5 py-2.5 text-[18px] ml-4'}`}
        style={{
          borderColor: 'rgba(20,241,149,0.65)',
          background: 'linear-gradient(135deg, rgba(20,241,149,0.22), rgba(0,229,255,0.09))',
          boxShadow: '0 0 18px rgba(20,241,149,0.35)',
        }}
      >
        <ShieldCheck className={compact ? 'w-5 h-5' : 'w-6 h-6'} style={{ color: '#4DFFB4', filter: 'drop-shadow(0 0 6px rgba(20,241,149,0.7))' }} />
        <span className="font-extrabold tracking-[0.24em]" style={{ color: '#5CFFBE', textShadow: '0 0 14px rgba(20,241,149,0.8)' }}>ARDI</span>
        {!compact && <span className="hidden md:inline text-[12px] text-[var(--text-secondary)] font-semibold tracking-[0.24em]">PLATFORM</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto px-3 py-6"
            onClick={() => setIsOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

            {/* Poster */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto styled-scrollbar rounded-2xl border"
              style={{
                borderColor: 'rgba(20,241,149,0.28)',
                background: 'linear-gradient(180deg, #06070C 0%, #04040A 100%)',
                boxShadow: '0 30px 90px rgba(0,0,0,0.7), 0 0 60px rgba(20,241,149,0.08)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Ambient grid + glow */}
              <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(20,241,149,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(20,241,149,0.6) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
              <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(20,241,149,0.16), transparent 62%)' }} />

              {/* Header */}
              <div className="relative flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md" style={{ background: 'rgba(20,241,149,0.12)', border: '1px solid rgba(20,241,149,0.4)' }}>
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#14F195' }} />
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="font-mono font-bold tracking-[0.32em] text-[13px]" style={{ color: '#EAFBF3' }}>ARDI</span>
                    <span className="font-mono tracking-[0.24em] text-[10px] mt-1" style={{ color: '#14F195' }}>AUTONOMOUS RECON &amp; DEFENSE INTELLIGENCE</span>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4 text-[var(--text-muted)] hover:text-white" />
                </button>
              </div>

              {/* ── Collage band ── */}
              <div className="relative flex items-end justify-center gap-0 px-4 pt-6 pb-2 select-none min-h-[150px] sm:min-h-[240px] md:min-h-[300px]">
                <motion.div
                  initial={{ opacity: 0, x: 30, rotate: 4 }} animate={{ opacity: 1, x: 0, rotate: 3 }} transition={{ delay: 0.05, duration: 0.5 }}
                  className="relative z-10 -mr-2.5 sm:-mr-6 md:-mr-10 block"
                  style={{ filter: 'drop-shadow(0 10px 26px rgba(0,229,255,0.22))' }}
                >
                  <ImgWithFallback src={IMAGES.guide} alt="ARDI — analyst" className="w-[72px] sm:w-[140px] md:w-[210px] h-auto opacity-90" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, duration: 0.5 }}
                  className="relative z-20"
                  style={{ filter: 'drop-shadow(0 18px 40px rgba(20,241,149,0.3))' }}
                >
                  <ImgWithFallback src={IMAGES.ops} alt="ARDI — cyber operative" className="w-[104px] sm:w-[200px] md:w-[300px] h-auto" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -30, rotate: -4 }} animate={{ opacity: 1, x: 0, rotate: -3 }} transition={{ delay: 0.05, duration: 0.5 }}
                  className="relative z-10 -ml-2.5 sm:-ml-6 md:-ml-10 block"
                  style={{ filter: 'drop-shadow(0 10px 26px rgba(20,241,149,0.22))' }}
                >
                  <ImgWithFallback src={IMAGES.hero} alt="ARDI — operator" className="w-[72px] sm:w-[140px] md:w-[210px] h-auto opacity-90" />
                </motion.div>
              </div>

              {/* ── Copy ── */}
              <div className="relative px-6 md:px-8 pb-7 pt-2 text-center">
                <h2 className="font-mono font-bold tracking-[0.06em] text-[19px] md:text-[24px]" style={{ color: '#F3FBF7' }}>
                  Operational intelligence, built for the defender.
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-[12px] md:text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  ARDI is the advanced operations platform behind BOTAZEZ — pairing cybersecurity testing,
                  live threat monitoring and OSINT-grade analysis with surveillance and investigative
                  workflows in one secure command surface.
                </p>

                {/* Capability grid */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-left">
                  {CAPABILITIES.map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="ardi-cap flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-colors" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="mt-0.5 flex items-center justify-center w-6 h-6 rounded-md shrink-0" style={{ background: 'rgba(20,241,149,0.1)', border: '1px solid rgba(20,241,149,0.3)' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: '#14F195' }} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono font-bold tracking-wide text-[11px]" style={{ color: '#DCEFE7' }}>{label}</div>
                        <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feature strip */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 font-mono text-[12px] tracking-[0.18em] uppercase" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" style={{ color: '#14F195' }} /> Live Monitoring</span>
                  <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" style={{ color: '#14F195' }} /> Secure by Design</span>
                  <span className="flex items-center gap-1.5"><Crosshair className="w-3 h-3" style={{ color: '#14F195' }} /> Advanced Dashboard Ops</span>
                </div>

                {/* CTA */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={ARDI_URL} target="_blank" rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 rounded-lg px-6 py-3 font-mono font-bold text-[12px] tracking-widest transition-transform hover:-translate-y-0.5"
                    style={{ color: '#04140D', background: 'linear-gradient(135deg, #14F195, #00E5FF)', boxShadow: '0 8px 24px rgba(20,241,149,0.3)' }}
                  >
                    EXPLORE ARDI
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                  <span className="font-mono text-[12px] tracking-[0.24em] uppercase" style={{ color: 'var(--text-muted)' }}>
                    Powered by <span style={{ color: 'var(--gold-primary)' }}>BOTAZEZ</span>
                  </span>
                  <a href="https://www.instagram.com/ardi.blackhat/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest transition-opacity hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#14F195" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="#14F195" stroke="none" /></svg> @ardi.blackhat
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
