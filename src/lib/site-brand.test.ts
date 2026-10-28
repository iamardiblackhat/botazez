import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { brandMetadata, brandStructuredData, brandedPageMetadata, SHARE_IMAGE, SITE_URL } from './site-brand';
const asset = (name: string) => path.join(process.cwd(), name);

describe('public Botazez branding', () => {
  it('uses one owned identity for link previews and search metadata', () => {
    expect(brandMetadata).toMatchObject({ applicationName: 'Botazez by Omnelia SI', publisher: 'Omnelia SI', openGraph: { siteName: 'Botazez', images: [{ url: SHARE_IMAGE, width: 1200, height: 630 }] }, twitter: { card: 'summary_large_image', images: [{ url: SHARE_IMAGE }] } });
    expect(JSON.stringify(brandMetadata)).not.toMatch(/osiris|palantir|10K|2K/i);
    expect(brandStructuredData['@graph']).toContainEqual(expect.objectContaining({ '@type': 'WebSite', name: 'Botazez', url: SITE_URL }));
  });
  it.each(['/docs','/privacy'])('gives %s its own share and canonical URL', route => {
    expect(brandedPageMetadata('Page title','Page description',route)).toMatchObject({ alternates: { canonical: `${SITE_URL}${route}` }, openGraph: { url: `${SITE_URL}${route}`, images: [{ url: SHARE_IMAGE }] } });
  });
  it('ships complete identical install manifests and real square app icons', async () => {
    const manifests = await Promise.all(['public/site.webmanifest','public/manifest.json'].map(async name => JSON.parse(await readFile(asset(name),'utf8'))));
    expect(manifests[0]).toEqual(manifests[1]);
    expect(manifests[0]).toMatchObject({ name: 'Botazez by Omnelia SI', orientation: 'any', start_url: '/' });
    for (const icon of manifests[0].icons) {
      const image = await sharp(asset(`public${icon.src}`)).metadata();
      expect(`${image.width}x${image.height}`).toBe(icon.sizes);
    }
    for (const size of [16,32,48,180,192,512]) {
      const image = await sharp(asset(`public/brand/botazez-icon-${size}.png`)).metadata();
      expect([image.width,image.height]).toEqual([size,size]);
    }
  });
  it('replaces legacy public icon paths and Next’s file-based favicon too', async () => {
    const expected = await readFile(asset('public/brand/botazez.ico'));
    expect(await readFile(asset('src/app/favicon.ico'))).toEqual(expected);
    expect(await readFile(asset('public/favicon.ico'))).toEqual(expected);
    expect(await readFile(asset('public/osiris-icon.png'))).toEqual(await readFile(asset('public/brand/botazez-icon-512.png')));
  });
  it('ships the complete social image rather than an obsolete fallback', async () => {
    const image = await readFile(asset('public/brand/botazez-social-v3.png'));
    const dimensions = await sharp(image).metadata();
    expect([dimensions.width,dimensions.height]).toEqual([1200,630]);
    expect(await readFile(asset('public/og-image.png'))).toEqual(image);
    expect(await readFile(asset('public/brand/botazez-social-v2.png'))).toEqual(image);
  });
  it('keeps the crawlable site identity and page list current', async () => {
    const robots = await readFile(asset('public/robots.txt'),'utf8');
    const sitemap = await readFile(asset('public/sitemap.xml'),'utf8');
    expect(robots).not.toMatch(/osiris/i);
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
    expect(sitemap).toContain(`${SITE_URL}/docs`);
    expect(sitemap).toContain(`${SITE_URL}/privacy`);
  });
});
