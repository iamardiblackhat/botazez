'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import PanelControls, { PanelWindowContext } from './PanelControls';

/** Anchor tools to the map viewport, rather than to a button inside a glass rail. */
export default function MapToolPanel({ children, width = 380, title, onClose, minimised: controlledMinimised, onMinimisedChange }: { children: ReactNode; width?: number; title: string; onClose: () => void; minimised?: boolean; onMinimisedChange?: (value: boolean) => void }) {
  const host = typeof document === 'undefined' ? null : document.getElementById('botazez-map-workspace');
  const panel = useRef<HTMLDivElement>(null);
  const [localMinimised, setLocalMinimised] = useState(false);
  const minimised = controlledMinimised ?? localMinimised;
  const setMinimised = onMinimisedChange ?? setLocalMinimised;
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
  return createPortal(<motion.div ref={panel} role="region" aria-label={`${title} panel`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-minimised={minimised} className="dashboard-tool-panel styled-scrollbar" style={{ width }}><PanelControls title={title} minimised={minimised} onToggle={() => setMinimised(!minimised)} onClose={onClose}/><PanelWindowContext.Provider value={{ minimise: () => setMinimised(true), close: onClose }}><div className="panel-window-body" hidden={minimised}>{children}</div></PanelWindowContext.Provider></motion.div>, host);
}
