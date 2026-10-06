import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faMinus } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import Footer from '../components/Footer';
import PlanCards from '../components/PlanCards';
import Wordmark from '../components/Wordmark';
import '../styles/pages/legal.css';
import '../styles/pages/home.css';

// Reference only: what each plan includes. There is nothing to buy here.
export default function PricingPage() {
  const { t } = useLang();
  const p = t.pricingPage;

  // A cell is a tick, a dash, or a short text such as "Up to 5".
  const cell = (value: boolean | string) =>
    typeof value === 'string' ? (
      value
    ) : (
      <>
        <FontAwesomeIcon icon={value ? faCheck : faMinus} className={value ? 'feat-check' : 'feat-x'} aria-hidden="true" />
        <span className="visually-hidden">{value ? p.included : p.notIncluded}</span>
      </>
    );

  return (
    <>
      <div className="pricing-page">
        <Link to="/" className="back-link">← <span className="wordmark wordmark--inline wordmark--muted"><Wordmark /></span></Link>
        <div className="legal-section">
          <h1 className="t-title">{p.title}</h1>
          <p className="t-body t-muted">{p.intro}</p>
        </div>

        <PlanCards />

        {p.groups.map((group) => (
          <section key={group.title} className="legal-section">
            <h2 className="t-subheading">{group.title}</h2>
            {/* No table-wrap: on a phone these stay three-column tables rather than row cards. */}
            <div className="table-surface">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">{p.featureCol}</th>
                    <th scope="col">{t.home.pricingSoloName}</th>
                    <th scope="col">{t.home.pricingTeamName}</th>
                    <th scope="col">{t.home.pricingBusinessName}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map(([label, solo, team, business]) => (
                    <tr key={label}>
                      <td className="data-table__title">{label}</td>
                      <td>{cell(solo)}</td>
                      <td>{cell(team)}</td>
                      <td>{cell(business)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <section className="legal-section">
          <h2 className="t-subheading">{p.notesTitle}</h2>
          <ul className="pricing-notes t-body t-muted">
            {p.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </section>
      </div>
      <Footer />
    </>
  );
}
