import { describe, expect, it } from 'vitest';
import { normalizeMarketQuotes } from './market-feed';
describe('analyst market feed adapter', () => {
  it('preserves real values, groups and symbols without inventing market state', () => {
    expect(normalizeMarketQuotes({ oil: { 'WTI Crude': { price: 71.5, change_percent: -1.2 } }, stocks: { RTX: { price: 100, change_percent: 2, market_open: false } } })).toEqual([
      { name: 'RTX', symbol: 'RTX', group: 'stocks', price: 100, change_percent: 2, up: true, market_open: false },
      { name: 'WTI Crude', symbol: 'CL=F', group: 'oil', price: 71.5, change_percent: -1.2, up: false },
    ]);
  });
  it('omits unusable prices rather than fabricating quotes', () => {
    expect(normalizeMarketQuotes({ stocks: { bad: { price: NaN, change_percent: 1 }, empty: { price: 0, change_percent: 0 }, missing: { price: 5 } } })).toEqual([]);
    expect(normalizeMarketQuotes({ stocks: {} })).toEqual([]);
  });
  it('distinguishes feed failure from an empty result', () => {
    expect(() => normalizeMarketQuotes({ error: 'offline' })).toThrow('unavailable');
    expect(() => normalizeMarketQuotes(null)).toThrow('Invalid');
  });
});
