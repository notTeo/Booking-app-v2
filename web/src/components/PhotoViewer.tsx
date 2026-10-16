import { useId } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import Modal from './Modal';
import { useLang } from '../context/LanguageContext';

// A photo at full size, opened by clicking its small version (an Avatar).
export default function PhotoViewer({ name, src, onClose }: { name: string; src: string; onClose: () => void }) {
  const id = useId();
  const { t } = useLang();

  return (
    <Modal onClose={onClose} labelledBy={`${id}-title`} className="modal--photo">
      <div className="modal__header">
        <h2 id={`${id}-title`} className="modal__title">{name}</h2>
        <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={onClose} aria-label={t.bookings.close}>
          <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
        </button>
      </div>
      <div className="modal__body">
        <img className="modal__photo" src={src} alt={name} />
      </div>
    </Modal>
  );
}
