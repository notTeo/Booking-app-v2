import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import '../styles/pages/home.css';

export default function HomePage() {
  return (
    <div className="home-layout">
      <Navbar />
      <main className="hero">
        <h1>Welcome to the<br /><span>Auth Boilerplate</span></h1>
        <p>A production-ready authentication starter with JWT, refresh tokens, email verification, OAuth and password reset.</p>
        <div className="hero-actions">
          <Link to="/register">
            <button className="btn btn-primary">Get Started</button>
          </Link>
          <Link to="/login">
            <button className="btn btn-ghost">Login</button>
          </Link>
        </div>
      </main>
    </div>
  );
}
