import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import '../styles/pages/navbar.css';
import Toggles from './Toggles';
import Wordmark from './Wordmark';


export default function Navbar() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    closeMenu();
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" onClick={closeMenu}><Wordmark /></Link>

      {/* Desktop nav links */}
      <div className="navbar-links">
      </div>

      {/* Desktop toggles */}
      <Toggles/>

      {/* Desktop auth actions */}
      <div className="navbar-actions">
        {!isLoading && (
          isAuthenticated ? (
            <button className="btn btn--secondary btn--sm" onClick={handleLogout}>{t.nav.logout}</button>
          ) : (
            <>
              <Link to="/login">
                <button className="btn btn--secondary btn--sm">{t.nav.login}</button>
              </Link>
              <Link to="/register">
                <button className="btn btn--sm">{t.nav.register}</button>
              </Link>
            </>
          )
        )}
      </div>

      {/* Hamburger button - mobile only */}
      <button
        className={`navbar-hamburger${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Toggle menu"
      >
        <span />
        <span />
        <span />
      </button>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="navbar-mobile-menu">
          <div className="navbar-mobile-divider" />
          <Toggles/>
          <div className="navbar-mobile-divider" />
          {!isLoading && (
            isAuthenticated ? (
              <button className="btn btn--secondary btn--block" onClick={handleLogout}>{t.nav.logout}</button>
            ) : (
              <>
                <Link to="/login" onClick={closeMenu}>
                  <button className="btn btn--secondary btn--block">{t.nav.login}</button>
                </Link>
                <Link to="/register" onClick={closeMenu}>
                  <button className="btn btn--block">{t.nav.register}</button>
                </Link>
              </>
            )
          )}
        </div>
      )}
    </nav>
  );
}
