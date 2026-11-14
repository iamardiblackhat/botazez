'use client';

import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import type { OsirisMapProps } from './OsirisMap';
import 'leaflet/dist/leaflet.css';

// Raster tiles and SVG markers work without a GPU or a WebGL context.
const layers = [
  ['earthquakes', 'earthquakes', '#ff9500', 'earthquake'],
  ['global_incidents', 'gdelt', '#ff5252', 'incident'],
  ['weather', 'weather_events', '#64b5f6', 'weather'],
  ['fires', 'fires', '#ff5722', 'fire'],
  ['cctv', 'cameras', '#26c6da', 'cctv'],
  ['live_news', 'live_feeds', '#ce93d8', 'live_news'],
  ['flights', 'commercial_flights', '#64b5f6', 'flight'],
  ['private', 'private_flights', '#81c784', 'flight'],
  ['jets', 'private_jets', '#ffd54f', 'flight'],
  ['military', 'military_flights', '#ef5350', 'flight'],
  ['infrastructure', 'infrastructure', '#ffd54f', 'infrastructure'],
  ['maritime', 'maritime_ships', '#26c6da', 'ship'],
  ['balloons', 'balloons', '#ba68c8', 'balloon'],
  ['radiation', 'radiation', '#cddc39', 'radiation'],
  ['alert_pins', 'alert_pins', '#ff5252', 'alert'],
] as const;

export default function RasterMap(props: OsirisMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    const m = L.map(host.current, { preferCanvas: false, minZoom: 2, maxZoom: 18, zoomControl: false }).setView([20, -new Date().getTimezoneOffset() / 4], 2);
    map.current = m;
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    L.control.scale({ position: 'bottomleft' }).addTo(m);
    const report = () => {
      const c = m.getCenter(), b = m.getBounds();
      latest.current.onViewStateChange?.({ zoom: m.getZoom(), latitude: c.lat });
      latest.current.onMapCenter?.({ lat: c.lat, lng: c.lng, bounds: { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() } });
    };
    m.on('moveend', report);
    m.on('mousemove', e => latest.current.onMouseCoords?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    m.on('contextmenu', e => latest.current.onRightClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    m.on('dragstart', () => latest.current.onFollowInterrupt?.());
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(host.current);
    setReady(true);
    report();
    latest.current.onReady?.();
    return () => { observer.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;
    setTileError(false);
    const satellite = props.mapStyle?.includes('arcgisonline.com');
    const tiles = L.tileLayer(satellite
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
      attribution: satellite ? 'Tiles © Esri' : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 18, crossOrigin: true,
    }).addTo(map.current);
    tiles.on('tileerror', () => setTileError(true));
    tiles.on('tileload', () => setTileError(false));
    return () => { tiles.remove(); };
  }, [ready, props.mapStyle]);

  useEffect(() => {
    if (!ready || !map.current) return;
    const group = L.layerGroup().addTo(map.current);
    for (const [enabled, key, color, type] of layers) {
      if (!props.activeLayers[enabled]) continue;
      const rows = props.data?.[key];
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (key === 'alert_pins' && props.alertPinIds && !props.alertPinIds.includes(row.id)) continue;
        if (row.lat == null || row.lng == null) continue;
        const lat = Number(row.lat), lng = Number(row.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
        const label = String(row.place || row.title || row.name || row.callsign || type);
        const content = document.createElement('div');
        content.textContent = `${row.magnitude != null ? `M${row.magnitude} · ` : ''}${label}`;
        const marker = L.circleMarker([lat, lng], { radius: 5, color, fillColor: color, fillOpacity: 0.8, weight: 1 }).bindPopup(content).addTo(group);
        marker.on('click', () => latest.current.onEntityClick?.({ ...row, type }));
      }
    }
    for (const polygon of props.drawnPolygons || []) L.geoJSON(polygon.geojson, { style: { color: polygon.color } }).addTo(group);
    for (const layer of props.arcgisLayers || []) L.geoJSON(layer.geojson, { style: { color: layer.color || '#64b5f6', opacity: layer.opacity ?? 1 } }).addTo(group);
    if (props.route) L.geoJSON({ type: 'Feature', properties: {}, geometry: props.route.geometry } as GeoJSON.Feature, { style: { color: '#64b5f6', weight: 4 } }).addTo(group);
    if (props.userLocation) L.circleMarker([props.userLocation.lat, props.userLocation.lng], { radius: 7, color: '#fff', fillColor: '#2196f3', fillOpacity: 1 }).addTo(group);
    return () => { group.remove(); };
  }, [ready, props.data, props.activeLayers, props.alertPinIds, props.drawnPolygons, props.arcgisLayers, props.route, props.userLocation]);

  useEffect(() => {
    if (!ready || !map.current || !props.flyToLocation) return;
    const target = props.flyToLocation;
    map.current.setView([target.lat, target.lng], target.zoom ?? 10);
  }, [ready, props.flyToLocation]);

  useEffect(() => {
    if (props.followUser && props.userLocation) map.current?.panTo([props.userLocation.lat, props.userLocation.lng]);
  }, [props.followUser, props.userLocation]);

  return <>
    <div ref={host} data-map-renderer="raster" className="absolute inset-0" style={{ zIndex: 0, background: '#111827' }} />
    <div role="status" className="absolute bottom-20 left-3 z-[450] max-w-xs rounded bg-black/80 px-3 py-2 text-xs text-white">
      {tileError ? 'Map tiles could not load. Check your connection.' : '2D compatibility map · 3D and GPU effects unavailable on this device.'}
    </div>
  </>;
}
