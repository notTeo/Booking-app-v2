import { useState } from 'react';
import {
  acceptableRuleCodes,
  createOwnerBooking,
  getApiError,
  isBookingRuleViolation,
  type Booking,
  type BookingRuleCode,
} from '../../api/booking.api';
import ConfirmDialog from '../ConfirmDialog';
import { useLang } from '../../context/LanguageContext';
import { useBookingWizard } from '../../hooks/useBookingWizard';
import WizardStepsIndicator from './WizardStepsIndicator';
import ServiceSelectStep from './ServiceSelectStep';
import StaffSelectStep from './StaffSelectStep';
import DateTimeStep from './DateTimeStep';
import OwnerCustomerFormStep, { type OwnerCustomerFormValues } from './OwnerCustomerFormStep';
import { buildISODateTime } from './wizardUtils';

export default function OwnerBookingWizard({
  shopId,
  slug,
  initialMemberId,
  initialDate,
  timeHint,
  onDone,
  hideTitle,
}: {
  shopId: string;
  slug: string;
  initialMemberId?: string;
  initialDate?: string;
  timeHint?: string;
  onDone: (booking: Booking) => void;
  /** Skip the internal heading when the wizard is embedded under a panel that already shows its own title (e.g. the calendar's quick-create panel). */
  hideTitle?: boolean;
}) {
  const { t } = useLang();
  const wizard = useBookingWizard({ slug, shopId, initialMemberId, initialDate, internal: true });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set when the server rejected the booking for a rule violation (422). The
  // form values are kept so "book anyway" can resend them, accepting exactly
  // the violations the server listed.
  const [pendingOverride, setPendingOverride] = useState<{
    values: OwnerCustomerFormValues;
    codes: BookingRuleCode[];
  } | null>(null);

  if (wizard.loading) {
    return <div className="public-loading"><div className="spinner" /></div>;
  }
  if (wizard.error || !wizard.shop) {
    return <div className="public-error"><p>{wizard.error ?? t.public.somethingWrong}</p></div>;
  }

  const selectedMember = wizard.shop.members.find((m) => m.id === wizard.selectedMemberId) ?? null;

  async function handleSubmit(
    values: OwnerCustomerFormValues,
    acceptedRules?: BookingRuleCode[],
  ) {
    if (!wizard.selectedServiceId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const booking = await createOwnerBooking(shopId, {
        name: values.name,
        phone: values.phone,
        email: values.email,
        serviceId: wizard.selectedServiceId,
        staffId: wizard.selectedMemberId ?? undefined,
        startTime: buildISODateTime(wizard.date, wizard.time, wizard.shop!.timezone),
        notes: values.notes,
        ...(acceptedRules && { overrideRules: acceptedRules }),
      });
      setPendingOverride(null);
      onDone(booking);
    } catch (err: unknown) {
      const info = getApiError(err);
      const acceptable = acceptableRuleCodes(info);
      if (acceptable) {
        // Ask before breaking a rule; overlap (409) is never offered an override.
        setPendingOverride({ values, codes: acceptable });
      } else if (isBookingRuleViolation(info)) {
        // A rule that can never be overridden (the booking window): say so,
        // don't offer "book anyway".
        setPendingOverride(null);
        setSubmitError(t.public.ruleErrors[info.code] ?? info.message ?? t.bookings.createError);
      } else if (info.code === 'SLOT_TAKEN') {
        setPendingOverride(null);
        setSubmitError(t.bookings.override.SLOT_TAKEN);
      } else {
        setPendingOverride(null);
        setSubmitError(info.message ?? t.bookings.createError);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackFromForm() {
    setSubmitError(null);
    wizard.setStep(3);
  }

  return (
    <section className="public-section">
      {!hideTitle && <h2 className="public-section-title">{t.bookings.newBookingTitle}</h2>}

      <WizardStepsIndicator currentStep={wizard.step} />

      {wizard.step === 1 && (
        <ServiceSelectStep services={wizard.shop.services} onSelect={wizard.handleSelectService} />
      )}

      {wizard.step === 2 && (
        <StaffSelectStep
          members={wizard.eligibleMembers}
          selectedService={wizard.selectedService}
          onSelect={wizard.handleSelectMember}
          onBack={wizard.goBack}
        />
      )}

      {wizard.step === 3 && (
        <DateTimeStep
          date={wizard.date}
          time={wizard.time}
          slots={wizard.slots}
          selectedService={wizard.selectedService}
          selectedMember={selectedMember}
          timeHint={timeHint}
          mode="internal"
          closedLinkTo={
            wizard.selectedMemberId
              ? `/shops/${slug}/team/${wizard.selectedMemberId}`
              : `/shops/${slug}/working-hours`
          }
          onDateChange={wizard.handleDateChange}
          onSelectTime={wizard.setTime}
          onBack={wizard.goBack}
          onContinue={() => wizard.setStep(4)}
        />
      )}

      {wizard.step === 4 && (
        <OwnerCustomerFormStep
          shopId={shopId}
          selectedService={wizard.selectedService}
          selectedMember={selectedMember}
          date={wizard.date}
          time={wizard.time}
          onSubmit={(values) => handleSubmit(values)}
          onBack={handleBackFromForm}
          submitting={submitting}
          error={submitError}
        />
      )}

      {pendingOverride && (
        <ConfirmDialog
          title={t.bookings.override.title}
          message={pendingOverride.codes.map((c) => t.bookings.override[c]).join(' ')}
          confirmLabel={t.bookings.override.confirm}
          cancelLabel={t.bookings.override.cancel}
          busy={submitting}
          onConfirm={() => handleSubmit(pendingOverride.values, pendingOverride.codes)}
          onCancel={() => setPendingOverride(null)}
        />
      )}
    </section>
  );
}
