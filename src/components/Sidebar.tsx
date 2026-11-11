import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, X, GripVertical, AlertTriangle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { StockQuote, SearchResult, Timeframe, BadgeDisplayMode } from '../types/stock';
import { getColorShade, formatCurrency, formatCompactNumber, formatNumber, formatPercent } from '../utils/colorUtils';
import { searchTickers } from '../services/yahooFinanceApi';

interface SidebarProps {
  watchlist: StockQuote[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onAddTicker: (symbol: string) => void;
  onRemoveTicker: (symbol: string) => void;
  onReorderWatchlist: (draggedIndex: number, targetIndex: number) => void;
  badgeDisplayMode: BadgeDisplayMode;
  onToggleBadgeDisplayMode: () => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  selectedTimeframe: Timeframe;
  isMobile?: boolean;
  isRateLimited?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  watchlist,
  selectedSymbol,
  onSelectSymbol,
  onAddTicker,
  onRemoveTicker,
  onReorderWatchlist,
  badgeDisplayMode,
  onToggleBadgeDisplayMode,
  isSearchOpen,
  setIsSearchOpen,
  selectedTimeframe,
  isMobile = false,
  isRateLimited = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; symbol: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close context menu on outside click, Escape key, or scrolling
  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    const handleScroll = () => setContextMenu(null);

    window.addEventListener('click', handleClickOutside);
    window.addEventListener('contextmenu', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('contextmenu', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchTickers(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = (symbol: string) => {
    onAddTicker(symbol);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      if (searchResults.length > 0) {
        handleSelectSearchResult(searchResults[0].symbol);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onReorderWatchlist(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const formattedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <aside className="mac-sidebar md-nav-drawer" aria-label="Watchlist Drawer">
      {/* Mobile M3 Header */}
      <div className="mobile-sidebar-header">
        <div>
          <h1 className="mobile-sidebar-title">Stocks</h1>
          <div className="mobile-sidebar-date">{formattedDate}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            aria-label="Toggle Search"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="mobile-header-btn"
          >
            <Search size={18} />
          </button>
        </div>
      </div>

      {/* Material 3 Search Bar */}
      <div className="sidebar-search-header">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            style={{
              width: 18,
              height: 18,
              position: 'absolute',
              left: 14,
              color: 'var(--md-sys-color-on-surface-variant)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search symbols (e.g. NVDA, AAPL)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isSearchOpen) setIsSearchOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsSearchOpen(true)}
            className="sidebar-search-input"
          />
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              style={{
                position: 'absolute',
                right: 12,
                background: 'none',
                border: 'none',
                color: 'var(--md-sys-color-on-surface-variant)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: 'var(--md-sys-shape-full)',
              }}
              aria-label="Clear Search"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        {/* M3 Autocomplete Search Dropdown */}
        {isSearchOpen && (searchQuery.trim() || isSearching) && (
          <div
            style={{
              position: 'absolute',
              left: 14,
              right: 14,
              top: 66,
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--md-sys-shape-large)',
              boxShadow: 'var(--md-sys-elevation-3)',
              overflow: 'hidden',
              zIndex: 100,
              maxHeight: 280,
              overflowY: 'auto',
            }}
            className="custom-scrollbar"
          >
            {isSearching ? (
              <div
                style={{
                  padding: 16,
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                Searching market symbols...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((result) => {
                const isAlreadyAdded = watchlist.some((w) => w.symbol.toUpperCase() === result.symbol.toUpperCase());
                return (
                  <button
                    key={result.symbol}
                    onClick={() => handleSelectSearchResult(result.symbol)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 14px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid var(--md-sys-color-outline-variant)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      color: 'var(--md-sys-color-on-surface)',
                      transition: 'background-color var(--md-sys-motion-duration-short) ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--md-sys-state-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{result.symbol}</span>
                        {result.exchange && (
                          <span style={{ fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 400 }}>
                            · {result.exchange}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--md-sys-color-on-surface-variant)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 190,
                          marginTop: 2,
                        }}
                      >
                        {result.shortname || result.longname}
                      </div>
                    </div>
                    {isAlreadyAdded ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--md-sys-color-on-surface-variant)',
                          backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                          padding: '3px 8px',
                          borderRadius: 'var(--md-sys-shape-full)',
                        }}
                      >
                        Added
                      </span>
                    ) : (
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 'var(--md-sys-shape-full)',
                          backgroundColor: 'var(--md-sys-color-primary-container)',
                          color: 'var(--md-sys-color-on-primary-container)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Plus size={16} />
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div
                style={{
                  padding: 16,
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                No tickers found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Web Proxy Rate Limit Alert Banner (M3 Warning Card) */}
      {isRateLimited && !window.electronAPI && !Capacitor.isNativePlatform() && (
        <div
          style={{
            margin: '6px 12px 6px 12px',
            padding: '10px 12px',
            borderRadius: 'var(--md-sys-shape-medium)',
            backgroundColor: 'var(--md-sys-color-warning-container)',
            border: '1px solid rgba(255, 186, 40, 0.3)',
            color: 'var(--md-sys-color-on-warning-container)',
            fontSize: 12,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: 'var(--md-sys-elevation-1)',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <div style={{ lineHeight: 1.35 }}>
            <span style={{ fontWeight: 700 }}>Rate Limited (HTTP 429)</span>
            <div style={{ fontSize: 11, opacity: 0.9 }}>Web CORS proxy is throttling requests. Retrying shortly...</div>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--md-sys-color-on-surface-variant)',
          letterSpacing: '0.04em',
          borderBottom: '1px solid var(--md-sys-color-outline-variant)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Watchlist ({watchlist.length})</span>
          <span
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container-highest)',
              color: 'var(--md-sys-color-on-surface)',
              padding: '2px 8px',
              borderRadius: 'var(--md-sys-shape-full)',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--md-sys-typescale-font-mono)',
              border: '1px solid var(--md-sys-color-outline-variant)',
            }}
          >
            {selectedTimeframe}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600 }}>
          {(() => {
            const activeStock = watchlist.find((s) => s.symbol.toUpperCase() === selectedSymbol.toUpperCase()) || watchlist[0];
            const state = activeStock?.marketState;
            const isLive = state === 'REGULAR';
            const label = isLive
              ? 'Market Open'
              : state === 'PRE'
              ? 'Pre-Market'
              : state === 'POST'
              ? 'After Hours'
              : 'Market Closed';

            return (
              <>
                {isLive && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      backgroundColor: 'var(--md-sys-color-positive)',
                      display: 'inline-block',
                      boxShadow: '0 0 6px var(--md-sys-color-positive)',
                    }}
                  />
                )}
                <span style={{ color: isLive ? 'var(--md-sys-color-positive)' : 'var(--md-sys-color-on-surface-variant)' }}>
                  {label}
                </span>
              </>
            );
          })()}
        </div>
      </div>

      {/* Watchlist Item Cards */}
      <div className="sidebar-item-list custom-scrollbar">
        {watchlist.length === 0 ? (
          <div
            style={{
              padding: '40px 16px',
              textAlign: 'center',
              color: 'var(--md-sys-color-on-surface-variant)',
              fontSize: 13,
            }}
          >
            <p style={{ marginBottom: 16 }}>Your watchlist is empty.</p>
            <button
              onClick={() => setIsSearchOpen(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
                border: 'none',
                borderRadius: 'var(--md-sys-shape-full)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--md-sys-elevation-1)',
              }}
            >
              Add Tickers
            </button>
          </div>
        ) : (
          watchlist.map((stock, index) => {
            const isSelected = stock.symbol.toUpperCase() === selectedSymbol.toUpperCase();
            const isDragging = draggedIndex === index;
            const isDragOverAbove = dragOverIndex === index && draggedIndex !== null && draggedIndex > index;
            const isDragOverBelow = dragOverIndex === index && draggedIndex !== null && draggedIndex < index;
            const isOffline = stock.isOffline || stock.marketState === 'OFFLINE';
            const shade = isOffline
              ? {
                  bgColor: 'rgba(255, 255, 255, 0.06)',
                  textColor: 'var(--md-sys-color-on-surface-variant)',
                  borderColor: 'var(--md-sys-color-outline-variant)',
                  strokeColor: 'var(--md-sys-color-outline)',
                  fillGradientStart: 'transparent',
                  fillGradientEnd: 'transparent',
                  glowColor: 'transparent',
                  intensity: 0,
                  isPositive: false,
                }
              : getColorShade(stock.regularMarketChangePercent);
            const isPositive = stock.regularMarketChangePercent >= 0;

            return (
              <div
                key={stock.symbol}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectSymbol(stock.symbol)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const menuWidth = 200;
                  const menuHeight = 100;
                  const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
                  const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
                  setContextMenu({ x, y, symbol: stock.symbol });
                }}
                className={`watchlist-card ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${
                  isDragOverAbove ? 'drag-over-above' : ''
                } ${isDragOverBelow ? 'drag-over-below' : ''}`}
              >
                {/* Drag Handle */}
                <div className="drag-handle" title="Drag to reorder">
                  <GripVertical size={14} />
                </div>

                {/* Left Column: Symbol & Short Name */}
                <div className="symbol-info">
                  <div className="symbol-ticker">{stock.symbol}</div>
                  <div className="symbol-name">{stock.shortName || stock.longName || stock.symbol}</div>
                </div>

                {/* Middle Mini Sparkline SVG */}
                <div className="symbol-sparkline">
                  {!isOffline && stock.sparkline && stock.sparkline.length > 1 ? (
                    <svg style={{ width: '100%', height: '100%', overflow: 'visible' }} viewBox="0 0 100 40">
                      {(() => {
                        const pts = stock.sparkline;
                        const min = Math.min(...pts);
                        const max = Math.max(...pts);
                        const range = max - min || 1;
                        const coords = pts.map((val, idx) => {
                          const x = (idx / (pts.length - 1)) * 100;
                          const y = 35 - ((val - min) / range) * 30;
                          return `${x},${y}`;
                        });
                        return (
                          <polyline
                            fill="none"
                            stroke={shade.strokeColor}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={coords.join(' ')}
                          />
                        );
                      })()}
                    </svg>
                  ) : null}
                </div>

                {/* Right Column: Price & Material 3 Dynamic Tonal Change Badge */}
                <div className="symbol-price-col">
                  <div className="symbol-price">
                    {isOffline ? '--' : formatCurrency(stock.regularMarketPrice, stock.currency)}
                  </div>

                  {/* DYNAMIC TONAL BADGE (Clickable to toggle Percentage / Price Change / Market Cap) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBadgeDisplayMode();
                    }}
                    style={{
                      backgroundColor: shade.bgColor,
                      color: shade.textColor,
                      borderColor: shade.borderColor,
                      boxShadow: shade.glowColor !== 'transparent' ? `0 0 12px ${shade.glowColor}` : 'none',
                      cursor: 'pointer',
                    }}
                    className="change-badge"
                    title="Click to toggle display: Percentage / Change / Market Cap"
                  >
                    {(() => {
                      if (isOffline) return '--';
                      if (badgeDisplayMode === 'priceChange') {
                        const absChange = Math.abs(stock.regularMarketChange);
                        const decimals = absChange > 0 && absChange < 1 ? 3 : 2;
                        const formatted = formatNumber(stock.regularMarketChange, decimals);
                        return `${isPositive ? '+' : ''}${formatted}`;
                      }
                      if (badgeDisplayMode === 'marketCap') {
                        return formatCompactNumber(stock.marketCap);
                      }
                      // Default 'percent'
                      return formatPercent(stock.regularMarketChangePercent);
                    })()}
                  </div>
                </div>

                {/* Delete Button (M3 icon button on hover) */}
                <button
                  className="delete-btn md-icon-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTicker(stock.symbol);
                  }}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '26px',
                    height: '26px',
                    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                    color: 'var(--md-sys-color-on-surface-variant)',
                  }}
                  title={`Remove ${stock.symbol}`}
                  aria-label={`Remove ${stock.symbol}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Material 3 Context Menu */}
      {contextMenu && (
        <div
          className="watchlist-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="watchlist-context-menu-item"
            onClick={() => {
              onSelectSymbol(contextMenu.symbol);
              setContextMenu(null);
            }}
          >
            <span>View {contextMenu.symbol} Details</span>
          </button>
          <div className="watchlist-context-menu-divider" />
          <button
            className="watchlist-context-menu-item danger"
            onClick={() => {
              onRemoveTicker(contextMenu.symbol);
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} />
            <span>Remove {contextMenu.symbol}</span>
          </button>
        </div>
      )}
    </aside>
  );
};
