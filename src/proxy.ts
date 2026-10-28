import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';

/** Optional, explicitly configured page analytics. No local Docker assumption. */
export function proxy(request: NextRequest, event: NextFetchEvent) {
  const endpoint = process.env.UMAMI_URL;
  const website = process.env.UMAMI_WEBSITE_ID;
  if (!endpoint || !website) return NextResponse.next();
  let target: URL;
  try {
    target = new URL('/api/send', endpoint);
    if (!['https:', 'http:'].includes(target.protocol)) return NextResponse.next();
  } catch { return NextResponse.next(); }
  const pageView = fetch(target.href, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'event', payload: {
      hostname: request.nextUrl.hostname,
      url: request.nextUrl.pathname,
      title: 'BOTAZEZ',
      website,
    } }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
  event.waitUntil(pageView);
  return NextResponse.next();
}
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
