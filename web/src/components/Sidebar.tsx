import { useEffect, useRef } from 'react';
import { canManageShop } from '../utils/roles';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTableCells,
  faGear,
  faCalendar,
  faScissors,
  faBoxOpen,
  faUsers,
  faMagnifyingGlass,
  faHouse,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useLang } from '../context/LanguageContext';
import { useNavShop } from '../hooks/useNavShop';
import type { useSidebarWidth } from '../hooks/useSidebarWidth';
import Wordmark from './Wordmark';

interface ItemProps {
  to: string;
  icon: IconDefinition;
  label: string;
  end?: boolean;
  /** Icon rail: the label is hidden, so it becomes the link's name and tooltip. */
  collapsed: boolean;
  onNavigate: () => void;
}

// NavLink sets aria-current="page" itself, which is what .nav-item styles.
function Item({ to, icon, label, end, collapsed, onNavigate }: ItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className="nav-item"
      onClick={onNavigate}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
    >
      <FontAwesomeIcon icon={icon} aria-hidden="true" />
      <span className="nav-item__label">{label}</span>
    </NavLink>
  );
}

// The one sidebar, the same on every signed-in page. Outside a shop
// (dashboard, account) the links still lead to the user's shop (useNavShop);
// someone who is not in any shop gets just Home and Account. Owners see Team,
// Customers and Shop settings on top of what staff see.
function Nav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const shop = useNavShop();
  const { t } = useLang();
  const base = `/shops/${shop?.slug}`;
  const canManage = canManageShop(shop?.role);

  return (
    <>
      <Item to="/dashboard" end icon={faHouse} label={t.sidebar.home} collapsed={collapsed} onNavigate={onNavigate} />
      {shop && (
        <>
          <div className="sidebar__title">{shop.name ?? '…'}</div>
          <nav className="sidebar__nav" aria-label={t.sidebar.mainNav}>
            <Item to={base} end icon={faTableCells} label={t.sidebar.overview} collapsed={collapsed} onNavigate={onNavigate} />
            <Item to={`${base}/bookings`} icon={faCalendar} label={t.sidebar.bookings} collapsed={collapsed} onNavigate={onNavigate} />
            <Item to={`${base}/services`} icon={faScissors} label={t.sidebar.services} collapsed={collapsed} onNavigate={onNavigate} />
            <Item to={`${base}/products`} icon={faBoxOpen} label={t.sidebar.products} collapsed={collapsed} onNavigate={onNavigate} />
            {canManage && (
              <>
                <Item to={`${base}/team`} icon={faUsers} label={t.sidebar.team} collapsed={collapsed} onNavigate={onNavigate} />
                <Item to={`${base}/customers`} icon={faMagnifyingGlass} label={t.sidebar.customers} collapsed={collapsed} onNavigate={onNavigate} />
                <Item to={`${base}/settings`} icon={faGear} label={t.sidebar.shopSettings} collapsed={collapsed} onNavigate={onNavigate} />
              </>
            )}
          </nav>
        </>
      )}
      <div className="sidebar__footer sidebar__nav">
        <Item to="/account" icon={faUser} label={t.sidebar.account} collapsed={collapsed} onNavigate={onNavigate} />
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
  const collapsed = !compact && !!resize?.collapsed;
  if (collapsed) classes.push('sidebar--collapsed');

  return (
    <aside ref={ref} tabIndex={-1} className={classes.join(' ')}>
      <div className="sidebar__brand">
        <span className="wordmark"><Wordmark short={collapsed} /></span>
      </div>
      <Nav collapsed={collapsed} onNavigate={onClose} />
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
