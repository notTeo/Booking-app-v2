import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarCheck,
  faStore,
  faUsers,
  faMobile,
  faUserPlus,
  faGear,
  faArrowRight,
  faXmark,
  faPlus,
  faTableCells,
  faCalendar,
  faScissors,
  faCheck,
  faGlobe,
  faEnvelope,
  faSun,
  faMoon,
  faChevronLeft,
  faPlusCircle,
  faClock,
  faMagnifyingGlass,
  faArrowUp,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import Footer from '../components/Footer';
import '../styles/pages/home.css';
import '../styles/pages/sidebar.css';

// ─── Data ─────────────────────────────────────────────────────────────────────
// Dashboard preview mockup — a clickable, non-functional stand-in for the
// real app, matching components/Sidebar.tsx's link set and classes.
type PreviewPageId = 'overview' | 'bookings' | 'newBooking' | 'services' | 'team' | 'invites' | 'hours' | 'customers' | 'settings';

type T = ReturnType<typeof useLang>['t'];

const getSteps = (t: T) => [
  { num: '1', icon: faUserPlus, title: t.home.step1Title, desc: t.home.step1Desc },
  { num: '2', icon: faGear, title: t.home.step2Title, desc: t.home.step2Desc },
  { num: '3', icon: faCalendarCheck, title: t.home.step3Title, desc: t.home.step3Desc },
];

const getFaqs = (t: T) => [
  { q: t.home.faq1Q, a: t.home.faq1A },
  { q: t.home.faq2Q, a: t.home.faq2A },
  { q: t.home.faq3Q, a: t.home.faq3A },
  { q: t.home.faq4Q, a: t.home.faq4A },
];

const getPreviewNavSections = (t: T): { label: string; items: { id: PreviewPageId; label: string; icon: typeof faTableCells }[] }[] => [
  { label: t.sidebar.shopSection, items: [
    { id: 'overview', label: t.sidebar.overview, icon: faTableCells },
    { id: 'bookings', label: t.sidebar.bookings, icon: faCalendar },
    { id: 'newBooking', label: t.sidebar.bookAppointment, icon: faPlusCircle },
    { id: 'services', label: t.sidebar.services, icon: faScissors },
  ]},
  { label: t.sidebar.manageSection, items: [
    { id: 'team', label: t.sidebar.team, icon: faUsers },
    { id: 'invites', label: t.sidebar.invites, icon: faUserPlus },
    { id: 'hours', label: t.sidebar.shopWorkingHours, icon: faClock },
    { id: 'customers', label: t.sidebar.customers, icon: faMagnifyingGlass },
  ]},
];

const getPreviewPages = (t: T): Record<PreviewPageId, { title: string; subtitle: string; rows: { icon: typeof faTableCells; label: string; sub: string }[] }> => ({
  overview: { title: t.home.previewGreeting, subtitle: t.home.previewGreetingSub, rows: [
    { icon: faCalendarCheck, label: t.home.previewTodayLabel, sub: t.home.previewTodaySub },
    { icon: faUsers, label: t.home.previewTeamLabel, sub: t.home.previewTeamSub },
  ]},
  bookings: { title: t.sidebar.bookings, subtitle: t.home.previewBookingsSubtitle, rows: [
    { icon: faCalendarCheck, label: t.home.previewBooking1Label, sub: t.home.previewBooking1Sub },
    { icon: faCalendarCheck, label: t.home.previewBooking2Label, sub: t.home.previewBooking2Sub },
  ]},
  newBooking: { title: t.sidebar.bookAppointment, subtitle: t.home.previewNewBookingSubtitle, rows: [
    { icon: faScissors, label: t.home.previewNewBookingStep1Label, sub: t.home.previewNewBookingStep1Sub },
    { icon: faCalendar, label: t.home.previewNewBookingStep2Label, sub: t.home.previewNewBookingStep2Sub },
  ]},
  services: { title: t.sidebar.services, subtitle: t.home.previewServicesSubtitle, rows: [
    { icon: faScissors, label: t.home.previewService1Label, sub: t.home.previewService1Sub },
    { icon: faScissors, label: t.home.previewService2Label, sub: t.home.previewService2Sub },
  ]},
  team: { title: t.sidebar.team, subtitle: t.home.previewTeamPageSubtitle, rows: [
    { icon: faUsers, label: t.home.previewTeamMember1Label, sub: t.home.previewTeamMember1Sub },
    { icon: faUsers, label: t.home.previewTeamMember2Label, sub: t.home.previewTeamMember2Sub },
  ]},
  invites: { title: t.sidebar.invites, subtitle: t.home.previewInvitesSubtitle, rows: [
    { icon: faUserPlus, label: t.home.previewInvite1Label, sub: t.home.previewInvite1Sub },
    { icon: faUserPlus, label: t.home.previewInvite2Label, sub: t.home.previewInvite2Sub },
  ]},
  hours: { title: t.sidebar.shopWorkingHours, subtitle: t.home.previewHoursSubtitle, rows: [
    { icon: faClock, label: t.home.previewHours1Label, sub: t.home.previewHours1Sub },
    { icon: faClock, label: t.home.previewHours2Label, sub: t.home.previewHours2Sub },
  ]},
  customers: { title: t.sidebar.customers, subtitle: t.home.previewCustomersSubtitle, rows: [
    { icon: faMagnifyingGlass, label: t.home.previewCustomer1Label, sub: t.home.previewCustomer1Sub },
    { icon: faUsers, label: t.home.previewCustomer2Label, sub: t.home.previewCustomer2Sub },
  ]},
  settings: { title: t.sidebar.shopSettings, subtitle: t.home.previewSettingsSubtitle, rows: [
    { icon: faGear, label: t.home.previewSetting1Label, sub: t.home.previewSetting1Sub },
    { icon: faGear, label: t.home.previewSetting2Label, sub: t.home.previewSetting2Sub },
  ]},
});

