import { useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { useLang } from '../context/LanguageContext';
import { CALLING_CODES, DEFAULT_CALLING_CODE, groupDigits, normalizePhone, splitPhone } from '../utils/phone';

type PhoneInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'value' | 'onChange'> & {
  /** The whole number as it is stored ("+306941234567"), or '' while there is none. */
  value: string;
  onChange: (value: string) => void;
};

const NATIONAL_MAX_DIGITS = 15;
const digitsBefore = (text: string, index: number) => text.slice(0, index).replace(/\D/g, '').length;

// A phone field: the country code (Greece unless changed) beside the number,
// which is spaced as it is typed. Used by every form that takes a phone.
export default function PhoneInput({ value, onChange, disabled, ...props }: PhoneInputProps) {
  const { t } = useLang();
  const parts = value ? splitPhone(value) : null;
  // Remembered while the number is empty, when `value` has no code to show.
  const [code, setCode] = useState(parts?.code || DEFAULT_CALLING_CODE);
  if (parts?.code && parts.code !== code) setCode(parts.code);

  // A code that is not in the list is typed, and shown, with the number.
  const unlisted = parts !== null && parts.code === '';
  const shown = !parts ? '' : unlisted ? `+${parts.national}` : groupDigits(parts.national);

  // Spacing the number moves its characters: put the caret back after the
  // same digit it followed.
  const inputRef = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (caretDigits.current === null || !input || document.activeElement !== input) return;
    let index = 0;
    for (let seen = 0; index < shown.length && seen < caretDigits.current; index++) {
      if (/\d/.test(shown[index])) seen++;
    }
    input.setSelectionRange(index, index);
    caretDigits.current = null;
  });

  function handleNumber(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const caret = digitsBefore(raw, e.target.selectionStart ?? raw.length);
    // A whole number typed, pasted or autofilled with its country code.
    if (/^\s*(\+|00)/.test(raw)) {
      const full = normalizePhone(raw).slice(0, NATIONAL_MAX_DIGITS + 1);
      const typed = splitPhone(full);
      if (typed.code) setCode(typed.code);
      caretDigits.current = typed.code ? Math.max(0, caret - typed.code.length - (raw.trim().startsWith('00') ? 2 : 0)) : caret;
      onChange(typed.code && !typed.national ? '' : full);
      return;
    }
    const digits = raw.replace(/\D/g, '').slice(0, NATIONAL_MAX_DIGITS - code.length);
    caretDigits.current = caret;
    onChange(digits ? `+${code}${digits}` : '');
  }

  function handleCode(next: string) {
    setCode(next);
    // A number typed with an unlisted code starts again under the chosen one.
    if (unlisted) onChange('');
    else if (parts?.national) onChange(`+${next}${parts.national}`);
  }

  return (
    <div className="phone-input">
      <div className={`select-wrap${disabled ? ' is-disabled' : ''}`}>
        <select
          className="select"
          value={unlisted ? '' : code}
          onChange={(e) => handleCode(e.target.value)}
          disabled={disabled}
          aria-label={t.public.phoneCodeLabel}
          autoComplete="tel-country-code"
        >
          {unlisted && <option value="">+…</option>}
          {CALLING_CODES.map((c) => (
            <option key={c.iso} value={c.code}>+{c.code} {c.iso}</option>
          ))}
        </select>
      </div>
      <input
        ref={inputRef}
        className="input"
        type="tel"
        inputMode="tel"
        value={shown}
        onChange={handleNumber}
        disabled={disabled}
        {...props}
      />
    </div>
  );
}
