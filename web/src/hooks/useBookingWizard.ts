import { useEffect, useRef, useState } from 'react';
import { getOwnerSlots, getWizardInfo } from '../api/booking.api';
import { getShopInfo, getPublicSlots, type ShopInfo, type Service, type ShopMember, type SlotsResponse } from '../api/public.api';
import { useLang } from '../context/LanguageContext';

const NO_SLOTS: SlotsResponse = { status: 'ok', slots: [] };

export type WizardStep = 1 | 2 | 3 | 4;

export interface UseBookingWizardOptions {
  slug: string;
  /** Required when `internal` — owner slots come from the authenticated API. */
  shopId?: string;
  /**
   * When set (calendar quick-create flow), the staff member is already known.
   * Picking a service jumps straight from step 1 to step 3, skipping the
   * staff-selection step, instead of the normal 1 -> 2 -> 3 flow. Service
   * selection itself can never be skipped since slot generation requires it.
   */
  initialMemberId?: string | null;
  initialDate?: string;
  /**
   * True for the shop's own booking wizard (owner/staff booking on a
   * customer's behalf) — filters staff by "bookable internally" instead of
   * "bookable by customers", and threads the same distinction through slot
   * lookups since both flows share this one hook/endpoint.
   */
  internal?: boolean;
  /**
   * Move an existing booking instead of creating one. The wizard opens on the
   * date/time step with the booking's own service (possibly deactivated) and
   * slot lookups exclude the booking, so it never blocks its own new time.
   * Pair with `initialMemberId` (the booking's provider) and `initialDate`
   * (its shop-local date).
   */
  reschedule?: {
    /** Owner wizard: the booking's id (authenticated slots). */
    bookingId?: string;
    /** Customer page: the link's token (public slots). */
    token?: string;
    service: Service;
    /** Customer page: the service can't change, so there is no step 1. */
    fixedService?: boolean;
    /** Back on the first step leaves the wizard. */
    onExit?: () => void;
  };
}

export interface UseBookingWizardResult {
  shop: ShopInfo | null;
  loading: boolean;
  error: string | null;
  /** The API said this slug doesn't exist (as opposed to a network/server error). */
  notFound: boolean;
  step: WizardStep;
  setStep: (s: WizardStep) => void;
  selectedServiceId: string | null;
  selectedMemberId: string | null;
  date: string;
  time: string;
  setTime: (t: string) => void;
  slots: SlotsResponse;
  /** The last slot fetch failed — distinct from a successful 'closed' response. */
  slotsError: boolean;
  retrySlots: () => void;
  selectedService: Service | null;
  /** What step 1 offers: the shop's active services, plus a rescheduled booking's own. */
  services: Service[];
  /** The first step this wizard has (2 when the service is fixed). */
  firstStep: WizardStep;
  eligibleMembers: ShopMember[];
  handleSelectService: (serviceId: string) => void;
  handleSelectMember: (memberId: string | null) => void;
  handleDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  goBack: () => void;
  /** Owner wizard only: slot step for THIS booking (null = the shop's own interval). */
  intervalMinutes: number | null;
  handleIntervalChange: (minutes: number | null) => void;
}

/** Step 1's list: the active services, plus a rescheduled booking's own one. */
export const wizardServices = (active: Service[], own?: Service): Service[] =>
  !own || active.some((s) => s.id === own.id) ? active : [own, ...active];

/**
 * Where Back leads in reschedule mode: one step down, never below the wizard's
 * first step. null = there is nothing before this step, so Back leaves.
 */
export const nextStepBack = (step: WizardStep, firstStep: WizardStep): WizardStep | null =>
  step > firstStep ? ((step - 1) as WizardStep) : null;

