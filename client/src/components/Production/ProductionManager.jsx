import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  RotateCcw,
  CheckCircle,
  Clock,
  Trash2,
  X,
  Factory
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { preventNegativeKey, nonNegativeValue } from '../../utils/numberInput';

export default function ProductionManager({
  batches = [],
  products = [],
  onRefresh
}) {
  const { lang, t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [batchNumber, setBatchNumber] = useState('');
  const [inputLiters, setInputLiters] = useState('');
  const [wastageLiters, setWastageLiters] = useState('0');
  const [inputFat, setInputFat] = useState('4.8');
  const [inputSnf, setInputSnf] = useState('8.4');
  const [facility, setFacility] = useState('Main Processing Plant');
  const [remarks, setRemarks] = useState('');
  const [outputItems, setOutputItems] = useState([
    { productId: products[0]?.id || 1, productName: 'Paneer', quantity: 15, unit: 'KG' }
  ]);
  const [loading, setLoading] = useState(false);

  // Executive KPI summary cards matching ProductionList.razor
  const totalBatchesCount = batches.length;
  const inProgressCount = batches.filter(b => b.status === 'InProgress' || b.status === 0).length;
  const completedCount = batches.filter(b => b.status === 'Completed' || b.status === 1 || !b.status).length;
  const totalWastage = useMemo(() => {
    return batches.reduce((acc, b) => acc + (Number(b.wastageQuantity ?? b.leakageLiters) || 0), 0);
  }, [batches]);

  const handleAddOutput = () => {
    const firstProd = products[0];
    setOutputItems([
      ...outputItems,
      {
        productId: firstProd?.id || 1,
        productName: firstProd ? (lang === 'en' ? (firstProd.nameInEnglish || firstProd.nameInNepali) : (firstProd.nameInNepali || firstProd.nameInEnglish)) : 'Item',
        quantity: 1,
        unit: firstProd?.unitName || 'KG'
      }
    ]);
  };

  const handleRemoveOutput = (idx) => {
    setOutputItems(outputItems.filter((_, i) => i !== idx));
  };

  const handleOutputChange = (idx, field, val) => {
    const updated = [...outputItems];
    updated[idx][field] = field === 'quantity' ? nonNegativeValue(val) : val;
    if (field === 'productId') {
      const p = products.find(prod => prod.id === Number(val));
      if (p) {
        updated[idx].productName = lang === 'en' ? (p.nameInEnglish || p.nameInNepali) : (p.nameInNepali || p.nameInEnglish);
        updated[idx].unit = p.unitName || 'Unit';
      }
    }
    setOutputItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rawQty = Number(inputLiters) || 0;
    const leakageQty = Number(wastageLiters) || 0;
    if (rawQty <= 0) {
      alert(lang === 'en' ? 'Please enter raw milk quantity.' : 'कृपया खपत हुने काँचो दूध परिमाण प्रविष्ट गर्नुहोस् ।');
      return;
    }
    if (leakageQty < 0 || leakageQty > rawQty) {
      alert(lang === 'en' ? 'Processing leakage cannot be negative or exceed raw milk consumed.' : 'प्रशोधन नोक्सानी ऋणात्मक वा खपत दूधभन्दा बढी हुन सक्दैन ।');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/Production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchNumber: batchNumber || `BATCH-${new Date().getFullYear()}-${batches.length + 1}`,
          inputRawMilkLiters: rawQty,
          inputFat: Number(inputFat) || 0,
          inputSnf: Number(inputSnf) || 0,
          wastageQuantity: leakageQty,
          leakageLiters: leakageQty,
          location: facility,
          outputItems,
          remarks,
          status: 'Completed'
        })
      });

      if (res.ok) {
        setModalOpen(false);
        setInputLiters('');
        setWastageLiters('0');
        setRemarks('');
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || (lang === 'en' ? 'Failed to save production batch.' : 'उत्पादन ब्याच सुरक्षित गर्न सकिएन ।'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">
              {lang === 'en' ? 'Dairy Production & Batch Processing' : 'दुग्ध प्रशोधन तथा ब्याच उत्पादन'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'en'
                ? 'Transform raw milk into pasteurized milk, cream, butter, cheese, paneer, and yogurt with batch-level traceability.'
                : 'काँचो दूधलाई प्रशोधन गरी दही, पनिर, नौनी, घ्यु तथा क्रिम उत्पादन तथा ब्याच ट्र्याकिङ'}
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
              setBatchNumber(`BATCH-${new Date().getFullYear()}-${batches.length + 1}`);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'en' ? 'New Production Batch' : 'नयाँ उत्पादन ब्याच'}</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Batches */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-indigo-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Total Batches' : 'कुल उत्पादन ब्याच'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
                {totalBatchesCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Across all production runs' : 'सम्पूर्ण प्रशोधन ब्याचहरू'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 2: In Progress */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-amber-500 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'In Progress' : 'प्रशोधन भइरहेको'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                {inProgressCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Active processing batches' : 'सक्रिय ब्याचहरू'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 3: Completed Batches */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-emerald-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Completed Batches' : 'सम्पन्न ब्याचहरू'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {completedCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Finished and in stock' : 'उत्पादन तयार भई मौज्दातमा'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 4: Batch Wastage */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-rose-500 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Batch Wastage' : 'प्रशोधन नोक्सानी'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                {totalWastage.toFixed(1)} <span className="text-xs font-bold">{lang === 'en' ? 'L' : 'लि.'}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Total processing loss' : 'प्रशोधनको क्रममा खेर गएको'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Batches Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">{lang === 'en' ? 'Batch #' : 'ब्याच नं.'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Date' : 'मिति'}</th>
                <th className="py-3 px-4 text-right">{lang === 'en' ? 'Consumed Raw Milk' : 'खपत काँचो दूध'}</th>
                <th className="py-3 px-4 text-right">{lang === 'en' ? 'Leakage / Loss' : 'नोक्सानी / चुहावट'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Quality' : 'गुणस्तर'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Finished Products' : 'तयार उत्पादन'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Facility' : 'स्थान'}</th>
                <th className="py-3 px-4 text-center">{lang === 'en' ? 'Status' : 'अवस्था'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Remarks' : 'कैफियत'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {batches.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                    {b.batchNumber}
                  </td>

                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                    {new Date(b.productionDateUtms).toLocaleDateString()}
                  </td>

                  <td className="py-3 px-4 text-right font-black text-blue-700 dark:text-blue-400 text-sm font-mono">
                    {b.inputRawMilkLiters} {lang === 'en' ? 'L' : 'लिटर'}
                  </td>

                  <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                    {Number(b.wastageQuantity ?? b.leakageLiters ?? 0).toFixed(1)} {lang === 'en' ? 'L' : 'लि.'}
                    {b.inputRawMilkLiters > 0 && (
                      <span className="block text-[10px] text-slate-400 font-normal">
                        ({(((Number(b.wastageQuantity ?? b.leakageLiters) || 0) / Number(b.inputRawMilkLiters)) * 100).toFixed(2)}%)
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    FAT {b.inputFat}% / SNF {b.inputSnf}%
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {(b.outputItems || []).map((out, i) => (
                        <span key={i} className="inline-block bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-md">
                          {out.productName}: <strong>{out.quantity} {out.unit}</strong>
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {b.location || 'Processing Unit 1'}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {lang === 'en' ? 'Completed' : 'सम्पन्न'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 italic">
                    {b.remarks || '-'}
                  </td>
                </tr>
              ))}

              {batches.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    {lang === 'en' ? 'No production batches recorded.' : 'कुनै उत्पादन ब्याच भेटिएन ।'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. New Production Batch Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {lang === 'en' ? 'Start New Production Batch' : 'नयाँ दुग्ध प्रशोधन ब्याच'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Batch Code' : 'ब्याच कोड'}
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Raw Milk Consumed (L)' : 'खपत काँचो दूध (लिटर)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 150"
                    value={inputLiters}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setInputLiters(nonNegativeValue(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl font-bold text-blue-700 dark:text-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Leakage / Loss (L)' : 'चुहावट / नोक्सानी (लि.)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={wastageLiters}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setWastageLiters(nonNegativeValue(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400 font-bold rounded-xl"
                  />
                  {Number(inputLiters) > 0 && (
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {lang === 'en' ? 'Loss Rate:' : 'दर:'} {(((Number(wastageLiters) || 0) / Number(inputLiters)) * 100).toFixed(2)}%
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    FAT %
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={inputFat}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setInputFat(nonNegativeValue(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    SNF %
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={inputSnf}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setInputSnf(nonNegativeValue(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl"
                  />
                </div>
              </div>

              {/* Output Products Picker */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {lang === 'en' ? 'Finished Output Products' : 'तयार हुने उत्पादनहरू'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOutput}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Add Output' : 'थप्नुहोस्'}</span>
                  </button>
                </div>

                {outputItems.map((out, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-7">
                      <select
                        value={out.productId}
                        onChange={(e) => handleOutputChange(idx, 'productId', e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl"
                      >
                        {products.filter(p => !p.isDeleted).map(p => (
                          <option key={p.id} value={p.id}>
                            {lang === 'en' ? (p.nameInEnglish || p.nameInNepali) : (p.nameInNepali || p.nameInEnglish)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-4">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Qty"
                        value={out.quantity}
                        onKeyDown={preventNegativeKey}
                        onChange={(e) => handleOutputChange(idx, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl text-center font-bold"
                      />
                    </div>

                    <div className="col-span-1 text-center">
                      {outputItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOutput(idx)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Facility / Location' : 'स्थान वा प्लान्ट'}
                </label>
                <input
                  type="text"
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Remarks / Notes' : 'कैफियत'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. Temperature checked at 72°C' : 'जस्तै: पाश्चराइजेशन सम्पन्न'}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl"
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20"
                >
                  {loading ? (lang === 'en' ? 'Saving...' : 'सुरक्षित गर्दै...') : (lang === 'en' ? 'Save Batch' : 'ब्याच सुरक्षित गर्नुहोस्')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
