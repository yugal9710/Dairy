import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit,
  Printer,
  ArrowLeft,
  Milk,
  Receipt
} from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';
import { FarmerProfileView } from '../Common/FarmerProfileModal';
import NepalAddressFields, {
  EMPTY_NEPAL_LOCATION,
  getNextCustomerCode
} from '../Common/NepalAddressFields';

export default function CustomerManager({
  tenant,
  customers = [],
  collections = [],
  payments = [],
  auditLogs = [],
  onRefresh,
  onOpenRecordMilk,
  onOpenRecordPayment,
  onPrintFarmerReport,
  onPrintSlip
}) {
  const { lang, t } = useLanguage();
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Filter State
  const [typeFilter, setTypeFilter] = useState(''); // '', '1', '2', '3'
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [accountCode, setAccountCode] = useState('');
  const [nameInNepali, setNameInNepali] = useState('');
  const [nameInEnglish, setNameInEnglish] = useState('');
  const [customerType, setCustomerType] = useState(1); // 1: Farmer, 2: Buyer, 3: Both
  const [phone, setPhone] = useState('');
  const [nepalLocation, setNepalLocation] = useState(EMPTY_NEPAL_LOCATION);
  const [address, setAddress] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpenModal = (cust = null) => {
    setEditingCustomer(cust);
    if (cust) {
      setAccountCode(String(cust.code || cust.id || ''));
      setNameInNepali(cust.nameInNepali || '');
      setNameInEnglish(cust.nameInEnglish || '');
      setCustomerType(cust.customerType || 1);
      setPhone(String(cust.phone || '').replace(/\D/g, '').slice(0, 10));
      setNepalLocation({
        provinceId: cust.provinceId ? String(cust.provinceId) : '',
        provinceName: cust.provinceName || '',
        districtId: cust.districtId ? String(cust.districtId) : '',
        districtName: cust.districtName || '',
        municipalityId: cust.municipalityId ? String(cust.municipalityId) : '',
        municipalityName: cust.municipalityName || '',
        ward: cust.ward ? String(cust.ward) : ''
      });
      setAddress(cust.address || '');
      setAccountNumber(cust.accountNumber || '');
      setRemarks(cust.remarks || '');
    } else {
      setAccountCode(String(getNextCustomerCode(customers, tenant)));
      setNameInNepali('');
      setNameInEnglish('');
      setCustomerType(1);
      setPhone('');
      setNepalLocation(EMPTY_NEPAL_LOCATION);
      setAddress('');
      setAccountNumber('');
      setRemarks('');
    }
    setModalOpen(true);
  };

  const handlePhoneChange = (val) => {
    // Reject any letters, spaces, or special characters; accept only 10 digits
    const digitsOnly = String(val || '').replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  const handlePhoneKeyDown = (e) => {
    // Allow navigation and system edit keys
    if (
      ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Home', 'End'].includes(e.key) ||
      e.ctrlKey || e.metaKey
    ) {
      return;
    }
    // Reject any key that is not a numeric digit (0-9)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Validate 10-digit phone requirement
    if (phone && phone.length !== 10) {
      alert(
        lang === 'en'
          ? 'Phone number must be exactly 10 digits. Letters, spaces, and special characters are rejected.'
          : 'फोन नम्बर ठ्याक्कै १० अंकको हुनुपर्छ । अक्षर, खाली ठाउँ वा विशेष चिन्ह मान्य छैन ।'
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...(accountCode ? { code: String(accountCode).trim().toUpperCase() } : {}),
        nameInNepali,
        nameInEnglish,
        customerType: Number(customerType),
        phone,
        ...nepalLocation,
        address,
        accountNumber,
        remarks
      };

      const url = editingCustomer ? `/api/Customer/${editingCustomer.id}` : '/api/Customer';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalOpen(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmMsg = lang === 'en' ? 'Are you sure you want to delete this account?' : 'के तपाईं यो खाता मेटाउन निश्चित हुनुहुन्छ?';
    if (!confirm(confirmMsg)) return;
    try {
      const res = await fetch(`/api/Customer/${id}`, { method: 'DELETE' });
      if (res.ok && onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered List
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => !c.isDeleted).filter(c => {
      if (typeFilter && String(c.customerType) !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const nepali = (c.nameInNepali || '').toLowerCase();
        const english = (c.nameInEnglish || '').toLowerCase();
        const code = String(c.code || '');
        const ph = c.phone || '';
        return nepali.includes(q) || english.includes(q) || code.includes(q) || ph.includes(q);
      }
      return true;
    });
  }, [customers, typeFilter, searchQuery]);

  const activeCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-6">
      {activeCustomer ? (
        <FarmerProfileView
          farmer={activeCustomer}
          onClose={() => setSelectedCustomerId(null)}
          backLabel={lang === 'en' ? 'All Accounts' : 'सबै खाताहरू'}
          defaultTab="all"
          initialCollections={collections}
          initialPayments={payments}
          initialAuditLogs={auditLogs}
          onEditCustomer={(cust) => handleOpenModal(cust)}
          onOpenRecordMilk={onOpenRecordMilk}
          onOpenRecordPayment={onOpenRecordPayment}
          onPrintStatement={onPrintFarmerReport}
          onPrintMilkSlip={onPrintSlip}
        />
      ) : (
        <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-slate-800 leading-tight">
            {t('directoryTitle')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('directorySubtitle')}
          </p>
        </div>

        <button
          onClick={() => handleOpenModal(null)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" /> {t('btnOpenAccount')}
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={lang === 'en' ? 'Search by name, code, or phone...' : 'नाम, कोड, वा फोन नम्बर खोज्नुहोस्...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs outline-none"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-white"
        >
          <option value="">{t('typeAll')}</option>
          <option value="1">{t('typeFarmersOnly')}</option>
          <option value="2">{t('typeBuyersOnly')}</option>
          <option value="3">{t('typeBoth')}</option>
        </select>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{t('code')}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Name' : 'नाम'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Type' : 'प्रकार'}</th>
                <th className="py-3 px-4">{t('phone')}</th>
                <th className="py-3 px-4">{t('address')}</th>
                <th className="py-3 px-4 text-right">{t('thTotalMilkDelivered')}</th>
                <th className="py-3 px-4 text-right">{t('thRemainingDue')}</th>
                <th className="py-3 px-4 text-center">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(cust => (
                <tr
                  key={cust.id}
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className="hover:bg-emerald-50/50 transition cursor-pointer"
                  title={lang === 'en' ? 'Click to view complete profile & activity history' : 'सम्पूर्ण प्रोफाइल तथा कारोबार इतिहास हेर्नुहोस्'}
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">#{cust.code}</td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomerId(cust.id);
                      }}
                      className="font-bold text-slate-900 hover:text-emerald-700 text-left transition cursor-pointer"
                    >
                      {lang === 'en' ? (cust.nameInEnglish || cust.nameInNepali) : (cust.nameInNepali || cust.nameInEnglish)}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                      {cust.customerType === 1
                        ? t('farmer')
                        : cust.customerType === 2
                        ? t('customer')
                        : (lang === 'en' ? 'Both' : 'दुवै')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-semibold">{cust.phone || '-'}</td>
                  <td className="py-3 px-4 text-slate-500">{cust.address || '-'}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-blue-700">
                    {cust.customerType === 2 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <>{(cust.totalMilkQuantity || 0).toFixed(1)} {lang === 'en' ? 'L' : 'लिटर'}</>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-black">
                    {cust.customerType === 2 ? (
                      Number(cust.outstandingBalance) > 0 ? (
                        <span className="text-amber-600">{formatNepaliCurrency(cust.outstandingBalance)} {lang === 'en' ? 'Rec.' : 'उठाउन बाँकी'}</span>
                      ) : (
                        <span className="text-emerald-600">{t('settled')}</span>
                      )
                    ) : Number(cust.milkCollectionRemainingAmount) > 0 ? (
                      <span className="text-rose-600">{formatNepaliCurrency(cust.milkCollectionRemainingAmount)} {lang === 'en' ? 'Due' : 'बाँकी'}</span>
                    ) : (
                      <span className="text-emerald-600">{t('settled')}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomerId(cust.id);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        {t('btnViewDetails')}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(cust);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                        title={t('edit')}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">{t('emptyAccounts')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Customer Create/Edit Modal - Single Window Full Display */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-3 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <h3 className="font-extrabold text-base tracking-wide">
                  {editingCustomer ? (lang === 'en' ? 'Edit Account' : 'खाता विवरण सम्पादन') : (lang === 'en' ? 'New Account Registration' : 'नयाँ खाता दर्ता')}
                </h3>
                {accountCode && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono text-xs font-black tracking-wider">
                    #{accountCode}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center text-lg leading-none transition cursor-pointer"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Form Content - 2-Column Single Window (No Scrollbar Required) */}
            <form onSubmit={handleSave} className="p-4 sm:p-5 flex flex-col gap-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* LEFT COLUMN: Identity & Member Credentials */}
                <div className="space-y-3">
                  {/* Generated Account Code Banner & Editable Box */}
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        {editingCustomer
                          ? (lang === 'en' ? 'Account Code' : 'खाता कोड')
                          : (lang === 'en' ? 'Generated Account Code' : 'स्वतः सिर्जित खाता कोड')}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate">
                        {lang === 'en' ? 'Prefix from company name + 3-digit number (e.g. JS001)' : 'कम्पनीको नामको पहिलो २ अक्षर + ३ अंकको कोड (उदा: JS001)'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300">#</span>
                      <input
                        type="text"
                        value={accountCode}
                        onChange={(e) => setAccountCode(e.target.value.toUpperCase())}
                        placeholder="JS001"
                        className="w-24 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 font-mono text-sm font-black text-emerald-700 dark:text-emerald-300 shadow-2xs outline-none focus:ring-2 focus:ring-emerald-500 uppercase text-center"
                        required
                      />
                    </div>
                  </div>

                  {/* Name in Nepali & Name in English */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {lang === 'en' ? 'Name in Nepali *' : 'नेपाली नाम *'}
                      </label>
                      <input
                        type="text"
                        value={nameInNepali}
                        onChange={(e) => setNameInNepali(e.target.value)}
                        placeholder="उदा: राम बहादुर थापा"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {lang === 'en' ? 'Name in English' : 'अंग्रेजी नाम'}
                      </label>
                      <input
                        type="text"
                        value={nameInEnglish}
                        onChange={(e) => setNameInEnglish(e.target.value)}
                        placeholder="e.g. Ram Bahadur Thapa"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Account Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {lang === 'en' ? 'Account Type' : 'खाता प्रकार'}
                    </label>
                    <select
                      value={customerType}
                      onChange={(e) => setCustomerType(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer font-semibold"
                    >
                      <option value="1">{lang === 'en' ? 'Milk Supplier Farmer' : 'दूध आपूर्तिकर्ता कृषक'}</option>
                      <option value="2">{lang === 'en' ? 'Wholesale Buyer' : 'थोक तथा खुद्रा खरिदकर्ता'}</option>
                      <option value="3">{lang === 'en' ? 'Farmer & Buyer' : 'कृषक तथा खरिदकर्ता'}</option>
                    </select>
                  </div>

                  {/* Phone & Bank Account # */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {t('phone')}
                        </label>
                        {phone.length > 0 && phone.length < 10 && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                            {phone.length}/10 digits
                          </span>
                        )}
                        {phone.length === 10 && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ 10 digits
                          </span>
                        )}
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        value={phone}
                        onKeyDown={handlePhoneKeyDown}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="98XXXXXXXX"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-wide"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('accountNumber')}
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="A/C No."
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {lang === 'en' ? 'Remarks / Notes (Optional)' : 'कैफियत / टिप्पणी (ऐच्छिक)'}
                    </label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder={lang === 'en' ? 'e.g. Regular morning supplier' : 'उदा: नियमित बिहानी आपूर्तिकर्ता'}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: Nepal Local-Level Address */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      {lang === 'en' ? 'Nepal Local-Level Address' : 'नेपालको स्थानीय तह ठेगाना'}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {lang === 'en' ? 'Cascading Dropdowns' : 'तहगत छनोट'}
                    </span>
                  </div>

                  <NepalAddressFields
                    value={nepalLocation}
                    onChange={(nextLoc, composedAddress) => {
                      setNepalLocation(nextLoc);
                      if (composedAddress) setAddress(composedAddress);
                    }}
                    lang={lang}
                    compact={true}
                  />

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('address')} {lang === 'en' ? '(Street / Tole / Full)' : '(टोल / पूरा ठेगाना)'}
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={lang === 'en' ? 'e.g. Gaushala-12, Kathmandu' : 'उदा: गौशाला-१२, काठमाडौं'}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {address && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      <span className="font-bold text-emerald-600">📍 </span>
                      <span className="font-medium">{address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons - Always Visible in Single Window */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black rounded-xl text-xs transition shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (lang === 'en' ? 'Saving...' : 'सुरक्षित गर्दै...') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
