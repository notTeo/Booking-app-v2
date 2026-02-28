import { useLang } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";


export default function Toggles() {
    const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLang();
  return (
    <div className="navbar-toggles">
      <button
        className="toggle-btn"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
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