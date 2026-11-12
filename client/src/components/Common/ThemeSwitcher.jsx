import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getCurrentTheme, applyTheme } from '../../utils/themeManager';
import { useLanguage } from '../../context/LanguageContext';

export default function ThemeSwitcher({ className = '' }) {
  const { lang } = useLanguage();
  const [activeTheme, setActiveTheme] = useState(getCurrentTheme());

  useEffect(() => {
    const handleThemeChange = (e) => {
      setActiveTheme({ id: e.detail, isDark: e.detail === 'dark' });
    };

    window.addEventListener('dairy-theme-changed', handleThemeChange);
    return () => window.removeEventListener('dairy-theme-changed', handleThemeChange);
  }, []);

  const isDark = activeTheme.id === 'dark';

  const handleToggle = () => {
    const next = isDark ? 'light' : 'dark';
    const updated = applyTheme(next);
    setActiveTheme(updated);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`p-2 rounded-2xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
        isDark
          ? 'text-amber-400 hover:bg-slate-800'
          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
      } ${className}`}
      title={isDark ? (lang === 'en' ? 'Switch to Light Theme' : 'दिनको थिममा बदल्नुहोस्') : (lang === 'en' ? 'Switch to Dark Theme' : 'रातिको थिममा बदल्नुहोस्')}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-slate-700 hover:text-slate-900 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
