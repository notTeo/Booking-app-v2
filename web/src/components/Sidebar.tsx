import { useState } from 'react';
import { NavLink, useNavigate, useMatch } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import '../styles/pages/sidebar.css';

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconOverview() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function IconShop() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1.5a2.5 2.5 0 0 1-1 2V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.5a2.5 2.5 0 0 1-1-2V3zm1.5 3.83A2.5 2.5 0 0 0 5.5 7.5a2.5 2.5 0 0 0 2-.96 2.5 2.5 0 0 0 2 .96 2.5 2.5 0 0 0 2-.96V13H4.5V6.83H3.5zM3.5 4.5v1a1 1 0 0 0 2 0V4.5h-2zm3 0v1a1 1 0 0 0 2 0V4.5h-2zm3 0v1a1 1 0 0 0 2 0V4.5h-2z" />
    </svg>
  );
}

function IconBilling() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="3.5" width="14" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="6.5" width="14" height="2" />
      <rect x="3" y="10" width="3.5" height="1.25" rx="0.5" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
      <path fillRule="evenodd" d="M6.56 1.28a1 1 0 0 1 2.88 0l.24.83a.75.75 0 0 0 1.02.49l.8-.35a1 1 0 0 1 1.28 1.28l-.35.8a.75.75 0 0 0 .49 1.02l.83.24a1 1 0 0 1 0 2.88l-.83.24a.75.75 0 0 0-.49 1.02l.35.8a1 1 0 0 1-1.28 1.28l-.8-.35a.75.75 0 0 0-1.02.49l-.24.83a1 1 0 0 1-2.88 0l-.24-.83a.75.75 0 0 0-1.02-.49l-.8.35a1 1 0 0 1-1.28-1.28l.35-.8a.75.75 0 0 0-.49-1.02l-.83-.24a1 1 0 0 1 0-2.88l.83-.24a.75.75 0 0 0 .49-1.02l-.35-.8a1 1 0 0 1 1.28-1.28l.8.35a.75.75 0 0 0 1.02-.49l.24-.83zm1.44 1.17-.18.63a2.25 2.25 0 0 1-3.06 1.47l-.6-.26-.26.6a2.25 2.25 0 0 1-1.47 3.06l-.63.18.18.63a2.25 2.25 0 0 1 1.47 3.06l-.26.6.6.26a2.25 2.25 0 0 1 3.06 1.47l.18.63h.63l.18-.63a2.25 2.25 0 0 1 3.06-1.47l.6.26.26-.6a2.25 2.25 0 0 1 1.47-3.06l.63-.18-.18-.63a2.25 2.25 0 0 1-1.47-3.06l.26-.6-.6-.26a2.25 2.25 0 0 1-3.06-1.47l-.18-.63H8z" clipRule="evenodd" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v7A1.5 1.5 0 0 0 3.5 13H6" />
      <path d="M10 11l3-3-3-3" />
      <path d="M14 8H6" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="10 12 6 8 10 4" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 4 10 8 6 12" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5 1a.75.75 0 0 1 .75.75V3h4.5V1.75a.75.75 0 0 1 1.5 0V3H13a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 13 15H3A1.5 1.5 0 0 1 1.5 13.5v-9A1.5 1.5 0 0 1 3 3h1.25V1.75A.75.75 0 0 1 5 1zm-2 5.5v7h10v-7H3z" clipRule="evenodd" />
    </svg>
  );
}

function IconScissors() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M3.5 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm0-1.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM3.5 15a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm0-1.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
      <path d="M5.5 4.75 14 9l-8.5 4.25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" fill="none" />
      <path d="M5.5 4.75 8.5 9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1z" />
      <path d="M13.5 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm1.5 7s1 0 1-1-1-3.5-5-3.5c-.55 0-1.04.05-1.49.14A5.05 5.05 0 0 1 11 12c0 .7-.18 1.36-.5 1.93L15 14z" />
    </svg>
  );
}

function IconUserPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1z" />
      <path d="M13.5 9v1.5H12a.75.75 0 0 0 0 1.5h1.5V13.5a.75.75 0 0 0 1.5 0V12H16.5a.75.75 0 0 0 0-1.5H15V9a.75.75 0 0 0-1.5 0z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="4" />
      <line x1="9.5" y1="9.5" x2="14" y2="14" />
    </svg>
  );
}

// function IconArrowLeft() {
//   return (
//     <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
//       <path d="M10 3L5 8l5 5" />
//     </svg>
//   );
// }

// ─── Sub-components ───────────────────────────────────────────────────────────

interface NavProps {
  collapsed: boolean;
  toggle: () => void;
  isOpen: boolean;
  onClose: () => void;
}




