import { useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { PLAN_PRICES, yearlyPrice } from '../config/pricing';
import type { ShopPlan } from '../api/shop.api';

const BILLING = ['monthly', 'yearly'] as const;
type Billing = (typeof BILLING)[number];

/** The plans as a choice: a radio group in place of the sign-up buttons. */
export interface PlanSelect {
  /** Names the radio group for a screen reader (the step's or card's title). */
  label: string;
  value: ShopPlan;
  onChange: (plan: ShopPlan) => void;
  /** One column whatever the screen (a narrow card, a phone). */
  stacked?: boolean;
  /** Which cards list what they include: all of them, only the chosen one, or none. */
  features?: 'all' | 'selected' | 'none';
  /** Marks the shop's present plan, when the choice is a change of plan. */
  current?: ShopPlan;
  disabled?: boolean;
}

/**
 * The Solo, Team and Business plans side by side, under a monthly | yearly
 * switch. Yearly shows twelve months' price struck through, then the price
 * actually paid and what that saves. With `select` they are a choice instead
 * (the new-shop flow, changing plan): monthly prices, no switch, no buttons.
 */
export default function PlanCards({ select }: { select?: PlanSelect }) {
  const { t } = useLang();
  const [billing, setBilling] = useState<Billing>('monthly');
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const yearly = billing === 'yearly';
  const plans = [
    { id: 'SOLO' as ShopPlan, name: t.home.pricingSoloName, price: PLAN_PRICES.solo, desc: t.home.pricingSoloDesc, features: t.home.pricingSoloFeatures, featured: false },
    { id: 'TEAM' as ShopPlan, name: t.home.pricingTeamName, price: PLAN_PRICES.team, desc: t.home.pricingTeamDesc, features: t.home.pricingTeamFeatures, featured: true },
    { id: 'BUSINESS' as ShopPlan, name: t.home.pricingBusinessName, price: PLAN_PRICES.business, desc: t.home.pricingBusinessDesc, features: t.home.pricingBusinessFeatures, featured: false },
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

  const featureList = (features: string[]) => (
    <div className="card__section">
      <span className="t-caption plan-card__label">{t.home.pricingFeaturesLabel}</span>
      <ul className="plan-card__features">
        {features.map((feature) => (
          <li key={feature}>
            <FontAwesomeIcon icon={faCircleCheck} className="plan-card__check" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );

  if (select) {
    const shows = select.features ?? 'all';
    return (
      <div className={`plan-grid${select.stacked ? ' plan-grid--stack' : ''}`} role="radiogroup" aria-label={select.label}>
        {plans.map((plan) => {
          const checked = select.value === plan.id;
          return (
            <label key={plan.id} className={`card plan-card plan-card--select card--interactive${plan.featured ? ' plan-card--featured' : ''}`}>
              <input
                className="visually-hidden"
                type="radio"
                name="plan"
                value={plan.id}
                checked={checked}
                disabled={select.disabled}
                onChange={() => select.onChange(plan.id)}
              />
              <span className="option-check"><FontAwesomeIcon icon={faCheck} aria-hidden="true" /></span>
              <div className="card__header">
                <span className="card__title">{plan.name}</span>
                {select.current === plan.id
                  ? <span className="badge badge--neutral">{t.onboarding.changePlan.current}</span>
                  : plan.featured && <span className="badge badge--accent">{t.home.pricingPopular}</span>}
              </div>
              <div className="plan-card__price">
                <span className="plan-card__amount">€{plan.price}</span>
                <span className="plan-card__period">{t.home.pricingPerMonth} · {t.home.pricingExclVat}</span>
              </div>
              <p className="card__text">{plan.desc}</p>
              {(shows === 'all' || (shows === 'selected' && checked)) && featureList(plan.features)}
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div className="plan-picker">
      <div className="plan-picker__billing">
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
      <div className="plan-grid">
        {plans.map((plan) => {
          const fullYear = plan.price * 12;
          const paid = yearlyPrice(plan.price);
          return (
            <article key={plan.name} className={`card plan-card${plan.featured ? ' plan-card--featured' : ''}`}>
              <div className="card__header">
                <h3 className="card__title">{plan.name}</h3>
                {plan.featured && <span className="badge badge--accent">{t.home.pricingPopular}</span>}
              </div>
              <div className="plan-card__price">
                {yearly && (
                  <s className="plan-card__was">
                    <span className="visually-hidden">{t.home.pricingWas} </span>€{fullYear}
                  </s>
                )}
                <span className={`plan-card__amount${yearly ? ' is-discounted' : ''}`}>€{yearly ? paid : plan.price}</span>
                <span className="plan-card__period">{yearly ? t.home.pricingPerYear : t.home.pricingPerMonth} · {t.home.pricingExclVat}</span>
              </div>
              {yearly && <p className="plan-card__saving">{t.home.pricingSaving.replace('{amount}', String(fullYear - paid))}</p>}
              <p className="card__text">{plan.desc}</p>
              <Link to={`/register?plan=${plan.id.toLowerCase()}`} className={`btn btn--block${plan.featured ? '' : ' btn--secondary'}`}>{t.home.pricingCta}</Link>
              {featureList(plan.features)}
            </article>
          );
        })}
      </div>
    </div>
  );
}
