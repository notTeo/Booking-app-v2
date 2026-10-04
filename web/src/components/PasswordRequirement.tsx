import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

interface PasswordRequirementProps {
  met: boolean;
  label: string;
}

// Shared by RegisterPage, ResetPasswordPage, and AccountPage — all three
// render an identical password-requirements checklist.
export default function PasswordRequirement({ met, label }: PasswordRequirementProps) {
  return (
    <li className={`password-requirements__item${met ? ' is-met' : ''}`}>
      <FontAwesomeIcon icon={met ? faCheck : faXmark} />
      {label}
    </li>
  );
}
