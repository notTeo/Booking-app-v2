import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';

export default function NotFoundPage() {
  const { t } = useLang();
  return (
    <div className="page page--center">
      <div className="empty">
        <p className="empty__code">{t.notFound.code}</p>
        <h1 className="empty__title">{t.notFound.title}</h1>
        <p className="empty__text">{t.notFound.message}</p>
        <div className="empty__actions">
          <Link to="/" className="btn">{t.notFound.goHome}</Link>
        </div>
      </div>
    </div>
  );
}
