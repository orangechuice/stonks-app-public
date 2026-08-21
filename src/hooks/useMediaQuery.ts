import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Modern API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Deprecated API fallback
      mediaQuery.addListener(handler);
    }

    setMatches(mediaQuery.matches);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
}

export function useIsMobile(breakpoint: number = 768): boolean {
  const matches = useMediaQuery(`(max-width: ${breakpoint}px)`);
  // Desktop Electron application check: Never switch to mobile view in Electron desktop app
  const isElectronDesktopApp = typeof window !== 'undefined' && Boolean(window.electronAPI);
  return matches && !isElectronDesktopApp;
}
