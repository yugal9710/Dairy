import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  RotateCcw,
  Search,
  User,
  Clock,
  Calendar,
  Filter,
  Download,
  Milk,
  Receipt,
  ShoppingCart,
  DollarSign,
  Package,
  KeyRound,
  FileSpreadsheet,
  Settings,
  Users,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatNepaliCurrency } from '../../utils/nepaliDate';

export default function AuditLogViewer({
  auditLogs = [],
  onRefresh,
  activeTenant
}) {
  const { lang } = useLanguage();
  const [logs, setLogs] = useState(auditLogs);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [timeRange, setTimeRange] = useState('all'); // 'today', '7days', '30days', 'all'
  const [selectedLog, setSelectedLog] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Sync props and always fetch latest server logs on mount/tenant change
  const getUsername = (l) => {
    if (!l) return 'admin';
    if (l.username && String(l.username).trim()) return String(l.username).trim().toLowerCase();
    if (l.userEmail && String(l.userEmail).includes('@')) return String(l.userEmail).split('@')[0].trim().toLowerCase();
    return (l.userName || 'admin').toLowerCase().replace(/[^a-z0-9._-]+/g, '.');
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/AuditLog?maxResultCount=500', {
        headers: { 'x-tenant-id': String(activeTenant?.id || 1) }
      });
      if (res.ok) {
        const d = await res.json();
        setLogs(d.items || []);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auditLogs && auditLogs.length > 0) {
      setLogs(auditLogs);
    }
  }, [auditLogs]);

  useEffect(() => {
    fetchAuditLogs();
  }, [activeTenant?.id]);

  const handleRefresh = () => {
    fetchAuditLogs();
    if (onRefresh) onRefresh();
  };

  // Distinct usernames + labels for filter
  const distinctUsers = useMemo(() => {
    const map = new Map();
    logs.forEach(l => {
      const uname = getUsername(l);
      if (!map.has(uname)) {
        map.set(uname, {
          username: uname,
          userName: l.userName || uname
        });
      }
    });
    return Array.from(map.values());
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);

    return logs.filter(l => {
      // Category filter
      if (categoryFilter !== 'all' && l.category !== categoryFilter) {
        return false;
      }

      // User filter (matches username)
      if (selectedUser !== 'all' && getUsername(l) !== selectedUser) {
        return false;
      }

      // Time range filter
      if (timeRange === 'today' && l.dateTimeUtms < startOfToday) {
        return false;
      }
      if (timeRange === '7days' && l.dateTimeUtms < now - 7 * 86400000) {
        return false;
      }
      if (timeRange === '30days' && l.dateTimeUtms < now - 30 * 86400000) {
        return false;
      }

      // Search text filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const username = getUsername(l);
        const userName = (l.userName || '').toLowerCase();
        const userEmail = (l.userEmail || '').toLowerCase();
        const details = (l.details || '').toLowerCase();
        const action = (l.action || '').toLowerCase();
        const actionNe = (l.actionLabelNe || '').toLowerCase();
        const actionEn = (l.actionLabelEn || '').toLowerCase();
        const ref = (l.referenceId || '').toLowerCase();
        const cat = (l.category || '').toLowerCase();
        return (
          username.includes(q) ||
          userName.includes(q) ||
          userEmail.includes(q) ||
          details.includes(q) ||
          action.includes(q) ||
          actionNe.includes(q) ||
          actionEn.includes(q) ||
          ref.includes(q) ||
          cat.includes(q)
        );
      }

      return true;
    });
  }, [logs, categoryFilter, selectedUser, timeRange, searchQuery]);

  // Statistics
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const totalCount = logs.length;
  const todayCount = logs.filter(l => l.dateTimeUtms >= startOfToday).length;
  const distinctUserCount = distinctUsers.length;

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Time', 'Username', 'User Name', 'Category', 'Action', 'Reference ID', 'Details'];
    const rows = filteredLogs.map(l => {
      const dt = new Date(l.dateTimeUtms);
      return [
        `"${dt.toLocaleDateString()}"`,
        `"${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}"`,
        `"${getUsername(l)}"`,
        `"${l.userName || 'System Admin'}"`,
        `"${l.category || 'General'}"`,
        `"${lang === 'en' ? (l.actionLabelEn || l.action) : (l.actionLabelNe || l.action)}"`,
        `"${l.referenceId || '-'}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dairy_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'Milk Collection':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <Milk className="w-3 h-3" />
            <span>{lang === 'en' ? 'Milk Collection' : 'दूध संकलन'}</span>
          </span>
        );
      case 'Farmer Payment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Receipt className="w-3 h-3" />
            <span>{lang === 'en' ? 'Farmer Payment' : 'कृषक भुक्तानी'}</span>
          </span>
        );
      case 'Sales & Orders':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            <ShoppingCart className="w-3 h-3" />
            <span>{lang === 'en' ? 'Sales & Orders' : 'बिक्री तथा अर्डर'}</span>
          </span>
        );
      case 'Finance & Expenses':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <DollarSign className="w-3 h-3" />
            <span>{lang === 'en' ? 'Finance & Expenses' : 'वित्त तथा खर्च'}</span>
          </span>
        );
      case 'Inventory & Processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <Package className="w-3 h-3" />
            <span>{lang === 'en' ? 'Inventory' : 'मौज्दात/प्रशोधन'}</span>
          </span>
        );
      case 'Security & Auth':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            <KeyRound className="w-3 h-3" />
            <span>{lang === 'en' ? 'Security' : 'सुरक्षा/लगइन'}</span>
          </span>
        );
      case 'Accounts & Directory':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300">
            <Users className="w-3 h-3" />
            <span>{lang === 'en' ? 'Accounts' : 'सदस्य/खाता'}</span>
          </span>
        );
      case 'System Configuration':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            <Settings className="w-3 h-3" />
            <span>{lang === 'en' ? 'System & Config' : 'प्रणाली सेटिङ'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            <span>{category || 'General'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">
              {lang === 'en' ? 'User Activity & Audit Trail' : 'प्रयोगकर्ता कार्य सम्पादन तथा अडिट लग'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'en'
                ? 'Immutable chronological activity logs tracking payments, milk collections, orders, inventory, and system events.'
                : 'दूध संकलन, कृषक भुक्तानी, अर्डर, बिक्री तथा सम्पूर्ण प्रणालीगत गतिविधिको विस्तृत अडिट लग'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl text-xs transition border border-emerald-200 dark:border-emerald-800 cursor-pointer"
            title={lang === 'en' ? 'Export CSV' : 'सीएसभी डाउनलोड'}
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'en' ? 'Export CSV' : 'डाउनलोड'}</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{lang === 'en' ? 'Refresh' : 'ताजा'}</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {lang === 'en' ? 'Total Logged Actions' : 'कुल दर्ता गतिविधि'}
          </span>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {totalCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {lang === 'en' ? 'All historical audit entries' : 'सम्पूर्ण ऐतिहासिक अडिट रेकर्ड'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
            {lang === 'en' ? "Today's Activities" : 'आजका गतिविधिहरू'}
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {todayCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {lang === 'en' ? 'Actions logged today' : 'आज सम्पादित कार्यहरू'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            {lang === 'en' ? 'Active Users' : 'सक्रिय प्रयोगकर्ताहरू'}
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {distinctUserCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {lang === 'en' ? 'Operators with recorded actions' : 'कार्य सम्पादन गर्ने कर्मचारीहरू'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
            {lang === 'en' ? 'Filtered Matches' : 'छानिएका रेकर्डहरू'}
          </span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {filteredLogs.length}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {lang === 'en' ? 'Matching filter criteria' : 'वर्तमान फिल्टर अनुसार'}
          </span>
        </div>
      </div>

      {/* 3. Category Filter Tabs & Search Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-3">
          {[
            { id: 'all', labelEn: 'All Activities', labelNe: 'सबै गतिविधि' },
            { id: 'Milk Collection', labelEn: 'Milk Collections', labelNe: 'दूध संकलन' },
            { id: 'Farmer Payment', labelEn: 'Farmer Payments', labelNe: 'कृषक भुक्तानी' },
            { id: 'Sales & Orders', labelEn: 'Sales & Orders', labelNe: 'बिक्री तथा अर्डर' },
            { id: 'Finance & Expenses', labelEn: 'Finance & Expenses', labelNe: 'वित्त तथा खर्च' },
            { id: 'Inventory & Processing', labelEn: 'Inventory', labelNe: 'मौज्दात/प्रशोधन' },
            { id: 'Accounts & Directory', labelEn: 'Accounts', labelNe: 'सदस्य/खाता' },
            { id: 'System Configuration', labelEn: 'Settings & Config', labelNe: 'सेटिङ' },
            { id: 'Security & Auth', labelEn: 'Security & Login', labelNe: 'सुरक्षा/लगइन' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setCategoryFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {lang === 'en' ? tab.labelEn : tab.labelNe}
            </button>
          ))}
        </div>

        {/* Search & Filter Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={lang === 'en' ? 'Search by user, action, farmer, or reference...' : 'प्रयोगकर्ता, कार्य, कृषक वा सन्दर्भ नं. खोज्नुहोस्...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* User Selector */}
          <div className="sm:col-span-3">
            <select
              value={selectedUser}
              onChange={(e) => {
                setSelectedUser(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
            >
              <option value="all">{lang === 'en' ? 'All Users' : 'सबै प्रयोगकर्ता'}</option>
              {distinctUsers.map((u) => (
                <option key={u.username} value={u.username}>
                  @{u.username} — {u.userName}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Selector */}
          <div className="sm:col-span-3">
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
            >
              <option value="all">{lang === 'en' ? 'All Time' : 'सम्पूर्ण समय'}</option>
              <option value="today">{lang === 'en' ? 'Today Only' : 'आज मात्र'}</option>
              <option value="7days">{lang === 'en' ? 'Last 7 Days' : 'पछिल्लो ७ दिन'}</option>
              <option value="30days">{lang === 'en' ? 'Last 30 Days' : 'पछिल्लो ३० दिन'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Activity Logs Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">{lang === 'en' ? 'Date & Time' : 'मिति र समय'}</th>
                <th className="py-3 px-4 whitespace-nowrap">{lang === 'en' ? 'User' : 'प्रयोगकर्ता'}</th>
                <th className="py-3 px-4 whitespace-nowrap">{lang === 'en' ? 'Category' : 'श्रेणी'}</th>
                <th className="py-3 px-4 whitespace-nowrap">{lang === 'en' ? 'Action Performed' : 'सम्पादित कार्य'}</th>
                <th className="py-3 px-4 min-w-[280px]">{lang === 'en' ? 'Activity Details' : 'विस्तृत विवरण'}</th>
                <th className="py-3 px-4 whitespace-nowrap text-center">{lang === 'en' ? 'Ref #' : 'सन्दर्भ नं.'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedLogs.map((log) => {
                const dateObj = new Date(log.dateTimeUtms);
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = dateObj.toLocaleDateString();

                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    {/* 1. Date & Time */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{timeStr}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {dateStr}
                      </div>
                    </td>

                    {/* 2. Username & Name */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0 border border-slate-200 dark:border-slate-700">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded text-[11px]">
                              @{getUsername(log)}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">
                              {log.userName || 'System Admin'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                            {log.username ? `@${log.username}` : (log.userEmail || 'system')}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getCategoryBadge(log.category)}
                    </td>

                    {/* 4. Action Performed */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {lang === 'en' ? (log.actionLabelEn || log.action) : (log.actionLabelNe || log.action)}
                      </div>
                      <span className="text-[9px] font-mono font-semibold text-slate-400 uppercase tracking-wider block mt-0.5">
                        {log.action}
                      </span>
                    </td>

                    {/* 5. Activity Details */}
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 text-xs">
                      {log.details}
                    </td>

                    {/* 6. Reference ID */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      {log.referenceId ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {log.referenceId}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {lang === 'en' ? 'No activity logs found matching the filter criteria.' : 'कुनै कार्य सम्पादन लग भेटिएन ।'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {lang === 'en' ? 'All user operations will appear here as they occur.' : 'प्रणालीमा कुनै पनि कार्य सम्पादन हुनासाथ यहाँ स्वचालित रूपमा दर्ता हुनेछ ।'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredLogs.length > pageSize && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 font-medium">
              {lang === 'en' ? 'Showing' : 'देखाउँदै'}{' '}
              <strong>{(currentPage - 1) * pageSize + 1}</strong> -{' '}
              <strong>{Math.min(currentPage * pageSize, filteredLogs.length)}</strong>{' '}
              {lang === 'en' ? 'of' : 'मध्ये'}{' '}
              <strong>{filteredLogs.length}</strong> {lang === 'en' ? 'activities' : 'गतिविधि'}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-700 dark:text-slate-300 px-2 font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Detailed Audit Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {lang === 'en' ? 'Audit Log Entry Details' : 'अडिट लग विस्तृत विवरण'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{lang === 'en' ? 'Username:' : 'प्रयोगकर्ता नाम:'}</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">@{getUsername(selectedLog)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{lang === 'en' ? 'Full Name:' : 'पूरा नाम:'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.userName || 'System Admin'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{lang === 'en' ? 'User / Username:' : 'प्रयोगकर्ता:'}</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{selectedLog.username ? `@${selectedLog.username}` : (selectedLog.userEmail || 'system')}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{lang === 'en' ? 'Action Performed:' : 'सम्पादित कार्य:'}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {lang === 'en' ? (selectedLog.actionLabelEn || selectedLog.action) : (selectedLog.actionLabelNe || selectedLog.action)}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{lang === 'en' ? 'Category:' : 'श्रेणी:'}</span>
                <span>{getCategoryBadge(selectedLog.category)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{lang === 'en' ? 'Date & Time:' : 'मिति र समय:'}</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {new Date(selectedLog.dateTimeUtms).toLocaleString()}
                </span>
              </div>

              {selectedLog.referenceId && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">{lang === 'en' ? 'Reference ID:' : 'सन्दर्भ नं.:'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedLog.referenceId}</span>
                </div>
              )}

              <div className="pt-2">
                <span className="text-slate-400 block mb-1">{lang === 'en' ? 'Activity Details:' : 'कार्य विवरण:'}</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-200 leading-relaxed font-medium border border-slate-200 dark:border-slate-700">
                  {selectedLog.details}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                {lang === 'en' ? 'Close' : 'बन्द'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
