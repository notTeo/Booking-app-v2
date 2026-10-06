import { useState } from 'react';
import { getCustomer, type Customer } from '../../api/customer.api';
import { useShop } from '../../context/ShopContext';
import OwnerCustomerPicker from './OwnerCustomerPicker';
import {
  acceptableRuleCodes,
  createOwnerBooking,
  getApiError,
  isBookingRuleViolation,
  PRODUCT_OUT_OF_STOCK,
  rescheduleBooking,
  type Booking,
  type BookingRuleCode,
} from '../../api/booking.api';
import Alert from '../Alert';
import { canManageShop } from '../../utils/roles';
import ConfirmDialog from '../ConfirmDialog';
import { useLang } from '../../context/LanguageContext';
import { useBookingWizard } from '../../hooks/useBookingWizard';
import WizardStepsIndicator from './WizardStepsIndicator';
import ServiceSelectStep from './ServiceSelectStep';
import StaffSelectStep from './StaffSelectStep';
import DateTimeStep from './DateTimeStep';
import OwnerCustomerFormStep, { type OwnerCustomerFormValues } from './OwnerCustomerFormStep';
import RescheduleConfirmStep from './RescheduleConfirmStep';
import { dateInZone, shiftDate, todayInZone } from '../../utils/shopTime';
import { anticipatedRuleCodes, buildISODateTime } from './wizardUtils';

const SLOT_INTERVAL_OPTIONS = [10, 15, 20, 30] as const;

