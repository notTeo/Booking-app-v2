import { NavLink, useNavigate, useMatch } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { useSidebarWidth } from '../hooks/useSidebarWidth';
import '../styles/pages/sidebar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTableCells,
  faStore,
  faGear,
  faRightFromBracket,
  faCalendar,
  faScissors,
  faUsers,
  faUserPlus,
  faMagnifyingGlass,
  faClock,
  faEnvelopeOpen,
  faPlusCircle,
  faChevronLeft,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      className="sidebar-resize-handle"
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
    />
  );
}

// Mobile-only (hidden on desktop via CSS) — the drawer's own way to close
// itself without navigating anywhere, since tapping the backdrop isn't a
// very discoverable affordance on its own.
function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
      <FontAwesomeIcon icon={faXmark} />
    </button>
  );
}

interface NavProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  startResize: (e: React.MouseEvent) => void;
}

function GlobalNav({ isOpen, onClose, width, startResize }: NavProps) {
  const { logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <aside
      className={`sidebar${isOpen ? ' drawer-open' : ''}`}
      style={{ '--sidebar-width': `${width}px` } as React.CSSProperties}
    >
    <CloseButton onClose={onClose} />
    <div className="sidebar-header">
      {/* No button here (nothing to go "back" to) — logo sits flush left on
          desktop. On mobile this spacer reappears (see sidebar.css) to hold
          the logo clear of the fixed close-X overlaid on top of it. */}
      <span className="sidebar-header-spacer" aria-hidden="true" />
      <h4 className="sidebar-link-label">Bookly</h4>
    </div>

      <span className="sidebar-section-label">{t.sidebar.app}</span>

      <NavLink to="/dashboard" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} aria-label={t.sidebar.overview} onClick={onClose}>
        <FontAwesomeIcon icon={faTableCells} />
        <span className="sidebar-link-label">{t.sidebar.overview}</span>
      </NavLink>

      <NavLink to="/shops" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} aria-label={t.sidebar.shops} onClick={onClose}>
        <FontAwesomeIcon icon={faStore} />
        <span className="sidebar-link-label">{t.sidebar.shops}</span>
      </NavLink>

      <NavLink to="/invites" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} aria-label={t.sidebar.invites} onClick={onClose}>
        <FontAwesomeIcon icon={faEnvelopeOpen} />
        <span className="sidebar-link-label">{t.sidebar.invites}</span>
      </NavLink>

      <span className="sidebar-section-label">{t.sidebar.account}</span>

      <NavLink to="/settings" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} aria-label={t.sidebar.settings} onClick={onClose}>
        <FontAwesomeIcon icon={faGear} />
        <span className="sidebar-link-label">{t.sidebar.settings}</span>
      </NavLink>

      <button
        className="sidebar-logout sidebar-link"
        aria-label={t.sidebar.logout}
        onClick={async () => { await logout(); navigate('/login'); onClose(); }}
      >
        <FontAwesomeIcon icon={faRightFromBracket} />
        <span className="sidebar-link-label">{t.sidebar.logout}</span>
      </button>

      <ResizeHandle onMouseDown={startResize} />
    </aside>
  );
}

interface ShopNavProps extends NavProps {
  slug: string;
}

