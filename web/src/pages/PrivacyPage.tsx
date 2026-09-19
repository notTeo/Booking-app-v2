import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import Footer from '../components/Footer';
import '../styles/pages/legal.css';

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
        <Link to="/" className="legal-back">← <span className="brand-wordmark">Bookly</span></Link>
        <h1 className="legal-title">{t.privacy.title}</h1>
        <p className="legal-updated">{t.privacy.lastUpdated}</p>
        <p className="legal-body">{t.privacy.intro}</p>
        {sections.map(([heading, body]) => (
          <div key={heading}>
            <h2 className="legal-section-heading">{heading}</h2>
            <p className="legal-body">{body}</p>
          </div>
        ))}
        <p className="legal-contact">
          {t.privacy.contact} <a href="mailto:nikostheodosis05@gmail.com">nikostheodosis05@gmail.com</a>
        </p>
      </div>
      <Footer />
    </>
  );
}
