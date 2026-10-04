import { useId } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import type { BookingStatus } from '../api/booking.api';
import { BOOKING_STATUS } from './bookingStatus';
import Modal from './Modal';

interface Props {
  statuses: BookingStatus[];
  statusFilter: Set<BookingStatus>;
  onToggleStatus: (status: BookingStatus) => void;
  staffOptions: { id: string; label: string }[];
  staffFilter: string | null;
  onStaffChange: (id: string | null) => void;
  /** Service id → name. */
  serviceOptions: Map<string, string>;
  serviceFilter: string | null;
  onServiceChange: (id: string | null) => void;
  filtersActive: boolean;
  onClear: () => void;
  onClose: () => void;
}

// The calendar's filters. Every change applies straight away; the modal only
// holds the controls.
export default function BookingFiltersModal({
  statuses,
  statusFilter,
  onToggleStatus,
  staffOptions,
  staffFilter,
  onStaffChange,
  serviceOptions,
  serviceFilter,
  onServiceChange,
  filtersActive,
  onClear,
  onClose,
}: Props) {
  const uid = useId();
  const { t } = useLang();
  const f = t.bookings.filters;

  return (
    <Modal onClose={onClose} labelledBy={`${uid}-title`}>
      <div className="modal__header">
        <h2 id={`${uid}-title`} className="modal__title">{f.button}</h2>
        <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={onClose} aria-label={t.bookings.close}>
          <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
        </button>
      </div>
      <div className="modal__body">
        <div className="field">
          <span className="field__label" id={`${uid}-status`}>{f.statusLabel}</span>
          <div className="cluster cluster--tight" role="group" aria-labelledby={`${uid}-status`}>
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={statusFilter.has(s)}
                className={`chip chip--${BOOKING_STATUS[s].cls}`}
                onClick={() => onToggleStatus(s)}
              >
                <FontAwesomeIcon icon={BOOKING_STATUS[s].icon} aria-hidden="true" />
                <span className="chip__label">{f.status[s]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-staff`}>{f.staffLabel}</label>
          <div className="select-wrap">
            <select
              id={`${uid}-staff`}
              className="select"
              value={staffFilter ?? ''}
              onChange={(e) => onStaffChange(e.target.value || null)}
            >
              <option value="">{f.allStaff}</option>
              {staffOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-service`}>{f.serviceLabel}</label>
          <div className="select-wrap">
            <select
              id={`${uid}-service`}
              className="select"
              value={serviceFilter ?? ''}
              onChange={(e) => onServiceChange(e.target.value || null)}
            >
              <option value="">{f.allServices}</option>
              {[...serviceOptions].map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={onClear} disabled={!filtersActive}>
          {f.clear}
        </button>
        <button type="button" className="btn" onClick={onClose}>
          {f.done}
        </button>
      </div>
    </Modal>
  );
}
