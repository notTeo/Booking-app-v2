import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import '../styles/pages/not-found.css';

export default function NotFoundPage() {
  const { t } = useLang();
  return (
    <div className="not-found">
      <p className="not-found-code">{t.notFound.code}</p>
      <p className="not-found-title">{t.notFound.title}</p>
      <p className="not-found-message">{t.notFound.message}</p>
      <Link to="/"><button className="btn btn-primary">{t.notFound.goHome}</button></Link>
    </div>
  );
}
