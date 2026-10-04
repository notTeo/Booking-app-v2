import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import Footer from '../components/Footer';
import '../styles/pages/legal.css';
import '../styles/pages/home.css';
import Wordmark from '../components/Wordmark';
import BrandText from '../components/BrandText';

export default function ContactPage() {
  const { t } = useLang();
  return (
    <>
      <div className="legal-page">
        <Link to="/" className="legal-back">← <span className="wordmark wordmark--inline wordmark--muted"><Wordmark /></span></Link>
        <span className="home-label about-badge"><BrandText text={t.contact.badge} muted /></span>
        <h1 className="legal-title"><BrandText text={t.contact.title} /></h1>
        <p className="legal-body"><BrandText text={t.contact.intro} muted /></p>
        <div className="about-actions">
          <a href="mailto:nikostheodosis05@gmail.com" className="home-btn-primary">
            <FontAwesomeIcon icon={faEnvelope} />
            <BrandText text={t.contact.buttonLabel} muted />
          </a>
        </div>
      </div>
      <Footer />
    </>
  );
}
