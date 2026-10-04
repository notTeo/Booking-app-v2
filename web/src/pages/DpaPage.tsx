import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import Footer from '../components/Footer';
import '../styles/pages/legal.css';
import Wordmark from '../components/Wordmark';
import BrandText from '../components/BrandText';

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
        <Link to="/" className="back-link">← <span className="wordmark wordmark--inline wordmark--muted"><Wordmark /></span></Link>
        <h1 className="t-title"><BrandText text={t.dpa.title} /></h1>
        <p className="t-body-sm t-muted"><BrandText text={t.dpa.lastUpdated} muted /></p>
        <p className="t-body"><strong><BrandText text={t.dpa.placeholderNotice} muted /></strong></p>
        <p className="t-body"><BrandText text={t.dpa.intro} muted /></p>
        {sections.map(([heading, body]) => (
          <div key={heading} className="legal-section">
            <h2 className="t-subheading"><BrandText text={heading} /></h2>
            <p className="t-body"><BrandText text={body} muted /></p>
          </div>
        ))}
        <p className="t-body-sm t-muted">
          <BrandText text={t.dpa.contact} muted /> <a href="mailto:nikostheodosis05@gmail.com">nikostheodosis05@gmail.com</a>
        </p>
      </div>
      <Footer />
    </>
  );
}
