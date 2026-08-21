import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Titlebar } from './components/Titlebar';
import { Sidebar } from './components/Sidebar';
import { StockDetail } from './components/StockDetail';
import { SearchModal } from './components/SearchModal';
import { MobileDetailSheet } from './components/MobileDetailSheet';
import { useIsMobile } from './hooks/useMediaQuery';
import { StockQuote, ChartDataPoint, Timeframe, BadgeDisplayMode, CustomDateRange } from './types/stock';
import { fetchStockData, getIsRateLimited, subscribeRateLimit } from './services/yahooFinanceApi';

const DEFAULT_SYMBOLS = ['^GSPC', '^IXIC', '^DJI', 'AAPL', 'NVDA', 'MSFT', 'GOOGL', 'AMZN'];
const LOCAL_STORAGE_KEY = 'mac_stock_app_watchlist';

export const App: React.FC = () => {
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load watchlist from localStorage', e);
    }
    return DEFAULT_SYMBOLS;
  });

  // Load Watchlist & Settings from Native Application Settings (Desktop) if available
  useEffect(() => {
    if (window.electronAPI) {
      document.body.classList.add('electron-app');
    } else {
      document.body.classList.remove('electron-app');
    }

    if (Capacitor.isNativePlatform()) {
      document.body.classList.add('capacitor-app');
      if (Capacitor.getPlatform() === 'android') {
        document.body.classList.add('capacitor-android');
      }
    }

    if (window.electronAPI?.getSettings) {
      window.electronAPI.getSettings().then((settings) => {
        if (settings) {
          if (Array.isArray(settings.watchlist) && settings.watchlist.length > 0) {
            setWatchlistSymbols(settings.watchlist);
          }
          if (settings.badgeDisplayMode && (settings.badgeDisplayMode === 'percent' || settings.badgeDisplayMode === 'priceChange' || settings.badgeDisplayMode === 'marketCap')) {
            setBadgeDisplayMode(settings.badgeDisplayMode);
          }
        }
      });
    }
  }, []);

  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('mac_stock_app_selected_symbol');
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}
    return watchlistSymbols[0] || '^GSPC';
  });
  const [watchlistQuotes, setWatchlistQuotes] = useState<StockQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<StockQuote | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1D');
  
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return { startDate: todayStr, endDate: todayStr };
  });

  const [badgeDisplayMode, setBadgeDisplayMode] = useState<BadgeDisplayMode>(() => {
    try {
      const saved = localStorage.getItem('mac_stock_app_badge_mode');
      if (saved && (saved === 'percent' || saved === 'priceChange' || saved === 'marketCap')) {
        return saved as BadgeDisplayMode;
      }
    } catch (e) {}
    return 'percent';
  });

  const isMobile = useIsMobile(768);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(() => getIsRateLimited());

  useEffect(() => {
    return subscribeRateLimit((limited) => {
      setIsRateLimited(limited);
    });
  }, []);

  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
    if (isMobile) {
      setIsMobileDetailOpen(true);
    }
  };

  const handleNavigateTicker = (direction: 'prev' | 'next') => {
    if (!watchlistSymbols || watchlistSymbols.length <= 1) return;
    const currentIndex = watchlistSymbols.findIndex(
      (s) => s.toUpperCase() === selectedSymbol.toUpperCase()
    );
    if (currentIndex === -1) {
      handleSelectSymbol(watchlistSymbols[0]);
      return;
    }
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % watchlistSymbols.length
      : (currentIndex - 1 + watchlistSymbols.length) % watchlistSymbols.length;
    handleSelectSymbol(watchlistSymbols[nextIndex]);
  };

  // Save Watchlist, Badge Display Mode, and Selected Symbol to Native App Settings & LocalStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(watchlistSymbols));
    localStorage.setItem('mac_stock_app_badge_mode', badgeDisplayMode);
    if (selectedSymbol) {
      localStorage.setItem('mac_stock_app_selected_symbol', selectedSymbol);
    }
    if (window.electronAPI?.saveSettings) {
      window.electronAPI.saveSettings({ watchlist: watchlistSymbols, badgeDisplayMode });
    }
  }, [watchlistSymbols, badgeDisplayMode, selectedSymbol]);

  const handleToggleBadgeDisplayMode = () => {
    setBadgeDisplayMode((prev) => {
      if (prev === 'percent') return 'priceChange';
      if (prev === 'priceChange') return 'marketCap';
      return 'percent';
    });
  };

  // Load Watchlist Quotes for the active timeframe
  const loadWatchlistData = useCallback(async (
    timeframe: Timeframe = selectedTimeframe,
    customRange: CustomDateRange = customDateRange,
    forceRefresh: boolean = false
  ) => {
    setIsRefreshing(true);
    try {
      const results = await Promise.all(
        watchlistSymbols.map((sym) => fetchStockData(sym, timeframe, customRange, forceRefresh, false).catch(() => null))
      );
      const quotes: StockQuote[] = results.map((res, idx) => {
        if (res) return res.quote;
        const sym = watchlistSymbols[idx];
        return {
          symbol: sym,
          shortName: sym,
          exchangeName: 'US Market',
          currency: 'USD',
          regularMarketPrice: 0,
          regularMarketChange: 0,
          regularMarketChangePercent: 0,
          previousClose: 0,
          regularMarketOpen: 0,
          regularMarketDayHigh: 0,
          regularMarketDayLow: 0,
          regularMarketVolume: 0,
          fiftyTwoWeekHigh: 0,
          fiftyTwoWeekLow: 0,
          sparkline: [],
          marketState: 'OFFLINE',
          isOffline: true,
        };
      });
      setWatchlistQuotes(quotes);
    } catch (err) {
      console.error('Error fetching watchlist quotes:', err);
    }
    setIsRefreshing(false);
  }, [watchlistSymbols, selectedTimeframe, customDateRange]);

  // Load Detail Chart & Selected Stock Data
  const loadDetailData = useCallback(async (
    symbol: string,
    timeframe: Timeframe,
    customRange: CustomDateRange = customDateRange,
    forceRefresh: boolean = false
  ) => {
    setIsLoadingChart(true);
    try {
      const res = await fetchStockData(symbol, timeframe, customRange, forceRefresh, true);
      if (res) {
        setSelectedQuote(res.quote);
        setChartData(res.chart);
      } else {
        setSelectedQuote(null);
        setChartData([]);
      }
    } catch (err) {
      console.error(`Error loading detail for ${symbol}:`, err);
      setSelectedQuote(null);
      setChartData([]);
    }
    setIsLoadingChart(false);
  }, [customDateRange]);

  const handleApplyCustomRange = (range: CustomDateRange) => {
    setCustomDateRange(range);
    setSelectedTimeframe('CUSTOM');
    loadWatchlistData('CUSTOM', range);
    if (selectedSymbol) {
      loadDetailData(selectedSymbol, 'CUSTOM', range);
    }
  };

  // Sync Watchlist & Detail Data whenever Selected Symbol or Timeframe changes
  useEffect(() => {
    loadWatchlistData(selectedTimeframe, customDateRange);
  }, [selectedTimeframe, watchlistSymbols, loadWatchlistData, customDateRange]);

  useEffect(() => {
    if (selectedSymbol) {
      loadDetailData(selectedSymbol, selectedTimeframe, customDateRange);
    }
  }, [selectedSymbol, selectedTimeframe, loadDetailData, customDateRange]);

  // Auto-refresh watchlist and detailed quote data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadWatchlistData(selectedTimeframe, customDateRange, true);
      if (selectedSymbol) {
        loadDetailData(selectedSymbol, selectedTimeframe, customDateRange, true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedTimeframe, selectedSymbol, customDateRange, loadWatchlistData, loadDetailData]);


  // Add ticker to watchlist
  const handleAddTicker = (symbol: string) => {
    const cleanSym = symbol.trim().toUpperCase();
    if (!watchlistSymbols.includes(cleanSym)) {
      setWatchlistSymbols((prev) => [...prev, cleanSym]);
    }
    setSelectedSymbol(cleanSym);
  };

  // Remove ticker from watchlist
  const handleRemoveTicker = (symbol: string) => {
    const cleanSym = symbol.trim().toUpperCase();
    const nextList = watchlistSymbols.filter((s) => s.toUpperCase() !== cleanSym);
    setWatchlistSymbols(nextList);

    if (selectedSymbol.toUpperCase() === cleanSym) {
      setSelectedSymbol(nextList[0] || '');
    }
  };

  // Reorder ticker in watchlist
  const handleReorderWatchlist = (draggedIndex: number, targetIndex: number) => {
    setWatchlistSymbols((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, removed);
      return updated;
    });
  };

  // Global Keyboard Shortcuts (Cmd+K or Ctrl+K opens Sidebar Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSidebarOpen(true);
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Native Mobile (Capacitor) Setup: Hardware Back Button & Dark Status Bar
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#0E0E10' }).catch(() => {});
      });
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanupListener: (() => void) | undefined;
    import('@capacitor/app').then(({ App: CapApp }) => {
      const listenerPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
        if (isSearchModalOpen) {
          setIsSearchModalOpen(false);
        } else if (isMobileDetailOpen) {
          setIsMobileDetailOpen(false);
        } else if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (canGoBack) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });
      cleanupListener = () => {
        listenerPromise.then((handle) => handle.remove());
      };
    });

    return () => {
      if (cleanupListener) cleanupListener();
    };
  }, [isSearchModalOpen, isMobileDetailOpen, isSearchOpen]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#000000', overflow: 'hidden' }}>
      {/* Title Bar */}
      <Titlebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onRefresh={() => {
          loadWatchlistData(selectedTimeframe, customDateRange, true);
          if (selectedSymbol) loadDetailData(selectedSymbol, selectedTimeframe, customDateRange, true);
        }}
        isRefreshing={isRefreshing}
      />

      {/* Main App Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Watchlist Sidebar */}
        {(isSidebarOpen || isMobile) && (
          <Sidebar
            watchlist={watchlistQuotes}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={handleSelectSymbol}
            onAddTicker={handleAddTicker}
            onRemoveTicker={handleRemoveTicker}
            onReorderWatchlist={handleReorderWatchlist}
            badgeDisplayMode={badgeDisplayMode}
            onToggleBadgeDisplayMode={handleToggleBadgeDisplayMode}
            isSearchOpen={isSearchOpen}
            setIsSearchOpen={setIsSearchOpen}
            selectedTimeframe={selectedTimeframe}
            isMobile={isMobile}
            isRateLimited={isRateLimited}
          />
        )}

        {/* Stock Detail & Chart View (Desktop) */}
        {!isMobile && (() => {
          const isSelectedQuoteMatching = selectedQuote && selectedQuote.symbol.toUpperCase() === selectedSymbol.toUpperCase();
          const preloadedWatchlistQuote = watchlistQuotes.find((q) => q.symbol.toUpperCase() === selectedSymbol.toUpperCase()) || null;
          const activeQuote = isSelectedQuoteMatching ? selectedQuote : preloadedWatchlistQuote;
          const activeChartData = isSelectedQuoteMatching ? chartData : [];
          const isChartLoadingForSymbol = isLoadingChart || !isSelectedQuoteMatching;

          return (
            <StockDetail
              symbol={selectedSymbol}
              quote={activeQuote}
              chartData={activeChartData}
              selectedTimeframe={selectedTimeframe}
              onSelectTimeframe={setSelectedTimeframe}
              isLoading={isChartLoadingForSymbol}
              customRange={customDateRange}
              onApplyCustomRange={handleApplyCustomRange}
              isRateLimited={isRateLimited}
              onNavigatePrevious={() => handleNavigateTicker('prev')}
              onNavigateNext={() => handleNavigateTicker('next')}
            />
          );
        })()}

        {/* Mobile Detail Bottom Sheet (Mobile) */}
        {isMobile && (() => {
          const isSelectedQuoteMatching = selectedQuote && selectedQuote.symbol.toUpperCase() === selectedSymbol.toUpperCase();
          const preloadedWatchlistQuote = watchlistQuotes.find((q) => q.symbol.toUpperCase() === selectedSymbol.toUpperCase()) || null;
          const activeQuote = isSelectedQuoteMatching ? selectedQuote : preloadedWatchlistQuote;
          const activeChartData = isSelectedQuoteMatching ? chartData : [];
          const isChartLoadingForSymbol = isLoadingChart || !isSelectedQuoteMatching;

          return (
            <MobileDetailSheet
              isOpen={isMobileDetailOpen}
              onClose={() => setIsMobileDetailOpen(false)}
              symbol={selectedSymbol}
              quote={activeQuote}
              chartData={activeChartData}
              selectedTimeframe={selectedTimeframe}
              onSelectTimeframe={setSelectedTimeframe}
              isLoading={isChartLoadingForSymbol}
              customRange={customDateRange}
              onApplyCustomRange={handleApplyCustomRange}
              indexQuotes={watchlistQuotes.filter((q) => q.symbol.startsWith('^'))}
              watchlist={watchlistQuotes}
              onSelectSymbol={handleSelectSymbol}
              isRateLimited={isRateLimited}
              onNavigatePrevious={() => handleNavigateTicker('prev')}
              onNavigateNext={() => handleNavigateTicker('next')}
            />
          );
        })()}
      </div>

      {/* Spotlight Command Palette Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onAddTicker={handleAddTicker}
        watchlist={watchlistQuotes}
        isRateLimited={isRateLimited}
      />
    </div>
  );
};

export default App;
