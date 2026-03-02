import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarCheck,
  faStore,
  faCreditCard,
  faUsers,
  faMobile,
  faChartLine,
  faUserPlus,
  faGear,
  faCheck,
  faXmark,
  faCrown,
  faArrowRight,
  faStar,
  faBars,
  faSun,
  faMoon,
} from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faTwitter, faFacebookF } from '@fortawesome/free-brands-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import '../styles/pages/home.css';

// ─── Data ─────────────────────────────────────────────────────────────────────
const features = [
  { icon: faCalendarCheck, title: 'Online Booking', desc: 'Let clients book 24/7 from any device. Automated reminders cut no-shows dramatically.' },
  { icon: faStore, title: 'Shop Management', desc: 'Manage multiple locations, staff, services, and availability from one clean dashboard.' },
  { icon: faCreditCard, title: 'Subscriptions', desc: 'Offer membership plans to loyal clients and unlock predictable, recurring revenue.' },
  { icon: faUsers, title: 'Team Management', desc: 'Assign roles, track performance, and coordinate schedules across your entire team.' },
  { icon: faMobile, title: 'Mobile-Ready', desc: 'A seamless experience on every screen — your clients book on the go, effortlessly.' },
  { icon: faChartLine, title: 'Analytics', desc: 'Track revenue, peak hours, and client retention with clear, actionable reports.' },
];

const steps = [
  { num: '1', icon: faUserPlus, title: 'Create your account', desc: 'Sign up in seconds. No credit card required. Get started on the free plan today.' },
  { num: '2', icon: faGear, title: 'Set up your shop', desc: 'Add your services, set your hours, and invite your team — all in under 10 minutes.' },
  { num: '3', icon: faCalendarCheck, title: 'Accept bookings', desc: 'Share your booking link and start receiving real appointments immediately.' },
];

const freePlan = [
  { label: '1 shop location', included: true },
  { label: 'Up to 50 bookings / month', included: true },
  { label: 'Basic analytics', included: true },
  { label: 'Email notifications', included: true },
  { label: 'Unlimited bookings', included: false },
  { label: 'Subscription memberships', included: false },
  { label: 'Priority support', included: false },
];

const proPlan = [
  { label: 'Unlimited shop locations', included: true },
  { label: 'Unlimited bookings', included: true },
  { label: 'Advanced analytics', included: true },
  { label: 'Email & SMS notifications', included: true },
  { label: 'Subscription memberships', included: true },
  { label: 'Custom booking page', included: true },
  { label: 'Priority support', included: true },
];

