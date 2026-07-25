/**
 * Botazez OSINT layer catalogue for the Cesium globe.
 *
 * Single source of truth mapping each `activeLayers` toggle to the feed
 * keys on the shared data blob plus its visual treatment. Adding a domain
 * means adding an entry here — the globe picks it up with no further
 * wiring, which is the extension point for feeds not yet ported.
 *
 * Colours are chosen to stay legible over light Natural Earth / satellite
 * imagery; the old palette was tuned for a near-black basemap.
 */

export interface LayerStyle {
  /** Key in the dashboard's `activeLayers` state. */
  key: string;
  /** Human label, matching the layer panel. */
  label: string;
  /** Category used for grouping in the UI. */
  category:
    | 'Aviation' | 'Maritime' | 'Space' | 'Surveillance'
    | 'Hazard' | 'Threat' | 'Network' | 'Infrastructure';
  /** Feed keys on the data blob that supply this layer. */
  dataKeys: string[];
  colour: string;
  size: number;
  /** Metres above the ellipsoid when a record carries no altitude. */
  altitude?: number;
  /** Narrow a shared feed down to one layer (e.g. satellite categories). */
  filter?: (item: any) => boolean;
}

const satCategory = (cat: string) => (item: any) =>
  item?.category === cat || item?.type === cat;

export const LAYER_STYLES: LayerStyle[] = [
  /* ── Aviation ── */
  { key: 'flights',  label: 'Commercial',   category: 'Aviation', dataKeys: ['commercial_flights'], colour: '#0284C7', size: 6, altitude: 10_000 },
  { key: 'private',  label: 'Private',      category: 'Aviation', dataKeys: ['private_flights'],    colour: '#7C3AED', size: 6, altitude: 9_000 },
  { key: 'jets',     label: 'Private Jets', category: 'Aviation', dataKeys: ['private_jets'],       colour: '#A21CAF', size: 6, altitude: 11_000 },
  { key: 'military', label: 'Military',     category: 'Aviation', dataKeys: ['military_flights'],   colour: '#B91C1C', size: 7, altitude: 12_000 },

  /* ── Maritime ── */
  { key: 'maritime', label: 'Maritime / Naval', category: 'Maritime', dataKeys: ['maritime_ships', 'maritime_ports', 'maritime_chokepoints'], colour: '#0E7490', size: 7 },
  { key: 'cables',   label: 'Submarine Cables', category: 'Maritime', dataKeys: ['submarine_cables'], colour: '#0F766E', size: 4 },
  { key: 'sdk_sea',  label: 'SDK Maritime',     category: 'Maritime', dataKeys: ['sdk_entities'],     colour: '#155E75', size: 5 },
  { key: 'sdk_naval', label: 'SDK Naval',       category: 'Maritime', dataKeys: ['sdk_entities'],     colour: '#164E63', size: 5 },

  /* ── Space ── */
  { key: 'satellites',     label: 'All Satellites',        category: 'Space', dataKeys: ['satellites'], colour: '#C2410C', size: 5, altitude: 500_000 },
  { key: 'sat_comms',      label: 'Starlink / Comms',      category: 'Space', dataKeys: ['satellites'], colour: '#EA580C', size: 5, altitude: 550_000, filter: satCategory('comms') },
  { key: 'sat_military',   label: 'Military / Intel',      category: 'Space', dataKeys: ['satellites'], colour: '#9F1239', size: 5, altitude: 600_000, filter: satCategory('military') },
  { key: 'sat_navigation', label: 'GPS / Navigation',      category: 'Space', dataKeys: ['satellites'], colour: '#1D4ED8', size: 5, altitude: 700_000, filter: satCategory('navigation') },
  { key: 'sat_earth',      label: 'Earth Observation',     category: 'Space', dataKeys: ['satellites'], colour: '#15803D', size: 5, altitude: 650_000, filter: satCategory('earth_obs') },
  { key: 'sat_science',    label: 'Stations / Telescopes', category: 'Space', dataKeys: ['satellites'], colour: '#7E22CE', size: 6, altitude: 420_000, filter: satCategory('science') },
  { key: 'balloons',       label: 'Balloons',              category: 'Space', dataKeys: ['balloons'],   colour: '#A16207', size: 5, altitude: 20_000 },
  { key: 'sdk_air',        label: 'SDK Air',               category: 'Space', dataKeys: ['sdk_entities'], colour: '#0369A1', size: 5, altitude: 8_000 },

  /* ── Surveillance ── */
  { key: 'cctv',       label: 'CCTV Cameras',   category: 'Surveillance', dataKeys: ['cameras'],     colour: '#0891B2', size: 5 },
  { key: 'live_news',  label: 'Live News Feeds', category: 'Surveillance', dataKeys: ['live_feeds'],  colour: '#BE123C', size: 6 },
  { key: 'news_intel', label: 'SIGINT News',    category: 'Surveillance', dataKeys: ['sigint_news', 'news'], colour: '#9D174D', size: 5 },

  /* ── Natural hazards ── */
  { key: 'earthquakes', label: 'Earthquakes',    category: 'Hazard', dataKeys: ['earthquakes'],    colour: '#C2410C', size: 8 },
  { key: 'fires',       label: 'Active Fires',   category: 'Hazard', dataKeys: ['fires'],          colour: '#DC2626', size: 6 },
  { key: 'weather',     label: 'Severe Weather', category: 'Hazard', dataKeys: ['weather_events'], colour: '#7E22CE', size: 7 },

  /* ── Threat & intel ── */
  { key: 'infrastructure',   label: 'Nuclear Facilities', category: 'Infrastructure', dataKeys: ['infrastructure'], colour: '#4D7C0F', size: 7 },
  { key: 'global_incidents', label: 'Global Incidents',   category: 'Threat', dataKeys: ['gdelt'],        colour: '#B45309', size: 5 },
  { key: 'war_alerts',       label: 'War Alerts',         category: 'Threat', dataKeys: ['war_alerts'],   colour: '#991B1B', size: 8 },
  { key: 'gps_jamming',      label: 'GPS Jamming',        category: 'Threat', dataKeys: ['gps_jamming'],  colour: '#A16207', size: 6 },
  { key: 'radiation',        label: 'Radiation',          category: 'Hazard', dataKeys: ['radiation'],    colour: '#65A30D', size: 6 },

  /* ── Network ── */
  { key: 'malware', label: 'Live Malware', category: 'Network', dataKeys: ['malware_threats'], colour: '#BE185D', size: 5 },
];

/** Toggles that change how the scene renders rather than adding entities. */
export const DISPLAY_TOGGLES = ['day_night', 'terrain_3d'] as const;

export const LAYER_CATEGORIES = [...new Set(LAYER_STYLES.map(l => l.category))];