// Same icon as AppLayout.tsx's IconMenu, so the mockup's mobile header
// matches the real one exactly (not FontAwesome's evenly-spaced bars icon).
function PreviewMenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="7" x2="17" y2="7" />
      <line x1="3" y1="13" x2="13.5" y2="13" />
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** How far (in px) the preview card overlaps up into the bottom of the giant pill. */
const PREVIEW_OVERLAP = 380;

export default function HomePage() {
  const { t, language, toggleLanguage } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [previewPage, setPreviewPage] = useState<PreviewPageId>('overview');

  const steps = getSteps(t);
  const faqs = getFaqs(t);
  const previewNavSections = getPreviewNavSections(t);
  const previewPages = getPreviewPages(t);

  const navWrapperRef = useRef<HTMLDivElement>(null);
  const navRowRef = useRef<HTMLDivElement>(null);
  const navGlowRef = useRef<HTMLDivElement>(null);
  const navHeroRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let metrics = { slimHeight: 64, giantHeight: 600, triggerDistance: 1 };

    const measure = () => {
      const row = navRowRef.current;
      if (!row) return;

      const slimHeight = row.getBoundingClientRect().height;
      // The pill starts tall (most of the viewport height) at the top of the
      // page and shrinks back to the slim navbar as the user scrolls past it.
      const giantHeight = Math.min(window.innerHeight * 0.8, 820);
      const triggerDistance = Math.max(giantHeight - slimHeight, 1);
      metrics = { slimHeight, giantHeight, triggerDistance };

      // The nav row now floats in its own always-on-top layer, decoupled
      // from the pill body — push the hero copy down so it starts below it
      // instead of underneath it.
      if (navHeroRef.current) {
        navHeroRef.current.style.paddingTop = `${slimHeight + 24}px`;
      }

      if (previewRef.current) {
        // Natural (unclipped) bottom of the pill's own content, plus a small
        // gap — the card is never allowed to start above this, so it can
        // overlap the pill's empty bottom margin but can never crowd the
        // CTA button.
        const contentBottom = (navHeroRef.current?.getBoundingClientRect().height ?? 0) + 32;
        const topPad = Math.max(giantHeight - PREVIEW_OVERLAP, contentBottom, slimHeight + 24);
        previewRef.current.style.paddingTop = `${topPad}px`;
      }

      applyFrame();
    };

    const applyFrame = () => {
      const wrapper = navWrapperRef.current;
      const glow = navGlowRef.current;
      if (!wrapper || !glow) return;

      const progress = Math.min(Math.max(window.scrollY / metrics.triggerDistance, 0), 1);

      wrapper.style.height = `${lerp(metrics.giantHeight, metrics.slimHeight, progress)}px`;
      glow.style.opacity = `${1 - progress}`;

      // The preview card overlaps on top of the pill body while it's tall,
      // then settles back behind the (always-on-top) nav row. Since the nav
      // row is its own independent layer above both, it's never covered.
      if (previewRef.current) {
        previewRef.current.style.zIndex = progress < 1 ? '150' : '1';
      }
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        applyFrame();
        ticking = false;
      });
    };

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 150);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <div className="home-page">

      {/* ── Nav row — its own always-on-top layer, decoupled from the pill body
           below so it (and its links/buttons) can never end up hidden behind
           the preview card while it overlaps the pill. ─────────────────────── */}
      <nav className="home-nav-bar">
        <div className="home-container home-nav" ref={navRowRef}>

          <div className="home-nav-left">
            <Link to="/" className="home-nav-logo-link" aria-label="Bookly home">
              <span className="home-logo-text">Bookly</span>
            </Link>

            <div className="home-nav-links">
              <Link to="/about" className="home-nav-link">{t.home.aboutBadge || 'About'}</Link>
              <a href="#features" className="home-nav-link">{t.home.featuresBadge || 'Features'}</a>
              <a href="#how" className="home-nav-link">{t.home.howBadge || 'How It Works'}</a>
              <a href="#pricing" className="home-nav-link">{t.home.pricingBadge}</a>
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

      {/* ── Pill body (gradient + hero copy) — shrinks away behind the nav row on scroll ── */}
      <div className="home-nav-wrapper" ref={navWrapperRef}>
        <div className="home-nav-glow" ref={navGlowRef} />

        <div className="home-nav-hero" ref={navHeroRef}>
          <div className="home-hero-badge">
            <div className="home-hero-badge-avatars">
              <span className="home-hero-badge-avatar">M</span>
              <span className="home-hero-badge-avatar">S</span>
              <span className="home-hero-badge-avatar">J</span>
            </div>
            <span>{t.home.heroBadge}</span>
          </div>
          <h1 className="home-headline">
            {t.home.headline}
            <span className="home-headline-accent">{t.home.headlineAccent}</span>
          </h1>
          <div className="home-hero-ctas">
            <Link to="/register" className="home-btn-primary">
              {t.home.cta}
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Mobile sidebar (slides in right-to-left) ─────────────────────────────── */}
      <div className={`home-mobile-backdrop${menuOpen ? ' is-open' : ''}`} onClick={closeMenu} />
      <div className={`home-mobile-menu${menuOpen ? ' is-open' : ''}`}>
        <button className="home-mobile-close" onClick={closeMenu} aria-label="Close menu">
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <div className="home-mobile-links">
          <Link to="/about" className="home-mobile-link" onClick={closeMenu}>{t.home.aboutBadge || 'About'}</Link>
          <a href="#features" className="home-mobile-link" onClick={closeMenu}>{t.home.featuresBadge || 'Features'}</a>
          <a href="#how" className="home-mobile-link" onClick={closeMenu}>{t.home.howBadge || 'How It Works'}</a>
          <a href="#pricing" className="home-mobile-link" onClick={closeMenu}>{t.home.pricingBadge}</a>
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

      {/* ── Dashboard preview (overlaps up into the bottom of the pill) ─────────── */}
      <section className="home-preview" ref={previewRef}>
        <div className="home-container">
          <div className="home-preview-card">
            <div className="home-preview-card-header">
              <span className="home-preview-dot home-preview-dot--red" />
              <span className="home-preview-dot home-preview-dot--yellow" />
              <span className="home-preview-dot home-preview-dot--green" />
            </div>

            <div className="home-preview-card-body">
              {/* Mobile-only — the real app's own mobile top header
                  (components/AppLayout.tsx), reused exactly: hamburger button +
                  BOOKLY wordmark in a pill rounded only on the right, flush left.
                  Positioned so the drawer (below) can overlap it, same as the
                  real app's z-index relationship between the two. */}
              <header className="app-mobile-header">
                <button
                  className="hamburger-btn"
                  onClick={() => setPreviewMenuOpen(o => !o)}
                  aria-label={previewMenuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={previewMenuOpen}
                >
                  <PreviewMenuIcon />
                </button>
                <span className="app-mobile-brand">BOOKLY</span>
              </header>

              {/* Clickable, non-functional mockup of the real app sidebar — same
                  classes/CSS as components/Sidebar.tsx, for visual accuracy. */}
              <div className={`home-preview-sidebar${previewMenuOpen ? ' is-open' : ''}`}>
                <div className="sidebar-header">
                  <button
                    className="sidebar-back-link"
                    aria-label="Close menu"
                    onClick={() => setPreviewMenuOpen(false)}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                  <h4 className="sidebar-link-label">BOOKLY</h4>
                </div>

                <div className="sidebar-shop-name">hairology</div>

                {previewNavSections.map(section => (
                  <div key={section.label}>
                    <span className="sidebar-section-label">{section.label}</span>
                    {section.items.map(item => (
                      <button
                        key={item.id}
                        className={`sidebar-link${previewPage === item.id ? ' active' : ''}`}
                        onClick={() => { setPreviewPage(item.id); setPreviewMenuOpen(false); }}
                      >
                        <FontAwesomeIcon icon={item.icon} />
                        <span className="sidebar-link-label">{item.label}</span>
                      </button>
                    ))}
                  </div>
                ))}

                <button
                  className={`sidebar-link sidebar-bottom${previewPage === 'settings' ? ' active' : ''}`}
                  onClick={() => { setPreviewPage('settings'); setPreviewMenuOpen(false); }}
                >
                  <FontAwesomeIcon icon={faGear} />
                  <span className="sidebar-link-label">{t.sidebar.shopSettings}</span>
                </button>
                <button className="sidebar-logout sidebar-link">
                  <FontAwesomeIcon icon={faRightFromBracket} />
                  <span className="sidebar-link-label">{t.sidebar.logout}</span>
                </button>
              </div>

              {/* Backdrop — mobile only, closes the drawer on click. */}
              {previewMenuOpen && (
                <div className="home-preview-backdrop" onClick={() => setPreviewMenuOpen(false)} />
              )}

              <div className="home-preview-main">
                <div className="home-preview-greeting">
                  <div className="home-preview-avatar">
                    <FontAwesomeIcon icon={faStore} />
                  </div>
                  <div>
                    <h3>{previewPages[previewPage].title}</h3>
                    <p>{previewPages[previewPage].subtitle}</p>
                  </div>
                </div>
                <div className="home-preview-tiles">
                  {previewPages[previewPage].rows.map(row => (
                    <div key={row.label} className="home-preview-tile">
                      <FontAwesomeIcon icon={row.icon} className="home-preview-tile-icon" />
                      <div>
                        <h4>{row.label}</h4>
                        <p>{row.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="home-preview-hint">
            <FontAwesomeIcon icon={faArrowUp} />
            <span>{t.home.previewHint}</span>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section id="features" className="home-section">
        <div className="home-container">
          <div className="home-section-header">
            <span className="home-label">{t.home.featuresBadge || 'Features'}</span>
            <h2 className="home-section-title">{t.home.featuresTitle || 'Everything you need to run your shop'}</h2>
            <p className="home-section-sub">
              {t.home.featuresSub || 'Built for modern barbershops and salons that want to grow without the overhead.'}
            </p>
          </div>
          <div className="home-features-bento">

            {/* Tall left card — live booking notifications, styled as email
                notifications (subject + sender + preview), not chat bubbles */}
            <div className="home-feature-bento home-feature-bento--alerts">
              <div className="home-feature-bento-emails">
                <div className="home-feature-email">
                  <div className="home-feature-email-header">
                    <span className="home-feature-email-icon">
                      <FontAwesomeIcon icon={faEnvelope} />
                    </span>
                    <span className="home-feature-email-from">Bookly</span>
                    <span className="home-feature-email-time">{t.home.featureAlertsTimeAgo}</span>
                  </div>
                  <div className="home-feature-email-subject">{t.home.featureAlertsIncomingSubject}</div>
                  <div className="home-feature-email-preview">{t.home.featureAlertsIncoming}</div>
                </div>
                <div className="home-feature-email home-feature-email--confirmed">
                  <div className="home-feature-email-header">
                    <span className="home-feature-email-icon">
                      <FontAwesomeIcon icon={faEnvelope} />
                    </span>
                    <span className="home-feature-email-from">Bookly</span>
                    <span className="home-feature-email-time">{t.home.featureAlertsTimeNow}</span>
                  </div>
                  <div className="home-feature-email-subject">{t.home.featureAlertsConfirmedSubject}</div>
                  <div className="home-feature-email-preview">{t.home.featureAlertsConfirmed}</div>
                </div>
              </div>
              <div className="home-feature-bento-text">
                <h3>{t.home.featureAlertsTitle}</h3>
                <p>{t.home.featureAlertsDesc}</p>
              </div>
            </div>

            {/* Every service type, synced to one calendar */}
            <div className="home-feature-bento home-feature-bento--services">
              <div className="home-feature-chip-row">
                <span className="home-feature-chip">{t.home.featureChip1}</span>
                <span className="home-feature-chip">{t.home.featureChip2}</span>
                <span className="home-feature-chip home-feature-chip--on">{t.home.featureChip3}</span>
                <span className="home-feature-chip">{t.home.featureChip4}</span>
              </div>
              <div className="home-feature-bento-text">
                <span className="home-feature-bento-label">{t.home.featureServicesLabel}</span>
                <h3>{t.home.featureServicesTitle}</h3>
              </div>
            </div>

            {/* Always-open booking page */}
            <div className="home-feature-bento home-feature-bento--stat">
              <div className="home-feature-bento-icon">
                <FontAwesomeIcon icon={faClock} />
              </div>
              <div className="home-feature-bento-number">24/7</div>
              <p className="home-feature-bento-caption">{t.home.featureStatCaption}</p>
            </div>

            {/* Confirmation & cancellation emails */}
            <div className="home-feature-bento home-feature-bento--reminders">
              <div className="home-feature-checklist">
                <span className="home-feature-check-item"><FontAwesomeIcon icon={faCheck} /> {t.home.featureRemindersCheck1}</span>
                <span className="home-feature-check-item"><FontAwesomeIcon icon={faCheck} /> {t.home.featureRemindersCheck2}</span>
              </div>
              <div className="home-feature-bento-text">
                <span className="home-feature-bento-label">{t.home.featureRemindersLabel}</span>
                <h3>{t.home.featureRemindersTitle}</h3>
              </div>
            </div>

            {/* Any device, any time */}
            <div className="home-feature-bento home-feature-bento--channels">
              <div className="home-feature-bento-icons">
                <span className="home-feature-mini-icon"><FontAwesomeIcon icon={faGlobe} /></span>
                <span className="home-feature-mini-icon"><FontAwesomeIcon icon={faEnvelope} /></span>
                <span className="home-feature-mini-icon"><FontAwesomeIcon icon={faMobile} /></span>
                <span className="home-feature-mini-icon"><FontAwesomeIcon icon={faCalendarCheck} /></span>
              </div>
              <div className="home-feature-bento-text">
                <span className="home-feature-bento-label">{t.home.featureChannelsLabel}</span>
                <h3>{t.home.featureChannelsTitle}</h3>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────────── */}
      <section id="how" className="home-section">
        <div className="home-container">
          <div className="home-section-header">
            <span className="home-label">{t.home.howBadge || 'How It Works'}</span>
            <h2 className="home-section-title">{t.home.howTitle || 'Up and running in minutes'}</h2>
            <p className="home-section-sub">
              {t.home.howSub || 'Three simple steps to a fully automated booking experience.'}
            </p>
          </div>
          <div className="home-steps">
            {steps.map(s => (
              <div key={s.num} className="home-step">
                <div className="home-step-number">{s.num}</div>
                <h3 className="home-step-title">{s.title}</h3>
                <p className="home-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="home-section">
        <div className="home-container">
          <div className="home-section-header">
            <span className="home-label">{t.home.pricingBadge}</span>
            <h2 className="home-section-title">{t.home.pricingTitle}</h2>
            <p className="home-section-sub">{t.home.pricingSub}</p>
          </div>
          <div className="home-pricing-single">
            <div className="home-price-card home-price-card--pro">
              <h3 className="home-price-tier">{t.home.pricingPlanName}</h3>
              <p className="home-price-desc">{t.home.pricingPlanDesc}</p>
              <hr className="home-price-divider" />
              <ul className="home-price-features">
                <li><FontAwesomeIcon icon={faCheck} className="feat-check" /> {t.home.pricingFeature1}</li>
                <li><FontAwesomeIcon icon={faCheck} className="feat-check" /> {t.home.pricingFeature2}</li>
                <li><FontAwesomeIcon icon={faCheck} className="feat-check" /> {t.home.pricingFeature3}</li>
              </ul>
              <a href="mailto:nikostheodosis05@gmail.com" className="home-btn-primary home-price-cta">
                {t.home.pricingCta}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section id="faq" className="home-section">
        <div className="home-container home-faq">
          <div className="home-faq-intro">
            <h2 className="home-faq-title">{t.home.faqHeading}</h2>
            <p className="home-faq-sub">{t.home.faqSub}</p>
            <a href="mailto:nikostheodosis05@gmail.com" className="home-faq-contact">{t.home.faqContact}</a>
          </div>

          <div className="home-faq-list">
            {faqs.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={f.q}
                  className={`home-faq-item${isOpen ? ' home-faq-item--open' : ''}`}
                >
                  <button
                    className="home-faq-question"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span>{f.q}</span>
                    <span className="home-faq-toggle">
                      <FontAwesomeIcon icon={faPlus} />
                    </span>
                  </button>
                  <div className={`home-faq-answer-wrap${isOpen ? ' home-faq-answer-wrap--open' : ''}`}>
                    <p className="home-faq-answer">{f.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}