import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarCheck,
  faStore,
  faUsers,
  faLink,
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
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import Footer from '../components/Footer';
import Switch from '../components/Switch';
import { handleActivateKeyDown } from '../utils/a11y';
import '../styles/pages/home.css';
import '../styles/pages/sidebar.css';
import Wordmark from '../components/Wordmark';
import BrandText from '../components/BrandText';

// ─── Data ─────────────────────────────────────────────────────────────────────
// Dashboard preview mockup — a clickable, non-functional stand-in for the
// real app, matching components/Sidebar.tsx's link set and classes.
type PreviewPageId = 'overview' | 'bookings' | 'newBooking' | 'services' | 'team' | 'invites' | 'customers' | 'settings';

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
    { id: 'customers', label: t.sidebar.customers, icon: faMagnifyingGlass },
  ]},
];

// Fake but believable shop data for the mockup — not translated (except
// where noted), since digits/emails/names read the same in every language.
const PREVIEW_SHOP_NAME = 'Demo Barbershop';
const PREVIEW_TEAM_COUNT = 5;
const PREVIEW_SERVICES_COUNT = 6;
const PREVIEW_CUSTOMERS_COUNT = 312;
const PREVIEW_UPCOMING_COUNT = 4;

const PREVIEW_SERVICE_PRICES = ['€25', '€12'];

// ─── Booking wizard mock demo data ─────────────────────────────────────────
type WizardStep = 1 | 2 | 3 | 4;
const WIZARD_DEMO_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];
const WIZARD_UNAVAILABLE_SLOTS = new Set(['10:30', '14:00']);

