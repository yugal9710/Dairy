import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  RotateCcw,
  Receipt,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Building,
  X,
  Search
} from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';
import { preventNegativeKey, nonNegativeValue } from '../../utils/numberInput';

export default function PurchaseManager({
  purchases = [],
  products = [],
  onRefresh
}) {
  const { lang, t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(0); // 0: Paid, 1: Partial, 2: Credit
  const [paymentMethod, setPaymentMethod] = useState(0); // 0: Cash, 1: Cheque, 2: Bank
  const [paidAmount, setPaidAmount] = useState('');
  const [location, setLocation] = useState('Central Warehouse - Bay 2');
  const [remarks, setRemarks] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([
    { productId: products[0]?.id || 1, quantity: 50, unitPrice: 60, batchNumber: `LOT-${Date.now().toString().slice(-4)}` }
  ]);
  const [loading, setLoading] = useState(false);

  // Executive KPI summary cards matching PurchasesList.razor
  const totalInvoicesCount = purchases.length;

  const totalPurchasedAmount = useMemo(() => {
    return purchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
  }, [purchases]);

  const totalPaidAmount = useMemo(() => {
    return purchases.reduce((acc, p) => acc + (Number(p.paidAmount) || 0), 0);
  }, [purchases]);

  const totalBalanceDue = useMemo(() => {
    return Math.max(0, totalPurchasedAmount - totalPaidAmount);
  }, [totalPurchasedAmount, totalPaidAmount]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productId: products[0]?.id || 1,
        quantity: 10,
        unitPrice: 50,
        batchNumber: `LOT-${Date.now().toString().slice(-4)}`
      }
    ]);
  };

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...items];
    if (field === 'quantity' || field === 'unitPrice') {
      updated[idx][field] = nonNegativeValue(val);
    } else {
      updated[idx][field] = val;
    }
    setItems(updated);
  };

  const totalAmount = items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert(lang === 'en' ? 'Please enter supplier name.' : 'कृपया आपूर्तिकर्ताको नाम प्रविष्ट गर्नुहोस् ।');
      return;
    }

    const rawPaid = paidAmount !== '' ? Number(paidAmount) : (paymentStatus === 0 ? totalAmount : 0);
    if (rawPaid < 0) {
      alert(lang === 'en' ? 'Paid amount cannot be negative.' : 'भुक्तानी रकम ऋणात्मक हुन सक्दैन ।');
      return;
    }
    if (rawPaid > totalAmount + 0.05) {
      alert(lang === 'en' ? 'Paid amount cannot exceed purchase bill total.' : 'भुक्तानी रकम कुल बिलभन्दा बढी हुन सक्दैन ।');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/Purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName,
          invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
          paymentStatus: Number(paymentStatus),
          paymentMethod: Number(paymentMethod),
          totalAmount,
          paidAmount: Math.min(totalAmount, rawPaid),
          location,
          remarks,
          items: items.map(it => {
            const p = products.find(prod => prod.id === Number(it.productId));
            return {
              productId: Number(it.productId),
              productName: p ? (lang === 'en' ? (p.nameInEnglish || p.nameInNepali) : (p.nameInNepali || p.nameInEnglish)) : 'Item',
              quantity: Number(it.quantity),
              unitPrice: Number(it.unitPrice),
              batchNumber: it.batchNumber
            };
          })
        })
      });

      if (res.ok) {
        setModalOpen(false);
        setSupplierName('');
        setInvoiceNumber('');
        setPaidAmount('');
        setRemarks('');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Purchases list
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      const sName = (p.supplierName || '').toLowerCase();
      const inv = (p.invoiceNumber || '').toLowerCase();
      return sName.includes(q) || inv.includes(q);
    });
  }, [purchases, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">
              {lang === 'en' ? 'Purchases & Supplier Invoices' : 'कच्चा पदार्थ खरिद तथा आपूर्तिकर्ता बिल'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'en'
                ? 'Record purchases of raw milk, packaging, ingredients, and dairy supplies. Stock updates automatically.'
                : 'काँचो दूध, प्याकेजिङ, दाना तथा प्रयोगशाला रसायन खरिद दर्ता तथा आपूर्तिकर्ता हिसाब'}
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
              setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-sky-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'en' ? 'Record Purchase' : 'खरिद दर्ता गर्नुहोस्'}</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Invoices */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-sky-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Total Invoices' : 'कुल खरिद बिल'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-sky-700 dark:text-sky-400 mt-1">
                {totalInvoicesCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Invoices recorded' : 'दर्ता भएका आपूर्तिकर्ता बिलहरू'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 2: Total Purchased */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-emerald-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Total Purchased' : 'कुल खरिद रकम'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {formatNepaliCurrency(totalPurchasedAmount)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Gross procurement' : 'कुल खरिद खर्च दायित्व'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 3: Total Paid */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-blue-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Total Paid' : 'कुल भुक्तानी रकम'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
                {formatNepaliCurrency(totalPaidAmount)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Disbursed to suppliers' : 'आपूर्तिकर्तालाई भुक्तान'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 4: Unpaid Balance Due */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-rose-500 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Unpaid Balance' : 'बाँकी बक्यौता दायित्व'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                {formatNepaliCurrency(totalBalanceDue)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Outstanding payables' : 'आपूर्तिकर्तालाई तिर्न बाँकी'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Purchases Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === 'en' ? 'Search supplier or invoice #...' : 'आपूर्तिकर्ता वा बिल नं. खोज्नुहोस्...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'en' ? 'Showing' : 'जम्मा'} <strong className="text-slate-800 dark:text-slate-200">{filteredPurchases.length}</strong> {lang === 'en' ? 'invoices' : 'वटा खरिद बिल'}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">{lang === 'en' ? 'Invoice #' : 'बिल नं.'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Date' : 'मिति'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Supplier Name' : 'आपूर्तिकर्ता'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Items & Quantity' : 'सामान तथा परिमाण'}</th>
                <th className="py-3 px-4 text-right">{lang === 'en' ? 'Total Amount' : 'कुल रकम'}</th>
                <th className="py-3 px-4 text-right">{lang === 'en' ? 'Paid' : 'भुक्तानी'}</th>
                <th className="py-3 px-4 text-right">{lang === 'en' ? 'Balance' : 'बाँकी'}</th>
                <th className="py-3 px-4 text-center">{lang === 'en' ? 'Status' : 'अवस्था'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPurchases.map(p => {
                const total = Number(p.totalAmount || 0);
                const paid = Number(p.paidAmount || 0);
                const bal = Math.max(0, total - paid);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-sky-700 dark:text-sky-400">
                      {p.invoiceNumber}
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                      {new Date(p.purchaseDateUtms).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">
                      {p.supplierName}
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {(p.items || []).map((it, idx) => (
                          <div key={idx} className="text-[11px] text-slate-700 dark:text-slate-300">
                            <strong>{it.productName}:</strong> {it.quantity}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-black text-slate-800 dark:text-slate-100 font-mono">
                      {formatNepaliCurrency(total)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                      {formatNepaliCurrency(paid)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold font-mono">
                      {bal > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          {formatNepaliCurrency(bal)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {formatNepaliCurrency(0)}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        bal <= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        paid > 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {bal <= 0 ? (lang === 'en' ? 'Paid' : 'चुक्ता') : paid > 0 ? (lang === 'en' ? 'Partial' : 'आंशिक') : (lang === 'en' ? 'Unpaid' : 'बाँकी')}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {lang === 'en' ? 'No purchase invoices found.' : 'कुनै खरिद बिल भेटिएन ।'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Record Purchase Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-600" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {lang === 'en' ? 'Record Supplier Purchase' : 'नयाँ खरिद बिल दर्ता'}
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
                    {lang === 'en' ? 'Supplier Name' : 'आपूर्तिकर्ताको नाम'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nepal Dairy Packaging Co."
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Invoice / Bill #' : 'बिल नम्बर'}
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              {/* Items Picker */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {lang === 'en' ? 'Purchased Items' : 'खरिद गरिएका सामग्रीहरू'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Add Item' : 'थप्नुहोस्'}</span>
                  </button>
                </div>

                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <select
                        value={it.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none"
                      >
                        {products.filter(p => !p.isDeleted).map(p => (
                          <option key={p.id} value={p.id}>
                            {lang === 'en' ? (p.nameInEnglish || p.nameInNepali) : (p.nameInNepali || p.nameInEnglish)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Qty"
                        value={it.quantity}
                        onKeyDown={preventNegativeKey}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl text-center outline-none"
                      />
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Rate"
                        value={it.unitPrice}
                        onKeyDown={preventNegativeKey}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl text-right outline-none font-mono"
                      />
                    </div>

                    <div className="col-span-1 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total & Paid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-bold">{lang === 'en' ? 'Total Bill Amount:' : 'कुल खरिद रकम:'}</span>
                  <div className="text-lg font-black text-sky-700 dark:text-sky-400 font-mono">
                    {formatNepaliCurrency(totalAmount)}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Amount Paid (रू)' : 'भुक्तानी गरिएको रकम (रू)'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max={totalAmount}
                    placeholder={String(totalAmount)}
                    value={paidAmount}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setPaidAmount(nonNegativeValue(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Payment Status' : 'भुक्तानी अवस्था'}
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-semibold"
                  >
                    <option value={0}>{lang === 'en' ? 'Full Paid (नगद चुक्ता)' : 'पूर्ण चुक्ता'}</option>
                    <option value={1}>{lang === 'en' ? 'Partial Paid (आंशिक भुक्तान)' : 'आंशिक'}</option>
                    <option value={2}>{lang === 'en' ? 'Credit / Due (उधारो)' : 'उधारो'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Payment Method' : 'भुक्तानी माध्यम'}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-semibold"
                  >
                    <option value={0}>💵 Cash (नगद)</option>
                    <option value={1}>🏛️ Cheque (चेक)</option>
                    <option value={2}>📱 Online / Bank (बैंक वा फोनपे)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Warehouse Bay / Location' : 'गोदामको स्थान'}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Remarks' : 'कैफियत'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. Purchase order #44' : 'जस्तै: कच्चा पदार्थ आपूर्ति'}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
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
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-md shadow-sky-600/20"
                >
                  {loading ? (lang === 'en' ? 'Saving...' : 'सुरक्षित गर्दै...') : (lang === 'en' ? 'Save Purchase' : 'खरिद बिल सुरक्षित गर्नुहोस्')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
