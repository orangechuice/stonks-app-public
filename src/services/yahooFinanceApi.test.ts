import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { deriveMarketState } from './yahooFinanceApi';

describe('deriveMarketState', () => {
  it('uses meta.marketState when explicitly provided', () => {
    expect(deriveMarketState({ marketState: 'REGULAR' })).toBe('REGULAR');
    expect(deriveMarketState({ marketState: 'PRE' })).toBe('PRE');
    expect(deriveMarketState({ marketState: 'POST' })).toBe('POST');
    expect(deriveMarketState({ marketState: 'CLOSED' })).toBe('CLOSED');
  });

  it('derives REGULAR state when current time falls within currentTradingPeriod.regular range', () => {
    const nowSec = 100000;
    vi.spyOn(Date, 'now').mockReturnValue(nowSec * 1000);

    const meta = {
      currentTradingPeriod: {
        pre: { start: 80000, end: 90000 },
        regular: { start: 90000, end: 110000 },
        post: { start: 110000, end: 120000 },
      },
    };

    expect(deriveMarketState(meta)).toBe('REGULAR');
    vi.restoreAllMocks();
  });

  it('derives PRE state when current time falls within currentTradingPeriod.pre range', () => {
    const nowSec = 85000;
    vi.spyOn(Date, 'now').mockReturnValue(nowSec * 1000);

    const meta = {
      currentTradingPeriod: {
        pre: { start: 80000, end: 90000 },
        regular: { start: 90000, end: 110000 },
        post: { start: 110000, end: 120000 },
      },
    };

    expect(deriveMarketState(meta)).toBe('PRE');
    vi.restoreAllMocks();
  });

  it('derives POST state when current time falls within currentTradingPeriod.post range', () => {
    const nowSec = 115000;
    vi.spyOn(Date, 'now').mockReturnValue(nowSec * 1000);

    const meta = {
      currentTradingPeriod: {
        pre: { start: 80000, end: 90000 },
        regular: { start: 90000, end: 110000 },
        post: { start: 110000, end: 120000 },
      },
    };

    expect(deriveMarketState(meta)).toBe('POST');
    vi.restoreAllMocks();
  });

  it('derives CLOSED state when current time is outside all trading periods', () => {
    const nowSec = 130000;
    vi.spyOn(Date, 'now').mockReturnValue(nowSec * 1000);

    const meta = {
      currentTradingPeriod: {
        pre: { start: 80000, end: 90000 },
        regular: { start: 90000, end: 110000 },
        post: { start: 110000, end: 120000 },
      },
    };

    expect(deriveMarketState(meta)).toBe('CLOSED');
    vi.restoreAllMocks();
  });
});

describe('rate limit state management', () => {
  it('provides getIsRateLimited and subscribeRateLimit', async () => {
    const { getIsRateLimited, subscribeRateLimit } = await import('./yahooFinanceApi');
    expect(typeof getIsRateLimited()).toBe('boolean');
    
    let receivedValue: boolean | null = null;
    const unsubscribe = subscribeRateLimit((val) => {
      receivedValue = val;
    });
    expect(receivedValue).toBe(getIsRateLimited());
    unsubscribe();
  });
});

