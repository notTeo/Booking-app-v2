import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import '../styles/pages/about.css'

export default function AboutPage() {
  return (
    <div className="dashboard-layout">
      <Navbar />
      <div className="about-page">

        <section className="about-hero">
          <h1 className="about-title">Auth Boilerplate</h1>
          <p className="about-tagline">
            A full-stack TypeScript authentication starter with everything you need to ship auth in a real app.
            Clone it, configure your env, and start building your actual product.
          </p>
        </section>

        <section className="about-section">
          <h2 className="about-section-title">Features</h2>
          <ul className="about-features">
            <li>Register with email + password — sends a verification email</li>
            <li>Email verification — account is only created after the link is clicked</li>
            <li>Login / Logout — JWT access + refresh token rotation</li>
            <li>Refresh token — stored in an <code>httpOnly</code> cookie, rotated on every use</li>
            <li>Forgot / Reset password — token-based, invalidates all sessions on reset</li>
            <li>Google OAuth — sign in or register via Google</li>
            <li>Protected routes — frontend redirects unauthenticated users</li>
            <li>Security — helmet, CORS, rate limiting, bcrypt, input validation</li>
            <li>API docs — Swagger UI at <code>/docs</code> (local dev only)</li>
          </ul>
        </section>

        <section className="about-section">
          <h2 className="about-section-title">Stack</h2>
          <div className="about-stack">
            <div className="about-stack-row">
              <span className="about-stack-layer">API</span>
              <span className="about-stack-tech">Express, TypeScript, Prisma, PostgreSQL</span>
            </div>
            <div className="about-stack-row">
              <span className="about-stack-layer">Auth</span>
              <span className="about-stack-tech">JWT, bcrypt, Passport (Google OAuth), Resend (email)</span>
            </div>
            <div className="about-stack-row">
              <span className="about-stack-layer">Frontend</span>
              <span className="about-stack-tech">React 19, TypeScript, Vite, React Router v7, Axios</span>
            </div>
            <div className="about-stack-row">
              <span className="about-stack-layer">Infrastructure</span>
              <span className="about-stack-tech">Docker, Docker Compose, nginx</span>
            </div>
          </div>
        </section>

        <section className="about-section about-author">
          <h2 className="about-section-title">The Author</h2>
          <div className="card author-card">
            <p className="author-name">Nick Theodosis</p>
            <p className="author-bio">
              I built this boilerplate because I was tired of rewriting auth from scratch every time I started a new project.
              Auth is complex — tokens, sessions, OAuth flows, email verification — and getting it wrong has real consequences.
              This is the setup I'd want on day one of any serious project.
            </p>
            <p className="author-bio">
              If it saves you even a week of work, it did its job.
            </p>
            <div className="author-cta">
              <Link to="/register">
                <button className="btn btn-primary">Get Started</button>
              </Link>
              <Link to="/plans">
                <button className="btn btn-ghost">View Plans</button>
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
