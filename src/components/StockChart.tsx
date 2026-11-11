import React, { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { ChartDataPoint, Timeframe, StockQuote, CustomDateRange } from '../types/stock';
import { getColorShade, formatCurrency } from '../utils/colorUtils';
import { DateRangePickerModal } from './DateRangePickerModal';
import { Calendar, AlertTriangle } from 'lucide-react';

interface StockChartProps {
  quote?: StockQuote | null;
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

function formatYAxisPrice(price: number, yRange: number): string {
  if (yRange >= 5 || price >= 100) {
    return Math.round(price).toLocaleString();
  }
  if (yRange >= 1) {
    const rounded = Number(price.toFixed(1));
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  }
  if (yRange >= 0.1) {
    return price.toFixed(2);
  }
  return price.toFixed(3);
}

function formatXAxisLabel(point: ChartDataPoint, timeframe: Timeframe, customRange?: CustomDateRange): string {
  if (!point || !point.timestamp) return point?.dateStr || '';
  const d = new Date(point.timestamp * 1000);

  switch (timeframe) {
    case '1D': {
      return d.toLocaleTimeString([], { hour: 'numeric' });
    }
    case '1W': {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    case '1M':
    case '3M': {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    case '6M':
    case 'YTD':
    case '1Y': {
      return d.toLocaleDateString([], { month: 'short' });
    }
    case '5Y':
    case 'ALL': {
      return d.toLocaleDateString([], { year: 'numeric' });
    }
    case 'CUSTOM': {
      if (customRange?.startDate && customRange?.endDate) {
        const start = new Date(customRange.startDate).getTime();
        const end = new Date(customRange.endDate).getTime();
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);
        if (diffDays <= 1) {
          return d.toLocaleTimeString([], { hour: 'numeric' });
        }
        if (diffDays <= 14) {
          return d.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
        }
        if (diffDays <= 180) {
          return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
        if (diffDays <= 730) {
          return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
        }
        return d.toLocaleDateString([], { year: 'numeric' });
      }
      return point.dateStr;
    }
    default:
      return point.dateStr;
  }
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL', 'CUSTOM'];

export const StockChart: React.FC<StockChartProps> = ({
  quote,
  chartData,
  selectedTimeframe,
  onSelectTimeframe,
  isLoading,
  customRange = {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
  onApplyCustomRange,
  isRateLimited = false,
  onNavigatePrevious,
  onNavigateNext,
}) => {
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number; data: ChartDataPoint } | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  // ResizeObserver to dynamically scale SVG chart width to 100% of container
  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect.width > 0) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleTimeframeClick = (tf: Timeframe) => {
    onSelectTimeframe(tf);
    if (tf === 'CUSTOM') {
      setIsDatePickerOpen(true);
    }
  };

  const handleApplyRange = (range: CustomDateRange) => {
    if (onApplyCustomRange) {
      onApplyCustomRange(range);
    }
  };

  const formatCustomBadgeLabel = () => {
    if (!customRange.startDate || !customRange.endDate) return 'Custom';
    const s = new Date(customRange.startDate + 'T00:00:00');
    const e = new Date(customRange.endDate + 'T00:00:00');
    const sStr = s.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
    const eStr = e.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
    if (customRange.startDate === customRange.endDate) {
      return `${sStr} (1 Day)`;
    }
    return `${sStr} – ${eStr}`;
  };

  // Render Material 3 Filter Chips Timeframe Selector Bar
  const renderTimeframeBar = () => (
    <div
      className="no-scrollbar"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '2px 0 12px 0',
        marginBottom: selectedTimeframe === 'CUSTOM' ? 12 : 16,
        userSelect: 'none',
      }}
    >
      {TIMEFRAMES.map((tf) => {
        const isSelected = selectedTimeframe === tf;
        return (
          <button
            key={tf}
            onClick={() => handleTimeframeClick(tf)}
            className={`md-filter-chip ${isSelected ? 'selected' : ''}`}
          >
            {tf === 'CUSTOM' ? (
              <>
                <Calendar size={13} />
                <span>CUSTOM</span>
              </>
            ) : (
              tf
            )}
          </button>
        );
      })}
    </div>
  );

  if (!chartData || chartData.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Timeframe Control Bar */}
        {renderTimeframeBar()}

        {/* Date Picker Modal */}
        <DateRangePickerModal
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          currentRange={customRange}
          onApplyRange={handleApplyRange}
        />

        {isLoading ? (
          <div
            style={{
              width: '100%',
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              borderRadius: 'var(--md-sys-shape-large)',
              backgroundColor: 'var(--md-sys-color-surface-container-low)',
              border: '1px solid var(--md-sys-color-outline-variant)',
            }}
          >
            {[0.2, 0.4, 0.6, 0.8].map((pct) => (
              <div
                key={`skeleton-line-${pct}`}
                style={{
                  position: 'absolute',
                  top: `${pct * 100}%`,
                  left: 0,
                  right: 0,
                  height: 1,
                  borderTop: '1px dashed var(--md-sys-color-outline-variant)',
                }}
              />
            ))}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: 'var(--md-sys-color-on-surface-variant)',
                fontSize: 13,
                fontWeight: 500,
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: '2.5px solid var(--md-sys-color-outline-variant)',
                  borderTopColor: 'var(--md-sys-color-primary)',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span>Loading chart data...</span>
            </div>
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: 300,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            {isRateLimited ||
            quote?.isRateLimited ||
            (!window.electronAPI && !Capacitor.isNativePlatform() && (quote?.isOffline || quote?.marketState === 'OFFLINE' || !quote)) ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  maxWidth: 440,
                  padding: '24px',
                  borderRadius: 'var(--md-sys-shape-large)',
                  backgroundColor: 'var(--md-sys-color-warning-container)',
                  border: '1px solid rgba(255, 186, 40, 0.3)',
                  color: 'var(--md-sys-color-on-warning-container)',
                  boxShadow: 'var(--md-sys-elevation-2)',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--md-sys-shape-full)',
                    backgroundColor: 'rgba(255, 186, 40, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <AlertTriangle size={24} />
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    marginBottom: 6,
                  }}
                >
                  Rate Limit Exceeded (HTTP 429)
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    opacity: 0.9,
                    lineHeight: 1.5,
                    marginBottom: 8,
                  }}
                >
                  Public CORS proxies for web mode are temporarily throttling requests due to high traffic.
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    opacity: 0.75,
                    lineHeight: 1.4,
                  }}
                >
                  Please wait a few seconds for automatic recovery, or use the standalone desktop app for direct access.
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--md-sys-color-on-surface-variant)',
                    letterSpacing: '-0.01em',
                    marginBottom: 6,
                  }}
                >
                  Chart Unavailable
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--md-sys-color-outline)',
                  }}
                >
                  Stocks isn’t connected to the internet or no market data found for date range.
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Compute performance percentage for current chart range
  const firstPrice = chartData[0]?.close || quote?.previousClose || quote?.regularMarketPrice || 0;
  const currentHoverPrice = hoverPoint ? hoverPoint.data.close : (quote?.regularMarketPrice || firstPrice);
  const periodChange = currentHoverPrice - firstPrice;
  const periodChangePercent = firstPrice !== 0 ? (periodChange / firstPrice) * 100 : 0;
  
  const shade = getColorShade(periodChangePercent);

  // Calculate Min / Max Bounds for SVG scaling
  const prices = chartData.map((d) => d.close);
  const minPrice = Math.min(...prices, quote?.previousClose ?? Infinity);
  const maxPrice = Math.max(...prices, quote?.previousClose ?? -Infinity);
  const priceMargin = (maxPrice - minPrice) * 0.08 || 1.0;
  const yMin = Math.max(0, minPrice - priceMargin);
  const yMax = maxPrice + priceMargin;
  const yRange = yMax - yMin || 1;

  // Responsive SVG Canvas dimensions
  const svgWidth = Math.max(320, containerWidth);
  const svgHeight = 360;
  const paddingRight = 44;
  const paddingBottom = 30;
  const paddingTop = 20;

  const chartW = svgWidth - paddingRight;
  const chartH = svgHeight - paddingBottom - paddingTop;

  // Build SVG Path strings dynamically stretching to 100% width
  const points = chartData.map((d, i) => {
    const x = (i / (chartData.length - 1 || 1)) * chartW;
    const y = paddingTop + chartH - ((d.close - yMin) / yRange) * chartH;
    return { x, y, data: d };
  });

  const fullPathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${fullPathD} L ${chartW} ${paddingTop + chartH} L 0 ${paddingTop + chartH} Z`;

  // Extended hours segmentation for 1D timeframe
  const is1DWithExtended = selectedTimeframe === '1D' && chartData.some((d) => d.isExtendedHours);

  // Group points by session
  const prePoints: typeof points = [];
  const regPoints: typeof points = [];
  const postPoints: typeof points = [];

  points.forEach((p) => {
    if (p.data.session === 'pre') prePoints.push(p);
    else if (p.data.session === 'post') postPoints.push(p);
    else regPoints.push(p);
  });

  // Ensure continuous line connection between sessions
  const preLinePoints = prePoints.length > 0
    ? [...prePoints, ...(regPoints.length > 0 ? [regPoints[0]] : [])]
    : [];
  const regLinePoints = regPoints;
  const postLinePoints = postPoints.length > 0
    ? [...(regPoints.length > 0 ? [regPoints[regPoints.length - 1]] : []), ...postPoints]
    : [];

  const prePathD = preLinePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const regPathD = regLinePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const postPathD = postLinePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // Market Open (9:30 AM) and Market Close (4:00 PM) X positions
  const marketOpenX = regPoints.length > 0 ? regPoints[0].x : null;
  const marketCloseX = regPoints.length > 0 ? regPoints[regPoints.length - 1].x : null;

  // Previous Close Dashed Reference Y-coordinate
  const prevCloseY = quote?.previousClose ? paddingTop + chartH - ((quote.previousClose - yMin) / yRange) * chartH : -999;

  const updateHoverPointFromClientX = (clientX: number, rect: DOMRect) => {
    if (!containerRef.current || points.length === 0) return;
    const mouseX = clientX - rect.left;
    const normalizedX = (mouseX / rect.width) * svgWidth;

    let closest = points[0];
    let minDistance = Infinity;
    for (const pt of points) {
      const dist = Math.abs(pt.x - normalizedX);
      if (dist < minDistance) {
        minDistance = dist;
        closest = pt;
      }
    }
    setHoverPoint(closest);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    updateHoverPointFromClientX(e.clientX, e.currentTarget.getBoundingClientRect());
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      updateHoverPointFromClientX(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      updateHoverPointFromClientX(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }} ref={containerRef}>
      {/* Material 3 Segmented Filter Chips */}
      {renderTimeframeBar()}

      {/* Custom Date Range Active Info Bar */}
      {selectedTimeframe === 'CUSTOM' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            padding: '10px 16px',
            borderRadius: 'var(--md-sys-shape-medium)',
            backgroundColor: 'var(--md-sys-color-secondary-container)',
            border: '1px solid rgba(127, 207, 255, 0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--md-sys-color-on-secondary-container)',
            }}
          >
            <Calendar size={16} />
            <span>Range: {formatCustomBadgeLabel()}</span>
          </div>
          <button
            onClick={() => setIsDatePickerOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--md-sys-color-primary)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Change Dates
          </button>
        </div>
      )}

      {/* Date Range Picker Modal */}
      <DateRangePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        currentRange={customRange}
        onApplyRange={handleApplyRange}
      />

      {/* SVG Interactive Dynamic Chart */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 360,
          touchAction: 'pan-y',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <svg
          style={{ width: '100%', height: '100%', cursor: 'crosshair', overflow: 'visible', touchAction: 'pan-y' }}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverPoint(null)}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={shade.fillGradientStart} />
              <stop offset="100%" stopColor={shade.fillGradientEnd} />
            </linearGradient>
          </defs>

          {/* Grid lines (M3 subtle outline variant) */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const yVal = paddingTop + chartH * pct;
            return (
              <line
                key={idx}
                x1="0"
                y1={yVal}
                x2={chartW}
                y2={yVal}
                stroke="var(--md-sys-color-outline-variant)"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Vertical Market Session Boundaries (Market Open 9:30 AM & Market Close 4:00 PM) */}
          {is1DWithExtended && (
            <>
              {marketOpenX != null && prePoints.length > 0 && (
                <line
                  x1={marketOpenX}
                  y1={paddingTop}
                  x2={marketOpenX}
                  y2={paddingTop + chartH}
                  stroke="var(--md-sys-color-outline-variant)"
                  strokeDasharray="2 2"
                />
              )}
              {marketCloseX != null && postPoints.length > 0 && (
                <line
                  x1={marketCloseX}
                  y1={paddingTop}
                  x2={marketCloseX}
                  y2={paddingTop + chartH}
                  stroke="var(--md-sys-color-outline-variant)"
                  strokeDasharray="2 2"
                />
              )}
            </>
          )}

          {/* Previous Close Reference Line */}
          {prevCloseY >= paddingTop && prevCloseY <= paddingTop + chartH && (
            <line
              x1="0"
              y1={prevCloseY}
              x2={chartW}
              y2={prevCloseY}
              stroke="var(--md-sys-color-outline)"
              strokeDasharray="3 3"
              opacity="0.6"
            />
          )}

          {/* Chart Fill Area */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Chart Stroke Lines */}
          {is1DWithExtended ? (
            <>
              {/* Pre-Market Segment (Dashed) */}
              {prePathD && (
                <path
                  d={prePathD}
                  fill="none"
                  stroke={shade.strokeColor}
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  opacity="0.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Regular Market Hours Segment (Solid) */}
              {regPathD && (
                <path
                  d={regPathD}
                  fill="none"
                  stroke={shade.strokeColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Post-Market / After Hours Segment (Dashed) */}
              {postPathD && (
                <path
                  d={postPathD}
                  fill="none"
                  stroke={shade.strokeColor}
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  opacity="0.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </>
          ) : (
            /* Single Solid Line for non-extended charts */
            <path
              d={fullPathD}
              fill="none"
              stroke={shade.strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover Crosshair & Data Indicator */}
          {hoverPoint && (
            <g>
              <line
                x1={hoverPoint.x}
                y1={paddingTop}
                x2={hoverPoint.x}
                y2={paddingTop + chartH}
                stroke="var(--md-sys-color-outline)"
                strokeDasharray="3 3"
              />
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r="5"
                fill={shade.strokeColor}
                stroke="var(--md-sys-color-surface-container)"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Y Axis Price Labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const yVal = paddingTop + chartH * pct;
          const priceVal = yMax - pct * yRange;
          return (
            <div
              key={`y-label-${idx}`}
              style={{
                position: 'absolute',
                top: yVal,
                right: 0,
                transform: 'translateY(-50%)',
                color: 'var(--md-sys-color-on-surface-variant)',
                fontSize: 11,
                fontFamily: 'var(--md-sys-typescale-font-mono)',
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                textAlign: 'right',
                opacity: 0.85,
              }}
            >
              {formatYAxisPrice(priceVal, yRange)}
            </div>
          );
        })}

        {/* X Axis Time Labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const ptIdx = Math.floor(pct * (chartData.length - 1));
          const pt = chartData[ptIdx];
          if (!pt) return null;
          const leftPct = ((pct * chartW) / svgWidth) * 100;
          const transform = idx === 0 ? 'none' : idx === 4 ? 'translateX(-100%)' : 'translateX(-50%)';
          return (
            <div
              key={`x-label-${idx}`}
              style={{
                position: 'absolute',
                bottom: 6,
                left: `${leftPct}%`,
                transform,
                color: 'var(--md-sys-color-on-surface-variant)',
                fontSize: 11,
                fontFamily: 'var(--md-sys-typescale-font-plain)',
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                opacity: 0.85,
              }}
            >
              {formatXAxisLabel(pt, selectedTimeframe, customRange)}
            </div>
          );
        })}

        {/* Material 3 Hover Tooltip Card */}
        {hoverPoint && (
          <div
            style={{
              position: 'absolute',
              top: 32,
              left: `${(hoverPoint.x / svgWidth) * 100}%`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              backgroundColor: 'var(--md-sys-color-surface-container-highest)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              padding: '6px 12px',
              borderRadius: 'var(--md-sys-shape-medium)',
              boxShadow: 'var(--md-sys-elevation-2)',
              textAlign: 'center',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)' }}>
              {hoverPoint.data.dateStr}
              {hoverPoint.data.session === 'post' ? ' (After Hours)' : hoverPoint.data.session === 'pre' ? ' (Pre-Market)' : ''}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--md-sys-color-on-surface)',
                fontFamily: 'var(--md-sys-typescale-font-mono)',
              }}
            >
              {formatCurrency(hoverPoint.data.close, quote?.currency)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
