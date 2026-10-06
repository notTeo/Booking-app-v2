import { useRef, useState, type KeyboardEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { PLAN_PRICES, yearlyPrice } from '../config/pricing';

const BILLING = ['monthly', 'yearly'] as const;
type Billing = (typeof BILLING)[number];

/** The Solo, Team and Business plans side by side: name, price and what is included, with a monthly | yearly switch. */
export default function PlanCards() {
  const { t } = useLang();
  const [billing, setBilling] = useState<Billing>('monthly');
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const plans = [
    { name: t.home.pricingSoloName, price: PLAN_PRICES.solo, desc: t.home.pricingSoloDesc, features: t.home.pricingSoloFeatures, featured: false },
    { name: t.home.pricingTeamName, price: PLAN_PRICES.team, desc: t.home.pricingTeamDesc, features: t.home.pricingTeamFeatures, featured: true },
    { name: t.home.pricingBusinessName, price: PLAN_PRICES.business, desc: t.home.pricingBusinessDesc, features: t.home.pricingBusinessFeatures, featured: false },
  ];
  const labels = { monthly: t.home.pricingMonthly, yearly: t.home.pricingYearly };

  // Two tabs: either arrow key moves to the other one.
  const onKeyDown = (e: KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = index === 0 ? 1 : 0;
    setBilling(BILLING[next]);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <div className="home-pricing-billing">
        <div role="tablist" aria-label={t.home.pricingBillingLabel} className="tabs tabs--segmented">
          {BILLING.map((option, i) => (
            <button
              key={option}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="tab"
              className="tab"
              aria-selected={billing === option}
              tabIndex={billing === option ? 0 : -1}
              onClick={() => setBilling(option)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {labels[option]}
            </button>
          ))}
        </div>
      </div>
      <div className="home-pricing-grid">
        {plans.map((plan) => (
          <div key={plan.name} className={`home-price-card${plan.featured ? ' home-price-card--pro' : ''}`}>
            <h3 className="home-price-tier">{plan.name}</h3>
            <div className="home-price-amount">
              <span className="currency">€</span>
              <span className="amount">{billing === 'yearly' ? yearlyPrice(plan.price) : plan.price}</span>
              <span className="period">{billing === 'yearly' ? t.home.pricingPerYear : t.home.pricingPerMonth} · {t.home.pricingExclVat}</span>
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
    </div>
  );
}
