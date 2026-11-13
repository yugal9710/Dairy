import React, { useState } from 'react';
import {
  User,
  Lock,
  AlertCircle,
  ArrowRight,
  LogOut,
  Eye,
  EyeOff,
  Milk,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Check,
  Copy,
  X,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getDerivedUsername } from '../../utils/fetchAuth';

export const PRECONFIGURED_CREDENTIALS = [
  {
    tenantId: 1,
    tenantKey: 'sfacl',
    tenantNameNe: 'साना किसान कृषि सहकारी सस्था लि.',
    tenantNameEn: 'Sana Kisan Agri Cooperative Ltd.',
    badgeNe: 'प्लेटफर्म मुख्य सञ्चालक (Owner)',
    badgeEn: 'Platform Owner',
    accounts: [
      {
        id: 't1-owner',
        titleNe: 'प्लेटफर्म सुपर एडमिन (मुख्य सञ्चालक)',
        titleEn: 'Platform SuperAdmin (Owner)',
        username: 'admin',
        password: 'Admin@123',
        role: 'SuperAdmin',
        badge: 'OWNER',
        badgeColor: 'emerald',
        descNe: 'डेभलपर कन्सोल, नयाँ सहकारी दर्ता तथा सम्पूर्ण प्रणाली',
        descEn: 'Developer Console, tenant provisioning & full platform'
      },
      {
        id: 't1-admin',
        titleNe: 'सहकारी एडमिन',
        titleEn: 'Cooperative Admin',
        username: 'sfacl.admin',
        password: 'Admin@123',
        role: 'SuperAdmin',
        badge: 'ADMIN',
        badgeColor: 'teal',
        descNe: 'डेभलपर कन्सोल तथा साना किसान डेरी सञ्चालन',
        descEn: 'Developer Console & Sana Kisan Dairy Operations'
      },
      {
        id: 't1-staff',
        titleNe: 'काउन्टर कर्मचारी (Staff)',
        titleEn: 'Counter Staff (User)',
        username: 'sfacl.staff',
        password: 'Staff@123',
        role: 'User',
        badge: 'STAFF',
        badgeColor: 'blue',
        descNe: 'दैनिक दूध संकलन, किसान हिसाब तथा POS बिक्री',
        descEn: 'Milk intake collection, farmer ledger & POS'
      }
    ]
  },
  {
    tenantId: 2,
    tenantKey: 'himali',
    tenantNameNe: 'हिमाली गाई फार्म तथा दुग्ध संकलन केन्द्र',
    tenantNameEn: 'Himali Cow Farm & Milk Center',
    badgeNe: 'ग्राहक सहकारी (Tenant 2)',
    badgeEn: 'Customer Tenant 2',
    accounts: [
      {
        id: 't2-admin',
        titleNe: 'हिमाली डेरी एडमिन',
        titleEn: 'Himali Dairy Admin',
        username: 'himali.admin',
        password: 'Admin@123',
        role: 'Admin',
        badge: 'ADMIN',
        badgeColor: 'amber',
        descNe: 'दूध संकलन, FAT/SNF दर, उत्पादन तथा नाफा-नोक्सान',
        descEn: 'Dairy operations, FAT/SNF pricing, processing & P&L'
      },
      {
        id: 't2-staff',
        titleNe: 'हिमाली काउन्टर कर्मचारी',
        titleEn: 'Himali Counter Staff',
        username: 'himali.staff',
        password: 'Staff@123',
        role: 'User',
        badge: 'STAFF',
        badgeColor: 'blue',
        descNe: 'दूध संकलन तथा खुद्रा बिक्री (POS Counter)',
        descEn: 'Milk collection intake & retail POS sales'
      }
    ]
  },
  {
    tenantId: 3,
    tenantKey: 'annapurna',
    tenantNameNe: 'अन्नपूर्ण कृषि तथा दुग्ध डेरी उद्योग',
    tenantNameEn: 'Annapurna Dairy Industries',
    badgeNe: 'ग्राहक सहकारी (Tenant 3)',
    badgeEn: 'Customer Tenant 3',
    accounts: [
      {
        id: 't3-admin',
        titleNe: 'अन्नपूर्ण डेरी एडमिन',
        titleEn: 'Annapurna Dairy Admin',
        username: 'anna.admin',
        password: 'Admin@123',
        role: 'Admin',
        badge: 'ADMIN',
        badgeColor: 'amber',
        descNe: 'सम्पूर्ण डेरी व्यवस्थापन, खरिद, मौज्दात तथा प्रतिवेदन',
        descEn: 'Complete dairy operations, procurement & reporting'
      },
      {
        id: 't3-staff',
        titleNe: 'अन्नपूर्ण कर्मचारी',
        titleEn: 'Annapurna Counter Staff',
        username: 'anna.staff',
        password: 'Staff@123',
        role: 'User',
        badge: 'STAFF',
        badgeColor: 'blue',
        descNe: 'दूध संकलन, किसान भुक्तानी तथा खुद्रा अर्डर',
        descEn: 'Milk intake, farmer payouts & retail counter'
      }
    ]
  }
];

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
  const [copiedKey, setCopiedKey] = useState(null);
  const [selectedTenantTab, setSelectedTenantTab] = useState(() => {
    return Number(activeTenant?.id) || 1;
  });

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

  const handleFillCredentials = (acc, autoSubmit = false) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setError(null);
    if (autoSubmit) {
      executeLogin(acc.username, acc.password);
    }
  };

  const handleCopy = (text, key) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (_) {}
  };

  const activeGroup = PRECONFIGURED_CREDENTIALS.find(g => g.tenantId === selectedTenantTab) || PRECONFIGURED_CREDENTIALS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[94vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-600 p-5 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-xl border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Milk className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 pr-8">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>{lang === 'en' ? 'Dairy ERP 2.0 Sign In' : 'डेरी ईआरपी २.० लगइन'}</span>
              </h2>
              <p className="text-xs text-emerald-100 truncate mt-0.5">
                {activeTenant?.organizationName || (lang === 'en' ? 'Sana Kisan Agri Cooperative Ltd.' : 'साना किसान कृषि सहकारी सस्था लि.')}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {currentUser && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="truncate pr-2">
                <span className="text-slate-500 dark:text-slate-400">{lang === 'en' ? 'Signed in as: ' : 'हालको लगइन: '}</span>
                <strong className="text-emerald-800 dark:text-emerald-300 font-bold">{currentUser.name}</strong>{' '}
                <span className="font-mono text-emerald-700 dark:text-emerald-400">(@{getDerivedUsername(currentUser)})</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-[11px] transition shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> {t('logout')}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-in shake duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'en' ? 'Username' : 'प्रयोगकर्ता नाम (Username)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g. admin or himali.admin' : 'उदा: admin वा himali.admin'}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-mono"
                  autoComplete="username"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'en' ? 'Password' : 'पासवर्ड (Password)'}
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

          {/* Quick Login Credentials Cards ("Login Cardinals") */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {lang === 'en' ? 'Login Credentials Cards' : 'शीघ्र लगइन विवरण (Login Credentials Cards)'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">
                {lang === 'en' ? 'Click card to autofill' : 'कार्ड क्लिक गरी सिधै भर्नुहोस्'}
              </span>
            </div>

            {/* Cooperative Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 text-xs font-bold">
              {PRECONFIGURED_CREDENTIALS.map((g) => {
                const isSelected = selectedTenantTab === g.tenantId;
                return (
                  <button
                    key={g.tenantId}
                    type="button"
                    onClick={() => setSelectedTenantTab(g.tenantId)}
                    className={`py-1.5 px-2 rounded-lg text-center transition cursor-pointer truncate text-[11px] ${
                      isSelected
                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {g.tenantKey.toUpperCase()}
                    {g.tenantId === 1 && (
                      <span className="ml-1 text-[9px] px-1 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                        Owner
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Group Header Sub-badge */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 mb-2">
              <span className="font-semibold truncate">
                {lang === 'en' ? activeGroup.tenantNameEn : activeGroup.tenantNameNe}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                {lang === 'en' ? activeGroup.badgeEn : activeGroup.badgeNe}
              </span>
            </div>

            {/* Accounts Cards List */}
            <div className="space-y-2">
              {activeGroup.accounts.map((acc) => {
                const isCurrentForm = username === acc.username && password === acc.password;
                return (
                  <div
                    key={acc.id}
                    onClick={() => handleFillCredentials(acc, false)}
                    className={`p-2.5 rounded-xl border transition-all text-left group relative cursor-pointer ${
                      isCurrentForm
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {lang === 'en' ? acc.titleEn : acc.titleNe}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-black tracking-wider uppercase ${
                            acc.badge === 'OWNER'
                              ? 'bg-emerald-600 text-white'
                              : acc.badge === 'ADMIN'
                                ? 'bg-amber-600 text-white'
                                : 'bg-blue-600 text-white'
                          }`}>
                            {acc.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {lang === 'en' ? acc.descEn : acc.descNe}
                        </p>
                      </div>

                      {/* 1-Click Fill & Login Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFillCredentials(acc, true);
                        }}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
                        title={lang === 'en' ? 'Click to fill & sign in immediately' : 'तुरुन्त लगइन गर्नुहोस्'}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{lang === 'en' ? 'Sign In' : 'लगइन'}</span>
                      </button>
                    </div>

                    {/* Credentials Pills */}
                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <span className="text-slate-400 text-[10px]">User:</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">@{acc.username}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(acc.username, `u-${acc.id}`);
                          }}
                          className="p-1 hover:text-emerald-600 transition"
                          title="Copy username"
                        >
                          {copiedKey === `u-${acc.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <span className="text-slate-400 text-[10px]">Pass:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{acc.password}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(acc.password, `p-${acc.id}`);
                          }}
                          className="p-1 hover:text-emerald-600 transition"
                          title="Copy password"
                        >
                          {copiedKey === `p-${acc.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
