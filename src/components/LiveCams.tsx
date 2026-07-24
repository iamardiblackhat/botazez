'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   LIVE CAMS — browsable list of live CCTV/webcam feeds.
   Clicking an entry opens the existing CameraViewer, same as
   clicking a camera dot on the map — this just gives people a way
   to find a feed without hunting for a pin.
   ═══════════════════════════════════════════════════════════════ */

interface LiveCamsProps {
  data: any;
  onSelect: (camera: any) => void;
  onLocate?: (lat: number, lng: number) => void;
}

export default function LiveCams({ data, onSelect, onLocate }: LiveCamsProps) {
  const [expanded, setExpanded] = useState(true);
  const cams = data.cameras || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="glass-panel flex flex-col overflow-hidden pointer-events-auto"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        title={expanded ? 'Collapse panel' : 'Expand panel'}
        className="flex items-center justify-between px-4 py-3 hover:bg-[var(--hover-accent)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Camera className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
          <span className="hud-text text-[12px] text-[var(--text-primary)]">LIVE CAMS</span>
          <span className="gotham-tag gotham-tag--info" style={{ fontSize:'11px', padding: '1px 5px' }}>{cams.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--alert-green)] animate-osiris-pulse" />
          {expanded ? <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" /> : <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />}
        </div>
      </button>

      {/* Camera list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="max-h-[400px] overflow-y-auto styled-scrollbar divide-y divide-[var(--border-secondary)]">
              {cams.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <span className="text-[11px] font-mono text-[var(--text-muted)] tracking-widest">
                    NO FEEDS IN RANGE...
                  </span>
                </div>
              ) : (
                cams.slice(0, 40).map((cam: any, i: number) => (
                  <div
                    key={cam.id || i}
                    role="button"
                    tabIndex={0}
                    className="px-4 py-2.5 hover:bg-[var(--hover-accent)] transition-colors cursor-pointer flex items-center gap-2.5"
                    onClick={() => onSelect(cam)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSelect(cam); }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" title="Live" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] text-[var(--text-primary)] leading-tight truncate">
                        {cam.name || 'Unnamed Camera'}
                      </h4>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] truncate block">
                        {[cam.city, cam.country].filter(Boolean).join(', ') || 'Unknown location'} · {cam.source || 'feed'}
                      </span>
                    </div>
                    {cam.lat && cam.lng && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onLocate?.(cam.lat, cam.lng); }}
                        title="Locate on map"
                        aria-label="Locate on map"
                        className="text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors shrink-0"
                      >
                        <MapPin className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
