import { useState } from 'react';
import { NavLink, useNavigate, useMatch } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import '../styles/pages/sidebar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTableCells,
  faStore,
  faCreditCard,
  faGear,
  faRightFromBracket,
  faChevronLeft,
  faChevronRight,
  faCalendar,
  faScissors,
  faUsers,
  faUserPlus,
  faMagnifyingGlass,
  faClock,
  faEnvelopeOpen,
  faPlusCircle,
} from '@fortawesome/free-solid-svg-icons';

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
        {collapsed ? <FontAwesomeIcon icon={faChevronRight} /> : <FontAwesomeIcon icon={faChevronLeft} />}
      </button>
    </div>

      <span className="sidebar-section-label">{t.sidebar.app}</span>

      <NavLink to="/dashboard" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} title={collapsed ? t.sidebar.overview : undefined} onClick={onClose}>
        <FontAwesomeIcon icon={faTableCells} />
        <span className="sidebar-link-label">{t.sidebar.overview}</span>
      </NavLink>

      <NavLink to="/shops" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} title={collapsed ? t.sidebar.shops : undefined} onClick={onClose}>
        <FontAwesomeIcon icon={faStore} />
        <span className="sidebar-link-label">{t.sidebar.shops}</span>
      </NavLink>

      <NavLink to="/billing" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} title={collapsed ? t.sidebar.billing : undefined} onClick={onClose}>
        <FontAwesomeIcon icon={faCreditCard} />
        <span className="sidebar-link-label">{t.sidebar.billing}</span>
      </NavLink>

      <NavLink to="/invites" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} title={collapsed ? t.sidebar.invites : undefined} onClick={onClose}>
        <FontAwesomeIcon icon={faEnvelopeOpen} />
        <span className="sidebar-link-label">{t.sidebar.invites}</span>
      </NavLink>

      <span className="sidebar-section-label">{t.sidebar.account}</span>

      <NavLink to="/settings" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} title={collapsed ? t.sidebar.settings : undefined} onClick={onClose}>
        <FontAwesomeIcon icon={faGear} />
        <span className="sidebar-link-label">{t.sidebar.settings}</span>
      </NavLink>

      <button
        className="sidebar-logout sidebar-link"
        onClick={async () => { await logout(); navigate('/login'); onClose(); }}
      >
        <FontAwesomeIcon icon={faRightFromBracket} />
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
        {collapsed ? <FontAwesomeIcon icon={faChevronRight} /> : <FontAwesomeIcon icon={faChevronLeft} />}
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
        <FontAwesomeIcon icon={faTableCells} />
        <span className="sidebar-link-label">{t.sidebar.overview}</span>
      </NavLink>

      <NavLink to={`${base}/bookings`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
        <FontAwesomeIcon icon={faCalendar} />
        <span className="sidebar-link-label">{t.sidebar.bookings}</span>
      </NavLink>

      <NavLink to={`${base}/services`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
        <FontAwesomeIcon icon={faScissors} />
        <span className="sidebar-link-label">{t.sidebar.services}</span>
      </NavLink>

      <NavLink to={`${base}/bookings/new`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
        <FontAwesomeIcon icon={faPlusCircle} />
        <span className="sidebar-link-label">{t.sidebar.bookAppointment}</span>
      </NavLink>

      {isOwner && (
        <>
          <span className="sidebar-section-label">{t.sidebar.manageSection}</span>

          <NavLink to={`${base}/team`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
            <FontAwesomeIcon icon={faUsers} />
            <span className="sidebar-link-label">{t.sidebar.team}</span>
          </NavLink>

          <NavLink to={`${base}/invites`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
            <FontAwesomeIcon icon={faUserPlus} />
            <span className="sidebar-link-label">{t.sidebar.invites}</span>
          </NavLink>

          <NavLink to={`${base}/customers`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <span className="sidebar-link-label">{t.sidebar.customers}</span>
          </NavLink>
          <NavLink to={`${base}/working-hours`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={onClose}>
            <FontAwesomeIcon icon={faClock} />
            <span className="sidebar-link-label">{t.sidebar.shopWorkingHours}</span>
          </NavLink>
           <NavLink to={`${base}/settings`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''} sidebar-bottom`} onClick={onClose}>
            <FontAwesomeIcon icon={faGear} />
            <span className="sidebar-link-label">{t.sidebar.shopSettings}</span>
          </NavLink>
        </>
      )}

      <button
        className="sidebar-logout sidebar-link"
        onClick={async () => { await logout(); navigate('/login'); onClose(); }}
      >
        <FontAwesomeIcon icon={faRightFromBracket} />
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