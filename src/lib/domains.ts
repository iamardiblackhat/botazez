/**
 * Botazez intelligence domains — the multipage information architecture.
 *
 * Each domain becomes its own route under /intel/<slug>, presenting that
 * domain's feeds, sources and live counts as information first, with the
 * globe as supporting context rather than the whole product. The combined
 * live surface remains at /dashboard.
 *
 * Layer wiring is derived from LAYER_STYLES so a domain page and the globe
 * can never drift apart.
 */

import { LAYER_STYLES, type LayerStyle } from './globe-layers';

export interface Domain {
  slug: string;
  name: string;
  /** One-line statement of what this domain watches. */
  summary: string;
  /** Longer description for the domain page header. */
  description: string;
  /** Upstream providers, as credited in the README. */
  sources: string[];
  /** Category key linking to LAYER_STYLES. */
  category: LayerStyle['category'];
  /** API routes backing this domain, for the technical readout. */
  endpoints: string[];
  accent: string;
}

export const DOMAINS: Domain[] = [
  {
    slug: 'aviation',
    name: 'Aviation',
    summary: 'Commercial, private and military air traffic, tracked live.',
    description:
      'Live ADS-B derived air traffic separated by class, so military movements and private jet activity can be read apart from routine commercial traffic rather than lost inside it.',
    sources: ['OpenSky Network'],
    category: 'Aviation',
    endpoints: ['/api/flights'],
    accent: '#0284C7',
  },
  {
    slug: 'maritime',
    name: 'Maritime',
    summary: 'Global ports, chokepoints, shipping and submarine cable routes.',
    description:
      'Vessel positions alongside the fixed maritime geography that shapes them — the ports, straits and cable corridors where disruption carries strategic weight.',
    sources: ['Static naval intelligence', 'Submarine cable registries'],
    category: 'Maritime',
    endpoints: ['/api/maritime'],
    accent: '#0E7490',
  },
  {
    slug: 'space',
    name: 'Space',
    summary: 'Orbital tracking, solar weather and near-Earth objects.',
    description:
      'SGP4-propagated satellite positions grouped by mission class — communications, navigation, Earth observation, military and scientific — with solar activity and near-Earth object data alongside.',
    sources: ['CelesTrak TLE', 'NOAA SWPC', 'NASA DONKI', 'NASA NeoWs'],
    category: 'Space',
    endpoints: ['/api/satellites', '/api/space-weather', '/api/apod'],
    accent: '#C2410C',
  },
  {
    slug: 'surveillance',
    name: 'Surveillance',
    summary: 'Public camera networks and continuous broadcast feeds.',
    description:
      'Thousands of publicly accessible traffic and civic cameras plus round-the-clock broadcast streams, mapped to their locations so visual confirmation sits next to the reporting.',
    sources: ['TfL', 'WSDOT', 'Caltrans', 'NYC DOT', 'VicRoads', 'Global broadcasters'],
    category: 'Surveillance',
    endpoints: ['/api/cctv', '/api/streams'],
    accent: '#0891B2',
  },
  {
    slug: 'hazards',
    name: 'Natural Hazards',
    summary: 'Seismic activity, active fire hotspots and severe weather.',
    description:
      'Earthquake, wildfire and severe weather monitoring drawn from primary scientific sources, with magnitude and intensity preserved rather than flattened into a single alert level.',
    sources: ['USGS', 'NASA FIRMS', 'NASA EONET'],
    category: 'Hazard',
    endpoints: ['/api/earthquakes', '/api/fires', '/api/weather'],
    accent: '#C2410C',
  },
  {
    slug: 'threat',
    name: 'Conflict & Threat',
    summary: 'Active conflict zones, global incidents and GPS interference.',
    description:
      'Conflict geography, event-level incident reporting and electronic warfare indicators such as GPS jamming, held together so escalation is visible as a pattern rather than isolated events.',
    sources: ['GDELT', 'Open conflict datasets'],
    category: 'Threat',
    endpoints: ['/api/gdelt', '/api/conflicts', '/api/frontlines'],
    accent: '#B45309',
  },
  {
    slug: 'infrastructure',
    name: 'Infrastructure',
    summary: 'Nuclear facilities and critical infrastructure siting.',
    description:
      'Fixed critical infrastructure — reactors, energy and radiation monitoring — providing the static backdrop against which incidents and hazards are assessed.',
    sources: ['Public facility registries', 'Radiation monitoring networks'],
    category: 'Infrastructure',
    endpoints: ['/api/radiation'],
    accent: '#4D7C0F',
  },
  {
    slug: 'network',
    name: 'Cyber & Network',
    summary: 'Live malware telemetry, CVE tracking and network reconnaissance.',
    description:
      'Threat intelligence covering live malware activity, published vulnerabilities and network-level reconnaissance tooling, tied to geography where attribution allows.',
    sources: ['NVD', 'Malware telemetry feeds'],
    category: 'Network',
    endpoints: ['/api/osint/threats', '/api/scanner', '/api/osint/shodan'],
    accent: '#BE185D',
  },
];

export function domainBySlug(slug: string): Domain | undefined {
  return DOMAINS.find(d => d.slug === slug);
}

/** Layers belonging to a domain, resolved from the shared catalogue. */
export function layersFor(domain: Domain): LayerStyle[] {
  return LAYER_STYLES.filter(l => l.category === domain.category);
}
