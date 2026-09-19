import { useEffect, useState } from 'react';
import { getShopInfo, getPublicSlots, type ShopInfo, type Service, type ShopMember, type SlotsResponse } from '../api/public.api';
import { useLang } from '../context/LanguageContext';

const NO_SLOTS: SlotsResponse = { status: 'ok', slots: [] };

export type WizardStep = 1 | 2 | 3 | 4;

export interface UseBookingWizardOptions {
  slug: string;
  /**
   * When set (calendar quick-create flow), the staff member is already known.
   * Picking a service jumps straight from step 1 to step 3, skipping the
   * staff-selection step, instead of the normal 1 -> 2 -> 3 flow. Service
   * selection itself can never be skipped since slot generation requires it.
   */
  initialMemberId?: string | null;
  initialDate?: string;
}

export interface UseBookingWizardResult {
  shop: ShopInfo | null;
  loading: boolean;
  error: string | null;
  step: WizardStep;
  setStep: (s: WizardStep) => void;
  selectedServiceId: string | null;
  selectedMemberId: string | null;
  date: string;
  time: string;
  setTime: (t: string) => void;
  slots: SlotsResponse;
  selectedService: Service | null;
  eligibleMembers: ShopMember[];
  handleSelectService: (serviceId: string) => void;
  handleSelectMember: (memberId: string | null) => void;
  handleDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  goBack: () => void;
}

export function useBookingWizard({
  slug,
  initialMemberId,
  initialDate,
}: UseBookingWizardOptions): UseBookingWizardResult {
  const { t } = useLang();

  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<WizardStep>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(initialMemberId ?? null);
  const [date, setDate] = useState(initialDate ?? '');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<SlotsResponse>(NO_SLOTS);

  useEffect(() => {
    if (!slug) return;
    getShopInfo(slug)
      .then(setShop)
      .catch(() => setError(t.public.shopNotFound))
      .finally(() => setLoading(false));
  }, [slug]);

  const selectedService = shop?.services.find((s) => s.id === selectedServiceId) ?? null;
  const eligibleMembers = selectedServiceId
    ? (shop?.members.filter((m) => m.staffServices.some((ss) => ss.service.id === selectedServiceId)) ?? [])
    : (shop?.members ?? []);

  function fetchSlots(targetDate: string, memberId: string | null, serviceId: string) {
    getPublicSlots(slug, targetDate, memberId, serviceId)
      .then(setSlots)
      .catch(() => setSlots({ status: 'closed' }));
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
    step,
    setStep,
    selectedServiceId,
    selectedMemberId,
    date,
    time,
    setTime,
    slots,
    selectedService,
    eligibleMembers,
    handleSelectService,
    handleSelectMember,
    handleDateChange,
    goBack,
  };
}
