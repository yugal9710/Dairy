import React, { useState } from 'react';
import {
  User,
  Lock,
  AlertCircle,
  ArrowRight,
  LogOut,
  Eye,
  EyeOff,
  Milk
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getDerivedUsername } from '../../utils/fetchAuth';

export default function LoginModal({
  isOpen,
  onClose,
  currentUser,
  activeTenant,
  onLoginSuccess,
  onLogout
}) {
  const { lang, t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    const cleanId = username.trim();
    if (!cleanId || !password) {
      setError(lang === 'en' ? 'Username and password are required.' : 'प्रयोगकर्ता नाम र पासवर्ड अनिवार्य छ ।');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanId, password })
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Milk className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black tracking-tight">{lang === 'en' ? 'Dairy ERP 2.0 Sign In' : 'डेरी ईआरपी २.० लगइन'}</h2>
          <p className="text-xs text-emerald-100 mt-1">
            {activeTenant?.organizationName || (lang === 'en' ? 'Sana Kisan Agri Cooperative Ltd.' : 'साना किसान कृषि सहकारी सस्था लि.')}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {currentUser && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">{lang === 'en' ? 'Signed in as: ' : 'हालको लगइन: '}</span>
                <strong className="text-emerald-800">{currentUser.name}</strong>{' '}
                <span className="font-mono text-emerald-700">(@{getDerivedUsername(currentUser)})</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-bold"
              >
                <LogOut className="w-3.5 h-3.5" /> {t('logout')}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'en' ? 'Username' : 'प्रयोगकर्ता नाम'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g. admin or chitwanadmin' : 'प्रयोगकर्ता नाम लेख्नुहोस्'}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  autoComplete="username"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'en' ? 'Password' : 'पासवर्ड'}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  autoComplete="current-password"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (lang === 'en' ? 'Authenticating...' : 'प्रमाणीकरण हुँदैछ...') : t('login')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
