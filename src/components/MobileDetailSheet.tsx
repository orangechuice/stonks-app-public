import React, { useState, useRef, useEffect } from 'react';
import { X, Share2, MoreHorizontal } from 'lucide-react';
import { StockQuote, ChartDataPoint, Timeframe, CustomDateRange } from '../types/stock';
import { StockDetail } from './StockDetail';
import { getColorShade, formatPercent } from '../utils/colorUtils';

interface MobileDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  quote: StockQuote | null;
  chartData: ChartDataPoint[];
  selectedTimeframe: Timeframe;
  onSelectTimeframe: (tf: Timeframe) => void;
  isLoading: boolean;
  customRange?: CustomDateRange;
  onApplyCustomRange?: (range: CustomDateRange) => void;
  indexQuotes?: StockQuote[];
  watchlist?: StockQuote[];
  onSelectSymbol?: (symbol: string) => void;
  isRateLimited?: boolean;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
}

export const MobileDetailSheet: React.FC<MobileDetailSheetProps> = ({
  isOpen,
  onClose,
  symbol,
  quote,
  chartData,
  selectedTimeframe,
  onSelectTimeframe,
  isLoading,
  customRange,
  onApplyCustomRange,
  indexQuotes = [],
  watchlist = [],
  onSelectSymbol,
  isRateLimited = false,
  onNavigatePrevious,
  onNavigateNext,
}) => {
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const touchStartYRef = useRef<number>(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Trigger entrance slide-up and lock background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIsClosing(false);
      const timer = requestAnimationFrame(() => {
        setIsMounted(true);
      });
      return () => {
        cancelAnimationFrame(timer);
        document.body.style.overflow = '';
      };
    } else {
      setIsMounted(false);
      document.body.style.overflow = '';
      setDragOffsetY(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Smooth dismiss handler (slides down before firing onClose)
  const handleDismiss = () => {
    if (isClosing) return;
    setIsClosing(true);
    setDragOffsetY(0);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setIsMounted(false);
    }, 350);
  };

  // Touch Swipe to Dismiss Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isClosing) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    touchStartYRef.current = clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || isClosing) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - touchStartYRef.current;
    if (deltaY > 0) {
      setDragOffsetY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || isClosing) return;
    setIsDragging(false);
    // Dismiss threshold (90px drag down)
    if (dragOffsetY > 90) {
      handleDismiss();
    } else {
      setDragOffsetY(0);
    }
  };

  const isSheetVisible = isMounted && !isClosing;
  const translateYValue = !isSheetVisible ? '100%' : `${dragOffsetY}px`;

  return (
    <div
      aria-label="Mobile Stock Details"
      className="mobile-detail-backdrop"
      onClick={handleDismiss}
      style={{
        backgroundColor: `rgba(0, 0, 0, ${!isSheetVisible ? 0 : Math.max(0.2, 0.65 - dragOffsetY / 400)})`,
        backdropFilter: !isSheetVisible ? 'none' : 'blur(8px)',
        WebkitBackdropFilter: !isSheetVisible ? 'none' : 'blur(8px)',
        transition: 'background-color 0.35s ease, backdrop-filter 0.35s ease',
      }}
    >
      {/* Material 3 Modal Bottom Sheet Panel */}
      <div
        ref={sheetRef}
        className="mobile-detail-sheet md-bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translateY(${translateYValue})`,
          transition: isDragging ? 'none' : 'transform 0.35s var(--md-sys-motion-easing-emphasized-decelerate)',
        }}
      >
        {/* Top Header & Swipe Handle */}
        <div
          className="mobile-sheet-header"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          style={{
            padding: '10px 16px 8px 16px',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderBottom: '1px solid var(--md-sys-color-outline-variant)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          {/* M3 Centered Pill Grab Handle */}
          <div className="mobile-sheet-drag-handle" />

          {/* Action Bar (Close X button, Top Indices preview, Share/More buttons) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            {/* Close Button (X) */}
            <button
              aria-label="Close"
              onClick={handleDismiss}
              className="md-icon-button"
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                color: 'var(--md-sys-color-on-surface)',
              }}
            >
              <X size={18} />
            </button>

            {/* Top Watchlist / Indices Ticker Bar */}
            {(() => {
              const tickerList = watchlist.length > 0 ? watchlist : indexQuotes;
              if (tickerList.length === 0) return null;
              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    overflowX: 'auto',
                    padding: '2px 4px',
                    maxWidth: 'calc(100% - 104px)',
                  }}
                  className="no-scrollbar"
                >
                  {tickerList.map((tQuote) => {
                    const shade = getColorShade(tQuote.regularMarketChangePercent);
                    const isSelected = tQuote.symbol.toUpperCase() === symbol.toUpperCase();
                    return (
                      <button
                        key={tQuote.symbol}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectSymbol) onSelectSymbol(tQuote.symbol);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          backgroundColor: isSelected ? 'var(--md-sys-color-secondary-container)' : 'var(--md-sys-color-surface-container-high)',
                          border: isSelected ? '1px solid rgba(127, 207, 255, 0.4)' : '1px solid var(--md-sys-color-outline-variant)',
                          borderRadius: 'var(--md-sys-shape-full)',
                          padding: '4px 10px',
                          color: isSelected ? 'var(--md-sys-color-on-secondary-container)' : 'var(--md-sys-color-on-surface)',
                          cursor: 'pointer',
                          transition: 'all var(--md-sys-motion-duration-short) ease',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontWeight: isSelected ? 700 : 600 }}>{tQuote.symbol}</span>
                        <span style={{ color: shade.textColor, fontFamily: 'var(--md-sys-typescale-font-mono)' }}>
                          {formatPercent(tQuote.regularMarketChangePercent)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Right Action Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                aria-label="Share"
                className="md-icon-button"
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  color: 'var(--md-sys-color-on-surface)',
                }}
              >
                <Share2 size={16} />
              </button>
              <button
                aria-label="More"
                className="md-icon-button"
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  color: 'var(--md-sys-color-on-surface)',
                }}
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Sheet Content Body (Stock Detail) */}
        <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
          <StockDetail
            symbol={symbol}
            quote={quote}
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
      </div>
    </div>
  );
};

export default MobileDetailSheet;
