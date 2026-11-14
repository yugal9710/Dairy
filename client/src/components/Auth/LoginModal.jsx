import React, { useState } from 'react';
import {
  User,
  Lock,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Milk,
  Globe,
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function LoginModal({
  isOpen,
  onClose,
  currentUser,
  activeTenant,
  onLoginSuccess,
  onLogout
}) {
  const { lang, toggleLang, t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const executeLogin = async (uName, pWord) => {
    const cleanId = (uName || username).trim();
    const cleanPw = pWord || password;

    if (!cleanId || !cleanPw) {
      setError(lang === 'en' ? 'Username and password are required.' : 'प्रयोगकर्ता नाम र पासवर्ड अनिवार्य छ ।');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanId, password: cleanPw })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUsername('');
        setPassword('');
        if (onLoginSuccess) onLoginSuccess(data);
        onClose();
      } else {
        setError(data.message || (lang === 'en' ? 'Invalid username or password.' : 'लगइन असफल भयो । कृपया सही विवरण प्रविष्ट गर्नुहोस् ।'));
      }
    } catch (err) {
      setError(lang === 'en' ? 'Unable to reach server.' : 'सर्भरसँग सम्पर्क हुन सकेन ।');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    executeLogin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-600 p-5 text-white relative shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-white/10 rounded-xl border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <Milk className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight">
                  {lang === 'en' ? 'Dairy ERP 2.0 Sign In' : 'डेरी ईआरपी २.० लगइन'}
                </h2>
              </div>
            </div>

            {/* Language Switcher & Optional Close Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleLang}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold text-white transition cursor-pointer"
                title={lang === 'en' ? 'नेपालीमा परिवर्तन गर्नुहोस्' : 'Switch to English'}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'नेपाली' : 'English'}</span>
              </button>

              {currentUser && typeof onClose === 'function' && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'en' ? 'Username or Email' : 'प्रयोगकर्ता नाम वा इमेल'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. sfacl.admin or admin"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-medium"
                  autoFocus
                  autoComplete="username"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-mono"
                  autoComplete="current-password"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (lang === 'en' ? 'Authenticating...' : 'प्रमाणीकरण हुँदैछ...') : t('login')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        {currentUser && typeof onClose === 'function' && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              {t('close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
