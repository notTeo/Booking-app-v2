import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useLang } from '../context/LanguageContext';
import '../styles/pages/home.css';

export default function HomePage() {
  const { t } = useLang();
  return (
    <div className="home-layout">
      <Navbar />
      <main className="hero">
        <h1>{t.home.headline}<br /><span>{t.home.headlineAccent}</span></h1>
        <p>{t.home.sub}</p>
        <div className="hero-actions">
          <Link to="/register">
            <button className="btn btn-primary">{t.home.cta}</button>
          </Link>
          <Link to="/login">
            <button className="btn btn-ghost">{t.home.signIn}</button>
          </Link>
        </div>
      </main>
    </div>
  );
}
