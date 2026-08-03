import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';

/** Louisiana 511 — same open Iteris/511 platform shape as the working FL511 integration. */
export async function fetchLouisianaCameras(): Promise<CctvCamera[]> {
  try {
    const res = await stealthFetch('https://www.511la.org/api/v2/cameras', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    const cams: CctvCamera[] = [];
    for (const cam of (Array.isArray(data) ? data : []).slice(0, 800)) {
      const lat = cam.latitude ?? cam.Latitude;
      const lng = cam.longitude ?? cam.Longitude;
      const url = cam.imageUrl ?? cam.ImageUrl ?? cam.url;
      if (!lat || !lng || !url) continue;
      cams.push({
        id: `la-${cams.length}`, lat, lng,
        name: cam.description || cam.Description || cam.name || 'Louisiana 511 Camera',
        city: 'Louisiana', country: 'US',
        feed_url: url, source: '511LA',
      });
    }
    return cams;
  } catch (e) {
    console.warn('[cctv] louisiana fetch failed:', e instanceof Error ? e.message : e);
    return [];
  }
}
