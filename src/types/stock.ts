export type Timeframe = '1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL' | 'CUSTOM';
export type BadgeDisplayMode = 'percent' | 'priceChange' | 'marketCap';

export interface CustomDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface ChartDataPoint {
  timestamp: number;
  dateStr: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  isExtendedHours?: boolean;
  session?: 'pre' | 'regular' | 'post';
}

export interface StockQuote {
  symbol: string;
  shortName: string;
  longName?: string;
  exchangeName?: string;
  currency?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  previousClose: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap?: number;
  peRatio?: number;
  avgVolume?: number;
  sparkline: number[];
  marketState?: 'REGULAR' | 'CLOSED' | 'PRE' | 'POST' | 'POSTPOST' | 'OFFLINE';
  isOffline?: boolean;
  isRateLimited?: boolean;
  postMarketPrice?: number;
  postMarketChange?: number;
  postMarketChangePercent?: number;
  preMarketPrice?: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
  hasPrePostData?: boolean;
}

export interface SearchResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
  typeDisp?: string;
}

export interface ColorShade {
  bgColor: string;
  textColor: string;
  borderColor: string;
  strokeColor: string;
  fillGradientStart: string;
  fillGradientEnd: string;
  glowColor: string;
  intensity: number;
  isPositive: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      fetchStockApi?: (url: string) => Promise<any>;
      getSettings: () => Promise<{ watchlist?: string[]; badgeDisplayMode?: BadgeDisplayMode }>;
      saveSettings: (settings: { watchlist?: string[]; badgeDisplayMode?: BadgeDisplayMode }) => Promise<boolean>;
      closeWindow: () => void;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
    };
  }
}
