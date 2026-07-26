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
  /** Right-click on the globe surface — drives the region-dossier lookup. */
  onRightClick?: (coords: { lat: number; lng: number }) => void;
  /** Live camera state, translated to the slippy-map zoom convention
   * (metersPerPixel = 156543.03392·cos(lat) / 2^zoom) that ScaleBar and
   * the status HUD already speak, so they don't need to know Cesium
   * exists. Approximate — derived from camera altitude and FOV, not an
   * exact equivalent — good enough for a HUD reading and a scale bar. */
  onViewStateChange?: (vs: { zoom: number; latitude: number }) => void;
  onReady?: (ready: boolean) => void;
  flyToLocation?: { lng: number; lat: number; zoom?: number } | null;
  /** Sun-based day/night terminator lighting on the globe. Off by default
   * (a flat-lit globe reads clearer at a glance); on for a literal day/night
   * view. */
  nightLighting?: boolean;
  /** IP sweep result to visualise: a centre point plus discovered devices
   * arranged around it with connection lines, ported from OsirisMap's
   * MapLibre implementation. */
  sweepData?: {
    center: { lng: number; lat: number };
    target_ip?: string;
    devices: Array<{
      ip: string;
      device_type?: string;
      device_color?: string;
      risk_level?: string;
      ports?: unknown;
      hostnames?: unknown;
    }>;
  } | null;
  /** Standalone scan-target markers (no sweep centre/connections). */
  scanTargets?: Array<{ lng: number; lat: number; [key: string]: unknown }>;
  /** Disable drag/zoom/rotate input — for ambient, look-don't-touch
   * placements like the homepage hero preview. Read once at mount. */
  interactive?: boolean;
  /** Slow continuous spin around the polar axis — pairs with
   * interactive={false} for a living-planet hero visual. */
  autoRotate?: boolean;
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
  onRightClick,
  onViewStateChange,
  onReady,
  flyToLocation,
  nightLighting = false,
  sweepData = null,
  scanTargets = [],
  interactive = true,
  autoRotate = false,
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
        scene.globe.enableLighting = nightLighting;
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
        scene.screenSpaceCameraController.enableInputs = interactive;

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

        handler.setInputAction((click: any) => {
          const cartesian = viewer.camera.pickEllipsoid(click.position, scene.globe.ellipsoid);
          if (!cartesian) return;
          const carto = Cesium.Cartographic.fromCartesian(cartesian);
          onRightClick?.({
            lat: Number(Cesium.Math.toDegrees(carto.latitude).toFixed(4)),
            lng: Number(Cesium.Math.toDegrees(carto.longitude).toFixed(4)),
          });
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

        // Translate camera altitude into the slippy-map zoom convention
        // ScaleBar/SharePanel/the status HUD already use, so they read a
        // live value instead of the frozen default. Approximate: derived
        // from vertical FOV and canvas height, not an exact equivalent.
        const reportViewState = () => {
          const carto = scene.camera.positionCartographic;
          const fovy = (scene.camera.frustum as any).fovy ?? Cesium.Math.PI_OVER_THREE;
          const canvasHeight = scene.canvas.clientHeight || 900;
          const metersPerPixel = (2 * carto.height * Math.tan(fovy / 2)) / canvasHeight;
          const latDeg = Cesium.Math.toDegrees(carto.latitude);
          const zoom = Math.log2(
            (156543.03392 * Math.cos(Cesium.Math.toRadians(latDeg))) / Math.max(metersPerPixel, 0.01)
          );
          onViewStateChange?.({ zoom: Number(zoom.toFixed(2)), latitude: Number(latDeg.toFixed(4)) });
        };
        scene.camera.changed.addEventListener(reportViewState);
        scene.camera.percentageChanged = 0.05;
        reportViewState();

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

  /* ── Ambient auto-rotate (hero previews, look-don't-touch) ────── */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || status !== 'ready' || !autoRotate) return;
    const tick = () => viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.00012);
    viewer.clock.onTick.addEventListener(tick);
    return () => viewer.clock.onTick.removeEventListener(tick);
  }, [autoRotate, status]);

  /* ── Day/night terminator lighting ──────────────────────────── */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || status !== 'ready') return;
    viewer.scene.globe.enableLighting = nightLighting;
  }, [nightLighting, status]);

  /* ── IP sweep visualisation ──────────────────────────────────
     Ported from OsirisMap: a pulsing centre marker, devices arranged
     radially around it, connection lines, camera fly-in. */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || status !== 'ready') return;

    const key = '__sweep';
    let source = sourcesRef.current.get(key);
    if (!sweepData?.devices?.length) {
      if (source) source.entities.removeAll();
      return;
    }

    if (!source) {
      source = new Cesium.CustomDataSource(key);
      viewer.dataSources.add(source);
      sourcesRef.current.set(key, source);
    }
    source.entities.removeAll();

    const { center, devices } = sweepData;
    const centrePos = Cesium.Cartesian3.fromDegrees(center.lng, center.lat, 30);

    source.entities.add({
      position: centrePos,
      point: {
        pixelSize: 14,
        color: Cesium.Color.fromCssColorString('#38BDF8').withAlpha(0.9),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: { ip: sweepData.target_ip, __sweepCentre: true },
    });

    // Spread devices in a ring around the centre — mirrors the small
    // lat/lng-radius offset OsirisMap used rather than a fixed metre
    // radius, so the visual footprint stays consistent at any zoom.
    devices.forEach((d, i) => {
      const angle = (i / devices.length) * Math.PI * 2;
      const radiusDeg = 0.0009 + ((i % 7 + 1) * 0.00035);
      const lngScale = 1 / Math.cos((center.lat * Math.PI) / 180);
      const lng = center.lng + Math.cos(angle) * radiusDeg * lngScale;
      const lat = center.lat + Math.sin(angle) * radiusDeg;
      const colour = Cesium.Color.fromCssColorString(d.device_color || '#38BDF8');
      const pos = Cesium.Cartesian3.fromDegrees(lng, lat, 30);

      source.entities.add({
        polyline: {
          positions: [centrePos, pos],
          width: 1.5,
          material: colour.withAlpha(0.45),
        },
      });
      source.entities.add({
        position: pos,
        point: {
          pixelSize: 8,
          color: colour.withAlpha(0.92),
          outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        properties: { ...d, __layer: 'sweep' },
      });
    });

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(center.lng, center.lat, 2200),
      orientation: { pitch: Cesium.Math.toRadians(-45) },
      duration: 3,
    });
  }, [sweepData, status]);

  /* ── Standalone scan-target markers ─────────────────────────── */
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || status !== 'ready') return;

    const key = '__scanTargets';
    let source = sourcesRef.current.get(key);
    if (!scanTargets.length) {
      if (source) source.entities.removeAll();
      return;
    }
    if (!source) {
      source = new Cesium.CustomDataSource(key);
      viewer.dataSources.add(source);
      sourcesRef.current.set(key, source);
    }
    source.entities.removeAll();
    for (const t of scanTargets) {
      if (typeof t.lng !== 'number' || typeof t.lat !== 'number') continue;
      source.entities.add({
        position: Cesium.Cartesian3.fromDegrees(t.lng, t.lat, 30),
        point: {
          pixelSize: 9,
          color: Cesium.Color.fromCssColorString('#FBBF24').withAlpha(0.9),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        properties: { ...t, __layer: 'scan-target' },
      });
    }
  }, [scanTargets, status]);

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

      // Rebuild when count or position signature changes. Pure count skips
      // were missing live-data position updates (e.g. flights between polls).
      const sig = records.length === 0 ? '' :
        records.slice(0, 8).map(r => `${r.lat?.toFixed(2)},${r.lng?.toFixed(2)}`).join('|');
      if (source.entities.values.length === records.length && source._sig === sig) continue;
      source._sig = sig;
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
