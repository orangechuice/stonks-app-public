import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { StockQuote } from '../types/stock';

const createMockStock = (marketState: 'REGULAR' | 'CLOSED' | 'PRE' | 'POST'): StockQuote => ({
  symbol: '^GSPC',
  shortName: 'S&P 500',
  longName: 'S&P 500 Index',
  exchangeName: 'SNP',
  currency: 'USD',
  regularMarketPrice: 5000,
  regularMarketChange: 10,
  regularMarketChangePercent: 0.2,
  previousClose: 4990,
  regularMarketOpen: 4995,
  regularMarketDayHigh: 5010,
  regularMarketDayLow: 4985,
  regularMarketVolume: 1000000,
  fiftyTwoWeekHigh: 5200,
  fiftyTwoWeekLow: 4200,
  sparkline: [4990, 5000],
  marketState,
});

describe('Sidebar UI Market Hours Attributes', () => {
  const defaultProps = {
    selectedSymbol: '^GSPC',
    onSelectSymbol: vi.fn(),
    onAddTicker: vi.fn(),
    onRemoveTicker: vi.fn(),
    onReorderWatchlist: vi.fn(),
    badgeDisplayMode: 'percent' as const,
    onToggleBadgeDisplayMode: vi.fn(),
    isSearchOpen: false,
    setIsSearchOpen: vi.fn(),
    selectedTimeframe: '1D' as const,
  };

  it('renders "Market Open" when active stock marketState is REGULAR', () => {
    const watchlist = [createMockStock('REGULAR')];
    render(<Sidebar {...defaultProps} watchlist={watchlist} />);
    expect(screen.getByText('Market Open')).toBeInTheDocument();
  });

  it('renders "Market Closed" when active stock marketState is CLOSED', () => {
    const watchlist = [createMockStock('CLOSED')];
    render(<Sidebar {...defaultProps} watchlist={watchlist} />);
    expect(screen.getByText('Market Closed')).toBeInTheDocument();
  });

  it('renders "Pre-Market" when active stock marketState is PRE', () => {
    const watchlist = [createMockStock('PRE')];
    render(<Sidebar {...defaultProps} watchlist={watchlist} />);
    expect(screen.getByText('Pre-Market')).toBeInTheDocument();
  });

  it('renders "After Hours" when active stock marketState is POST', () => {
    const watchlist = [createMockStock('POST')];
    render(<Sidebar {...defaultProps} watchlist={watchlist} />);
    expect(screen.getByText('After Hours')).toBeInTheDocument();
  });
});
