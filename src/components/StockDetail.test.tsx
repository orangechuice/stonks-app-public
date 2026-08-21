import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StockDetail } from './StockDetail';
import { StockQuote } from '../types/stock';

const createMockQuote = (marketState: 'REGULAR' | 'CLOSED' | 'PRE' | 'POST'): StockQuote => ({
  symbol: '^GSPC',
  shortName: 'S&P 500',
  longName: 'S&P 500 Index',
  exchangeName: 'SNP',
  currency: 'USD',
  regularMarketPrice: 7384.66,
  regularMarketChange: 68.74,
  regularMarketChangePercent: 0.94,
  previousClose: 7315.92,
  regularMarketOpen: 7320.00,
  regularMarketDayHigh: 7400.00,
  regularMarketDayLow: 7310.00,
  regularMarketVolume: 2000000,
  fiftyTwoWeekHigh: 7600.00,
  fiftyTwoWeekLow: 6000.00,
  sparkline: [7315.92, 7384.66],
  marketState,
});

describe('StockDetail UI Market State Attributes', () => {
  const defaultProps = {
    symbol: '^GSPC',
    chartData: [],
    selectedTimeframe: '1D' as const,
    onSelectTimeframe: vi.fn(),
    isLoading: false,
  };

  it('renders "Live" status badge and "Open" state when market is REGULAR', () => {
    const quote = createMockQuote('REGULAR');
    render(<StockDetail {...defaultProps} quote={quote} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
  });

  it('renders "At Close" status badge and "closed" state when market is CLOSED', () => {
    const quote = createMockQuote('CLOSED');
    render(<StockDetail {...defaultProps} quote={quote} />);
    expect(screen.getByText('At Close')).toBeInTheDocument();
    expect(screen.getByText('closed')).toBeInTheDocument();
  });

  it('renders timeframe subtitle and key statistics correctly', () => {
    const quote = createMockQuote('REGULAR');
    render(<StockDetail {...defaultProps} quote={quote} selectedTimeframe="5Y" />);
    expect(screen.getByText('Past 5 Years')).toBeInTheDocument();
    expect(screen.getByText('Vol')).toBeInTheDocument();
    expect(screen.getByText('52W H')).toBeInTheDocument();
    expect(screen.getByText('52W L')).toBeInTheDocument();
    expect(screen.getByText('Prev Close')).toBeInTheDocument();
  });

  it('triggers onNavigateNext and onNavigatePrevious on horizontal swipe gestures', () => {
    vi.useFakeTimers();
    const onNavigateNext = vi.fn();
    const onNavigatePrevious = vi.fn();
    const mockChartData = [
      { timestamp: 1000, dateStr: '10:00 AM', close: 100 },
      { timestamp: 2000, dateStr: '11:00 AM', close: 105 },
    ];

    const { container } = render(
      <StockDetail
        {...defaultProps}
        chartData={mockChartData}
        quote={createMockQuote('REGULAR')}
        onNavigateNext={onNavigateNext}
        onNavigatePrevious={onNavigatePrevious}
      />
    );

    const detailContainer = container.querySelector('.stock-detail-container') || container.querySelector('main');
    expect(detailContainer).toBeInTheDocument();

    if (detailContainer) {
      // Simulate swipe left (deltaX = -70 -> Next Ticker)
      const now = 1000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);
      fireEvent.touchStart(detailContainer, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      vi.spyOn(Date, 'now').mockReturnValue(now + 100);
      fireEvent.touchMove(detailContainer, {
        touches: [{ clientX: 130, clientY: 102 }],
      });
      fireEvent.touchEnd(detailContainer, {
        changedTouches: [{ clientX: 130, clientY: 102 }],
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onNavigateNext).toHaveBeenCalledTimes(1);

      // Simulate swipe right (deltaX = +70 -> Previous Ticker)
      vi.spyOn(Date, 'now').mockReturnValue(now + 200);
      fireEvent.touchStart(detailContainer, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      vi.spyOn(Date, 'now').mockReturnValue(now + 300);
      fireEvent.touchMove(detailContainer, {
        touches: [{ clientX: 170, clientY: 101 }],
      });
      fireEvent.touchEnd(detailContainer, {
        changedTouches: [{ clientX: 170, clientY: 101 }],
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onNavigatePrevious).toHaveBeenCalledTimes(1);
    }
    vi.useRealTimers();
  });
});

