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
    }, 400);
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
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: `rgba(0, 0, 0, ${!isSheetVisible ? 0 : Math.max(0.2, 0.6 - dragOffsetY / 400)})`,
        backdropFilter: !isSheetVisible ? 'none' : 'blur(12px)',
        WebkitBackdropFilter: !isSheetVisible ? 'none' : 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        transition: 'background-color 0.4s ease, backdrop-filter 0.4s ease',
      }}
    >
      {/* Slide-up / Slide-down Sheet Panel */}
      <div
        ref={sheetRef}
        className="mobile-detail-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          height: '92vh',
          maxHeight: '92vh',
          backgroundColor: '#000000',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: `translateY(${translateYValue})`,
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
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
            padding: '12px 16px 8px 16px',
            backgroundColor: '#000000',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          {/* Pill Grab Handle */}
          <div
            style={{
              width: '36px',
              height: '5px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '999px',
              alignSelf: 'center',
              marginBottom: '4px',
            }}
          />

          {/* Action Bar (Close X button, Top Indices preview, Share/More buttons) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            {/* Close Button (X) */}
            <button
              aria-label="Close"
              onClick={handleDismiss}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
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
                    maxWidth: 'calc(100% - 100px)',
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
                          backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.08)',
                          border: isSelected ? '1px solid rgba(255, 255, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '4px 8px',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontWeight: isSelected ? 700 : 600 }}>{tQuote.symbol}</span>
                        <span style={{ color: shade.textColor, fontFamily: '"JetBrains Mono", monospace' }}>
                          {formatPercent(tQuote.regularMarketChangePercent)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Right Action Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                aria-label="Share"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Share2 size={16} />
              </button>
              <button
                aria-label="More"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
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