const getPreviewPages = (t: T): Record<PreviewPageId, { title: string; subtitle: string }> => ({
  overview: { title: t.home.previewGreeting, subtitle: t.home.previewGreetingSub },
  bookings: { title: t.sidebar.bookings, subtitle: t.home.previewBookingsSubtitle },
  newBooking: { title: t.sidebar.bookAppointment, subtitle: t.home.previewNewBookingSubtitle },
  services: { title: t.sidebar.services, subtitle: t.home.previewServicesSubtitle },
  team: { title: t.sidebar.team, subtitle: t.home.previewTeamPageSubtitle },
  invites: { title: t.sidebar.invites, subtitle: t.home.previewInvitesSubtitle },
  customers: { title: t.sidebar.customers, subtitle: t.home.previewCustomersSubtitle },
  settings: { title: t.sidebar.shopSettings, subtitle: t.home.previewSettingsSubtitle },
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

/** "{brand}" in the headline becomes "Be Booked" with the Be slide-in (home.css). */
function HeroHeadline({ text }: { text: string }) {
  const [before, after] = text.split('{brand}');
  if (after === undefined) return <>{text}</>;
  return (
    <>
      {before.trimEnd()}
      <br />
      <span className="hero-brand">
        <span className="hero-brand-be-slot">
          <span className="hero-brand-be">Be</span>
        </span>{' '}
        <span className="hero-brand-booked">Booked</span>
      </span>
      {after}
    </>
  );
}

export default function HomePage() {
  const { t, language, toggleLanguage } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [previewPage, setPreviewPage] = useState<PreviewPageId>('overview');

  // Customers mock — real, typeable search input (purely local; doesn't filter the demo rows)
  const [customersSearch, setCustomersSearch] = useState('');

  // Invites mock — real add-member form fields (local only, not submitted anywhere)
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'staff' | 'owner'>('staff');

  // Settings mock — real shop-details form fields (local only, not saved anywhere)
  const [settingsName, setSettingsName] = useState(PREVIEW_SHOP_NAME);
  const [settingsSlug, setSettingsSlug] = useState('demo-barbershop');
  const [settingsDesc, setSettingsDesc] = useState(t.home.previewShopDesc);
  const [settingsPhone, setSettingsPhone] = useState('555-0100');
  const [settingsAddress, setSettingsAddress] = useState('123 Main St, Springfield');
  const [settingsTimezone, setSettingsTimezone] = useState('Europe/Athens');
  const [settingsActive, setSettingsActive] = useState(true);

  // New-booking wizard mock — click-through 4-step flow, local state only
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizardServiceIdx, setWizardServiceIdx] = useState<number | null>(null);
  const [wizardStaffIdx, setWizardStaffIdx] = useState<number | null>(null); // -1 = "no preference"
  const [wizardDate, setWizardDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [wizardTime, setWizardTime] = useState('');
  const [wizardName, setWizardName] = useState('');
  const [wizardPhone, setWizardPhone] = useState('');
  const [wizardEmail, setWizardEmail] = useState('');
  const [wizardNotes, setWizardNotes] = useState('');
  const [wizardDone, setWizardDone] = useState(false);

  const resetWizard = () => {
    setWizardStep(1);
    setWizardServiceIdx(null);
    setWizardStaffIdx(null);
    setWizardDate(new Date().toISOString().split('T')[0]);
    setWizardTime('');
    setWizardName('');
    setWizardPhone('');
    setWizardEmail('');
    setWizardNotes('');
    setWizardDone(false);
  };

  const steps = getSteps(t);
  const faqs = getFaqs(t);
  const previewNavSections = getPreviewNavSections(t);
  const previewPages = getPreviewPages(t);
  const wizardServices = [
    { name: t.home.previewService1Name, duration: t.home.previewService1Duration, price: PREVIEW_SERVICE_PRICES[0] },
    { name: t.home.previewService2Name, duration: t.home.previewService2Duration, price: PREVIEW_SERVICE_PRICES[1] },
  ];
  const wizardStaff = [t.home.previewCalStaff1, t.home.previewCalStaff2, t.home.previewCalStaff3];

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
            <Link to="/" className="home-nav-logo-link" aria-label="BeBooked home">
              <span className="home-logo-text"><Wordmark /></span>
            </Link>

            <div className="home-nav-links">
              <Link to="/about" className="home-nav-link">{t.home.aboutBadge || 'About'}</Link>
              <a href="#features" className="home-nav-link">{t.home.productBadge || 'Product'}</a>
              <a href="#pricing" className="home-nav-link">{t.home.pricingBadge}</a>
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
            <HeroHeadline text={t.home.headline} />
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
          <a href="#features" className="home-mobile-link" onClick={closeMenu}>{t.home.productBadge || 'Product'}</a>
          <a href="#pricing" className="home-mobile-link" onClick={closeMenu}>{t.home.pricingBadge}</a>
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
                  BeBooked wordmark in a pill rounded only on the right, flush left.
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
                <span className="app-mobile-brand"><Wordmark /></span>
              </header>

              {/* Clickable, non-functional mockup of the real app sidebar — same
                  classes/CSS as components/Sidebar.tsx, for visual accuracy. */}
              <div className={`home-preview-sidebar${previewMenuOpen ? ' is-open' : ''}`}>
                <div className="sidebar-header">
                  <h4 className="sidebar-link-label"><Wordmark /></h4>
                  <button
                    className="sidebar-back-link"
                    aria-label="Close menu"
                    onClick={() => setPreviewMenuOpen(false)}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                </div>

                <div className="sidebar-shop-name">{PREVIEW_SHOP_NAME}</div>

                {previewNavSections.map(section => (
                  <div key={section.label}>
                    <span className="sidebar-section-label">{section.label}</span>
                    {section.items.map(item => (
                      <button
                        key={item.id}
                        className={`sidebar-link${previewPage === item.id ? ' active' : ''}`}
                        onClick={() => {
                          setPreviewPage(item.id);
                          setPreviewMenuOpen(false);
                          if (item.id === 'newBooking') resetWizard();
                        }}
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
                    <p><BrandText text={previewPages[previewPage].subtitle} muted /></p>
                  </div>
                </div>
                {previewPage === 'overview' ? (
                  // Mirrors the real ShopOverviewPage.tsx: shop header + role/status
                  // badges, team/services/customers stat row, today's + upcoming
                  // bookings lists — same arrangement and fake-but-believable data.
                  <div className="home-preview-overview-card">
                    <div className="home-preview-overview-header">
                      <h4 className="home-preview-overview-name">{PREVIEW_SHOP_NAME}</h4>
                      <div className="home-preview-badges">
                        <span className="badge badge--accent">{t.team.roles.owner}</span>
                        <span className="badge badge--success">{t.shops.active}</span>
                      </div>
                    </div>

                    <div className="home-preview-stats">
                      <div className="home-preview-stat">
                        <span className="home-preview-stat-label">{t.overview.teamLabel}</span>
                        <span className="home-preview-stat-value">{PREVIEW_TEAM_COUNT}</span>
                      </div>
                      <div className="home-preview-stat">
                        <span className="home-preview-stat-label">{t.overview.servicesLabel}</span>
                        <span className="home-preview-stat-value">{PREVIEW_SERVICES_COUNT}</span>
                      </div>
                      <div className="home-preview-stat">
                        <span className="home-preview-stat-label">{t.overview.customersLabel}</span>
                        <span className="home-preview-stat-value">{PREVIEW_CUSTOMERS_COUNT}</span>
                      </div>
                    </div>

                    <div className="home-preview-overview-section">
                      <h5 className="home-preview-overview-section-title">{t.overview.todaysBookings}</h5>
                      <div className="home-preview-booking-list">
                        <div
                          className="home-preview-booking-row home-preview-booking-row--clickable"
                          role="button"
                          tabIndex={0}
                          onClick={() => setPreviewPage('bookings')}
                          onKeyDown={handleActivateKeyDown(() => setPreviewPage('bookings'))}
                        >
                          <span className="home-preview-booking-icon"><FontAwesomeIcon icon={faCalendarCheck} /></span>
                          <div>
                            <p className="home-preview-booking-title">{t.home.previewBooking1Label}</p>
                            <p className="home-preview-booking-sub">{t.home.previewBooking1Sub}</p>
                          </div>
                        </div>
                        <div
                          className="home-preview-booking-row home-preview-booking-row--clickable"
                          role="button"
                          tabIndex={0}
                          onClick={() => setPreviewPage('bookings')}
                          onKeyDown={handleActivateKeyDown(() => setPreviewPage('bookings'))}
                        >
                          <span className="home-preview-booking-icon"><FontAwesomeIcon icon={faCalendarCheck} /></span>
                          <div>
                            <p className="home-preview-booking-title">{t.home.previewBooking2Label}</p>
                            <p className="home-preview-booking-sub">{t.home.previewBooking2Sub}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="home-preview-overview-section">
                      <h5 className="home-preview-overview-section-title">
                        {t.overview.upcomingBookings} ({PREVIEW_UPCOMING_COUNT})
                      </h5>
                      <div className="home-preview-booking-list">
                        <div
                          className="home-preview-booking-row home-preview-booking-row--clickable"
                          role="button"
                          tabIndex={0}
                          onClick={() => setPreviewPage('bookings')}
                          onKeyDown={handleActivateKeyDown(() => setPreviewPage('bookings'))}
                        >
                          <span className="home-preview-booking-icon"><FontAwesomeIcon icon={faCalendarCheck} /></span>
                          <div>
                            <p className="home-preview-booking-title">{t.home.previewUpcoming1Label}</p>
                            <p className="home-preview-booking-sub">{t.home.previewUpcoming1Sub}</p>
                          </div>
                        </div>
                        <div
                          className="home-preview-booking-row home-preview-booking-row--clickable"
                          role="button"
                          tabIndex={0}
                          onClick={() => setPreviewPage('bookings')}
                          onKeyDown={handleActivateKeyDown(() => setPreviewPage('bookings'))}
                        >
                          <span className="home-preview-booking-icon"><FontAwesomeIcon icon={faCalendarCheck} /></span>
                          <div>
                            <p className="home-preview-booking-title">{t.home.previewUpcoming2Label}</p>
                            <p className="home-preview-booking-sub">{t.home.previewUpcoming2Sub}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : previewPage === 'customers' ? (
                  // Mirrors ShopCustomersPage.tsx: search box + data table + pagination.
                  <div className="home-preview-customers">
                    <input
                      type="text"
                      className="home-preview-input home-preview-search-input"
                      placeholder={t.customers.searchPlaceholder}
                      value={customersSearch}
                      onChange={(e) => setCustomersSearch(e.target.value)}
                    />
                    <div className="home-preview-table-card">
                      <table className="home-preview-table">
                        <thead>
                          <tr>
                            <th>{t.customers.nameCol}</th>
                            <th>{t.customers.phoneCol}</th>
                            <th>{t.customers.emailCol}</th>
                            <th>{t.customers.addedCol}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Sarah M.</td>
                            <td>555-0142</td>
                            <td>sarah.m@example.com</td>
                            <td>2025</td>
                          </tr>
                          <tr>
                            <td>James O.</td>
                            <td>555-0198</td>
                            <td>james.o@example.com</td>
                            <td>2025</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="home-preview-pagination">
                      <button type="button" disabled>{t.customers.prevPage}</button>
                      <span>{t.customers.pageOf.replace('{page}', '1').replace('{total}', '32')}</span>
                      <button type="button" disabled>{t.customers.nextPage}</button>
                    </div>
                  </div>
                ) : previewPage === 'team' ? (
                  // Mirrors ShopTeamPage.tsx: a data table with a color-coded role pill.
                  <div className="home-preview-table-card">
                    <table className="home-preview-table">
                      <thead>
                        <tr>
                          <th>{t.team.email}</th>
                          <th>{t.team.role}</th>
                          <th>{t.team.joined}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>marcus@demo.shop</td>
                          <td><span className="badge badge--accent">{t.team.roles.owner}</span></td>
                          <td>2024</td>
                        </tr>
                        <tr>
                          <td>sofia@demo.shop</td>
                          <td><span className="badge badge--neutral">{t.team.roles.staff}</span></td>
                          <td>2025</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : previewPage === 'invites' ? (
                  // Mirrors ShopInvitesPage.tsx: an "add member" form card above a
                  // pending-invites table with role + status pills.
                  <div className="home-preview-invites">
                    <div className="home-preview-invite-form-card">
                      <h5 className="home-preview-overview-section-title">{t.invites.addMember}</h5>
                      <div className="home-preview-invite-fields">
                        <div className="home-preview-form-group">
                          <label>{t.invites.nameLabel}</label>
                          <input
                            type="text"
                            className="home-preview-input"
                            placeholder={t.invites.namePlaceholder}
                            value={inviteName}
                            onChange={(e) => setInviteName(e.target.value)}
                          />
                        </div>
                        <div className="home-preview-form-group">
                          <label>{t.invites.emailLabel}</label>
                          <input
                            type="email"
                            className="home-preview-input"
                            placeholder="staff@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                          />
                        </div>
                        <div className="home-preview-form-group">
                          <label>{t.invites.roleLabel}</label>
                          <select
                            className="home-preview-input"
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as 'staff' | 'owner')}
                          >
                            <option value="staff">{t.invites.roles.staff}</option>
                            <option value="owner">{t.invites.roles.owner}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="home-preview-table-card">
                      <table className="home-preview-table">
                        <thead>
                          <tr>
                            <th>{t.invites.nameLabel}</th>
                            <th>{t.invites.roleLabel}</th>
                            <th>{t.invites.statusLabel}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>{t.home.previewInviteRowName1}</td>
                            <td><span className="badge badge--neutral">{t.invites.roles.staff}</span></td>
                            <td><span className="badge badge--warning">{t.invites.status.pending}</span></td>
                          </tr>
                          <tr>
                            <td>{t.home.previewInviteRowName2}</td>
                            <td><span className="badge badge--neutral">{t.invites.roles.staff}</span></td>
                            <td><span className="badge badge--neutral">{t.invites.notSentYet}</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : previewPage === 'settings' ? (
                  // Mirrors ShopSettingsPage.tsx: header with badges, icon-labeled
                  // sections, and a red-tinted danger zone.
                  <div className="home-preview-overview-card">
                    <div className="home-preview-overview-header">
                      <h4 className="home-preview-overview-name">{PREVIEW_SHOP_NAME}</h4>
                      <div className="home-preview-badges">
                        <span className="badge badge--accent">{t.team.roles.owner}</span>
                        <span className="badge badge--success">{t.shops.active}</span>
                      </div>
                    </div>

                    <div className="home-preview-settings-section">
                      <h5 className="home-preview-overview-section-title">
                        <FontAwesomeIcon icon={faStore} /> {t.shopSettings.shopDetails}
                      </h5>
                      <div className="home-preview-form-group">
                        <label>{t.shops.name}</label>
                        <input
                          type="text"
                          className="home-preview-input"
                          value={settingsName}
                          onChange={(e) => setSettingsName(e.target.value)}
                        />
                      </div>
                      <div className="home-preview-form-group">
                        <label>{t.shops.slug}</label>
                        <input
                          type="text"
                          className="home-preview-input"
                          value={settingsSlug}
                          onChange={(e) => setSettingsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        />
                      </div>
                      <div className="home-preview-form-group">
                        <label>{t.shops.description}</label>
                        <textarea
                          className="home-preview-input home-preview-textarea"
                          rows={2}
                          value={settingsDesc}
                          onChange={(e) => setSettingsDesc(e.target.value)}
                        />
                      </div>
                      <div className="home-preview-form-group">
                        <label>{t.shops.phone}</label>
                        <input
                          type="text"
                          className="home-preview-input"
                          value={settingsPhone}
                          onChange={(e) => setSettingsPhone(e.target.value)}
                        />
                      </div>
                      <div className="home-preview-form-group">
                        <label>{t.shops.address}</label>
                        <input
                          type="text"
                          className="home-preview-input"
                          value={settingsAddress}
                          onChange={(e) => setSettingsAddress(e.target.value)}
                        />
                      </div>
                      <div className="home-preview-form-group">
                        <label>{t.shops.timezone}</label>
                        <select
                          className="home-preview-input"
                          value={settingsTimezone}
                          onChange={(e) => setSettingsTimezone(e.target.value)}
                        >
                          <option value="Europe/Athens">Europe/Athens</option>
                          <option value="Europe/London">Europe/London</option>
                          <option value="America/New_York">America/New_York</option>
                        </select>
                      </div>
                    </div>

                    <div className="home-preview-settings-section">
                      <h5 className="home-preview-overview-section-title">
                        <FontAwesomeIcon icon={faGear} /> {t.shopSettings.configuration}
                      </h5>
                      <div className="home-preview-wh-row">
                        <span>{t.shops.active}</span>
                        <Switch checked={settingsActive} onChange={setSettingsActive} />
                      </div>
                    </div>

                    <div className="home-preview-settings-section home-preview-settings-section--danger">
                      <h5 className="home-preview-overview-section-title">
                        <FontAwesomeIcon icon={faTriangleExclamation} /> {t.shops.dangerZone}
                      </h5>
                      <p className="home-preview-danger-desc">{t.shops.dangerDesc}</p>
                    </div>
                  </div>
                ) : previewPage === 'services' ? (
                  // Mirrors ShopServicesPage.tsx: a vertical stack of service cards
                  // with a status pill, plus a dashed "add service" card.
                  <div className="home-preview-services-list">
                    <div className="home-preview-service-row">
                      <div className="home-preview-service-row-top">
                        <h4>{t.home.previewService1Name}</h4>
                        <span className="badge badge--success">{t.services.active}</span>
                      </div>
                      <p className="home-preview-service-desc">{t.home.previewService1Desc}</p>
                      <p className="home-preview-service-meta">{t.home.previewService1Duration}<span className="home-preview-service-sep">·</span>{PREVIEW_SERVICE_PRICES[0]}</p>
                    </div>
                    <div className="home-preview-service-row">
                      <div className="home-preview-service-row-top">
                        <h4>{t.home.previewService2Name}</h4>
                        <span className="badge badge--success">{t.services.active}</span>
                      </div>
                      <p className="home-preview-service-desc">{t.home.previewService2Desc}</p>
                      <p className="home-preview-service-meta">{t.home.previewService2Duration}<span className="home-preview-service-sep">·</span>{PREVIEW_SERVICE_PRICES[1]}</p>
                    </div>
                    <div className="home-preview-service-add">
                      <FontAwesomeIcon icon={faPlus} />
                      <span>{t.services.addService}</span>
                    </div>
                  </div>
                ) : previewPage === 'newBooking' ? (
                  // Mirrors OwnerBookingWizard.tsx: a real click-through 4-step flow
                  // (service → staff → date & time → your details) with demo data —
                  // fully interactive locally, but never calls the real API.
                  <div className="home-preview-wizard">
                    <div className="home-preview-wizard-steps">
                      {[t.public.service, t.public.staff, t.public.dateTime, t.public.yourDetails].map((label, i) => {
                        const stepNum = (i + 1) as WizardStep;
                        const isCompleted = wizardStep > stepNum;
                        const isActive = wizardStep === stepNum;
                        return (
                          <button
                            key={label}
                            type="button"
                            className={`home-preview-wizard-step${isActive ? ' home-preview-wizard-step--active' : ''}${isCompleted ? ' home-preview-wizard-step--completed' : ''}`}
                            onClick={() => { if (isCompleted) setWizardStep(stepNum); }}
                            disabled={!isCompleted}
                          >
                            <span className="home-preview-wizard-step-number">
                              {isCompleted ? <FontAwesomeIcon icon={faCheck} /> : stepNum}
                            </span>
                            <span className="home-preview-wizard-step-label">{label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {wizardStep === 1 && (
                      <div className="home-preview-services-grid">
                        {wizardServices.map((s, i) => (
                          <button
                            key={s.name}
                            type="button"
                            className="home-preview-service-card home-preview-service-card--selectable"
                            onClick={() => { setWizardServiceIdx(i); setWizardStep(2); }}
                          >
                            <div className="home-preview-service-card-header">
                              <h4>{s.name}</h4>
                              <span className="home-preview-service-price">{s.price}</span>
                            </div>
                            <span className="home-preview-service-duration"><FontAwesomeIcon icon={faClock} /> {s.duration}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div className="home-preview-wizard-panel">
                        {wizardServiceIdx !== null && (
                          <p className="home-preview-wizard-context">
                            {t.public.serviceContext} <strong>{wizardServices[wizardServiceIdx].name}</strong>
                          </p>
                        )}
                        <div className="home-preview-team-grid">
                          {wizardStaff.map((name, i) => (
                            <button
                              key={name}
                              type="button"
                              className="home-preview-team-card"
                              onClick={() => { setWizardStaffIdx(i); setWizardStep(3); }}
                            >
                              <span className="home-preview-team-avatar">{name.charAt(0)}</span>
                              <span className="home-preview-team-name">{name}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            className="home-preview-team-card"
                            onClick={() => { setWizardStaffIdx(-1); setWizardStep(3); }}
                          >
                            <span className="home-preview-team-avatar"><FontAwesomeIcon icon={faUsers} /></span>
                            <span className="home-preview-team-name">{t.public.noPreference}</span>
                          </button>
                        </div>
                        <div className="home-preview-wizard-actions">
                          <button type="button" className="btn btn--secondary" onClick={() => setWizardStep(1)}>{t.public.back}</button>
                        </div>
                      </div>
                    )}

                    {wizardStep === 3 && (
                      <div className="home-preview-wizard-panel">
                        {wizardServiceIdx !== null && (
                          <p className="home-preview-wizard-context">
                            {t.public.serviceContext} <strong>{wizardServices[wizardServiceIdx].name}</strong>
                            {wizardStaffIdx !== null && wizardStaffIdx >= 0 && (
                              <> · {t.public.staffContext} <strong>{wizardStaff[wizardStaffIdx]}</strong></>
                            )}
                          </p>
                        )}
                        <div className="home-preview-form-group">
                          <label>{t.public.date}</label>
                          <input
                            type="date"
                            className="home-preview-input"
                            value={wizardDate}
                            onChange={(e) => setWizardDate(e.target.value)}
                          />
                        </div>
                        <div className="home-preview-slots-grid">
                          {WIZARD_DEMO_SLOTS.map((slot) => {
                            const unavailable = WIZARD_UNAVAILABLE_SLOTS.has(slot);
                            return (
                              <button
                                key={slot}
                                type="button"
                                className={`home-preview-slot${wizardTime === slot ? ' home-preview-slot--selected' : ''}${unavailable ? ' home-preview-slot--disabled' : ''}`}
                                disabled={unavailable}
                                onClick={() => setWizardTime(slot)}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                        <div className="home-preview-wizard-actions">
                          <button type="button" className="btn btn--secondary" onClick={() => setWizardStep(2)}>{t.public.back}</button>
                          {wizardDate && wizardTime && (
                            <button type="button" className="btn" onClick={() => setWizardStep(4)}>{t.public.continue}</button>
                          )}
                        </div>
                      </div>
                    )}

                    {wizardStep === 4 && (
                      wizardDone ? (
                        <div className="home-preview-wizard-success">
                          <span className="home-preview-wizard-success-icon"><FontAwesomeIcon icon={faCheck} /></span>
                          <p>{t.public.bookingConfirmed}</p>
                          <button type="button" className="btn" onClick={resetWizard}>{t.bookings.newBookingTitle}</button>
                        </div>
                      ) : (
                        <div className="home-preview-wizard-panel">
                          {wizardServiceIdx !== null && (
                            <p className="home-preview-wizard-context">
                              {t.public.serviceContext} <strong>{wizardServices[wizardServiceIdx].name}</strong>
                              {wizardStaffIdx !== null && wizardStaffIdx >= 0 && (
                                <> · {t.public.staffContext} <strong>{wizardStaff[wizardStaffIdx]}</strong></>
                              )}
                              {' · '}<strong>{wizardDate}</strong> {t.public.atLabel} <strong>{wizardTime}</strong>
                            </p>
                          )}
                          <div className="home-preview-form-group">
                            <label>{t.public.phoneLabel}</label>
                            <input
                              type="tel"
                              className="home-preview-input"
                              placeholder={t.bookings.phoneSearchHint}
                              value={wizardPhone}
                              onChange={(e) => setWizardPhone(e.target.value)}
                            />
                          </div>
                          <div className="home-preview-form-group">
                            <label>{t.public.nameLabel}</label>
                            <input
                              type="text"
                              className="home-preview-input"
                              placeholder={t.public.namePlaceholder}
                              value={wizardName}
                              onChange={(e) => setWizardName(e.target.value)}
                            />
                          </div>
                          <div className="home-preview-form-group">
                            <label>{t.public.emailLabel}</label>
                            <input
                              type="email"
                              className="home-preview-input"
                              placeholder={t.public.emailPlaceholder}
                              value={wizardEmail}
                              onChange={(e) => setWizardEmail(e.target.value)}
                            />
                          </div>
                          <div className="home-preview-form-group">
                            <label>{t.public.notesLabel}</label>
                            <textarea
                              className="home-preview-input home-preview-textarea"
                              rows={2}
                              placeholder={t.public.notesPlaceholder}
                              value={wizardNotes}
                              onChange={(e) => setWizardNotes(e.target.value)}
                            />
                          </div>
                          <div className="home-preview-wizard-actions">
                            <button type="button" className="btn btn--secondary" onClick={() => setWizardStep(3)}>{t.public.back}</button>
                            <button
                              type="button"
                              className="btn"
                              disabled={wizardName.trim() === '' || wizardPhone.trim() === ''}
                              onClick={() => setWizardDone(true)}
                            >
                              {t.bookings.createBooking}
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  // bookings — mirrors ShopBookingsPage.tsx: a mini time-grid
                  // calendar with a few color-coded booking blocks per staff column.
                  <div className="home-preview-cal-grid">
                    <div className="home-preview-cal-header-row">
                      <div className="home-preview-cal-gutter-cell" />
                      <div className="home-preview-cal-col-header">{t.home.previewCalStaff1}</div>
                      <div className="home-preview-cal-col-header">{t.home.previewCalStaff2}</div>
                      <div className="home-preview-cal-col-header">{t.home.previewCalStaff3}</div>
                    </div>
                    <div className="home-preview-cal-body">
                      <div className="home-preview-cal-gutter">
                        <span className="home-preview-cal-hour-label">09:00</span>
                        <span className="home-preview-cal-hour-label">10:00</span>
                        <span className="home-preview-cal-hour-label">11:00</span>
                        <span className="home-preview-cal-hour-label">12:00</span>
                        <span className="home-preview-cal-hour-label">13:00</span>
                      </div>
                      <div className="home-preview-cal-col">
                        <div className="home-preview-cal-block home-preview-cal-block--confirmed" style={{ top: '10%', height: '28%' }}>
                          <span className="home-preview-cal-block-name">{t.home.previewCalBlock1Name}</span>
                          <span className="home-preview-cal-block-service">{t.home.previewCalBlock1Service}</span>
                        </div>
                        <div className="home-preview-cal-block home-preview-cal-block--pending" style={{ top: '55%', height: '28%' }}>
                          <span className="home-preview-cal-block-name">{t.home.previewCalBlock2Name}</span>
                          <span className="home-preview-cal-block-service">{t.home.previewCalBlock2Service}</span>
                        </div>
                      </div>
                      <div className="home-preview-cal-col">
                        <div className="home-preview-cal-block home-preview-cal-block--completed" style={{ top: '30%', height: '28%' }}>
                          <span className="home-preview-cal-block-name">{t.home.previewCalBlock3Name}</span>
                          <span className="home-preview-cal-block-service">{t.home.previewCalBlock3Service}</span>
                        </div>
                      </div>
                      <div className="home-preview-cal-col">
                        <div className="home-preview-cal-block home-preview-cal-block--canceled" style={{ top: '15%', height: '28%' }}>
                          <span className="home-preview-cal-block-name">{t.home.previewCalBlock4Name}</span>
                          <span className="home-preview-cal-block-service">{t.home.previewCalBlock4Service}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                    <span className="home-feature-email-from brand-wordmark brand-wordmark--muted"><Wordmark /></span>
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
                    <span className="home-feature-email-from brand-wordmark brand-wordmark--muted"><Wordmark /></span>
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
                <span className="home-feature-mini-icon"><FontAwesomeIcon icon={faLink} /></span>
                <span className="home-feature-mini-icon"><FontAwesomeIcon icon={faInstagram} /></span>
                <span className="home-feature-mini-icon"><FontAwesomeIcon icon={faWhatsapp} /></span>
                <span className="home-feature-mini-icon"><FontAwesomeIcon icon={faGlobe} /></span>
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