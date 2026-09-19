import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import Footer from '../components/Footer';
import '../styles/pages/legal.css';

export default function TermsPage() {
  const { t } = useLang();
  const sections = [
    [t.terms.useHeading, t.terms.useBody],
    [t.terms.accountsHeading, t.terms.accountsBody],
    [t.terms.acceptableHeading, t.terms.acceptableBody],
    [t.terms.availabilityHeading, t.terms.availabilityBody],
    [t.terms.liabilityHeading, t.terms.liabilityBody],
    [t.terms.changesHeading, t.terms.changesBody],
  ];
  return (
    <>
      <div className="legal-page">
        <Link to="/" className="legal-back">← <span className="brand-wordmark">Bookly</span></Link>
        <h1 className="legal-title">{t.terms.title}</h1>
        <p className="legal-updated">{t.terms.lastUpdated}</p>
        <p className="legal-body">{t.terms.intro}</p>
        {sections.map(([heading, body]) => (
          <div key={heading}>
            <h2 className="legal-section-heading">{heading}</h2>
            <p className="legal-body">{body}</p>
          </div>
        ))}
        <p className="legal-contact">
          {t.terms.contact} <a href="mailto:nikostheodosis05@gmail.com">nikostheodosis05@gmail.com</a>
        </p>
      </div>
      <Footer />
    </>
  );
}
