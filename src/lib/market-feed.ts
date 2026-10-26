import type { MarketQuote } from './markets';

type QuoteRecord = { price?: unknown; change_percent?: unknown; currency?: unknown; market_open?: unknown };
const groups = ['stocks', 'oil', 'commodities', 'crypto', 'indices', 'fx'] as const;
const symbols: Record<string, string> = { 'WTI Crude': 'CL=F', 'Brent Crude': 'BZ=F', Gold: 'GC=F', Silver: 'SI=F', Copper: 'HG=F', 'Natural Gas': 'NG=F', Wheat: 'ZW=F', Corn: 'ZC=F', Bitcoin: 'BTC-USD', Ethereum: 'ETH-USD', 'S&P 500': 'ES=F', 'Nasdaq 100': 'NQ=F' };

/** Adapt the existing grouped feed for analyst tools; missing prices are omitted. */
export function normalizeMarketQuotes(body: unknown): MarketQuote[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid market feed.');
  const feed = body as Record<string, unknown>;
  if (feed.error) throw new Error('The market feed is unavailable.');
  return groups.flatMap(group => {
    const values = feed[group];
    if (!values || typeof values !== 'object' || Array.isArray(values)) return [];
    return Object.entries(values).flatMap(([name, raw]) => {
      if (!raw || typeof raw !== 'object') return [];
      const value = raw as QuoteRecord;
      if (typeof value.price !== 'number' || !Number.isFinite(value.price) || value.price <= 0 || typeof value.change_percent !== 'number' || !Number.isFinite(value.change_percent)) return [];
      return [{ name, symbol: symbols[name] || name, group, price: value.price, change_percent: value.change_percent, up: value.change_percent >= 0,
        ...(typeof value.currency === 'string' ? { currency: value.currency } : {}),
        ...(typeof value.market_open === 'boolean' ? { market_open: value.market_open } : {}),
      }];
    });
  });
}

export async function getQuotes(): Promise<MarketQuote[]> {
  const { GET } = await import('@/app/api/markets/route');
  const response = await GET();
  if (!response.ok) throw new Error('The market feed is unavailable.');
  return normalizeMarketQuotes(await response.json());
}
