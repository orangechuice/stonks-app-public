import React from 'react';
import { StockQuote, ChartDataPoint, Timeframe, CustomDateRange } from '../types/stock';
import { getColorShade, formatCurrency, formatCompactNumber, formatNumber, formatPercent } from '../utils/colorUtils';
import { StockChart } from './StockChart';
import { AlertTriangle } from 'lucide-react';

interface StockDetailProps {
  symbol: string;
  quote: StockQuote | null;
  chartData: ChartDataPoint[];
  selectedTimeframe: Timeframe;
  onSelectTimeframe: (tf: Timeframe) => void;
  isLoading: boolean;
  customRange?: CustomDateRange;
  onApplyCustomRange?: (range: CustomDateRange) => void;
  isRateLimited?: boolean;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
}

const getTimeframeLabel = (tf: Timeframe): string => {
  switch (tf) {
    case '1D': return 'Today';
    case '1W': return 'Past Week';
    case '1M': return 'Past Month';
    case '3M': return 'Past 3 Months';
    case '6M': return 'Past 6 Months';
    case 'YTD': return 'Year to Date';
    case '1Y': return 'Past Year';
    case '5Y': return 'Past 5 Years';
    case 'ALL': return 'All Time';
    case 'CUSTOM': return 'Custom Range';
    default: return '';
  }
};

