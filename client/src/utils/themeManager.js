// Theme Manager for Dairy ERP 2.0
// Supports Light and Dark mode with localStorage persistence

export const THEMES = [
  {
    id: 'light',
    name: 'Light',
    iconName: 'Sun',
    isDark: false
  },
  {
    id: 'dark',
    name: 'Dark',
    iconName: 'Moon',
    isDark: true
  }
];

export function applyTheme(themeId) {
  const root = document.documentElement;
  const isDark = themeId === 'dark';

  root.classList.remove('dark', 'light');
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.add('light');
  }
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');

  try {
    localStorage.setItem('dairy_theme', isDark ? 'dark' : 'light');
  } catch (e) {
    console.warn('Could not save theme to localStorage', e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dairy-theme-changed', { detail: isDark ? 'dark' : 'light' }));
  }

  return isDark ? THEMES[1] : THEMES[0];
}

export function getCurrentTheme() {
  if (typeof window === 'undefined') return THEMES[0];
  try {
    const saved = localStorage.getItem('dairy_theme');
    if (saved === 'dark') return THEMES[1];
  } catch (e) {}
  return THEMES[0];
}

export function toggleTheme() {
  const current = getCurrentTheme();
  const nextId = current.id === 'dark' ? 'light' : 'dark';
  return applyTheme(nextId);
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  const current = getCurrentTheme();
  applyTheme(current.id);
}
