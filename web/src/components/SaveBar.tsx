import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';

/**
 * Shown while a form has changes that are not saved yet: a yellow bar saying
 * so, with the Save button in it. It stays at the bottom of the screen while
 * its card is in view, so a long form never has to be scrolled to be saved.
 * Without `onSave` the button submits the form it is in.
 */
export default function SaveBar({
  label,
  saving,
  disabled,
  onSave,
}: {
  /** The Save button's text. */
  label: string;
  saving: boolean;
  /** The changes cannot be saved as they are (e.g. a value is not valid). */
  disabled?: boolean;
  onSave?: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="save-bar" role="status">
      <span className="save-bar__text">
        <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />
        {t.shopSettings.unsavedChanges}
      </span>
      <button
        type={onSave ? 'button' : 'submit'}
        className={`btn btn--sm${saving ? ' is-loading' : ''}`}
        onClick={onSave}
        aria-busy={saving}
        disabled={disabled}
      >
        {label}
      </button>
    </div>
  );
}
