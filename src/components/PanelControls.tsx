'use client';

import { createContext } from 'react';
import { Minus, Plus, X } from 'lucide-react';

export const PanelWindowContext = createContext({ minimise: () => {}, close: () => {} });

export default function PanelControls({ title, minimised, onToggle, onClose }: {
  title: string; minimised: boolean; onToggle: () => void; onClose: () => void;
}) {
  return <div className="panel-window-controls" data-panel-controls>
    <h2>{title}</h2>
    <div className="panel-window-actions">
      <button type="button" aria-label={`${minimised ? 'Restore' : 'Minimise'} ${title}`} title={minimised ? 'Restore panel' : 'Minimise to see the map'} aria-expanded={!minimised} onClick={onToggle}>{minimised ? <Plus aria-hidden="true"/> : <Minus aria-hidden="true"/>}</button>
      <button type="button" aria-label={`Close ${title}`} title="Close panel" onClick={onClose}><X aria-hidden="true"/></button>
    </div>
  </div>;
}
