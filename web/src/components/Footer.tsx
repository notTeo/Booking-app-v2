import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import '../styles/pages/home.css';

export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="home-footer">
      <div className="home-container">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <h3 className="home-footer-wordmark">Bookly</h3>
            <p className="home-footer-brand-desc">
              {t.footer.brandDesc}
            </p>
          </div>

          <div className="home-footer-cols">
            <div className="home-footer-col">
              <h5>{t.footer.productHeading}</h5>
              <ul className="home-footer-links">
                <li><a href="/#features">{t.home.featuresBadge || 'Features'}</a></li>
                <li><a href="/#how">{t.home.howBadge || 'How It Works'}</a></li>
                <li><a href="/#pricing">{t.home.pricingBadge}</a></li>
                <li><a href="/#faq">{t.footer.faq}</a></li>
                <li><Link to="/register">{t.home.cta}</Link></li>
              </ul>
            </div>

            <div className="home-footer-col">
              <h5>{t.footer.companyHeading}</h5>
              <ul className="home-footer-links">
                <li><Link to="/about">{t.home.aboutBadge || 'About'}</Link></li>
                <li><a href="mailto:nikostheodosis05@gmail.com">{t.footer.contact}</a></li>
                <li><Link to="/login">{t.home.signIn}</Link></li>
              </ul>
            </div>

            <div className="home-footer-col">
              <h5>{t.footer.legalHeading}</h5>
              <ul className="home-footer-links">
                <li><Link to="/privacy">{t.privacy.linkLabel}</Link></li>
                <li><Link to="/terms">{t.terms.linkLabel}</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="home-footer-bottom">
          <span className="home-footer-copy">© {new Date().getFullYear()} Bookly. {t.footer.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
