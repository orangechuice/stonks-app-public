import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, AlertTriangle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { SearchResult, StockQuote } from '../types/stock';
import { searchTickers } from '../services/yahooFinanceApi';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTicker: (symbol: string) => void;
  watchlist: StockQuote[];
  isRateLimited?: boolean;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onAddTicker,
  watchlist,
  isRateLimited = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const searchRes = await searchTickers(query);
      setResults(searchRes);
      setIsSearching(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelectSymbol = (symbol: string) => {
    onAddTicker(symbol);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      if (results.length > 0) {
        handleSelectSymbol(results[0].symbol);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        zIndex: 1000,
        userSelect: 'none',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
      onClick={onClose}
    >
      {/* Material 3 Search Dialog */}
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: 'var(--md-sys-shape-extra-large)',
          boxShadow: 'var(--md-sys-elevation-3)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar (M3 56px height) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 20px',
            borderBottom: '1px solid var(--md-sys-color-outline-variant)',
            gap: '14px',
            minHeight: '56px',
          }}
        >
          <Search style={{ width: 20, height: 20, color: 'var(--md-sys-color-on-surface-variant)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search symbol or company name (e.g. AAPL, NVDA, GOOGL)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--md-sys-color-on-surface)',
              fontFamily: 'var(--md-sys-typescale-font-plain)',
              fontSize: '15px',
              fontWeight: 500,
            }}
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="md-icon-button"
              style={{ width: 32, height: 32 }}
              aria-label="Clear Search"
            >
              <X size={16} />
            </button>
          ) : null}
          <span
            style={{
              fontSize: 11,
              backgroundColor: 'var(--md-sys-color-surface-container-highest)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              padding: '2px 8px',
              borderRadius: 'var(--md-sys-shape-small)',
              fontFamily: 'var(--md-sys-typescale-font-mono)',
              color: 'var(--md-sys-color-on-surface-variant)',
              fontWeight: 600,
            }}
          >
            ESC
          </span>
        </div>

        {/* Rate Limit Alert Notice (M3 Warning Card) */}
        {isRateLimited && !window.electronAPI && !Capacitor.isNativePlatform() && (
          <div
            style={{
              margin: '12px 16px 4px 16px',
              padding: '10px 14px',
              borderRadius: 'var(--md-sys-shape-medium)',
              backgroundColor: 'var(--md-sys-color-warning-container)',
              border: '1px solid rgba(255, 186, 40, 0.3)',
              color: 'var(--md-sys-color-on-warning-container)',
              fontSize: 12,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>Rate limit exceeded (HTTP 429). Web proxy throttling search requests. Retrying shortly...</span>
          </div>
        )}

        {/* Results List */}
        <div style={{ maxHeight: '380px', overflowY: 'auto' }} className="custom-scrollbar">
          {isSearching ? (
            <div
              style={{
                padding: '28px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              Searching stock market...
            </div>
          ) : results.length > 0 ? (
            results.map((res) => {
              const isAdded = watchlist.some((w) => w.symbol.toUpperCase() === res.symbol.toUpperCase());
              return (
                <div
                  key={res.symbol}
                  onClick={() => handleSelectSymbol(res.symbol)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
                    cursor: 'pointer',
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
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--md-sys-color-on-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span>{res.symbol}</span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--md-sys-color-on-surface-variant)',
                          fontWeight: 400,
                        }}
                      >
                        · {res.exchange || 'US'}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--md-sys-color-on-surface-variant)',
                        marginTop: 2,
                      }}
                    >
                      {res.shortname || res.longname}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isAdded ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--md-sys-color-on-surface-variant)',
                          backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                          padding: '4px 10px',
                          borderRadius: 'var(--md-sys-shape-full)',
                        }}
                      >
                        In Watchlist
                      </span>
                    ) : (
                      <button
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: 'var(--md-sys-color-primary-container)',
                          color: 'var(--md-sys-color-on-primary-container)',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 'var(--md-sys-shape-full)',
                          cursor: 'pointer',
                        }}
                      >
                        <span>Add</span>
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : query.trim() ? (
            <div
              style={{
                padding: '28px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              No stock tickers found matching "{query.trim()}"
            </div>
          ) : (
            <div
              style={{
                padding: '28px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              Type any stock symbol (e.g. AAPL, NVDA, SPY, TSLA) to add to your watchlist
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
