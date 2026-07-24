'use client';

import { useState } from 'react';
import { Newspaper, Radio, Camera, ShieldAlert, MapPin } from 'lucide-react';
import { BUILTIN_FEEDS } from '@/lib/liveFeeds';

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD ROW — a permanent, always-visible row of square info
   cards docked at the bottom of the screen. This is the "squares"
   / dashboard layout pattern (World Monitor style): distinct
   labeled boxes with live content, not hover-only floating panels
   you have to hunt for behind an icon.
   ═══════════════════════════════════════════════════════════════ */

function CardShell({ icon: Icon, title, count, accent, children }: any) {
  return (
    <div className="flex flex-col flex-1 min-w-[220px] h-full shrink-0 pointer-events-auto overflow-hidden border-r border-[var(--border-secondary)] last:border-r-0 bg-[#0a0a09]">
      <div className="flex items-center gap-2 px-3 py-2 border-b-2 shrink-0" style={{ borderColor: `${accent}55`, background: 'rgba(0,0,0,0.4)' }}>
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        <span className="hud-text text-[11px] text-[var(--text-primary)] tracking-wider">{title}</span>
        {count !== undefined && (
          <span className="gotham-tag gotham-tag--info ml-auto" style={{ fontSize: '10px', padding: '1px 5px' }}>{count}</span>
        )}
        <div className="w-1.5 h-1.5 rounded-full animate-osiris-pulse" style={{ background: accent }} />
      </div>
      <div className="flex-1 overflow-y-auto styled-scrollbar divide-y divide-[var(--border-secondary)]">
        {children}
      </div>
    </div>
  );
}

interface DashboardRowProps {
  data: any;
  onLocate: (lat: number, lng: number) => void;
  onWatchFeed: (url: string, name: string) => void;
  onSelectCamera: (camera: any) => void;
}

export default function DashboardRow({ data, onLocate, onWatchFeed, onSelectCamera }: DashboardRowProps) {
  const [tvCategory, setTvCategory] = useState<'all' | 'mainstream' | 'finance' | 'conflict' | 'government'>('all');

  const news = data.news || [];
  const cams = data.cameras || [];
  const threats = data.malware_threats || [];
  const feeds = tvCategory === 'all' ? BUILTIN_FEEDS : BUILTIN_FEEDS.filter(f => f.category === tvCategory);

  return (
    <div
      className="absolute bottom-[22px] left-[68px] right-0 z-[195] pointer-events-auto flex h-[210px] border-t-2 border-[var(--border-primary)] overflow-x-auto"
      style={{ background: '#0a0a09', boxShadow: '0 -8px 30px rgba(0,0,0,0.6)' }}
    >
      {/* LIVE NEWS */}
      <CardShell icon={Newspaper} title="LIVE NEWS" count={news.length} accent="#D4AF37">
        {news.length === 0 ? (
          <div className="px-3 py-6 text-center text-[10px] font-mono text-[var(--text-muted)] tracking-widest">AWAITING INTEL...</div>
        ) : news.slice(0, 20).map((item: any, i: number) => (
          <div key={i} className="px-3 py-2 hover:bg-[var(--hover-accent)] transition-colors cursor-pointer" onClick={() => item.link && window.open(item.link, '_blank', 'noopener,noreferrer')}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-1 rounded">{item.source}</span>
              {item.coords && (
                <button onClick={(e) => { e.stopPropagation(); onLocate(item.coords[0], item.coords[1]); }} title="Locate on map" className="text-[var(--text-muted)] hover:text-[var(--cyan-primary)] ml-auto">
                  <MapPin className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            <h4 className="text-[10.5px] text-[var(--text-primary)] leading-tight line-clamp-2">{item.title}</h4>
          </div>
        ))}
      </CardShell>

      {/* TV NEWS */}
      <CardShell icon={Radio} title="TV NEWS" count={BUILTIN_FEEDS.length} accent="#FF4081">
        <div className="flex gap-1 px-2 py-1.5 flex-wrap sticky top-0 bg-[var(--bg-secondary)]/95 backdrop-blur-sm z-10 border-b border-[var(--border-secondary)]">
          {(['all', 'mainstream', 'finance', 'conflict', 'government'] as const).map(c => (
            <button
              key={c}
              onClick={() => setTvCategory(c)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase transition-colors ${tvCategory === c ? 'bg-[var(--cyan-primary)]/20 text-[var(--cyan-primary)]' : 'text-[var(--text-muted)] hover:text-white'}`}
            >
              {c}
            </button>
          ))}
        </div>
        {feeds.map((f) => (
          <div key={f.name} className="px-3 py-2 hover:bg-[var(--hover-accent)] transition-colors cursor-pointer flex items-center gap-2" onClick={() => onWatchFeed(f.url, f.name)}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <div className="min-w-0">
              <div className="text-[10.5px] text-[var(--text-primary)] truncate">{f.name}</div>
              <div className="text-[9px] font-mono text-[var(--text-muted)] truncate">{f.city}, {f.country}</div>
            </div>
          </div>
        ))}
      </CardShell>

      {/* LIVE CAMS */}
      <CardShell icon={Camera} title="LIVE CAMS" count={cams.length} accent="#00E676">
        {cams.length === 0 ? (
          <div className="px-3 py-6 text-center text-[10px] font-mono text-[var(--text-muted)] tracking-widest">NO FEEDS IN RANGE...</div>
        ) : cams.slice(0, 30).map((cam: any, i: number) => (
          <div key={cam.id || i} className="px-3 py-2 hover:bg-[var(--hover-accent)] transition-colors cursor-pointer flex items-center gap-2" onClick={() => onSelectCamera(cam)}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <div className="min-w-0">
              <div className="text-[10.5px] text-[var(--text-primary)] truncate">{cam.name || 'Unnamed Camera'}</div>
              <div className="text-[9px] font-mono text-[var(--text-muted)] truncate">{[cam.city, cam.country].filter(Boolean).join(', ') || 'Unknown'}</div>
            </div>
          </div>
        ))}
      </CardShell>

      {/* CYBER / TECH THREATS */}
      <CardShell icon={ShieldAlert} title="CYBER THREATS" count={threats.length} accent="#FF3D3D">
        {threats.length === 0 ? (
          <div className="px-3 py-6 text-center text-[10px] font-mono text-[var(--text-muted)] tracking-widest">NO ACTIVE THREATS...</div>
        ) : threats.slice(0, 20).map((t: any, i: number) => (
          <div key={i} className="px-3 py-2 hover:bg-[var(--hover-accent)] transition-colors cursor-pointer" onClick={() => t.lat && t.lng && onLocate(t.lat, t.lng)}>
            <div className="text-[10.5px] text-[#FF3D3D] font-bold truncate">{t.malware || t.threat_type || 'Unknown Threat'}</div>
            <div className="text-[9px] font-mono text-[var(--text-muted)] truncate">{t.ip} · {t.country || 'UNKNOWN'}</div>
          </div>
        ))}
      </CardShell>
    </div>
  );
}
