import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Menu,
  Calendar,
  User,
  LogOut,
  ChevronDown,
  Building2,
  AlertTriangle,
  Globe,
  Check,
  Settings,
  SlidersHorizontal,
  Package,
  UserCog,
  ShieldCheck,
  ArrowLeftRight,
  ChevronRight,
  Server
} from 'lucide-react';
import { getTodayBS } from '../utils/nepaliDate';
import { getDerivedUsername } from '../utils/fetchAuth';
import { useLanguage } from '../context/LanguageContext';
import { isOwnerUser } from '../utils/rbac';
import ThemeSwitcher from './Common/ThemeSwitcher';

export default function Navbar({
  currentUser,
  activeTenant,
  availableTenants = [],
  onSwitchTenant,
  onOpenLogin,
  onLogout,
  onOpenCalendar,
  subscriptionWarning,
  onToggleSidebar,
  isSidebarOpen,
  onNavigateTab,
  onOpenFatSnfConfig
}) {
  const { lang, toggleLang, t } = useLanguage();
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsMenuRef = useRef(null);

  const todayBS = useMemo(() => getTodayBS(), []);

  // Close settings dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format valid upto date (e.g. "01 Jan, 2030")
  const validUptoFormatted = useMemo(() => {
    const rawExpiry = activeTenant?.expirationDateTimeUtms || activeTenant?.subscription?.expiryDate;
    if (!rawExpiry) return '01 Jan, 2030';
    try {
      const d = new Date(rawExpiry);
      if (isNaN(d.getTime())) return '01 Jan, 2030';
      const day = String(d.getDate()).padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month}, ${year}`;
    } catch {
      return '01 Jan, 2030';
    }
  }, [activeTenant?.expirationDateTimeUtms, activeTenant?.subscription?.expiryDate]);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shrink-0 shadow-xs no-print transition-colors duration-200">
      {/* Optional Subscription Alert Banner */}
      {subscriptionWarning && (
        <div className={`px-4 py-1.5 text-xs flex items-center justify-between font-medium ${
          subscriptionWarning.isExpired ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{subscriptionWarning.message}</span>
          </div>
          <span
            onClick={() => onNavigateTab && onNavigateTab('settings', 'tenant')}
            className="text-[11px] underline cursor-pointer font-bold"
          >
            {lang === 'en' ? 'Renewal Details' : 'नवीकरण विवरण'}
          </span>
        </div>
      )}

      <div className="px-3 sm:px-4 lg:px-6 py-2 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Dairy Logo, Hamburger Menu Button & Tenant Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Dairy Logo Illustration Tile */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden select-none p-1">
            <svg viewBox="0 0 48 48" className="w-8 h-8 drop-shadow-xs" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="24" cy="26" rx="20" ry="16" fill="#CCFBF1" />
              <path d="M14 18L18 13H26L30 18V38H14V18Z" fill="#FFFFFF" stroke="#0D9488" strokeWidth="2" strokeLinejoin="round" />
              <path d="M18 13V10H26V13" fill="#38BDF8" stroke="#0D9488" strokeWidth="2" strokeLinejoin="round" />
              <path d="M14 24H30" stroke="#0D9488" strokeWidth="1.5" strokeDasharray="2 2" />
              <rect x="18" y="27" width="8" height="5.5" rx="1" fill="#38BDF8" />
              <text x="19" y="31.5" fontSize="4.5" fontWeight="bold" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif">MILK</text>
              <path d="M28 27L29.5 38H36.5L38 27H28Z" fill="#F0FDFA" stroke="#0D9488" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M29 31H37" stroke="#38BDF8" strokeWidth="1.5" />
              <ellipse cx="33" cy="27" rx="5" ry="1.5" fill="#E0F2FE" />
            </svg>
          </div>

          {/* Hamburger Menu Toggle Button [ ≡ ] */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`p-2 rounded-xl border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 focus:outline-none transition-all flex items-center justify-center shrink-0 shadow-2xs cursor-pointer ${
              isSidebarOpen ? 'bg-blue-50 dark:bg-blue-950/50 ring-2 ring-blue-400/40' : 'bg-white dark:bg-slate-800'
            }`}
            title={lang === 'en' ? 'Toggle Navigation Menu (Ctrl+B)' : 'मेनु खोल्नुहोस् / बन्द गर्नुहोस् (Ctrl+B)'}
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </button>

          {/* Organization Name & Valid Upto */}
          <div className="relative min-w-0">
            <button
              onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
              className="flex items-center gap-1.5 text-left group hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded-lg transition"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs min-[400px]:text-sm sm:text-base leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition truncate max-w-[130px] min-[400px]:max-w-[200px] sm:max-w-xs md:max-w-md">
                    {activeTenant?.organizationName || (lang === 'en' ? 'Sana Kisan Agri Cooperative Ltd.' : 'साना किसान कृषि सहकारी सस्था लि.')}
                  </h1>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0" />
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                  <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Valid upto: <strong className="text-slate-700 dark:text-slate-200 font-bold">{validUptoFormatted}</strong></span>
                  {activeTenant?.address && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600 hidden md:inline">•</span>
                      <span className="text-slate-500 dark:text-slate-400 hidden md:inline truncate max-w-[180px]">{activeTenant.address}</span>
                    </>
                  )}
                </div>
              </div>
            </button>

            {/* Tenant Selector Dropdown */}
            {tenantDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTenantDropdownOpen(false)} />
                <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[11px] font-bold text-slate-400 uppercase px-3 py-1.5">
                    {lang === 'en' ? 'Select Cooperative / Dairy' : 'सहकारी / डेरी संस्था छनौट'}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {availableTenants.map(tItem => (
                      <button
                        key={tItem.id}
                        onClick={() => {
                          onSwitchTenant(tItem);
                          setTenantDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                          tItem.id === activeTenant?.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{tItem.organizationName || tItem.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{tItem.address}</div>
                        </div>
                        {tItem.id === activeTenant?.id && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                  {isOwnerUser(currentUser, activeTenant) && onNavigateTab && (
                    <div className="mt-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 px-2 pb-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        {lang === 'en' ? 'Platform Owner' : 'मुख्य सञ्चालक पृष्ठ'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab('platform');
                          setTenantDropdownOpen(false);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition cursor-pointer shadow-xs"
                      >
                        <Server className="w-3 h-3" />
                        <span>{lang === 'en' ? 'Developer Console' : 'डेभलपर कन्सोल'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Controls: Nepali Date Pill [ 📅 ], Language Toggle, Settings Button [ ⚙️ ] & Theme Switcher [ 🌙 ] */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Nepali Calendar Date Pill [ 📅 ] */}
          <button
            type="button"
            onClick={onOpenCalendar}
            className="group flex items-center space-x-2 px-3 py-1 rounded-2xl border border-blue-200 bg-blue-50/70 dark:bg-slate-800/80 dark:border-slate-700 hover:bg-blue-100/70 dark:hover:bg-slate-750 transition-all shadow-2xs text-left cursor-pointer"
            title={lang === 'en' ? 'Open Nepali Calendar' : 'नेपाली पात्रो खोल्नुहोस्'}
            aria-label="Nepali Calendar"
          >
            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold text-xs sm:text-sm tracking-tight pr-0.5">
              {todayBS.formattedBs}
            </span>
          </button>

          {/* Language Switcher (नेपाली / English) */}
          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
            title={lang === 'ne' ? 'Switch to English' : 'नेपालीमा परिवर्तन गर्नुहोस्'}
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">{lang === 'ne' ? 'नेपाली' : 'English'}</span>
          </button>

          {/* Theme Switcher Button [ 🌙 ] */}
          <ThemeSwitcher />

          {/* Settings & Administration Hub Button [ ⚙️ ] */}
          <div ref={settingsMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen(prev => !prev)}
              className={`p-2 rounded-2xl transition flex items-center justify-center border cursor-pointer ${
                settingsOpen
                  ? 'bg-blue-50 text-blue-600 border-blue-400 ring-2 ring-blue-100 shadow-xs dark:bg-slate-800 dark:border-blue-500'
                  : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 shadow-2xs hover:border-blue-400'
              }`}
              title={lang === 'en' ? 'Settings & Administration Menu' : 'प्रणाली सेटिङ तथा प्रशासन मेनु'}
              aria-expanded={settingsOpen}
              aria-haspopup="true"
            >
              <Settings className={`w-5 h-5 transition-transform duration-200 ${settingsOpen ? 'rotate-90 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`} />
            </button>

            {/* Dropdown Menu under Setting Icon with Section Headings */}
            {settingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100 select-none">
                {/* User Profile Card */}
                <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/60">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
                      {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                          {currentUser?.name || 'Staff User'}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                          {currentUser?.roles ? currentUser.roles[0] : 'Staff'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                        @{getDerivedUsername(currentUser)}{currentUser?.email ? ` • ${currentUser.email}` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 1: System & Pricing Setup */}
                <div className="p-2 space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {lang === 'en' ? 'System & Pricing Configuration' : 'प्रणाली तथा दर निर्धारण'}
                  </div>

                  {/* FAT & SNF Rates Configuration */}
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      if (onOpenFatSnfConfig) onOpenFatSnfConfig();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-amber-50/80 dark:hover:bg-slate-800 hover:text-amber-700 dark:hover:text-amber-400 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition shadow-2xs">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold block truncate">
                          {lang === 'en' ? 'FAT & SNF Pricing Setup' : 'फ्याट तथा एस.एन.एफ. दर निर्धारण'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {lang === 'en' ? 'Procurement & retail sales rates' : 'दूध खरिद तथा बिक्री दर व्यवस्थापन'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>

                  {/* Units of Measure Master */}
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      if (onNavigateTab) onNavigateTab('settings', 'units');
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-blue-50/80 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition shadow-2xs">
                        <Package className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold block truncate">
                          {lang === 'en' ? 'Units of Measure' : 'मापन एकाइहरू'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {lang === 'en' ? 'Litre, Kg, Pouch, Crates' : 'लिटर, किलो, पाउच, क्यान'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                </div>

                {/* Section 2: Cooperative & User Administration */}
                <div className="p-2 space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {lang === 'en' ? 'Cooperative & User Administration' : 'संस्था तथा प्रयोगकर्ता प्रशासन'}
                  </div>

                  {/* User Management & Roles */}
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      if (onNavigateTab) onNavigateTab('settings', 'users');
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-indigo-50/80 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition shadow-2xs">
                        <UserCog className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold block truncate">
                          {lang === 'en' ? 'Users & Role Permissions' : 'प्रयोगकर्ता तथा भूमिका व्यवस्थापन'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {lang === 'en' ? 'Staff credentials and roles' : 'कर्मचारी अनुमति तथा पासवर्ड'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>

                  {/* Tenant Subscription & Renewal */}
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      if (onNavigateTab) onNavigateTab('settings', 'tenant');
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold block truncate">
                          {lang === 'en' ? 'Subscription & License' : 'सहकारी सदस्यता तथा नवीकरण'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          Valid upto: {validUptoFormatted}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>

                  {/* Activity & Audit Trail */}
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      if (onNavigateTab) onNavigateTab('audit-logs');
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-indigo-50/80 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold block truncate">
                          {lang === 'en' ? 'Activity & Audit Log' : 'कार्य सम्पादन तथा अडिट लग'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {lang === 'en' ? 'Track all user actions & events' : 'सम्पूर्ण गतिविधि अडिट रेकर्ड'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>

                  {/* Developer Console (Platform Owner Only) */}
                  {isOwnerUser(currentUser, activeTenant) && onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsOpen(false);
                        onNavigateTab('platform');
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-900 dark:hover:text-emerald-200 transition flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:bg-emerald-700 group-hover:text-white transition shadow-2xs">
                          <Server className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate">
                              {lang === 'en' ? 'Developer Console' : 'डेभलपर कन्सोल'}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-emerald-600 text-white">
                              {lang === 'en' ? 'PRIMARY' : 'मुख्य'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {lang === 'en' ? 'Primary SaaS owner console & tenant controls' : 'मुख्य सञ्चालक पृष्ठ तथा सहकारी नियन्त्रण'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  )}

                  {/* Section 2 End */}
                </div>

                {/* Section 3: Account & Session */}
                <div className="p-2 space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {lang === 'en' ? 'Account & Session' : 'खाता तथा सेसन'}
                  </div>

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      if (onLogout) onLogout();
                      else if (onOpenLogin) onOpenLogin();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition shadow-2xs">
                        <LogOut className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold truncate">{t('logout')}</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
