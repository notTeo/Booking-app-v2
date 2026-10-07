import { useEffect, useRef, useState } from 'react';
import { getOwnerSlots, getWizardInfo } from '../api/booking.api';
import { getShopInfo, getPublicSlots, type ShopInfo, type Service, type ShopMember, type SlotsResponse } from '../api/public.api';
import { useLang } from '../context/LanguageContext';

const NO_SLOTS: SlotsResponse = { status: 'ok', slots: [] };

export type WizardStep = 1 | 2 | 3 | 4 | 5;

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
  /**
   * Who the booking is for, when known before the date/time step: slot
   * lookups then fit that customer's own duration for the service. The public
   * page identifies by phone, the shop's wizard by customer id.
   */
  slotCustomer?: { phone?: string; customerId?: string } | null;
  /** The picked customer's own minutes per service id (owner wizard): used for the summed duration shown. */
  customDurations?: Record<string, number>;
}

export interface UseBookingWizardResult {
  shop: ShopInfo | null;
  loading: boolean;
  error: string | null;
  /** The API said this slug doesn't exist (as opposed to a network/server error). */
  notFound: boolean;
  step: WizardStep;
  setStep: (s: WizardStep) => void;
  /** The first chosen service (a booking's primary one). */
  selectedServiceId: string | null;
  /** Every chosen service, in the order they were picked. */
  selectedServiceIds: string[];
  selectedMemberId: string | null;
  date: string;
  time: string;
  setTime: (t: string) => void;
  slots: SlotsResponse;
  /** The last slot fetch failed — distinct from a successful 'closed' response. */
  slotsError: boolean;
  retrySlots: () => void;
  /**
   * The chosen service. With several chosen it stands for all of them: their
   * names joined, their durations and prices added up.
   */
  selectedService: Service | null;
  /** The chosen services one by one, in order. */
  selectedServices: Service[];
  /** Pick or drop a service (step 1 with several allowed). Nothing else changes. */
  toggleService: (serviceId: string) => void;
  /** Leave step 1 with the services chosen so far. */
  continueFromServices: () => void;
  /** What step 1 offers: the shop's active services, plus a rescheduled booking's own. */
  services: Service[];
  /** The first step this wizard has (2 when the service is fixed). */
  firstStep: WizardStep;
  /** The products step, when this wizard has one (see `lastSteps`). */
  productsStep: WizardStep | null;
  /** The last step: the customer's details, or confirming a reschedule. */
  detailsStep: WizardStep;
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

/**
 * The steps after date and time. A new booking in a shop with products on
 * offer gets a products step before the details; everything else goes
 * straight to the last step.
 */
export const lastSteps = (withProducts: boolean): { productsStep: WizardStep | null; detailsStep: WizardStep } =>
  withProducts ? { productsStep: 4, detailsStep: 5 } : { productsStep: null, detailsStep: 4 };

/** A booking has at most this many services (the API's limit too). */
export const MAX_SERVICES = 5;

/**
 * The chosen services as one: names joined, durations (each possibly the
 * customer's own) and prices added up. A single service is returned as it is
 * (with its own duration for the customer), none as null.
 */
export const combineServices = (
  chosen: Service[],
  durationFor: (service: Service) => number = (s) => s.duration,
): Service | null => {
  if (chosen.length === 0) return null;
  const first = chosen[0];
  return {
    ...first,
    name: chosen.map((s) => s.name).join(' + '),
    description: chosen.length === 1 ? first.description : null,
    duration: chosen.reduce((sum, s) => sum + durationFor(s), 0),
    price: chosen.reduce((sum, s) => sum + s.price, 0),
  };
};

export function useBookingWizard({
  slug,
  shopId,
  initialMemberId,
  initialDate,
  internal,
  reschedule,
  slotCustomer,
  customDurations,
}: UseBookingWizardOptions): UseBookingWizardResult {
  const { t } = useLang();

  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState<WizardStep>(reschedule ? 3 : 1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(reschedule ? [reschedule.service.id] : []);
  const selectedServiceId = selectedServiceIds[0] ?? null;
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
    if (reschedule && date && selectedMemberId) fetchSlots(date, selectedMemberId, [reschedule.service.id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A deactivated service is missing from the public shop info; a reschedule
  // keeps it, so the booking's own copy is offered alongside the active ones.
  const services = wizardServices(shop?.services ?? [], reschedule?.service);
  const customDurationFor = (s: Service) => customDurations?.[s.id] ?? s.duration;
  const selectedServices = selectedServiceIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is Service => !!s);
  const selectedService = combineServices(selectedServices, customDurationFor);
  const firstStep: WizardStep = reschedule?.fixedService ? 2 : 1;
  // Products are reserved with a new booking only; a reschedule keeps its own.
  const { productsStep, detailsStep } = lastSteps(!reschedule && (shop?.products.length ?? 0) > 0);
  const bookableMembers = (shop?.members ?? []).filter((m) =>
    internal ? m.bookableInternally : m.bookableByCustomers,
  );
  // With several services, only members who do every one of them.
  const eligibleMembers =
    selectedServiceIds.length > 0
      ? bookableMembers.filter((m) =>
          selectedServiceIds.every((id) => m.staffServices.some((ss) => ss.service.id === id)),
        )
      : bookableMembers;

  function fetchSlots(
    targetDate: string,
    memberId: string | null,
    serviceIds: string[],
    interval: number | null = intervalMinutes,
  ) {
    const serviceId = serviceIds[0];
    const request =
      internal && shopId
        ? getOwnerSlots(shopId, targetDate, memberId, serviceId, interval ?? undefined, reschedule?.bookingId, slotCustomer?.customerId, serviceIds)
        : getPublicSlots(slug, targetDate, memberId, serviceId, reschedule?.token, slotCustomer?.phone, serviceIds);
    const seq = ++slotsSeq.current;
    lastSlotsRequest.current = () => fetchSlots(targetDate, memberId, serviceIds, interval);
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

  function toggleService(serviceId: string) {
    setSelectedServiceIds((ids) =>
      ids.includes(serviceId)
        ? ids.filter((id) => id !== serviceId)
        : ids.length >= MAX_SERVICES ? ids : [...ids, serviceId],
    );
  }

  /** One service picked on its own (a reschedule changing the service): select it and move on. */
  function handleSelectService(serviceId: string) {
    setSelectedServiceIds([serviceId]);
    goOnFromServices([serviceId]);
  }

  function continueFromServices() {
    if (selectedServiceIds.length > 0) goOnFromServices(selectedServiceIds);
  }

  function goOnFromServices(ids: string[]) {
    setTime('');

    if (reschedule) {
      // Another service: who does it comes next; the date is kept.
      setStep(2);
      return;
    }
    if (initialMemberId) {
      setSelectedMemberId(initialMemberId);
      setStep(3);
      if (date) fetchSlots(date, initialMemberId, ids);
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
      if (date && memberId && selectedServiceIds.length > 0) fetchSlots(date, memberId, selectedServiceIds);
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
    if (selectedServiceIds.length === 0) return;
    fetchSlots(newDate, selectedMemberId, selectedServiceIds);
  }

  function handleIntervalChange(minutes: number | null) {
    setIntervalMinutes(minutes);
    setTime('');
    if (date && selectedServiceIds.length > 0) fetchSlots(date, selectedMemberId, selectedServiceIds, minutes);
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
    // Going back keeps the services chosen, so they can be changed.
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      if (initialMemberId) {
        // Step 2 was skipped on the way in, so go straight back to step 1.
        setStep(1);
      } else {
        setSelectedMemberId(null);
        setDate('');
        setTime('');
        setStep(2);
      }
    } else if (step > 3) {
      // Products and details: the date and time stay as picked.
      setStep((step - 1) as WizardStep);
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
    selectedServiceIds,
    selectedMemberId,
    date,
    time,
    setTime,
    slots,
    slotsError,
    retrySlots,
    selectedService,
    selectedServices,
    toggleService,
    continueFromServices,
    services,
    firstStep,
    productsStep,
    detailsStep,
    eligibleMembers,
    handleSelectService,
    handleSelectMember,
    handleDateChange,
    goBack,
    intervalMinutes,
    handleIntervalChange,
  };
}
