
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * OSIRIS — NASA Astronomy Picture of the Day
 * Small, self-contained: today's APOD image/title/explanation.
 * NASA_API_KEY env var if set, otherwise falls back to the public
 * DEMO_KEY (rate-limited but always works). Does not touch, replace,
 * or otherwise involve the site's own Earth rendering anywhere —
 * this is a standalone daily photo card, not a texture source.
 */

const NASA_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';

export async function GET() {
  try {
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`APOD upstream ${res.status}`);
    const data = await res.json();

    return NextResponse.json({
      title: data.title || '',
      date: data.date || '',
      explanation: data.explanation || '',
      media_type: data.media_type || 'image',
      url: data.url || '',
      hdurl: data.hdurl || data.url || '',
      copyright: data.copyright || '',
    }, {
      headers: {
        // APOD is published once a day — cache generously
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('APOD API error:', error);
    return NextResponse.json({
      title: '', date: '', explanation: '', media_type: 'image', url: '', hdurl: '', copyright: '',
      error: 'Failed to fetch APOD',
    }, { status: 500 });
  }
}
