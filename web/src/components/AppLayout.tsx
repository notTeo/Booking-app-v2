import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Wordmark from './Wordmark';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { useIsCompact } from '../hooks/useIsCompact';
import { useSidebarWidth } from '../hooks/useSidebarWidth';
import { useShopSlug } from '../hooks/useShopSlug';

// Two bars, the top one longer than the bottom.
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="7" x2="17" y2="7" />
      <line x1="3" y1="13" x2="13.5" y2="13" />
    </svg>
  );
}

// Compact-only top bar: menu button, then the shop name on shop pages and the
// logo on account pages.
function TopBar({ onMenu, menuRef }: { onMenu: () => void; menuRef: React.Ref<HTMLButtonElement> }) {
  const slug = useShopSlug();
  const { shop, isLoading } = useShop();
  const { t } = useLang();

  return (
    <header className="topbar">
      <button
        ref={menuRef}
        type="button"
        className="btn btn--ghost btn--icon"
        onClick={onMenu}
        aria-label={t.sidebar.openMenu}
      >
        <MenuIcon />
      </button>
      {slug
        ? <span className="topbar__title">{isLoading ? '…' : (shop?.name ?? slug)}</span>
        : <span className="topbar__title wordmark"><Wordmark /></span>}
    </header>
  );
}

export default function AppLayout() {
  const compact = useIsCompact();
  const resize = useSidebarWidth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  // Crossing the breakpoint resets the drawer (adjusting state during render,
  // so a drawer left open while wide doesn't reappear when narrow again).
  const [prevCompact, setPrevCompact] = useState(compact);
  if (prevCompact !== compact) {
    setPrevCompact(compact);
    setIsDrawerOpen(false);
  }

  // Give focus back to the menu button once the drawer closes.
  useEffect(() => {
    if (wasOpen.current && !isDrawerOpen) menuRef.current?.focus();
    wasOpen.current = isDrawerOpen;
  }, [isDrawerOpen]);

  return (
    <div
      className={`app-shell${compact ? ' is-compact' : ''}`}
      style={compact ? undefined : ({ '--sidebar-width': `${resize.width}px` } as React.CSSProperties)}
    >
      {compact && <TopBar onMenu={() => setIsDrawerOpen(true)} menuRef={menuRef} />}
      {compact && isDrawerOpen && (
        <div className="scrim" onClick={closeDrawer} aria-hidden="true" />
      )}
      <Sidebar compact={compact} isOpen={isDrawerOpen} onClose={closeDrawer} resize={compact ? undefined : resize} />
      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
