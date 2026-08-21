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
    <aside className="mac-sidebar">
      {/* Mobile iOS Header */}
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

      {/* Search Header */}
      <div className="sidebar-search-header">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search style={{ width: 14, height: 14, position: 'absolute', left: 10, top: 10, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search Tickers (e.g. NVDA, AAPL)..."
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
              style={{ position: 'absolute', right: 10, top: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          ) : null}
        </div>

        {/* Autocomplete Dropdown */}
        {isSearchOpen && (searchQuery.trim() || isSearching) && (
          <div style={{
            position: 'absolute',
            left: 12,
            right: 12,
            top: 54,
            backgroundColor: '#1C1C20',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            zIndex: 100,
            maxHeight: 280,
            overflowY: 'auto',
          }}>
            {isSearching ? (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
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
                      padding: '10px 12px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      color: '#FFF',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{result.symbol}</span>
                        {result.exchange && (
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>· {result.exchange}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                        {result.shortname || result.longname}
                      </div>
                    </div>
                    {isAlreadyAdded ? (
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                        Added
                      </span>
                    ) : (
                      <Plus style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.6)' }} />
                    )}
                  </button>
                );
              })
            ) : (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                No tickers found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Web Proxy Rate Limit Alert Banner */}
      {isRateLimited && !window.electronAPI && !Capacitor.isNativePlatform() && (
        <div style={{
          margin: '8px 12px 4px 12px',
          padding: '8px 12px',
          borderRadius: 8,
          backgroundColor: 'rgba(255, 159, 10, 0.12)',
          border: '1px solid rgba(255, 159, 10, 0.3)',
          color: '#FF9F0A',
          fontSize: 11,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <div style={{ lineHeight: 1.3 }}>
            <span style={{ fontWeight: 700 }}>Rate Limited (HTTP 429)</span>
            <div style={{ fontSize: 10, opacity: 0.85 }}>Web CORS proxy is throttling requests. Retrying shortly...</div>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div style={{
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 11,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Watchlist ({watchlist.length})</span>
          <span style={{
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF',
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.02em',
          }}>{selectedTimeframe}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {(() => {
            const activeStock = watchlist.find(s => s.symbol.toUpperCase() === selectedSymbol.toUpperCase()) || watchlist[0];
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
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#30D158', display: 'inline-block' }} />
                )}
                <span style={{ color: isLive ? '#30D158' : 'rgba(255,255,255,0.4)' }}>
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
          <div style={{ padding: '36px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            <p style={{ marginBottom: 12 }}>Your watchlist is empty.</p>
            <button
              onClick={() => setIsSearchOpen(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0A84FF',
                color: '#FFF',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
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
            const shade = isOffline ? {
              bgColor: 'rgba(255, 255, 255, 0.08)',
              textColor: 'rgba(255, 255, 255, 0.4)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
              strokeColor: 'rgba(255, 255, 255, 0.2)',
              fillGradientStart: 'transparent',
              fillGradientEnd: 'transparent',
              glowColor: 'transparent',
              intensity: 0,
              isPositive: false,
            } : getColorShade(stock.regularMarketChangePercent);
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
                  const menuWidth = 180;
                  const menuHeight = 90;
                  const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
                  const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
                  setContextMenu({ x, y, symbol: stock.symbol });
                }}
                className={`watchlist-card ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isDragOverAbove ? 'drag-over-above' : ''} ${isDragOverBelow ? 'drag-over-below' : ''}`}
              >
                {/* Drag Handle */}
                <div className="drag-handle" title="Drag to reorder">
                  <GripVertical style={{ width: 13, height: 13 }} />
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

                {/* Right Column: Price & Dynamic Color Change Badge */}
                <div className="symbol-price-col">
                  <div className="symbol-price">{isOffline ? '--' : formatCurrency(stock.regularMarketPrice, stock.currency)}</div>

                  {/* DYNAMIC SHADED BADGE (Clickable to toggle Percentage / Price Change / Market Cap) */}
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
                    title="Click to toggle display mode: Percentage / Change / Market Cap"
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

                {/* Delete Button (visible on card hover) */}
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTicker(stock.symbol);
                  }}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'rgba(0,0,0,0.65)',
                    border: 'none',
                    color: 'rgba(255,255,255,0.7)',
                    padding: '4px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={`Remove ${stock.symbol}`}
                >
                  <Trash2 style={{ width: 11, height: 11 }} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Floating macOS Right-Click Context Menu */}
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
            <Trash2 style={{ width: 14, height: 14 }} />
            <span>Remove {contextMenu.symbol}</span>
          </button>
        </div>
      )}
    </aside>
  );
};
