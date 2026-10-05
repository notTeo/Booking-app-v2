import type { Booking, BookingRuleCode } from '../../api/booking.api';
import type { Service, ShopMember } from '../../api/public.api';
import { useLang } from '../../context/LanguageContext';
import { formatDateTimeInZone } from '../../utils/shopTime';
import Alert from '../Alert';

/**
 * Last step of the owner wizard in reschedule mode: the customer is already
 * known, so instead of the customer form it shows the old and the new time and
 * submits the move.
 */
export default function RescheduleConfirmStep({
  booking,
  zone,
  newStartISO,
  selectedService,
  selectedMember,
  outsideRules = [],
  unchanged,
  onSubmit,
  onBack,
  submitting,
  cooling = false,
  error,
  notice,
}: {
  booking: Booking;
  zone: string;
  newStartISO: string;
  selectedService: Service | null;
  selectedMember: ShopMember | null;
  /** Rules the chosen time is known to break; non-empty shows the confirmation panel. */
  outsideRules?: BookingRuleCode[];
  /** The chosen time and provider are the booking's current ones: nothing to submit. */
  unchanged: boolean;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  cooling?: boolean;
  error: string | null;
  notice?: string | null;
}) {
  const { t } = useLang();
  const onlyOffGrid = outsideRules.length > 0 && outsideRules.every((c) => c === 'OFF_SLOT_GRID');

  return (
    <div className="public-wizard-panel">
      {selectedService && (
        <p className="t-body-sm t-muted">
          {t.public.serviceContext} <strong>{selectedService.name}</strong>
          {selectedMember && (
            <> · {t.public.staffContext} <strong>{selectedMember.name}</strong></>
          )}
        </p>
      )}

      <div>
        <p className="t-body">
          <strong>{booking.customer.contactHidden ? t.customers.hiddenLabel : booking.customer.name}</strong>
        </p>
        <p className="t-body-sm">
          <span className="t-muted">{t.bookings.reschedule.from}</span>{' '}
          <s>{formatDateTimeInZone(booking.startTime, zone)}</s>
        </p>
        <p className="t-body-sm">
          <span className="t-muted">{t.bookings.reschedule.to}</span>{' '}
          <strong>{formatDateTimeInZone(newStartISO, zone)}</strong>
        </p>
      </div>

      {outsideRules.length > 0 && (
        <Alert
          variant="warning"
          title={onlyOffGrid ? t.bookings.intervalPicker.panelTitle : t.bookings.outsideHours.panelTitle}
        >
          <p>{outsideRules.map((c) => t.bookings.override[c]).join(' ')}</p>
          <p>{t.bookings.outsideHours.panelBody}</p>
        </Alert>
      )}

      {unchanged && <Alert variant="info">{t.bookings.reschedule.same}</Alert>}
      {notice && <Alert variant="info">{notice}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="cluster public-wizard-actions">
        <button className="btn btn--ghost" onClick={onBack} disabled={submitting}>
          {t.public.back}
        </button>
        <button
          className={`btn${submitting && !cooling ? ' is-loading' : ''}`}
          onClick={() => { if (!submitting) onSubmit(); }}
          aria-busy={submitting && !cooling}
          disabled={cooling || unchanged}
        >
          {outsideRules.length > 0 ? t.bookings.reschedule.submitAnyway : t.bookings.reschedule.submit}
        </button>
      </div>
    </div>
  );
}
