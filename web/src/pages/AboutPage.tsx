import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import Footer from '../components/Footer';
import '../styles/pages/legal.css';
import '../styles/pages/home.css';
import SiteNav from '../components/SiteNav';
import BrandText from '../components/BrandText';

export default function AboutPage() {
  const { t } = useLang();
  return (
    <>
      <SiteNav solid />
      <div className="legal-page">
        <span className="home-label about-badge"><BrandText text={t.about.badge} muted /></span>
        <h1 className="t-title"><BrandText text={t.about.title} /></h1>
        <p className="t-body"><BrandText text={t.about.intro} muted /></p>
        <div className="legal-section">
          <h2 className="t-subheading"><BrandText text={t.about.storyHeading} /></h2>
          <p className="t-body"><BrandText text={t.about.storyBody} muted /></p>
        </div>
        <div className="cluster">
          <a
            href="https://github.com/notTeo"
            target="_blank"
            rel="noopener noreferrer"
            className="home-btn-ghost"
          >
            <FontAwesomeIcon icon={faGithub} />
            <BrandText text={t.about.githubLabel} muted />
          </a>
          <a href="mailto:nikostheodosis05@gmail.com" className="home-btn-primary">
            <FontAwesomeIcon icon={faEnvelope} />
            <BrandText text={t.about.contactLabel} muted />
          </a>
        </div>
      </div>
      <Footer />
    </>
  );
}
