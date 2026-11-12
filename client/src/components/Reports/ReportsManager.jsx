import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Calendar,
  RotateCcw,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Layers,
  Milk,
  Receipt,
  Search
} from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';

export default function ReportsManager({
  analytics,
  collections = [],
  orders = [],
  tenant
}) {
  const { lang, t } = useLanguage();
  const [activeReportTab, setActiveReportTab] = useState('pnl'); // 'pnl', 'milk', 'sales'

  // Date Filter State
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filteredAnalytics, setFilteredAnalytics] = useState(null);

  useEffect(() => {
    if (!fromDate && !toDate) {
      setFilteredAnalytics(null);
      return;
    }
    const params = new URLSearchParams();
    if (fromDate) params.set('fromDateUtms', String(new Date(`${fromDate}T00:00:00`).getTime()));
    if (toDate) params.set('toDateUtms', String(new Date(`${toDate}T23:59:59.999`).getTime()));

    let cancelled = false;
    fetch(`/api/Reports/dashboard?${params.toString()}`, {
      headers: { 'x-tenant-id': String(tenant?.id || 1) }
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!cancelled && data) setFilteredAnalytics(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate, tenant?.id]);

  const activeAnalytics = filteredAnalytics || analytics || {};
  const pL = activeAnalytics?.profitLoss || {};
  const leakage = activeAnalytics?.leakageSummary || {};

  const handlePrint = () => {
    window.print();
  };

  const handleSetQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setFromDate(start.toISOString().slice(0, 10));
    setToDate(end.toISOString().slice(0, 10));
  };

  const handleResetFilter = () => {
    setFromDate('');
    setToDate('');
  };

  // Filtered collections by date
  const filteredCollections = useMemo(() => {
    return collections.filter(c => {
      if (!c.dateTimeUtms) return true;
      const d = new Date(c.dateTimeUtms).toISOString().slice(0, 10);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [collections, fromDate, toDate]);

  // Filtered orders by date
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const utms = o.orderDateUtms || o.orderDateTimeUtms;
      if (!utms) return true;
      const d = new Date(utms).toISOString().slice(0, 10);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [orders, fromDate, toDate]);

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">
              {lang === 'en' ? 'Reports & Business Analytics' : 'प्रतिवेदन तथा व्यापारिक विश्लेषण'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'en'
                ? 'Interactive reporting, date filters, role-governed financial statements, and printable reports.'
                : 'नाफा-नोक्सान हिसाब, दूध संकलन अडिट, बिक्री कारोबार तथा वित्तीय प्रतिवेदन'}
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>{lang === 'en' ? 'Print / PDF' : 'प्रिन्ट / पिडिएफ'}</span>
        </button>
      </div>

      {/* 2. Global Date Filter Bar & Presets */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs no-print flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            {lang === 'en' ? 'Date Filter:' : 'मिति छनौट:'}
          </span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg outline-none font-mono"
          />
          <span className="text-xs text-slate-400">{lang === 'en' ? 'to' : 'देखि'}</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg outline-none font-mono"
          />
          {(fromDate || toDate) && (
            <button
              onClick={handleResetFilter}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
            >
              {lang === 'en' ? 'Reset' : 'हटाउनुहोस्'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] text-slate-400 mr-1">{lang === 'en' ? 'Quick Range:' : 'छिटो छनौट:'}</span>
          <button
            onClick={() => handleSetQuickRange(0)}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {lang === 'en' ? 'Today' : 'आज'}
          </button>
          <button
            onClick={() => handleSetQuickRange(1)}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {lang === 'en' ? 'Yesterday' : 'हिजो'}
          </button>
          <button
            onClick={() => handleSetQuickRange(7)}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {lang === 'en' ? 'This Week' : 'यो हप्ता'}
          </button>
          <button
            onClick={() => handleSetQuickRange(30)}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {lang === 'en' ? 'This Month' : 'यो महिना'}
          </button>
          <button
            onClick={handleResetFilter}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {lang === 'en' ? 'All Time' : 'सबै'}
          </button>
        </div>
      </div>

      {/* 3. Report Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 no-print flex-wrap">
        <button
          onClick={() => setActiveReportTab('pnl')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeReportTab === 'pnl'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {lang === 'en' ? 'Overall Income & P&L Statement' : 'समग्र नाफा-नोक्सान हिसाब (P&L)'}
        </button>

        <button
          onClick={() => setActiveReportTab('milk')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeReportTab === 'milk'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {lang === 'en' ? 'Milk Collection Analysis' : 'दूध संकलन विश्लेषण'}
        </button>

        <button
          onClick={() => setActiveReportTab('sales')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeReportTab === 'sales'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {lang === 'en' ? 'Product Sales Breakdown' : 'उत्पादन बिक्री कारोबार विवरण'}
        </button>
      </div>

      {/* Print Organization Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h1 className="text-xl font-black text-slate-900">{tenant?.organizationName || (lang === 'en' ? 'Dairy Cooperative Ltd.' : 'डेरी सहकारी संस्था लि.')}</h1>
        <p className="text-xs text-slate-600">{tenant?.address}</p>
        <div className="text-sm font-bold text-emerald-800 mt-2">
          {activeReportTab === 'pnl' && (lang === 'en' ? 'Comprehensive Income & Profit/Loss Statement' : 'नाफा-नोक्सान हिसाब विवरण')}
          {activeReportTab === 'milk' && (lang === 'en' ? 'Milk Collection Audit Report' : 'दूध संकलन सारांश प्रतिवेदन')}
          {activeReportTab === 'sales' && (lang === 'en' ? 'Sales Revenue Audit Report' : 'बिक्री कारोबार अडिट प्रतिवेदन')}
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">{lang === 'en' ? 'Generated on' : 'तयार गरिएको मिति'}: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Tab 1: Comprehensive P&L Statement */}
      {activeReportTab === 'pnl' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                {lang === 'en' ? 'Comprehensive Income & P&L Statement' : 'विस्तृत आम्दानी तथा नाफा-नोक्सान विवरण'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'en' ? 'Operating revenue, cost of sales (COGS), and operating expenses' : 'कारोबार आम्दानी, प्रत्यक्ष खरिद लागत तथा सञ्चालन खर्चको वित्तीय हिसाब'}
              </p>
            </div>
            <div className={`text-right font-black text-lg ${
              (pL.netProfit || 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              {lang === 'en' ? 'Net Profit:' : 'खुद नाफा:'} {formatNepaliCurrency(pL.netProfit || 0)}
            </div>
          </div>

          <div className="space-y-6 text-xs">
            {/* 1. Operating Revenue */}
            <div>
              <h4 className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-2 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl">
                {lang === 'en' ? '1. Operating Revenue' : '१. कारोबार आम्दानी (Operating Revenue)'}
              </h4>
              <div className="space-y-1.5 px-3">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">{lang === 'en' ? 'Counter Retail & Wholesale Sales:' : 'काउन्टर खुद्रा तथा थोक बिक्री:'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{formatNepaliCurrency(pL.totalSalesRevenue || 0)}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 dark:text-slate-100 pt-1">
                  <span>{lang === 'en' ? 'Total Operating Revenue:' : 'कुल कारोबार आम्दानी:'}</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono">{formatNepaliCurrency(pL.totalSalesRevenue || 0)}</span>
                </div>
              </div>
            </div>

            {/* 2. Cost of Goods Sold (COGS) */}
            <div>
              <h4 className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-2 text-blue-800 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-xl">
                {lang === 'en' ? '2. Cost of Goods Sold (COGS)' : '२. प्रत्यक्ष बिक्री लागत (Cost of Goods Sold)'}
              </h4>
              <div className="space-y-1.5 px-3">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">{lang === 'en' ? 'Raw Milk Procurement Cost:' : 'कृषकबाट दूध खरिद खर्च:'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{formatNepaliCurrency(pL.totalMilkPurchaseCost || 0)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">{lang === 'en' ? 'Supplies & Packaging Purchases:' : 'आपूर्तिकर्ताबाट कच्चा पदार्थ तथा प्याकेजिङ:'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{formatNepaliCurrency(pL.totalSupplierPurchaseCost || 0)}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 dark:text-slate-100 pt-1">
                  <span>{lang === 'en' ? 'Total Cost of Goods Sold:' : 'कुल बिक्री लागत:'}</span>
                  <span className="text-rose-700 dark:text-rose-400 font-mono">-{formatNepaliCurrency(pL.costOfGoodsSold || 0)}</span>
                </div>
              </div>
            </div>

            {/* 3. Gross Operating Profit */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-black">
              <span>{lang === 'en' ? 'Gross Operating Profit:' : 'कुल सञ्चालन नाफा (Gross Profit):'}</span>
              <span className="text-emerald-700 dark:text-emerald-400 text-base font-mono">{formatNepaliCurrency(pL.grossProfit || 0)}</span>
            </div>

            {/* 4. Operating Expenses (OPEX) */}
            <div>
              <h4 className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-2 text-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-xl">
                {lang === 'en' ? '3. Operating Expenses (OPEX)' : '३. सञ्चालन तथा प्रशासनिक खर्च (Operating Expenses)'}
              </h4>
              <div className="space-y-1.5 px-3">
                {Object.entries(pL.expenseBreakdown || {}).map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">{cat}:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{formatNepaliCurrency(amt)}</span>
                  </div>
                ))}
                {Object.keys(pL.expenseBreakdown || {}).length === 0 && (
                  <div className="text-slate-400 py-1">{lang === 'en' ? 'No operating expenses recorded.' : 'कुनै सञ्चालन खर्च दर्ता भएको छैन ।'}</div>
                )}
                <div className="flex justify-between font-black text-slate-900 dark:text-slate-100 pt-1">
                  <span>{lang === 'en' ? 'Total Operating Expenses:' : 'जम्मा सञ्चालन खर्च:'}</span>
                  <span className="text-rose-700 dark:text-rose-400 font-mono">-{formatNepaliCurrency(pL.totalOperatingExpenses || 0)}</span>
                </div>
              </div>
            </div>

            {/* 5. Net Profit / Loss */}
            <div className={`p-4 rounded-2xl border-2 flex justify-between items-center text-base font-black ${
              (pL.netProfit || 0) >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {(pL.netProfit || 0) >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-rose-600" />}
                <span>{lang === 'en' ? 'NET PROFIT / (LOSS):' : 'खुद नाफा वा (नोक्सान):'}</span>
              </div>
              <span className="text-xl font-black font-mono">{formatNepaliCurrency(pL.netProfit || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Milk Collection Analysis */}
      {activeReportTab === 'milk' && (() => {
        const periodQty = filteredCollections.reduce((acc, c) => acc + (Number(c.quantity) || 0), 0);
        const wFat = periodQty > 0
          ? filteredCollections.reduce((acc, c) => acc + (Number(c.fat) || 0) * (Number(c.quantity) || 0), 0) / periodQty
          : 0;
        const wSnf = periodQty > 0
          ? filteredCollections.reduce((acc, c) => acc + (Number(c.snf) || 0) * (Number(c.quantity) || 0), 0) / periodQty
          : 0;

        return (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              {lang === 'en' ? 'Milk Collection & Leakage Audit Report' : 'दूध संकलन तथा चुहावट अडिट प्रतिवेदन'}
            </h3>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-300">
                {lang === 'en' ? 'Weighted Avg FAT/SNF:' : 'औसत फ्याट/एसएनएफ:'} {wFat.toFixed(2)}% / {wSnf.toFixed(2)}%
              </span>
              <span className="text-blue-700 dark:text-blue-400">
                {lang === 'en' ? 'Total Collected:' : 'जम्मा संकलन:'} {periodQty.toFixed(1)} {lang === 'en' ? 'Liters' : 'लिटर'}
              </span>
            </div>
          </div>

          {/* Mass Balance & Milk Leakage Audit Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500">{lang === 'en' ? 'Total Raw Input' : 'कुल काँचो दूध प्राप्ति'}</span>
              <div className="font-black text-blue-700 dark:text-blue-400 font-mono text-sm mt-0.5">
                {Number(leakage.totalRawInputLiters || periodQty || 0).toFixed(1)} L
              </div>
              <span className="text-[10px] text-slate-400">
                {lang === 'en' ? 'Col:' : 'संकलन:'} {Number(leakage.collectedRawMilkLiters || 0).toFixed(1)}L • {lang === 'en' ? 'Pur:' : 'खरिद:'} {Number(leakage.purchasedRawMilkLiters || 0).toFixed(1)}L
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500">{lang === 'en' ? 'Processing & Storage Loss' : 'प्रशोधन तथा भण्डारण चुहावट'}</span>
              <div className="font-black text-rose-600 dark:text-rose-400 font-mono text-sm mt-0.5">
                {Number(leakage.totalMilkLeakageLiters || 0).toFixed(1)} L ({Number(leakage.leakageRatePercentage || 0).toFixed(2)}%)
              </div>
              <span className="text-[10px] text-slate-400">
                {lang === 'en' ? 'Proc:' : 'प्रशोधन:'} {Number(leakage.processingLeakageLiters || 0).toFixed(1)}L • {lang === 'en' ? 'Vat:' : 'भण्डारण:'} {Number(leakage.storageWastageRawLiters || 0).toFixed(1)}L
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500">{lang === 'en' ? 'Raw Stock (Exp vs Act)' : 'मौज्दात (अपेक्षित / वास्तविक)'}</span>
              <div className="font-black text-slate-800 dark:text-slate-100 font-mono text-sm mt-0.5">
                {Number(leakage.expectedRawStockLiters || 0).toFixed(1)} L / {Number(leakage.actualRawStockLiters || 0).toFixed(1)} L
              </div>
              <span className="text-[10px] text-slate-400">
                {lang === 'en' ? 'Processed:' : 'प्रशोधन:'} {Number(leakage.processedRawMilkLiters || 0).toFixed(1)}L • {lang === 'en' ? 'Sold:' : 'बिक्री:'} {Number(leakage.rawMilkSoldLiters || 0).toFixed(1)}L
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500">{lang === 'en' ? 'Unaccounted Variance' : 'अमिलदो फरक (चुहावट)'}</span>
              <div className={`font-black font-mono text-sm mt-0.5 ${Math.abs(Number(leakage.unaccountedVarianceLiters || 0)) > 0.05 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {Number(leakage.unaccountedVarianceLiters || 0).toFixed(2)} L
              </div>
              <span className="text-[10px] text-slate-400">
                {Math.abs(Number(leakage.unaccountedVarianceLiters || 0)) <= 0.05 ? (lang === 'en' ? 'Mass balance reconciled' : 'हिसाब मिलान ठीक छ') : (lang === 'en' ? 'Check tank calibration' : 'मौज्दात जाँच गर्नुहोस्')}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">{lang === 'en' ? 'Date' : 'मिति'}</th>
                  <th className="py-2.5 px-3">{lang === 'en' ? 'Farmer' : 'कृषक'}</th>
                  <th className="py-2.5 px-3 text-center">{lang === 'en' ? 'Shift' : 'शिफ्ट'}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Quantity' : 'परिमाण'}</th>
                  <th className="py-2.5 px-3 text-right">FAT %</th>
                  <th className="py-2.5 px-3 text-right">SNF %</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Rate' : 'दर'}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Total Amount' : 'कुल रकम'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCollections.map(col => (
                  <tr key={col.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 text-slate-500 font-mono">{new Date(col.dateTimeUtms).toLocaleDateString()}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-100">
                      {lang === 'en' ? (col.farmer?.nameInEnglish || col.farmer?.nameInNepali) : (col.farmer?.nameInNepali || col.farmer?.nameInEnglish || 'कृषक')}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        col.shift === 0 ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {col.shift === 0 ? (lang === 'en' ? 'Morning' : 'बिहानी') : (lang === 'en' ? 'Evening' : 'बेलुकी')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-black text-blue-700 dark:text-blue-400 font-mono">
                      {Number(col.quantity || 0).toFixed(1)} {lang === 'en' ? 'L' : 'लिटर'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">{Number(col.fat || 0).toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">{Number(col.snf || 0).toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">{formatNepaliCurrency(col.rate || 0)}</td>
                    <td className="py-2 px-3 text-right font-black text-emerald-700 dark:text-emerald-400 font-mono">{formatNepaliCurrency(col.totalPrice || col.amount || 0)}</td>
                  </tr>
                ))}

                {filteredCollections.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      {lang === 'en' ? 'No milk collections found.' : 'कुनै दूध संकलन भेटिएन ।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {/* Tab 3: Sales Report */}
      {activeReportTab === 'sales' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              {lang === 'en' ? 'Product Sales Revenue Audit' : 'बिक्री कारोबार अडिट प्रतिवेदन'}
            </h3>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {lang === 'en' ? 'Total Revenue:' : 'कुल कारोबार:'} {formatNepaliCurrency(filteredOrders.reduce((acc, o) => acc + Number(o.netAmount ?? o.totalAmount ?? 0), 0))}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">{lang === 'en' ? 'Invoice #' : 'बिल नं.'}</th>
                  <th className="py-2.5 px-3">{lang === 'en' ? 'Date' : 'मिति'}</th>
                  <th className="py-2.5 px-3">{lang === 'en' ? 'Customer' : 'ग्राहक'}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Total Amount' : 'कुल रकम'}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Paid' : 'प्राप्त रकम'}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'en' ? 'Due' : 'बाँकी बक्यौता'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.map(o => {
                  const total = Number(o.netAmount ?? o.totalAmount ?? 0);
                  const paid = Number(o.totalPaid ?? o.paidAmount ?? 0);
                  const due = Math.max(0, Number(o.remainingAmount ?? (total - paid)));

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-2 px-3 font-mono font-bold text-sky-700 dark:text-sky-400">#{o.orderNumber || o.id}</td>
                      <td className="py-2 px-3 text-slate-500 font-mono">{new Date(o.orderDateUtms || o.orderDateTimeUtms || Date.now()).toLocaleDateString()}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-100">{o.customerName || (lang === 'en' ? 'Walk-in Customer' : 'काउन्टर ग्राहक')}</td>
                      <td className="py-2 px-3 text-right font-black text-slate-800 dark:text-slate-100 font-mono">{formatNepaliCurrency(total)}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400 font-mono">{formatNepaliCurrency(paid)}</td>
                      <td className="py-2 px-3 text-right font-bold font-mono">
                        {due > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">{formatNepaliCurrency(due)}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">{formatNepaliCurrency(0)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {lang === 'en' ? 'No sales records found.' : 'कुनै बिक्री कारोबार भेटिएन ।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
