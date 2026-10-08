import type { CreateServiceDto, Service } from '../api/service.api';

/** What the service form holds: text as typed, switches as they are. */
export interface ServiceFormData {
  name: string;
  description: string;
  duration: string;
  price: string;
  isActive: boolean;
  showOnPublicPage: boolean;
}

export const emptyServiceForm: ServiceFormData = {
  name: '',
  description: '',
  duration: '',
  price: '',
  isActive: true,
  showOnPublicPage: true,
};

export const serviceToForm = (s: Service): ServiceFormData => ({
  name: s.name,
  description: s.description ?? '',
  duration: String(s.duration),
  price: (s.price / 100).toFixed(2),
  isActive: s.isActive,
  showOnPublicPage: s.showOnPublicPage,
});

/** The form as the API takes it: minutes, and the price in cents. */
export const serviceFormToDto = (f: ServiceFormData): CreateServiceDto => ({
  name: f.name.trim(),
  description: f.description.trim() || undefined,
  duration: parseInt(f.duration, 10),
  price: Math.round(parseFloat(f.price) * 100),
  isActive: f.isActive,
  showOnPublicPage: f.showOnPublicPage,
});

export const formatServiceDuration = (mins: number) => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export const formatServicePrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;
