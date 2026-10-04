import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faUser } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';

/**
 * The dashboard's subscription card: the plan and the way to billing. There is
 * no billing yet, so the button is there but disabled. It sits in the shop
 * card grid, so it is one card wide, not the full page.
 */
export default function SubscriptionCard({ isPro }: { isPro: boolean }) {
  const { t } = useLang();
  const s = t.dashboard.subscription;

  return (
    <section className="shop-cards" aria-labelledby="dashboard-subscription-title">
      <h2 className="t-subheading" id="dashboard-subscription-title">{s.title}</h2>
      <div className="shop-cards__grid">
        <div className="card">
          <div className="card__header">
            <span className={`badge badge--lg ${isPro ? 'badge--accent' : 'badge--neutral'}`}>
              <FontAwesomeIcon icon={isPro ? faCrown : faUser} aria-hidden="true" />
              {isPro ? s.pro : s.free}
            </span>
            <button type="button" className="btn btn--secondary btn--sm" disabled>
              {isPro ? s.manageBilling : s.upgrade}
            </button>
          </div>
          <p className="card__text">{isPro ? s.proText : s.freeText} {s.comingSoon}</p>
        </div>
      </div>
    </section>
  );
}
