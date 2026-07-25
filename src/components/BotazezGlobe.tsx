'use client';

/*
   BOTAZEZ — Cesium Earth
   ──────────────────────
   Production geospatial surface: WGS84 globe, streamed terrain and
   imagery, 3D / 2D / Columbus view switching, carrying the full OSINT
   layer set as Cesium entities.

   Imagery resolution order:
     1. Cesium ion (NEXT_PUBLIC_CESIUM_ION_TOKEN) — terrain + world imagery
     2. Natural Earth II, shipped in the Cesium build — works fully offline
   No token is ever hardcoded; absent one, the offline layer is used and
   the globe still renders rather than failing to a black void.
*/

import { useEffect, useRef, useState, memo } from 'react';
import type { BotazezTheme } from '@/lib/theme';
import { loadCesium } from '@/lib/load-cesium';
import { LAYER_STYLES, type LayerStyle } from '@/lib/globe-layers';

export type GlobeViewMode = '3D' | '2D' | 'COLUMBUS';

interface BotazezGlobeProps {
  data: any;
  activeLayers: Record<string, boolean>;
  theme?: BotazezTheme;
  viewMode?: GlobeViewMode;
  onEntityClick?: (entity: any) => void;
  onMouseCoords?: (coords: { lat: number; lng: number }) => void;
  onReady?: (ready: boolean) => void;
  flyToLocation?: { lng: number; lat: number; zoom?: number } | null;
}

/** Read a lon/lat pair off the heterogeneous OSINT records. */
function coordsOf(item: any): [number, number] | null {
  const lng = item?.lng ?? item?.lon ?? item?.longitude ?? item?.coordinates?.[0];
  const lat = item?.lat ?? item?.latitude ?? item?.coordinates?.[1];
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lng, lat];
}

function labelOf(item: any): string {
  return item?.name ?? item?.title ?? item?.label ?? item?.callsign ?? item?.id ?? '';
}

