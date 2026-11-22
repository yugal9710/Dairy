import React, { useState } from 'react';
import AnayaCraftLogo from '../Common/AnayaCraftLogo';
import {
  User,
  Lock,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  X,
  Phone,
  Mail,
  Headphones,
  Copy,
  Check
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

// Bespoke Dairy Leaf & Milk Drop Monogram from preview
function DairyLeafIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <path
        d="M16 4c-1.1 5.4-5.5 8-9.3 8.5C7.1 21 11 26 16 28c5-2 8.9-7 9.3-15.5C21.5 12 17.1 9.4 16 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M11 20c2-3.5 4.3-5.7 8-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Custom Pastoral Dairy Artwork from dairy-2-login-preview.html
function DairyPastoralArt({ className = 'w-full max-w-[420px]' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 460 220"
      role="img"
      aria-label="Illustration of a dairy barn, green fields, and morning sun"
    >
      <ellipse cx="232" cy="197" rx="194" ry="15" fill="#739678" opacity=".2" />
      <path d="M42 162c35-45 76-54 114-28 38-27 83-35 128-8 44-33 91-16 133 16v48H42v-28Z" fill="#a8c69e" />
      <path d="M42 171c39-28 79-33 118-12 51-28 96-29 143-5 40-20 78-14 114 10v26H42v-19Z" fill="#789f77" />
      <path d="m111 111 76-51 76 51v71H111v-71Z" fill="#f7f4e9" />
      <path d="m99 112 88-61 88 61-10 12-78-53-78 53-10-12Z" fill="#507a58" />
      <path d="M132 119h34v29h-34zM207 119h34v29h-34z" fill="#c4d8bc" />
      <path d="M172 137h31v45h-31z" fill="#d9e5d1" />
      <path d="M182 137h11v45h-11z" fill="#91ad8d" />
      <path d="M151 79h72v8h-72z" fill="#d8e4d1" />
      <path d="M304 91h41l8 15v71h-57v-71l8-15Z" fill="#fffdf5" stroke="#d8e1d2" strokeWidth="2" />
      <path d="M310 80h28v13h-28z" fill="#779a70" />
      <path d="M305 117h51v33h-51z" fill="#6c946b" />
      <path d="M321 123h20v21h-20z" fill="#eef2e8" />
      <path d="M326 128h10v11h-10z" fill="#85a47c" />
      <path
        d="M72 173c7-17 14-25 21-29m-4 29c4-14 10-22 19-27m211 25c6-17 13-25 21-30m-2 30c4-13 10-21 19-26"
        stroke="#567c5d"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="381" cy="54" r="21" fill="#e8c878" opacity=".9" />
      <path d="M273 172c9-7 19-7 28 0" stroke="#f5f1df" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

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
  onLogout,
  isFullScreen = false
}) {
  const { lang, toggleLang, t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // When rendered as the primary login page (no currentUser and full screen requested or no close handler)
  const isFull = isFullScreen || (!currentUser && !onClose);

  // Customer Support Contact Details (Anaya Craft Support Desk)
  const supportPhone = '+977 98011 97710';
  const supportPhoneClean = '+9779801197710';
  const supportEmail = activeTenant?.supportEmail || activeTenant?.email || 'support@anacraft.com';
  const whatsAppDigits = '9779801197710';
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
        if (typeof onClose === 'function') onClose();
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

  // Cooperative details
  const cooperativeName = lang === 'en'
    ? (activeTenant?.nameInEnglish || activeTenant?.nameInNepali || 'Dairy Cooperative')
    : (activeTenant?.nameInNepali || activeTenant?.nameInEnglish || 'दुग्ध उत्पादक सहकारी संस्था');

  const modalShell = (
    <div
      className={
        isFull
          ? 'w-full min-h-screen lg:h-screen grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-x-hidden overflow-y-auto lg:overflow-hidden select-none'
          : 'w-full max-w-5xl bg-[#fffefa] dark:bg-slate-900 border border-[#e4e5db] dark:border-slate-800 rounded-3xl sm:rounded-[28px] shadow-2xl shadow-emerald-950/15 overflow-hidden grid grid-cols-1 lg:grid-cols-12 my-auto max-h-[96vh] text-slate-800 dark:text-slate-100'
      }
    >
      {/* ========================================================
          LEFT COLUMN (Story & Dairy Art): Preview Split Design
          ======================================================== */}
      <section
        aria-labelledby="headline"
        className={`lg:col-span-6 xl:col-span-6 relative isolation-isolate flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#e7eedf] via-[#dce9d9] to-[#c9ddcb] dark:from-slate-900 dark:via-emerald-950/40 dark:to-slate-900 border-b lg:border-b-0 lg:border-r border-[#dce2d7] dark:border-slate-800 ${
          isFull ? 'p-8 sm:p-12 lg:p-14 xl:p-16 h-full overflow-y-auto lg:overflow-hidden' : 'p-6 sm:p-8 md:p-10'
        }`}
      >
        {/* Subtle decorative ambient circles matching preview */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#f8f6ec]/40 dark:bg-emerald-900/10 pointer-events-none blur-xl -z-10" />
        <div className="absolute -bottom-28 -left-28 w-72 h-72 rounded-full bg-[#f8f6ec]/40 dark:bg-emerald-900/10 pointer-events-none blur-xl -z-10" />

        {/* Top Brand Mark & Cooperative Subtitle */}
        <div>
          <div className="flex items-center gap-3 select-none">
            <span
              className="w-11 h-11 rounded-2xl bg-[#285d49] text-white flex items-center justify-center shadow-sm shrink-0"
              aria-hidden="true"
            >
              <DairyLeafIcon className="w-6 h-6" />
            </span>
            <div className="min-w-0">
              <div className="font-extrabold tracking-tight text-xl sm:text-2xl text-[#193b31] dark:text-emerald-400 flex items-center gap-1.5 leading-none">
                <span>Dairy</span>
                <span className="text-[#647c5d] dark:text-emerald-300">2.0</span>
              </div>
              {activeTenant && (
                <p className="text-[11px] sm:text-xs font-semibold text-[#526b5b] dark:text-slate-400 truncate mt-1">
                  {cooperativeName}
                </p>
              )}
            </div>
          </div>

          {/* Story Copy */}
          <div className="mt-6 sm:mt-8 max-w-lg">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#4e765b] dark:text-emerald-400 mb-2">
              {t('storyEyebrow')}
            </p>
            <h1
              id="headline"
              className="text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-extrabold tracking-tight text-[#193b31] dark:text-white leading-[1.12]"
            >
              {t('storyHeadline')}
            </h1>
            <p className="text-sm sm:text-base text-[#526b5b] dark:text-slate-300 leading-relaxed mt-3 max-w-md">
              {t('storyIntro')}
            </p>
          </div>
        </div>

        {/* Pastoral Dairy Artwork */}
        <div className={`my-auto flex items-center justify-center ${isFull ? 'py-4 lg:py-8' : 'py-4'}`}>
          <DairyPastoralArt className={`w-full h-auto drop-shadow-xs ${isFull ? 'max-w-[360px] sm:max-w-[440px] lg:max-w-[480px]' : 'max-w-[340px] sm:max-w-[400px]'}`} />
        </div>

        {/* Story Footer Note */}
        <div className="pt-3 text-xs font-semibold text-[#66806b] dark:text-slate-400 flex items-center justify-between border-t border-[#d8e2d4] dark:border-slate-800/80">
          <span>{t('storyFoot')}</span>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#285d49]/10 dark:bg-emerald-950 text-[#285d49] dark:text-emerald-300 font-bold">
            v2.0
          </span>
        </div>
      </section>

      {/* ========================================================
          RIGHT COLUMN (Interactive Sign-in Panel & Anaya Craft Branding)
          ======================================================== */}
      <section
        aria-labelledby="signin-title"
        className={`lg:col-span-6 xl:col-span-6 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto ${
          isFull ? 'p-6 sm:p-10 lg:p-12 xl:p-16 h-full justify-center items-center' : 'p-6 sm:p-8 md:p-9 justify-between'
        }`}
      >
        <div className={`w-full max-w-md mx-auto space-y-4 ${isFull ? 'my-auto' : ''}`}>
          
          {/* Top Bar: Language Switcher & Optional Close Button */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Dairy ERP Cloud</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLang}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer select-none"
                title={lang === 'en' ? 'नेपालीमा परिवर्तन गर्नुहोस्' : 'Switch to English'}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{lang === 'en' ? 'नेपाली' : 'English'}</span>
              </button>

              {!isFull && currentUser && typeof onClose === 'function' && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Panel Heading */}
          <div>
            <h2
              id="signin-title"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white"
            >
              {t('welcomeTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {t('welcomeSubtitle')}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Interactive Sign-in Form */}
          <form onSubmit={handleFormSubmit} className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('username')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. sfacl.admin or admin"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#285d49] focus:bg-white dark:focus:bg-slate-800 outline-none transition font-medium text-slate-900 dark:text-slate-100"
                  autoFocus
                  autoComplete="username"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
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
                  className="w-full pl-9 pr-9 py-2.5 text-sm bg-slate-50/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#285d49] focus:bg-white dark:focus:bg-slate-800 outline-none transition font-mono text-slate-900 dark:text-slate-100"
                  autoComplete="current-password"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#285d49] hover:bg-[#1f4838] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-[#285d49]/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer select-none"
            >
              {loading ? (lang === 'en' ? 'Authenticating...' : 'प्रमाणीकरण हुँदैछ...') : t('signIn')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Customer Support & Helpdesk Card */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
            <div className="bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 dark:from-slate-800/70 dark:via-slate-800/40 dark:to-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-2">
              {/* Support Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-[#285d49] text-white flex items-center justify-center shadow-xs shrink-0">
                    <Headphones className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                      <span>{t('helpdesk')}</span>
                      <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{lang === 'en' ? 'Online' : 'अनलाइन'}</span>
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      {t('needHelp')}
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
                      <span className="text-emerald-700 dark:text-emerald-400">{t('copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                      <span>{t('copyInfo')}</span>
                    </>
                  )}
                </button>
              </div>

              {/* 3 Contact Action Cards: Phone, WhatsApp, Email */}
              <div className="grid grid-cols-3 gap-2">
                {/* 1. Phone */}
                <a
                  href={`tel:${supportPhoneClean}`}
                  className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-600 transition group shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer"
                  title={`Call Support: ${supportPhone}`}
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 group-hover:bg-[#285d49] text-[#285d49] dark:text-emerald-400 group-hover:text-white flex items-center justify-center transition mb-1">
                    <Phone className="w-3 h-3" />
                  </div>
                  <span className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-800 dark:group-hover:text-emerald-300 leading-tight">
                    {t('phoneCall')}
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] text-slate-500 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 font-mono leading-tight mt-0.5 break-all w-full">
                    {supportPhone}
                  </span>
                </a>

                {/* 2. WhatsApp */}
                <a
                  href={whatsAppLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-600 transition group shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer"
                  title="Chat directly on WhatsApp (+977 98011 97710)"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 group-hover:bg-[#25D366] text-[#25D366] group-hover:text-white flex items-center justify-center transition mb-1">
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-800 dark:group-hover:text-emerald-300 leading-tight">
                    {t('whatsApp')}
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold leading-tight mt-0.5">
                    {t('liveChat')}
                  </span>
                </a>

                {/* 3. Email */}
                <a
                  href={`mailto:${supportEmail}?subject=Dairy%20ERP%202.0%20Support%20Request`}
                  className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-600 transition group shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer"
                  title={`Email Support: ${supportEmail}`}
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 group-hover:bg-[#285d49] text-[#285d49] dark:text-emerald-400 group-hover:text-white flex items-center justify-center transition mb-1">
                    <Mail className="w-3 h-3" />
                  </div>
                  <span className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-800 dark:group-hover:text-emerald-300 leading-tight">
                    {t('emailDesk')}
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] text-slate-500 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 font-mono leading-tight mt-0.5 break-all w-full">
                    {supportEmail}
                  </span>
                </a>
              </div>
            </div>

            {/* Official Anaya Craft Branding Footer with High-Resolution Logo */}
            <div className="pt-1 flex flex-col items-center justify-center text-center select-none">
              <AnayaCraftLogo variant="brand-card" size="md" />
            </div>
          </div>

          {/* Panel Foot Copyright Note */}
          <div className="pt-1 text-center text-[10.5px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 select-none">
            © 2026 Dairy 2.0 · {t('builtFor')}
          </div>
        </div>
      </section>
    </div>
  );

  if (isFull) {
    return modalShell;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2.5 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      {modalShell}
    </div>
  );
}
