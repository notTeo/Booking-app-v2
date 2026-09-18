import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import '../styles/pages/legal.css';

export default function TermsPage() {
  const { t } = useLang();
  return (
    <div className="legal-page">
      <Link to="/" className="legal-back">← <span className="brand-wordmark">BOOKLY</span></Link>
      <h1 className="legal-title">{t.terms.title}</h1>
      <p className="legal-updated">{t.terms.lastUpdated}</p>
      <p className="legal-body">{t.terms.body}</p>
      <p className="legal-contact">
        {t.terms.contact} <a href="mailto:hello@bookly.com">hello@bookly.com</a>
      </p>
    </div>
  );
}
