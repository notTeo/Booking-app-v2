import { useLang } from '../context/LanguageContext';

/** One round button showing the current language; a click switches to the other (as in the marketing nav). */
export default function LangSwitch() {
  const { language, toggleLanguage, t } = useLang();
  return (
    <button type="button" className="lang-toggle" onClick={toggleLanguage} aria-label={t.toggles.language} title={t.toggles.language}>
      {language === 'el' ? 'EL' : 'EN'}
    </button>
  );
}
