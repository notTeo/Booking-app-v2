import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket, faUser } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useIsCompact } from '../hooks/useIsCompact';
import Tooltip from './Tooltip';
import Wordmark from './Wordmark';

// Pages outside a shop (dashboard, account): no sidebar, just the DS app
// navbar. Shop pages use ShopSidebarLayout instead.
function AppTopBar({ compact }: { compact: boolean }) {
  const { logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <header className={`navbar${compact ? ' is-compact' : ''}`}>
      <Link to="/dashboard" className="wordmark wordmark--sm" aria-label={t.sidebar.dashboard}>
        <Wordmark />
      </Link>
      <span className="navbar__spacer" />
      <div className="navbar__actions">
        <Tooltip label={t.sidebar.account} align="end">
          <NavLink to="/account" className="btn btn--ghost btn--icon" aria-label={t.sidebar.account}>
            <FontAwesomeIcon icon={faUser} aria-hidden="true" />
          </NavLink>
        </Tooltip>
        <Tooltip label={t.sidebar.logout} align="end">
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            aria-label={t.sidebar.logout}
            onClick={async () => { await logout(); navigate('/login'); }}
          >
            <FontAwesomeIcon icon={faRightFromBracket} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}

export default function AppTopBarLayout() {
  const compact = useIsCompact();

  return (
    <div className={`app-shell app-shell--topbar${compact ? ' is-compact' : ''}`}>
      <AppTopBar compact={compact} />
      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
