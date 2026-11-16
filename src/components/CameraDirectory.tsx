'use client';

import { useMemo, useState } from 'react';

export type PublicCamera = {
  id: string | number; name: string; lat: number; lng: number;
  city?: string; country?: string; source?: string;
  stream_type?: string; stream_url?: string; feed_url?: string; external_url?: string;
};
function mediaLabel(camera: PublicCamera) {
  if (!camera.stream_url && !camera.feed_url && camera.external_url) return 'Source page';
  return ({ hls: 'Video stream', mjpeg: 'Motion stream', mp4: 'Video clip', iframe: 'Embedded source', jpg: 'Snapshot' } as Record<string, string>)[camera.stream_type || 'jpg'] || 'Camera source';
}
export default function CameraDirectory({ cameras, enabled, onEnable, onView, onLocate }: {
  cameras: PublicCamera[]; enabled: boolean; onEnable: () => void;
  onView: (camera: PublicCamera) => void; onLocate: (lat: number, lng: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [media, setMedia] = useState('all');
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cameras.filter(camera => (!q || `${camera.name} ${camera.city || ''} ${camera.country || ''}`.toLowerCase().includes(q)) && (media === 'all' || (media === 'video' ? ['hls','mjpeg','mp4','iframe'].includes(camera.stream_type || '') : mediaLabel(camera) === 'Snapshot')));
  }, [cameras, query, media]);
  return <section className="camera-directory" aria-label="Camera directory">
    <h2>Camera workspace</h2>
    <p className="dashboard-note">Browse public camera sources. Playback is checked when you open a camera; availability and embedding depend on its operator.</p>
    <button className="dashboard-action" onClick={onEnable}>{enabled ? 'Reload camera catalogue' : 'Load cameras on the map'}</button>
    <label className="camera-filter">Find a camera<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="City, country or camera name" /></label>
    <label className="camera-filter">Source format<select value={media} onChange={event => setMedia(event.target.value)}><option value="all">All source formats</option><option value="video">Video and motion sources</option><option value="snapshot">Snapshots</option></select></label>
    <p role="status" className="dashboard-note">{matches.length.toLocaleString()} matching records{matches.length > 20 ? ' · showing the first 20; refine your search' : ''}</p>
    {!cameras.length && <p className="dashboard-empty">{enabled ? 'No camera records have loaded yet. The catalogue may be loading or unavailable; reload to try again.' : 'Load the camera catalogue to browse its sources.'}</p>}
    {!!cameras.length && !matches.length && <p className="dashboard-empty">No loaded camera matches these filters.</p>}
    <div className="camera-directory-list">{matches.slice(0,20).map(camera => <article key={camera.id}><strong>{camera.name || 'Unnamed camera'}</strong><p>{[camera.city,camera.country].filter(Boolean).join(', ') || 'Location name not supplied'}</p><span>{mediaLabel(camera)}{camera.source ? ` · ${camera.source}` : ''}</span><div><button onClick={() => onView(camera)}>View camera</button><button disabled={!Number.isFinite(camera.lat) || !Number.isFinite(camera.lng)} onClick={() => onLocate(camera.lat,camera.lng)}>Locate on map</button></div></article>)}</div>
  </section>;
}
