import React, { useState } from 'react';
import AnayaCraftLogo from '../Common/AnayaCraftLogo';
import {
  User,
  Lock,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Milk,
  Globe,
  X,
  Phone,
  Mail,
  Headphones,
  Copy,
  Check
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

// Dedicated Official WhatsApp Vector Icon
function WhatsAppIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

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
  const [copied, setCopied] = useState(false);

  // Customer Support Contact Details
  const supportPhone = activeTenant?.supportPhone || activeTenant?.phone || '+977 98012 34567';
  const supportPhoneClean = supportPhone.replace(/[^0-9+]/g, '');
  const supportEmail = activeTenant?.supportEmail || activeTenant?.email || 'support@anacraft.com';
  const whatsAppDigits = supportPhoneClean.replace(/[^0-9]/g, '') || '9779801234567';
  const whatsAppLink = `https://wa.me/${whatsAppDigits}?text=${encodeURIComponent(
    lang === 'en'
      ? 'Hello Anaya Craft Support, I need assistance with Dairy ERP 2.0.'
      : 'नमस्ते Anaya Craft Support, मलाई डेरी ईआरपी २.० मा सहायता चाहिएको छ ।'
  )}`;

  const handleCopySupportInfo = () => {
    const text = `Customer Support - Anaya Craft Dairy ERP 2.0\nPhone: ${supportPhone}\nWhatsApp: ${supportPhone}\nEmail: ${supportEmail}\nPortal: https://anacraft.com`;
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
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
        <div className="p-5 space-y-4 overflow-y-auto">
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

          {/* Customer Support & Helpdesk Section */}
          <div className="pt-3 border-t border-slate-200/90 dark:border-slate-800 space-y-3">
            <div className="bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-900 rounded-2xl p-3 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-2.5">
              {/* Support Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                    <Headphones className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                      <span>{lang === 'en' ? 'Customer Support & Helpdesk' : 'ग्राहक सहायता र हेल्पलाइन'}</span>
                      <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{lang === 'en' ? 'Online' : 'अनलाइन'}</span>
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      {lang === 'en' ? 'Need help with sign in or credentials?' : 'लगइन वा पासवर्डमा समस्या भयो?'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopySupportInfo}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition flex items-center space-x-1 cursor-pointer"
                  title="Copy support contact details"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400">{lang === 'en' ? 'Copied!' : 'प्रतिलिपि भयो!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                      <span>{lang === 'en' ? 'Copy Info' : 'प्रतिलिपि'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* 3 Contact Action Cards: Phone, WhatsApp, Email */}
              <div className="grid grid-cols-3 gap-2">
                {/* 1. Direct Phone Call */}
                <a
                  href={`tel:${supportPhoneClean}`}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-blue-50/90 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 transition group shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer"
                  title={`Call Support: ${supportPhone}`}
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/40 group-hover:bg-blue-600 text-blue-600 dark:text-blue-400 group-hover:text-white flex items-center justify-center transition mb-1">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 leading-tight">
                    {lang === 'en' ? 'Phone Call' : 'फोन कल'}
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-mono leading-tight mt-0.5 truncate w-full">
                    {supportPhone}
                  </span>
                </a>

                {/* 2. WhatsApp Direct Live Chat */}
                <a
                  href={whatsAppLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-emerald-50/90 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-500 transition group shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer"
                  title="Chat directly on WhatsApp"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 group-hover:bg-[#25D366] text-[#25D366] group-hover:text-white flex items-center justify-center transition mb-1">
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 leading-tight">
                    {lang === 'en' ? 'WhatsApp' : 'ह्वाट्सएप'}
                  </span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold leading-tight mt-0.5">
                    {lang === 'en' ? 'Live Chat ↗' : 'च्याट गर्नुहोस् ↗'}
                  </span>
                </a>

                {/* 3. Email Support Desk */}
                <a
                  href={`mailto:${supportEmail}?subject=Dairy%20ERP%202.0%20Support%20Request`}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-indigo-50/90 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 transition group shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer"
                  title={`Email Support: ${supportEmail}`}
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 group-hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 group-hover:text-white flex items-center justify-center transition mb-1">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 leading-tight">
                    {lang === 'en' ? 'Email Desk' : 'इमेल डेस्क'}
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-mono leading-tight mt-0.5 truncate w-full">
                    {supportEmail}
                  </span>
                </a>
              </div>
            </div>

            {/* Official Anaya Craft Branding Footer */}
            <div className="pt-0.5 flex flex-col items-center justify-center text-center select-none">
              <AnayaCraftLogo variant="brand-card" size="sm" />
            </div>
          </div>
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
