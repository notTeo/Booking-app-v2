import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';
import { assignStaff, createService, getServices, type Service } from '../../api/service.api';
import { apiErrorMessage } from '../../utils/apiError';
import {
  emptyServiceForm,
  formatServiceDuration,
  formatServicePrice,
  serviceFormToDto,
  type ServiceFormData,
} from '../../utils/serviceForm';
import Alert from '../Alert';
import ServiceFormModal from '../ServiceFormModal';
import { WizardFooter, WizardIntro } from './Wizard';
import type { SetupStepProps } from './steps';

// The shop's services, with the same "new service" pop-up as the Services
// page. A service added here is offered by the owner straight away, so the
// shop can be booked without a visit to the staff panel.
export default function ServicesStep({ shop, ownerMemberId, frame, onNext, onBack }: SetupStepProps) {
  const { t } = useLang();
  const to = t.onboarding;
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ServiceFormData>({ ...emptyServiceForm });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    let live = true;
    getServices(shop.id)
      .then((list) => live && setServices(list))
      .catch(() => live && setError(to.errorLoad));
    return () => {
      live = false;
    };
  }, [shop.id, to.errorLoad]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setCreateError('');
    try {
      const service = await createService(shop.id, serviceFormToDto(form));
      // Not being assigned only means the owner does it later, on the Services page.
      await assignStaff(shop.id, service.id, ownerMemberId).catch(() => undefined);
      setServices((prev) => [...(prev ?? []), service]);
      setForm({ ...emptyServiceForm });
      setAdding(false);
    } catch (err: unknown) {
      setCreateError(apiErrorMessage(err, t.services.errorCreate));
    } finally {
      setCreating(false);
    }
  };

  return frame(
    <WizardFooter onBack={onBack} onSkip={onNext} main={{ label: to.continue, onClick: onNext }} />,
    <>
      <WizardIntro title={to.services.title} text={to.services.intro} />
      {error && <Alert variant="danger">{error}</Alert>}
      {services === null && !error && <div className="spinner-wrap"><div className="spinner" role="status" /></div>}
      {services && services.length > 0 && (
        <div className="card">
          <ul className="list">
            {services.map((service) => (
              <li key={service.id} className="list__item">
                <strong>{service.name}</strong>
                <span className="cluster cluster--tight">
                  <span className="badge badge--neutral">{formatServiceDuration(service.duration)}</span>
                  <span className="badge badge--neutral">{formatServicePrice(service.price)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" className="card card--dashed" onClick={() => { setCreateError(''); setAdding(true); }}>
        <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
        {to.services.add}
      </button>
      {adding && (
        <ServiceFormModal
          title={to.services.newTitle}
          submitLabel={to.services.add}
          form={form}
          onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
          onSubmit={handleCreate}
          submitting={creating}
          error={createError}
          onClose={() => setAdding(false)}
        />
      )}
    </>,
  );
}