describe('fetchStockData market cap & P/E (desktop)', () => {
  // HON is deliberately absent from the bundled fundamentals table, so every value must come from Nasdaq.
  // `close` differs from the live price only for custom ranges, where it is the range-end close.
  const chartJson = (livePrice: number, close = livePrice) => ({
    chart: {
      result: [{
        meta: { symbol: 'HON', regularMarketPrice: livePrice, chartPreviousClose: 190, currency: 'USD' },
        timestamp: [1794400000],
        indicators: { quote: [{ close: [close], open: [195], high: [201], low: [194], volume: [1000] }] },
      }],
    },
  });
  // At the $200 live price this implies 640M shares outstanding.
  const summaryJson = { data: { summaryData: { MarketCap: { label: 'Market Cap', value: '128,000,000,000' } } } };
  const epsJson = { data: { earningsPerShare: [{ earnings: 2 }, { earnings: 3 }, { earnings: 2.5 }, { earnings: 2.5 }, { earnings: 0 }] } };

  let nasdaqUp: boolean;
  let livePrice: number;
  let ipc: ReturnType<typeof vi.fn>;
  const count = (fragment: string) => ipc.mock.calls.filter(([url]) => String(url).includes(fragment)).length;

  beforeEach(async () => {
    const { clearStockCache } = await import('./yahooFinanceApi');
    clearStockCache();
    nasdaqUp = true;
    livePrice = 200;
    ipc = vi.fn(async (url: string) => {
      if (url.includes('finance.yahoo.com')) return url.includes('period1') ? chartJson(livePrice, 100) : chartJson(livePrice);
      if (!nasdaqUp) return null;
      if (url.includes('/summary')) return summaryJson;
      if (url.includes('/eps')) return epsJson;
      return null;
    });
    (window as any).electronAPI = { fetchStockApi: ipc };
  });

  afterEach(() => {
    delete (window as any).electronAPI;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fills market cap and trailing P/E from Nasdaq when details are requested', async () => {
    const { fetchStockData } = await import('./yahooFinanceApi');
    const res = await fetchStockData('HON', '1D', undefined, false, true);
    expect(res?.quote.marketCap).toBe(128e9);
    expect(res?.quote.peRatio).toBeCloseTo(200 / 10);
  });

  it('adds market cap to an already-cached quote without refetching the chart', async () => {
    const { fetchStockData } = await import('./yahooFinanceApi');
    const basic = await fetchStockData('HON', '1D', undefined, false, false);
    expect(basic?.quote.marketCap).toBeUndefined();
    expect(count('/summary')).toBe(0);

    const detailed = await fetchStockData('HON', '1D', undefined, false, true);
    expect(detailed?.quote.marketCap).toBe(128e9);
    expect(count('finance.yahoo.com')).toBe(1);
  });

  it('reuses cached fundamentals across forced refreshes and concurrent callers', async () => {
    const { fetchStockData } = await import('./yahooFinanceApi');
    await Promise.all([
      fetchStockData('HON', '1D', undefined, true, true),
      fetchStockData('HON', '1W', undefined, true, true),
    ]);
    await fetchStockData('HON', '1D', undefined, true, true);
    expect(count('/summary')).toBe(1);
    expect(count('/eps')).toBe(1);
  });

  it('moves market cap with the live price between Nasdaq lookups', async () => {
    const { fetchStockData } = await import('./yahooFinanceApi');
    await fetchStockData('HON', '1D', undefined, true, true);

    livePrice = 210;
    const res = await fetchStockData('HON', '1D', undefined, true, true);
    expect(count('/summary')).toBe(1);
    expect(res?.quote.marketCap).toBeCloseTo(640e6 * 210);
    expect(res?.quote.peRatio).toBeCloseTo(210 / 10);
  });

  it("values a custom range at its closing price, with shares derived from today's price", async () => {
    const { fetchStockData } = await import('./yahooFinanceApi');
    const res = await fetchStockData('HON', 'CUSTOM', { startDate: '2026-01-05', endDate: '2026-01-09' }, true, true);
    expect(res?.quote.regularMarketPrice).toBe(100);
    expect(res?.quote.marketCap).toBeCloseTo(640e6 * 100);
    expect(res?.quote.peRatio).toBeCloseTo(100 / 10);
  });

  it('keeps the last good values when a later Nasdaq refresh fails', async () => {
    const { fetchStockData } = await import('./yahooFinanceApi');
    vi.useFakeTimers({ toFake: ['Date'] });
    await fetchStockData('HON', '1D', undefined, true, true);

    vi.setSystemTime(Date.now() + 16 * 60 * 1000); // past the fundamentals TTL
    nasdaqUp = false;
    const res = await fetchStockData('HON', '1D', undefined, true, true);
    expect(count('/summary')).toBe(2);
    expect(res?.quote.marketCap).toBe(128e9);
    expect(res?.quote.peRatio).toBeCloseTo(20);
  });

  it('does not fall back to browser fetch or public CORS proxies when the desktop fetch fails', async () => {
    const { fetchStockData } = await import('./yahooFinanceApi');
    const browserFetch = vi.fn();
    vi.stubGlobal('fetch', browserFetch);
    ipc.mockResolvedValue(null);

    const res = await fetchStockData('HON', '1D', undefined, true, true);
    expect(res).toBeNull();
    expect(browserFetch).not.toHaveBeenCalled();
  });
});

