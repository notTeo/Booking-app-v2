import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getManagedBooking,
  rescheduleBookingByToken,
  type CustomerChangeBlock,
  type ManagedBooking,
  type RescheduleResult,
} from '../api/public.api';
import { getApiError, isBookingRuleViolation } from '../api/booking.api';
import { useLang } from '../context/LanguageContext';
import { useBookingWizard } from '../hooks/useBookingWizard';
import Alert from '../components/Alert';
import WizardStepsIndicator from '../components/booking-wizard/WizardStepsIndicator';
import StaffSelectStep from '../components/booking-wizard/StaffSelectStep';
import DateTimeStep from '../components/booking-wizard/DateTimeStep';
import RescheduleConfirmStep from '../components/booking-wizard/RescheduleConfirmStep';
import { buildISODateTime } from '../components/booking-wizard/wizardUtils';
import { dateInZone, formatDateTimeInZone, shiftDate, todayInZone } from '../utils/shopTime';
import '../styles/pages/public.css';

/** One centered card: every state of this page that isn't the wizard itself. */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="page page--center">
      <div className="card card--auth card--center">{children}</div>
    </div>
  );
}

// Reached from the "Reschedule booking" link in the customer's email. The
// token in the link is the only credential; what is allowed (and until when)
// is decided by the shop's settings and comes back with the booking.
export default function RescheduleBookingPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { t } = useLang();

  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [error, setError] = useState(token ? '' : t.rescheduleBooking.invalidLink);
  const [kept, setKept] = useState(false);
  const [result, setResult] = useState<RescheduleResult | null>(null);

  useEffect(() => {
    if (!token) return;
    getManagedBooking(token)
      .then(setBooking)
      .catch((err: unknown) => {
        const { status } = getApiError(err);
        setError(status === 404 || status === 400 ? t.rescheduleBooking.notFound : t.rescheduleBooking.error);
      });
  }, [token]);

  if (error) return <Notice><Alert variant="danger">{error}</Alert></Notice>;
  if (!booking) return <Notice><div className="spinner spinner--lg" /></Notice>;

  const zone = booking.shop.timezone;

  if (result) {
    return (
      <Notice>
        <h1 className="t-heading">{t.rescheduleBooking.done}</h1>
        <p className="card__text">
          <strong>{result.serviceName}</strong> · {result.shopName}
        </p>
        <p className="card__text">
          {t.rescheduleBooking.doneText} <strong>{formatDateTimeInZone(result.startTime, zone)}</strong>
        </p>
        <p className="card__text">{t.rescheduleBooking.doneEmail}</p>
      </Notice>
    );
  }

  if (kept) return <Notice><p>{t.rescheduleBooking.kept}</p></Notice>;

  if (!booking.reschedule.allowed) {
    return (
      <Notice>
        <h1 className="t-heading">{t.rescheduleBooking.title}</h1>
        <p className="card__text">
          <strong>{booking.service.name}</strong> · {booking.shop.name}
        </p>
        <p className="card__text">{formatDateTimeInZone(booking.startTime, zone)}</p>
        <Alert variant="warning">{blockMessage(t, booking)}</Alert>
      </Notice>
    );
  }

  return (
    <div className="public-page">
      <header className="page-hero">
        <div className="page-hero__inner">
          <h1 className="t-title">{booking.shop.name}</h1>
        </div>
      </header>
      <main className="public-main">
        <CustomerRescheduleWizard
          token={token}
          booking={booking}
          onDone={setResult}
          onKeep={() => setKept(true)}
          onLocked={() => {
            // The shop's rules changed (or the clock ran out) mid-flow: reload
            // so the page explains why instead of offering a dead form.
            getManagedBooking(token).then(setBooking).catch(() => setError(t.rescheduleBooking.error));
          }}
        />
      </main>
    </div>
  );
}

type T = ReturnType<typeof useLang>['t'];

function blockMessage(t: T, booking: ManagedBooking): string {
  const messages: Record<CustomerChangeBlock, string> = {
    BOOKING_RESCHEDULED: t.rescheduleBooking.rescheduled.replace(
      '{when}',
      booking.rescheduledTo ? formatDateTimeInZone(booking.rescheduledTo.startTime, booking.shop.timezone) : '',
    ),
    BOOKING_ALREADY_CANCELED: t.rescheduleBooking.alreadyCancelled,
    BOOKING_COMPLETED: t.rescheduleBooking.alreadyCompleted,
    BOOKING_NO_SHOW: t.rescheduleBooking.markedNoShow,
    BOOKING_IN_PAST: t.rescheduleBooking.pastBooking,
    CANCEL_WINDOW_CLOSED: t.rescheduleBooking.error,
    RESCHEDULE_DISABLED: t.rescheduleBooking.disabled,
    RESCHEDULE_WINDOW_CLOSED: t.rescheduleBooking.windowClosed.replace('{n}', String(booking.reschedule.cutoffHours)),
  };
  return booking.reschedule.reason ? messages[booking.reschedule.reason] : t.rescheduleBooking.error;
}

// Codes that mean "this booking can no longer be rescheduled at all", as
// opposed to "that particular time didn't work".
const LOCKING_CODES = new Set<string>([
  'BOOKING_RESCHEDULED',
  'BOOKING_ALREADY_CANCELED',
  'BOOKING_COMPLETED',
  'BOOKING_NO_SHOW',
  'BOOKING_IN_PAST',
  'RESCHEDULE_DISABLED',
  'RESCHEDULE_WINDOW_CLOSED',
]);

