import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import '../styles/pages/legal.css';

export default function PrivacyPage() {
  const { t } = useLang();
  return (
    <div className="legal-page">
      <Link to="/" className="legal-back">← <span className="brand-wordmark">BOOKLY</span></Link>
      <h1 className="legal-title">{t.privacy.title}</h1>
      <p className="legal-updated">{t.privacy.lastUpdated}</p>
      <p className="legal-body">{t.privacy.body}</p>
      <p className="legal-contact">
        {t.privacy.contact} <a href="mailto:hello@bookly.com">hello@bookly.com</a>
      </p>
    </div>
  );
}
