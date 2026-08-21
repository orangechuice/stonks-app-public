import React, { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { ChartDataPoint, Timeframe, StockQuote, CustomDateRange } from '../types/stock';
import { getColorShade, formatCurrency, formatNumber } from '../utils/colorUtils';
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

  // Render Horizontally Scrollable Apple Stocks-style Timeframe Selector Bar
  const renderTimeframeBar = () => (
    <div
      className="no-scrollbar"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '4px 2px',
        marginBottom: selectedTimeframe === 'CUSTOM' ? 12 : 20,
        userSelect: 'none',
      }}
    >
      {TIMEFRAMES.map((tf) => {
        const isSelected = selectedTimeframe === tf;
        return (
          <button
            key={tf}
            onClick={() => handleTimeframeClick(tf)}
            style={{
              flex: '0 0 auto',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
              borderRadius: '20px',
              border: isSelected ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid transparent',
              backgroundColor: isSelected ? '#3A3A3C' : 'transparent',
              color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
              boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.4)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#FFFFFF';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              }
            }}
          >
            {tf === 'CUSTOM' ? (
              <>
                <Calendar size={12} />
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
          <div style={{
            width: '100%',
            height: 360,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}>
            {[0.2, 0.4, 0.6, 0.8].map((pct) => (
              <div
                key={`skeleton-line-${pct}`}
                style={{
                  position: 'absolute',
                  top: `${pct * 100}%`,
                  left: 0,
                  right: 0,
                  height: 1,
                  borderTop: '1px dashed rgba(255, 255, 255, 0.06)',
                }}
              />
            ))}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'rgba(255, 255, 255, 0.45)',
              fontSize: 13,
              fontWeight: 500,
              zIndex: 2,
            }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 255, 255, 0.15)',
                  borderTopColor: '#0A84FF',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span>Loading chart...</span>
            </div>
          </div>
        ) : (
          <div style={{
            width: '100%',
            height: 300,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}>
            {isRateLimited || quote?.isRateLimited || (!window.electronAPI && !Capacitor.isNativePlatform() && (quote?.isOffline || quote?.marketState === 'OFFLINE' || !quote)) ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: 440,
                padding: '20px 24px',
                borderRadius: 14,
                backgroundColor: 'rgba(255, 159, 10, 0.1)',
                border: '1px solid rgba(255, 159, 10, 0.25)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 159, 10, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FF9F0A',
                  marginBottom: 12,
                }}>
                  <AlertTriangle size={24} />
                </div>
                <div style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#FF9F0A',
                  letterSpacing: '-0.01em',
                  marginBottom: 6,
                }}>
                  Rate Limit Exceeded (HTTP 429)
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.75)',
                  lineHeight: 1.5,
                  marginBottom: 8,
                }}>
                  Public CORS proxies for web mode are temporarily throttling requests due to high traffic.
                </div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.45)',
                  lineHeight: 1.4,
                }}>
                  Please wait a few seconds for automatic recovery, or use the standalone macOS desktop app for direct access.
                </div>
              </div>
            ) : (
              <>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.7)',
                  letterSpacing: '-0.01em',
                  marginBottom: 6,
                }}>
                  Chart Unavailable
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.4)',
                }}>
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
  const paddingRight = 36;
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
  const is1DWithExtended = selectedTimeframe === '1D' && chartData.some(d => d.isExtendedHours);

  // Group points by session
  const prePoints: typeof points = [];
  const regPoints: typeof points = [];
  const postPoints: typeof points = [];

  points.forEach(p => {
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

  // Mouse move handler for hover tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    updateHoverPointFromClientX(e.clientX, e.currentTarget.getBoundingClientRect());
  };

  // Touch Handlers for crosshair scrubbing
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
      {/* 100% Fully Responsive Segmented Timeframe Control Bar */}
      {renderTimeframeBar()}

      {/* Custom Date Range Active Info Bar */}
      {selectedTimeframe === 'CUSTOM' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          padding: '8px 14px',
          borderRadius: 8,
          backgroundColor: 'rgba(10, 132, 255, 0.12)',
          border: '1px solid rgba(10, 132, 255, 0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#0A84FF' }}>
            <Calendar size={15} />
            <span>Range: {formatCustomBadgeLabel()}</span>
          </div>
          <button
            onClick={() => setIsDatePickerOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0A84FF',
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

      {/* SVG Interactive Dynamic Full-Width Chart */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 360,
          touchAction: 'pan-y',
        }}
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

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const yVal = paddingTop + chartH * pct;
            return (
              <line
                key={idx}
                x1="0"
                y1={yVal}
                x2={chartW}
                y2={yVal}
                stroke="rgba(255, 255, 255, 0.05)"
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
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeDasharray="2 2"
                />
              )}
              {marketCloseX != null && postPoints.length > 0 && (
                <line
                  x1={marketCloseX}
                  y1={paddingTop}
                  x2={marketCloseX}
                  y2={paddingTop + chartH}
                  stroke="rgba(255, 255, 255, 0.12)"
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
              stroke="rgba(255, 255, 255, 0.25)"
              strokeDasharray="3 3"
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
                  opacity="0.8"
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
                  opacity="0.8"
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
                stroke="rgba(255, 255, 255, 0.4)"
                strokeDasharray="3 3"
              />
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r="5"
                fill={shade.strokeColor}
                stroke="#18181B"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Y Axis Price Labels (HTML overlay pushed to the far right) */}
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
                color: 'rgba(255, 255, 255, 0.35)',
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                textAlign: 'right',
              }}
            >
              {formatYAxisPrice(priceVal, yRange)}
            </div>
          );
        })}

        {/* X Axis Time Labels (HTML overlay to prevent text squishing/stretching on resize) */}
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
                bottom: 8,
                left: `${leftPct}%`,
                transform,
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: 11,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {formatXAxisLabel(pt, selectedTimeframe, customRange)}
            </div>
          );
        })}

        {/* Hover Tooltip Overlay */}
        {hoverPoint && (
          <div
            style={{
              position: 'absolute',
              top: 32,
              left: `${(hoverPoint.x / svgWidth) * 100}%`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              backgroundColor: '#1E1E22',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '6px 12px',
              borderRadius: '8px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              textAlign: 'center',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
              {hoverPoint.data.dateStr}
              {hoverPoint.data.session === 'post' ? ' (After Hours)' : hoverPoint.data.session === 'pre' ? ' (Pre-Market)' : ''}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFF', fontFamily: 'monospace' }}>
              {formatCurrency(hoverPoint.data.close, quote?.currency)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
