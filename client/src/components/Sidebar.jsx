import React, { useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Milk
} from 'lucide-react';
import { SYSTEM_MODULES, isTabAllowed, getModuleLabel } from '../utils/rbac';
import { useLanguage } from '../context/LanguageContext';

export const MENU_CATEGORIES = [
  {
    id: 'overview',
    titleNe: 'सामान्य सारांश',
    titleEn: 'Overview',
    moduleIds: ['dashboard']
  },
  {
    id: 'milk-ops',
    titleNe: 'दूध संकलन तथा भुक्तानी',
    titleEn: 'Milk Operations',
    moduleIds: ['milk-collection', 'farmer-payments']
  },
  {
    id: 'sales-orders',
    titleNe: 'बिक्री तथा अर्डर',
    titleEn: 'Sales & Orders',
    moduleIds: ['pos-sales', 'future-orders']
  },
  {
    id: 'inventory-production',
    titleNe: 'मौज्दात तथा प्रशोधन',
    titleEn: 'Inventory & Processing',
    moduleIds: ['inventory', 'production', 'purchases']
  },
  {
    id: 'finance-directory',
    titleNe: 'वित्त, खाता तथा विश्लेषण',
    titleEn: 'Finance & Analytics',
    moduleIds: ['finance', 'customers', 'reports', 'audit-logs']
  },
  {
    id: 'platform-admin',
    titleNe: 'प्लेटफर्म तथा डेभलपर',
    titleEn: 'Platform & Developer',
    moduleIds: ['platform']
  }
];

export default function Sidebar({
  activeTab,
  onTabChange,
  currentUser,
  counts = {},
  isCollapsed = false,
  onToggleCollapse,
  isOpen = false,
  onClose
}) {
  const userRoles = currentUser?.roles || ['User'];
  const { lang, t } = useLanguage();

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
        e.preventDefault();
        if (onToggleCollapse) onToggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleCollapse]);

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:static bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 transition-all duration-200 no-print select-none shadow-xl lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-18' : 'w-64'}`}
      >
        {/* Mobile Header with Close Button */}
        <div className="lg:hidden p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-2xs">
              <Milk className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
              {lang === 'en' ? 'Dairy ERP Menu' : 'डेरी ईआरपी मेनु'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List grouped by Categories */}
        <div className="flex-1 py-2 px-2 overflow-y-auto space-y-2.5">
          {MENU_CATEGORIES.map((cat, cIdx) => {
            const catModules = cat.moduleIds
              .map(id => SYSTEM_MODULES.find(m => m.id === id))
              .filter(m => m && isTabAllowed(m.id, userRoles, currentUser));

            if (catModules.length === 0) return null;

            return (
              <div
                key={cat.id}
                className={cIdx > 0 ? (isCollapsed ? 'pt-2 border-t border-slate-100 dark:border-slate-800' : 'pt-2 border-t border-slate-100 dark:border-slate-800/80') : ''}
              >
                {/* Category Heading (Hidden when collapsed) */}
                {!isCollapsed && (
                  <div className="px-2.5 pb-1 pt-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
                      {lang === 'en' ? cat.titleEn : cat.titleNe}
                    </span>
                  </div>
                )}

                <div className="space-y-0.5">
                  {catModules.map(module => {
                    const isActive = activeTab === module.id;
                    const Icon = module.icon;
                    const count = counts[module.id];
                    const displayLabel = getModuleLabel(module, lang);

                    if (isCollapsed) {
                      return (
                        <div key={module.id} className="relative group flex justify-center py-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              onTabChange(module.id);
                              if (onClose) onClose();
                            }}
                            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer ${
                              isActive
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                                : 'text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={displayLabel}
                            aria-label={displayLabel}
                          >
                            <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : ''}`} />

                            {count !== undefined && count > 0 && (
                              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-2xs">
                                {count}
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() => {
                          onTabChange(module.id);
                          if (onClose) onClose();
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition group text-left relative cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title={displayLabel}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            isActive ? 'text-white scale-110' : 'text-slate-500 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400'
                          }`}
                        />

                        <div className="flex-1 truncate flex items-center justify-between">
                          <span className="truncate">{displayLabel}</span>
                          {count !== undefined && count > 0 ? (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1.5 ${
                                isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {count}
                            </span>
                          ) : module.id === 'platform' ? (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider ml-1.5 ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                              }`}
                            >
                              DEV
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Collapse Toggle Footer (Desktop only) */}
        <div className="hidden lg:block p-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition text-xs font-medium cursor-pointer"
            title={
              isCollapsed
                ? (lang === 'en' ? 'Expand Sidebar (Ctrl+B)' : 'साइडबार विस्तार गर्नुहोस् (Ctrl+B)')
                : (lang === 'en' ? 'Collapse Sidebar (Ctrl+B)' : 'साइडबार छोटा गर्नुहोस् (Ctrl+B)')
            }
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : (
              <div className="flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" />
                <span>{lang === 'en' ? 'Collapse' : 'प्यानल सानो बनाउनुहोस्'}</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
