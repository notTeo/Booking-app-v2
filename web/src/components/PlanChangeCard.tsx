import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { changeShopPlan, type Shop, type ShopPlan } from '../api/shop.api';
import { PLAN_NAMES } from '../config/pricing';
import { useIsCompact } from '../hooks/useIsCompact';
import { apiErrorMessage } from '../utils/apiError';
import { PLAN_FEATURES, PLAN_ORDER } from '../utils/onboarding';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';
import PlanCards from './PlanCards';

// Switching plan, for the owner while the shop's free trial runs. A smaller
// plan switches things off (extra staff, products), so it asks first.
export default function PlanChangeCard({ shop, onChanged }: { shop: Shop; onChanged: (shop: Shop) => void }) {
  const { t } = useLang();
  const tc = t.onboarding.changePlan;
  const compact = useIsCompact();
  const [picked, setPicked] = useState<ShopPlan>(shop.plan);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const same = picked === shop.plan;
  const smaller = PLAN_ORDER.indexOf(picked) < PLAN_ORDER.indexOf(shop.plan);
  const name = PLAN_NAMES[picked];

  const change = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setDone('');
    try {
      const updated = await changeShopPlan(shop.id, picked);
      setDone(tc.changed.replace('{plan}', PLAN_NAMES[updated.plan]));
      onChanged(updated);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, tc.error));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="card">
      <p className="card__text">{tc.intro}</p>
      <PlanCards
        select={{
          label: t.shopPlan.title,
          value: picked,
          onChange: (plan) => { setPicked(plan); setDone(''); setError(''); },
          stacked: compact,
          features: 'none',
          current: shop.plan,
          disabled: busy,
        }}
      />
      {error && <Alert variant="danger">{error}</Alert>}
      {done && <Alert variant="success">{done}</Alert>}
      <div className="cluster">
        <button
          type="button"
          className={`btn${busy && !confirming ? ' is-loading' : ''}`}
          disabled={same}
          onClick={() => (smaller ? setConfirming(true) : change())}
        >
          {(same ? tc.onPlan : tc.switchTo).replace('{plan}', name)}
        </button>
        <Link to="/pricing" className="btn btn--ghost">{t.shopPlan.seePlans}</Link>
      </div>
      {confirming && (
        <ConfirmDialog
          title={tc.confirmTitle.replace('{plan}', name)}
          message={
            picked === 'SOLO'
              ? tc.confirmSolo
              : tc.confirmSmaller.replace('{plan}', name).replace('{n}', String(PLAN_FEATURES[picked].staffLimit))
          }
          confirmLabel={tc.switchTo.replace('{plan}', name)}
          cancelLabel={tc.cancel}
          tone="warning"
          busy={busy}
          onConfirm={change}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
