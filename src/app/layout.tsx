import type { Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import ErrorBoundary from '@/components/ErrorBoundary';
import { brandMetadata, brandStructuredData } from '@/lib/site-brand';
import './globals.css';
import './omnelia-glass.css';

export const metadata = brandMetadata;
export const viewport: Viewport = { themeColor: '#D4AF37', width: 'device-width', initialScale: 1, maximumScale: 5, colorScheme: 'dark' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" dir="ltr"><head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(brandStructuredData) }} />
  </head><body className="antialiased"><ErrorBoundary name="Botazez Core">{children}</ErrorBoundary>{process.env.VERCEL === '1' && <Analytics />}</body></html>;
}
