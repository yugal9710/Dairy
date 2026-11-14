import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, getTranslation } from '../utils/translations';

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (key, fallback) => fallback || key
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('dairy_lang');
      if (saved === 'ne' || saved === 'en') {
        return saved;
      }
      return 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = useCallback((newLang) => {
    const l = newLang === 'en' ? 'en' : 'ne';
    setLangState(l);
    try {
      localStorage.setItem('dairy_lang', l);
    } catch (e) {
      console.warn('Could not save language to localStorage:', e);
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'ne' ? 'en' : 'ne');
  }, [lang, setLang]);

  const t = useCallback((key, fallback) => {
    if (!key) return '';
    const res = getTranslation(key, lang);
    if (res === key && fallback) return fallback;
    return res;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
