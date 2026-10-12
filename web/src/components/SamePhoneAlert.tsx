import { useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';
import { useLang } from '../context/LanguageContext';
import { mergeCustomer, type CustomerDetail, type MergedCustomer, type SamePhoneCustomer } from '../api/customer.api';
import { formatPhone } from '../utils/phone';

// Shown on a customer whose phone number other customers have too: probably
// one person, booked from a device the shop had not seen. The oldest record
// is the one that stays; the newer ones are merged into it.
export default function SamePhoneAlert({
  shopId,
  customer,
  canMerge,
  onMerged,
}: {
  shopId: string;
  customer: CustomerDetail;
  /** Owner and managers; the API enforces it too. */
  canMerge: boolean;
  /** `keptId` is the record that stays: this one, or the older one this was merged into. */
  onMerged: (merged: MergedCustomer, keptId: string) => void;
}) {
  const { t } = useLang();
  const c = t.customers;
  const others = customer.samePhone ?? [];
  // What is about to be merged: `source` goes into `target`.
  const [pending, setPending] = useState<{ target: SamePhoneCustomer; source: SamePhoneCustomer } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (others.length === 0) return null;
  const self: SamePhoneCustomer = { id: customer.id, name: customer.name, createdAt: customer.createdAt };
  // `others` comes oldest first.
  const older = new Date(others[0].createdAt) < new Date(customer.createdAt) ? others[0] : null;
  const added = (o: SamePhoneCustomer) => new Date(o.createdAt).toLocaleDateString();

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    setError('');
    try {
      const merged = await mergeCustomer(shopId, pending.target.id, pending.source.id);
      setPending(null);
      onMerged(merged, pending.target.id);
    } catch {
      setPending(null);
      setError(c.mergeError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Alert
        variant="warning"
        title={c.samePhoneTitle.replace('{phone}', formatPhone(customer.phone))}
        actions={
          canMerge &&
          (older ? (
            <button type="button" className="btn btn--sm btn--wrap" onClick={() => setPending({ target: older, source: self })}>
              {c.samePhoneMergeInto.replace('{name}', older.name)}
            </button>
          ) : (
            others.map((o) => (
              <button key={o.id} type="button" className="btn btn--sm btn--wrap" onClick={() => setPending({ target: self, source: o })}>
                {c.samePhoneMergeHere.replace('{name}', o.name)}
              </button>
            ))
          ))
        }
      >
        {older ? c.samePhoneNewer : c.samePhoneOldest}{' '}
        {others.map((o, i) => (
          <span key={o.id}>
            {i > 0 && ', '}
            <Link to={`../${o.id}`} relative="path">{o.name}</Link> ({c.samePhoneAdded.replace('{date}', added(o))})
          </span>
        ))}
        {error && <> · {error}</>}
      </Alert>

      {pending && (
        <ConfirmDialog
          tone="warning"
          title={c.mergeTitle}
          message={c.samePhoneConfirm.replace('{source}', pending.source.name).replace('{target}', pending.target.name)}
          confirmLabel={c.mergeConfirmButton}
          cancelLabel={c.cancel}
          busy={busy}
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