const testimonials = [
  { quote: 'Bookly completely transformed how we run our barbershop. Clients love the easy online booking and we\'ve cut no-shows by over 60%.', name: 'Marcus Thompson', role: 'Owner, The Sharp Cut', initials: 'MT' },
  { quote: 'We went from a messy paper calendar to a fully automated system in one afternoon. The dashboard is clean and our whole team uses it daily.', name: 'Sofia Rivera', role: 'Manager, Studio Glam', initials: 'SR' },
  { quote: 'The subscription feature alone paid for Pro in the first month. Our regulars love the membership plan and we love the predictable revenue.', name: 'James Okafor', role: 'Owner, Fade Culture', initials: 'JO' },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const { t, language, toggleLanguage } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="home-page">

      {/* ── Floating Nav ───────────────────────────────────────────────────────── */}
      <nav className="home-nav-wrapper">
        <div className="home-container home-nav">
          
          <div className="home-nav-links">
            <a href="#features" className="home-nav-link">{t.home.featuresBadge || 'Features'}</a>
            <a href="#how" className="home-nav-link">{t.home.howBadge || 'How It Works'}</a>
            <a href="#pricing" className="home-nav-link">{t.home.pricingBadge || 'Pricing'}</a>
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
              {language === 'el' ? '🇬🇷' : '🇬🇧'}
            </button>

            <Link to="/login" className="home-nav-link">{t.home.signIn}</Link>
            <Link to="/register">
              <button className="home-btn-primary">{t.home.cta}</button>
            </Link>
          </div>

          <button
            className={`home-hamburger${menuOpen ? ' is-open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
          </button>
        </div>

        {menuOpen && (
          <>
            <div className="home-mobile-backdrop" onClick={closeMenu} />
            <div className="home-mobile-menu">
              <a href="#features" className="home-mobile-link" onClick={closeMenu}>{t.home.featuresBadge || 'Features'}</a>
              <a href="#how" className="home-mobile-link" onClick={closeMenu}>{t.home.howBadge || 'How It Works'}</a>
              <a href="#pricing" className="home-mobile-link" onClick={closeMenu}>{t.home.pricingBadge || 'Pricing'}</a>
              <div className="home-mobile-divider" />
              <div className="home-mobile-toggles">
                <button className="home-nav-toggle home-nav-toggle--wide" onClick={toggleTheme}>
                  <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <button className="home-nav-toggle home-nav-toggle--wide" onClick={toggleLanguage}>
                  {language === 'el' ? '🇬🇷 Ελληνικά' : '🇬🇧 English'}
                </button>
              </div>
              <div className="home-mobile-divider" />
              <Link to="/login" className="home-mobile-link" onClick={closeMenu}>{t.home.signIn}</Link>
              <Link to="/register" onClick={closeMenu} style={{ display: 'block', marginTop: '1rem' }}>
                <button className="home-btn-primary home-btn--full">
                  {t.home.cta} <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </Link>
            </div>
          </>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="home-hero">
        <div className="home-hero-badge">
          {t.home.heroBadge || 'Booking platform for barbershops & salons'}
        </div>
        <h1 className="home-wordmark">BOOKLY</h1>
        <p className="home-tagline">{t.home.sub}</p>
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

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="home-section">
        <div className="home-container">
          <div className="home-section-header">
            <span className="home-label">{t.home.pricingBadge || 'Pricing'}</span>
            <h2 className="home-section-title">{t.home.pricingTitle || 'Simple, transparent pricing'}</h2>
            <p className="home-section-sub">
              {t.home.pricingSub || "Start free, upgrade when you're ready. No hidden fees, ever."}
            </p>
          </div>
          <div className="home-pricing-grid">
            <div className="home-price-card">
              <p className="home-price-tier">Free</p>
              <div className="home-price-amount">
                <span className="currency">$</span>
                <span className="amount">0</span>
                <span className="period">/ month</span>
              </div>
              <p className="home-price-desc">Perfect for solo barbers or shops just getting started.</p>
              <hr className="home-price-divider" />
              <ul className="home-price-features">
                {freePlan.map(f => (
                  <li key={f.label} className={f.included ? '' : 'muted'}>
                    <FontAwesomeIcon icon={f.included ? faCheck : faXmark} className={f.included ? 'feat-check' : 'feat-x'} />
                    {f.label}
                  </li>
                ))}
              </ul>
              <Link to="/register" style={{ display: 'block' }}>
                <button className="home-btn-ghost home-price-cta">Get Started Free</button>
              </Link>
            </div>

            <div className="home-price-card home-price-card--pro">
              <div className="home-price-badge">
                <FontAwesomeIcon icon={faCrown} /> Most Popular
              </div>
              <p className="home-price-tier">Pro</p>
              <div className="home-price-amount">
                <span className="currency">$</span>
                <span className="amount">29</span>
                <span className="period">/ month</span>
              </div>
              <p className="home-price-desc">For growing shops that need full power and zero limits.</p>
              <hr className="home-price-divider" />
              <ul className="home-price-features">
                {proPlan.map(f => (
                  <li key={f.label}>
                    <FontAwesomeIcon icon={faCheck} className="feat-check" />
                    {f.label}
                  </li>
                ))}
              </ul>
              <Link to="/register" style={{ display: 'block' }}>
                <button className="home-btn-primary home-price-cta">
                  Start Pro Trial <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </Link>
            </div>
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
                <li><a href="#pricing">{t.home.pricingBadge || 'Pricing'}</a></li>
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