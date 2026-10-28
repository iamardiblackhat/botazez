'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

/** Anchor tools to the map viewport, rather than to a button inside a glass rail. */
export default function MapToolPanel({ children, width = 380, title, onClose }: { children: ReactNode; width?: number; title: string; onClose: () => void }) {
  const host = typeof document === 'undefined' ? null : document.getElementById('botazez-map-workspace');
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>('button')?.focus());
    return () => { cancelAnimationFrame(frame); previous?.focus(); };
  }, [host]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } };
    document.addEventListener('keydown', keyboard);
    return () => document.removeEventListener('keydown', keyboard);
  }, [onClose]);
  if (!host) return null;
  return createPortal(<motion.div ref={panel} role="region" aria-label={`${title} panel`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="dashboard-tool-panel styled-scrollbar" style={{ width }}><div className="dashboard-tool-panel-heading"><h2>{title}</h2><button aria-label={`Close ${title}`} onClick={onClose}>Close ×</button></div>{children}</motion.div>, host);
}
