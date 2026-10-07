import { useLang } from '../context/LanguageContext';
import type { Language } from '../locales/translations';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'el', label: 'ΕΛ' },
  { code: 'en', label: 'EN' },
];

/** Greek / English, for pages outside the app (Account > Preferences has its own). */
export default function LangSwitch() {
  const { language, setLanguage, t } = useLang();
  return (
    <div className="tabs tabs--segmented" role="group" aria-label={t.toggles.language}>
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          className="tab"
          lang={code}
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
