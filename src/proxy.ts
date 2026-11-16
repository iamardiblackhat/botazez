import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const UMAMI_URL = 'http://umami-umami-1:3000/api/send';
const UMAMI_OSIRIS_ID = '2b2ceca2-ac9b-4239-9996-f3c2d81aa4cd';
const UMAMI_ROLLUP_ID = 'a3be2de8-d559-4138-91c7-2b5c86fe7250';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const { pathname } = request.nextUrl;
  const ua = request.headers.get('user-agent') || '';
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '';
  const referer = request.headers.get('referer') || '';
  const acceptLang = request.headers.get('accept-language')?.split(',')[0] || 'en-US';
  const host = request.headers.get('host') || 'botazez.com';

  // Skip bots and asset requests
  if (/bot|crawl|spider|slurp|WhatsApp|Telegram|curl|wget|HeadlessChrome/i.test(ua)) {
    return response;
  }

  // Fire-and-forget to both site tracker and global rollup
  const sendHit = (websiteId: string) => {
    fetch(UMAMI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': ua,
        'X-Forwarded-For': ip,
      },
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: websiteId,
          hostname: host,
          url: pathname,
          referrer: referer,
          language: acceptLang,
          screen: '1920x1080',
        },
      }),
      signal: AbortSignal.timeout(2000),
    }).catch(() => {});
  };

  sendHit(UMAMI_OSIRIS_ID);
  sendHit(UMAMI_ROLLUP_ID);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|vendor|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mjs|js|css|json|pbf|mvt|woff|woff2|ico|txt)$).*)',
  ],
};
