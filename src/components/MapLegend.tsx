'use client';

import { motion, AnimatePresence } from 'framer-motion';

/**
 * MapLegend — decodes the color-coded dots/icons scattered across the
 * globe. Previously there was zero legend anywhere in the app, so the
 * meaning of "why is this dot red vs orange vs teal" was undiscoverable.
 * Grouped into the categories that actually vary in color; layers that
 * render a single fixed color (e.g. earthquakes are always the same
 * orange-to-red heat scale) get one row instead of one per feature type.
 */

interface Swatch {
  color: string;
  label: string;
}

interface LegendGroup {
  title: string;
  swatches: Swatch[];
}

const LEGEND_GROUPS: LegendGroup[] = [
  {
    title: 'Threat / Alert Level',
    swatches: [
      { color: '#D32F2F', label: 'Critical / War / Naval' },
      { color: '#E65100', label: 'High / Fire / Seismic Risk' },
      { color: '#F9A825', label: 'Elevated / Low Magnitude' },
      { color: '#26A69A', label: 'Normal / Monitoring' },
    ],
  },
  {
    title: 'Aircraft',
    swatches: [
      { color: '#00E5FF', label: 'Commercial' },
      { color: '#FFD700', label: 'Private' },
      { color: '#FF9500', label: 'Government' },
      { color: '#FF3D3D', label: 'Military' },
    ],
  },
  {
    title: 'Other Markers',
    swatches: [
      { color: '#00E676', label: 'CCTV Camera' },
      { color: '#D32F2F', label: 'Malware / Cyber Threat' },
      { color: '#7E57C2', label: 'Weather (Storm / Volcano)' },
      { color: '#EC407A', label: 'Live News' },
      { color: '#D4AF37', label: 'SIGINT / SDK Feed' },
    ],
  },
];

export default function MapLegend({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="glass-panel absolute bottom-[75px] md:bottom-[250px] left-[12px] md:left-[380px] z-[200] pointer-events-auto p-3 w-[220px]"
        >
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/[0.08]">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Legend</span>
            <button onClick={onClose} aria-label="Close legend" className="text-white/40 hover:text-white/80 text-[12px] leading-none">✕</button>
          </div>
          <div className="flex flex-col gap-2.5">
            {LEGEND_GROUPS.map(group => (
              <div key={group.title}>
                <div className="text-[9px] font-mono tracking-wider uppercase text-white/30 mb-1">{group.title}</div>
                <div className="flex flex-col gap-1">
                  {group.swatches.map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color, boxShadow: `0 0 4px ${s.color}` }} />
                      <span className="text-[10px] font-mono text-white/60 leading-tight">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
