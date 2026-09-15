import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarCheck,
  faStore,
  faUsers,
  faMobile,
  faChartLine,
  faUserPlus,
  faGear,
  faArrowRight,
  faStar,
  faSun,
  faMoon,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faTwitter, faFacebookF } from '@fortawesome/free-brands-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import '../styles/pages/home.css';

// ─── Data ─────────────────────────────────────────────────────────────────────
const features = [
  { icon: faCalendarCheck, title: 'Online Booking', desc: 'Let clients book 24/7 from any device, with instant email confirmations.' },
  { icon: faStore, title: 'Shop Management', desc: 'Manage staff, services, and availability from one clean dashboard.' },
  { icon: faUsers, title: 'Team Management', desc: 'Assign roles, track performance, and coordinate schedules across your entire team.' },
  { icon: faMobile, title: 'Mobile-Ready', desc: 'A seamless experience on every screen — your clients book on the go, effortlessly.' },
  { icon: faChartLine, title: 'Analytics', desc: 'Track peak hours and client retention with clear, actionable reports.' },
];

const steps = [
  { num: '1', icon: faUserPlus, title: 'Create your account', desc: 'Sign up in seconds — it\'s free, no credit card required.' },
  { num: '2', icon: faGear, title: 'Set up your shop', desc: 'Add your services, set your hours, and invite your team — all in under 10 minutes.' },
  { num: '3', icon: faCalendarCheck, title: 'Accept bookings', desc: 'Share your booking link and start receiving real appointments immediately.' },
];

const testimonials = [
  { quote: 'Bookly completely transformed how we run our barbershop. Clients love the easy online booking and we\'ve cut no-shows by over 60%.', name: 'Marcus Thompson', role: 'Owner, The Sharp Cut', initials: 'MT' },
  { quote: 'We went from a messy paper calendar to a fully automated system in one afternoon. The dashboard is clean and our whole team uses it daily.', name: 'Sofia Rivera', role: 'Manager, Studio Glam', initials: 'SR' },
  { quote: 'Our clients book themselves in seconds now, and the email confirmations mean almost nobody forgets their appointment anymore.', name: 'James Okafor', role: 'Owner, Fade Culture', initials: 'JO' },
];

