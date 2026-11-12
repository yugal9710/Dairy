import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Edit,
  TrendingUp,
  Receipt,
  Calculator,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { preventNegativeKey, nonNegativeValue } from '../../utils/numberInput';

export default function FatSnfPricingManager({
  config,
  onOpenEditModal
}) {
  const { lang, t } = useLanguage();

  // Interactive Test Calculator
  const [testFat, setTestFat] = useState('4.5');
  const [testSnf, setTestSnf] = useState('8.2');
  const [testQty, setTestQty] = useState('10');

  const buyingFat = Number(config?.buyingFatPrice || 7.50);
  const buyingSnf = Number(config?.buyingSnfPrice || 4.00);
  const sellingFat = Number(config?.sellingFatPrice || 9.00);
  const sellingSnf = Number(config?.sellingSnfPrice || 5.00);
  const retailPrice = Number(config?.sellingPrice || 90.00);

  const calculatedRate = (Number(testFat || 0) * buyingFat + Number(testSnf || 0) * buyingSnf).toFixed(2);
  const calculatedTotal = (Number(calculatedRate) * Number(testQty || 0)).toFixed(2);

  const lastUpdated = config?.lastTimeUpdatedUtms
    ? new Date(config.lastTimeUpdatedUtms).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Default System Baseline';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {lang === 'en' ? 'FAT & SNF Pricing Master' : 'फ्याट तथा एस.एन.एफ. दर व्यवस्थापन'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {lang === 'en'
              ? 'Milk procurement from farmers and retail sales price formula based on FAT and SNF test units'
              : 'कृषकबाट खरिद गरिने तथा बिक्री गरिने दूधको फ्याट र एस.एन.एफ. दर तथा मूल्य सूत्र व्यवस्थापन'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenEditModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-amber-600/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Edit className="w-4 h-4" />
          <span>{lang === 'en' ? 'Edit Rate Configuration' : 'दर सम्पादन गर्नुहोस्'}</span>
        </button>
      </div>

      {/* 2 Main Rate Sections: Farmer Buying Rates vs Market Selling Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 1: Farmer Buying Rates (Procurement) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {lang === 'en' ? 'Procurement Rates' : 'खरिद दर (कृषक आपूर्तिकर्ता)'}
              </span>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                {lang === 'en' ? 'Farmer Milk Purchase' : 'दूध संकलन खरिद दर'}
              </h3>
            </div>
            <div className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800/60">
              {lang === 'en' ? 'Active Inward' : 'सक्रिय खरिद'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Buying FAT */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">
                {lang === 'en' ? 'Buying FAT Rate' : 'खरिद फ्याट दर'}
              </span>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                रु {buyingFat.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                {lang === 'en' ? 'per 1.0% FAT / Lit.' : 'प्रति १.०% फ्याट / लिटर'}
              </span>
            </div>

            {/* Buying SNF */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">
                {lang === 'en' ? 'Buying SNF Rate' : 'खरिद एस.एन.एफ. दर'}
              </span>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                रु {buyingSnf.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                {lang === 'en' ? 'per 1.0% SNF / Lit.' : 'प्रति १.०% एस.एन.एफ. / लिटर'}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300">
            <strong>{lang === 'en' ? 'Rate Formula:' : 'मूल्य निर्धारण सूत्र:'}</strong>{' '}
            <code className="font-mono font-bold bg-white/70 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              Rate = (FAT × {buyingFat.toFixed(2)}) + (SNF × {buyingSnf.toFixed(2)})
            </code>
          </div>
        </div>

        {/* Section 2: Retail Selling & Outward Rates */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {lang === 'en' ? 'Sales Rates' : 'बिक्री दर (खुद्रा तथा थोक)'}
              </span>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                {lang === 'en' ? 'Wholesale & Retail Sales' : 'दूध खुद्रा तथा बिक्री दर'}
              </h3>
            </div>
            <div className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800/60">
              {lang === 'en' ? 'Active Outward' : 'सक्रिय बिक्री'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Selling FAT */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                {lang === 'en' ? 'Selling FAT' : 'बिक्री फ्याट'}
              </span>
              <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                रु {sellingFat.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">/ 1% FAT</span>
            </div>

            {/* Selling SNF */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                {lang === 'en' ? 'Selling SNF' : 'बिक्री एस.एन.एफ.'}
              </span>
              <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                रु {sellingSnf.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">/ 1% SNF</span>
            </div>

            {/* Retail Selling Price */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                {lang === 'en' ? 'Standard Retail' : 'खुद्रा दर'}
              </span>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                रु {retailPrice.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">/ Lit. Base</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {lang === 'en' ? 'Last Updated:' : 'पछिल्लो परिवर्तन:'}
            </span>
            <strong className="text-slate-700 dark:text-slate-200 font-mono">{lastUpdated}</strong>
          </div>
        </div>
      </div>

      {/* Interactive Rate Testing Calculator */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
            {lang === 'en' ? 'Instant Milk Price Simulator' : 'प्रत्यक्ष दर तथा रकम क्याल्कुलेटर'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {lang === 'en' ? 'Test FAT %' : 'परीक्षण फ्याट %'}
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={testFat}
              onKeyDown={preventNegativeKey}
              onChange={(e) => setTestFat(nonNegativeValue(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {lang === 'en' ? 'Test SNF %' : 'परीक्षण एस.एन.एफ. %'}
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={testSnf}
              onKeyDown={preventNegativeKey}
              onChange={(e) => setTestSnf(nonNegativeValue(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {lang === 'en' ? 'Quantity (Liters)' : 'मात्रा (लिटर)'}
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={testQty}
              onKeyDown={preventNegativeKey}
              onChange={(e) => setTestQty(nonNegativeValue(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60">
            <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
              {lang === 'en' ? 'Rate / Liter' : 'प्रति लिटर दर'}: <span className="font-black text-sm">रु {calculatedRate}</span>
            </div>
            <div className="text-base font-black text-indigo-900 dark:text-indigo-200 mt-0.5">
              {lang === 'en' ? 'Total' : 'जम्मा'}: रु {calculatedTotal}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
