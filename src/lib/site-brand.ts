import type { Metadata } from 'next';

export const SITE_URL = 'https://botazez.com';
export const SITE_NAME = 'Botazez';
export const SITE_TITLE = 'Botazez — Intelligence Dashboard by Omnelia SI';
export const SITE_DESCRIPTION = 'Explore the world with Botazez by Omnelia SI: an interactive intelligence dashboard for maps, public cameras, events and source-backed research.';
export const SHARE_IMAGE = `${SITE_URL}/brand/botazez-social-v2.png`;
const images = [{ url: SHARE_IMAGE, width: 1200, height: 630, type: 'image/png', alt: 'Botazez intelligence dashboard by Omnelia SI, featuring the Omnelia mascot.' }];

export const brandMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: '%s | Botazez by Omnelia SI' },
  description: SITE_DESCRIPTION,
  applicationName: 'Botazez by Omnelia SI',
  authors: [{ name: 'Omnelia SI', url: 'https://omnelia.si' }],
  creator: 'Omnelia SI', publisher: 'Omnelia SI',
  keywords: ['Botazez', 'Omnelia SI', 'intelligence dashboard', 'world map', 'public cameras', 'public-source research'],
  alternates: { canonical: SITE_URL },
  icons: {
    icon: [
      { url: '/brand/botazez-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/botazez-icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/botazez-icon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/brand/botazez-icon-180.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/brand/botazez.ico',
  },
  manifest: '/site.webmanifest',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  openGraph: { type: 'website', siteName: SITE_NAME, title: SITE_TITLE, description: SITE_DESCRIPTION, url: SITE_URL, locale: 'en_US', images },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION, images: [{ url: SHARE_IMAGE, alt: images[0].alt }] },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Botazez' },
  category: 'technology',
  other: { 'mobile-web-app-capable': 'yes', 'msapplication-TileColor': '#06060C' },
};

export function brandedPageMetadata(title: string, description: string, path: string): Metadata {
  const url = new URL(path, SITE_URL).href;
  return { title, description, alternates: { canonical: url }, openGraph: { ...brandMetadata.openGraph, title: `${title} | Botazez by Omnelia SI`, description, url }, twitter: { ...brandMetadata.twitter, title: `${title} | Botazez by Omnelia SI`, description } };
}

export const brandStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${SITE_URL}/#publisher`, name: 'Omnelia SI', url: 'https://omnelia.si' },
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, alternateName: 'Botazez by Omnelia SI', url: SITE_URL, publisher: { '@id': `${SITE_URL}/#publisher` } },
    { '@type': 'WebApplication', '@id': `${SITE_URL}/#application`, name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION, applicationCategory: 'SecurityApplication', operatingSystem: 'Web', image: SHARE_IMAGE, screenshot: SHARE_IMAGE, publisher: { '@id': `${SITE_URL}/#publisher` }, featureList: ['Interactive world map', 'Public camera directory and viewer', 'Source-backed event records', 'Geospatial layers and research tools'] },
  ],
};
