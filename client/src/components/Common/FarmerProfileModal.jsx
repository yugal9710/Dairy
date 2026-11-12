import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  ArrowLeft,
  Milk,
  Receipt,
  History,
  ShieldCheck,
  Printer,
  Phone,
  MapPin,
  Landmark,
  Calendar,
  User,
  Clock,
  ShoppingCart,
  Trash2,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Edit,
  Activity
} from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';

function formatDateTime(ts) {
  if (!ts) return { date: '-', time: '' };
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return { date: '-', time: '' };
  return {
    date: d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  };
}

function getPaymentMethodLabel(method, lang) {
  const code = Number(method);
  if (code === 1) return lang === 'en' ? 'Cheque' : 'चेक';
  if (code === 2) return lang === 'en' ? 'Bank / QR' : 'बैंक / QR';
  if (code === 3) return lang === 'en' ? 'Other' : 'अन्य';
  return lang === 'en' ? 'Cash' : 'नगद';
}

export function FarmerProfileView({
  farmer,
  onClose,
  backLabel,
  defaultTab = 'all',
  initialCollections = [],
  initialPayments = [],
  initialAuditLogs = [],
  onOpenRecordMilk,
  onOpenRecordPayment,
  onEditCustomer,
  onPrintStatement,
  onPrintMilkSlip,
  onPrintPaymentSlip,
  onDeletePayment,
  refreshTrigger = 0
}) {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState(defaultTab || 'all');
  const [timelineFilter, setTimelineFilter] = useState('all'); // 'all' | 'collections' | 'payments' | 'other'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);

  useEffect(() => {
    setActiveTab(defaultTab || 'all');
  }, [defaultTab, farmer?.id]);

  useEffect(() => {
    if (!farmer?.id) return;
    let cancelled = false;
    const loadHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/Customer/${farmer.id}/history`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setHistoryData(data);
        }
      } catch (err) {
        console.error('Failed to load farmer activity history:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [farmer?.id, refreshTrigger]);

  const profile = historyData?.profile || farmer || {};

  const collections = useMemo(() => {
    if (historyData?.milkCollections) return historyData.milkCollections;
    return initialCollections
      .filter(c => !c.isDeleted && Number(c.farmerId) === Number(farmer?.id))
      .sort((a, b) => (Number(b.dateTimeUtms) || 0) - (Number(a.dateTimeUtms) || 0));
  }, [historyData?.milkCollections, initialCollections, farmer?.id]);

  const payments = useMemo(() => {
    if (historyData?.payments) return historyData.payments;
    return initialPayments
      .filter(p => !p.isDeleted && Number(p.farmerId) === Number(farmer?.id))
      .sort((a, b) => (Number(b.dateTimeUtms) || 0) - (Number(a.dateTimeUtms) || 0));
  }, [historyData?.payments, initialPayments, farmer?.id]);

  const orders = historyData?.orders || [];
  const futureOrders = historyData?.futureOrders || [];
  const customerPayments = historyData?.customerPayments || [];
  const auditLogs = useMemo(() => {
    if (historyData?.auditLogs) return historyData.auditLogs;
    return initialAuditLogs || [];
  }, [historyData?.auditLogs, initialAuditLogs]);

  const ledger = useMemo(() => {
    if (historyData?.ledger) return historyData.ledger;
    const raw = [
      ...collections.map(c => ({
        id: `col-${c.id}`,
        type: 'delivery',
        dateTimeUtms: Number(c.dateTimeUtms) || 0,
        descriptionEn: `${Number(c.quantity || 0).toFixed(2)} L Milk (FAT ${Number(c.fat || 0).toFixed(1)}% / SNF ${Number(c.snf || 0).toFixed(1)}%)`,
        descriptionNe: `${Number(c.quantity || 0).toFixed(2)} लि. दूध`,
        debit: Number(c.totalPrice || (Number(c.quantity) * Number(c.rate))) || 0,
        credit: 0,
        reference: `#${c.id}`
      })),
      ...payments.map(p => ({
        id: `pay-${p.id}`,
        type: 'payment',
        dateTimeUtms: Number(p.dateTimeUtms) || 0,
        descriptionEn: `Payment Out (${p.referenceNumber || `PAY-${p.id}`})${p.remarks ? ` · ${p.remarks}` : ''}`,
        descriptionNe: `भुक्तानी (${p.referenceNumber || `PAY-${p.id}`})`,
        debit: 0,
        credit: Number(p.amount) || 0,
        reference: p.referenceNumber || `PAY-${p.id}`
      }))
    ].sort((a, b) => a.dateTimeUtms - b.dateTimeUtms);

    let running = 0;
    return raw.map(item => {
      running = Math.round((running + item.debit - item.credit) * 100) / 100;
      return { ...item, balanceAfter: running };
    }).reverse();
  }, [historyData?.ledger, collections, payments]);

  // Build unified chronological timeline combining collections, payments, sales/orders, and other audit actions
  const unifiedTimeline = useMemo(() => {
    const coveredAuditRefs = new Set();

    const collectionEvents = collections.map(c => {
      coveredAuditRefs.add(`#${c.id}`);
      coveredAuditRefs.add(String(c.id));
      const amt = Number(c.totalPrice || c.totalAmount || (Number(c.quantity || 0) * Number(c.rate || 0)));
      return {
        id: `tl-col-${c.id}`,
        kind: 'collection',
        dateTimeUtms: Number(c.dateTimeUtms) || 0,
        title: lang === 'en' ? 'Milk Collection Recorded' : 'दूध संकलन प्रविष्टि',
        badge: lang === 'en' ? 'Milk Intake' : 'दूध संकलन',
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
        primaryMetric: `${Number(c.quantity || 0).toFixed(2)} L`,
        secondaryMetric: formatNepaliCurrency(amt),
        description: `${Number(c.shift) === 0 ? (lang === 'en' ? 'Morning' : 'बिहानी') : (lang === 'en' ? 'Evening' : 'बेलुकी')} · FAT ${Number(c.fat || 0).toFixed(1)}% · SNF ${Number(c.snf || 0).toFixed(1)}% · Rate रू ${Number(c.rate || 0).toFixed(2)}/L`,
        username: c.recordedByUsername || null,
        userName: c.recordedByName || null,
        referenceId: `#${c.id}`,
        raw: c
      };
    });

    const paymentEvents = payments.map(p => {
      if (p.referenceNumber) coveredAuditRefs.add(String(p.referenceNumber).trim().toUpperCase());
      coveredAuditRefs.add(`#${p.id}`);
      const isAdv = (p.remarks || '').toLowerCase().includes('advance') || (p.remarks || '').includes('पेश्की');
      return {
        id: `tl-pay-${p.id}`,
        kind: 'payment',
        dateTimeUtms: Number(p.dateTimeUtms) || 0,
        title: isAdv
          ? (lang === 'en' ? 'Farmer Advance Disbursed' : 'कृषक पेश्की भुक्तानी')
          : (lang === 'en' ? 'Farmer Payment Disbursed' : 'कृषक भुक्तानी'),
        badge: isAdv ? (lang === 'en' ? 'Advance' : 'पेश्की') : (lang === 'en' ? 'Payment' : 'भुक्तानी'),
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
        primaryMetric: formatNepaliCurrency(p.amount),
        secondaryMetric: getPaymentMethodLabel(p.paymentMethod, lang),
        description: p.remarks || (lang === 'en' ? 'Milk settlement disbursement' : 'दूध हिसाब भुक्तानी'),
        username: p.recordedByUsername || null,
        userName: p.recordedByName || null,
        referenceId: p.referenceNumber || `PAY-${p.id}`,
        raw: p
      };
    });

    const orderEvents = orders.map(o => {
      coveredAuditRefs.add(`#${o.id}`);
      coveredAuditRefs.add(`SALE-${o.id}`);
      return {
        id: `tl-ord-${o.id}`,
        kind: 'other',
        dateTimeUtms: Number(o.orderDateTimeUtms || o.dateTimeUtms) || 0,
        title: lang === 'en' ? 'POS Product Sale / Purchase' : 'बिक्री बिल कारोवार',
        badge: lang === 'en' ? 'Sale' : 'बिक्री',
        badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
        primaryMetric: formatNepaliCurrency(o.netAmount || o.totalAmount || 0),
        secondaryMetric: `${(o.orderProducts || []).length} ${lang === 'en' ? 'items' : 'आइटम'}`,
        description: `Bill #${o.billNumber || o.id} · Paid ${formatNepaliCurrency(o.totalPaid || 0)}`,
        username: null,
        referenceId: `#${o.id}`,
        raw: o
      };
    });

    const futureOrderEvents = futureOrders.map(fo => {
      coveredAuditRefs.add(`FO-${fo.id}`);
      coveredAuditRefs.add(`#${fo.id}`);
      return {
        id: `tl-fo-${fo.id}`,
        kind: 'other',
        dateTimeUtms: Number(fo.creationDateTimeUtms || fo.orderDateTimeUtms) || 0,
        title: lang === 'en' ? 'Advance / Future Order' : 'भविष्य अर्डर',
        badge: lang === 'en' ? 'Order' : 'अर्डर',
        badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
        primaryMetric: formatNepaliCurrency(fo.totalAmount || 0),
        secondaryMetric: `Adv ${formatNepaliCurrency(fo.paidAmount || 0)}`,
        description: fo.notes || fo.deliveryAddress || `Order #${fo.id}`,
        username: null,
        referenceId: `FO-${fo.id}`,
        raw: fo
      };
    });

    const custPayEvents = customerPayments.map(cp => {
      if (cp.referenceNumber) coveredAuditRefs.add(String(cp.referenceNumber).trim().toUpperCase());
      return {
        id: `tl-cpay-${cp.id}`,
        kind: 'other',
        dateTimeUtms: Number(cp.dateTimeUtms) || 0,
        title: lang === 'en' ? 'Customer Credit Receipt' : 'ग्राहक भुक्तानी प्राप्ति',
        badge: lang === 'en' ? 'Receipt' : 'प्राप्ति',
        badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
        primaryMetric: formatNepaliCurrency(cp.amount || 0),
        secondaryMetric: getPaymentMethodLabel(cp.paymentMethod, lang),
        description: cp.remarks || 'Credit settlement payment received',
        username: null,
        referenceId: cp.referenceNumber || `RCPT-${cp.id}`,
        raw: cp
      };
    });

    // Include ALL other recorded audit actions (registration, edits, updates, deletions, etc.)
    const otherAuditEvents = auditLogs
      .filter(l => {
        const isInitialCreate =
          l.action === 'RECORD_MILK_COLLECTION' ||
          l.action === 'DISBURSE_FARMER_PAYMENT' ||
          l.action === 'RECORD_FARMER_ADVANCE' ||
          l.action === 'POS_SALE' ||
          l.action === 'CREATE_FUTURE_ORDER';
        const ref = l.referenceId ? String(l.referenceId).trim() : '';
        if (isInitialCreate && ref && (coveredAuditRefs.has(ref) || coveredAuditRefs.has(ref.toUpperCase()))) {
          return false;
        }
        return true;
      })
      .map(l => ({
        id: `tl-aud-${l.id}`,
        kind: 'other',
        dateTimeUtms: Number(l.dateTimeUtms) || 0,
        title: lang === 'en' ? (l.actionLabelEn || l.action) : (l.actionLabelNe || l.action),
        badge: l.category || (lang === 'en' ? 'Action' : 'कार्य'),
        badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
        primaryMetric: l.action,
        secondaryMetric: l.username ? `@${l.username}` : '',
        description: l.details || '',
        username: l.username || null,
        userName: l.userName || null,
        referenceId: l.referenceId || null,
        raw: l
      }));

    return [
      ...collectionEvents,
      ...paymentEvents,
      ...orderEvents,
      ...futureOrderEvents,
      ...custPayEvents,
      ...otherAuditEvents
    ].sort((a, b) => (b.dateTimeUtms || 0) - (a.dateTimeUtms || 0));
  }, [collections, payments, orders, futureOrders, customerPayments, auditLogs, lang]);

  const filteredTimeline = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unifiedTimeline.filter(item => {
      if (timelineFilter === 'collections' && item.kind !== 'collection') return false;
      if (timelineFilter === 'payments' && item.kind !== 'payment') return false;
      if (timelineFilter === 'other' && item.kind !== 'other') return false;
      if (!q) return true;
      return (
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.username || '').toLowerCase().includes(q) ||
        (item.referenceId || '').toLowerCase().includes(q) ||
        (item.primaryMetric || '').toLowerCase().includes(q)
      );
    });
  }, [unifiedTimeline, timelineFilter, searchQuery]);

  if (!farmer) return null;

  const isBuyerOnly = Number(profile.customerType) === 2;
  const totalMilkQty = historyData?.stats?.totalLiters !== undefined
    ? Number(historyData.stats.totalLiters)
    : (Number(profile.totalMilkQuantity) || collections.reduce((a, c) => a + (Number(c.quantity) || 0), 0));
  const avgFat = historyData?.stats?.avgFat !== undefined
    ? Number(historyData.stats.avgFat)
    : (totalMilkQty > 0 ? Math.round((collections.reduce((a, c) => a + (Number(c.fat || 0) * Number(c.quantity || 0)), 0) / totalMilkQty) * 100) / 100 : 0);
  const avgSnf = historyData?.stats?.avgSnf !== undefined
    ? Number(historyData.stats.avgSnf)
    : (totalMilkQty > 0 ? Math.round((collections.reduce((a, c) => a + (Number(c.snf || 0) * Number(c.quantity || 0)), 0) / totalMilkQty) * 100) / 100 : 0);
  const grossOwed = Number(profile.milkCollectionTotalAmount) || collections.reduce((a, c) => a + Number(c.totalPrice || (Number(c.quantity) * Number(c.rate)) || 0), 0);
  const totalPaidOut = Number(profile.milkCollectionTotalAmountPaid) || payments.reduce((a, p) => a + Number(p.amount || 0), 0);
  const remainingDue = isBuyerOnly
    ? Math.max(0, Number(profile.outstandingBalance) || 0)
    : Math.max(0, Number(profile.milkCollectionRemainingAmount !== undefined ? profile.milkCollectionRemainingAmount : (grossOwed - totalPaidOut)));

  const displayName = lang === 'en'
    ? (profile.nameInEnglish || profile.nameInNepali || 'Farmer')
    : (profile.nameInNepali || profile.nameInEnglish || 'कृषक');
  const secondaryName = lang === 'en'
    ? (profile.nameInNepali && profile.nameInNepali !== profile.nameInEnglish ? profile.nameInNepali : '')
    : (profile.nameInEnglish && profile.nameInEnglish !== profile.nameInNepali ? profile.nameInEnglish : '');

  const createdInfo = formatDateTime(profile.creationDateTimeUtms);

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onClose && backLabel && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{backLabel}</span>
            </button>
          )}
          {loading && (
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 animate-pulse">
              {lang === 'en' ? 'Syncing activity history...' : 'कारोवार विवरण ताजा हुँदैछ...'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onEditCustomer && (
            <button
              type="button"
              onClick={() => onEditCustomer(profile)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Edit Profile' : 'सम्पादन'}</span>
            </button>
          )}
          {onOpenRecordMilk && !isBuyerOnly && (
            <button
              type="button"
              onClick={() => onOpenRecordMilk(profile)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              <Milk className="w-3.5 h-3.5" />
              <span>{t ? t('btnRecordMilk') : (lang === 'en' ? 'Record Milk' : 'दूध संकलन')}</span>
            </button>
          )}
          {onOpenRecordPayment && !isBuyerOnly && (
            <button
              type="button"
              onClick={() => onOpenRecordPayment(profile)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Record Payment' : 'भुक्तानी प्रविष्टि'}</span>
            </button>
          )}
          {onPrintStatement && (
            <button
              type="button"
              onClick={() => onPrintStatement(profile)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Print Statement' : 'स्टेटमेन्ट प्रिन्ट'}</span>
            </button>
          )}
          {onClose && !backLabel && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close Farmer Profile"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Complete Farmer Profile Hero Card */}
      <div className="bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-sm">
            {(profile.nameInNepali || profile.nameInEnglish || 'F')[0]}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">
                {displayName}
              </h2>
              {secondaryName && (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  ({secondaryName})
                </span>
              )}
              <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                #{profile.code || profile.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                {profile.customerType === 1
                  ? (lang === 'en' ? 'Milk Supplier Farmer' : 'दूध आपूर्तिकर्ता कृषक')
                  : profile.customerType === 2
                  ? (lang === 'en' ? 'Wholesale Buyer' : 'थोक खरिदकर्ता')
                  : (lang === 'en' ? 'Farmer & Buyer' : 'कृषक तथा खरिदकर्ता')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <strong>{profile.phone || (lang === 'en' ? 'No phone' : 'फोन छैन')}</strong>
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{profile.address || (lang === 'en' ? 'No address' : 'ठेगाना छैन')}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'en' ? 'Bank / Acct:' : 'बैंक खाता:'}</span>
                <code className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {profile.accountNumber || 'N/A'}
                </code>
              </span>
              {profile.creationDateTimeUtms && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'en' ? 'Registered:' : 'दर्ता मिति:'} {createdInfo.date}</span>
                </span>
              )}
            </div>

            {profile.remarks && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                {lang === 'en' ? 'Notes:' : 'कैफियत:'} {profile.remarks}
              </div>
            )}
          </div>
        </div>

        {/* Balance Status Callout */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs text-left lg:text-right shrink-0 min-w-[180px]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {lang === 'en' ? 'Current Balance Status' : 'हालको बाँकी स्थिति'}
          </div>
          {remainingDue > 0 ? (
            <>
              <div className={`text-xl font-black mt-0.5 ${isBuyerOnly ? 'text-amber-600' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatNepaliCurrency(remainingDue)}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500" />
                <span>
                  {isBuyerOnly
                    ? (lang === 'en' ? 'Pending receivable' : 'उठाउन बाँकी')
                    : (lang === 'en' ? 'Pending payable due' : 'भुक्तानी गर्न बाँकी')}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatNepaliCurrency(0)}
              </div>
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>{lang === 'en' ? 'All dues settled' : 'सम्पूर्ण हिसाब चुक्ता'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      {!isBuyerOnly ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-sky-50/70 dark:bg-sky-950/30 rounded-2xl border border-sky-200/80 dark:border-sky-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 block">
              {lang === 'en' ? 'Milk Collections' : 'कुल दूध संकलन'}
            </span>
            <div className="text-lg sm:text-xl font-black text-sky-800 dark:text-sky-200 mt-0.5">
              {totalMilkQty.toFixed(1)} <span className="text-xs font-bold">{lang === 'en' ? 'L' : 'लिटर'}</span>
            </div>
            <span className="text-[10px] text-sky-700/80 dark:text-sky-400">
              {collections.length} {lang === 'en' ? 'entries' : 'पटक'} · Avg {avgFat.toFixed(1)}% / {avgSnf.toFixed(1)}%
            </span>
          </div>

          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
              {lang === 'en' ? 'Total Milk Value' : 'कुल दूध मूल्य'}
            </span>
            <div className="text-lg sm:text-xl font-black text-blue-800 dark:text-blue-200 mt-0.5">
              {formatNepaliCurrency(grossOwed)}
            </div>
            <span className="text-[10px] text-blue-700/80 dark:text-blue-400">
              {lang === 'en' ? 'Cumulative earned' : 'कुल संकलन दायित्व'}
            </span>
          </div>

          <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
              {lang === 'en' ? 'Payments Disbursed' : 'भुक्तानी गरिएको रकम'}
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-800 dark:text-emerald-200 mt-0.5">
              {formatNepaliCurrency(totalPaidOut)}
            </div>
            <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
              {payments.length} {lang === 'en' ? 'payouts' : 'पटक भुक्तानी'}
            </span>
          </div>

          <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
              {lang === 'en' ? 'Total Recorded Actions' : 'कुल दर्ता गतिविधि'}
            </span>
            <div className="text-lg sm:text-xl font-black text-amber-800 dark:text-amber-200 mt-0.5">
              {unifiedTimeline.length}
            </div>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-400">
              {auditLogs.length} {lang === 'en' ? 'system audit events' : 'प्रणाली अडिट लग'}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200">
            <span className="text-[10px] font-bold uppercase text-indigo-700 block">{lang === 'en' ? 'Total Purchases' : 'कुल खरिद'}</span>
            <div className="text-lg sm:text-xl font-black text-indigo-800 mt-0.5">{formatNepaliCurrency(profile.totalPurchased || 0)}</div>
          </div>
          <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200">
            <span className="text-[10px] font-bold uppercase text-emerald-700 block">{lang === 'en' ? 'Total Paid' : 'कुल प्राप्त'}</span>
            <div className="text-lg sm:text-xl font-black text-emerald-800 mt-0.5">{formatNepaliCurrency(profile.totalPaid || 0)}</div>
          </div>
          <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200">
            <span className="text-[10px] font-bold uppercase text-amber-700 block">{lang === 'en' ? 'Receivable' : 'उठाउन बाँकी'}</span>
            <div className="text-lg sm:text-xl font-black text-amber-800 mt-0.5">{formatNepaliCurrency(profile.outstandingBalance || 0)}</div>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 block">{lang === 'en' ? 'Recorded Actions' : 'दर्ता कार्य'}</span>
            <div className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{unifiedTimeline.length}</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="flex items-center gap-1.5 flex-wrap p-3 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          {[
            { id: 'all', icon: Activity, labelEn: 'Complete Activity Timeline', labelNe: 'सम्पूर्ण गतिविधि इतिहास', count: unifiedTimeline.length },
            ...(!isBuyerOnly ? [
              { id: 'payments', icon: Receipt, labelEn: 'Payment History', labelNe: 'भुक्तानी इतिहास', count: payments.length },
              { id: 'collections', icon: Milk, labelEn: 'Milk Collections', labelNe: 'दूध संकलन विवरण', count: collections.length },
              { id: 'ledger', icon: History, labelEn: 'Running Ledger', labelNe: 'हिसाब लेजर', count: ledger.length }
            ] : []),
            { id: 'audit', icon: ShieldCheck, labelEn: 'All Audit Actions', labelNe: 'प्रणाली अडिट कार्य', count: auditLogs.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? tab.labelEn : tab.labelNe}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-4">
          {/* TAB 1: UNIFIED CHRONOLOGICAL ACTIVITY TIMELINE */}
          {activeTab === 'all' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'all', en: 'All', ne: 'सबै' },
                    { id: 'collections', en: 'Milk Collections', ne: 'दूध संकलन' },
                    { id: 'payments', en: 'Payments', ne: 'भुक्तानी' },
                    { id: 'other', en: 'Other Actions & Orders', ne: 'अन्य कार्य तथा अर्डर' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTimelineFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        timelineFilter === f.id
                          ? 'bg-slate-800 dark:bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {lang === 'en' ? f.en : f.ne}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={lang === 'en' ? 'Filter timeline by user, voucher, action...' : 'प्रयोगकर्ता, भौचर वा कार्य खोज्नुहोस्...'}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {filteredTimeline.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {lang === 'en' ? 'No recorded activities match the current filter.' : 'कुनै गतिविधि फेला परेन ।'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {filteredTimeline.map(item => {
                    const dt = formatDateTime(item.dateTimeUtms);
                    return (
                      <div key={item.id} className="p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="font-mono text-xs shrink-0 w-24 text-slate-600 dark:text-slate-400">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{dt.date}</div>
                            <div className="text-[10px] text-slate-400">{dt.time}</div>
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeClass}`}>
                                {item.badge}
                              </span>
                              <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100">
                                {item.title}
                              </span>
                              {item.username && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold">
                                  @{item.username}
                                </span>
                              )}
                              {item.referenceId && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                                  {item.referenceId}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 break-words">
                              {item.description}
                            </div>
                          </div>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <div className="font-black text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-mono">
                            {item.primaryMetric}
                          </div>
                          {item.secondaryMetric && (
                            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                              {item.secondaryMetric}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAYMENT HISTORY */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {lang === 'en' ? `Payment dates and amounts disbursed to ${displayName}` : `${displayName} लाई प्रदान गरिएका भुक्तानीहरू`}
                </span>
                {onOpenRecordPayment && (
                  <button
                    type="button"
                    onClick={() => onOpenRecordPayment(profile)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'New Payment' : 'नयाँ भुक्तानी'}</span>
                  </button>
                )}
              </div>

              {payments.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  {lang === 'en' ? 'No payment history records found for this farmer.' : 'यो कृषकको कुनै भुक्तानी इतिहास फेला परेन ।'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">{lang === 'en' ? 'Payment Date & Time' : 'भुक्तानी मिति र समय'}</th>
                        <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Amount Paid' : 'भुक्तानी रकम'}</th>
                        <th className="py-2.5 px-3 text-center">{lang === 'en' ? 'Method' : 'माध्यम'}</th>
                        <th className="py-2.5 px-3">{lang === 'en' ? 'Voucher #' : 'भौचर नं.'}</th>
                        <th className="py-2.5 px-3">{lang === 'en' ? 'Recorded By' : 'प्रविष्टिकर्ता'}</th>
                        <th className="py-2.5 px-3">{lang === 'en' ? 'Remarks' : 'कैफियत'}</th>
                        <th className="py-2.5 px-3 text-center">{lang === 'en' ? 'Actions' : 'कार्य'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {payments.map(p => {
                        const dt = formatDateTime(p.dateTimeUtms);
                        const isAdv = (p.remarks || '').toLowerCase().includes('advance') || (p.remarks || '').includes('पेश्की');
                        return (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{dt.date}</div>
                              <div className="text-[10px] text-slate-400">{dt.time}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                                {formatNepaliCurrency(p.amount)}
                              </div>
                              {isAdv && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  {lang === 'en' ? 'Advance' : 'पेश्की'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {getPaymentMethodLabel(p.paymentMethod, lang)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {p.referenceNumber || '-'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {p.recordedByUsername ? (
                                <span className="font-mono font-bold text-[11px] text-indigo-700 dark:text-indigo-300">
                                  @{p.recordedByUsername}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                              {p.remarks || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                {onPrintPaymentSlip && (
                                  <button
                                    type="button"
                                    onClick={() => onPrintPaymentSlip(p)}
                                    className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                                    title={lang === 'en' ? 'Print Voucher' : 'रसिद प्रिन्ट'}
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {onDeletePayment && (
                                  <button
                                    type="button"
                                    onClick={() => onDeletePayment(p)}
                                    className="p-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                    title={lang === 'en' ? 'Delete' : 'मेटाउनुहोस्'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-extrabold text-xs border-t border-slate-200 dark:border-slate-700">
                      <tr>
                        <td className="py-2.5 px-3">{lang === 'en' ? 'Total Disbursed' : 'जम्मा भुक्तानी'}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-black">
                          {formatNepaliCurrency(payments.reduce((a, p) => a + (Number(p.amount) || 0), 0))}
                        </td>
                        <td colSpan={5} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MILK COLLECTIONS */}
          {activeTab === 'collections' && (
            <div className="space-y-3">
              {collections.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  {lang === 'en' ? 'No milk collection records found for this farmer.' : 'यो कृषकको कुनै दूध संकलन रेकर्ड भेटिएन ।'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">{lang === 'en' ? 'Collection Date & Time' : 'संकलन मिति र समय'}</th>
                        <th className="py-2.5 px-3 text-center">{lang === 'en' ? 'Shift' : 'शिफ्ट'}</th>
                        <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Quantity (L)' : 'परिमाण (लि.)'}</th>
                        <th className="py-2.5 px-3 text-center">FAT / SNF</th>
                        <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Rate / L' : 'दर'}</th>
                        <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Total Amount' : 'कुल रकम'}</th>
                        <th className="py-2.5 px-3">{lang === 'en' ? 'Recorded By' : 'प्रविष्टिकर्ता'}</th>
                        <th className="py-2.5 px-3 text-center">{lang === 'en' ? 'Slip' : 'रसिद'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {collections.map(c => {
                        const dt = formatDateTime(c.dateTimeUtms);
                        const isMorning = Number(c.shift) === 0;
                        const totalAmt = Number(c.totalPrice || c.totalAmount || (Number(c.quantity) * Number(c.rate)));
                        return (
                          <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{dt.date}</div>
                              <div className="text-[10px] text-slate-400">{dt.time}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isMorning
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'
                              }`}>
                                {isMorning ? (lang === 'en' ? 'Morning' : 'बिहानी') : (lang === 'en' ? 'Evening' : 'बेलुकी')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-blue-700 dark:text-blue-400 whitespace-nowrap">
                              {Number(c.quantity || 0).toFixed(2)} {lang === 'en' ? 'L' : 'लि.'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {Number(c.fat || 0).toFixed(1)}% / {Number(c.snf || 0).toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {formatNepaliCurrency(c.rate || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              {formatNepaliCurrency(totalAmt)}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {c.recordedByUsername ? (
                                <span className="font-mono font-bold text-[11px] text-indigo-700 dark:text-indigo-300">
                                  @{c.recordedByUsername}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {onPrintMilkSlip && (
                                <button
                                  type="button"
                                  onClick={() => onPrintMilkSlip({ ...c, farmer: profile, totalPrice: totalAmt })}
                                  className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                                  title={lang === 'en' ? 'Print Milk Slip' : 'दूध रसिद प्रिन्ट'}
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-extrabold text-xs border-t border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3">{lang === 'en' ? 'Totals' : 'कुल जम्मा'}</td>
                        <td className="py-2.5 px-3 text-right text-blue-700 dark:text-blue-400 font-black">
                          {collections.reduce((a, c) => a + (Number(c.quantity) || 0), 0).toFixed(2)} {lang === 'en' ? 'L' : 'लि.'}
                        </td>
                        <td colSpan={2} />
                        <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-black">
                          {formatNepaliCurrency(collections.reduce((a, c) => a + Number(c.totalPrice || (Number(c.quantity) * Number(c.rate)) || 0), 0))}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RUNNING LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-3">
              {ledger.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  {lang === 'en' ? 'No ledger transactions found.' : 'कुनै लेजर कारोवार भेटिएन ।'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">{lang === 'en' ? 'Date & Time' : 'मिति र समय'}</th>
                        <th className="py-2.5 px-3">{lang === 'en' ? 'Particulars' : 'विवरण'}</th>
                        <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Milk Owed (+)' : 'दूध दायित्व (+)'}</th>
                        <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Paid Out (-)' : 'भुक्तानी (-)'}</th>
                        <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Running Balance' : 'बाँकी बक्यौता'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {ledger.map(item => {
                        const dt = formatDateTime(item.dateTimeUtms);
                        const isDelivery = item.type === 'delivery';
                        return (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                              <div className="font-bold text-slate-700 dark:text-slate-300">{dt.date}</div>
                              <div className="text-[10px] text-slate-400">{dt.time}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                {isDelivery
                                  ? <Milk className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  : <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                <span>{lang === 'en' ? item.descriptionEn : item.descriptionNe}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap">
                              {item.debit > 0 ? formatNepaliCurrency(item.debit) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              {item.credit > 0 ? formatNepaliCurrency(item.credit) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black whitespace-nowrap">
                              <span className={item.balanceAfter > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}>
                                {formatNepaliCurrency(item.balanceAfter)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ALL RECORDED SYSTEM / AUDIT ACTIONS */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  {lang === 'en' ? 'No recorded system actions found for this farmer.' : 'यो कृषक सम्बन्धी कुनै प्रणाली कार्य दर्ता भेटिएन ।'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">{lang === 'en' ? 'Date & Time' : 'मिति र समय'}</th>
                        <th className="py-2.5 px-3">{lang === 'en' ? 'Username' : 'प्रयोगकर्ता'}</th>
                        <th className="py-2.5 px-3">{lang === 'en' ? 'Action' : 'सम्पादित कार्य'}</th>
                        <th className="py-2.5 px-3">{lang === 'en' ? 'Category' : 'श्रेणी'}</th>
                        <th className="py-2.5 px-3">{lang === 'en' ? 'Details' : 'विवरण'}</th>
                        <th className="py-2.5 px-3 text-center">{lang === 'en' ? 'Ref #' : 'सन्दर्भ'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {auditLogs.map(log => {
                        const dt = formatDateTime(log.dateTimeUtms);
                        const uname = log.username || (log.userEmail ? log.userEmail.split('@')[0] : 'admin');
                        return (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{dt.time}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">{dt.date}</div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[11px]">
                                @{uname}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-0.5">{log.userName || 'System Admin'}</div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="font-bold text-slate-800 dark:text-slate-100">
                                {lang === 'en' ? (log.actionLabelEn || log.action) : (log.actionLabelNe || log.action)}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">{log.action}</div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {log.category || 'General'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 min-w-[220px]">
                              {log.details}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                {log.referenceId || '-'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FarmerProfileModal({
  isOpen,
  farmer,
  onClose,
  ...props
}) {
  if (!isOpen || !farmer) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto my-auto">
        <FarmerProfileView
          farmer={farmer}
          onClose={onClose}
          {...props}
        />
      </div>
    </div>
  );
}
