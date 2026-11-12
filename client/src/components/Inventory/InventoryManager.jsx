import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  ArrowUpDown,
  Edit,
  RotateCcw,
  AlertTriangle,
  Layers,
  Trash2,
  X,
  Search
} from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';
import { preventNegativeKey, nonNegativeValue } from '../../utils/numberInput';

export default function InventoryManager({
  products = [],
  inventorySummary = [],
  units = [],
  movements = [],
  onRefresh
}) {
  const { lang, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState('summary'); // 'summary', 'products', 'movements'
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Product Form State
  const [nameInNepali, setNameInNepali] = useState('');
  const [nameInEnglish, setNameInEnglish] = useState('');
  const [unitId, setUnitId] = useState(1);
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Movement Form State
  const [movProductId, setMovProductId] = useState('');
  const [movementType, setMovementType] = useState(1); // 1: In, 2: Out/Prod, 3: Out/Sale, 4: Wastage/Damage, 5: Adjustment
  const [adjustmentDirection, setAdjustmentDirection] = useState('add');
  const [movQuantity, setMovQuantity] = useState('');
  const [movBatch, setMovBatch] = useState('');
  const [movLocation, setMovLocation] = useState('Main Warehouse');
  const [movRemarks, setMovRemarks] = useState('');

  // Executive KPI summary metrics
  const totalProductsCount = products.filter(p => !p.isDeleted).length;

  const totalStockValuation = useMemo(() => {
    return inventorySummary.reduce((acc, s) => acc + (Number(s.stockValue) || 0), 0);
  }, [inventorySummary]);

  const lowStockCount = useMemo(() => {
    return inventorySummary.filter(i => i.isLowStock !== undefined ? i.isLowStock : i.currentStock <= (i.reorderLevel ?? 10)).length;
  }, [inventorySummary]);

  const totalWastageQuantity = useMemo(() => {
    return movements
      .filter(m => m.movementType === 4 || m.movementType === 'Wastage')
      .reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
  }, [movements]);

  const handleOpenProductModal = (prod = null) => {
    setEditingProduct(prod);
    if (prod) {
      setNameInNepali(prod.nameInNepali || '');
      setNameInEnglish(prod.nameInEnglish || '');
      setUnitId(prod.unitId || 1);
      setSellingPrice(String(prod.sellingPrice ?? ''));
      setCostPrice(String(prod.costPrice ?? ''));
      setReorderLevel(String(prod.reorderLevel ?? '10'));
      setDescription(prod.description || '');
    } else {
      setNameInNepali('');
      setNameInEnglish('');
      setUnitId(units[0]?.id || 1);
      setSellingPrice('');
      setCostPrice('');
      setReorderLevel('10');
      setDescription('');
    }
    setProductModalOpen(true);
  };

  const handleOpenMovementModal = (productId = null) => {
    setMovProductId(productId ? String(productId) : (products[0]?.id ? String(products[0].id) : ''));
    setMovQuantity('');
    setAdjustmentDirection('add');
    setMovBatch(`LOT-${Date.now().toString().slice(-4)}`);
    setMovRemarks('');
    setMovementModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (Number(sellingPrice) < 0 || Number(costPrice) < 0 || Number(reorderLevel) < 0) {
      alert(lang === 'en' ? 'Prices and reorder level cannot be negative.' : 'मूल्य तथा न्यूनतम सीमा ऋणात्मक हुन सक्दैन ।');
      return;
    }
    setLoading(true);

    try {
      const payload = {
        nameInNepali,
        nameInEnglish,
        unitId: Number(unitId),
        sellingPrice: Number(sellingPrice) || 0,
        costPrice: Number(costPrice) || 0,
        reorderLevel: Number(reorderLevel) || 0,
        description
      };

      const url = editingProduct ? `/api/Product/${editingProduct.id}` : '/api/Product';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setProductModalOpen(false);
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || (lang === 'en' ? 'Failed to save product.' : 'उत्पादन सुरक्षित गर्न सकिएन ।'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMovement = async (e) => {
    e.preventDefault();
    if (!movProductId || !movQuantity || Number(movQuantity) <= 0) {
      alert(lang === 'en' ? 'Please select product and enter valid quantity.' : 'कृपया उत्पादन र मान्य परिमाण प्रविष्ट गर्नुहोस् ।');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/Inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: Number(movProductId),
          movementType: Number(movementType),
          adjustmentDirection: Number(movementType) === 5 ? adjustmentDirection : undefined,
          quantity: Number(movQuantity),
          batchNumber: movBatch,
          location: movLocation,
          remarks: movRemarks
        })
      });

      if (res.ok) {
        setMovementModalOpen(false);
        setMovQuantity('');
        setMovRemarks('');
        setAdjustmentDirection('add');
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || (lang === 'en' ? 'Failed to record movement.' : 'मौज्दात चाल दर्ता गर्न सकिएन ।'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Stock Summary
  const filteredSummary = useMemo(() => {
    return inventorySummary.filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      const nepali = (item.productName || '').toLowerCase();
      const english = (item.productNameEn || '').toLowerCase();
      return nepali.includes(q) || english.includes(q);
    });
  }, [inventorySummary, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">
              {lang === 'en' ? 'Inventory & Stock Management' : 'मौज्दात तथा स्टक व्यवस्थापन'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'en'
                ? 'Real-time stock tracking for raw milk, cream, butter, cheese, yogurt, paneer, and other dairy items.'
                : 'काँचो दूध, क्रिम, घ्यु, बटर, पनिर, दही तथा प्याकेजिङ सामग्रीको प्रत्यक्ष मौज्दात हिसाब'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{lang === 'en' ? 'Refresh' : 'ताजा'}</span>
          </button>

          <button
            onClick={() => handleOpenMovementModal(null)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
            <span>{lang === 'en' ? 'Record Movement' : 'स्टक दाखिला/निकासी'}</span>
          </button>

          <button
            onClick={() => handleOpenProductModal(null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-teal-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'New Product' : 'नयाँ उत्पादन थप्नुहोस्'}</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Products */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-teal-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Total Products' : 'कुल उत्पादन प्रकार'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-teal-700 dark:text-teal-400 mt-1">
                {totalProductsCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {inventorySummary.length} {lang === 'en' ? 'active items in stock' : 'वटा मौज्दातमा सक्रिय'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 2: Total Stock Value */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-emerald-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Total Stock Value' : 'कुल मौज्दात मूल्यांकन'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {formatNepaliCurrency(totalStockValuation)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Cost valuation basis' : 'लागत मूल्यको आधारमा'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 3: Low Stock Alerts */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-amber-500 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Low Stock Alerts' : 'न्यून मौज्दात चेतावनी'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                {lowStockCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Needs reorder / processing' : 'पुनः खरिद वा प्रशोधन आवश्यक'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 4: Total Wastage */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-rose-500 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Total Wastage' : 'कुल क्षति वा खेर गएको'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                {totalWastageQuantity.toFixed(1)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Losses & damaged units' : 'बिग्रिएको वा नोक्सानी'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sub-Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('summary')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'summary'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{lang === 'en' ? 'Stock On Hand' : 'हालको मौज्दात (Stock On Hand)'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('movements')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'movements'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>{lang === 'en' ? 'Stock Movement History' : 'दाखिला तथा निकासी इतिहास'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('products')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'products'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Edit className="w-4 h-4" />
          <span>{lang === 'en' ? 'Product Catalog & Pricing' : 'उत्पादन दर तथा सीमा सूची'}</span>
        </button>
      </div>

      {/* 4. Tab 1 Content: Stock On Hand */}
      {activeSubTab === 'summary' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={lang === 'en' ? 'Search product in stock...' : 'मौज्दातमा उत्पादन खोज्नुहोस्...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'en' ? 'Showing' : 'जम्मा'} <strong className="text-slate-800 dark:text-slate-200">{filteredSummary.length}</strong> {lang === 'en' ? 'items' : 'वटा उत्पादन'}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">{lang === 'en' ? 'Product Name' : 'उत्पादन'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Unit' : 'एकाइ'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Cost Price' : 'लागत मूल्य'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Selling Price' : 'बिक्री मूल्य'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'In Stock' : 'हालको मौज्दात'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Stock Valuation' : 'मौज्दात रकम'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Status' : 'अवस्था'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Action' : 'कार्य'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSummary.map(item => {
                  const stock = Number(item.currentStock || 0);
                  const isLow = item.isLowStock || stock <= 10;

                  return (
                    <tr key={item.productId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                        {lang === 'en' ? (item.productNameEn || item.productName) : (item.productName || item.productNameEn)}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {item.unitName || 'Unit'}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400 font-mono">
                        {formatNepaliCurrency(item.costPrice || 0)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-teal-700 dark:text-teal-400 font-mono">
                        {formatNepaliCurrency(item.sellingPrice || 0)}
                      </td>

                      <td className="py-3 px-4 text-right font-black text-blue-700 dark:text-blue-400 text-sm font-mono">
                        {stock.toFixed(1)} {item.unitName}
                      </td>

                      <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-slate-100 font-mono">
                        {formatNepaliCurrency(item.stockValue || 0)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{lang === 'en' ? 'Low Stock' : 'न्यून मौज्दात'}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {lang === 'en' ? 'Optimal' : 'पर्याप्त मौज्दात'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenMovementModal(item.productId)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold cursor-pointer"
                        >
                          {lang === 'en' ? 'Adjust' : 'मिलान'}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredSummary.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      {lang === 'en' ? 'No stock records found.' : 'कुनै मौज्दात विवरण भेटिएन ।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab 2 Content: Stock Movement History */}
      {activeSubTab === 'movements' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              {lang === 'en' ? 'Stock Movement & Audit Log' : 'स्टक दाखिला तथा निकासी अडिट'}
            </h3>
            <button
              onClick={() => handleOpenMovementModal(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Record Movement' : 'दाखिला/निकासी दर्ता'}</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">{lang === 'en' ? 'Date & Time' : 'मिति र समय'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Product' : 'सामान'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Type' : 'प्रकार'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Quantity' : 'परिमाण'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Batch #' : 'ब्याच नं.'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Location' : 'स्थान'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Remarks' : 'कैफियत'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {movements.map(m => {
                  const prod = products.find(p => p.id === m.productId);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        {(m.dateTimeUtms || m.movementDateUtms) ? new Date(m.dateTimeUtms || m.movementDateUtms).toLocaleString() : (m.createdDate || '-')}
                      </td>

                      <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                        {lang === 'en' ? (prod?.nameInEnglish || prod?.nameInNepali || m.productName) : (prod?.nameInNepali || prod?.nameInEnglish || m.productName)}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.movementType === 1 || (m.movementType === 5 && m.adjustmentDirection !== 'subtract') ? 'bg-emerald-100 text-emerald-800' :
                          m.movementType === 4 ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {m.movementType === 1 && (lang === 'en' ? 'InFlow (+)' : 'दाखिला (+)')}
                          {m.movementType === 2 && (lang === 'en' ? 'Production (-)' : 'प्रशोधन (-)')}
                          {m.movementType === 3 && (lang === 'en' ? 'Sale Out (-)' : 'बिक्री निकासी (-)')}
                          {m.movementType === 4 && (lang === 'en' ? 'Wastage / Leak (-)' : 'नोक्सानी / चुहावट (-)')}
                          {m.movementType === 5 && (m.adjustmentDirection === 'subtract' ? (lang === 'en' ? 'Adjustment (-)' : 'मिलान (-)') : (lang === 'en' ? 'Adjustment (+)' : 'मिलान (+)'))}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-right font-black text-slate-800 dark:text-slate-100 font-mono">
                        {Number(m.quantity || 0).toFixed(1)} {m.unitName || prod?.unitName || ''}
                      </td>

                      <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {m.batchNumber || '-'}
                      </td>

                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                        {m.location || 'Warehouse'}
                      </td>

                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 truncate max-w-xs">
                        {m.remarks || '-'}
                      </td>
                    </tr>
                  );
                })}

                {movements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {lang === 'en' ? 'No stock movement records found.' : 'कुनै स्टक दाखिला वा निकासी विवरण भेटिएन ।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Tab 3 Content: Product Catalog & Pricing */}
      {activeSubTab === 'products' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              {lang === 'en' ? 'Product Catalog & Pricing Rules' : 'उत्पादन दर तथा मूल्य निर्धारण'}
            </h3>
            <button
              onClick={() => handleOpenProductModal(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'New Product' : 'नयाँ उत्पादन'}</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">{lang === 'en' ? 'Name (Nepali)' : 'नाम (नेपाली)'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Name (English)' : 'नाम (अंग्रेजी)'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Unit' : 'एकाइ'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Cost Price' : 'लागत मूल्य'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Selling Price' : 'बिक्री मूल्य'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Reorder Level' : 'न्यूनतम सीमा'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Action' : 'कार्य'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.filter(p => !p.isDeleted).map(prod => (
                  <tr key={prod.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                      {prod.nameInNepali || '-'}
                    </td>

                    <td className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {prod.nameInEnglish || '-'}
                    </td>

                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                      {prod.unitName || 'Unit'}
                    </td>

                    <td className="py-2.5 px-4 text-right font-medium text-slate-600 dark:text-slate-400 font-mono">
                      {formatNepaliCurrency(prod.costPrice || 0)}
                    </td>

                    <td className="py-2.5 px-4 text-right font-bold text-teal-700 dark:text-teal-400 font-mono">
                      {formatNepaliCurrency(prod.sellingPrice || 0)}
                    </td>

                    <td className="py-2.5 px-4 text-right font-bold text-amber-600 dark:text-amber-400 font-mono">
                      {prod.reorderLevel || 10}
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenProductModal(prod)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold cursor-pointer"
                      >
                        {lang === 'en' ? 'Edit' : 'सम्पादन'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {editingProduct
                    ? (lang === 'en' ? 'Edit Product' : 'उत्पादन विवरण सम्पादन')
                    : (lang === 'en' ? 'New Dairy Product' : 'नयाँ दुग्ध उत्पादन थप्नुहोस्')}
                </h3>
              </div>
              <button onClick={() => setProductModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Product Name (Nepali)' : 'उत्पादनको नाम (नेपाली)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="जस्तै: ताजा पनिर"
                  value={nameInNepali}
                  onChange={(e) => setNameInNepali(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Product Name (English)' : 'उत्पादनको नाम (अंग्रेजी)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fresh Paneer"
                  value={nameInEnglish}
                  onChange={(e) => setNameInEnglish(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Unit' : 'एकाइ'}
                  </label>
                  <select
                    value={unitId}
                    onChange={(e) => setUnitId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-semibold"
                  >
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Reorder Level' : 'न्यूनतम सीमा'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={reorderLevel}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setReorderLevel(nonNegativeValue(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Cost Price (रू)' : 'लागत मूल्य (रू)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={costPrice}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setCostPrice(nonNegativeValue(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Selling Price (रू)' : 'बिक्री मूल्य (रू)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={sellingPrice}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setSellingPrice(nonNegativeValue(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-mono font-bold text-teal-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {lang === 'en' ? 'Cancel' : 'रद्द'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-600/20"
                >
                  {loading ? (lang === 'en' ? 'Saving...' : 'सुरक्षित गर्दै...') : (lang === 'en' ? 'Save Product' : 'उत्पादन सुरक्षित गर्नुहोस्')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Stock Movement Modal */}
      {movementModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {lang === 'en' ? 'Record Stock Movement' : 'स्टक दाखिला वा निकासी दर्ता'}
                </h3>
              </div>
              <button onClick={() => setMovementModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Product' : 'उत्पादन'}
                </label>
                <select
                  value={movProductId}
                  onChange={(e) => setMovProductId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="">{lang === 'en' ? '-- Select Product --' : '-- उत्पादन छान्नुहोस् --'}</option>
                  {products.filter(p => !p.isDeleted).map(p => (
                    <option key={p.id} value={p.id}>
                      {lang === 'en' ? (p.nameInEnglish || p.nameInNepali) : (p.nameInNepali || p.nameInEnglish)} ({p.unitName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Movement Type' : 'दाखिला वा निकासी प्रकार'}
                </label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-semibold"
                >
                  <option value={1}>{lang === 'en' ? 'InFlow / Purchase (+)' : 'दाखिला वा खरिद (+)'}</option>
                  <option value={2}>{lang === 'en' ? 'Production OutFlow (-)' : 'प्रशोधनमा निकासी (-)'}</option>
                  <option value={3}>{lang === 'en' ? 'Sales OutFlow (-)' : 'बिक्री निकासी (-)'}</option>
                  <option value={4}>{lang === 'en' ? 'Wastage / Damaged (-)' : 'नोक्सानी वा बिग्रेको (-)'}</option>
                  <option value={5}>{lang === 'en' ? 'Stock Adjustment (+/-)' : 'स्टक मिलान (+/-)'}</option>
                </select>
              </div>

              {Number(movementType) === 5 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Adjustment Direction' : 'समायोजन दिशा'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustmentDirection('add')}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        adjustmentDirection === 'add'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {lang === 'en' ? '+ Add Stock' : '+ मौज्दात थप्नुहोस्'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentDirection('subtract')}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        adjustmentDirection === 'subtract'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {lang === 'en' ? '- Subtract Stock' : '- मौज्दात घटाउनुहोस्'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Quantity' : 'परिमाण'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="0.0"
                    value={movQuantity}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setMovQuantity(nonNegativeValue(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Batch / Lot #' : 'ब्याच नं.'}
                  </label>
                  <input
                    type="text"
                    value={movBatch}
                    onChange={(e) => setMovBatch(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Warehouse Location' : 'गोदाम वा स्थान'}
                </label>
                <input
                  type="text"
                  value={movLocation}
                  onChange={(e) => setMovLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Remarks / Notes' : 'कैफियत'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. Daily intake from cold room' : 'जस्तै: चिसो भण्डारणबाट निकालिएको'}
                  value={movRemarks}
                  onChange={(e) => setMovRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setMovementModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {lang === 'en' ? 'Cancel' : 'रद्द'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-600/20"
                >
                  {loading ? (lang === 'en' ? 'Saving...' : 'सुरक्षित गर्दै...') : (lang === 'en' ? 'Record Movement' : 'दाखिला/निकासी दर्ता गर्नुहोस्')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
