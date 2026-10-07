import SaveBar from './SaveBar';
import { useEffect, useId, useState } from 'react';
import { useLang } from '../context/LanguageContext';
import { getServices, type Service } from '../api/service.api';
import { setCustomerServiceDurations, type CustomerServiceDuration } from '../api/customer.api';
import Alert from './Alert';

interface Props {
  shopId: string;
  customerId: string;
  /** The customer's saved custom durations. */
  durations: CustomerServiceDuration[];
  onSaved: (durations: CustomerServiceDuration[]) => void;
}

const toDraft = (durations: CustomerServiceDuration[]) =>
  Object.fromEntries(durations.map((d) => [d.serviceId, String(d.duration)]));

// A whole number of minutes the API accepts; an empty field means "standard".
const isValid = (value: string) => value === '' || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 1440);

/** Customer page card: how long each service takes for this customer, when not the standard time. */
export default function CustomerServiceDurations({ shopId, customerId, durations, onSaved }: Props) {
  const uid = useId();
  const { t } = useLang();
  const c = t.customers;

  const [services, setServices] = useState<Service[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Minutes typed per service id; a missing or empty entry is the standard duration.
  const [draft, setDraft] = useState<Record<string, string>>(() => toDraft(durations));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let stale = false;
    getServices(shopId)
      .then((list) => { if (!stale) setServices(list); })
      .catch(() => { if (!stale) setLoadError(true); });
    return () => { stale = true; };
  }, [shopId]);

  const savedDraft = toDraft(durations);
  // Active services, plus an inactive one that still carries a custom duration.
  const rows = (services ?? []).filter((s) => s.isActive || savedDraft[s.id] !== undefined);
  const isDirty = rows.some((s) => (draft[s.id] ?? '') !== (savedDraft[s.id] ?? ''));
  const allValid = rows.every((s) => isValid(draft[s.id] ?? ''));

  const handleSave = async () => {
    if (saving || !isDirty || !allValid) return;
    setSaving(true);
    setSaveError(false);
    setSaved(false);
    try {
      const items = rows
        .filter((s) => (draft[s.id] ?? '') !== '')
        .map((s) => ({ serviceId: s.id, duration: Number(draft[s.id]) }));
      onSaved(await setCustomerServiceDurations(shopId, customerId, items));
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`card${isDirty ? ' card--unsaved' : ''}`}>
      <h2 className="card__title">{c.durationsHeading}</h2>
      <p className="card__text">{c.durationsBody}</p>
      {loadError && <Alert variant="danger">{c.durationsErrorLoad}</Alert>}
      {services && rows.length === 0 && <p className="card__text">{c.durationsNoServices}</p>}
      {rows.map((s) => {
        const value = draft[s.id] ?? '';
        return (
          <div key={s.id} className="setting-row">
            <label className="setting-row__label" htmlFor={`${uid}-${s.id}`}>
              <span className="setting-row__title">{s.name}</span>
              <span className="setting-row__text">
                {c.durationsStandard.replace('{n}', String(s.duration))}
              </span>
            </label>
            <input
              id={`${uid}-${s.id}`}
              className="input input--sm customer-durations__input"
              type="number"
              inputMode="numeric"
              min="1"
              max="1440"
              value={value}
              onChange={(e) => { setSaved(false); setDraft((d) => ({ ...d, [s.id]: e.target.value })); }}
              placeholder={String(s.duration)}
              aria-invalid={!isValid(value)}
              aria-describedby={`${uid}-unit`}
              disabled={saving}
            />
          </div>
        );
      })}
      <span id={`${uid}-unit`} className="visually-hidden">{c.durationsUnit}</span>
      {!allValid && <Alert variant="danger">{c.durationsInvalid}</Alert>}
      {saveError && <Alert variant="danger">{c.durationsErrorSave}</Alert>}
      {saved && <Alert variant="success">{c.durationsSaved}</Alert>}
      {rows.length > 0 &&
        (isDirty ? (
          <SaveBar label={c.save} saving={saving} disabled={!allValid} onSave={handleSave} />
        ) : (
          <button className="btn" disabled>{c.save}</button>
        ))}
    </div>
  );
}
