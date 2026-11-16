import { describe, expect, it } from 'vitest';
import { applyDashboardView } from './dashboard-views';

describe('dashboard views', () => {
  const original = { flights: true, earthquakes: false, satellites: false, day_night: false, wind_controls: false, rain_controls: false, fires: false, weather: false, transit: false, maritime: false, cctv: false, cctv_previews: false, live_news: false, global_incidents: false, cables: false, sdk_sea: false, sdk_air: false, sdk_naval: false };
  it('enables the full overview map layers without mutating the previous view', () => {
    const next = applyDashboardView(original, 'Overview');
    expect(next).toMatchObject({
      maritime: true,
      satellites: true,
      cctv: true,
      cctv_previews: true,
      live_news: true,
      earthquakes: true,
      global_incidents: true,
      day_night: true,
      cables: true,
      sdk_sea: true,
      sdk_air: true,
      sdk_naval: true,
      wind_controls: true,
      rain_controls: true,
      flights: false,
    });
    expect(original.satellites).toBe(false);
    expect(Object.keys(next)).toEqual(Object.keys(original));
  });
  it('enables hazards and keeps weather time controls ready', () => {
    expect(applyDashboardView(original, 'Hazards')).toMatchObject({ fires: true, weather: true, earthquakes: true, wind_controls: true, rain_controls: true, flights: false });
  });
  it('enables transport without implying other feeds are connected', () => {
    expect(applyDashboardView(original, 'Transport')).toMatchObject({ flights: true, transit: true, maritime: true, earthquakes: false, satellites: false });
  });
});
