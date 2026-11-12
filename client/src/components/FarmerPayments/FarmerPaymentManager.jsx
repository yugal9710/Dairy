import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  RotateCcw,
  Milk,
  Zap,
  CheckCircle,
  History,
  Truck,
  Trash2,
  X,
  CreditCard,
  Building,
  User,
  AlertCircle
} from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';
import FarmerProfileModal from '../Common/FarmerProfileModal';

export default function FarmerPaymentManager({
  farmers = [],
  payments = [],
  collections = [],
  auditLogs = [],
  onRefresh,
  onPrintSlip,
  onPrintPaymentSlip,
  onPrintMilkSlip,
  onNavigate
}) {
  const { lang, t } = useLanguage();
  const [selectedTabIndex, setSelectedTabIndex] = useState(0); // 0: Balances & Ledger, 1: Payment History, 2: Deliveries

  // Filtering State
  const [farmerFilter, setFarmerFilter] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [filterFarmerIdForPayments, setFilterFarmerIdForPayments] = useState(null);
  const [filterFarmerIdForDeliveries, setFilterFarmerIdForDeliveries] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [amount, setAmount] = useState('');
  const [isAdvancePayment, setIsAdvancePayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(0); // 0: Cash, 1: Cheque, 2: Online/Bank, 3: Other
  const [dateTimeLocal, setDateTimeLocal] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  // Complete Activity & Payment History Modal State for Selected Farmer
  const [selectedFarmerForHistory, setSelectedFarmerForHistory] = useState(null);
  const [historyActiveTab, setHistoryActiveTab] = useState('all'); // 'all' | 'payments' | 'collections' | 'ledger' | 'audit'

  // Milk Suppliers list (Farmer or Both)
  const milkSuppliers = useMemo(() => {
    return farmers
      .filter(f => (f.customerType === 1 || f.customerType === 3) && !f.isDeleted)
      .filter(f => {
        if (!farmerFilter) return true;
        const q = farmerFilter.toLowerCase().trim();
        const nepali = (f.nameInNepali || '').toLowerCase();
        const english = (f.nameInEnglish || '').toLowerCase();
        const code = String(f.code || '');
        const phone = f.phone || '';
        const addr = (f.address || '').toLowerCase();
        return nepali.includes(q) || english.includes(q) || code.includes(q) || phone.includes(q) || addr.includes(q);
      });
  }, [farmers, farmerFilter]);

  // Executive KPI summary metrics
  const totalMilkDelivered = useMemo(() => {
    return collections
      .filter(c => !c.isDeleted)
      .reduce((acc, c) => acc + (Number(c.quantity) || 0), 0);
  }, [collections]);

  const totalMilkOwed = useMemo(() => {
    return farmers
      .filter(f => !f.isDeleted)
      .reduce((acc, f) => acc + (Number(f.milkCollectionTotalAmount) || 0), 0);
  }, [farmers]);

  const totalPaidOut = useMemo(() => {
    return farmers
      .filter(f => !f.isDeleted)
      .reduce((acc, f) => acc + (Number(f.milkCollectionTotalAmountPaid) || 0), 0);
  }, [farmers]);

  const totalRemainingDue = useMemo(() => {
    return farmers
      .filter(f => !f.isDeleted)
      .reduce((acc, f) => acc + Math.max(0, Number(f.milkCollectionRemainingAmount) || 0), 0);
  }, [farmers]);

  // Payment method display chip helper
  const renderPaymentMethodChip = (method) => {
    switch (Number(method)) {
      case 0:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            💵 {lang === 'en' ? 'Cash' : 'नगद'}
          </span>
        );
      case 1:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            🏛️ {lang === 'en' ? 'Cheque' : 'चेक'}
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            🏦 {lang === 'en' ? 'Bank Transfer' : 'बैंक ट्रान्सफर'}
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            📱 {lang === 'en' ? 'Online / QR' : 'क्युआर / फोनपे'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            💵 {lang === 'en' ? 'Cash' : 'नगद'}
          </span>
        );
    }
  };

  // Open Payment / Advance Modal
  const handleOpenPaymentModal = (farmer = null, isAdvance = false) => {
    setSelectedFarmer(farmer);
    setIsAdvancePayment(isAdvance);
    const due = farmer ? Math.max(0, Number(farmer.milkCollectionRemainingAmount) || 0) : 0;
    setAmount(due > 0 && !isAdvance ? String(due) : '');
    setReferenceNumber(`VCHR-${Date.now().toString().slice(-6)}`);
    setPaymentMethod(0);

    const now = new Date();
    setDateTimeLocal(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));

    if (isAdvance) {
      setRemarks(lang === 'en' ? 'Advance disbursement for festival/feed' : 'चाडपर्व वा दाना पेश्की भुक्तानी');
    } else {
      setRemarks(lang === 'en' ? 'Milk collection settlement' : 'दूध संकलन हिसाब मिलान भुक्तानी');
    }
    setModalOpen(true);
  };

  const handleSetFullDue = () => {
    if (selectedFarmer) {
      const due = Math.max(0, Number(selectedFarmer.milkCollectionRemainingAmount) || 0);
      setAmount(String(due));
    }
  };

  // Outstanding balance check for selected farmer
  const selectedFarmerRemainingDue = useMemo(() => {
    if (!selectedFarmer) return 0;
    return Math.max(0, Number(selectedFarmer.milkCollectionRemainingAmount) || 0);
  }, [selectedFarmer]);

  const isOverpayment = useMemo(() => {
    if (isAdvancePayment || !selectedFarmer) return false;
    const entered = Number(amount) || 0;
    return entered > (selectedFarmerRemainingDue + 0.05);
  }, [isAdvancePayment, selectedFarmer, amount, selectedFarmerRemainingDue]);

  const handleSavePayment = async (printSlipAfter = false) => {
    if (!selectedFarmer || !amount || Number(amount) <= 0) {
      alert(lang === 'en' ? 'Please select farmer and enter a valid amount.' : 'कृपया कृषक छान्नुहोस् र मान्य रकम प्रविष्ट गर्नुहोस् ।');
      return;
    }

    const enteredAmt = Number(amount);
    const due = Math.max(0, Number(selectedFarmer.milkCollectionRemainingAmount) || 0);

    // Strict Validation: Prevent payments from exceeding the total amount owed
    if (!isAdvancePayment && enteredAmt > (due + 0.05)) {
      alert(
        lang === 'en'
          ? `Validation Error: Payment amount (रू ${enteredAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) exceeds the outstanding balance (${formatNepaliCurrency(due)}). Payment cannot exceed what is owed.`
          : `प्रमाणीकरण त्रुटि: भुक्तानी रकम (रू ${enteredAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) बाँकी बक्यौता (${formatNepaliCurrency(due)}) भन्दा बढी हुन सक्दैन । बक्यौता रकमभन्दा बढी भुक्तानी गर्न मिल्दैन ।`
      );
      return;
    }

    setLoading(true);
    try {
      const finalRemarks = isAdvancePayment && !remarks.includes('Advance') && !remarks.includes('पेश्की')
        ? `[Advance] ${remarks}`
        : remarks;

      const payload = {
        FarmerId: selectedFarmer.id,
        Amount: Number(amount),
        PaymentMethod: Number(paymentMethod),
        ReferenceNumber: referenceNumber,
        Remarks: finalRemarks,
        DateTimeLocal: dateTimeLocal,
        DateTimeUtms: new Date(dateTimeLocal).getTime()
      };

      const res = await fetch('/api/MilkCollectionPayment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedData = await res.json().catch(() => null);
        setModalOpen(false);
        if (onRefresh) onRefresh();

        if (printSlipAfter) {
          if (onPrintPaymentSlip) {
            onPrintPaymentSlip(savedData || { ...payload, farmer: selectedFarmer });
          } else if (onPrintSlip) {
            onPrintSlip(selectedFarmer);
          }
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || (lang === 'en' ? 'Failed to record payment.' : 'भुक्तानी दर्ता गर्न सकिएन ।'));
      }
    } catch (err) {
      console.error(err);
      alert(lang === 'en' ? 'Error saving payment.' : 'भुक्तानी सुरक्षित गर्दा त्रुटि भयो ।');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (p) => {
    const confirmMsg = lang === 'en'
      ? `Are you sure you want to delete payment of रू ${p.amount}?`
      : `के तपाईं रू ${p.amount} को भुक्तानी मेटाउन निश्चित हुनुहुन्छ?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/MilkCollectionPayment/${p.id}`, { method: 'DELETE' });
      if (res.ok && onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments
      .filter(p => !p.isDeleted)
      .filter(p => {
        if (filterFarmerIdForPayments && p.farmerId !== filterFarmerIdForPayments) return false;
        if (paymentSearch) {
          const q = paymentSearch.toLowerCase().trim();
          const rem = (p.remarks || '').toLowerCase();
          const ref = (p.referenceNumber || '').toLowerCase();
          const f = farmers.find(fm => fm.id === p.farmerId);
          const fName = (f?.nameInNepali || f?.nameInEnglish || '').toLowerCase();
          const fCode = String(f?.code || '');
          return rem.includes(q) || ref.includes(q) || fName.includes(q) || fCode.includes(q);
        }
        return true;
      });
  }, [payments, filterFarmerIdForPayments, paymentSearch, farmers]);

  // Filtered Deliveries List
  const filteredDeliveries = useMemo(() => {
    return collections
      .filter(c => !c.isDeleted)
      .filter(c => {
        const cFarmerId = c.customerId || c.farmerId;
        if (filterFarmerIdForDeliveries && cFarmerId !== filterFarmerIdForDeliveries) return false;
        if (deliverySearch) {
          const q = deliverySearch.toLowerCase().trim();
          const f = farmers.find(fm => fm.id === cFarmerId);
          const fName = (f?.nameInNepali || f?.nameInEnglish || '').toLowerCase();
          const fCode = String(f?.code || '');
          return fName.includes(q) || fCode.includes(q);
        }
        return true;
      });
  }, [collections, filterFarmerIdForDeliveries, deliverySearch, farmers]);

  return (
    <div className="space-y-6">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">
                {lang === 'en' ? 'Farmer Milk Payments & Settlements' : 'कृषक दूध भुक्तानी तथा हिसाब मिलान'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'en'
                  ? 'Record milk deliveries, track amounts owed, disburse farmer payments, and monitor remaining balances.'
                  : 'दूध दाखिला रेकर्ड, बाँकी बक्यौता हिसाब, कृषक भुक्तानी भुक्तान तथा ब्यालेन्स अनुगमन'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            title={lang === 'en' ? 'Refresh' : 'ताजा गर्नुहोस्'}
          >
            <RotateCcw className="w-4 h-4" />
            <span>{lang === 'en' ? 'Refresh' : 'ताजा'}</span>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('milk-collection')}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            <Milk className="w-4 h-4 text-blue-600" />
            <span>{lang === 'en' ? 'Deliveries' : 'दूध दाखिला'}</span>
          </button>

          <button
            onClick={() => handleOpenPaymentModal(null, true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>{lang === 'en' ? 'Record Advance' : 'पेश्की भुक्तानी'}</span>
          </button>

          <button
            onClick={() => handleOpenPaymentModal(null, false)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'en' ? 'Record Payment' : 'रकम भुक्तानी'}</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Milk Delivered */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-sky-500 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Total Milk Delivered' : 'कुल संकलित दूध'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-sky-700 dark:text-sky-400 mt-1">
                {totalMilkDelivered.toFixed(1)} <span className="text-sm font-semibold text-slate-500">{lang === 'en' ? 'Liters' : 'लिटर'}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {milkSuppliers.length} {lang === 'en' ? 'Active Suppliers' : 'सक्रिय आपूर्तिकर्ता'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Milk className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Total Amount Owed */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-blue-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Total Amount Owed' : 'कुल तिर्नुपर्ने रकम'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
                {formatNepaliCurrency(totalMilkOwed)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Gross Milk Purchases' : 'दूध खरिद कुल दायित्व'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3: Total Amount Paid */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-emerald-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Total Amount Paid' : 'हालसम्म भुक्तानी गरिएको'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {formatNepaliCurrency(totalPaidOut)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Disbursed Settlements' : 'चुक्ता भएको रकम'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 4: Remaining Balance */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-amber-500 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Remaining Balance' : 'बाँकी बक्यौता दायित्व'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                {formatNepaliCurrency(totalRemainingDue)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Outstanding Due' : 'भुक्तानी गर्न बाँकी'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Operational Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setSelectedTabIndex(0)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            selectedTabIndex === 0
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>{lang === 'en' ? 'Farmer Balances & Ledger' : 'कृषक खाता तथा बाँकी हिसाब'}</span>
        </button>

        <button
          onClick={() => setSelectedTabIndex(1)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            selectedTabIndex === 1
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{lang === 'en' ? 'Payment History Log' : 'भुक्तानी इतिहास'}</span>
          {payments.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedTabIndex === 1 ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {payments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSelectedTabIndex(2)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            selectedTabIndex === 2
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{lang === 'en' ? 'Milk Deliveries & Owed' : 'दूध दाखिला तथा हिसाब'}</span>
        </button>
      </div>

      {/* 4. Tab 1 Content: Farmer Balances & Ledger */}
      {selectedTabIndex === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={lang === 'en' ? 'Search farmer by name, code, phone...' : 'कृषकको नाम, कोड वा फोन नं खोज्नुहोस्...'}
                value={farmerFilter}
                onChange={(e) => setFarmerFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'en' ? 'Showing' : 'जम्मा'} <strong className="text-slate-800 dark:text-slate-200">{milkSuppliers.length}</strong> {lang === 'en' ? 'milk suppliers' : 'कृषक आपूर्तिकर्ता'}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                <tr>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Code' : 'कोड'}</th>
                  <th className="py-3 px-4 text-left">{lang === 'en' ? 'Farmer Name' : 'कृषकको नाम'}</th>
                  <th className="py-3 px-4 text-left">{lang === 'en' ? 'Phone' : 'सम्पर्क'}</th>
                  <th className="py-3 px-4 text-left">{lang === 'en' ? 'Address' : 'ठेगाना'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Milk Supplied' : 'दूध आपूर्ति'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Total Owed' : 'कुल दायित्व'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Total Paid' : 'कुल भुक्तानी'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Remaining Balance' : 'बाँकी बक्यौता'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Actions' : 'कार्य'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 whitespace-nowrap">
                {milkSuppliers.map(f => {
                  const rem = Math.round(Number(f.milkCollectionRemainingAmount) || 0);
                  const suppliedLiters = Number(f.totalMilkQuantity || 0);
                  const owedAmount = Number(f.milkCollectionTotalAmount || 0);
                  const paidAmount = Number(f.milkCollectionTotalAmountPaid || 0);

                  return (
                    <tr
                      key={f.id}
                      onClick={() => {
                        setSelectedFarmerForHistory(f);
                        setHistoryActiveTab('all');
                      }}
                      className="hover:bg-emerald-50/50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                      title={lang === 'en' ? 'Click to view complete profile & activity history' : 'सम्पूर्ण प्रोफाइल तथा कारोबार इतिहास हेर्नुहोस्'}
                    >
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          #{f.code}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-left whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFarmerForHistory(f);
                            setHistoryActiveTab('all');
                          }}
                          className="text-left group cursor-pointer inline-flex items-center gap-1.5"
                          title={lang === 'en' ? 'Click to view complete profile & activity history' : 'सम्पूर्ण प्रोफाइल तथा कारोबार इतिहास हेर्नुहोस्'}
                        >
                          <span className="font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:underline transition">
                            {lang === 'en' ? (f.nameInEnglish || f.nameInNepali) : (f.nameInNepali || f.nameInEnglish)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 opacity-90 group-hover:opacity-100 font-bold transition">
                            {lang === 'en' ? 'Profile & History' : 'इतिहास'}
                          </span>
                        </button>
                      </td>

                      <td className="py-2.5 px-4 text-left font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {f.phone || '-'}
                      </td>

                      <td className="py-2.5 px-4 text-left text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {f.address || '-'}
                      </td>

                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {suppliedLiters.toFixed(1)} {lang === 'en' ? 'L' : 'लिटर'}
                      </td>

                      <td className="py-2.5 px-4 text-right font-mono font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap">
                        {formatNepaliCurrency(owedAmount)}
                      </td>

                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {formatNepaliCurrency(paidAmount)}
                      </td>

                      <td className="py-2.5 px-4 text-right font-extrabold whitespace-nowrap">
                        {rem > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-mono">
                            {formatNepaliCurrency(rem)} {lang === 'en' ? 'Due' : 'बाँकी'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-mono">
                            {formatNepaliCurrency(0)} {lang === 'en' ? 'Settled' : 'चुक्ता'}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPaymentModal(f, false);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs cursor-pointer"
                            title={lang === 'en' ? 'Record payment for this farmer' : 'कृषक भुक्तानी प्रविष्टि'}
                          >
                            {lang === 'en' ? 'Pay' : 'भुक्तानी'}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPrintSlip && onPrintSlip(f);
                            }}
                            className="px-2 py-1 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                            title={lang === 'en' ? 'Print account settlement slip' : 'हिसाब रसिद प्रिन्ट'}
                          >
                            <Printer className="w-3.5 h-3.5 inline mr-1" />
                            {lang === 'en' ? 'Slip' : 'रसिद'}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFarmerForHistory(f);
                              setHistoryActiveTab('all');
                            }}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-bold transition cursor-pointer"
                            title={lang === 'en' ? 'View complete activity and payment history' : 'भुक्तानी इतिहास हेर्नुहोस्'}
                          >
                            <History className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                            {lang === 'en' ? 'History' : 'इतिहास'}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFarmerForHistory(f);
                              setHistoryActiveTab('collections');
                            }}
                            className="px-2 py-1 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg text-[11px] font-medium transition cursor-pointer"
                            title={lang === 'en' ? 'View milk deliveries' : 'दूध दाखिला हेर्नुहोस्'}
                          >
                            <Milk className="w-3.5 h-3.5 inline mr-1" />
                            {lang === 'en' ? 'Milk' : 'दूध'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {milkSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      {lang === 'en' ? 'No milk suppliers found matching search criteria.' : 'कुनै कृषक आपूर्तिकर्ता भेटिएन ।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab 2 Content: Payment History Log */}
      {selectedTabIndex === 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {filterFarmerIdForPayments && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold">
                  <span>Filtered: Farmer #{farmers.find(f => f.id === filterFarmerIdForPayments)?.code || filterFarmerIdForPayments}</span>
                  <button
                    onClick={() => setFilterFarmerIdForPayments(null)}
                    className="p-0.5 hover:bg-emerald-200 rounded text-emerald-900"
                    title="Clear filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Search payment remarks, notes...' : 'भुक्तानी विवरण वा कैफियत खोज्नुहोस्...'}
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => handleOpenPaymentModal(null, false)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'en' ? 'Record Payment' : 'रकम भुक्तानी'}</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                <tr>
                  <th className="py-3 px-4 text-left">{lang === 'en' ? 'Payment Date' : 'भुक्तानी मिति'}</th>
                  <th className="py-3 px-4 text-left">{lang === 'en' ? 'Farmer' : 'कृषक'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Amount Paid' : 'भुक्तानी रकम'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Method' : 'माध्यम'}</th>
                  <th className="py-3 px-4 text-left">{lang === 'en' ? 'Remarks / Period' : 'विवरण / अवधि'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Actions' : 'कार्य'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 whitespace-nowrap">
                {filteredPayments.map(p => {
                  const f = farmers.find(fm => fm.id === p.farmerId);
                  const isAdvance = (p.remarks || '').toLowerCase().includes('advance') || (p.remarks || '').includes('पेश्की');

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        {p.dateTimeUtms ? new Date(p.dateTimeUtms).toLocaleString() : (p.createdDate || '-')}
                      </td>

                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (f) {
                              setSelectedFarmerForHistory(f);
                              setHistoryActiveTab('all');
                            }
                          }}
                          className="text-left font-bold text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer transition block"
                          title={lang === 'en' ? 'Click to view complete profile & activity history' : 'सम्पूर्ण प्रोफाइल तथा कारोबार इतिहास हेर्नुहोस्'}
                        >
                          {lang === 'en' ? (f?.nameInEnglish || f?.nameInNepali || 'Farmer') : (f?.nameInNepali || f?.nameInEnglish || 'कृषक')}
                        </button>
                        <span className="text-[10px] text-slate-400 font-mono">#{f?.code || p.farmerId}</span>
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <div className="font-extrabold text-sm text-emerald-700 dark:text-emerald-400">
                          {formatNepaliCurrency(p.amount)}
                        </div>
                        {isAdvance && (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            ⚡ {lang === 'en' ? 'Advance' : 'पेश्की'}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        {renderPaymentMethodChip(p.paymentMethod)}
                      </td>

                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {p.remarks || '-'}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onPrintPaymentSlip ? onPrintPaymentSlip(p) : onPrintSlip && onPrintSlip(f)}
                            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                            title={lang === 'en' ? 'Print slip' : 'रसिद प्रिन्ट'}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(p)}
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title={lang === 'en' ? 'Delete payment' : 'मेटाउनुहोस्'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {lang === 'en' ? 'No payment history records found.' : 'कुनै भुक्तानी इतिहास भेटिएन ।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Tab 3 Content: Milk Deliveries & Owed */}
      {selectedTabIndex === 2 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {filterFarmerIdForDeliveries && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 rounded-xl text-xs font-bold">
                  <span>Filtered: Farmer #{farmers.find(f => f.id === filterFarmerIdForDeliveries)?.code || filterFarmerIdForDeliveries}</span>
                  <button
                    onClick={() => setFilterFarmerIdForDeliveries(null)}
                    className="p-0.5 hover:bg-sky-200 rounded text-sky-900"
                    title="Clear filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Search deliveries by farmer...' : 'कृषकको नाम वा कोड खोज्नुहोस्...'}
                  value={deliverySearch}
                  onChange={(e) => setDeliverySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => onNavigate && onNavigate('milk-collection')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'en' ? 'Record Milk Delivery' : 'दूध संकलन प्रविष्टि'}</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                <tr>
                  <th className="py-3 px-4 text-left">{lang === 'en' ? 'Delivery Date' : 'दाखिला मिति'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Shift' : 'शिफ्ट'}</th>
                  <th className="py-3 px-4 text-left">{lang === 'en' ? 'Farmer' : 'कृषक'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Quantity' : 'परिमाण'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'FAT %' : 'फ्याट %'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'SNF %' : 'एस.एन.एफ. %'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Rate' : 'दर'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Total Amount' : 'कुल रकम'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 whitespace-nowrap">
                {filteredDeliveries.map(d => {
                  const f = farmers.find(fm => fm.id === (d.customerId || d.farmerId)) || d.farmer;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        {d.dateTimeUtms ? new Date(d.dateTimeUtms).toLocaleDateString() : (d.date || '-')}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.shift === 0 ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {d.shift === 0 ? (lang === 'en' ? 'Morning' : 'बिहानी') : (lang === 'en' ? 'Evening' : 'बेलुकी')}
                        </span>
                      </td>

                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (f) {
                              setSelectedFarmerForHistory(f);
                              setHistoryActiveTab('all');
                            }
                          }}
                          className="text-left font-bold text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer transition block"
                          title={lang === 'en' ? 'Click to view complete profile & activity history' : 'सम्पूर्ण प्रोफाइल तथा कारोबार इतिहास हेर्नुहोस्'}
                        >
                          {lang === 'en' ? (f?.nameInEnglish || f?.nameInNepali || 'Farmer') : (f?.nameInNepali || f?.nameInEnglish || 'कृषक')}
                        </button>
                        <span className="text-[10px] text-slate-400 font-mono">#{f?.code || d.farmerId}</span>
                      </td>

                      <td className="py-2.5 px-4 text-right font-black text-blue-700 dark:text-blue-400">
                        {Number(d.quantity || 0).toFixed(1)} {lang === 'en' ? 'L' : 'लिटर'}
                      </td>

                      <td className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300">
                        {Number(d.fat || 0).toFixed(1)} %
                      </td>

                      <td className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300">
                        {Number(d.snf || 0).toFixed(1)} %
                      </td>

                      <td className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300 font-mono">
                        {formatNepaliCurrency(d.perLiterRate || d.rate || 0)}
                      </td>

                      <td className="py-2.5 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400">
                        {formatNepaliCurrency(d.totalAmount || d.amount || 0)}
                      </td>
                    </tr>
                  );
                })}

                {filteredDeliveries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      {lang === 'en' ? 'No milk deliveries found.' : 'कुनै दूध दाखिला भेटिएन ।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Create/Update Milk Collection Payment Modal (1:1 with CreateOrUpdateMilkCollectionPayment.razor) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                  isAdvancePayment ? 'bg-amber-500' : 'bg-emerald-600'
                }`}>
                  {isAdvancePayment ? <Zap className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                    {isAdvancePayment
                      ? (lang === 'en' ? 'Record Advance Payment' : 'कृषक पेश्की भुक्तानी प्रविष्टि')
                      : (lang === 'en' ? 'Record Farmer Payment' : 'कृषक रकम भुक्तानी प्रविष्टि')}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {isAdvancePayment
                      ? (lang === 'en' ? 'Disburse advance payment to farmer' : 'कृषकलाई पेस्की भुक्तानी वितरण')
                      : (lang === 'en' ? 'Disburse milk settlement payment' : 'दूध संकलन बक्यौता रकम भुक्तानी')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Farmer Selection or Banner */}
            {selectedFarmer ? (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{lang === 'en' ? (selectedFarmer.nameInEnglish || selectedFarmer.nameInNepali) : (selectedFarmer.nameInNepali || selectedFarmer.nameInEnglish)}</span>
                      <span className="text-xs px-2 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 font-mono">#{selectedFarmer.code}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      📞 {selectedFarmer.phone || '-'} • {selectedFarmer.address || '-'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">{lang === 'en' ? 'Total Owed' : 'कुल दायित्व'}</div>
                    <div className="font-bold text-xs text-slate-700 dark:text-slate-300">{formatNepaliCurrency(selectedFarmer.milkCollectionTotalAmount || 0)}</div>
                  </div>
                  <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">{lang === 'en' ? 'Remaining Due' : 'बाँकी बक्यौता'}</div>
                    <div className="font-black text-sm text-amber-600 dark:text-amber-400">
                      {formatNepaliCurrency(selectedFarmer.milkCollectionRemainingAmount || 0)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Select Farmer' : 'कृषक छनौट गर्नुहोस्'}
                </label>
                <select
                  value={selectedFarmer?.id || ''}
                  onChange={(e) => {
                    const matched = farmers.find(f => f.id === Number(e.target.value));
                    setSelectedFarmer(matched || null);
                    if (matched && !isAdvancePayment) {
                      setAmount(String(Math.max(0, Number(matched.milkCollectionRemainingAmount) || 0)));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                >
                  <option value="">{lang === 'en' ? '-- Choose Milk Supplying Farmer --' : '-- कृषक छान्नुहोस् --'}</option>
                  {milkSuppliers.map(f => (
                    <option key={f.id} value={f.id}>
                      #{f.code} - {lang === 'en' ? (f.nameInEnglish || f.nameInNepali) : (f.nameInNepali || f.nameInEnglish)} (बाँकी: रू {Math.max(0, Number(f.milkCollectionRemainingAmount) || 0)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Amount & Pay Full Due */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'en' ? 'Payment Amount (रू)' : 'भुक्तानी रकम (रू)'}
                </label>
                {selectedFarmer && Number(selectedFarmer.milkCollectionRemainingAmount || 0) > 0 && (
                  <button
                    type="button"
                    onClick={handleSetFullDue}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 underline cursor-pointer"
                  >
                    {lang === 'en' ? 'Pay Full Due' : 'सम्पूर्ण बाँकी बक्यौता भर्नुहोस्'}
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault();
                }}
                onChange={(e) => setAmount(e.target.value.replace(/[-+eE]/g, ''))}
                className={`w-full px-3.5 py-2.5 text-base font-extrabold border rounded-xl outline-none font-mono transition-colors ${
                  isOverpayment
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 focus:ring-2 focus:ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500'
                }`}
                required
              />

              {/* Overpayment Warning Message */}
              {isOverpayment && (
                <div className="mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div className="flex-1">
                    <p className="font-bold">
                      {lang === 'en' ? 'Amount Exceeds Outstanding Balance' : 'भुक्तानी रकम बाँकी बक्यौता भन्दा बढी छ'}
                    </p>
                    <p className="text-[11px] mt-0.5 leading-relaxed">
                      {lang === 'en'
                        ? `Payment of रू ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} exceeds the outstanding due of रू ${selectedFarmerRemainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Maximum payable is रू ${selectedFarmerRemainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`
                        : `भुक्तानी रकम रू ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} बाँकी बक्यौता रू ${selectedFarmerRemainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} भन्दा बढी छ । अधिकतम भुक्तानी योग्य रकम रू ${selectedFarmerRemainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} हो ।`}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSetFullDue}
                        className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                      >
                        {lang === 'en' ? `Set to Due (रू ${selectedFarmerRemainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })})` : `बक्यौता रकम (रू ${selectedFarmerRemainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) राख्नुहोस्`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAdvancePayment(true)}
                        className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer"
                      >
                        {lang === 'en' ? 'Switch to Advance' : 'पेश्कीमा बदल्नुहोस्'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Zero Balance Notice when not Advance */}
              {selectedFarmer && selectedFarmerRemainingDue <= 0 && !isAdvancePayment && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1">
                    <p className="font-bold">
                      {lang === 'en' ? 'Account Already Settled (No Due)' : 'कुनै बक्यौता बाँकी छैन (हिसाब चुक्ता भइसकेको)'}
                    </p>
                    <p className="text-[11px] mt-0.5 leading-relaxed">
                      {lang === 'en'
                        ? 'This farmer has zero outstanding balance. Regular payments cannot be recorded. To disburse funds in advance, please enable Advance Payment.'
                        : 'यस कृषकको कुनै बक्यौता बाँकी छैन । नियमित भुक्तानी दर्ता गर्न मिल्दैन । अग्रिम रकम दिन "पेश्की भुक्तानी" सक्षम गर्नुहोस् ।'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAdvancePayment(true)}
                      className="mt-1.5 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      ⚡ {lang === 'en' ? 'Enable Advance Payment' : 'पेश्की भुक्तानी सक्षम गर्नुहोस्'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Advance Payment Toggle */}
            <div className={`p-3 rounded-2xl border transition-all ${
              isAdvancePayment
                ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
            }`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdvancePayment}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsAdvancePayment(checked);
                    if (checked) {
                      setRemarks(lang === 'en' ? 'Advance disbursement for festival/feed' : 'चाडपर्व वा दाना पेश्की भुक्तानी');
                    }
                  }}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${
                    isAdvancePayment ? 'text-amber-900 dark:text-amber-200' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {lang === 'en' ? 'Record as Advance Payment' : 'पेश्की भुक्तानीका रूपमा दर्ता गर्नुहोस्'}
                  </span>
                  {isAdvancePayment && (
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                      ⚡ ADVANCE ACTIVE
                    </span>
                  )}
                </div>
              </label>
              {isAdvancePayment && (
                <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 pl-7">
                  {lang === 'en'
                    ? 'This payment will be recorded as an advance disbursement to the farmer.'
                    : 'यो रकम कृषकलाई प्रदान गरिएको पेश्कीका रूपमा हिसाब मिलानमा दर्ता हुनेछ ।'}
                </div>
              )}
            </div>

            {/* Date/Time & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Payment Date & Time' : 'भुक्तानी मिति र समय'}
                </label>
                <input
                  type="datetime-local"
                  value={dateTimeLocal}
                  onChange={(e) => setDateTimeLocal(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Payment Method' : 'भुक्तानी माध्यम'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-semibold cursor-pointer"
                >
                  <option value={0}>{lang === 'en' ? '💵 Cash' : '💵 नगद'}</option>
                  <option value={1}>{lang === 'en' ? '🏛️ Cheque' : '🏛️ चेक'}</option>
                  <option value={2}>{lang === 'en' ? '🏦 Bank Transfer' : '🏦 बैंक ट्रान्सफर'}</option>
                  <option value={3}>{lang === 'en' ? '📱 Fonepay / QR' : '📱 क्युआर / फोनपे'}</option>
                </select>
              </div>
            </div>

            {/* Reference Number for Cheque or Bank Transfer */}
            {(paymentMethod === 1 || paymentMethod === 2) && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {paymentMethod === 1 ? (lang === 'en' ? 'Cheque Number' : 'चेक नम्बर') : (lang === 'en' ? 'Bank Transaction / Voucher #' : 'बैंक कारोबार वा भौचर नं.')}
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={paymentMethod === 1 ? 'CHQ-928371' : 'TXN-92837192'}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-bold"
                />
              </div>
            )}

            {/* Remarks & Quick Presets */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'en' ? 'Remarks / Period' : 'कैफियत / भुक्तानी अवधि'}
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setRemarks(lang === 'en' ? 'First Half of Month' : 'महिनाको पहिलो १५ दिनको हिसाब')}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    {lang === 'en' ? 'First Half' : 'पहिलो पक्ष'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemarks(lang === 'en' ? 'Second Half of Month' : 'महिनाको दोस्रो १५ दिनको हिसाब')}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    {lang === 'en' ? 'Second Half' : 'दोस्रो पक्ष'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemarks(lang === 'en' ? 'Full Settlement' : 'सम्पूर्ण बक्यौता चुक्ता हिसाब')}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    {lang === 'en' ? 'Full Settlement' : 'पूर्ण चुक्ता'}
                  </button>
                </div>
              </div>
              <input
                type="text"
                placeholder={lang === 'en' ? 'e.g. Milk collection settlement' : 'जस्तै: दूध संकलन हिसाब मिलान भुक्तानी'}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                {lang === 'en' ? 'Cancel' : 'रद्द गर्नुहोस्'}
              </button>

              <button
                type="button"
                disabled={loading || isOverpayment || (selectedFarmer && selectedFarmerRemainingDue <= 0 && !isAdvancePayment)}
                onClick={() => handleSavePayment(true)}
                className={`flex items-center gap-1.5 px-4 py-2 border font-bold rounded-xl text-xs transition ${
                  isOverpayment || (selectedFarmer && selectedFarmerRemainingDue <= 0 && !isAdvancePayment)
                    ? 'border-slate-200 dark:border-slate-700 text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
                    : 'border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'en' ? 'Save & Print Slip' : 'सुरक्षित गरी रसिद प्रिन्ट'}</span>
              </button>

              <button
                type="button"
                disabled={loading || isOverpayment || (selectedFarmer && selectedFarmerRemainingDue <= 0 && !isAdvancePayment)}
                onClick={() => handleSavePayment(false)}
                className={`px-5 py-2 font-bold rounded-xl text-xs transition shadow-md ${
                  isOverpayment || (selectedFarmer && selectedFarmerRemainingDue <= 0 && !isAdvancePayment)
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 cursor-pointer'
                }`}
              >
                {loading ? (lang === 'en' ? 'Saving...' : 'सुरक्षित गर्दै...') : (lang === 'en' ? 'Save Payment' : 'भुक्तानी सुरक्षित गर्नुहोस्')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Complete Farmer Profile & Activity History Modal */}
      <FarmerProfileModal
        isOpen={Boolean(selectedFarmerForHistory)}
        farmer={selectedFarmerForHistory ? (farmers.find(f => Number(f.id) === Number(selectedFarmerForHistory.id)) || selectedFarmerForHistory) : null}
        onClose={() => setSelectedFarmerForHistory(null)}
        defaultTab={historyActiveTab}
        initialCollections={collections}
        initialPayments={payments}
        initialAuditLogs={auditLogs}
        onOpenRecordPayment={(f) => {
          setSelectedFarmerForHistory(null);
          handleOpenPaymentModal(f, false);
        }}
        onOpenRecordMilk={() => {
          setSelectedFarmerForHistory(null);
          onNavigate && onNavigate('milk-collection');
        }}
        onPrintStatement={onPrintSlip}
        onPrintPaymentSlip={(p) => (onPrintPaymentSlip ? onPrintPaymentSlip(p) : (onPrintSlip && onPrintSlip(selectedFarmerForHistory)))}
        onPrintMilkSlip={(col) => (onPrintMilkSlip ? onPrintMilkSlip(col) : (onPrintSlip && onPrintSlip(col)))}
        onDeletePayment={handleDeletePayment}
        refreshTrigger={payments.length + collections.length + auditLogs.length}
      />
    </div>
  );
}
