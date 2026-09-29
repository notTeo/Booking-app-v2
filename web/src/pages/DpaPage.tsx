import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import Footer from '../components/Footer';
import '../styles/pages/legal.css';

export default function DpaPage() {
  const { t } = useLang();
  const sections = [
    [t.dpa.rolesHeading, t.dpa.rolesBody],
    [t.dpa.processingHeading, t.dpa.processingBody],
    [t.dpa.subprocessorsHeading, t.dpa.subprocessorsBody],
    [t.dpa.securityHeading, t.dpa.securityBody],
    [t.dpa.rightsHeading, t.dpa.rightsBody],
  ];
  return (
    <>
      <div className="legal-page">
        <Link to="/" className="legal-back">← <span className="brand-wordmark">BeBooked</span></Link>
        <h1 className="legal-title">{t.dpa.title}</h1>
        <p className="legal-updated">{t.dpa.lastUpdated}</p>
        <p className="legal-body"><strong>{t.dpa.placeholderNotice}</strong></p>
        <p className="legal-body">{t.dpa.intro}</p>
        {sections.map(([heading, body]) => (
          <div key={heading}>
            <h2 className="legal-section-heading">{heading}</h2>
            <p className="legal-body">{body}</p>
          </div>
        ))}
        <p className="legal-contact">
          {t.dpa.contact} <a href="mailto:nikostheodosis05@gmail.com">nikostheodosis05@gmail.com</a>
        </p>
      </div>
      <Footer />
    </>
  );
}
