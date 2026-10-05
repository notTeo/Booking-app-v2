import { useState, type InputHTMLAttributes } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>;

// A password field with a show/hide toggle. Used by every form that takes a password.
export default function PasswordInput(props: PasswordInputProps) {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);
  const label = visible ? t.settings.hidePassword : t.settings.showPassword;

  return (
    <div className="input-wrap input-wrap--action">
      <input className="input" type={visible ? 'text' : 'password'} {...props} />
      <button
        type="button"
        className="btn btn--ghost btn--icon btn--sm input-wrap__action"
        aria-pressed={visible}
        aria-label={label}
        title={label}
        onClick={() => setVisible((v) => !v)}
      >
        <FontAwesomeIcon icon={visible ? faEyeSlash : faEye} aria-hidden="true" />
      </button>
    </div>
  );
}