export function useBookingWizard({
  slug,
  shopId,
  initialMemberId,
  initialDate,
  internal,
  reschedule,
}: UseBookingWizardOptions): UseBookingWizardResult {
  const { t } = useLang();

  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState<WizardStep>(reschedule ? 3 : 1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(reschedule?.service.id ?? null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(initialMemberId ?? null);
  const [date, setDate] = useState(initialDate ?? '');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<SlotsResponse>(NO_SLOTS);
  const [slotsError, setSlotsError] = useState(false);
  // Latest-wins: a slow reply for an earlier date must not overwrite a newer one.
  const slotsSeq = useRef(0);
  const lastSlotsRequest = useRef<(() => void) | null>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    // The shop's own wizard also offers internal-only services.
    (internal && shopId ? getWizardInfo(shopId) : getShopInfo(slug))
      .then(setShop)
      .catch((err) => {
        setNotFound(err?.response?.status === 404);
        setError(t.public.shopNotFound);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Rescheduling opens straight on the date/time step: load its slots once.
  useEffect(() => {
    if (reschedule && date && selectedMemberId) fetchSlots(date, selectedMemberId, reschedule.service.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A deactivated service is missing from the public shop info; a reschedule
  // keeps it, so the booking's own copy is offered alongside the active ones.
  const services = wizardServices(shop?.services ?? [], reschedule?.service);
  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;
  const firstStep: WizardStep = reschedule?.fixedService ? 2 : 1;
  const bookableMembers = (shop?.members ?? []).filter((m) =>
    internal ? m.bookableInternally : m.bookableByCustomers,
  );
  const eligibleMembers = selectedServiceId
    ? bookableMembers.filter((m) => m.staffServices.some((ss) => ss.service.id === selectedServiceId))
    : bookableMembers;

  function fetchSlots(
    targetDate: string,
    memberId: string | null,
    serviceId: string,
    interval: number | null = intervalMinutes,
  ) {
    const request =
      internal && shopId
        ? getOwnerSlots(shopId, targetDate, memberId, serviceId, interval ?? undefined, reschedule?.bookingId)
        : getPublicSlots(slug, targetDate, memberId, serviceId, reschedule?.token);
    const seq = ++slotsSeq.current;
    lastSlotsRequest.current = () => fetchSlots(targetDate, memberId, serviceId, interval);
    setSlotsError(false);
    request
      .then((r) => {
        if (seq === slotsSeq.current) setSlots(r);
      })
      .catch(() => {
        if (seq === slotsSeq.current) setSlotsError(true);
      });
  }

  function retrySlots() {
    lastSlotsRequest.current?.();
  }

  function handleSelectService(serviceId: string) {
    setSelectedServiceId(serviceId);
    setTime('');

    if (reschedule) {
      // Another service: who does it comes next; the date is kept.
      setStep(2);
      return;
    }
    if (initialMemberId) {
      setSelectedMemberId(initialMemberId);
      setStep(3);
      if (date) fetchSlots(date, initialMemberId, serviceId);
    } else {
      setSelectedMemberId(null);
      setDate('');
      setStep(2);
    }
  }

  function handleSelectMember(memberId: string | null) {
    setSelectedMemberId(memberId);
    if (reschedule) {
      // Same day, another provider: keep the date and show their slots.
      setTime('');
      setStep(3);
      if (date && memberId && selectedServiceId) fetchSlots(date, memberId, selectedServiceId);
      return;
    }
    setDate('');
    setTime('');
    setStep(3);
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDate = e.target.value;
    setDate(newDate);
    setTime('');
    if (!selectedServiceId) return;
    fetchSlots(newDate, selectedMemberId, selectedServiceId);
  }

  function handleIntervalChange(minutes: number | null) {
    setIntervalMinutes(minutes);
    setTime('');
    if (date && selectedServiceId) fetchSlots(date, selectedMemberId, selectedServiceId, minutes);
  }

  function goBack() {
    if (reschedule) {
      // The booking's own service, provider and date stay selected, so going
      // back only changes the step. Back on the first step leaves the wizard.
      const next = nextStepBack(step, firstStep);
      if (next === null) reschedule.onExit?.();
      else {
        if (step === 3) setTime('');
        setStep(next);
      }
      return;
    }
    if (step === 2) {
      setSelectedServiceId(null);
      setStep(1);
    } else if (step === 3) {
      if (initialMemberId) {
        // Step 2 was skipped on the way in, so go straight back to step 1.
        setSelectedServiceId(null);
        setStep(1);
      } else {
        setSelectedMemberId(null);
        setDate('');
        setTime('');
        setStep(2);
      }
    }
  }

  return {
    shop,
    loading,
    error,
    notFound,
    step,
    setStep,
    selectedServiceId,
    selectedMemberId,
    date,
    time,
    setTime,
    slots,
    slotsError,
    retrySlots,
    selectedService,
    services,
    firstStep,
    eligibleMembers,
    handleSelectService,
    handleSelectMember,
    handleDateChange,
    goBack,
    intervalMinutes,
    handleIntervalChange,
  };
}