function GlobalNav({ collapsed, toggle, isOpen, onClose }: NavProps) {
  const { logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${isOpen ? ' drawer-open' : ''}`}>
    <div className="sidebar-header">
      <h4 className="sidebar-link-label">BOOKLY</h4>
      <button className="sidebar-toggle" onClick={toggle} aria-label={collapsed ? t.sidebar.expand : t.sidebar.collapse}>
        {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
      </button>
    </div>

      <span className="sidebar-section-label">{t.sidebar.app}</span>

      <NavLink to="/dashboard" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} title={collapsed ? t.sidebar.overview : undefined} onClick={onClose}>
        <IconOverview />
        <span className="sidebar-link-label">{t.sidebar.overview}</span>
      </NavLink>

      <NavLink to="/shops" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} title={collapsed ? t.sidebar.shops : undefined} onClick={onClose}>
        <IconShop />
        <span className="sidebar-link-label">{t.sidebar.shops}</span>
      </NavLink>

      <NavLink to="/billing" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} title={collapsed ? t.sidebar.billing : undefined} onClick={onClose}>
        <IconBilling />
        <span className="sidebar-link-label">{t.sidebar.billing}</span>
      </NavLink>

      <span className="sidebar-section-label">{t.sidebar.account}</span>

      <NavLink to="/settings" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} title={collapsed ? t.sidebar.settings : undefined} onClick={onClose}>
        <IconSettings />
        <span className="sidebar-link-label">{t.sidebar.settings}</span>
      </NavLink>

      <button
        className="sidebar-logout sidebar-link"
        onClick={async () => { await logout(); navigate('/login'); onClose(); }}
      >
        <IconLogout />
        <span className="sidebar-link-label">{t.sidebar.logout}</span>
      </button>
    </aside>
  );
}

interface ShopNavProps extends NavProps {
  slug: string;
}

function ShopNav({ collapsed, toggle, isOpen, onClose, slug }: ShopNavProps) {
  const { logout } = useAuth();
  const { shop, isLoading } = useShop();
  const { t } = useLang();
  const navigate = useNavigate();

  const isOwner = shop?.role === 'owner';
  const base = `/shops/${slug}`;

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${isOpen ? ' drawer-open' : ''}`}>
    <div className="sidebar-header">
      <NavLink to="/shops" className="sidebar-back-link" onClick={onClose}>
        <span className="sidebar-link-label">{t.sidebar.backToShops}</span>
      </NavLink>
      <button className="sidebar-toggle" onClick={toggle} aria-label={collapsed ? t.sidebar.expand : t.sidebar.collapse}>
        {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
      </button>
    </div>

      <div className="sidebar-shop-name">
        {isLoading ? (
          <span className="sidebar-link-label">...</span>
        ) : (
          <span className="sidebar-link-label">{shop?.name ?? slug}</span>
        )}
      </div>

      <span className="sidebar-section-label">{t.sidebar.shopSection}</span>

      <NavLink to={base} end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
        <IconOverview />
        <span className="sidebar-link-label">{t.sidebar.overview}</span>
      </NavLink>

      <NavLink to={`${base}/bookings`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
        <IconCalendar />
        <span className="sidebar-link-label">{t.sidebar.bookings}</span>
      </NavLink>

      <NavLink to={`${base}/services`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
        <IconScissors />
        <span className="sidebar-link-label">{t.sidebar.services}</span>
      </NavLink>

      {isOwner && (
        <>
          <span className="sidebar-section-label">{t.sidebar.manageSection}</span>

          <NavLink to={`${base}/team`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
            <IconUsers />
            <span className="sidebar-link-label">{t.sidebar.team}</span>
          </NavLink>

          <NavLink to={`${base}/invites`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
            <IconUserPlus />
            <span className="sidebar-link-label">{t.sidebar.invites}</span>
          </NavLink>

          <NavLink to={`${base}/customers`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
            <IconSearch />
            <span className="sidebar-link-label">{t.sidebar.customers}</span>
          </NavLink>

          <NavLink to={`${base}/settings`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
            <IconSettings />
            <span className="sidebar-link-label">{t.sidebar.shopSettings}</span>
          </NavLink>
        </>
      )}

      <button
        className="sidebar-logout sidebar-link"
        onClick={async () => { await logout(); navigate('/login'); onClose(); }}
      >
        <IconLogout />
        <span className="sidebar-link-label">{t.sidebar.logout}</span>
      </button>
    </aside>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const shopMatch = useMatch('/shops/:slug/*');

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  if (shopMatch) {
    return <ShopNav collapsed={collapsed} toggle={toggle} isOpen={isOpen} onClose={onClose} slug={shopMatch.params.slug!} />;
  }

  return <GlobalNav collapsed={collapsed} toggle={toggle} isOpen={isOpen} onClose={onClose} />;
}