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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 1000,
        userSelect: 'none',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#1E1E22',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          gap: '12px',
        }}>
          <Search style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.4)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search symbol or company name (e.g. AAPL, NVDA, Tesla)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#FFF',
              fontSize: '15px',
              fontWeight: 500,
            }}
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          ) : null}
          <kbd style={{ fontSize: 10, background: 'rgba(255,255,255,0.1)', padding: '3px 6px', borderRadius: 4, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>
            ESC
          </kbd>
        </div>

        {/* Rate Limit Alert Notice */}
        {isRateLimited && !window.electronAPI && !Capacitor.isNativePlatform() && (
          <div style={{
            margin: '12px 16px 4px 16px',
            padding: '10px 14px',
            borderRadius: 10,
            backgroundColor: 'rgba(255, 159, 10, 0.12)',
            border: '1px solid rgba(255, 159, 10, 0.25)',
            color: '#FF9F0A',
            fontSize: 12,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>Rate limit exceeded (HTTP 429). Web proxy throttling search requests. Retrying shortly...</span>
          </div>
        )}

        {/* Results List */}
        <div style={{ maxHeight: '360px', overflowY: 'auto' }} className="custom-scrollbar">
          {isSearching ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
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
                    padding: '12px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#FFF', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{res.symbol}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>· {res.exchange || 'US'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                      {res.shortname || res.longname}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isAdded ? (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: 6 }}>
                        In Watchlist
                      </span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#30D158', fontWeight: 600 }}>
                        <span>Add</span>
                        <Plus style={{ width: 14, height: 14 }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : query.trim() ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              No stock tickers found matching "{query.trim()}"
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Type any stock symbol (e.g. AAPL, NVDA, SPY, TSLA) to add to your watchlist
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
