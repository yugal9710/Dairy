import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Building,
  RotateCcw,
  Trash2,
  Receipt,
  CheckCircle,
  AlertTriangle,
  X,
  CreditCard,
  Search
} from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';
import { preventNegativeKey, nonNegativeValue } from '../../utils/numberInput';

export default function FinanceManager({
  cashBank,
  ledger = [],
  expenses = [],
  customers = [],
  onRefresh
}) {
  const { lang, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState('ledger'); // 'ledger', 'receipts', 'disbursements', 'expenses'
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [paymentInModalOpen, setPaymentInModalOpen] = useState(false);
  const [paymentOutModalOpen, setPaymentOutModalOpen] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState('all'); // 'all', 'Cash', 'Bank'

  // Expense Form State
  const [category, setCategory] = useState('Electricity');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState(0); // 0: Cash, 1: Cheque, 2: Bank
  const [recipient, setRecipient] = useState('');
  const [expenseRef, setExpenseRef] = useState('');
  const [expenseRemarks, setExpenseRemarks] = useState('');

  // Payment In Form State
  const [payInCustId, setPayInCustId] = useState('');
  const [payInAmount, setPayInAmount] = useState('');
  const [payInMethod, setPayInMethod] = useState(2); // 2: Bank / Fonepay
  const [payInRef, setPayInRef] = useState('');
  const [payInRemarks, setPayInRemarks] = useState('');

  // Disbursement (Payment Out) Form State
  const [payOutRecipient, setPayOutRecipient] = useState('');
  const [payOutCategory, setPayOutCategory] = useState('Farmer Settlement');
  const [payOutAmount, setPayOutAmount] = useState('');
  const [payOutMethod, setPayOutMethod] = useState(0); // 0: Cash
  const [payOutRef, setPayOutRef] = useState('');
  const [payOutRemarks, setPayOutRemarks] = useState('');

  const [loading, setLoading] = useState(false);

  // Executive KPI summary calculations
  const cashBalance = Number(cashBank?.cashBalance || 0);
  const bankBalance = Number(cashBank?.bankBalance || 0);
  const totalBalance = Number(cashBank?.totalBalance || (cashBalance + bankBalance));

  const totalExpensesAmount = useMemo(() => {
    return expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseAmount || Number(expenseAmount) <= 0 || !recipient.trim()) {
      alert(lang === 'en' ? 'Please enter expense amount and recipient.' : 'कृपया रकम र भुक्तानी पाउनेको नाम प्रविष्ट गर्नुहोस् ।');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/Finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          amount: Number(expenseAmount),
          paymentMethod: Number(expensePaymentMethod),
          recipient,
          referenceNumber: expenseRef || `EXP-${Date.now().toString().slice(-6)}`,
          remarks: expenseRemarks
        })
      });

      if (res.ok) {
        setExpenseModalOpen(false);
        setExpenseAmount('');
        setRecipient('');
        setExpenseRemarks('');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentIn = async (e) => {
    e.preventDefault();
    if (!payInCustId || !payInAmount || Number(payInAmount) <= 0) {
      alert(lang === 'en' ? 'Please select customer and enter amount.' : 'कृपया ग्राहक र रकम छान्नुहोस् ।');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/Finance/payments-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: Number(payInCustId),
          amount: Number(payInAmount),
          paymentMethod: Number(payInMethod),
          referenceNumber: payInRef || `RCPT-${Date.now().toString().slice(-6)}`,
          remarks: payInRemarks
        })
      });

      if (res.ok) {
        setPaymentInModalOpen(false);
        setPayInCustId('');
        setPayInAmount('');
        setPayInRemarks('');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDisbursement = async (e) => {
    e.preventDefault();
    if (!payOutRecipient.trim() || !payOutAmount || Number(payOutAmount) <= 0) {
      alert(lang === 'en' ? 'Please enter recipient and valid amount.' : 'कृपया भुक्तानी पाउनेको नाम र मान्य रकम प्रविष्ट गर्नुहोस् ।');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/Finance/disbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: payOutRecipient,
          category: payOutCategory,
          amount: Number(payOutAmount),
          paymentMethod: Number(payOutMethod),
          referenceNumber: payOutRef || `DISB-${Date.now().toString().slice(-6)}`,
          remarks: payOutRemarks
        })
      });

      if (res.ok) {
        setPaymentOutModalOpen(false);
        setPayOutRecipient('');
        setPayOutAmount('');
        setPayOutRemarks('');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    const confirmMsg = lang === 'en' ? 'Are you sure you want to delete this expense record?' : 'के तपाईं यो खर्च मेटाउन निश्चित हुनुहुन्छ?';
    if (!confirm(confirmMsg)) return;
    try {
      const res = await fetch(`/api/Finance/expenses/${id}`, { method: 'DELETE' });
      if (res.ok && onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Ledger Entries
  const filteredLedger = useMemo(() => {
    return ledger.filter(item => {
      if (accountFilter !== 'all') {
        const isCash = item.accountType === 1 || item.accountType === 'Cash' || item.account === 'Cash';
        if (accountFilter === 'Cash' && !isCash) return false;
        if (accountFilter === 'Bank' && isCash) return false;
      }
      if (ledgerSearch) {
        const q = ledgerSearch.toLowerCase().trim();
        const desc = (item.description || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        const ref = (item.referenceNumber || '').toLowerCase();
        return desc.includes(q) || cat.includes(q) || ref.includes(q);
      }
      return true;
    });
  }, [ledger, accountFilter, ledgerSearch]);

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">
              {lang === 'en' ? 'Finance, Cash & Bank Ledgers' : 'वित्त, नगद तथा बैंक खाता लेजर'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'en'
                ? 'Track customer receipts, farmer & supplier disbursements, operational expenses, and maintain separate cash and bank ledgers.'
                : 'ग्राहकबाट संकलित रकम, आपूर्तिकर्ता भुक्तानी, दैनिक सञ्चालन खर्च तथा नगद र बैंक खाता लेजर'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{lang === 'en' ? 'Refresh' : 'ताजा'}</span>
          </button>

          <button
            onClick={() => setPaymentInModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>{lang === 'en' ? 'Customer Receipt' : 'ग्राहकबाट प्राप्त'}</span>
          </button>

          <button
            onClick={() => setPaymentOutModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{lang === 'en' ? 'Disbursement' : 'भुक्तानी निकासी'}</span>
          </button>

          <button
            onClick={() => setExpenseModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-rose-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'en' ? 'Record Expense' : 'खर्च दर्ता'}</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Cash in Hand */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-emerald-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Cash in Hand' : 'नगद मौज्दात'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                {formatNepaliCurrency(cashBalance)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Liquid cash at counter' : 'काउन्टरमा रहेको तरल नगद'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 2: Bank Account */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-blue-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Bank Account' : 'बैंक मौज्दात'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400 mt-1 font-mono">
                {formatNepaliCurrency(bankBalance)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Bank deposits' : 'सहकारीको बैंक खाता मौज्दात'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 3: Total Liquidity */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-indigo-600 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Total Liquidity' : 'कुल तरल मौज्दात'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1 font-mono">
                {formatNepaliCurrency(totalBalance)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Combined cash & bank' : 'नगद र बैंकको जम्मा योग'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 4: Operating Expenses */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-rose-500 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Operating Expenses' : 'सञ्चालन खर्च'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-1 font-mono">
                {formatNepaliCurrency(totalExpensesAmount)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {lang === 'en' ? 'Administrative OPEX' : 'दैनिक प्रशासनिक खर्च'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sub-Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap">
        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'ledger'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>{lang === 'en' ? 'Cash & Bank Ledger' : 'नगद तथा बैंक खाता लेजर'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'expenses'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{lang === 'en' ? 'Operating Expenses' : 'सञ्चालन खर्च विवरण'}</span>
          {expenses.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {expenses.length}
            </span>
          )}
        </button>
      </div>

      {/* 4. Tab 1 Content: Cash & Bank Ledger */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Search ledger description, category...' : 'विवरण वा शीर्षक खोज्नुहोस्...'}
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-semibold"
              >
                <option value="all">{lang === 'en' ? 'All Accounts' : 'सबै खाता (Cash & Bank)'}</option>
                <option value="Cash">{lang === 'en' ? 'Cash in Hand Only' : 'नगद खाता मात्र'}</option>
                <option value="Bank">{lang === 'en' ? 'Bank Account Only' : 'बैंक खाता मात्र'}</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'en' ? 'Showing' : 'जम्मा'} <strong className="text-slate-800 dark:text-slate-200">{filteredLedger.length}</strong> {lang === 'en' ? 'ledger transactions' : 'कारोबारहरू'}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">{lang === 'en' ? 'Date & Time' : 'मिति र समय'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Account' : 'खाता'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Type' : 'प्रकार'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Amount' : 'रकम'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Balance After' : 'मौज्दात रकम'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Category' : 'शीर्षक'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Ref #' : 'भौचर नं.'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Description' : 'विवरण'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLedger.map((entry, idx) => {
                  const isIn = entry.transactionType === 1 || entry.transactionType === 'In' || entry.type === 'In';
                  const isCashAcct = entry.accountType === 1 || entry.accountType === 'Cash' || entry.account === 'Cash';
                  const amt = Math.abs(Number(entry.amount || 0));

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        {entry.transactionDateUtms ? new Date(entry.transactionDateUtms).toLocaleString() : (entry.date || '-')}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCashAcct
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}>
                          {isCashAcct ? (lang === 'en' ? 'Cash' : 'नगद') : (lang === 'en' ? 'Bank' : 'बैंक')}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isIn
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'
                        }`}>
                          {isIn ? '+ In' : '- Out'}
                        </span>
                      </td>

                      <td className={`py-2.5 px-4 text-right font-black font-mono ${
                        isIn ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {formatNepaliCurrency(amt)}
                      </td>

                      <td className="py-2.5 px-4 text-right font-bold font-mono text-slate-800 dark:text-slate-200">
                        {formatNepaliCurrency(entry.balanceAfter || entry.runningBalance || 0)}
                      </td>

                      <td className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {entry.category || '-'}
                      </td>

                      <td className="py-2.5 px-4 font-mono text-slate-500">
                        {entry.referenceNumber || entry.refNo || '-'}
                      </td>

                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 truncate max-w-xs">
                        {entry.description || '-'}
                      </td>
                    </tr>
                  );
                })}

                {filteredLedger.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      {lang === 'en' ? 'No ledger transactions recorded.' : 'कुनै लेजर कारोबार भेटिएन ।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab 2 Content: Operating Expenses */}
      {activeSubTab === 'expenses' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              {lang === 'en' ? 'Operating Expenses Ledger' : 'सञ्चालन खर्च सूची'}
            </h3>

            <button
              onClick={() => setExpenseModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'en' ? 'Record Expense' : 'खर्च दर्ता गर्नुहोस्'}</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">{lang === 'en' ? 'Date' : 'मिति'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Category' : 'खर्च शीर्षक'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Amount' : 'रकम'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Paid From' : 'माध्यम'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Recipient / Vendor' : 'भुक्तानी पाउने'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Ref #' : 'बिल नं.'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Remarks' : 'कैफियत'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'en' ? 'Action' : 'कार्य'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
                      {exp.expenseDateUtms ? new Date(exp.expenseDateUtms).toLocaleDateString() : (exp.date || '-')}
                    </td>

                    <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                      {exp.category}
                    </td>

                    <td className="py-2.5 px-4 text-right font-black text-rose-600 dark:text-rose-400 font-mono">
                      {formatNepaliCurrency(exp.amount)}
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {exp.paymentMethod === 0 ? '💵 Cash' : exp.paymentMethod === 1 ? '🏛️ Cheque' : '📱 Bank/Online'}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {exp.recipient}
                    </td>

                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {exp.referenceNumber || '-'}
                    </td>

                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 truncate max-w-xs">
                      {exp.remarks || '-'}
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                        title={lang === 'en' ? 'Delete' : 'मेटाउनुहोस्'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      {lang === 'en' ? 'No expenses recorded.' : 'कुनै खर्च दर्ता गरिएको छैन ।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Record Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {lang === 'en' ? 'Record Operating Expense' : 'दैनिक सञ्चालन खर्च दर्ता'}
                </h3>
              </div>
              <button onClick={() => setExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Expense Category' : 'खर्च शीर्षक'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-rose-500 outline-none font-semibold"
                >
                  <option value="Electricity">{lang === 'en' ? 'Electricity & Power' : 'विद्युत महसुल'}</option>
                  <option value="Rent">{lang === 'en' ? 'Facility Rent' : 'घरभाडा'}</option>
                  <option value="Transport">{lang === 'en' ? 'Fuel & Transportation' : 'इन्धन तथा ढुवानी'}</option>
                  <option value="Packaging">{lang === 'en' ? 'Packaging Pouches & Bottles' : 'प्याकेजिङ सामग्री'}</option>
                  <option value="Reagents">{lang === 'en' ? 'Laboratory Chemicals & Testing' : 'प्रयोगशाला परीक्षण'}</option>
                  <option value="Repairs">{lang === 'en' ? 'Repairs & Machinery Maintenance' : 'मेशिन मर्मत सम्भार'}</option>
                  <option value="Wages">{lang === 'en' ? 'Daily Staff Wages' : 'ज्यालादारी तलब'}</option>
                  <option value="Other">{lang === 'en' ? 'Other Miscellaneous' : 'अन्य विविध खर्च'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Amount (रू)' : 'खर्च रकम (रू)'}
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="0.00"
                  value={expenseAmount}
                  onKeyDown={preventNegativeKey}
                  onChange={(e) => setExpenseAmount(nonNegativeValue(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-extrabold border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-rose-500 outline-none font-mono text-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Paid To (Recipient / Vendor)' : 'भुक्तानी पाउने (व्यक्ति वा संस्था)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NEA / Vehicle Driver"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Payment Method' : 'भुक्तानी माध्यम'}
                </label>
                <select
                  value={expensePaymentMethod}
                  onChange={(e) => setExpensePaymentMethod(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-semibold"
                >
                  <option value={0}>💵 Cash (काउन्टर नगदबाट)</option>
                  <option value={2}>📱 Online / Bank (बैंक खाताबाट)</option>
                  <option value={1}>🏛️ Cheque (चेकबाट)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Bill / Reference #' : 'बिल वा रसिद नं.'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. BILL-9821"
                  value={expenseRef}
                  onChange={(e) => setExpenseRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Remarks / Description' : 'कैफियत'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. Monthly electricity bill' : 'जस्तै: असोज महिनाको विद्युत महसुल'}
                  value={expenseRemarks}
                  onChange={(e) => setExpenseRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {lang === 'en' ? 'Cancel' : 'रद्द'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20"
                >
                  {loading ? (lang === 'en' ? 'Saving...' : 'सुरक्षित गर्दै...') : (lang === 'en' ? 'Save Expense' : 'खर्च सुरक्षित गर्नुहोस्')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Customer Receipt (Payment In) Modal */}
      {paymentInModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {lang === 'en' ? 'Record Customer Receipt' : 'ग्राहकबाट रकम असुली (रसिद)'}
                </h3>
              </div>
              <button onClick={() => setPaymentInModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentIn} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Select Customer' : 'ग्राहक छनौट'}
                </label>
                <select
                  value={payInCustId}
                  onChange={(e) => setPayInCustId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
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
                  {lang === 'en' ? 'Receipt Amount (रू)' : 'प्राप्त रकम (रू)'}
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="0.00"
                  value={payInAmount}
                  onKeyDown={preventNegativeKey}
                  onChange={(e) => setPayInAmount(nonNegativeValue(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-extrabold border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Receipt Method' : 'प्राप्ति माध्यम'}
                </label>
                <select
                  value={payInMethod}
                  onChange={(e) => setPayInMethod(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-semibold"
                >
                  <option value={0}>💵 Cash (नगद)</option>
                  <option value={2}>📱 Online / Bank / Fonepay (बैंक वा फोनपे)</option>
                  <option value={1}>🏛️ Cheque (चेक)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Reference #' : 'भौचर वा कारोबार नं.'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. FONEPAY-9921"
                  value={payInRef}
                  onChange={(e) => setPayInRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Remarks' : 'कैफियत'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. Milk billing settlement' : 'जस्तै: बक्यौता हिसाब चुक्ता'}
                  value={payInRemarks}
                  onChange={(e) => setPayInRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentInModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {lang === 'en' ? 'Cancel' : 'रद्द'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20"
                >
                  {loading ? (lang === 'en' ? 'Saving...' : 'सुरक्षित गर्दै...') : (lang === 'en' ? 'Record Receipt' : 'रकम दर्ता गर्नुहोस्')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Disbursement (Payment Out) Modal */}
      {paymentOutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {lang === 'en' ? 'Disbursement (Payment Out)' : 'रकम भुक्तानी निकासी दर्ता'}
                </h3>
              </div>
              <button onClick={() => setPaymentOutModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDisbursement} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Disbursement Category' : 'भुक्तानी शीर्षक'}
                </label>
                <select
                  value={payOutCategory}
                  onChange={(e) => setPayOutCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-semibold"
                >
                  <option value="Farmer Settlement">{lang === 'en' ? 'Farmer Settlement' : 'कृषक दूध हिसाब मिलान'}</option>
                  <option value="Supplier Payment">{lang === 'en' ? 'Supplier Payment' : 'आपूर्तिकर्ता भुक्तानी'}</option>
                  <option value="Advance Payment">{lang === 'en' ? 'Advance Payment' : 'अग्रिम पेश्की'}</option>
                  <option value="Other Disbursement">{lang === 'en' ? 'Other Disbursement' : 'अन्य निकासी'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Recipient (Farmer / Supplier)' : 'भुक्तानी पाउने व्यक्ति वा संस्था'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ram Bahadur Thapa"
                  value={payOutRecipient}
                  onChange={(e) => setPayOutRecipient(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Amount (रू)' : 'भुक्तानी रकम (रू)'}
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="0.00"
                  value={payOutAmount}
                  onKeyDown={preventNegativeKey}
                  onChange={(e) => setPayOutAmount(nonNegativeValue(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-extrabold border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Payment Method' : 'भुक्तानी माध्यम'}
                </label>
                <select
                  value={payOutMethod}
                  onChange={(e) => setPayOutMethod(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-semibold"
                >
                  <option value={0}>💵 Cash (काउन्टर नगदबाट)</option>
                  <option value={2}>📱 Online / Bank (बैंक खाताबाट)</option>
                  <option value={1}>🏛️ Cheque (चेकबाट)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Voucher #' : 'भौचर नम्बर'}
                </label>
                <input
                  type="text"
                  value={payOutRef}
                  onChange={(e) => setPayOutRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Remarks' : 'कैफियत'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. Feed procurement settlement' : 'जस्तै: दाना खरिद बापत भुक्तान'}
                  value={payOutRemarks}
                  onChange={(e) => setPayOutRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentOutModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {lang === 'en' ? 'Cancel' : 'रद्द'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20"
                >
                  {loading ? (lang === 'en' ? 'Saving...' : 'सुरक्षित गर्दै...') : (lang === 'en' ? 'Save Disbursement' : 'निकासी सुरक्षित गर्नुहोस्')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
