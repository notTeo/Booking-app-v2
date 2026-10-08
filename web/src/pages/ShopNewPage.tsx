import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { createShop, type Shop, type ShopPlan } from '../api/shop.api';
import { PLAN_NAMES } from '../config/pricing';
import { MY_SHOPS_KEY, useMyShops } from '../hooks/useMyShops';
import { useIsCompact } from '../hooks/useIsCompact';
import { apiErrorMessage } from '../utils/apiError';
import { forgetPlan, PLAN_FEATURES, recallPlan, setupSteps, slugFromName } from '../utils/onboarding';
import { isPlausibleSlug, publicShopUrl } from '../utils/publicLink';
import Alert from '../components/Alert';
import PlanCards from '../components/PlanCards';
import Wizard, { WizardFooter, WizardIntro } from '../components/onboarding/Wizard';

type Step = 'plan' | 'shop';

// The start of the new-shop flow: pick a plan, then name the shop. A first
// shop goes on to its setup steps (/shops/<slug>/setup) on a free trial; a
// later one is created inactive and ends here, on "contact us".
export default function ShopNewPage() {
  const uid = useId();
  const { user } = useAuth();
  const { t } = useLang();
  const to = t.onboarding;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const compact = useIsCompact();
  const { data: shops } = useMyShops();

  const [step, setStep] = useState<Step>('plan');
  const [back, setBack] = useState(false);
  const [plan, setPlan] = useState<ShopPlan>(recallPlan);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slugError, setSlugError] = useState('');
  const [created, setCreated] = useState<Shop | null>(null);

  // The trial is for a first shop. `trialAvailable` is as of sign-in, so a shop
  // created since then counts too.
  const trial = !!user?.trialAvailable && !shops?.some((s) => s.role === 'owner');
  const planName = PLAN_NAMES[plan];

  const go = (next: Step) => {
    setBack(next === 'plan');
    setStep(next);
    window.scrollTo(0, 0);
  };

  const onName = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugFromName(value));
  };
  const onSlug = (value: string) => {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    setSlugEdited(true);
    setSlugError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSlugError('');
    if (!isPlausibleSlug(slug)) {
      setSlugError(to.shop.linkHint);
      return;
    }
    setLoading(true);
    try {
      const shop = await createShop({
        name: name.trim(),
        slug,
        plan,
        ...(phone.trim() && { phone: phone.trim() }),
        ...(address.trim() && { formattedAddress: address.trim() }),
      });
      forgetPlan();
      await queryClient.invalidateQueries({ queryKey: MY_SHOPS_KEY });
      if (shop.locked) setCreated(shop);
      else navigate(`/shops/${shop.slug}/setup`, { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } } | null)?.response?.status;
      if (status === 409) setSlugError(to.shop.slugTaken);
      else setError(apiErrorMessage(err, to.shop.errorCreate));
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="card">
        <div className="empty">
          <div className="empty__icon">
            <FontAwesomeIcon icon={faLock} aria-hidden="true" />
          </div>
          <h1 className="empty__title">{to.created.title}</h1>
          <p className="empty__text">{to.created.text.replace('{plan}', PLAN_NAMES[created.plan])}</p>
          <p className="empty__text">{to.created.note}</p>
          <div className="empty__actions">
            <Link to="/contact" className="btn">{to.created.contact}</Link>
            <Link to="/dashboard" className="btn btn--ghost">{to.created.backToShops}</Link>
          </div>
        </div>
      </div>
    );
  }

  // The whole road ahead for the picked plan; a later shop stops after Shop.
  const steps = [
    { key: 'plan', label: to.steps.plan, onOpen: () => go('plan') },
    { key: 'shop', label: to.steps.shop },
    ...(trial ? setupSteps(PLAN_FEATURES[plan]).map((key) => ({ key, label: to.steps[key] })) : []),
  ];

  if (step === 'plan') {
    return (
      <Wizard
        steps={steps}
        current={0}
        back={back}
        wide
        footer={
          <WizardFooter
            note={trial ? to.plan.noteTrial : to.plan.noteInactive}
            main={{ label: to.plan.continueWith.replace('{plan}', planName), onClick: () => go('shop') }}
          />
        }
      >
        <WizardIntro title={to.plan.title} text={trial ? to.plan.introTrial : to.plan.introInactive} />
        <PlanCards
          select={{
            label: to.plan.title,
            value: plan,
            onChange: setPlan,
            stacked: compact,
            features: compact ? 'selected' : 'all',
          }}
        />
      </Wizard>
    );
  }

  return (
    <Wizard
      steps={steps}
      current={1}
      footer={
        <WizardFooter
          onBack={() => go('plan')}
          main={{ label: to.shop.create, form: `${uid}-form`, loading }}
        />
      }
    >
      <WizardIntro title={to.shop.title} text={to.shop.intro} />
      <form id={`${uid}-form`} className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-name`}>{to.shop.name}</label>
          <input
            className="input"
            id={`${uid}-name`}
            type="text"
            value={name}
            onChange={(e) => onName(e.target.value)}
            maxLength={100}
            autoFocus
            required
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-slug`}>{to.shop.link}</label>
          <input
            className="input"
            id={`${uid}-slug`}
            type="text"
            value={slug}
            onChange={(e) => onSlug(e.target.value)}
            minLength={3}
            maxLength={40}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={slugError ? true : undefined}
            aria-describedby={`${uid}-slug-hint`}
            required
          />
          {slug && <span className="field__hint">{to.shop.linkPreview.replace('{link}', publicShopUrl(slug))}</span>}
          {slugError
            ? <span className="field__error" id={`${uid}-slug-hint`} role="alert">{slugError}</span>
            : <span className="field__hint" id={`${uid}-slug-hint`}>{to.shop.linkHint}</span>}
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-phone`}>
            {to.shop.phone} <span className="field__optional">({t.invites.optional})</span>
          </label>
          <input className="input" id={`${uid}-phone`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-address`}>
            {to.shop.address} <span className="field__optional">({t.invites.optional})</span>
          </label>
          <input className="input" id={`${uid}-address`} type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
      </form>
      {error && <Alert variant="danger">{error}</Alert>}
      <Alert variant="info">{(trial ? to.shop.trial : to.shop.inactive).replace('{plan}', planName)}</Alert>
    </Wizard>
  );
}