function BotazezGlobe({
  data,
  activeLayers,
  theme = 'light',
  viewMode = '3D',
  onEntityClick,
  onMouseCoords,
  onReady,
  flyToLocation,
}: BotazezGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const cesiumRef = useRef<any>(null);
  /** One Cesium DataSource per OSINT layer, keyed by activeLayers key. */
  const sourcesRef = useRef<Map<string, any>>(new Map());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [imagerySource, setImagerySource] = useState<'ion' | 'offline'>('offline');
  const [message, setMessage] = useState('');

  /* ── Viewer lifecycle ───────────────────────────────────────── */
  useEffect(() => {
    let disposed = false;

    (async () => {
      try {
        const Cesium = await loadCesium();
        if (disposed || !containerRef.current) return;
        cesiumRef.current = Cesium;

        const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
        const hasIon = typeof token === 'string' && token.length > 0;
        if (hasIon) Cesium.Ion.defaultAccessToken = token;

        // Natural Earth II ships inside the Cesium build, so the globe has
        // real imagery with no network and no credentials.
        const offlineImagery = await Cesium.TileMapServiceImageryProvider.fromUrl(
          Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
        );
        if (disposed || !containerRef.current) return;

        const viewer = new Cesium.Viewer(containerRef.current, {
          baseLayer: new Cesium.ImageryLayer(offlineImagery),
          // Botazez supplies its own chrome; Cesium's widgets stay off.
          animation: false,
          timeline: false,
          fullscreenButton: false,
          homeButton: false,
          sceneModePicker: false,
          baseLayerPicker: false,
          navigationHelpButton: false,
          geocoder: false,
          infoBox: false,
          selectionIndicator: false,
          shouldAnimate: true,
          // Required for a transparent scene so the page's sky wash can
          // sit behind the globe on the daylight surface.
          contextOptions: { webgl: { alpha: true } },
        });

        if (disposed) { viewer.destroy(); return; }
        viewerRef.current = viewer;

        // Cesium stamps its logo into the credit container; keep the
        // attribution but detach it from our layout flow.
        viewer.cesiumWidget.creditContainer.setAttribute(
          'style',
          'position:absolute;bottom:2px;left:8px;opacity:0.55;font-size:10px;pointer-events:none;'
        );

        const scene = viewer.scene;
        scene.globe.enableLighting = false;
        scene.globe.showGroundAtmosphere = true;
        scene.globe.baseColor = Cesium.Color.fromCssColorString('#AFD6EF');
        scene.fog.enabled = true;

        // On the daylight surface Cesium's black starfield fights the sky
        // wash behind it, so the scene is made transparent and the page
        // gradient shows through. The dark consoles keep the starfield.
        const daylight = theme === 'light';
        if (scene.skyBox) scene.skyBox.show = !daylight;
        if (scene.sun) scene.sun.show = !daylight;
        if (scene.moon) scene.moon.show = !daylight;
        if (scene.skyAtmosphere) scene.skyAtmosphere.show = true;
        scene.backgroundColor = daylight
          ? Cesium.Color.TRANSPARENT
          : Cesium.Color.fromCssColorString('#04040A');
        // Depth testing keeps entities pinned to terrain instead of
        // floating through mountains once terrain is streaming.
        scene.globe.depthTestAgainstTerrain = false;

        // Upgrade to ion terrain + world imagery when a token is present.
        if (hasIon) {
          try {
            const [terrain, worldImagery] = await Promise.all([
              Cesium.createWorldTerrainAsync({ requestVertexNormals: true }),
              Cesium.createWorldImageryAsync(),
            ]);
            if (!disposed && viewerRef.current) {
              viewer.terrainProvider = terrain;
              viewer.imageryLayers.addImageryProvider(worldImagery);
              setImagerySource('ion');
            }
          } catch {
            // Token invalid or network unavailable — the offline base layer
            // is already rendering, so this is a downgrade, not a failure.
            setMessage('Cesium ion unreachable — using offline Natural Earth imagery.');
          }
        } else {
          setMessage('Set NEXT_PUBLIC_CESIUM_ION_TOKEN for streamed terrain and world imagery.');
        }

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(10, 25, 22_000_000),
        });

        // Pointer readout
        const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
        handler.setInputAction((movement: any) => {
          const cartesian = viewer.camera.pickEllipsoid(movement.endPosition, scene.globe.ellipsoid);
          if (!cartesian) return;
          const carto = Cesium.Cartographic.fromCartesian(cartesian);
          onMouseCoords?.({
            lng: Number(Cesium.Math.toDegrees(carto.longitude).toFixed(4)),
            lat: Number(Cesium.Math.toDegrees(carto.latitude).toFixed(4)),
          });
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        handler.setInputAction((click: any) => {
          const picked = scene.pick(click.position);
          if (Cesium.defined(picked) && picked.id?.properties) {
            onEntityClick?.(picked.id.properties.getValue(Cesium.JulianDate.now()));
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        setStatus('ready');
        onReady?.(true);
      } catch (err) {
        console.error('[BotazezGlobe] init failed', err);
        if (!disposed) {
          setStatus('error');
          setMessage(err instanceof Error ? err.message : 'Globe failed to initialise.');
        }
      }
    })();

    return () => {
      disposed = true;
      sourcesRef.current.clear();
      const v = viewerRef.current;
      viewerRef.current = null;
      if (v && !v.isDestroyed?.()) v.destroy();
    };
    // Mount once; data and layer changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Scene mode (3D / 2D / Columbus) ────────────────────────── */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || status !== 'ready') return;
    const target =
      viewMode === '2D' ? Cesium.SceneMode.SCENE2D
      : viewMode === 'COLUMBUS' ? Cesium.SceneMode.COLUMBUS_VIEW
      : Cesium.SceneMode.SCENE3D;
    if (viewer.scene.mode === target) return;
    if (target === Cesium.SceneMode.SCENE2D) viewer.scene.morphTo2D(1.2);
    else if (target === Cesium.SceneMode.COLUMBUS_VIEW) viewer.scene.morphToColumbusView(1.2);
    else viewer.scene.morphTo3D(1.2);
  }, [viewMode, status]);

  /* ── OSINT layers → Cesium data sources ─────────────────────── */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || status !== 'ready') return;

    for (const style of LAYER_STYLES) {
      const on = !!activeLayers[style.key];
      let source = sourcesRef.current.get(style.key);

      if (!on) {
        if (source) source.show = false;
        continue;
      }

      const records = collectRecords(data, style);
      if (!source) {
        source = new Cesium.CustomDataSource(style.key);
        viewer.dataSources.add(source);
        sourcesRef.current.set(style.key, source);
      }
      source.show = true;

      // Rebuild only when the record count changed — the upstream feeds
      // replace arrays wholesale on each poll.
      if (source.entities.values.length === records.length) continue;
      source.entities.removeAll();
      paint(Cesium, source, records, style);
    }
  }, [data, activeLayers, status]);

  /* ── External fly-to ────────────────────────────────────────── */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || status !== 'ready' || !flyToLocation) return;
    const height = flyToLocation.zoom ? 40_000_000 / Math.pow(2, flyToLocation.zoom) : 1_500_000;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(flyToLocation.lng, flyToLocation.lat, height),
      duration: 1.6,
    });
  }, [flyToLocation, status]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />

      {status === 'loading' && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
              style={{ borderTopColor: 'var(--gold-primary)', borderRightColor: 'var(--cyan-primary)' }}
            />
            <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-[var(--text-muted)]">
              Initialising globe
            </span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="glass-panel max-w-md p-5 text-center">
            <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-[var(--alert-red)]">
              Globe unavailable
            </p>
            <p className="mt-2 text-[12px] text-[var(--text-secondary)]">{message}</p>
          </div>
        </div>
      )}

      {status === 'ready' && imagerySource === 'offline' && message && (
        <div className="absolute bottom-3 right-3 pointer-events-none">
          <span className="glass-panel-sm px-2.5 py-1 font-mono text-[9px] tracking-[0.16em] uppercase text-[var(--text-muted)]">
            Offline imagery
          </span>
        </div>
      )}
    </div>
  );
}

/** Gather every record feeding one layer from the shared data blob. */
function collectRecords(data: any, style: LayerStyle): any[] {
  const out: any[] = [];
  for (const key of style.dataKeys) {
    const arr = data?.[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (style.filter && !style.filter(item)) continue;
      out.push(item);
    }
  }
  return out;
}

/** Paint records onto a data source using the layer's visual treatment. */
function paint(Cesium: any, source: any, records: any[], style: LayerStyle) {
  const colour = Cesium.Color.fromCssColorString(style.colour);

  for (const item of records) {
    const coords = coordsOf(item);
    if (!coords) continue;
    const [lng, lat] = coords;
    const altitude = typeof item.alt === 'number' ? item.alt
      : typeof item.altitude === 'number' ? item.altitude
      : style.altitude ?? 0;

    source.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat, altitude),
      point: {
        pixelSize: style.size,
        color: colour.withAlpha(0.92),
        outlineColor: Cesium.Color.WHITE.withAlpha(0.85),
        outlineWidth: 1,
        // Keep markers legible without swamping the globe when zoomed out.
        scaleByDistance: new Cesium.NearFarScalar(1.0e6, 1.15, 3.0e7, 0.45),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: { ...item, __layer: style.key },
      description: labelOf(item) || undefined,
    });
  }
}

export default memo(BotazezGlobe);