// ─── Component ─────────────────────────────────────────────────────────────────

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const { t, language, toggleLanguage } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const heroRef = useRef<HTMLElement>(null);
  const navWrapperRef = useRef<HTMLElement>(null);
  const navRowRef = useRef<HTMLDivElement>(null);
  const navLogoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const metrics = {
      active: false,
      slimHeight: 64,
      giantHeight: 500,
      width: 1100,
      slimFontSize: 15.2, giantFontSize: 112,
      triggerDistance: 1,
    };

    const measure = () => {
      const wrapper = navWrapperRef.current;
      const row = navRowRef.current;
      const logo = navLogoRef.current;
      if (!wrapper || !row || !logo) return;

      metrics.active = true;
      wrapper.classList.add('is-morphing');

      metrics.slimHeight = row.getBoundingClientRect().height;
      metrics.width = Math.min(Math.max(window.innerWidth * 0.8, 280), 1400);

      metrics.giantHeight = Math.min(window.innerHeight * 0.5, 620);

      metrics.slimFontSize = 24;
      metrics.giantFontSize = Math.min(112, window.innerWidth * 0.28);

      // Tied to the pill's own shrink distance (not the whole hero section) so the
      // page content below scrolls up in lockstep — the pill never overlaps it.
      metrics.triggerDistance = Math.max(metrics.giantHeight - metrics.slimHeight, 1);

      wrapper.style.width = `${metrics.width}px`;
      applyFrame();
    };

    const applyFrame = () => {
      const wrapper = navWrapperRef.current;
      const logo = navLogoRef.current;
      if (!wrapper || !logo || !metrics.active) return;

      const progress = Math.min(Math.max(window.scrollY / metrics.triggerDistance, 0), 1);

      wrapper.style.height = `${lerp(metrics.giantHeight, metrics.slimHeight, progress)}px`;
      logo.style.fontSize = `${lerp(metrics.giantFontSize, metrics.slimFontSize, progress)}px`;
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

      {/* ── Floating Nav (doubles as the hero's giant pill at the top of the page) ── */}
      <nav className="home-nav-wrapper" ref={navWrapperRef}>
        <div className="home-nav-logo" ref={navLogoRef} aria-hidden="true">
          <span className="home-logo-text">Bookly</span>
        </div>

        <div className="home-container home-nav" ref={navRowRef}>

          <div className="home-nav-links">
            <a href="#features" className="home-nav-link">{t.home.featuresBadge || 'Features'}</a>
            <a href="#how" className="home-nav-link">{t.home.howBadge || 'How It Works'}</a>
          </div>

          <div className="home-nav-right">
            <button
              className="home-nav-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
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
            <Link to="/register">
              <button className="home-btn-primary home-btn-primary--sm">{t.home.cta}</button>
            </Link>
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

      {/* ── Mobile sidebar (slides in right-to-left) ─────────────────────────────── */}
      <div className={`home-mobile-backdrop${menuOpen ? ' is-open' : ''}`} onClick={closeMenu} />
      <div className={`home-mobile-menu${menuOpen ? ' is-open' : ''}`}>
        <button className="home-mobile-close" onClick={closeMenu} aria-label="Close menu">
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <div className="home-mobile-links">
          <a href="#features" className="home-mobile-link" onClick={closeMenu}>{t.home.featuresBadge || 'Features'}</a>
          <a href="#how" className="home-mobile-link" onClick={closeMenu}>{t.home.howBadge || 'How It Works'}</a>
        </div>

        <div className="home-mobile-bottom">
          <div className="home-mobile-actions">
            <Link to="/login" className="home-mobile-link" onClick={closeMenu}>{t.home.signIn}</Link>
            <Link to="/register" onClick={closeMenu}>
              <button className="home-btn-primary home-btn-primary--sm">
                {t.home.cta} <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </Link>
          </div>

          <div className="home-mobile-toggles">
            <button
              className="home-nav-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
            </button>
            <button className="home-nav-toggle home-nav-toggle--lang" onClick={toggleLanguage} aria-label="Toggle language">
              {language === 'el' ? 'EL' : 'EN'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="home-hero" ref={heroRef}>
        <h1 className="home-tagline">{t.home.sub}</h1>
        <div className="home-hero-ctas">
          <Link to="/register">
            <button className="home-btn-primary">
              {t.home.cta}
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </Link>
          <button className="home-btn-ghost">{t.home.demo || 'See Demo'}</button>
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
          <div className="home-features-grid">
            {features.map(f => (
              <div key={f.title} className="home-feature-card">
                <div className="home-feature-icon">
                  <FontAwesomeIcon icon={f.icon} />
                </div>
                <h3 className="home-feature-title">{f.title}</h3>
                <p className="home-feature-desc">{f.desc}</p>
              </div>
            ))}
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

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section className="home-section">
        <div className="home-container">
          <div className="home-section-header">
            <span className="home-label">{t.home.testimonialsBadge || 'Testimonials'}</span>
            <h2 className="home-section-title">{t.home.testimonialsTitle || 'Loved by shop owners'}</h2>
            <p className="home-section-sub">
              {t.home.testimonialsSub || 'Real results from real barbershops and salons using Bookly every day.'}
            </p>
          </div>
          <div className="home-testimonials-grid">
            {testimonials.map(t => (
              <div key={t.name} className="home-testimonial-card">
                <div className="home-testimonial-stars">
                  {[...Array(5)].map((_, i) => <FontAwesomeIcon key={i} icon={faStar} style={{ marginRight: '0.2rem' }} />)}
                </div>
                <p className="home-testimonial-quote">"{t.quote}"</p>
                <div className="home-testimonial-author">
                  <div className="home-testimonial-avatar">{t.initials}</div>
                  <div>
                    <p className="home-testimonial-name">{t.name}</p>
                    <p className="home-testimonial-role">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="home-footer">
        <div className="home-container">
          <div className="home-footer-inner">
            <div className="home-footer-brand">
              <h3 className="home-footer-wordmark">BOOKLY</h3>
              <p className="home-footer-brand-desc">
                The booking platform built for barbershops and salons that take their business seriously.
              </p>
              <div className="home-footer-socials">
                <a href="#" className="home-footer-social" aria-label="Instagram"><FontAwesomeIcon icon={faInstagram} /></a>
                <a href="#" className="home-footer-social" aria-label="Twitter"><FontAwesomeIcon icon={faTwitter} /></a>
                <a href="#" className="home-footer-social" aria-label="Facebook"><FontAwesomeIcon icon={faFacebookF} /></a>
              </div>
            </div>

            <div className="home-footer-col">
              <h5>Product</h5>
              <ul className="home-footer-links">
                <li><a href="#features">{t.home.featuresBadge || 'Features'}</a></li>
                <li><a href="#how">{t.home.howBadge || 'How It Works'}</a></li>
                <li><Link to="/register">{t.home.cta}</Link></li>
              </ul>
            </div>

            <div className="home-footer-col">
              <h5>Company</h5>
              <ul className="home-footer-links">
                <li><a href="#">About</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>

            <div className="home-footer-col">
              <h5>Legal</h5>
              <ul className="home-footer-links">
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="home-footer-bottom">
            <span className="home-footer-copy">© {new Date().getFullYear()} Bookly. All rights reserved.</span>
            <div className="home-footer-bottom-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}