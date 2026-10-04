import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import Footer from '../components/Footer';
import '../styles/pages/legal.css';
import Wordmark from '../components/Wordmark';
import BrandText from '../components/BrandText';

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
        <Link to="/" className="back-link">← <span className="wordmark wordmark--inline wordmark--muted"><Wordmark /></span></Link>
        <h1 className="t-title"><BrandText text={t.terms.title} /></h1>
        <p className="t-body-sm t-muted"><BrandText text={t.terms.lastUpdated} muted /></p>
        <p className="t-body"><BrandText text={t.terms.intro} muted /></p>
        {sections.map(([heading, body]) => (
          <div key={heading} className="legal-section">
            <h2 className="t-subheading"><BrandText text={heading} /></h2>
            <p className="t-body"><BrandText text={body} muted /></p>
          </div>
        ))}
        <p className="t-body-sm t-muted">
          <BrandText text={t.terms.contact} muted /> <a href="mailto:nikostheodosis05@gmail.com">nikostheodosis05@gmail.com</a>
        </p>
      </div>
      <Footer />
    </>
  );
}
