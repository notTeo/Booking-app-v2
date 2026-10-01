interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export default function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  return (
    <label className="switch">
      <input
        id={id}
        className="switch__input"
        type="checkbox"
        role="switch"
        checked={checked}
        aria-label={label}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch__track" />
    </label>
  );
}
