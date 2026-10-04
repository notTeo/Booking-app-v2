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
        <Link to="/" className="back-link">← <span className="wordmark wordmark--inline wordmark--muted"><Wordmark /></span></Link>
        <h1 className="t-title"><BrandText text={t.privacy.title} /></h1>
        <p className="t-body-sm t-muted"><BrandText text={t.privacy.lastUpdated} muted /></p>
        <p className="t-body"><BrandText text={t.privacy.intro} muted /></p>
        {sections.map(([heading, body]) => (
          <div key={heading} className="legal-section">
            <h2 className="t-subheading"><BrandText text={heading} /></h2>
            <p className="t-body"><BrandText text={body} muted /></p>
          </div>
        ))}
        <p className="t-body-sm t-muted">
          <BrandText text={t.privacy.contact} muted /> <a href="mailto:nikostheodosis05@gmail.com">nikostheodosis05@gmail.com</a>
        </p>
      </div>
      <Footer />
    </>
  );
}
