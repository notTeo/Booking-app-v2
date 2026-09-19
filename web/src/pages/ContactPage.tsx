import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import Footer from '../components/Footer';
import '../styles/pages/legal.css';
import '../styles/pages/home.css';

export default function ContactPage() {
  const { t } = useLang();
  return (
    <>
      <div className="legal-page">
        <Link to="/" className="legal-back">← <span className="brand-wordmark">Bookly</span></Link>
        <span className="home-label about-badge">{t.contact.badge}</span>
        <h1 className="legal-title">{t.contact.title}</h1>
        <p className="legal-body">{t.contact.intro}</p>
        <div className="about-actions">
          <a href="mailto:nikostheodosis05@gmail.com" className="home-btn-primary">
            <FontAwesomeIcon icon={faEnvelope} />
            {t.contact.buttonLabel}
          </a>
        </div>
      </div>
      <Footer />
    </>
  );
}
