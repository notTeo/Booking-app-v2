import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import Footer from '../components/Footer';
import '../styles/pages/legal.css';
import Wordmark from '../components/Wordmark';
import BrandText from '../components/BrandText';

export default function PrivacyPage() {
  const { t } = useLang();
  const sections = [
    [t.privacy.collectHeading, t.privacy.collectBody],
    [t.privacy.useHeading, t.privacy.useBody],
    [t.privacy.cookiesHeading, t.privacy.cookiesBody],
    [t.privacy.sharingHeading, t.privacy.sharingBody],
    [t.privacy.rightsHeading, t.privacy.rightsBody],
    [t.privacy.changesHeading, t.privacy.changesBody],
  ];
  return (
    <>
      <div className="legal-page">
        <Link to="/" className="legal-back">← <span className="wordmark wordmark--inline wordmark--muted"><Wordmark /></span></Link>
        <h1 className="legal-title"><BrandText text={t.privacy.title} /></h1>
        <p className="legal-updated"><BrandText text={t.privacy.lastUpdated} muted /></p>
        <p className="legal-body"><BrandText text={t.privacy.intro} muted /></p>
        {sections.map(([heading, body]) => (
          <div key={heading}>
            <h2 className="legal-section-heading"><BrandText text={heading} /></h2>
            <p className="legal-body"><BrandText text={body} muted /></p>
          </div>
        ))}
        <p className="legal-contact">
          <BrandText text={t.privacy.contact} muted /> <a href="mailto:nikostheodosis05@gmail.com">nikostheodosis05@gmail.com</a>
        </p>
      </div>
      <Footer />
    </>
  );
}
