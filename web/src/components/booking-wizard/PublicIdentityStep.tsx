import { useId, useState } from 'react';
import { useLang } from '../../context/LanguageContext';
import { isPlausiblePhone } from '../../utils/phone';
import Alert from '../Alert';

/**
 * Where the customer stands before picking a service:
 * - 'ask': this browser has saved details; they have not said whether to use them.
 * - 'known': their phone is used to find times that fit them.
 * - 'anonymous': a plain booking with the standard times.
 */
export type PublicIdentity = 'ask' | 'known' | 'anonymous';

/**
 * The public wizard's opening question. A returning customer's phone lets the
 * shop offer times that fit their own service durations; nothing about them is
 * shown here that this browser did not already hold.
 */
export default function PublicIdentityStep({
  identity,
  name,
  phone,
  onConfirm,
  onDecline,
  onUsePhone,
}: {
  identity: PublicIdentity;
  /** The saved or entered details being offered. */
  name: string;
  phone: string;
  /** "Yes, that's me": use the saved details. */
  onConfirm: () => void;
  /** "Someone else" / "Not you?": drop the details and book with standard times. */
  onDecline: () => void;
  onUsePhone: (phone: string) => void;
}) {
  const uid = useId();
  const { t } = useLang();
  const i = t.public.identity;
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');

  if (identity === 'ask') {
    return (
      <Alert
        variant="info"
        title={i.askTitle.replace('{name}', name || phone)}
        actions={
          <>
            <button type="button" className="btn btn--sm" onClick={onConfirm}>{i.yes}</button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={onDecline}>{i.no}</button>
          </>
        }
      >
        {i.askBody}
      </Alert>
    );
  }

  if (identity === 'known') {
    return (
      <div className="cluster cluster--tight t-body-sm t-muted">
        <span>{i.knownAs} <strong>{name || phone}</strong></span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDecline}>{i.notYou}</button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="cluster">
        <button type="button" className="btn btn--ghost btn--sm btn--wrap" onClick={() => setOpen(true)}>{i.prompt}</button>
      </div>
    );
  }

  return (
    <form
      className="public-stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (isPlausiblePhone(typed)) onUsePhone(typed.trim());
      }}
    >
      <label className="field__label" htmlFor={`${uid}-phone`}>{i.phoneLabel}</label>
      <input
        id={`${uid}-phone`}
        className="input"
        type="tel"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={t.public.phonePlaceholder}
        autoComplete="tel"
        aria-describedby={`${uid}-hint`}
      />
      <p id={`${uid}-hint`} className="field__hint">{i.phoneHint}</p>
      <div className="cluster cluster--tight">
        <button type="submit" className="btn btn--secondary btn--sm" disabled={!isPlausiblePhone(typed)}>{i.usePhone}</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setOpen(false); setTyped(''); }}>{i.cancel}</button>
      </div>
    </form>
  );
}
