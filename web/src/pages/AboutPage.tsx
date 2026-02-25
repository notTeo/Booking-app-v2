import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import '../styles/pages/about.css'
import { useLang } from '../context/LanguageContext';

export default function AboutPage() {
    const { t } = useLang();
  return (
    <div className="dashboard-layout">
      <Navbar />
      <div className="about-page">

        <section className="about-hero">
          <h1 className="about-title">{t.about.title}</h1>
          <p className="about-tagline">
            {t.about.tagline}
            </p>
        </section>

        <section className="about-section">
          <h2 className="about-section-title">{t.about.offerTitle}</h2>
          <ul className="about-features">
            <li>{t.about.f1}</li>
            <li>{t.about.f2}</li>
            <li>{t.about.f3}</li>
            <li>{t.about.f4}</li>
            <li>{t.about.f5}</li>
            <li>{t.about.f6}</li>
            <li>{t.about.f7}</li>
            <li>{t.about.f8}</li>
            <li>{t.about.f9}</li>
          </ul>
        </section>

        <section className="about-section">
          <h2 className="about-section-title">{t.about.howTitle}</h2>
          <div className="about-stack">
            <div className="about-stack-row">
              <span className="about-stack-layer">{t.about.step1Label}</span>
              <span className="about-stack-tech">{t.about.step1Desc}</span>
            </div>
            <div className="about-stack-row">
              <span className="about-stack-layer">{t.about.step2Label}</span>
              <span className="about-stack-tech">{t.about.step2Desc}</span>
            </div>
            <div className="about-stack-row">
              <span className="about-stack-layer">{t.about.step3Label}</span>
              <span className="about-stack-tech">{t.about.step3Desc}</span>
            </div>
            <div className="about-stack-row">
              <span className="about-stack-layer">{t.about.step4Label}</span>
              <span className="about-stack-tech">{t.about.step4Desc}</span>
            </div>
          </div>
        </section>

        <section className="about-section about-author">
          <h2 className="about-section-title">{t.about.storyTitle}</h2>
          <div className="card author-card">
            <p className="author-name">Nick Theodosis</p>
            <p className="author-bio">
             {t.about.bio1}
            </p>
            <p className="author-bio">
              {t.about.bio2}
              </p>
            <div className="author-cta">
              <Link to="/register">
                <button className="btn btn-primary">{t.about.getStarted}</button>
              </Link>
              <Link to="/pricing">
                <button className="btn btn-ghost">{t.about.viewPlans}</button>
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