export const StockDetail: React.FC<StockDetailProps> = ({
  symbol,
  quote,
  chartData,
  selectedTimeframe,
  onSelectTimeframe,
  isLoading,
  customRange,
  onApplyCustomRange,
  isRateLimited = false,
  onNavigatePrevious,
  onNavigateNext,
}) => {
  const [dragTranslateX, setDragTranslateX] = React.useState<number>(0);
  const [isSwipingActive, setIsSwipingActive] = React.useState<boolean>(false);
  const [slideAnimClass, setSlideAnimClass] = React.useState<string>('');
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingRef = React.useRef<boolean>(false);
  const swipeDirectionRef = React.useRef<'next' | 'prev' | null>(null);
  const currentSymbolRef = React.useRef<string>(symbol || '');

  // When symbol updates after a swipe navigation, trigger slide-in animation for the entire StockDetail UI
  React.useEffect(() => {
    if (symbol && symbol !== currentSymbolRef.current) {
      currentSymbolRef.current = symbol;
      if (swipeDirectionRef.current === 'next') {
        setSlideAnimClass('detail-slide-in-right');
      } else if (swipeDirectionRef.current === 'prev') {
        setSlideAnimClass('detail-slide-in-left');
      }
      swipeDirectionRef.current = null;
      setDragTranslateX(0);
      setIsSwipingActive(false);
    }
  }, [symbol]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
      isSwipingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length === 0) return;
    const t = e.touches[0];
    const deltaX = t.clientX - touchStartRef.current.x;
    const deltaY = t.clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
      isSwipingRef.current = true;
      setIsSwipingActive(true);
      setDragTranslateX(deltaX);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const deltaX = t.clientX - touchStartRef.current.x;
      const deltaY = t.clientY - touchStartRef.current.y;
      const duration = Date.now() - touchStartRef.current.time;

      if (duration < 800 && Math.abs(deltaX) >= 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
        if (deltaX < 0 && onNavigateNext) {
          swipeDirectionRef.current = 'next';
          setDragTranslateX(-120);
          setTimeout(() => {
            onNavigateNext();
          }, 50);
        } else if (deltaX > 0 && onNavigatePrevious) {
          swipeDirectionRef.current = 'prev';
          setDragTranslateX(120);
          setTimeout(() => {
            onNavigatePrevious();
          }, 50);
        } else {
          setDragTranslateX(0);
        }
      } else {
        setDragTranslateX(0);
      }
    } else {
      setDragTranslateX(0);
    }
    touchStartRef.current = null;
    isSwipingRef.current = false;
    setIsSwipingActive(false);
  };

  const isMatchingQuote = quote && quote.symbol.toUpperCase() === symbol.toUpperCase();
  const effectiveQuote = isMatchingQuote ? quote : null;

  const shade = effectiveQuote ? getColorShade(effectiveQuote.regularMarketChangePercent) : {
    bgColor: 'rgba(255, 255, 255, 0.08)',
    textColor: 'rgba(255, 255, 255, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    glowColor: 'transparent',
  };

  const displaySymbol = symbol.toUpperCase();
  const displayShortName = effectiveQuote?.shortName || effectiveQuote?.longName || '';

  // Determine Extended Hours (After Hours / Pre-Market) values
  let extPrice: number | undefined;
  let extChangePercent: number | undefined;
  let extLabel = '';

  if (effectiveQuote?.postMarketPrice && (effectiveQuote.marketState === 'POST' || effectiveQuote.marketState === 'CLOSED' || effectiveQuote.marketState === 'POSTPOST' || !effectiveQuote.marketState)) {
    extPrice = effectiveQuote.postMarketPrice;
    extChangePercent = effectiveQuote.postMarketChangePercent ?? 0;
    extLabel = 'After Hours';
  } else if (effectiveQuote?.preMarketPrice && effectiveQuote.marketState === 'PRE') {
    extPrice = effectiveQuote.preMarketPrice;
    extChangePercent = effectiveQuote.preMarketChangePercent ?? 0;
    extLabel = 'Pre-Market';
  }

  const extShade = extChangePercent != null ? getColorShade(extChangePercent) : null;

  return (
    <main
      style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: '#121214',
        padding: '24px 32px',
        color: '#FFF',
        userSelect: 'none',
        zIndex: 10,
        touchAction: 'pan-y',
      }}
      className="stock-detail-container custom-scrollbar"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Whole UI Animated Swipe Wrapper */}
      <div
        className={slideAnimClass}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          transform: `translateX(${dragTranslateX}px)`,
          transition: isSwipingActive ? 'none' : 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease-out',
          opacity: Math.abs(dragTranslateX) > 0 ? Math.max(0.35, 1 - Math.abs(dragTranslateX) / 350) : 1,
        }}
        onAnimationEnd={() => setSlideAnimClass('')}
      >
        {/* Header Section (Apple Stocks Inspired Layout) */}
        <div style={{ marginBottom: '24px' }}>
        {/* Ticker Symbol & Full Company Name */}
        <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px 12px', marginBottom: '6px' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: '#FFF', margin: 0, lineHeight: 1.1 }}>
            {displaySymbol}
          </h1>
          {displayShortName && (
            <span style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255, 255, 255, 0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {displayShortName}
            </span>
          )}
        </div>

        {/* Dual Price & Badge Display */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px 20px', marginTop: '4px', marginBottom: '4px' }}>
          {/* Regular Market Price */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: 26, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: '#FFF' }}>
              {effectiveQuote ? formatCurrency(effectiveQuote.regularMarketPrice, effectiveQuote.currency) : '--'}
            </span>
            {effectiveQuote && (
              <div
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: '"JetBrains Mono", monospace',
                  backgroundColor: shade.bgColor,
                  color: shade.textColor,
                  border: `1px solid ${shade.borderColor}`,
                  boxShadow: shade.glowColor !== 'transparent' ? `0 0 12px ${shade.glowColor}` : 'none',
                }}
              >
                {formatPercent(effectiveQuote.regularMarketChangePercent)}
              </div>
            )}
          </div>

          {/* After Hours / Pre-Market Price & Badge */}
          {extPrice != null && extShade && extChangePercent != null && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
              paddingLeft: '14px',
            }}>
              <span style={{ fontSize: 20, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255, 255, 255, 0.85)' }}>
                {formatCurrency(extPrice, effectiveQuote?.currency)}
              </span>
              <div
                style={{
                  padding: '3px 6px',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: '"JetBrains Mono", monospace',
                  backgroundColor: extShade.bgColor,
                  color: extShade.textColor,
                  border: `1px solid ${extShade.borderColor}`,
                }}
              >
                {formatPercent(extChangePercent)}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)' }}>
                {extLabel}
              </span>
            </div>
          )}
        </div>

        {/* Timeframe Subtitle */}
        <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
          {getTimeframeLabel(selectedTimeframe)}
        </div>

        {/* Exchange, Currency, Market Status Indicator */}
        <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', marginTop: '3px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span>{effectiveQuote?.exchangeName || 'US Market'}</span>
          <span>·</span>
          <span>{effectiveQuote?.currency || 'USD'}</span>
          <span>·</span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: effectiveQuote?.marketState === 'REGULAR' ? '#30D158' : 'rgba(255, 255, 255, 0.4)',
            fontWeight: 600,
          }}>
            {effectiveQuote?.marketState === 'REGULAR' && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#30D158', display: 'inline-block' }} />
            )}
            {effectiveQuote?.marketState === 'REGULAR' ? 'Live' : 'At Close'}
          </span>
          <span>·</span>
          <span style={{ textTransform: 'capitalize' }}>
            {effectiveQuote?.marketState ? (effectiveQuote.marketState === 'REGULAR' ? 'Open' : effectiveQuote.marketState.toLowerCase()) : 'Offline'}
          </span>
        </div>
      </div>

      {/* Main Stock Chart Section */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
      }}>
        <StockChart
          quote={effectiveQuote}
          chartData={chartData}
          selectedTimeframe={selectedTimeframe}
          onSelectTimeframe={onSelectTimeframe}
          isLoading={isLoading}
          customRange={customRange}
          onApplyCustomRange={onApplyCustomRange}
          isRateLimited={isRateLimited}
          onNavigatePrevious={onNavigatePrevious}
          onNavigateNext={onNavigateNext}
        />
      </div>

      {/* Key Statistics Multi-Column Horizontally Scrollable Section */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: '20px 24px',
      }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          Key Statistics
        </h3>

        <div
          className="no-scrollbar"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '32px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: '4px',
          }}
        >
          {/* Column 1: Open, High, Low */}
          <div style={{ flex: '0 0 auto', minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', gap: '16px' }}>
              <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>Open</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: '#FFF' }}>
                {effectiveQuote ? formatCurrency(effectiveQuote.regularMarketOpen) : '--'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', gap: '16px' }}>
              <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>High</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: '#FFF' }}>
                {effectiveQuote ? formatCurrency(effectiveQuote.regularMarketDayHigh) : '--'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', gap: '16px' }}>
              <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>Low</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: '#FFF' }}>
                {effectiveQuote ? formatCurrency(effectiveQuote.regularMarketDayLow) : '--'}
              </span>
            </div>
          </div>

          {/* Column 2: Volume, P/E Ratio, Market Cap */}
          <div style={{ flex: '0 0 auto', minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', gap: '16px' }}>
              <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>Vol</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: '#FFF' }}>
                {effectiveQuote ? formatCompactNumber(effectiveQuote.regularMarketVolume) : '--'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', gap: '16px' }}>
              <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>P/E</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: '#FFF' }}>
                {effectiveQuote?.peRatio ? formatNumber(effectiveQuote.peRatio, 2) : '--'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', gap: '16px' }}>
              <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>Mkt Cap</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: '#FFF' }}>
                {effectiveQuote ? formatCompactNumber(effectiveQuote.marketCap) : '--'}
              </span>
            </div>
          </div>

          {/* Column 3: 52W High, 52W Low, Previous Close */}
          <div style={{ flex: '0 0 auto', minWidth: '145px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', gap: '16px' }}>
              <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>52W H</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: '#FFF' }}>
                {effectiveQuote ? formatCurrency(effectiveQuote.fiftyTwoWeekHigh) : '--'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', gap: '16px' }}>
              <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>52W L</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: '#FFF' }}>
                {effectiveQuote ? formatCurrency(effectiveQuote.fiftyTwoWeekLow) : '--'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', gap: '16px' }}>
              <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>Prev Close</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: '#FFF' }}>
                {effectiveQuote ? formatCurrency(effectiveQuote.previousClose) : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </main>
  );
};

