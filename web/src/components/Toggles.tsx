import { useLang } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";


export default function Toggles() {
    const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLang();
  return (
    <div className="navbar-toggles">
      <button
        className="toggle-btn"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? t.toggles.switchToLight : t.toggles.switchToDark}
        title={theme === 'dark' ? t.toggles.lightMode : t.toggles.darkMode}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <button
        className="toggle-btn"
        onClick={toggleLanguage}
        aria-label={language === 'el' ? 'Switch to English' : 'Αλλαγή σε Ελληνικά'}
        title={language === 'el' ? 'English' : 'Ελληνικά'}
      >
        {language === 'el' ? '🇬🇷' : '🇬🇧'}
      </button>
    </div>
  );
}