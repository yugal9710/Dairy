import React from 'react';
import {
  Milk,
  Receipt,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  ArrowUpRight,
  AlertTriangle
} from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';

export default function DairyDashboard({
  analytics,
  cashBank,
  inventorySummary = [],
  recentCollections = [],
  recentOrders = [],
  onNavigateTab,
  onOpenAddMilk,
  onOpenPos,
  onOpenRecordExpense,
  onOpenFarmerPayment,
  onInspectFarmer
}) {
  const { lang, t } = useLanguage();
  const pL = analytics?.profitLoss || {};
  const lowStockCount = inventorySummary.filter(i => i.isLowStock).length;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-slate-800 leading-tight">
            {t('dashboardTitle')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('dashboardSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAddMilk}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-3.5 h-3.5" /> {t('btnRecordMilk')}
          </button>
          <button
            onClick={onOpenPos}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-600/20"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> {t('btnPosSale')}
          </button>
          <button
            onClick={onOpenFarmerPayment}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-xl text-xs border border-teal-200 transition"
          >
            <Receipt className="w-3.5 h-3.5" /> {t('btnFarmerPayment')}
          </button>
          <button
            onClick={onOpenRecordExpense}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            {t('btnRecordExpense')}
          </button>
        </div>
      </div>

      {/* 6 Core KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Today's Total Milk Collection */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('kpiTotalMilk')}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Milk className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {analytics?.totalMilkCollectedLiters?.toFixed(1) || '0.0'} <span className="text-xs font-semibold text-slate-500">{lang === 'en' ? 'L' : 'लिटर'}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{t('morning')}: {analytics?.morningMilkLiters?.toFixed(0) || '0'} L</span>
            <span>{t('evening')}: {analytics?.eveningMilkLiters?.toFixed(0) || '0'} L</span>
          </div>
        </div>

        {/* 2. Total Instant Sales Turnover */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('kpiSalesTurnover')}</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-indigo-700">
            {formatNepaliCurrency(pL.totalSalesRevenue || 0)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3 h-3" /> {lang === 'en' ? 'Counter & Wholesale' : 'काउन्टर तथा थोक बिक्री'}
          </div>
        </div>

        {/* 3. Farmer Payables (Pending Milk Settlement) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('kpiFarmerPayables')}</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-teal-800">
            {formatNepaliCurrency(analytics?.totalFarmerPayables || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {lang === 'en' ? 'Pending for milk supply' : 'दूध आपूर्ति बापत तिर्न बाँकी'}
          </div>
        </div>

        {/* 4. Customer Receivables */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('kpiCustomerReceivables')}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-700">
            {formatNepaliCurrency(analytics?.totalCustomerReceivables || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {lang === 'en' ? 'Pending customer credit' : 'उधारो बिक्री असुल उपर हुन बाँकी'}
          </div>
        </div>

        {/* 5. Liquid Funds (Cash + Bank) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('kpiLiquidFunds')}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700">
            {formatNepaliCurrency(cashBank?.totalBalance || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex justify-between gap-2">
            <span>{t('cash')}: {formatNepaliCurrency(cashBank?.cashBalance || 0)}</span>
            <span>{t('bank')}: {formatNepaliCurrency(cashBank?.bankBalance || 0)}</span>
          </div>
        </div>

        {/* 6. Net Profit / (Loss) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('kpiNetProfit')}</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              (pL.netProfit || 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-black ${
            (pL.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {formatNepaliCurrency(pL.netProfit || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {lang === 'en' ? 'After operating expenses' : 'सञ्चालन खर्च घटाइसकेपछिको'}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Milk Deliveries & Quick POS Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Milk Collections Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{t('recentMilkTitle')}</h3>
              <p className="text-xs text-slate-500">{t('recentMilkSubtitle')}</p>
            </div>
            <button
              onClick={() => onNavigateTab('milk-collection')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              {t('viewAll')} <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">{t('farmer')}</th>
                  <th className="py-2.5 px-3">{t('shift')}</th>
                  <th className="py-2.5 px-3 text-right">{t('quantity')}</th>
                  <th className="py-2.5 px-3 text-right">FAT / SNF</th>
                  <th className="py-2.5 px-3 text-right">{t('amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCollections.slice(0, 5).map((col) => (
                  <tr key={col.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      <button
                        type="button"
                        onClick={() => onInspectFarmer && (col.farmer || col.farmerId) && onInspectFarmer(col.farmer || { id: col.farmerId, code: col.farmer?.code || col.farmerId }, 'all')}
                        className={`text-left group ${onInspectFarmer ? 'cursor-pointer hover:text-emerald-700' : ''}`}
                        title={lang === 'en' ? 'Click to view complete farmer profile & activity history' : 'कृषक प्रोफाइल तथा कारोबार इतिहास हेर्नुहोस्'}
                      >
                        <span className="group-hover:underline">
                          {lang === 'en' ? (col.farmer?.nameInEnglish || col.farmer?.nameInNepali) : (col.farmer?.nameInNepali || col.farmer?.nameInEnglish || 'कृषक')}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">#{col.farmer?.code || col.farmerId}</span>
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        col.shift === 0 ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {col.shift === 0 ? t('morning') : t('evening')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-blue-700">{col.quantity} {lang === 'en' ? 'L' : 'लिटर'}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{col.fat}% / {col.snf}%</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatNepaliCurrency(col.totalPrice)}</td>
                  </tr>
                ))}
                {recentCollections.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                      {t('emptyCollections')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Instant Sales Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{t('recentSalesTitle')}</h3>
              <p className="text-xs text-slate-500">{t('recentSalesSubtitle')}</p>
            </div>
            <button
              onClick={() => onNavigateTab('pos-sales')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              {t('viewAll')} <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">{t('thBillNo')}</th>
                  <th className="py-2.5 px-3">{t('thCustomer')}</th>
                  <th className="py-2.5 px-3 text-center">{t('lblPaymentMode')}</th>
                  <th className="py-2.5 px-3 text-right">{t('netTotal')}</th>
                  <th className="py-2.5 px-3 text-right">{t('dueAmount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.slice(0, 5).map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-3 font-mono font-bold text-slate-700">#{ord.id}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {ord.customerName || (lang === 'en' ? (ord.customer?.nameInEnglish || ord.customer?.nameInNepali) : (ord.customer?.nameInNepali || ord.customer?.nameInEnglish)) || t('walkInCustomer')}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        ord.paymentMethod === 0 ? 'bg-emerald-100 text-emerald-800' :
                        ord.paymentMethod === 2 ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {ord.paymentMethod === 0 ? t('cash') : ord.paymentMethod === 2 ? 'Fonepay' : t('bank')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-800">
                      {formatNepaliCurrency(ord.netAmount ?? ord.totalAmount)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold">
                      {Number(ord.remainingAmount) > 0 ? (
                        <span className="text-rose-600">{formatNepaliCurrency(ord.remainingAmount)} {lang === 'en' ? 'Due' : 'बाँकी'}</span>
                      ) : (
                        <span className="text-emerald-600">{t('settled')}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                      {lang === 'en' ? 'No sales recorded.' : 'कुनै बिक्री भेटिएन ।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Inventory Stock Warning Bar */}
      {lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-900">
                {lowStockCount} {t('lowStockNotice')}
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                {t('lowStockDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('inventory')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition"
          >
            {t('btnViewStock')}
          </button>
        </div>
      )}
    </div>
  );
}
