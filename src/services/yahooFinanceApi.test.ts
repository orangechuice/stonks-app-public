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