function CustomerRescheduleWizard({
  token,
  booking,
  onDone,
  onKeep,
  onLocked,
}: {
  token: string;
  booking: ManagedBooking;
  onDone: (result: RescheduleResult) => void;
  onKeep: () => void;
  onLocked: () => void;
}) {
  const { t } = useLang();
  const zone = booking.shop.timezone;
  // Same service, new time and (optionally) another team member: no service
  // step, so Back on the first step keeps the booking as it is.
  const wizard = useBookingWizard({
    slug: booking.shop.slug,
    initialMemberId: booking.staff.id,
    initialDate: dateInZone(booking.startTime, zone),
    reschedule: {
      token,
      service: { ...booking.service, description: null },
      fixedService: true,
      onExit: onKeep,
    },
  });
  const [submitting, setSubmitting] = useState(false);
  // After a 503 BOOKING_BUSY the button stays disabled (not spinning) for the Retry-After window.
  const [cooling, setCooling] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busyNotice, setBusyNotice] = useState<string | null>(null);

  if (wizard.loading) {
    return <div className="spinner-wrap"><div className="spinner spinner--lg" /></div>;
  }
  if (wizard.error || !wizard.shop) {
    return <Alert variant="danger">{wizard.error ?? t.public.somethingWrong}</Alert>;
  }
  const shop = wizard.shop;

  const selectedMember = shop.members.find((m) => m.id === wizard.selectedMemberId) ?? null;
  const newStartISO = wizard.date && wizard.time ? buildISODateTime(wizard.date, wizard.time, zone) : null;

  async function handleSubmit() {
    if (submitting || !newStartISO || !wizard.selectedMemberId) return;
    setSubmitting(true);
    setSubmitError(null);
    setBusyNotice(null);
    try {
      onDone(await rescheduleBookingByToken(token, { startTime: newStartISO, staffId: wizard.selectedMemberId }));
    } catch (err: unknown) {
      const info = getApiError(err);
      if (info.status === 503 && info.code === 'BOOKING_BUSY') {
        setBusyNotice(t.public.bookingBusy);
        setCooling(true);
        setTimeout(() => {
          setCooling(false);
          setSubmitting(false);
        }, (info.retryAfterSeconds ?? 1) * 1000);
        return;
      }
      if (info.code && LOCKING_CODES.has(info.code)) {
        onLocked();
        return;
      }
      setSubmitError(
        isBookingRuleViolation(info)
          ? t.public.ruleErrors[info.code]
          : info.code === 'SLOT_TAKEN'
            ? t.public.ruleErrors.SLOT_TAKEN
            : info.code === 'BOOKING_UNCHANGED'
              ? t.bookings.reschedule.same
              : info.status === 400
                ? t.rescheduleBooking.staffUnavailable
                : t.rescheduleBooking.error,
      );
      setSubmitting(false);
    }
  }

  return (
    <section className="public-section">
      <div className="page-header">
        <h2 className="t-heading">{t.rescheduleBooking.title}</h2>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onKeep} disabled={submitting}>
          {t.rescheduleBooking.keepButton}
        </button>
      </div>

      <p className="t-body-sm">
        <span className="t-muted">{t.rescheduleBooking.currentLabel}</span>{' '}
        <strong>{formatDateTimeInZone(booking.startTime, zone)}</strong>
        {booking.staff.name && <> · {booking.staff.name}</>}
      </p>

      <WizardStepsIndicator
        currentStep={wizard.step}
        firstStep={wizard.firstStep}
        lastLabel={t.bookings.reschedule.confirmStep}
      />

      {wizard.step === 2 && (
        <StaffSelectStep
          members={wizard.eligibleMembers}
          selectedService={wizard.selectedService}
          onSelect={wizard.handleSelectMember}
          onBack={wizard.goBack}
          hideNoPreference
        />
      )}

      {wizard.step === 3 && (
        <DateTimeStep
          date={wizard.date}
          time={wizard.time}
          slots={wizard.slots}
          slotsError={wizard.slotsError}
          onRetrySlots={wizard.retrySlots}
          selectedService={wizard.selectedService}
          selectedMember={selectedMember}
          minDate={todayInZone(zone)}
          maxDate={shiftDate(todayInZone(zone), shop.maxAdvanceDays)}
          mode="public"
          onDateChange={wizard.handleDateChange}
          onSelectTime={wizard.setTime}
          onBack={wizard.goBack}
          onContinue={() => wizard.setStep(4)}
        />
      )}

      {wizard.step === 4 && newStartISO && (
        <RescheduleConfirmStep
          currentStartISO={booking.startTime}
          zone={zone}
          newStartISO={newStartISO}
          selectedService={wizard.selectedService}
          selectedMember={selectedMember}
          unchanged={
            wizard.selectedMemberId === booking.staff.id &&
            new Date(newStartISO).getTime() === new Date(booking.startTime).getTime()
          }
          onSubmit={handleSubmit}
          onBack={() => {
            setSubmitError(null);
            setBusyNotice(null);
            wizard.setStep(3);
          }}
          submitting={submitting}
          cooling={cooling}
          error={submitError}
          notice={busyNotice}
        />
      )}
    </section>
  );
}
