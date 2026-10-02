import { useEffect, useRef, useState } from 'react';
import { getOwnerSlots } from '../api/booking.api';
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
  eligibleMembers: ShopMember[];
  handleSelectService: (serviceId: string) => void;
  handleSelectMember: (memberId: string | null) => void;
  handleDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  goBack: () => void;
  /** Owner wizard only: slot step for THIS booking (null = the shop's own interval). */
  intervalMinutes: number | null;
  handleIntervalChange: (minutes: number | null) => void;
}

export function useBookingWizard({
  slug,
  shopId,
  initialMemberId,
  initialDate,
  internal,
}: UseBookingWizardOptions): UseBookingWizardResult {
  const { t } = useLang();

  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState<WizardStep>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
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
    getShopInfo(slug)
      .then(setShop)
      .catch((err) => {
        setNotFound(err?.response?.status === 404);
        setError(t.public.shopNotFound);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const selectedService = shop?.services.find((s) => s.id === selectedServiceId) ?? null;
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
        ? getOwnerSlots(shopId, targetDate, memberId, serviceId, interval ?? undefined)
        : getPublicSlots(slug, targetDate, memberId, serviceId);
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
    eligibleMembers,
    handleSelectService,
    handleSelectMember,
    handleDateChange,
    goBack,
    intervalMinutes,
    handleIntervalChange,
  };
}
