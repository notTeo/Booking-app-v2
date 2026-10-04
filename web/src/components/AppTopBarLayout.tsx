import { Link, NavLink, Outlet } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { useIsCompact } from '../hooks/useIsCompact';
import Tooltip from './Tooltip';
import Wordmark from './Wordmark';

// Pages outside a shop (dashboard, account): no sidebar, just the DS app
// navbar. Shop pages use ShopSidebarLayout instead.
function AppTopBar({ compact }: { compact: boolean }) {
  const { t } = useLang();

  return (
    <header className={`navbar navbar--app${compact ? ' is-compact' : ''}`}>
      <Link to="/dashboard" className="wordmark wordmark--sm" aria-label={t.sidebar.dashboard}>
        <Wordmark />
      </Link>
      <span className="navbar__spacer" />
      <div className="navbar__actions">
        {compact ? (
          <Tooltip label={t.sidebar.account} align="end">
            <NavLink to="/account" className="btn btn--ghost btn--icon" aria-label={t.sidebar.account}>
              <FontAwesomeIcon icon={faUser} aria-hidden="true" />
            </NavLink>
          </Tooltip>
        ) : (
          <NavLink to="/account" className="btn btn--ghost">
            <FontAwesomeIcon icon={faUser} aria-hidden="true" />
            {t.sidebar.account}
          </NavLink>
        )}
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