export default function OwnerBookingWizard({
  shopId,
  slug,
  initialMemberId,
  initialDate,
  timeHint,
  defaultShowOutside,
  onDone,
  hideTitle,
  reschedule,
  onCancel,
}: {
  shopId: string;
  slug: string;
  initialMemberId?: string;
  initialDate?: string;
  timeHint?: string;
  /** Start the date/time step with the out-of-hours toggle already on. */
  defaultShowOutside?: boolean;
  onDone: (booking: Booking) => void;
  /** Skip the internal heading when the wizard is embedded under a panel that already shows its own title (e.g. the calendar's quick-create panel). */
  hideTitle?: boolean;
  /** Move this booking (PATCH) instead of creating one. Needs `zone` for its shop-local date. */
  reschedule?: { booking: Booking; zone: string };
  /** Shows a Cancel button on every step, for flows with no other way out (the reschedule page). */
  onCancel?: () => void;
}) {
  const { t } = useLang();
  const { shop: memberShop } = useShop();
  // Who the booking is for, when picked on the first step (optional). Their
  // own service durations then show on the service cards and decide the slots.
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customDurations, setCustomDurations] = useState<Record<string, number>>({});
  const wizard = useBookingWizard({
    slug,
    shopId,
    slotCustomer: customer && { customerId: customer.id },
    initialMemberId: reschedule ? reschedule.booking.staffId : initialMemberId,
    initialDate: reschedule ? dateInZone(reschedule.booking.startTime, reschedule.zone) : initialDate,
    internal: true,
    reschedule: reschedule && {
      bookingId: reschedule.booking.id,
      service: { ...reschedule.booking.service, description: null },
      onExit: onCancel,
    },
  });
  const [submitting, setSubmitting] = useState(false);
  // After a 503 BOOKING_BUSY the submit button stays disabled (not spinning) for the Retry-After window.
  const [cooling, setCooling] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // The server is momentarily out of retry budget (503 BOOKING_BUSY) — never
  // shown as an error; kept separate from submitError so it can't render in
  // the red error style.
  const [busyNotice, setBusyNotice] = useState<string | null>(null);
  // Set when the server rejected the booking for a rule violation (422). The
  // form values are kept so "book anyway" can resend them, accepting exactly
  // the violations the server listed (a reschedule has no form values).
  const [pendingOverride, setPendingOverride] = useState<{
    values?: OwnerCustomerFormValues;
    codes: BookingRuleCode[];
  } | null>(null);

  if (wizard.loading) {
    return <div className="spinner-wrap"><div className="spinner spinner--lg" /></div>;
  }
  if (wizard.error || !wizard.shop) {
    return <Alert variant="danger">{wizard.error ?? t.public.somethingWrong}</Alert>;
  }

  function handlePickCustomer(picked: Customer) {
    setCustomer(picked);
    setCustomDurations({});
    getCustomer(shopId, picked.id)
      .then((detail) =>
        setCustomDurations(Object.fromEntries(detail.serviceDurations.map((d) => [d.serviceId, d.duration]))),
      )
      // Display only: the server applies the customer's durations either way.
      .catch(() => {});
  }

  function handleClearCustomer() {
    setCustomer(null);
    setCustomDurations({});
  }

  const selectedMember = wizard.shop.members.find((m) => m.id === wizard.selectedMemberId) ?? null;
  // The service as the steps show it: with the picked customer's own duration, when they have one.
  const shownService = wizard.selectedService && {
    ...wizard.selectedService,
    duration: customDurations[wizard.selectedService.id] ?? wizard.selectedService.duration,
  };
  // Rules the chosen slot is known to break, confirmed on the last step. null
  // (a typed-in "Other time") = unknown; a 422 then falls back to the dialog.
  const anticipated = anticipatedRuleCodes(wizard.slots, wizard.time);
  const newStartISO =
    wizard.date && wizard.time ? buildISODateTime(wizard.date, wizard.time, wizard.shop.timezone) : null;

  // Shared by create and reschedule: one place decides what a failed submit
  // means, so the two flows can never disagree on overrides or busy handling.
  function handleSubmitError(err: unknown, values?: OwnerCustomerFormValues) {
    const info = getApiError(err);
    if (info.status === 503 && info.code === 'BOOKING_BUSY') {
      // Not a rejection — the system is momentarily out of retry budget.
      // Never offered as an override; keep the button disabled for the
      // server's Retry-After window instead of resetting immediately.
      setPendingOverride(null);
      setBusyNotice(t.bookings.bookingBusy);
      setCooling(true);
      setTimeout(() => {
        setCooling(false);
        setSubmitting(false);
      }, (info.retryAfterSeconds ?? 1) * 1000);
      return;
    }
    const fallback = reschedule ? t.bookings.reschedule.error : t.bookings.createError;
    const acceptable = acceptableRuleCodes(info);
    if (acceptable) {
      // Ask before breaking a rule; overlap (409) is never offered an override.
      setPendingOverride({ values, codes: acceptable });
    } else if (isBookingRuleViolation(info)) {
      // A rule that can never be overridden (the booking window): say so,
      // don't offer "book anyway".
      setPendingOverride(null);
      setSubmitError(t.public.ruleErrors[info.code] ?? info.message ?? fallback);
    } else if (info.code === 'BOOKING_TOO_LONG') {
      setPendingOverride(null);
      setSubmitError(t.bookings.override.BOOKING_TOO_LONG);
    } else if (info.code === 'SLOT_TAKEN') {
      setPendingOverride(null);
      setSubmitError(t.bookings.override.SLOT_TAKEN);
    } else if (info.code === PRODUCT_OUT_OF_STOCK) {
      setPendingOverride(null);
      setSubmitError(t.products.outOfStockError);
    } else if (reschedule && info.status === 404) {
      setPendingOverride(null);
      setSubmitError(t.bookings.reschedule.notFound);
    } else {
      setPendingOverride(null);
      setSubmitError(info.message ?? fallback);
    }
    setSubmitting(false);
  }

  async function submitWith(request: () => Promise<Booking>, values?: OwnerCustomerFormValues) {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setBusyNotice(null);
    try {
      const booking = await request();
      setPendingOverride(null);
      onDone(booking);
      setSubmitting(false);
    } catch (err: unknown) {
      handleSubmitError(err, values);
    }
  }

  function handleSubmit(values: OwnerCustomerFormValues, acceptedRules?: BookingRuleCode[]) {
    if (!wizard.selectedServiceId) return;
    return submitWith(
      () =>
        createOwnerBooking(shopId, {
          ...(values.block
            ? { block: true }
            : { name: values.name, phone: values.phone, email: values.email }),
          serviceId: wizard.selectedServiceId!,
          staffId: wizard.selectedMemberId ?? undefined,
          startTime: buildISODateTime(wizard.date, wizard.time, wizard.shop!.timezone),
          notes: values.notes,
          ...((acceptedRules || values.acceptStockOverride) && {
            overrideRules: [
              ...(acceptedRules ?? []),
              ...(values.acceptStockOverride ? [PRODUCT_OUT_OF_STOCK] as const : []),
            ],
          }),
          ...(values.products && { products: values.products }),
        }),
      values,
    );
  }

  const serviceChanged = !!reschedule && wizard.selectedServiceId !== reschedule.booking.serviceId;

  function handleReschedule(acceptedRules?: BookingRuleCode[]) {
    if (!reschedule || !wizard.selectedMemberId || !wizard.selectedServiceId) return;
    return submitWith(() =>
      rescheduleBooking(shopId, reschedule.booking.id, {
        startTime: buildISODateTime(wizard.date, wizard.time, wizard.shop!.timezone),
        staffId: wizard.selectedMemberId!,
        ...(serviceChanged && { serviceId: wizard.selectedServiceId! }),
        ...(acceptedRules && { overrideRules: acceptedRules }),
      }),
    );
  }

  function handleBackFromForm() {
    setSubmitError(null);
    setBusyNotice(null);
    wizard.setStep(3);
  }

  return (
    <section className="public-section">
      {(!hideTitle || onCancel) && (
        <div className="page-header">
          {!hideTitle && (
            <h2 className="t-heading">{reschedule ? t.bookings.reschedule.title : t.bookings.newBookingTitle}</h2>
          )}
          {onCancel && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel} disabled={submitting}>
              {t.bookings.cancel}
            </button>
          )}
        </div>
      )}

      <WizardStepsIndicator
        currentStep={wizard.step}
        lastLabel={reschedule ? t.bookings.reschedule.confirmStep : undefined}
      />

      {/* Searching customers needs permission to see them; the API returns nothing otherwise. */}
      {wizard.step === 1 && !reschedule && memberShop?.canViewCustomerDetails !== false && (
        <OwnerCustomerPicker
          shopId={shopId}
          customer={customer}
          onPick={handlePickCustomer}
          onClear={handleClearCustomer}
        />
      )}

      {wizard.step === 1 && (
        <ServiceSelectStep
          services={wizard.services}
          onSelect={wizard.handleSelectService}
          customDurations={customDurations}
        />
      )}

      {wizard.step === 2 && (
        <StaffSelectStep
          members={wizard.eligibleMembers}
          selectedService={shownService}
          onSelect={wizard.handleSelectMember}
          onBack={wizard.goBack}
          hideNoPreference={!!reschedule}
        />
      )}

      {wizard.step === 3 && (
        <DateTimeStep
          date={wizard.date}
          time={wizard.time}
          slots={wizard.slots}
          slotsError={wizard.slotsError}
          onRetrySlots={wizard.retrySlots}
          selectedService={shownService}
          selectedMember={selectedMember}
          timeHint={timeHint}
          defaultShowOutside={defaultShowOutside}
          // Owners may log past bookings; the advance window is never overridable.
          maxDate={shiftDate(todayInZone(wizard.shop.timezone), wizard.shop.maxAdvanceDays)}
          mode="internal"
          interval={wizard.intervalMinutes ?? wizard.shop.slotIntervalMinutes}
          intervalOptions={SLOT_INTERVAL_OPTIONS}
          onIntervalChange={wizard.handleIntervalChange}
          closedLinkTo={
            wizard.selectedMemberId
              ? `/shops/${slug}/team/${wizard.selectedMemberId}`
              : `/shops/${slug}/team`
          }
          onDateChange={wizard.handleDateChange}
          onSelectTime={wizard.setTime}
          onBack={wizard.goBack}
          onContinue={() => wizard.setStep(4)}
        />
      )}

      {wizard.step === 4 && reschedule && newStartISO && (
        <RescheduleConfirmStep
          customerName={
            reschedule.booking.customer.contactHidden ? t.customers.hiddenLabel : reschedule.booking.customer.name
          }
          currentStartISO={reschedule.booking.startTime}
          previousServiceName={serviceChanged ? reschedule.booking.service.name : undefined}
          zone={wizard.shop.timezone}
          newStartISO={newStartISO}
          selectedService={wizard.selectedService}
          selectedMember={selectedMember}
          outsideRules={anticipated ?? []}
          unchanged={
            !serviceChanged &&
            wizard.selectedMemberId === reschedule.booking.staffId &&
            new Date(newStartISO).getTime() === new Date(reschedule.booking.startTime).getTime()
          }
          onSubmit={() => handleReschedule(anticipated && anticipated.length > 0 ? anticipated : undefined)}
          onBack={handleBackFromForm}
          submitting={submitting}
          cooling={cooling}
          error={submitError}
          notice={busyNotice}
        />
      )}

      {wizard.step === 4 && !reschedule && (
        <OwnerCustomerFormStep
          shopId={shopId}
          initialCustomer={customer}
          selectedService={shownService}
          selectedMember={selectedMember}
          date={wizard.date}
          time={wizard.time}
          outsideRules={anticipated ?? []}
          products={wizard.shop.products}
          canOverStock={canManageShop(memberShop?.role)}
          onSubmit={(values) => handleSubmit(values, anticipated && anticipated.length > 0 ? anticipated : undefined)}
          onBack={handleBackFromForm}
          submitting={submitting}
          cooling={cooling}
          error={submitError}
          notice={busyNotice}
        />
      )}

      {pendingOverride && (
        <ConfirmDialog
          title={t.bookings.override.title}
          message={pendingOverride.codes.map((c) => t.bookings.override[c]).join(' ')}
          confirmLabel={reschedule ? t.bookings.reschedule.submitAnyway : t.bookings.override.confirm}
          cancelLabel={t.bookings.override.cancel}
          tone="warning"
          busy={submitting}
          onConfirm={() =>
            reschedule
              ? handleReschedule(pendingOverride.codes)
              : pendingOverride.values && handleSubmit(pendingOverride.values, pendingOverride.codes)
          }
          onCancel={() => setPendingOverride(null)}
        />
      )}
    </section>
  );
}
