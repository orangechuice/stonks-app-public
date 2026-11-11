import React from 'react';
import { RefreshCw, PanelLeft, PanelLeftClose } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { StonksIcon } from './StonksIcon';

interface TitlebarProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Titlebar: React.FC<TitlebarProps> = ({
  onRefresh,
  isRefreshing,
  toggleSidebar,
  isSidebarOpen,
}) => {
  const isElectron = Boolean(window.electronAPI);
  const isAndroid = Capacitor.getPlatform() === 'android';

  return (
    <header className="mac-titlebar md-top-app-bar" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* Left Navigation Container */}
      <div className="titlebar-left-container" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={toggleSidebar}
          className={`md-icon-button ${isSidebarOpen ? 'active' : ''}`}
          style={{
            marginLeft: isElectron ? '72px' : '0px',
          }}
          title={isSidebarOpen ? 'Collapse Navigation Drawer' : 'Expand Navigation Drawer'}
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
        </button>
      </div>

      {/* Center Brand / App Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <StonksIcon size={24} />
        <span
          className="md-typescale-title-large"
          style={{
            fontWeight: 700,
            color: 'var(--md-sys-color-on-surface)',
            letterSpacing: '-0.01em',
          }}
        >
          Stonks
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--md-sys-shape-full)',
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            color: 'var(--md-sys-color-on-surface-variant)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            fontFamily: 'var(--md-sys-typescale-font-mono)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {isElectron ? 'macOS' : isAndroid ? 'Android' : 'Web'}
        </span>
      </div>

      {/* Right Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '160px',
          justifyContent: 'flex-end',
          WebkitAppRegion: 'no-drag',
        } as any}
      >
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="md-icon-button"
          title="Refresh Market Quotes"
          aria-label="Refresh Quotes"
        >
          <RefreshCw
            size={18}
            className={isRefreshing ? 'animate-spin' : ''}
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          />
        </button>
      </div>
    </header>
  );
};
