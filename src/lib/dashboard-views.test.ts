import { describe, expect, it } from 'vitest';
import { applyDashboardView } from './dashboard-views';

describe('dashboard views', () => {
  const original = { flights: true, earthquakes: false, satellites: true, day_night: false, wind_controls: false, rain_controls: false, fires: false, weather: false, transit: false, maritime: false };
  it('removes clutter for overview without mutating the previous view', () => {
    const next = applyDashboardView(original, 'Overview');
    expect(next).toMatchObject({ earthquakes: true, satellites: false, flights: false, day_night: true });
    expect(original.satellites).toBe(true);
    expect(Object.keys(next)).toEqual(Object.keys(original));
  });
  it('enables hazards and keeps weather time controls ready', () => {
    expect(applyDashboardView(original, 'Hazards')).toMatchObject({ fires: true, weather: true, earthquakes: true, wind_controls: true, rain_controls: true, flights: false });
  });
  it('enables transport without implying other feeds are connected', () => {
    expect(applyDashboardView(original, 'Transport')).toMatchObject({ flights: true, transit: true, maritime: true, earthquakes: false, satellites: false });
  });
});
