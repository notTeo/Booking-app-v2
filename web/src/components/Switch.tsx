import '../styles/shared/switch.css';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export default function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`switch${checked ? ' switch--on' : ' switch--off'}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className="switch-thumb" />
    </button>
  );
}
