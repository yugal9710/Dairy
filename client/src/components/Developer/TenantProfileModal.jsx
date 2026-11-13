import React, { useState, useEffect } from 'react';
import {
  Building,
  Users,
  CreditCard,
  Calendar,
  Clock,
  Shield,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  ExternalLink,
  DollarSign,
  AlertTriangle,
  Receipt,
  Lock,
  UserPlus,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  FileText,
  Phone,
  Mail,
  MapPin,
  Milk,
  Sparkles,
  ArrowRight,
  Sliders,
  Database
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function TenantProfileModal({
  isOpen,
  tenantId,
  onClose,
  authToken,
  plans = [],
  onSwitchTenant,
  onTenantUpdated
}) {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'subscription' | 'payments' | 'users' | 'modules' | 'danger'
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Subscription Edit / Extension Form State
  const [subForm, setSubForm] = useState({
    planId: 'plan-professional',
    billingCycle: 'Yearly',
    status: 'Active',
    expiryDate: '',
    totalAmountDue: '',
    notes: ''
  });

  // Software Payment Form State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'FonePay QR',
    transactionRef: '',
    invoiceNo: '',
    billingPeriod: '',
    notes: ''
  });

  // User Accounts Form State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    role: 'Admin'
  });

  // Delete Tenant Confirmation State
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Plan Pricing Auto-calculation helper
  const getPlanPricing = (planId, cycle) => {
    const selectedPlan = (plans || []).find(p => p.id === planId);
    if (!selectedPlan) {
      if (planId === 'plan-starter') return cycle === 'Monthly' ? 3500 : 35000;
      if (planId === 'plan-professional') return cycle === 'Monthly' ? 7500 : 75000;
      if (planId === 'plan-enterprise') return cycle === 'Monthly' ? 18000 : 180000;
      return cycle === 'Monthly' ? 7500 : 75000;
    }
    if (cycle === 'Monthly') {
      return Number(selectedPlan.priceMonthly) || 3500;
    }
    return Number(selectedPlan.priceYearly) || ((Number(selectedPlan.priceMonthly) || 3500) * 10);
  };

  const handleSubPlanChange = (planId) => {
    const autoFee = getPlanPricing(planId, subForm.billingCycle);
    setSubForm(prev => ({
      ...prev,
      planId,
      totalAmountDue: autoFee
    }));
  };

  const handleSubBillingCycleChange = (billingCycle) => {
    const autoFee = getPlanPricing(subForm.planId, billingCycle);
    setSubForm(prev => ({
      ...prev,
      billingCycle,
      totalAmountDue: autoFee
    }));
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': authToken ? `Bearer ${authToken}` : ''
  };

  // Fetch full tenant profile
  const fetchTenantProfile = async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to fetch cooperative profile');

      setProfile(data);
      const sub = data.tenant.subscription || {};
      setSubForm({
        planId: sub.planId || data.tenant.planId || 'plan-professional',
        billingCycle: sub.billingCycle || 'Yearly',
        status: sub.status || data.tenant.status || 'Active',
        expiryDate: sub.expiryDate ? sub.expiryDate.split('T')[0] : '',
        totalAmountDue: sub.totalAmountDue !== undefined ? sub.totalAmountDue : '',
        notes: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchTenantProfile();
      setActiveTab('overview');
      setShowPaymentForm(false);
      setShowUserModal(false);
      setDeleteConfirmInput('');
    }
  }, [isOpen, tenantId]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Handle Extend / Update Subscription
  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/subscription/extend`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          planId: subForm.planId,
          billingCycle: subForm.billingCycle,
          status: subForm.status,
          expiryDate: subForm.expiryDate,
          totalAmountDue: Number(subForm.totalAmountDue) || 0,
          notes: subForm.notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update subscription');

      showToast(lang === 'en' ? 'Subscription updated successfully!' : 'सदस्यता सफलतापूर्वक अद्यावधिक भयो !');
      fetchTenantProfile();
      if (onTenantUpdated) onTenantUpdated(data.tenant);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Quick Extend (30, 90, 365 days)
  const handleQuickExtend = async (days) => {
    setProcessing(true);
    try {
      const currentExpiry = subForm.expiryDate ? new Date(subForm.expiryDate) : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      baseDate.setDate(baseDate.getDate() + days);
      const newExpiryStr = baseDate.toISOString().split('T')[0];

      const res = await fetch(`/api/platform/tenants/${tenantId}/subscription/extend`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          planId: subForm.planId,
          billingCycle: subForm.billingCycle,
          status: 'Active',
          expiryDate: newExpiryStr,
          totalAmountDue: subForm.totalAmountDue,
          notes: `Quick extension +${days} days via Developer Console`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend subscription');

      showToast(lang === 'en' ? `License extended by ${days} days!` : `लाइसेन्स ${days} दिन थप गरियो !`);
      fetchTenantProfile();
      if (onTenantUpdated) onTenantUpdated(data.tenant);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Record Software Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: Number(paymentForm.amount),
          date: paymentForm.date,
          method: paymentForm.method,
          transactionRef: paymentForm.transactionRef,
          invoiceNo: paymentForm.invoiceNo,
          billingPeriod: paymentForm.billingPeriod,
          notes: paymentForm.notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      showToast(lang === 'en' ? 'License payment recorded successfully!' : 'सदस्यता भुक्तानी सफलतापूर्वक सुरक्षित भयो !');
      setShowPaymentForm(false);
      setPaymentForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'FonePay QR',
        transactionRef: '',
        invoiceNo: '',
        billingPeriod: '',
        notes: ''
      });
      fetchTenantProfile();
      if (onTenantUpdated) onTenantUpdated();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Delete Software Payment
  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm(lang === 'en' ? 'Are you sure you want to delete this payment record?' : 'के तपाईं यो भुक्तानी रेकर्ड हटाउन निश्चित हुनुहुन्छ?')) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/payments/${paymentId}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('Failed to delete payment');
      showToast(lang === 'en' ? 'Payment removed' : 'भुक्तानी हटाइयो');
      fetchTenantProfile();
      if (onTenantUpdated) onTenantUpdated();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Toggle Feature Module
  const handleToggleModule = async (moduleName, currentVal) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/toggle-module`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          moduleName,
          enabled: !currentVal
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle module');
      showToast(lang === 'en' ? `Module "${moduleName}" updated` : `मोड्युल अद्यावधिक गरियो`);
      fetchTenantProfile();
      if (onTenantUpdated) onTenantUpdated();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Create / Edit User Account
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const url = editingUser
        ? `/api/platform/tenants/${tenantId}/users/${editingUser.id}`
        : `/api/platform/tenants/${tenantId}/users`;
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(userForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to save staff user');

      showToast(lang === 'en' ? 'User account saved successfully!' : 'प्रयोगकर्ता खाता सुरक्षित भयो !');
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ name: '', username: '', email: '', password: '', phone: '', role: 'Admin' });
      fetchTenantProfile();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Delete User Account
  const handleDeleteUser = async (userId) => {
    if (!window.confirm(lang === 'en' ? 'Are you sure you want to remove this user from cooperative?' : 'के तपाईं यो प्रयोगकर्ता हटाउन निश्चित हुनुहुन्छ?')) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/users/${userId}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('Failed to delete user');
      showToast(lang === 'en' ? 'User account removed' : 'प्रयोगकर्ता हटाइयो');
      fetchTenantProfile();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Toggle Tenant Status (Active / Suspended)
  const handleToggleTenantStatus = async (newStatus) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update cooperative status');
      showToast(lang === 'en' ? `Cooperative status changed to ${newStatus}` : `सहकारी स्थिति ${newStatus} मा परिवर्तन गरियो`);
      fetchTenantProfile();
      if (onTenantUpdated) onTenantUpdated();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Delete Entire Cooperative
  const handleDeleteTenant = async () => {
    if (deleteConfirmInput !== profile?.tenant?.slug) {
      showToast(lang === 'en' ? `Please type the exact slug "${profile?.tenant?.slug}" to confirm deletion` : 'पुष्टि गर्न सहि स्लग टाइप गर्नुहोस्', 'error');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to delete cooperative');

      showToast(lang === 'en' ? 'Cooperative deleted permanently' : 'सहकारी स्थायी रूपमा हटाइयो');
      onClose();
      if (onTenantUpdated) onTenantUpdated();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Toast Alert */}
        {toast && (
          <div className={`px-4 py-2 text-xs font-bold text-center text-white ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
            {toast.message}
          </div>
        )}

        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  {profile?.tenant?.organizationName || profile?.tenant?.name || 'Cooperative Profile'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  profile?.tenant?.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}>
                  {profile?.tenant?.status || 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                ID: #{tenantId} • Slug: {profile?.tenant?.slug || '-'} • Host: {profile?.tenant?.slug}.dairynepal.com
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchTenant && (
              <button
                type="button"
                onClick={() => {
                  onSwitchTenant(tenantId);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                title="Impersonate & Switch Cooperative"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Switch In' : 'सहकारी खोल्नुहोस्'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto text-xs font-bold">
          {[
            { id: 'overview', label: lang === 'en' ? 'Overview' : 'सारांश', icon: Building },
            { id: 'subscription', label: lang === 'en' ? 'License & Plan' : 'सदस्यता तथा योजना', icon: CreditCard },
            { id: 'payments', label: lang === 'en' ? 'Payments Ledger' : 'सफ्टवेयर भुक्तानी', icon: Receipt },
            { id: 'users', label: lang === 'en' ? 'Staff Users' : 'कर्मचारी खाताहरू', icon: Users },
            { id: 'modules', label: lang === 'en' ? 'Modules' : 'मोड्युलहरू', icon: Sliders },
            { id: 'danger', label: lang === 'en' ? 'Danger Zone' : 'गम्भीर कार्यहरू', icon: AlertTriangle }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition cursor-pointer ${
                  active
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 bg-white dark:bg-slate-800 rounded-t-xl'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm font-semibold animate-pulse">
              {lang === 'en' ? 'Loading cooperative details...' : 'सहकारीको विवरण लोड हुँदैछ...'}
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Metric Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">{lang === 'en' ? 'Registered Farmers' : 'दर्ता कृषकहरू'}</div>
                      <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
                        {profile?.stats?.farmersCount || 0}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">{lang === 'en' ? 'Milk Intakes' : 'दूध संकलन प्रविष्टि'}</div>
                      <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {profile?.stats?.collectionsCount || 0}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">{lang === 'en' ? 'Sales Orders' : 'बिक्री अर्डर'}</div>
                      <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                        {profile?.stats?.ordersCount || 0}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">{lang === 'en' ? 'Staff Users' : 'कर्मचारी खाता'}</div>
                      <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                        {profile?.users?.length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Profile Details Table */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 text-xs">
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm border-b border-slate-200 dark:border-slate-700 pb-2">
                      {lang === 'en' ? 'Cooperative Information' : 'सहकारी संस्था सम्बन्धी जानकारी'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 font-medium">{lang === 'en' ? 'Full Organization Name:' : 'सहकारीको पूरा नाम:'}</span>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                          {profile?.tenant?.organizationName || profile?.tenant?.name}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">{lang === 'en' ? 'Registered Address:' : 'ठेगाना:'}</span>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                          {profile?.tenant?.address || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">{lang === 'en' ? 'Contact Phone:' : 'सम्पर्क फोन:'}</span>
                        <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                          {profile?.tenant?.phone || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">{lang === 'en' ? 'Subdomain Routing:' : 'सफ्टवेयर डोमेन:'}</span>
                        <p className="font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                          https://{profile?.tenant?.slug}.dairynepal.com
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SUBSCRIPTION & PLAN */}
              {activeTab === 'subscription' && (
                <div className="space-y-6">
                  {/* Current Plan Overview Banner */}
                  <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                        {lang === 'en' ? 'Active Tier' : 'हालको सदस्यता'}
                      </div>
                      <div className="text-lg font-black text-emerald-900 dark:text-emerald-200 mt-0.5">
                        {profile?.tenant?.subscription?.planName || 'Cooperative Professional'}
                      </div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 font-mono">
                        Expires: {profile?.tenant?.subscription?.expiryDate ? new Date(profile.tenant.subscription.expiryDate).toLocaleDateString() : '-'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickExtend(30)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl hover:bg-emerald-100 transition cursor-pointer"
                      >
                        +30 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickExtend(365)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                      >
                        +1 Year
                      </button>
                    </div>
                  </div>

                  {/* Subscription Edit Form */}
                  <form onSubmit={handleSaveSubscription} className="p-5 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                      {lang === 'en' ? 'Modify License & Expiry Date' : 'लाइसेन्स तथा म्याद संशोधन'}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {lang === 'en' ? 'Subscription Plan' : 'सदस्यता योजना'}
                        </label>
                        <select
                          value={subForm.planId}
                          onChange={(e) => handleSubPlanChange(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl font-bold"
                        >
                          {plans.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} - Rs. {p.priceYearly}/yr
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {lang === 'en' ? 'Billing Cycle' : 'बिलिङ अवधि'}
                        </label>
                        <select
                          value={subForm.billingCycle}
                          onChange={(e) => handleSubBillingCycleChange(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl font-bold"
                        >
                          <option value="Yearly">{lang === 'en' ? 'Yearly' : 'वार्षिक'}</option>
                          <option value="Monthly">{lang === 'en' ? 'Monthly' : 'मासिक'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {lang === 'en' ? 'License Expiration Date' : 'लाइसेन्स समाप्त हुने मिति'}
                        </label>
                        <input
                          type="date"
                          value={subForm.expiryDate}
                          onChange={(e) => setSubForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl font-bold cursor-pointer"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {lang === 'en' ? 'Total Annual License Fee (Rs.)' : 'कुल सदस्यता शुल्क (रु)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={subForm.totalAmountDue}
                          onChange={(e) => setSubForm(prev => ({ ...prev, totalAmountDue: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl font-bold font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={processing}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {processing ? 'Saving...' : (lang === 'en' ? 'Update License' : 'लाइसेन्स सुरक्षित गर्नुहोस्')}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: PAYMENTS LEDGER */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                      {lang === 'en' ? 'Software License Payment Ledger' : 'सफ्टवेयर शुल्क भुक्तानी अभिलेख'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(!showPaymentForm)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Record Direct Payment' : 'भुक्तानी प्रविष्टि'}</span>
                    </button>
                  </div>

                  {/* Payment Entry Form */}
                  {showPaymentForm && (
                    <form onSubmit={handleRecordPayment} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {lang === 'en' ? 'Amount (Rs.)' : 'रकम (रु)'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="35000"
                            className="w-full px-3 py-2 border rounded-xl font-bold bg-white dark:bg-slate-800"
                            required
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {lang === 'en' ? 'Payment Date' : 'भुक्तानी मिति'}
                          </label>
                          <input
                            type="date"
                            value={paymentForm.date}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-xl font-bold bg-white dark:bg-slate-800"
                            required
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {lang === 'en' ? 'Method' : 'माध्यम'}
                          </label>
                          <select
                            value={paymentForm.method}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-xl font-bold bg-white dark:bg-slate-800"
                          >
                            <option value="FonePay QR">FonePay QR</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowPaymentForm(false)}
                          className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={processing}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                        >
                          Save Payment
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Payment List Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Method / Ref</th>
                          <th className="p-3">Period / Description</th>
                          <th className="p-3 text-right">Amount (Rs.)</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {(profile?.payments || []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400">
                              No payments recorded yet.
                            </td>
                          </tr>
                        ) : (
                          profile.payments.map((p, i) => (
                            <tr key={p.id || i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                              <td className="p-3 font-mono">{p.date || '2026-01-01'}</td>
                              <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                                {p.method} • <span className="font-mono text-slate-400">{p.transactionRef || '-'}</span>
                              </td>
                              <td className="p-3 text-slate-600 dark:text-slate-400">{p.billingPeriod || p.notes || 'Annual license fee'}</td>
                              <td className="p-3 text-right font-black text-emerald-600 font-mono">
                                Rs. {(Number(p.amount) || 0).toLocaleString()}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(p.id)}
                                  className="p-1 hover:bg-rose-50 text-rose-600 rounded-md transition"
                                  title="Delete payment record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: USERS & STAFF */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                      {lang === 'en' ? 'Cooperative Staff Accounts' : 'कर्मचारी युजर खाताहरू'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(null);
                        setUserForm({ name: '', username: '', email: '', password: '', phone: '', role: 'Admin' });
                        setShowUserModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Add Staff Account' : 'नयाँ कर्मचारी थप्नुहोस्'}</span>
                    </button>
                  </div>

                  {/* Users Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase">
                        <tr>
                          <th className="p-3">Staff Name</th>
                          <th className="p-3">Username</th>
                          <th className="p-3">Role</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(profile?.users || []).map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{u.name}</td>
                            <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                @{u.username || (u.email ? u.email.split('@')[0] : 'user')}
                              </span>
                              {u.email && <span className="block text-[10px] text-slate-400">{u.email}</span>}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold rounded-lg text-[10px]">
                                {(u.roles || []).join(', ') || 'User'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {u.isActive ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded-md transition"
                                title="Remove staff account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add User Modal */}
                  {showUserModal && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs animate-in fade-in">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {lang === 'en' ? 'Create Staff User' : 'नयाँ कर्मचारी खाता सिर्जना'}
                      </h4>
                      <form onSubmit={handleSaveUser} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold mb-1">Full Name</label>
                            <input
                              type="text"
                              value={userForm.name}
                              onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Hari Sharma"
                              className="w-full px-3 py-2 border rounded-xl font-bold bg-white dark:bg-slate-800"
                              required
                            />
                          </div>
                          <div>
                            <label className="block font-bold mb-1">Username *</label>
                            <input
                              type="text"
                              value={userForm.username}
                              onChange={(e) => setUserForm(prev => ({
                                ...prev,
                                username: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase()
                              }))}
                              placeholder="e.g. hari.staff"
                              className="w-full px-3 py-2 border rounded-xl font-mono font-bold bg-white dark:bg-slate-800"
                              required
                            />
                          </div>
                          <div>
                            <label className="block font-bold mb-1">Temporary Password *</label>
                            <input
                              type="password"
                              value={userForm.password}
                              onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                              placeholder="Staff@123"
                              className="w-full px-3 py-2 border rounded-xl font-bold bg-white dark:bg-slate-800"
                              required
                            />
                          </div>
                          <div>
                            <label className="block font-bold mb-1">Email (Optional)</label>
                            <input
                              type="email"
                              value={userForm.email}
                              onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="Optional"
                              className="w-full px-3 py-2 border rounded-xl font-bold bg-white dark:bg-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block font-bold mb-1">System Role</label>
                            <select
                              value={userForm.role}
                              onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-xl font-bold bg-white dark:bg-slate-800"
                            >
                              <option value="Admin">Cooperative Admin / Manager</option>
                              <option value="User">Cashier / Milk Collector</option>
                              <option value="SuperAdmin">Super Administrator</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowUserModal(false)}
                            className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                          >
                            Save User
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: MODULES TOGGLE */}
              {activeTab === 'modules' && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                    {lang === 'en' ? 'ERP Feature Modules & Permission Flags' : 'सफ्टवेयर मोड्युलहरू तथा सुविधाहरू'}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'milkCollection', title: 'Milk Intake & Quality Shifts', desc: 'Morning/Evening milk intake, automated Fat & SNF calculation', icon: Milk },
                      { key: 'pos', title: 'Counter POS & Walk-in Sales', desc: 'Direct dairy retail counter billing & barcode sales', icon: DollarSign },
                      { key: 'futureOrders', title: 'Future / Scheduled Orders', desc: 'Advance milk booking, bulk event catering, home deliveries', icon: Calendar },
                      { key: 'dairyProcessing', title: 'Processing & Cheese Batches', desc: 'Paneer, Butter, Ghee, Curd production recipes and batches', icon: Sparkles },
                      { key: 'farmerLedger', title: 'Farmer Accounts & Financial Ledger', desc: 'Real-time double-entry ledger, disbursements and cash flow', icon: FileText },
                      { key: 'nepaliBS', title: 'Nepali Bikram Sambat (BS) Calendar', desc: 'Official BS date converter, nepali months and fiscal years', icon: Clock }
                    ].map(mod => {
                      const enabled = Boolean(profile?.tenant?.modules?.[mod.key]);
                      const Icon = mod.icon;
                      return (
                        <div
                          key={mod.key}
                          className={`p-4 rounded-2xl border transition flex items-center justify-between ${
                            enabled
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{mod.title}</div>
                              <div className="text-[11px] text-slate-500">{mod.desc}</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleModule(mod.key, enabled)}
                            disabled={processing}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                              enabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                            }`}
                          >
                            <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 6: DANGER ZONE */}
              {activeTab === 'danger' && (
                <div className="space-y-6">
                  {/* Status Toggle Box */}
                  <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200">
                        {profile?.tenant?.status === 'Active' ? 'Suspend Cooperative Access' : 'Reactivate Cooperative Access'}
                      </h4>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                        {profile?.tenant?.status === 'Active'
                          ? 'Prevent staff from recording milk collections or POS sales until reactivated.'
                          : 'Restore full operational access for this dairy cooperative.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleTenantStatus(profile?.tenant?.status === 'Active' ? 'Suspended' : 'Active')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                        profile?.tenant?.status === 'Active'
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {profile?.tenant?.status === 'Active' ? 'Suspend Access' : 'Re-activate'}
                    </button>
                  </div>

                  {/* Permanent Deletion Box */}
                  <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
                    <h4 className="font-bold text-xs text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Permanent Cooperative Deletion</span>
                    </h4>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300">
                      Deleting this cooperative will permanently archive all farmers, milk intake records, and invoices. This action cannot be undone.
                    </p>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Type <span className="font-mono text-rose-600 font-black">{profile?.tenant?.slug}</span> to confirm:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={deleteConfirmInput}
                          onChange={(e) => setDeleteConfirmInput(e.target.value)}
                          placeholder={profile?.tenant?.slug}
                          className="px-3 py-1.5 text-xs border border-rose-300 dark:border-rose-800 rounded-xl font-mono flex-1 bg-white dark:bg-slate-800"
                        />
                        <button
                          type="button"
                          disabled={deleteConfirmInput !== profile?.tenant?.slug || processing}
                          onClick={handleDeleteTenant}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-40 cursor-pointer"
                        >
                          Delete Cooperative
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">
            Dairy ERP 2.0 • Multi-Tenant Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer"
          >
            {lang === 'en' ? 'Close Window' : 'बन्द गर्नुहोस्'}
          </button>
        </div>
      </div>
    </div>
  );
}
