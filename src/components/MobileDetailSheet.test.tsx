import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MobileDetailSheet } from './MobileDetailSheet';
import { StockQuote } from '../types/stock';

const mockQuote: StockQuote = {
  symbol: 'GOOGL',
  shortName: 'Alphabet Inc.',
  exchangeName: 'NASDAQ',
  currency: 'USD',
  regularMarketPrice: 175.5,
  regularMarketChange: 2.5,
  regularMarketChangePercent: 1.45,
  previousClose: 173.0,
  regularMarketOpen: 173.5,
  regularMarketDayHigh: 176.0,
  regularMarketDayLow: 173.0,
  regularMarketVolume: 15000000,
  fiftyTwoWeekHigh: 190.0,
  fiftyTwoWeekLow: 120.0,
  sparkline: [173, 175.5],
  marketState: 'REGULAR',
};

describe('MobileDetailSheet Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    symbol: 'GOOGL',
    quote: mockQuote,
    chartData: [],
    selectedTimeframe: '1D' as const,
    onSelectTimeframe: vi.fn(),
    isLoading: false,
  };

  it('renders correctly when isOpen is true', () => {
    render(<MobileDetailSheet {...defaultProps} />);
    expect(screen.getByText('GOOGL')).toBeInTheDocument();
    expect(screen.getByText('Alphabet Inc.')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<MobileDetailSheet {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onClose when close button (X) is clicked', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<MobileDetailSheet {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
