/**
 * Per-domain live data fetching for the /dashboard/[domain] command-center
 * pages. Each entry lists only endpoints that are real and already verified
 * against the actual API route responses (see src/app/dashboard/full/page.tsx
 * for the equivalent combined-map wiring this mirrors) — nothing here is
 * fabricated. Layers with no confirmed live data source are intentionally
 * left out rather than wired to a guess.
 */

export interface FeedSpec {
  url: string;
  /** Reshapes the raw JSON into the keys LAYER_STYLES/OsirisMap expect. */
  transform?: (json: any) => Record<string, unknown>;
}

export const DOMAIN_FEEDS: Record<string, FeedSpec[]> = {
  aviation: [
    { url: '/api/flights' },
  ],
  maritime: [
    { url: '/api/maritime', transform: (d) => ({ maritime_ports: d.ports, maritime_chokepoints: d.chokepoints, maritime_ships: d.ships }) },
    { url: '/data/submarine-cables.json', transform: (d) => ({ submarine_cables: d.features }) },
  ],
  space: [
    { url: '/api/satellites' },
    { url: '/api/balloons', transform: (d) => ({ balloons: d.balloons }) },
  ],
  surveillance: [
    { url: '/api/cctv?region=all' },
    { url: '/api/live-news', transform: (d) => ({ live_feeds: d.feeds }) },
    { url: '/api/news' },
  ],
  hazards: [
    { url: '/api/earthquakes' },
    { url: '/api/fires' },
    { url: '/api/weather', transform: (d) => ({ weather_events: d.events }) },
  ],
  threat: [
    { url: '/api/gdelt', transform: (d) => ({ gdelt: d.events }) },
  ],
  infrastructure: [
    { url: '/api/infrastructure', transform: (d) => ({ infrastructure: d.infrastructure }) },
  ],
  network: [
    { url: '/api/malware', transform: (d) => ({ malware_threats: d.threats }) },
  ],
};

/** Every activeLayers key this domain's feeds actually populate, forced on. */
export const DOMAIN_LAYER_KEYS: Record<string, string[]> = {
  aviation: ['flights', 'private', 'jets', 'military'],
  maritime: ['maritime', 'cables'],
  space: ['satellites', 'sat_comms', 'sat_military', 'sat_navigation', 'sat_earth', 'sat_science', 'balloons'],
  surveillance: ['cctv', 'live_news', 'news_intel'],
  hazards: ['earthquakes', 'fires', 'weather'],
  threat: ['global_incidents'],
  infrastructure: ['infrastructure'],
  network: ['malware'],
};

export function activeLayersForDomain(slug: string): Record<string, boolean> {
  const keys = DOMAIN_LAYER_KEYS[slug] || [];
  const out: Record<string, boolean> = { day_night: true };
  for (const k of keys) out[k] = true;
  return out;
}
