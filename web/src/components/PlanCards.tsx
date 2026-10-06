import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { PLAN_PRICES } from '../config/pricing';

/** The Solo, Team and Business plans side by side: name, price and what is included. */
export default function PlanCards() {
  const { t } = useLang();
  const plans = [
    { name: t.home.pricingSoloName, price: PLAN_PRICES.solo, desc: t.home.pricingSoloDesc, features: t.home.pricingSoloFeatures, featured: false },
    { name: t.home.pricingTeamName, price: PLAN_PRICES.team, desc: t.home.pricingTeamDesc, features: t.home.pricingTeamFeatures, featured: true },
    { name: t.home.pricingBusinessName, price: PLAN_PRICES.business, desc: t.home.pricingBusinessDesc, features: t.home.pricingBusinessFeatures, featured: false },
  ];

  return (
    <div className="home-pricing-grid">
      {plans.map((plan) => (
        <div key={plan.name} className={`home-price-card${plan.featured ? ' home-price-card--pro' : ''}`}>
          <h3 className="home-price-tier">{plan.name}</h3>
          <div className="home-price-amount">
            <span className="currency">€</span>
            <span className="amount">{plan.price}</span>
            <span className="period">{t.home.pricingPerMonth} · {t.home.pricingExclVat}</span>
          </div>
          <p className="home-price-desc">{plan.desc}</p>
          <hr className="home-price-divider" />
          <ul className="home-price-features">
            {plan.features.map((feature) => (
              <li key={feature}><FontAwesomeIcon icon={faCheck} className="feat-check" /> {feature}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
