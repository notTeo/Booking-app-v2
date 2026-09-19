import { useState } from 'react';
import { createOwnerBooking, type Booking } from '../../api/booking.api';
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
  const wizard = useBookingWizard({ slug, initialMemberId, initialDate });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (wizard.loading) {
    return <div className="public-loading"><div className="spinner" /></div>;
  }
  if (wizard.error || !wizard.shop) {
    return <div className="public-error"><p>{wizard.error ?? t.public.somethingWrong}</p></div>;
  }

  const selectedMember = wizard.shop.members.find((m) => m.id === wizard.selectedMemberId) ?? null;

  async function handleSubmit(values: OwnerCustomerFormValues) {
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
        startTime: buildISODateTime(wizard.date, wizard.time),
        notes: values.notes,
      });
      onDone(booking);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? t.bookings.createError;
      setSubmitError(msg);
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
          onSubmit={handleSubmit}
          onBack={handleBackFromForm}
          submitting={submitting}
          error={submitError}
        />
      )}
    </section>
  );
}