function ShopNav({ isOpen, onClose, width, startResize, slug }: ShopNavProps) {
  const { logout } = useAuth();
  const { shop, isLoading } = useShop();
  const { t } = useLang();
  const navigate = useNavigate();

  const isOwner = shop?.role === 'owner';
  const base = `/shops/${slug}`;

  return (
    <aside
      className={`sidebar${isOpen ? ' drawer-open' : ''}`}
      style={{ '--sidebar-width': `${width}px` } as React.CSSProperties}
    >
    <CloseButton onClose={onClose} />
    <div className="sidebar-header">
      {/* Mobile-only spacer, holds the logo clear of the fixed close-X
          (mirrors GlobalNav's header — see sidebar.css). */}
      <span className="sidebar-header-spacer" aria-hidden="true" />
      <h4 className="sidebar-link-label">Bookly</h4>
      <NavLink to="/shops" className="sidebar-back-link" aria-label={t.sidebar.backToShops} title={t.sidebar.backToShops} onClick={onClose}>
        <FontAwesomeIcon icon={faChevronLeft} />
      </NavLink>
    </div>

      <div className="sidebar-shop-name">
        {isLoading ? (
          <span className="sidebar-link-label">...</span>
        ) : (
          <span className="sidebar-link-label">{shop?.name ?? slug}</span>
        )}
      </div>

      {/* "Shop" section — day-to-day, available to every team member:
          check the calendar, take a new booking, see what's on offer. */}
      <span className="sidebar-section-label">{t.sidebar.shopSection}</span>

      <NavLink to={base} end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} aria-label={t.sidebar.overview} onClick={onClose}>
        <FontAwesomeIcon icon={faTableCells} />
        <span className="sidebar-link-label">{t.sidebar.overview}</span>
      </NavLink>

      <NavLink to={`${base}/bookings`} end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} aria-label={t.sidebar.bookings} onClick={onClose}>
        <FontAwesomeIcon icon={faCalendar} />
        <span className="sidebar-link-label">{t.sidebar.bookings}</span>
      </NavLink>

      <NavLink to={`${base}/bookings/new`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} aria-label={t.sidebar.bookAppointment} onClick={onClose}>
        <FontAwesomeIcon icon={faPlusCircle} />
        <span className="sidebar-link-label">{t.sidebar.bookAppointment}</span>
      </NavLink>

      <NavLink to={`${base}/services`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} aria-label={t.sidebar.services} onClick={onClose}>
        <FontAwesomeIcon icon={faScissors} />
        <span className="sidebar-link-label">{t.sidebar.services}</span>
      </NavLink>

      {isOwner && (
        <>
          {/* "Manage" section — owner-only setup/config, ordered the way
              you'd actually stand up a shop: build the team, invite them
              in, set when everyone works, then the ongoing customer list
              and shop-wide settings. */}
          <span className="sidebar-section-label">{t.sidebar.manageSection}</span>

          <NavLink to={`${base}/team`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} aria-label={t.sidebar.team} onClick={onClose}>
            <FontAwesomeIcon icon={faUsers} />
            <span className="sidebar-link-label">{t.sidebar.team}</span>
          </NavLink>

          <NavLink to={`${base}/invites`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} aria-label={t.sidebar.invites} onClick={onClose}>
            <FontAwesomeIcon icon={faUserPlus} />
            <span className="sidebar-link-label">{t.sidebar.invites}</span>
          </NavLink>

          <NavLink to={`${base}/working-hours`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} aria-label={t.sidebar.shopWorkingHours} onClick={onClose}>
            <FontAwesomeIcon icon={faClock} />
            <span className="sidebar-link-label">{t.sidebar.shopWorkingHours}</span>
          </NavLink>

          <NavLink to={`${base}/customers`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} aria-label={t.sidebar.customers} onClick={onClose}>
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <span className="sidebar-link-label">{t.sidebar.customers}</span>
          </NavLink>

           <NavLink to={`${base}/settings`} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''} sidebar-bottom`} aria-label={t.sidebar.shopSettings} onClick={onClose}>
            <FontAwesomeIcon icon={faGear} />
            <span className="sidebar-link-label">{t.sidebar.shopSettings}</span>
          </NavLink>
        </>
      )}

      <button
        className="sidebar-logout sidebar-link"
        aria-label={t.sidebar.logout}
        onClick={async () => { await logout(); navigate('/login'); onClose(); }}
      >
        <FontAwesomeIcon icon={faRightFromBracket} />
        <span className="sidebar-link-label">{t.sidebar.logout}</span>
      </button>

      <ResizeHandle onMouseDown={startResize} />
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
  const { width, startResize } = useSidebarWidth();

  if (shopMatch) {
    return <ShopNav isOpen={isOpen} onClose={onClose} width={width} startResize={startResize} slug={shopMatch.params.slug!} />;
  }

  return <GlobalNav isOpen={isOpen} onClose={onClose} width={width} startResize={startResize} />;
}
