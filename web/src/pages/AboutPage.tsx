import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import Footer from '../components/Footer';
import '../styles/pages/legal.css';
import '../styles/pages/home.css';

export default function AboutPage() {
  const { t } = useLang();
  return (
    <>
      <div className="legal-page">
        <Link to="/" className="legal-back">← <span className="brand-wordmark">BOOKLY</span></Link>
        <span className="home-label about-badge">{t.about.badge}</span>
        <h1 className="legal-title">{t.about.title}</h1>
        <p className="legal-body">{t.about.intro}</p>
        <h2 className="legal-section-heading">{t.about.storyHeading}</h2>
        <p className="legal-body">{t.about.storyBody}</p>
        <div className="about-actions">
          <a
            href="https://github.com/notTeo"
            target="_blank"
            rel="noopener noreferrer"
            className="home-btn-ghost"
          >
            <FontAwesomeIcon icon={faGithub} />
            {t.about.githubLabel}
          </a>
          <a href="mailto:nikostheodosis05@gmail.com" className="home-btn-primary">
            <FontAwesomeIcon icon={faEnvelope} />
            {t.about.contactLabel}
          </a>
        </div>
      </div>
      <Footer />
    </>
  );
}
