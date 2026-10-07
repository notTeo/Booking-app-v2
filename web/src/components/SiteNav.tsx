import { useState, type Ref } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faMoon, faSun, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import AppPalette from './AppPalette';
import Wordmark from './Wordmark';
import '../styles/pages/home.css';

interface Props {
  /** The landing page measures the nav row to size its hero pill. */
  rowRef?: Ref<HTMLDivElement>;
  /**
   * Draw the bar's own background and keep room for it at the top of the page.
   * The landing page leaves this off: its hero pill sits behind the bar.
   */
  solid?: boolean;
}

// The public site's top bar: logo, page links, theme and language toggles,
// sign in and the call to action, with a slide-in menu on phones.
export default function SiteNav({ rowRef, solid = false }: Props) {
  const { t, language, toggleLanguage } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  // "Product" is a section of the landing page.
  const featuresHref = solid ? '/#features' : '#features';

  return (
    <>
      <AppPalette />
      <nav className={`home-nav-bar${solid ? ' home-nav-bar--solid' : ''}`}>
        <div className="home-container home-nav" ref={rowRef}>

          <div className="home-nav-left">
            <Link to="/" className="home-nav-logo-link" aria-label="BeBooked home">
              <span className="home-logo-text"><Wordmark /></span>
            </Link>

            <div className="home-nav-links">
              <Link to="/about" className="home-nav-link">{t.home.aboutBadge || 'About'}</Link>
              <a href={featuresHref} className="home-nav-link">{t.home.productBadge || 'Product'}</a>
              <Link to="/pricing" className="home-nav-link">{t.home.pricingBadge}</Link>
              <Link to="/contact" className="home-nav-link">{t.home.contactBadge || 'Contact'}</Link>
            </div>
          </div>

          <div className="home-nav-right">
            <button
              className="home-nav-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
            </button>

            <button
              className="home-nav-toggle home-nav-toggle--lang"
              onClick={toggleLanguage}
              aria-label="Toggle language"
            >
              {language === 'el' ? 'EL' : 'EN'}
            </button>

            <Link to="/login" className="home-nav-link">{t.home.signIn}</Link>
            <Link to="/register" className="home-btn-primary home-btn-primary--sm">{t.home.cta}</Link>
          </div>

          <button
            className={`home-hamburger${menuOpen ? ' is-open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <span className="home-hamburger-bar home-hamburger-bar--top" />
            <span className="home-hamburger-bar home-hamburger-bar--bottom" />
          </button>
        </div>
      </nav>
      {solid && <div className="home-nav-spacer" aria-hidden="true" />}

      <div className={`home-mobile-backdrop${menuOpen ? ' is-open' : ''}`} onClick={closeMenu} />
      <div className={`home-mobile-menu${menuOpen ? ' is-open' : ''}`}>
        <button className="home-mobile-close" onClick={closeMenu} aria-label="Close menu">
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <div className="home-mobile-links">
          <Link to="/about" className="home-mobile-link" onClick={closeMenu}>{t.home.aboutBadge || 'About'}</Link>
          <a href={featuresHref} className="home-mobile-link" onClick={closeMenu}>{t.home.productBadge || 'Product'}</a>
          <Link to="/pricing" className="home-mobile-link" onClick={closeMenu}>{t.home.pricingBadge}</Link>
          <Link to="/contact" className="home-mobile-link" onClick={closeMenu}>{t.home.contactBadge || 'Contact'}</Link>
        </div>

        <div className="home-mobile-bottom">
          <div className="home-mobile-actions">
            <Link to="/login" className="home-mobile-link" onClick={closeMenu}>{t.home.signIn}</Link>
            <Link to="/register" className="home-btn-primary home-btn-primary--sm" onClick={closeMenu}>
              {t.home.cta} <FontAwesomeIcon icon={faArrowRight} />
            </Link>
          </div>

          <div className="home-mobile-toggles">
            <button
              className="home-nav-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
            </button>
            <button className="home-nav-toggle home-nav-toggle--lang" onClick={toggleLanguage} aria-label="Toggle language">
              {language === 'el' ? 'EL' : 'EN'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
