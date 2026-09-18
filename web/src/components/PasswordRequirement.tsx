import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

interface PasswordRequirementProps {
  met: boolean;
  label: string;
}

// Shared by RegisterPage, ResetPasswordPage, and SettingsPage — all three
// render an identical password-requirements checklist.
export default function PasswordRequirement({ met, label }: PasswordRequirementProps) {
  return (
    <li className={met ? 'req-met' : 'req-unmet'}>
      <FontAwesomeIcon icon={met ? faCheck : faXmark} />
      {label}
    </li>
  );
}
