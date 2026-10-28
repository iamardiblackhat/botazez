/** A view changes visible layers, never the underlying records or source claims. */
export const DASHBOARD_VIEWS = {
  Overview: ['day_night', 'earthquakes', 'global_incidents'],
  Hazards: ['day_night', 'earthquakes', 'fires', 'weather'],
  Transport: ['day_night', 'flights', 'private', 'maritime', 'transit'],
} as const;

export function applyDashboardView<T extends Record<string, boolean>>(current: T, view: keyof typeof DASHBOARD_VIEWS): { [K in keyof T]: boolean } {
  const enabled = new Set<string>([...DASHBOARD_VIEWS[view], 'wind_controls', 'rain_controls']);
  return Object.fromEntries(Object.keys(current).map(key => [key, enabled.has(key)])) as { [K in keyof T]: boolean };
}
