'use client';

import { useState } from 'react';
import CameraDirectory, { type PublicCamera } from './CameraDirectory';

type Quake = { id?: string; place?: string; magnitude?: number; lat?: number; lng?: number; time?: number };
type Props = {
  embedded?: boolean;
  activeTab?: 'events' | 'sources' | 'cameras';
  onTabChange?: (tab: 'events' | 'sources' | 'cameras') => void;
  cameras: PublicCamera[];
  camerasEnabled: boolean;
  onEnableCameras: () => void;
  onViewCamera: (camera: PublicCamera) => void;
  earthquakes: Quake[];
  activeLayers: number;
  connection: 'connecting' | 'connected' | 'error';
  onLocate: (lat: number, lng: number, zoom?: number) => void;
  onAlerts: () => void;
};

/** Reads the same records as the map; it never invents a separate live feed. */
export default function IntelligenceOverview({ earthquakes, activeLayers, connection, onLocate, onAlerts, cameras, camerasEnabled, onEnableCameras, onViewCamera, embedded = false, activeTab, onTabChange }: Props) {
  const [localTab, setLocalTab] = useState<'events' | 'sources' | 'cameras'>('events');
  const tab = activeTab ?? localTab;
  const setTab = onTabChange ?? setLocalTab;
  const records = [...earthquakes].sort((a, b) => (b.time ?? 0) - (a.time ?? 0)).slice(0, 8);
  return <aside className={`intelligence-column ${embedded ? 'dashboard-overview-embedded' : 'omnelia-glass'}`} aria-label="Intelligence overview">
    <div className="dashboard-column-heading"><span>Intelligence</span><span className="dashboard-status">{connection === 'connected' ? 'Data received' : connection === 'error' ? 'Connection issue' : 'Connecting'}</span></div>
    <div className="dashboard-summary"><div><strong>{activeLayers}</strong><span>Enabled layers</span></div><div><strong>{earthquakes.length.toLocaleString()}</strong><span>Earthquake records</span></div></div>
    <div className="dashboard-tabs" aria-label="Intelligence views">
      <button aria-pressed={tab === 'cameras'} onClick={() => setTab('cameras')}>Cameras</button><button aria-pressed={tab === 'events'} onClick={() => setTab('events')}>Events</button><button aria-pressed={tab === 'sources'} onClick={() => setTab('sources')}>Source guide</button>
    </div>
    {tab === 'cameras' ? <CameraDirectory cameras={cameras} enabled={camerasEnabled} onEnable={onEnableCameras} onView={onViewCamera} onLocate={(lat, lng) => onLocate(lat, lng, 12)} /> : tab === 'events' ? <section aria-label="Earthquake records"><h2>Earthquake activity</h2><p className="dashboard-note">USGS records loaded into this workspace. Select an event to locate it on the map.</p>
      {records.length ? <div className="dashboard-events">{records.map((event, i) => <button key={event.id ?? i} disabled={!Number.isFinite(event.lat) || !Number.isFinite(event.lng)} onClick={() => onLocate(event.lat!, event.lng!)}><span className="event-magnitude">M{typeof event.magnitude === 'number' ? event.magnitude.toFixed(1) : '—'}</span><span><strong>{event.place || 'Location not supplied'}</strong><small>{event.time && Number.isFinite(event.time) ? new Date(event.time).toLocaleString() : 'Event time not supplied'}</small></span></button>)}</div> : <p className="dashboard-empty">No earthquake records have loaded. This does not establish that there are no events.</p>}
      <button className="dashboard-action" onClick={onAlerts}>Open alerts and filters</button>
    </section> : <section aria-label="Source guide"><h2>Read the evidence</h2><p>Each layer has its own coverage and refresh schedule. API connectivity does not mean every source is live.</p><dl className="dashboard-source-guide"><dt>Observed</dt><dd>The time reported by the original source.</dd><dt>Retrieved</dt><dd>When Botazez received the record. Older observations may still be returned.</dd><dt>Reference layers</dt><dd>Infrastructure and catalogues provide context, rather than continuous tracking.</dd></dl><a href="/docs">Read the workspace guide</a></section>}
    <div className="dashboard-column-footer"><p>Select a marker for its record. Use ARDI Sec for your separate security workspace.</p><a href="/privacy">Privacy and data use</a></div>
  </aside>;
}
