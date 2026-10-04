import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTableCells,
  faGear,
  faCalendar,
  faScissors,
  faUsers,
  faMagnifyingGlass,
  faChevronLeft,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { useShopSlug } from '../hooks/useShopSlug';
import type { useSidebarWidth } from '../hooks/useSidebarWidth';
import Wordmark from './Wordmark';

interface ItemProps {
  to: string;
  icon: IconDefinition;
  label: string;
  end?: boolean;
  onNavigate: () => void;
}

// NavLink sets aria-current="page" itself, which is what .nav-item styles.
function Item({ to, icon, label, end, onNavigate }: ItemProps) {
  return (
    <NavLink to={to} end={end} className="nav-item" onClick={onNavigate}>
      <FontAwesomeIcon icon={icon} aria-hidden="true" />
      <span className="nav-item__label">{label}</span>
    </NavLink>
  );
}

// The shop sidebar (the only sidebar; pages outside a shop have a top bar).
// Owners see Team, Customers and Shop settings on top of what staff see.
function ShopLevel({ slug, onNavigate }: { slug: string; onNavigate: () => void }) {
  const { shop, isLoading } = useShop();
  const { t } = useLang();
  const base = `/shops/${slug}`;
  const isOwner = shop?.role === 'owner';

  return (
    <>
      <NavLink to="/dashboard" end className="nav-item" onClick={onNavigate}>
        <FontAwesomeIcon icon={faChevronLeft} aria-hidden="true" />
        <span className="nav-item__label">{t.sidebar.backToShops}</span>
      </NavLink>
      <div className="sidebar__title">{isLoading ? '…' : (shop?.name ?? slug)}</div>
      <nav className="sidebar__nav" aria-label={t.sidebar.mainNav}>
        <Item to={base} end icon={faTableCells} label={t.sidebar.overview} onNavigate={onNavigate} />
        <Item to={`${base}/bookings`} icon={faCalendar} label={t.sidebar.bookings} onNavigate={onNavigate} />
        <Item to={`${base}/services`} icon={faScissors} label={t.sidebar.services} onNavigate={onNavigate} />
        {isOwner && (
          <>
            <Item to={`${base}/team`} icon={faUsers} label={t.sidebar.team} onNavigate={onNavigate} />
            <Item to={`${base}/customers`} icon={faMagnifyingGlass} label={t.sidebar.customers} onNavigate={onNavigate} />
            <Item to={`${base}/settings`} icon={faGear} label={t.sidebar.shopSettings} onNavigate={onNavigate} />
          </>
        )}
      </nav>
      <div className="sidebar__footer sidebar__nav">
        <Item to="/account" icon={faUser} label={t.sidebar.account} onNavigate={onNavigate} />
      </div>
    </>
  );
}

interface SidebarProps {
  compact: boolean;
  /** Desktop only: drag handle state from useSidebarWidth. */
  resize?: ReturnType<typeof useSidebarWidth>;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ compact, isOpen, onClose, resize }: SidebarProps) {
  const { t } = useLang();
  const slug = useShopSlug();
  const ref = useRef<HTMLElement>(null);
  const drawerOpen = compact && isOpen;

  // Drawer behaviour from the DS Sidebar README: Esc closes, focus moves in
  // on open and stays inside while open.
  useEffect(() => {
    if (!drawerOpen) return;
    const el = ref.current;
    el?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !el) return;
      const focusable = el.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, onClose]);

  const classes = ['sidebar'];
  if (compact) classes.push('is-drawer');
  if (drawerOpen) classes.push('is-open');

  return (
    <aside ref={ref} tabIndex={-1} className={classes.join(' ')}>
      <div className="sidebar__brand">
        <span className="wordmark"><Wordmark /></span>
      </div>
      {slug && <ShopLevel slug={slug} onNavigate={onClose} />}
      {resize && (
        <div
          className={`sidebar__resize${resize.dragging ? ' is-dragging' : ''}`}
          aria-label={t.sidebar.resize}
          {...resize.handleProps}
        />
      )}
    </aside>
  );
}
