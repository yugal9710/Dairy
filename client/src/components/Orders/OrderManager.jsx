import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  History,
  RotateCcw,
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock,
  MapPin,
  User,
  Package,
  X,
  CreditCard,
  DollarSign,
  Printer,
  Trash2,
  Search,
  CheckSquare
} from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';
import { preventNegativeKey, nonNegativeValue } from '../../utils/numberInput';

export default function OrderManager({
  futureOrders = [],
  customers = [],
  products = [],
  onRefresh,
  onPrintSlip
}) {
  const { lang, t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'due', 'upcoming', 'completed', 'cancelled'
  const [searchQuery, setSearchQuery] = useState('');

  // Pay Remaining Due Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingOrder, setPayingOrder] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState(0); // 0: Cash, 1: Bank
  const [payLoading, setPayLoading] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState(0); // 0: Cash, 2: Bank
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Product Picker Modal State with checkboxes
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedInPicker, setSelectedInPicker] = useState({});

  // Financial KPI calculations (exclude cancelled orders from active totals)
  const validOrders = useMemo(() => futureOrders.filter(o => !o.isDeleted && o.status !== 'Cancelled'), [futureOrders]);
  const totalOrdersCount = futureOrders.filter(o => !o.isDeleted).length;
  const activeOrdersCount = validOrders.filter(o => o.status !== 'Delivered').length;

  const totalOrderAmount = useMemo(() => {
    return validOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
  }, [validOrders]);

  const totalAmountPaid = useMemo(() => {
    return validOrders.reduce((acc, o) => acc + (Number(o.paidAmount) || 0), 0);
  }, [validOrders]);

  const totalRemainingBalance = useMemo(() => {
    return Math.max(0, totalOrderAmount - totalAmountPaid);
  }, [totalOrderAmount, totalAmountPaid]);

  const overdueDeliveriesCount = useMemo(() => {
    const now = Date.now();
    return futureOrders.filter(o => !o.isDeleted && o.status !== 'Delivered' && o.status !== 'Cancelled' && o.deliveryDateUtms < now).length;
  }, [futureOrders]);

  // Product Selection Handlers
  const handleOpenPicker = () => {
    const initial = {};
    items.forEach(it => {
      if (it.productId) {
        initial[it.productId] = {
          checked: true,
          quantity: it.quantity || 1
        };
      }
    });
    setSelectedInPicker(initial);
    setPickerSearch('');
    setPickerOpen(true);
  };

  const handleToggleProduct = (prodId) => {
    setSelectedInPicker(prev => {
      const isChecked = Boolean(prev[prodId]?.checked);
      return {
        ...prev,
        [prodId]: {
          checked: !isChecked,
          quantity: prev[prodId]?.quantity || 1
        }
      };
    });
  };

  const handlePickerQtyChange = (prodId, deltaOrVal) => {
    setSelectedInPicker(prev => {
      const currentQty = prev[prodId]?.quantity || 1;
      let newQty;
      if (typeof deltaOrVal === 'number') {
        newQty = Math.max(0.5, currentQty + deltaOrVal);
      } else {
        newQty = Math.max(0.5, Number(deltaOrVal) || 1);
      }
      return {
        ...prev,
        [prodId]: {
          checked: true,
          quantity: newQty
        }
      };
    });
  };

  const handleToggleSelectAll = (filteredProds) => {
    const allChecked = filteredProds.length > 0 && filteredProds.every(p => selectedInPicker[p.id]?.checked);
    setSelectedInPicker(prev => {
      const next = { ...prev };
      filteredProds.forEach(p => {
        next[p.id] = {
          checked: !allChecked,
          quantity: prev[p.id]?.quantity || 1
        };
      });
      return next;
    });
  };

  const handleConfirmAddSelected = () => {
    const newItems = [];
    products.forEach(p => {
      if (!p.isDeleted && selectedInPicker[p.id]?.checked) {
        const qty = selectedInPicker[p.id]?.quantity || 1;
        const price = Number(p.sellingPrice) || 0;
        newItems.push({
          productId: p.id,
          productName: lang === 'en' ? (p.nameInEnglish || p.nameInNepali) : (p.nameInNepali || p.nameInEnglish),
          unitName: p.unitName || 'Unit',
          quantity: qty,
          unitPrice: price,
          totalPrice: qty * price
        });
      }
    });

    setItems(newItems);
    setPickerOpen(false);
  };

  const filteredPickerProducts = useMemo(() => {
    return products.filter(p => {
      if (p.isDeleted) return false;
      if (!pickerSearch) return true;
      const q = pickerSearch.toLowerCase().trim();
      const ne = (p.nameInNepali || '').toLowerCase();
      const en = (p.nameInEnglish || '').toLowerCase();
      return ne.includes(q) || en.includes(q);
    });
  }, [products, pickerSearch]);

  const pickerSelectedCount = useMemo(() => {
    return Object.values(selectedInPicker).filter(v => v?.checked).length;
  }, [selectedInPicker]);

  const pickerSelectedTotal = useMemo(() => {
    let sum = 0;
    products.forEach(p => {
      if (selectedInPicker[p.id]?.checked) {
        const qty = selectedInPicker[p.id]?.quantity || 1;
        sum += qty * (Number(p.sellingPrice) || 0);
      }
    });
    return sum;
  }, [products, selectedInPicker]);

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleUpdateItemQty = (idx, delta) => {
    setItems(prev => {
      const updated = [...prev];
      const current = Number(updated[idx].quantity) || 1;
      const nextQty = Math.max(0.5, current + delta);
      updated[idx].quantity = nextQty;
      updated[idx].totalPrice = nextQty * (Number(updated[idx].unitPrice) || 0);
      return updated;
    });
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...items];
    updated[idx][field] = val;
    if (field === 'quantity') {
      const qty = Math.max(0, Number(val) || 0);
      updated[idx].totalPrice = qty * (Number(updated[idx].unitPrice) || 0);
    }
    setItems(updated);
  };

  const totalAmount = items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      alert(lang === 'en' ? 'Please select a customer.' : 'कृपया ग्राहक छान्नुहोस् ।');
      return;
    }
    if (items.length === 0 || !items.some(it => it.productId && Number(it.quantity) > 0)) {
      alert(lang === 'en' ? 'Please add at least one item to the order.' : 'कृपया अर्डरमा कम्तीमा एउटा सामान छान्नुहोस् ।');
      return;
    }

    const depositVal = Number(depositAmount) || 0;
    if (depositVal < 0) {
      alert(lang === 'en' ? 'Advance deposit cannot be negative.' : 'अग्रिम पेश्की रकम ऋणात्मक हुन सक्दैन ।');
      return;
    }
    if (depositVal > totalAmount + 0.05) {
      alert(lang === 'en' ? 'Advance deposit cannot exceed total order amount.' : 'अग्रिम पेश्की रकम कुल अर्डर रकमभन्दा बढी हुन सक्दैन ।');
      return;
    }

    setLoading(true);
    try {
      const safeDeposit = Math.min(totalAmount, depositVal);
      const cust = customers.find(c => c.id === Number(customerId));
      const res = await fetch('/api/Order/future-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: Number(customerId),
          customerName: cust ? (cust.nameInEnglish || cust.nameInNepali) : (lang === 'en' ? 'Customer' : 'ग्राहक'),
          orderDateUtms: Date.now(),
          deliveryDateUtms: new Date(deliveryDate).getTime(),
          deliveryAddress: deliveryAddress || cust?.address || '',
          totalAmount,
          paidAmount: safeDeposit,
          paymentMethod: Number(depositMethod),
          balanceAmount: Math.max(0, totalAmount - safeDeposit),
          notes,
          items: items.map(it => ({
            productId: Number(it.productId),
            productName: it.productName || 'Item',
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            totalPrice: Number(it.quantity) * Number(it.unitPrice)
          }))
        })
      });

      if (res.ok) {
        setModalOpen(false);
        setCustomerId('');
        setDeliveryAddress('');
        setDepositAmount('');
        setDepositMethod(0);
        setNotes('');
        setItems([]);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayModal = (ord) => {
    setPayingOrder(ord);
    const due = Math.max(0, (Number(ord.totalAmount) || 0) - (Number(ord.paidAmount) || 0));
    setPayAmount(String(due));
    setPayMethod(0);
    setPayModalOpen(true);
  };

  const handleConfirmPay = async (e) => {
    e.preventDefault();
    if (!payingOrder || !payAmount || Number(payAmount) <= 0) return;
    setPayLoading(true);
    try {
      const res = await fetch('/api/Order/future-order/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: payingOrder.id,
          amount: Number(payAmount),
          paymentMethod: Number(payMethod)
        })
      });
      if (res.ok) {
        setPayModalOpen(false);
        setPayingOrder(null);
        if (onRefresh) onRefresh();
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || 'Failed to record payment');
      }
    } catch (err) {
      console.error(err);
      alert('Error processing payment');
    } finally {
      setPayLoading(false);
    }
  };

  const handleDeleteOrder = async (ord) => {
    const confirmMsg = lang === 'en'
      ? `Are you sure you want to delete order ${ord.orderNumber || ord.id}?`
      : `के तपाईं अर्डर ${ord.orderNumber || ord.id} मेटाउन निश्चित हुनुहुन्छ?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/Order/future-order/${ord.id}`, { method: 'DELETE' });
      if (res.ok && onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintFutureOrderSlip = (ord) => {
    if (onPrintSlip) {
      const slipData = {
        id: ord.id,
        orderNumber: ord.orderNumber,
        customerName: ord.customerName,
        customer: customers.find(c => c.id === ord.customerId),
        creationDateTimeUtms: ord.orderDateUtms,
        deliveryDateUtms: ord.deliveryDateUtms,
        deliveryAddress: ord.deliveryAddress,
        totalAmount: ord.totalAmount,
        paidAmount: ord.paidAmount,
        totalPaid: ord.paidAmount,
        remainingAmount: ord.balanceAmount,
        discountAmount: 0,
        netAmount: ord.totalAmount,
        notes: ord.notes,
        orderProducts: (ord.items || []).map(it => ({
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice || (it.quantity * it.unitPrice)
        }))
      };
      onPrintSlip(slipData);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch('/api/Order/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus })
      });
      if (res.ok && onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">{lang === 'en' ? 'Confirmed' : 'पुष्टि भयो'}</span>;
      case 'InPreparation':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">{lang === 'en' ? 'In Prep' : 'तयारीमा'}</span>;
      case 'Dispatched':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">{lang === 'en' ? 'Dispatched' : 'पठाइयो'}</span>;
      case 'Delivered':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">{lang === 'en' ? 'Delivered' : 'डेलिभर भयो'}</span>;
      case 'Cancelled':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">{lang === 'en' ? 'Cancelled' : 'रद्द'}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{lang === 'en' ? 'Pending' : 'प्रतीक्षारत'}</span>;
    }
  };

  // Filtered orders list based on status filter and search query
  const filteredOrders = useMemo(() => {
    const now = Date.now();
    return futureOrders
      .filter(o => !o.isDeleted)
      .filter(o => {
        if (statusFilter === 'due') {
          return (o.status !== 'Delivered' && o.status !== 'Cancelled') && (o.deliveryDateUtms <= now + 86400000);
        }
        if (statusFilter === 'upcoming') {
          return (o.status !== 'Delivered' && o.status !== 'Cancelled') && (o.deliveryDateUtms > now + 86400000);
        }
        if (statusFilter === 'completed') {
          return o.status === 'Delivered';
        }
        if (statusFilter === 'cancelled') {
          return o.status === 'Cancelled';
        }
        return true;
      })
      .filter(o => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase().trim();
        const num = (o.orderNumber || '').toLowerCase();
        const cust = (o.customerName || '').toLowerCase();
        const addr = (o.deliveryAddress || '').toLowerCase();
        return num.includes(q) || cust.includes(q) || addr.includes(q);
      });
  }, [futureOrders, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">
              {lang === 'en' ? 'Product Orders & Scheduled Deliveries' : 'उत्पादन अर्डर तथा निर्धारित डेलिभरी'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'en'
                ? 'Manage customer pre-orders, scheduled deliveries, in-store pickups, partial fulfillment, payments, and audit history.'
                : 'ग्राहकको अग्रिम अर्डर, तोकिएको डेलिभरी मिति, पेश्की भुक्तानी तथा डेलिभरी अवस्था व्यवस्थापन'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{lang === 'en' ? 'Refresh' : 'ताजा'}</span>
          </button>

          <button
            onClick={() => {
              setCustomerId('');
              setDeliveryAddress('');
              setDepositAmount('');
              setNotes('');
              setItems([]);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'en' ? 'New Product Order' : 'नयाँ उत्पादन अर्डर'}</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Orders */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {lang === 'en' ? 'Total Orders' : 'कुल अर्डर'}
          </span>
          <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {totalOrdersCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {activeOrdersCount} {lang === 'en' ? 'active orders' : 'सक्रिय अर्डर'}
          </span>
        </div>

        {/* KPI 2: Total Order Value */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
            {lang === 'en' ? 'Total Order Value' : 'कुल अर्डर रकम'}
          </span>
          <div className="text-xl font-black text-sky-700 dark:text-sky-400 mt-1">
            {formatNepaliCurrency(totalOrderAmount)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {lang === 'en' ? 'All scheduled orders' : 'सम्पूर्ण अर्डरको रकम'}
          </span>
        </div>

        {/* KPI 3: Amount Paid */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            {lang === 'en' ? 'Amount Paid' : 'प्राप्त रकम'}
          </span>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {formatNepaliCurrency(totalAmountPaid)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {lang === 'en' ? 'Advance deposits' : 'अग्रिम पेश्की रकम'}
          </span>
        </div>

        {/* KPI 4: Remaining Balance Due */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            {lang === 'en' ? 'Balance Due' : 'बाँकी बक्यौता'}
          </span>
          <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">
            {formatNepaliCurrency(totalRemainingBalance)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {lang === 'en' ? 'Outstanding receivables' : 'उठाउन बाँकी रकम'}
          </span>
        </div>

        {/* KPI 5: Pending & Overdue */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
            {lang === 'en' ? 'Overdue Deliveries' : 'म्याद नाघेको'}
          </span>
          <div className="text-xl font-black text-rose-700 dark:text-rose-400 mt-1">
            {overdueDeliveriesCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {lang === 'en' ? 'Action required' : 'तुरुन्त डेलिभर गर्नुपर्ने'}
          </span>
        </div>
      </div>

      {/* 3. Status Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {lang === 'en' ? 'All Orders' : 'सबै अर्डर'} ({futureOrders.filter(o => !o.isDeleted).length})
          </button>

          <button
            onClick={() => setStatusFilter('due')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'due'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {lang === 'en' ? 'Due Today & Overdue' : 'आज र म्याद नाघेको'}
          </button>

          <button
            onClick={() => setStatusFilter('upcoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'upcoming'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {lang === 'en' ? 'Upcoming Deliveries' : 'आगामी डेलिभरी'}
          </button>

          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {lang === 'en' ? 'Delivered' : 'सम्पन्न भइसकेको'}
          </button>

          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'cancelled'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {lang === 'en' ? 'Cancelled' : 'रद्द'}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={lang === 'en' ? 'Search order, customer...' : 'अर्डर वा ग्राहक खोज्नुहोस्...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
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
      </div>

      {/* 4. Orders Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">{lang === 'en' ? 'Order #' : 'अर्डर नं.'}</th>
                <th className="py-3 px-4 whitespace-nowrap">{lang === 'en' ? 'Customer' : 'ग्राहक'}</th>
                <th className="py-3 px-4 whitespace-nowrap">{lang === 'en' ? 'Delivery Date' : 'डेलिभरी मिति'}</th>
                <th className="py-3 px-4 whitespace-nowrap">{lang === 'en' ? 'Address' : 'ठेगाना'}</th>
                <th className="py-3 px-4 whitespace-nowrap">{lang === 'en' ? 'Ordered Items' : 'सामानहरू'}</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">{lang === 'en' ? 'Status' : 'अवस्था'}</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">{lang === 'en' ? 'Total' : 'कुल रकम'}</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">{lang === 'en' ? 'Paid' : 'प्राप्त रकम'}</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">{lang === 'en' ? 'Due' : 'बाँकी'}</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">{lang === 'en' ? 'Actions' : 'कार्य'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.map(ord => {
                const total = Number(ord.totalAmount || 0);
                const paid = Number(ord.paidAmount || 0);
                const due = Math.max(0, total - paid);
                const isOverdue = ord.status !== 'Delivered' && ord.status !== 'Cancelled' && ord.deliveryDateUtms < Date.now();

                return (
                  <tr key={ord.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                      {ord.orderNumber || `#ORD-${ord.id}`}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{ord.customerName}</div>
                      <span className="text-[10px] text-slate-400 font-mono">#{ord.customerId}</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono text-slate-700 dark:text-slate-300">
                        {new Date(ord.deliveryDateUtms).toLocaleDateString()}
                      </div>
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{lang === 'en' ? 'Overdue' : 'म्याद नाघेको'}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                      {ord.deliveryAddress || '-'}
                    </td>

                    <td className="py-3 px-4 min-w-[130px]">
                      <div className="space-y-0.5">
                        {(ord.items || []).map((it, idx) => (
                          <div key={idx} className="text-[11px] text-slate-700 dark:text-slate-300">
                            <strong>{it.productName}:</strong> {it.quantity}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(ord.status)}
                    </td>

                    <td className="py-3 px-4 text-right font-black text-slate-800 dark:text-slate-100 font-mono whitespace-nowrap">
                      {formatNepaliCurrency(total)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400 font-mono whitespace-nowrap">
                      {formatNepaliCurrency(paid)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold font-mono whitespace-nowrap">
                      {due > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          {formatNepaliCurrency(due)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {formatNepaliCurrency(0)}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <select
                          value={ord.status}
                          onChange={(e) => handleUpdateStatus(ord.id, e.target.value)}
                          className="px-2 py-1 text-[11px] font-bold border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                        >
                          <option value="Pending">{lang === 'en' ? 'Pending' : 'प्रतीक्षारत'}</option>
                          <option value="Confirmed">{lang === 'en' ? 'Confirmed' : 'पुष्टि भयो'}</option>
                          <option value="InPreparation">{lang === 'en' ? 'In Prep' : 'तयारीमा'}</option>
                          <option value="Dispatched">{lang === 'en' ? 'Dispatched' : 'पठाइयो'}</option>
                          <option value="Delivered">{lang === 'en' ? 'Delivered' : 'डेलिभर भयो'}</option>
                          <option value="Cancelled">{lang === 'en' ? 'Cancelled' : 'रद्द'}</option>
                        </select>

                        {due > 0 && ord.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleOpenPayModal(ord)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-[11px] font-bold cursor-pointer transition"
                            title={lang === 'en' ? 'Pay Due Balance' : 'बाँकी रकम भुक्तानी'}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{lang === 'en' ? 'Pay' : 'तिर्नुहोस्'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handlePrintFutureOrderSlip(ord)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition"
                          title={lang === 'en' ? 'Print Slip' : 'रसिद छाप्नुहोस्'}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedOrder(ord);
                            setHistoryModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer transition"
                          title={lang === 'en' ? 'View Change History' : 'इतिहास हेर्नुहोस्'}
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteOrder(ord)}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer transition"
                          title={lang === 'en' ? 'Delete Order' : 'अर्डर मेटाउनुहोस्'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    {lang === 'en' ? 'No orders found matching filter criteria.' : 'कुनै अर्डर भेटिएन ।'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Create New Product Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {lang === 'en' ? 'Create Future Order' : 'नयाँ अग्रिम उत्पादन अर्डर'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Select Customer' : 'ग्राहक छनौट'}
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => {
                      setCustomerId(e.target.value);
                      const matched = customers.find(c => c.id === Number(e.target.value));
                      if (matched && matched.address) setDeliveryAddress(matched.address);
                    }}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">{lang === 'en' ? '-- Select Customer --' : '-- ग्राहक छान्नुहोस् --'}</option>
                    {customers.filter(c => !c.isDeleted).map(c => (
                      <option key={c.id} value={c.id}>
                        #{c.code} - {lang === 'en' ? (c.nameInEnglish || c.nameInNepali) : (c.nameInNepali || c.nameInEnglish)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Scheduled Delivery Date & Time' : 'डेलिभरी मिति र समय'}
                  </label>
                  <input
                    type="datetime-local"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Delivery Address' : 'डेलिभरी ठेगाना'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hotel Heritage, Pokhara"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Order Items List */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {lang === 'en' ? 'Order Products' : 'अर्डर गरिएका उत्पादनहरू'}
                    </span>
                    {items.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                        {items.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenPicker}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{items.length > 0 ? (lang === 'en' ? 'Add / Edit Items' : 'सामान थप्नुहोस् / मिलाउनुहोस्') : (lang === 'en' ? 'Add Item' : 'सामान थप्नुहोस्')}</span>
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/20">
                    <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {lang === 'en' ? 'No products selected yet.' : 'हालसम्म कुनै उत्पादन छानिएको छैन ।'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {lang === 'en' ? 'Click "Add Item" to select products with checkboxes' : '"सामान थप्नुहोस्" मा क्लिक गरी चेकबक्सबाट उत्पादनहरू छान्नुहोस्'}
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenPicker}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Select Products' : 'उत्पादनहरू छान्नुहोस्'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                      <div className="col-span-6">{lang === 'en' ? 'Product' : 'उत्पादन'}</div>
                      <div className="col-span-3 text-center">{lang === 'en' ? 'Quantity' : 'परिमाण'}</div>
                      <div className="col-span-2 text-right">{lang === 'en' ? 'Total' : 'जम्मा'}</div>
                      <div className="col-span-1 text-center"></div>
                    </div>
                    {items.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="col-span-6">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {it.productName}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatNepaliCurrency(it.unitPrice)} / {it.unitName || 'Unit'}
                          </span>
                        </div>

                        <div className="col-span-3 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={it.quantity}
                            onKeyDown={preventNegativeKey}
                            onChange={(e) => handleItemChange(idx, 'quantity', nonNegativeValue(e.target.value))}
                            className="w-14 px-1 py-0.5 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg text-center font-bold font-mono outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, 1)}
                            className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <div className="col-span-2 text-right font-mono font-black text-xs text-blue-700 dark:text-blue-400 whitespace-nowrap">
                          {formatNepaliCurrency((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}
                        </div>

                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition"
                            title={lang === 'en' ? 'Remove' : 'हटाउनुहोस्'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Summary inside Modal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-bold">{lang === 'en' ? 'Total Order Amount:' : 'जम्मा अर्डर रकम:'}</span>
                  <div className="text-lg font-black text-blue-700 dark:text-blue-400 font-mono">
                    {formatNepaliCurrency(totalAmount)}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Advance Deposit Paid (रू)' : 'अग्रिम पेश्की रकम (रू)'}
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max={totalAmount}
                      placeholder="0.00"
                      value={depositAmount}
                      onKeyDown={preventNegativeKey}
                      onChange={(e) => setDepositAmount(nonNegativeValue(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-mono"
                    />
                    <select
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(Number(e.target.value))}
                      className="px-2 py-1.5 text-[11px] border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl font-bold outline-none"
                    >
                      <option value={0}>{lang === 'en' ? 'Cash' : 'नगद'}</option>
                      <option value={2}>{lang === 'en' ? 'Bank' : 'बैंक'}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Notes / Special Instructions' : 'विशेष निर्देशन / कैफियत'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. Deliver before 7 AM' : 'जस्तै: बिहान ७ बजे अघि पुर्याउनु पर्ने'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {lang === 'en' ? 'Cancel' : 'रद्द'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20"
                >
                  {loading ? (lang === 'en' ? 'Creating...' : 'सिर्जना गर्दै...') : (lang === 'en' ? 'Create Order' : 'अर्डर सिर्जना गर्नुहोस्')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5b. Product Picker Modal with Checkboxes */}
      {pickerOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickerOpen(false);
          }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                    {lang === 'en' ? 'Select Products' : 'उत्पादनहरू छान्नुहोस्'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'en' ? 'Check the items you want to add to this order' : 'यो अर्डरमा थप्न चाहनुहुने सामानहरू छान्नुहोस्'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Select All */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Search available products...' : 'उत्पादन खोज्नुहोस्...'}
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                />
                {pickerSearch && (
                  <button
                    type="button"
                    onClick={() => setPickerSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleToggleSelectAll(filteredPickerProducts)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition"
              >
                {filteredPickerProducts.length > 0 && filteredPickerProducts.every(p => selectedInPicker[p.id]?.checked)
                  ? (lang === 'en' ? 'Deselect All' : 'सबै हटाउनुहोस्')
                  : (lang === 'en' ? 'Select All' : 'सबै छान्नुहोस्')}
              </button>
            </div>

            {/* Available Products List with Checkboxes */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-72">
              {filteredPickerProducts.map(p => {
                const isChecked = Boolean(selectedInPicker[p.id]?.checked);
                const qty = selectedInPicker[p.id]?.quantity || 1;
                const pName = lang === 'en' ? (p.nameInEnglish || p.nameInNepali) : (p.nameInNepali || p.nameInEnglish);

                return (
                  <div
                    key={p.id}
                    onClick={() => handleToggleProduct(p.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer select-none ${
                      isChecked
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-xs'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-100">
                          {pName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {formatNepaliCurrency(p.sellingPrice)} / {p.unitName || 'Unit'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {isChecked ? (
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-blue-200 dark:border-blue-800">
                          <button
                            type="button"
                            onClick={() => handlePickerQtyChange(p.id, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={qty}
                            onKeyDown={preventNegativeKey}
                            onChange={(e) => handlePickerQtyChange(p.id, nonNegativeValue(e.target.value))}
                            className="w-12 text-center text-xs font-bold bg-transparent dark:text-white outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handlePickerQtyChange(p.id, 1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-black text-slate-600 dark:text-slate-300 font-mono">
                          {formatNepaliCurrency(p.sellingPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredPickerProducts.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  {lang === 'en' ? 'No products found.' : 'कुनै उत्पादन भेटिएन ।'}
                </div>
              )}
            </div>

            {/* Footer Summary & Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {pickerSelectedCount} {lang === 'en' ? 'items selected' : 'सामान छानियो'}
                </span>
                {pickerSelectedCount > 0 && (
                  <span className="text-blue-600 dark:text-blue-400 font-bold ml-1.5 font-mono">
                    ({formatNepaliCurrency(pickerSelectedTotal)})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : 'रद्द'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddSelected}
                  disabled={pickerSelectedCount === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'en'
                      ? `Add to Order (${pickerSelectedCount})`
                      : `अर्डरमा थप्नुहोस् (${pickerSelectedCount})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Order History & Audit Modal */}
      {historyModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {lang === 'en' ? 'Order History & Audit Log' : 'अर्डर विवरण तथा परिवर्तन इतिहास'}
                </h3>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{lang === 'en' ? 'Order Number:' : 'अर्डर नम्बर:'}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedOrder.orderNumber || `#${selectedOrder.id}`}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{lang === 'en' ? 'Customer:' : 'ग्राहक:'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedOrder.customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{lang === 'en' ? 'Delivery Date:' : 'डेलिभरी मिति:'}</span>
                <span className="font-mono">{new Date(selectedOrder.deliveryDateUtms).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{lang === 'en' ? 'Delivery Address:' : 'ठेगाना:'}</span>
                <span>{selectedOrder.deliveryAddress || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{lang === 'en' ? 'Total Amount:' : 'कुल रकम:'}</span>
                <span className="font-bold text-blue-700">{formatNepaliCurrency(selectedOrder.totalAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{lang === 'en' ? 'Advance Paid:' : 'पेश्की रकम:'}</span>
                <span className="font-bold text-emerald-700">{formatNepaliCurrency(selectedOrder.paidAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{lang === 'en' ? 'Balance Due:' : 'बाँकी बक्यौता:'}</span>
                <span className="font-bold text-amber-700">
                  {formatNepaliCurrency(Math.max(0, (Number(selectedOrder.totalAmount) || 0) - (Number(selectedOrder.paidAmount) || 0)))}
                </span>
              </div>
              {selectedOrder.notes && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">{lang === 'en' ? 'Notes:' : 'कैफियत:'}</span>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}

              {/* Audit Changelogs */}
              {selectedOrder.changeLogs && selectedOrder.changeLogs.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    {lang === 'en' ? 'Activity Log' : 'गतिविधि विवरण'}
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedOrder.changeLogs.map((log, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-[11px] border border-slate-150 dark:border-slate-700">
                        <div className="flex justify-between text-slate-400">
                          <span>{log.action}</span>
                          <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        {log.details && <div className="text-slate-700 dark:text-slate-300 font-medium mt-0.5">{log.details}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                {lang === 'en' ? 'Close' : 'बन्द'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Pay Remaining Balance Modal */}
      {payModalOpen && payingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {lang === 'en' ? 'Record Order Payment' : 'अर्डर भुक्तानी प्रविष्टि'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setPayModalOpen(false);
                  setPayingOrder(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{lang === 'en' ? 'Order Number:' : 'अर्डर नम्बर:'}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{payingOrder.orderNumber || `#${payingOrder.id}`}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{lang === 'en' ? 'Customer:' : 'ग्राहक:'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{payingOrder.customerName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{lang === 'en' ? 'Total Order Amount:' : 'कुल अर्डर रकम:'}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatNepaliCurrency(payingOrder.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{lang === 'en' ? 'Already Paid:' : 'पहिले तिरिएको:'}</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{formatNepaliCurrency(payingOrder.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-emerald-200 dark:border-emerald-800">
                <span className="font-bold text-amber-700 dark:text-amber-400">{lang === 'en' ? 'Outstanding Due:' : 'बाँकी उठाउनुपर्ने रकम:'}</span>
                <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                  {formatNepaliCurrency(Math.max(0, (Number(payingOrder.totalAmount) || 0) - (Number(payingOrder.paidAmount) || 0)))}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Payment Amount (रू)' : 'भुक्तानी रकम (रू)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={Math.max(0, (Number(payingOrder.totalAmount) || 0) - (Number(payingOrder.paidAmount) || 0))}
                  value={payAmount}
                  onKeyDown={preventNegativeKey}
                  onChange={(e) => setPayAmount(nonNegativeValue(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Payment Method' : 'भुक्तानी माध्यम'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod(0)}
                    className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      payMethod === 0
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {lang === 'en' ? 'Cash' : 'नगद'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod(1)}
                    className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      payMethod === 1
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {lang === 'en' ? 'Bank / Fonepay' : 'बैंक / फोनपे'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setPayModalOpen(false);
                    setPayingOrder(null);
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : 'रद्द'}
                </button>
                <button
                  type="submit"
                  disabled={payLoading || !payAmount || Number(payAmount) <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {payLoading
                    ? (lang === 'en' ? 'Processing...' : 'प्रक्रिया गर्दै...')
                    : (lang === 'en' ? 'Confirm Payment' : 'भुक्तानी स्वीकार्नुहोस्')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
