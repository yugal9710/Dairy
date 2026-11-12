import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  Search,
  User,
  CreditCard,
  QrCode,
  DollarSign,
  ArrowRight,
  Package,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Receipt,
  UserPlus,
  X
} from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';
import { preventNegativeKey, nonNegativeValue } from '../../utils/numberInput';

export default function InstantSalePOS({
  products = [],
  inventorySummary = [],
  customers = [],
  orders = [],
  onRefresh,
  onPrintReceipt
}) {
  const { lang, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState('pos'); // 'pos' or 'history'

  // POS Cart State
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [saleDateTime, setSaleDateTime] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [paidAmount, setPaidAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(0); // 0: Cash, 2: Bank / Fonepay
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Quick Customer Modal
  const [quickCustModalOpen, setQuickCustModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustType, setNewCustType] = useState(2); // 2: Buyer / Customer
  const [savingCust, setSavingCust] = useState(false);

  // Cart operations
  const handleAddToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      const inv = inventorySummary.find(s => s.productId === product.id);
      const stock = inv ? Number(inv.currentStock || 0) : Number(product.currentStock || 0);

      return [
        ...prev,
        {
          productId: product.id,
          productName: lang === 'en' ? (product.nameInEnglish || product.nameInNepali) : (product.nameInNepali || product.nameInEnglish),
          unitName: product.unitName || 'Unit',
          unitPrice: Number(product.sellingPrice) || 0,
          quantity: 1,
          totalPrice: Number(product.sellingPrice) || 0,
          inStock: stock
        }
      ];
    });
  };

  const handleUpdateQuantity = (productId, newQty) => {
    const qty = Number(newQty);
    if (isNaN(qty) || qty <= 0) return;
    setCart(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, quantity: qty, totalPrice: Number((qty * item.unitPrice).toFixed(2)) }
          : item
      )
    );
  };

  const handleUpdatePrice = (productId, newPrice) => {
    const pr = Number(newPrice);
    if (isNaN(pr) || pr < 0) return;
    setCart(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, unitPrice: pr, totalPrice: Number((item.quantity * pr).toFixed(2)) }
          : item
      )
    );
  };

  const handleStepQuantity = (productId, delta) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.productId === productId) {
            const nextQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: nextQty, totalPrice: Number((nextQty * item.unitPrice).toFixed(2)) };
          }
          return item;
        })
        .filter(item => item.quantity > 0)
    );
  };

  const handleRemoveFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setPaidAmount('');
    setDiscountAmount('');
    setRemarks('');
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cart]);

  const discount = Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
  const grandTotal = Math.max(0, subtotal - discount);
  const totalQuantityCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const enteredPaid = paidAmount !== '' ? Math.max(0, Number(paidAmount) || 0) : grandTotal;
  const settledPaid = Math.min(grandTotal, enteredPaid);
  const balanceDue = Math.max(0, grandTotal - settledPaid);
  const changeReturn = Math.max(0, enteredPaid - grandTotal);

  // Quick Pay helper buttons
  const handleSetPaidFull = () => {
    setPaidAmount(String(grandTotal));
  };

  const handleSetPaidZero = () => {
    setPaidAmount('0');
  };

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find(c => c.id === Number(selectedCustomerId));
  }, [customers, selectedCustomerId]);

  // Complete Sale
  const handleCompleteSale = async (printSlip = true) => {
    if (cart.length === 0) {
      alert(lang === 'en' ? 'Please add at least one item to cart.' : 'कृपया बिक्री गर्न कम्तीमा एउटा सामान छान्नुहोस् ।');
      return;
    }
    if (Number(discountAmount) < 0 || Number(paidAmount) < 0) {
      alert(lang === 'en' ? 'Discount and paid amount cannot be negative.' : 'छुट र प्राप्त रकम ऋणात्मक हुन सक्दैन ।');
      return;
    }

    setLoading(true);
    try {
      const orderTs = new Date(saleDateTime).getTime() || Date.now();
      const payload = {
        CustomerId: selectedCustomerId ? Number(selectedCustomerId) : null,
        PaymentMethod: balanceDue > 0 && settledPaid === 0 ? 3 : Number(paymentMethod),
        DiscountAmount: discount,
        PaidAmount: settledPaid,
        TotalAmount: grandTotal,
        Remarks: remarks || (lang === 'en' ? 'Counter POS Sale' : 'काउन्टर खुद्रा बिक्री'),
        OrderDateTimeUtms: orderTs,
        OrderDateUtms: orderTs,
        OrderProducts: cart.map(item => ({
          ProductId: item.productId,
          Quantity: item.quantity,
          UnitPrice: item.unitPrice
        }))
      };

      const res = await fetch('/api/Order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const orderData = await res.json().catch(() => null);
        handleClearCart();
        setSelectedCustomerId('');

        if (onRefresh) onRefresh();
        if (printSlip && onPrintReceipt) {
          onPrintReceipt(orderData || { ...payload, id: `POS-${Date.now().toString().slice(-4)}`, customer: selectedCustomer });
        }
      } else {
        alert(lang === 'en' ? 'Failed to complete sale.' : 'बिक्री दर्ता गर्न सकिएन ।');
      }
    } catch (err) {
      console.error(err);
      alert(lang === 'en' ? 'Error completing sale.' : 'बिक्री सम्पन्न गर्दा त्रुटि भयो ।');
    } finally {
      setLoading(false);
    }
  };

  // Quick Customer Creation
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    setSavingCust(true);
    try {
      const res = await fetch('/api/Customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameInEnglish: newCustName,
          nameInNepali: newCustName,
          phone: newCustPhone,
          address: newCustAddress,
          customerType: Number(newCustType)
        })
      });

      if (res.ok) {
        const created = await res.json();
        setQuickCustModalOpen(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustAddress('');
        if (created?.id) setSelectedCustomerId(String(created.id));
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingCust(false);
    }
  };

  // Available units for quick filter pills
  const availableUnits = useMemo(() => {
    const set = new Set();
    products.filter(p => !p.isDeleted && p.unitName).forEach(p => set.add(p.unitName));
    return Array.from(set);
  }, [products]);

  // Filter products for catalog
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => !p.isDeleted)
      .filter(p => unitFilter === 'all' || (p.unitName || '') === unitFilter)
      .filter(p => {
        if (!searchProductQuery) return true;
        const q = searchProductQuery.toLowerCase().trim();
        const nepali = (p.nameInNepali || '').toLowerCase();
        const english = (p.nameInEnglish || '').toLowerCase();
        const unit = (p.unitName || '').toLowerCase();
        return nepali.includes(q) || english.includes(q) || unit.includes(q);
      });
  }, [products, searchProductQuery, unitFilter]);

  // Filter past orders for History
  const filteredHistory = useMemo(() => {
    return orders
      .filter(o => !o.isDeleted)
      .filter(o => {
        if (!historySearchQuery) return true;
        const q = historySearchQuery.toLowerCase().trim();
        const inv = String(o.orderNumber || o.id || '').toLowerCase();
        const cName = (o.customer?.nameInNepali || o.customer?.nameInEnglish || o.customerName || '').toLowerCase();
        return inv.includes(q) || cName.includes(q);
      });
  }, [orders, historySearchQuery]);

  return (
    <div className="space-y-4">
      {/* 1. Sleek Top POS Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-sky-500/25">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 leading-tight">
                {lang === 'en' ? 'Dairy Sales & POS Counter' : 'काउन्टर खुद्रा तथा थोक बिक्री'}
              </h2>
              {activeSubTab === 'pos' && cart.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {cart.length} {lang === 'en' ? 'in bill' : 'बिलमा'} · {formatNepaliCurrency(grandTotal)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'en'
                ? 'Fast split-screen retail billing, stock check & instant receipt'
                : 'छिटो काउन्टर बिलिङ, मौज्दात जाँच तथा तत्काल रसिद प्रणाली'}
            </p>
          </div>
        </div>

        {/* Mode Pill Switcher & Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveSubTab('pos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'pos'
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'POS Counter' : 'बिक्री काउन्टर'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'history'
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Sales History' : 'बिक्री इतिहास'}</span>
              {orders.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  {orders.length}
                </span>
              )}
            </button>
          </div>

          {activeSubTab === 'pos' && cart.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              className="flex items-center gap-1 px-3 py-1.5 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Reset Bill' : 'रद्द गर्नुहोस्'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setQuickCustModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'New Customer' : 'नयाँ ग्राहक'}</span>
          </button>
        </div>
      </div>

      {/* 2. Split-Screen Register Layout */}
      {activeSubTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* LEFT PANEL (7 cols): Quick Product Catalog */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3.5">
            {/* Catalog Toolbar: Search & Unit Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-sky-600 shrink-0" />
                <strong className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  {lang === 'en' ? 'Product Catalog' : 'दुग्ध उत्पादन क्याटलग'}
                </strong>
                <span className="text-[11px] font-bold text-slate-400">
                  ({filteredProducts.length})
                </span>
              </div>

              <div className="relative sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Search product or unit...' : 'उत्पादन खोज्नुहोस्...'}
                  value={searchProductQuery}
                  onChange={(e) => setSearchProductQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                />
                {searchProductQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchProductQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Unit Quick Filter Pills */}
            {availableUnits.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap pb-1 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUnitFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    unitFilter === 'all'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {lang === 'en' ? 'All Items' : 'सबै सामान'}
                </button>
                {availableUnits.map(unit => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setUnitFilter(unit)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      unitFilter === unit
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            )}

            {/* Clean, Full-Name Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-0.5">
              {filteredProducts.map(p => {
                const inCartItem = cart.find(c => c.productId === p.id);
                const inv = inventorySummary.find(s => s.productId === p.id);
                const stock = inv ? Number(inv.currentStock || 0) : Number(p.currentStock || 0);
                const pName = lang === 'en' ? (p.nameInEnglish || p.nameInNepali) : (p.nameInNepali || p.nameInEnglish);
                const subName = lang === 'en' ? p.nameInNepali : p.nameInEnglish;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAddToCart(p);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                      inCartItem
                        ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/35 shadow-sm shadow-sky-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 hover:border-sky-300 dark:hover:border-sky-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xs'
                    }`}
                  >
                    {/* Top Row: Stock status & Unit */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        stock <= 0
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : stock <= 10
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          stock <= 0 ? 'bg-rose-500' : stock <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        {stock.toFixed(1)} {p.unitName || ''}
                      </span>

                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold">
                        {p.unitName || 'Unit'}
                      </span>
                    </div>

                    {/* Product Name (Full Readable, 2-line wrap, no awkward ellipsis) */}
                    <div>
                      <div className="font-extrabold text-[13px] text-slate-800 dark:text-slate-100 leading-snug">
                        {pName}
                      </div>
                      {subName && subName !== pName && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {subName}
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Price & Inline Stepper or Quick Add */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/60">
                      <div className="font-black text-sm text-sky-700 dark:text-sky-400 font-mono">
                        {formatNepaliCurrency(p.sellingPrice || 0)}
                      </div>

                      {inCartItem ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 rounded-xl p-0.5 shadow-2xs"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (inCartItem.quantity <= 1) {
                                handleRemoveFromCart(p.id);
                              } else {
                                handleStepQuantity(p.id, -1);
                              }
                            }}
                            className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-1.5 text-xs font-black text-sky-700 dark:text-sky-300 font-mono min-w-[20px] text-center">
                            {inCartItem.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(p.id, 1)}
                            className="w-6 h-6 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-black flex items-center justify-center text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800 text-[11px] font-bold">
                          <Plus className="w-3 h-3" />
                          {lang === 'en' ? 'Add' : 'थप्नुहोस्'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-xs text-slate-400">
                  {lang === 'en' ? 'No matching products found.' : 'कुनै उत्पादन भेटिएन ।'}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL (5 cols): Active Register — Customer + Bill Items + Payment & Checkout */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col">
            {/* 2A. Customer & Date Compact Header */}
            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-600" />
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    {lang === 'en' ? 'Customer & Time' : 'ग्राहक र समय'}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  {selectedCustomer
                    ? (selectedCustomer.customerType === 1
                        ? (lang === 'en' ? 'Farmer' : 'कृषक')
                        : selectedCustomer.customerType === 2
                        ? (lang === 'en' ? 'Customer' : 'ग्राहक')
                        : (lang === 'en' ? 'Farmer & Buyer' : 'दुवै'))
                    : (lang === 'en' ? 'Walk-in Sale' : 'काउन्टर ग्राहक')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-7 flex gap-1.5">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-sky-500 outline-none font-semibold"
                  >
                    <option value="">{lang === 'en' ? 'Walk-in Customer (Cash)' : 'काउन्टर ग्राहक (नगद)'}</option>
                    {customers.filter(c => !c.isDeleted).map(c => (
                      <option key={c.id} value={c.id}>
                        #{c.code} - {lang === 'en' ? (c.nameInEnglish || c.nameInNepali) : (c.nameInNepali || c.nameInEnglish)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <input
                    type="datetime-local"
                    value={saleDateTime}
                    onChange={(e) => setSaleDateTime(e.target.value)}
                    className="w-full px-2 py-1.5 text-[11px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-sky-500 outline-none font-mono"
                  />
                </div>
              </div>

              {selectedCustomer && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">
                    #{selectedCustomer.code} {selectedCustomer.phone ? `· ${selectedCustomer.phone}` : ''}
                  </span>
                  <span className={`font-black font-mono ${
                    Number(selectedCustomer.customerType === 2 ? selectedCustomer.outstandingBalance : selectedCustomer.milkCollectionRemainingAmount || 0) > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {selectedCustomer.customerType === 2 ? (lang === 'en' ? 'Rec:' : 'बाँकी:') : (lang === 'en' ? 'Bal:' : 'बक्यौता:')}{' '}
                    {formatNepaliCurrency(selectedCustomer.customerType === 2 ? (selectedCustomer.outstandingBalance || 0) : (selectedCustomer.milkCollectionRemainingAmount || 0))}
                  </span>
                </div>
              )}
            </div>

            {/* 2B. Active Bill Items List */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    {lang === 'en' ? 'Bill Items' : 'बिल सामानहरू'}
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                    {cart.length}
                  </span>
                </div>

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
                  >
                    {lang === 'en' ? 'Clear All' : 'सबै हटाउनुहोस्'}
                  </button>
                )}
              </div>

              {cart.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div
                      key={item.productId}
                      className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs text-slate-800 dark:text-slate-100 leading-tight">
                            {item.productName}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {lang === 'en' ? 'Stock:' : 'मौज्दात:'} {item.inStock?.toFixed(1)} {item.unitName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-xs text-sky-700 dark:text-sky-400 font-mono">
                            {formatNepaliCurrency(item.totalPrice)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.productId)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition"
                            title={lang === 'en' ? 'Remove item' : 'हटाउनुहोस्'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-semibold">{lang === 'en' ? 'Rate:' : 'दर:'}</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.unitPrice}
                            onKeyDown={preventNegativeKey}
                            onChange={(e) => handleUpdatePrice(item.productId, nonNegativeValue(e.target.value))}
                            className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-right rounded-lg font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(item.productId, -1)}
                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.5"
                            min="0.1"
                            value={item.quantity}
                            onKeyDown={preventNegativeKey}
                            onChange={(e) => handleUpdateQuantity(item.productId, nonNegativeValue(e.target.value))}
                            className="w-12 px-1 py-0.5 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-center rounded-lg font-bold font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-sky-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(item.productId, 1)}
                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold cursor-pointer"
                          >
                            +
                          </button>
                          <span className="text-[10px] text-slate-400 font-semibold ml-0.5">{item.unitName}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-7 text-center text-slate-400 space-y-1 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-800/20">
                  <ShoppingCart className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 stroke-1.5" />
                  <div className="font-bold text-xs text-slate-600 dark:text-slate-300">
                    {lang === 'en' ? 'No items in bill yet' : 'बिल सूची खाली छ'}
                  </div>
                  <p className="text-[11px] text-slate-400 px-3">
                    {lang === 'en' ? 'Click any product on the left to add' : 'बायाँबाट उत्पादन क्लिक गरी थप्नुहोस्'}
                  </p>
                </div>
              )}
            </div>

            {/* 2C. Totals, Payment Mode & Checkout Dock (Always Fits Above Fold) */}
            <div className="p-3.5 space-y-3 bg-white dark:bg-slate-900">
              {/* Subtotal & Discount + Total Payable Banner */}
              <div className="grid grid-cols-12 gap-2.5 items-center p-2.5 rounded-2xl bg-gradient-to-r from-slate-900 via-sky-900 to-blue-900 text-white shadow-sm">
                <div className="col-span-7">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-sky-200 block">
                    {lang === 'en' ? 'Total Payable' : 'जम्मा भुक्तानी'} ({cart.length} {lang === 'en' ? 'items' : 'सामान'})
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono leading-tight mt-0.5">
                    {formatNepaliCurrency(grandTotal)}
                  </div>
                </div>

                <div className="col-span-5 bg-white/10 rounded-xl p-1.5 border border-white/15">
                  <label className="block text-[9px] font-bold uppercase text-sky-100 mb-0.5">
                    {lang === 'en' ? 'Discount (रू)' : 'छुट (रू)'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={discountAmount}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setDiscountAmount(nonNegativeValue(e.target.value))}
                    className="w-full px-2 py-1 text-xs font-mono font-bold bg-white/95 text-slate-900 rounded-lg outline-none text-right"
                  />
                </div>
              </div>

              {/* Payment Mode & Amount Received Side-by-Side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Payment Mode' : 'भुक्तानी माध्यम'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(0)}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        paymentMethod === 0
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      💵 {lang === 'en' ? 'Cash' : 'नगद'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(2)}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        paymentMethod === 2
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      📱 {lang === 'en' ? 'Bank/QR' : 'फोनपे/बैंक'}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {lang === 'en' ? 'Received (रू)' : 'प्राप्त रकम (रू)'}
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleSetPaidFull}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                      >
                        {lang === 'en' ? 'Full' : 'पूरा'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSetPaidZero}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 cursor-pointer"
                      >
                        {lang === 'en' ? 'Due' : 'उधारो'}
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder={String(grandTotal)}
                    value={paidAmount}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setPaidAmount(nonNegativeValue(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-sm font-extrabold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none font-mono text-emerald-700 dark:text-emerald-400"
                  />
                </div>
              </div>

              {/* Settlement Status + Notes inline row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                {balanceDue > 0 ? (
                  <div className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] flex items-center justify-between font-bold">
                    <span>⚠️ {lang === 'en' ? 'Due:' : 'बाँकी:'}</span>
                    <span className="font-mono">{formatNepaliCurrency(balanceDue)}</span>
                  </div>
                ) : changeReturn > 0 ? (
                  <div className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-[11px] flex items-center justify-between font-bold">
                    <span>{lang === 'en' ? 'Change:' : 'फिर्ता:'}</span>
                    <span className="font-mono">{formatNepaliCurrency(changeReturn)}</span>
                  </div>
                ) : (
                  <div className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold text-center">
                    ✓ {lang === 'en' ? 'Fully Settled' : 'पूर्ण चुक्ता'}
                  </div>
                )}

                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Bill notes / remarks (optional)' : 'कैफियत (ऐच्छिक)'}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              {/* Primary & Secondary Checkout Buttons Side-by-Side */}
              <div className="grid grid-cols-12 gap-2 pt-1">
                <button
                  type="button"
                  disabled={cart.length === 0 || loading}
                  onClick={() => handleCompleteSale(true)}
                  className="col-span-8 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-extrabold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{loading ? (lang === 'en' ? 'Saving...' : 'प्रशोधन...') : (lang === 'en' ? 'Complete Sale & Print' : 'बिक्री र रसिद प्रिन्ट')}</span>
                </button>

                <button
                  type="button"
                  disabled={cart.length === 0 || loading}
                  onClick={() => handleCompleteSale(false)}
                  className="col-span-4 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  {lang === 'en' ? 'Save Only' : 'रसिद बिना'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Sales History Sub-Tab */}
      {activeSubTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={lang === 'en' ? 'Search sales by invoice #, customer...' : 'बिल नं वा ग्राहकको नामबाट खोज्नुहोस्...'}
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'en' ? 'Showing' : 'जम्मा'} <strong className="text-slate-800 dark:text-slate-200">{filteredHistory.length}</strong> {lang === 'en' ? 'sales records' : 'बिक्री कारोबार'}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">{lang === 'en' ? 'Invoice #' : 'बिल नं.'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Date & Time' : 'मिति / समय'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Customer' : 'ग्राहक'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Items' : 'सामान'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Total Amount' : 'कुल रकम'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Paid Amount' : 'प्राप्त रकम'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Due Balance' : 'बाँकी बक्यौता'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Action' : 'कार्य'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHistory.map(ord => {
                  const cust = ord.customer || customers.find(c => c.id === ord.customerId);
                  const total = Number(ord.netAmount ?? ord.totalAmount ?? 0);
                  const paid = Number(ord.totalPaid ?? ord.paidAmount ?? 0);
                  const due = Math.max(0, Number(ord.remainingAmount ?? (total - paid)));
                  const ordTs = ord.orderDateTimeUtms || ord.orderDateUtms;

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-2.5 px-4 font-mono font-bold text-sky-700 dark:text-sky-400">
                        #{ord.orderNumber || ord.id}
                      </td>

                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        {ordTs ? new Date(ordTs).toLocaleString() : (ord.createdDate || '-')}
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-100">
                          {cust ? (lang === 'en' ? (cust.nameInEnglish || cust.nameInNepali) : (cust.nameInNepali || cust.nameInEnglish)) : (lang === 'en' ? 'Walk-in Customer' : 'काउन्टर ग्राहक')}
                        </div>
                        {cust && <span className="text-[10px] text-slate-400 font-mono">#{cust.code}</span>}
                      </td>

                      <td className="py-2.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {ord.items?.length || ord.orderProducts?.length || 1}
                      </td>

                      <td className="py-2.5 px-4 text-right font-black text-slate-800 dark:text-slate-100">
                        {formatNepaliCurrency(total)}
                      </td>

                      <td className="py-2.5 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400">
                        {formatNepaliCurrency(paid)}
                      </td>

                      <td className="py-2.5 px-4 text-right font-bold">
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

                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => onPrintReceipt && onPrintReceipt(ord)}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                          title={lang === 'en' ? 'Print Receipt Slip' : 'रसिद प्रिन्ट'}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      {lang === 'en' ? 'No sales history records found.' : 'कुनै बिक्री इतिहास भेटिएन ।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Quick New Customer Modal */}
      {quickCustModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {lang === 'en' ? 'Register New Customer' : 'नयाँ ग्राहक दर्ता'}
                </h3>
              </div>
              <button onClick={() => setQuickCustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Customer / Buyer Name' : 'ग्राहकको नाम'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kathmandu Hotel"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Phone Number' : 'सम्पर्क फोन'}
                </label>
                <input
                  type="tel"
                  placeholder="98XXXXXXXX"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Address' : 'ठेगाना'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. New Baneshwor, Kathmandu"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Account Type' : 'खाता प्रकार'}
                </label>
                <select
                  value={newCustType}
                  onChange={(e) => setNewCustType(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-sky-500 outline-none font-semibold"
                >
                  <option value={2}>{lang === 'en' ? 'Customer / Buyer' : 'ग्राहक (Buyer)'}</option>
                  <option value={1}>{lang === 'en' ? 'Farmer / Supplier' : 'कृषक (Farmer)'}</option>
                  <option value={3}>{lang === 'en' ? 'Both (Farmer & Customer)' : 'दुवै (Both)'}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickCustModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {lang === 'en' ? 'Cancel' : 'रद्द'}
                </button>
                <button
                  type="submit"
                  disabled={savingCust}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20"
                >
                  {savingCust ? (lang === 'en' ? 'Saving...' : 'सुरक्षित गर्दै...') : (lang === 'en' ? 'Register Customer' : 'ग्राहक दर्ता गर्नुहोस्')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
