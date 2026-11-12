import React, { useState, useEffect, useCallback } from 'react';
import TenantProfileModal from './TenantProfileModal';
import { useLanguage } from '../../context/LanguageContext';
import {
  Building,
  Users,
  Shield,
  Globe,
  Plus,
  CheckCircle,
  Server,
  Key,
  CreditCard,
  ArrowLeftRight,
  Activity,
  Search,
  ExternalLink,
  Lock,
  RefreshCw,
  Clock,
  Edit,
  Check,
  X,
  Eye,
  Receipt,
  FileText,
  CheckCircle2,
  XCircle,
  Filter,
  Trash2,
  Milk,
  Landmark,
  Sliders
} from 'lucide-react';

const DAIRY_PLAN_MODULES = [
  { key: 'milkCollection', label: 'Milk Collection & Quality Shifts' },
  { key: 'fatSnfPricing', label: 'FAT / SNF Auto Pricing Engine' },
  { key: 'farmerLedger', label: 'Farmer Accounts & Settlements' },
  { key: 'basicReports', label: 'Financial Statements & P&L' },
  { key: 'pos', label: 'Counter POS & Walk-in Sales' },
  { key: 'futureOrders', label: 'Scheduled & Wholesale Orders' },
  { key: 'dairyProcessing', label: 'Production & Cheese Batches' },
  { key: 'nepaliBS', label: 'Nepali Bikram Sambat (BS) Calendar' },
  { key: 'smsAlerts', label: 'SMS / Notification Alerts' },
  { key: 'multiBranch', label: 'Multi-Branch Collection Centers' },
  { key: 'customDomain', label: 'Custom Domain & SSL' },
  { key: 'auditTrail', label: 'Immutable User Activity Audit Trail' }
];

export default function DeveloperControlPanel({ authToken, onTenantUpdated, onSwitchTenant }) {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tenants' | 'domains' | 'plans' | 'renewals' | 'audit'
  const [overview, setOverview] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [domains, setDomains] = useState([]);
  const [plans, setPlans] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [supportGrants, setSupportGrants] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState({
    companyName: 'Dairy Nepal SaaS ERP Solutions',
    bankName: 'Nabil Bank Ltd.',
    accountName: '',
    accountNumber: '',
    branch: '',
    swiftCode: '',
    fonepayMerchantId: '',
    fonepayQrUrl: '',
    supportEmail: '',
    supportPhone: ''
  });

  const [renewalFilter, setRenewalFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [receiptToInspect, setReceiptToInspect] = useState(null);
  const [approveConfirmTarget, setApproveConfirmTarget] = useState(null);
  const [rejectModalTarget, setRejectModalTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionInstructions, setRejectionInstructions] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [paymentConfigModalOpen, setPaymentConfigModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedTenantForProfile, setSelectedTenantForProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Add Custom Domain State
  const [newDomainForm, setNewDomainForm] = useState({
    tenantId: 1,
    domain: ''
  });

  // Form for New Dairy Cooperative Wizard
  const [newCoop, setNewCoop] = useState({
    name: '',
    slug: '',
    address: 'Kathmandu, Nepal',
    phone: '',
    timeZone: 'Asia/Kathmandu',
    planId: 'plan-professional',
    billingCycle: 'Yearly',
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalAmountDue: '',
    initialPayment: '',
    adminUsername: '',
    adminEmail: '',
    adminName: '',
    adminPassword: '',
    managerName: '',
    enablePOS: true,
    enableProcessing: true
  });

  // Form for Support Access Grant
  const [supportForm, setSupportForm] = useState({
    tenantId: 1,
    reason: '',
    durationMinutes: 60
  });

  // State for Edit Cooperative Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    planId: 'plan-professional',
    status: 'Active',
    address: '',
    phone: '',
    managerName: '',
    adminName: '',
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
    enablePOS: true,
    enableProcessing: true,
    enableFarmerLedger: true,
    subscriptionStatus: 'Active',
    subscriptionBillingCycle: 'Yearly',
    subscriptionExpiryDate: '',
    totalAmountDue: ''
  });

  // State for Plan Edit / Create Modal
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    id: '',
    name: '',
    priceMonthly: 3500,
    priceYearly: 35000,
    maxBranches: 1,
    maxStaff: 5,
    maxFarmers: 500,
    storageQuotaGb: 5,
    modules: {
      milkCollection: true,
      fatSnfPricing: true,
      farmerLedger: true,
      basicReports: true,
      pos: false,
      futureOrders: false,
      dairyProcessing: false,
      nepaliBS: true,
      smsAlerts: false,
      multiBranch: false,
      customDomain: false,
      auditTrail: false
    }
  });

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

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

  const handleNewCoopPlanChange = (planId) => {
    const autoFee = getPlanPricing(planId, newCoop.billingCycle);
    setNewCoop(prev => ({
      ...prev,
      planId,
      totalAmountDue: autoFee
    }));
  };

  const handleNewCoopBillingCycleChange = (billingCycle) => {
    const autoFee = getPlanPricing(newCoop.planId, billingCycle);
    const expiry = new Date();
    if (billingCycle === 'Monthly') {
      expiry.setMonth(expiry.getMonth() + 1);
    } else {
      expiry.setFullYear(expiry.getFullYear() + 1);
    }
    setNewCoop(prev => ({
      ...prev,
      billingCycle,
      totalAmountDue: autoFee,
      subscriptionExpiryDate: expiry.toISOString().split('T')[0]
    }));
  };

  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
  };

  const fetchPlatformData = useCallback(async () => {
    setLoading(true);
    try {
      const [resOver, resTenants, resDomains, resPlans, resAudit, resRenewals, resGrants, resPayCfg] = await Promise.all([
        fetch('/api/platform/overview', { headers }).then(r => r.json()),
        fetch('/api/platform/tenants', { headers }).then(r => r.json()),
        fetch('/api/platform/domains', { headers }).then(r => r.json()),
        fetch('/api/platform/subscriptions', { headers }).then(r => r.json()),
        fetch('/api/platform/audit-logs', { headers }).then(r => r.json()),
        fetch('/api/platform/renewals', { headers }).then(r => r.json()).catch(() => []),
        fetch('/api/platform/support-grants', { headers }).then(r => r.json()).catch(() => []),
        fetch('/api/platform/payment-config', { headers }).then(r => r.json()).catch(() => ({}))
      ]);

      setOverview(resOver);
      const tList = Array.isArray(resTenants) ? resTenants : [];
      setTenants(tList);
      setDomains(Array.isArray(resDomains) ? resDomains : []);
      setPlans(resPlans?.plans || resOver?.plans || []);
      setAuditLogs(Array.isArray(resAudit) ? resAudit : []);
      setRenewals(Array.isArray(resRenewals) ? resRenewals : []);
      setSupportGrants(Array.isArray(resGrants) ? resGrants : []);
      if (resPayCfg && typeof resPayCfg === 'object') {
        setPaymentConfig(prev => ({ ...prev, ...resPayCfg }));
      }
      if (onTenantUpdated) onTenantUpdated();
    } catch (err) {
      console.error('Error fetching platform data:', err);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchPlatformData();
  }, [fetchPlatformData]);

  // Auto-populate new coop totalAmountDue when wizard opens or plans load
  useEffect(() => {
    if (createModalOpen && (!newCoop.totalAmountDue || newCoop.totalAmountDue === '')) {
      const defaultFee = getPlanPricing(newCoop.planId, newCoop.billingCycle);
      setNewCoop(prev => ({ ...prev, totalAmountDue: defaultFee }));
    }
  }, [createModalOpen, plans]);

  const handleApproveRenewal = async (renewal) => {
    setActionProcessing(true);
    try {
      const res = await fetch(`/api/platform/renewals/${renewal.id}/approve`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Subscription renewal approved for "${renewal.tenantName}". License extended & activated.`);
      setApproveConfirmTarget(null);
      fetchPlatformData();
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleRejectRenewal = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejecting the renewal.');
      return;
    }
    setActionProcessing(true);
    try {
      const res = await fetch(`/api/platform/renewals/${rejectModalTarget.id}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reason: rejectionReason.trim(),
          instructions: rejectionInstructions.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Renewal rejected for "${rejectModalTarget.tenantName}" with resubmission notice.`);
      setRejectModalTarget(null);
      setRejectionReason('');
      setRejectionInstructions('');
      fetchPlatformData();
    } catch (err) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleCreateCoop = async (e) => {
    e.preventDefault();
    setActionProcessing(true);
    try {
      const res = await fetch('/api/platform/tenants', {
        method: 'POST',
        headers,
        body: JSON.stringify(newCoop)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Cooperative "${newCoop.name}" provisioned with isolated store!`);
      setCreateModalOpen(false);
      setNewCoop({
        name: '',
        slug: '',
        address: 'Kathmandu, Nepal',
        phone: '',
        timeZone: 'Asia/Kathmandu',
        planId: 'plan-professional',
        billingCycle: 'Yearly',
        subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalAmountDue: '',
        initialPayment: '',
        adminUsername: '',
        adminEmail: '',
        adminName: '',
        adminPassword: '',
        managerName: '',
        enablePOS: true,
        enableProcessing: true
      });
      fetchPlatformData();
    } catch (err) {
      alert(`Error creating cooperative: ${err.message}`);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleToggleTenantStatus = async (tenantId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Status update failed');
      notify(`Cooperative status updated to ${newStatus}`);
      fetchPlatformData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTenant = async (tenantId, tenantName) => {
    if (Number(tenantId) === 1) {
      alert('The primary system cooperative (#1) cannot be deleted.');
      return;
    }

    const confirmDelete = window.confirm(
      `PERMANENT COOPERATIVE DELETION\n\nAre you sure you want to remove "${tenantName}" (#${tenantId})?\n\nThis removes the cooperative, domains, and staff access. This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      setActionProcessing(true);
      const res = await fetch(`/api/platform/tenants/${tenantId}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to delete cooperative');

      notify(`Cooperative "${tenantName}" removed from platform.`);
      fetchPlatformData();
    } catch (err) {
      alert(`Deletion Failed: ${err.message}`);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleOpenEditModal = (t) => {
    setEditingTenant(t);
    const tSub = t.subscription || {};
    setEditForm({
      name: t.organizationName || t.name || '',
      slug: t.slug || t.name || '',
      planId: t.planId || t.plan?.id || 'plan-professional',
      status: t.status || 'Active',
      address: t.address || '',
      phone: t.phone || '',
      managerName: t.managerName || t.adminUser?.name || '',
      adminName: t.adminUser?.name || '',
      adminUsername: t.adminUser?.username || (t.adminUser?.email ? t.adminUser.email.split('@')[0] : ''),
      adminEmail: t.adminUser?.email || '',
      adminPassword: '',
      enablePOS: t.modules?.pos !== false,
      enableProcessing: t.modules?.dairyProcessing !== false,
      enableFarmerLedger: t.modules?.farmerLedger !== false,
      subscriptionStatus: tSub.status || 'Active',
      subscriptionBillingCycle: tSub.billingCycle || 'Yearly',
      subscriptionExpiryDate: tSub.expiryDate ? tSub.expiryDate.split('T')[0] : '',
      totalAmountDue: tSub.totalAmountDue !== undefined ? tSub.totalAmountDue : ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTenant) return;
    setActionProcessing(true);
    try {
      const payload = {
        ...editForm,
        subscription: {
          status: editForm.subscriptionStatus,
          billingCycle: editForm.subscriptionBillingCycle,
          ...(editForm.totalAmountDue !== '' ? { totalAmountDue: Number(editForm.totalAmountDue) } : {}),
          ...(editForm.subscriptionExpiryDate ? { expiryDate: new Date(editForm.subscriptionExpiryDate).toISOString() } : {})
        }
      };
      const res = await fetch(`/api/platform/tenants/${editingTenant.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to update cooperative');

      notify(`Cooperative "${editForm.name}" updated successfully!`);
      setEditModalOpen(false);
      setEditingTenant(null);
      fetchPlatformData();
    } catch (err) {
      alert(`Error updating cooperative: ${err.message}`);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleOpenEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      id: plan.id,
      name: plan.name || '',
      priceMonthly: plan.priceMonthly || 0,
      priceYearly: plan.priceYearly || 0,
      maxBranches: plan.maxBranches || 1,
      maxStaff: plan.maxStaff || 5,
      maxFarmers: plan.maxFarmers || 500,
      storageQuotaGb: plan.storageQuotaGb || Math.round((plan.storageQuotaMb || 5120) / 1024) || 5,
      modules: {
        milkCollection: plan.modules?.milkCollection !== false,
        fatSnfPricing: plan.modules?.fatSnfPricing !== false,
        farmerLedger: plan.modules?.farmerLedger !== false,
        basicReports: plan.modules?.basicReports !== false,
        pos: Boolean(plan.modules?.pos),
        futureOrders: Boolean(plan.modules?.futureOrders),
        dairyProcessing: Boolean(plan.modules?.dairyProcessing),
        nepaliBS: plan.modules?.nepaliBS !== false,
        smsAlerts: Boolean(plan.modules?.smsAlerts),
        multiBranch: Boolean(plan.modules?.multiBranch),
        customDomain: Boolean(plan.modules?.customDomain),
        auditTrail: Boolean(plan.modules?.auditTrail)
      }
    });
    setPlanModalOpen(true);
  };

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      id: '',
      name: '',
      priceMonthly: 5000,
      priceYearly: 50000,
      maxBranches: 2,
      maxStaff: 10,
      maxFarmers: 1500,
      storageQuotaGb: 15,
      modules: {
        milkCollection: true,
        fatSnfPricing: true,
        farmerLedger: true,
        basicReports: true,
        pos: true,
        futureOrders: true,
        dairyProcessing: false,
        nepaliBS: true,
        smsAlerts: true,
        multiBranch: false,
        customDomain: false,
        auditTrail: true
      }
    });
    setPlanModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setActionProcessing(true);
    try {
      const url = editingPlan ? `/api/platform/plans/${editingPlan.id}` : '/api/platform/plans';
      const method = editingPlan ? 'PUT' : 'POST';
      const body = {
        name: planForm.name,
        priceMonthly: Number(planForm.priceMonthly),
        priceYearly: Number(planForm.priceYearly),
        maxBranches: Number(planForm.maxBranches),
        maxStaff: Number(planForm.maxStaff),
        maxFarmers: Number(planForm.maxFarmers),
        storageQuotaGb: Number(planForm.storageQuotaGb),
        modules: planForm.modules
      };
      if (!editingPlan && planForm.id) {
        body.id = planForm.id;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to save plan');

      notify(`Subscription Plan "${data.plan?.name || planForm.name}" ${editingPlan ? 'updated' : 'created'}!`);
      setPlanModalOpen(false);
      setEditingPlan(null);
      fetchPlatformData();
    } catch (err) {
      alert(`Error saving plan: ${err.message}`);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomainForm.domain.trim()) return;
    setActionProcessing(true);
    try {
      const res = await fetch('/api/platform/domains', {
        method: 'POST',
        headers,
        body: JSON.stringify(newDomainForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to map domain');
      notify(`Custom domain ${data.domain.domain} added. Verify DNS to issue SSL.`);
      setNewDomainForm(prev => ({ ...prev, domain: '' }));
      fetchPlatformData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleVerifyDomain = async (domainId) => {
    try {
      const res = await fetch('/api/platform/domains/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({ domainId })
      });
      if (!res.ok) throw new Error('Verification failed');
      notify('Domain DNS verified and SSL certificate active!');
      fetchPlatformData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateSupportGrant = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/platform/support-grant', {
        method: 'POST',
        headers,
        body: JSON.stringify(supportForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Time-limited support grant authorized for ${supportForm.durationMinutes} mins (Audited). Token: ${data.token?.slice(0, 10)}...`);
      setSupportModalOpen(false);
      setSupportForm({ tenantId: 1, reason: '', durationMinutes: 60 });
      fetchPlatformData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSavePaymentConfig = async (e) => {
    e.preventDefault();
    setActionProcessing(true);
    try {
      const res = await fetch('/api/platform/payment-config', {
        method: 'PUT',
        headers,
        body: JSON.stringify(paymentConfig)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update billing gateway config');
      notify('SaaS Billing Gateway (Bank / FonePay QR) configuration updated!');
      setPaymentConfigModalOpen(false);
      fetchPlatformData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  // Financial & Tenant Metrics Aggregation
  const totalTenants = tenants.length;
  const activeTenantsCount = tenants.filter(t => t.status === 'Active').length;
  const totalSoftwareDue = tenants.reduce((sum, t) => sum + (Number(t.subscription?.totalAmountDue) || 0), 0);
  const totalSoftwarePaid = tenants.reduce((sum, t) => sum + (Number(t.subscription?.amountPaid) || 0), 0);
  const totalRemainingBalance = tenants.reduce((sum, t) => sum + (Number(t.subscription?.remainingBalance) || 0), 0);

  // Filtered tenants for search and status filters
  const filteredTenants = tenants.filter(t => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrg = (t.organizationName || '').toLowerCase().includes(q);
      const matchName = (t.name || '').toLowerCase().includes(q);
      const matchSlug = (t.slug || '').toLowerCase().includes(q);
      const matchId = String(t.id).toLowerCase().includes(q);
      if (!matchOrg && !matchName && !matchSlug && !matchId) return false;
    }
    if (filterStatus === 'active') return t.status === 'Active';
    if (filterStatus === 'suspended') return t.status === 'Suspended';
    if (filterStatus === 'balance_due') return (Number(t.subscription?.remainingBalance) || 0) > 0;
    if (filterStatus === 'expiring_soon') return !t.subscription?.isExpired && (Number(t.subscription?.daysRemaining) || 999) <= 30;
    if (filterStatus === 'expired') return Boolean(t.subscription?.isExpired);
    return true;
  });

  const primaryTenant = tenants.find(t => Number(t.id) === 1) || tenants[0];
  const pendingRenewalsCount = renewals.filter(r => r.status === 'PENDING_VERIFICATION').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="p-3.5 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-white/80 hover:text-white cursor-pointer p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-emerald-500/30 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/50 shrink-0">
            <Server className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-600 text-white uppercase tracking-wider">
                {lang === 'en' ? 'Platform Owner Control Panel' : 'प्लेटफर्म ओनर कन्ट्रोल प्यानल'}
              </span>
              <span className="text-emerald-300 font-mono text-xs flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Multi-Tenant Dairy Architecture Active
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
              {lang === 'en' ? 'Dairy Nepal Cloud Console' : 'डेरी नेपाल क्लाउड डेभलपर कन्सोल'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {lang === 'en'
                ? 'Cooperative SaaS Provisioning • FAT/SNF Engine Flags • Custom Domains • License & Renewal Verification'
                : 'बहु-सहकारी सास व्यवस्थापन • सदस्यता तथा नवीकरण प्रमाणीकरण • डोमेन र सुरक्षा अडिट प्रणाली'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchPlatformData}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            title="Refresh platform metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{lang === 'en' ? 'Refresh' : 'ताजा पार्नुहोस्'}</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Gateway & Bank Config' : 'बैंक / FonePay सेटिङ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSupportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-600/60 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Support Access Grant' : 'सपोर्ट एक्सेस अनुमति'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition shadow-md shadow-emerald-900/40 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'en' ? 'Provision Cooperative' : 'नयाँ सहकारी थप्नुहोस्'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold overflow-x-auto">
        {[
          { id: 'overview', label: lang === 'en' ? 'Overview Dashboard' : 'सारांश ड्यासबोर्ड', icon: Activity },
          { id: 'tenants', label: lang === 'en' ? `Cooperatives (${tenants.length})` : `सहकारी संस्थाहरू (${tenants.length})`, icon: Building },
          { id: 'domains', label: lang === 'en' ? `Domains & SSL (${domains.length})` : `डोमेन तथा SSL (${domains.length})`, icon: Globe },
          { id: 'plans', label: lang === 'en' ? 'Subscription Plans' : 'सदस्यता योजनाहरू', icon: CreditCard },
          {
            id: 'renewals',
            label: lang === 'en' ? `Renewals (${pendingRenewalsCount} Pending)` : `नवीकरण अनुरोध (${pendingRenewalsCount} बाँकी)`,
            icon: Receipt,
            hasPending: pendingRenewalsCount > 0
          },
          { id: 'audit', label: lang === 'en' ? `Security Logs (${auditLogs.length})` : `प्लेटफर्म सुरक्षा लग (${auditLogs.length})`, icon: Shield }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition relative whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : tab.hasPending
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-black'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.hasPending && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top SaaS & Financial KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? 'Total Cooperatives' : 'कुल सहकारी संस्था'}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{totalTenants}</div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>{activeTenantsCount} Active & Operational</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 shadow-xs space-y-1 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                {lang === 'en' ? 'Total Software Fees Due' : 'कुल सफ्टवेयर शुल्क'}
              </span>
              <div className="text-2xl font-black text-blue-900 dark:text-blue-200">Rs. {totalSoftwareDue.toLocaleString()}</div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                MRR Est: Rs. {(overview?.mrr || 0).toLocaleString()} / mo
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs space-y-1 bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                {lang === 'en' ? 'Software Amount Paid' : 'संकलित सफ्टवेयर रकम'}
              </span>
              <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300">Rs. {totalSoftwarePaid.toLocaleString()}</div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                {totalSoftwareDue > 0 ? Math.round((totalSoftwarePaid / totalSoftwareDue) * 100) : 100}% Collected
              </div>
            </div>

            <div className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border shadow-xs space-y-1 ${
              totalRemainingBalance > 0
                ? 'border-amber-300 dark:border-amber-800 bg-gradient-to-br from-white to-amber-50/40 dark:from-slate-900 dark:to-amber-950/20'
                : 'border-slate-200 dark:border-slate-800'
            }`}>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {lang === 'en' ? 'Remaining SaaS Balance' : 'बाँकी बक्यौता शुल्क'}
              </span>
              <div className={`text-2xl font-black ${totalRemainingBalance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                Rs. {totalRemainingBalance.toLocaleString()}
              </div>
              <div className="text-[11px] font-bold">
                {totalRemainingBalance > 0 ? (
                  <span className="text-amber-700 dark:text-amber-400">Receivables pending settlement</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">All tenant accounts settled</span>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Platform Dairy Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {lang === 'en' ? 'Registered Farmers & Volume' : 'कुल कृषक तथा दूध संकलन'}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {overview?.totalFarmers || 0} Farmers • {(overview?.totalMilkLiters || 0).toLocaleString()} L
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {overview?.totalCollections || 0} milk intakes across all cooperatives
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Milk className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {lang === 'en' ? 'Staff User Accounts' : 'कर्मचारी प्रयोगकर्ता'}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{overview?.totalUsers || 0}</span>
                <span className="text-[11px] text-slate-500 block">SuperAdmins, Managers & Counter Operators</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {lang === 'en' ? 'Tenant Isolation & Node' : 'डेटा सुरक्षा तथा नोड स्थिति'}
                </span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {overview?.systemHealth?.status || 'OPERATIONAL'}
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                  Uptime {overview?.systemHealth?.uptime || '99.98%'} • {overview?.systemHealth?.memoryUsageMb || 42} MB Heap
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Primary Client Highlight Card */}
          {primaryTenant && (
            <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border-2 border-emerald-200 dark:border-emerald-800/70 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-emerald-600 text-white font-mono text-[10px] font-bold rounded-md">
                    Primary Flagship Tenant
                  </span>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    ID #{primaryTenant.id} • {primaryTenant.slug}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {primaryTenant.organizationName}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Address: <strong>{primaryTenant.address}</strong> | Host: <strong>{primaryTenant.slug}.dairynepal.com</strong> | Farmers: <strong>{primaryTenant.farmerCount}</strong> | Collected: <strong>{primaryTenant.totalMilkLiters} L</strong>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onSwitchTenant && (
                  <button
                    type="button"
                    onClick={() => onSwitchTenant(primaryTenant)}
                    className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Switch Workspace' : 'कार्यक्षेत्र खोल्नुहोस्'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedTenantForProfile(primaryTenant.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Open Tenant Profile' : 'प्रोफाइल खोल्नुहोस्'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Support Access Grants & Recent Activity Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Active Support Access Grants ({supportGrants.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setSupportModalOpen(true)}
                  className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  + Authorize Grant
                </button>
              </div>
              {supportGrants.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  No temporary support access grants authorized in this session.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {supportGrants.slice(0, 5).map(g => (
                    <div key={g.id} className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/70 dark:border-indigo-900 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          Tenant #{g.tenantId} • {g.durationMinutes} min grant
                        </div>
                        <div className="text-[11px] text-slate-500">{g.reason}</div>
                      </div>
                      <div className="text-right font-mono text-[10px] text-indigo-700 dark:text-indigo-300">
                        <div>Exp: {new Date(g.expiresAt).toLocaleTimeString()}</div>
                        <div className="text-slate-400">{g.token?.slice(0, 12)}...</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Recent Platform Events</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('audit')}
                  className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                >
                  View All Logs
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {auditLogs.slice(0, 5).map((log, i) => (
                  <div key={log.id || i} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-mono text-[10px] font-bold">
                        {log.action}
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 truncate">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TENANTS / COOPERATIVES DIRECTORY */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          {/* Top SaaS Financial Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cooperatives Enrolled</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">{totalTenants} Cooperatives</span>
              <span className="text-[10px] text-emerald-600 font-semibold block">
                {activeTenantsCount} Active • {totalTenants - activeTenantsCount} Suspended
              </span>
            </div>
            <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200/80 dark:border-blue-900 shadow-2xs">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">Total Software Due</span>
              <span className="text-xl font-black text-blue-900 dark:text-blue-200">Rs. {totalSoftwareDue.toLocaleString()}</span>
              <span className="text-[10px] text-blue-600 font-semibold block">Cumulative software license fee</span>
            </div>
            <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-900 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Amount Paid</span>
              <span className="text-xl font-black text-emerald-800 dark:text-emerald-300">Rs. {totalSoftwarePaid.toLocaleString()}</span>
              <span className="text-[10px] text-emerald-600 font-semibold block">Verified receipts & billings</span>
            </div>
            <div className={`p-3.5 rounded-2xl border shadow-2xs ${
              totalRemainingBalance > 0
                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                : 'bg-emerald-50/30 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Remaining Balance</span>
              <span className={`text-xl font-black ${totalRemainingBalance > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-400'}`}>
                Rs. {totalRemainingBalance.toLocaleString()}
              </span>
              <span className={`text-[10px] font-semibold block ${totalRemainingBalance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600'}`}>
                {totalRemainingBalance > 0 ? 'Outstanding balance due' : 'All accounts settled'}
              </span>
            </div>
          </div>

          {/* Directory Box */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Header Toolbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/40">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-600" />
                  <span>Dairy Cooperatives Directory & Subscription Ledger</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click any cooperative name or "View Profile" to manage licenses, expiry dates, module flags, staff accounts, and payments.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('plans')}
                  className="text-xs bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Manage Plans</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Cooperative</span>
                </button>
              </div>
            </div>

            {/* Filters & Search Bar */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search cooperative name, slug, or tenant ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-7 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Status:</span>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Cooperatives ({tenants.length})</option>
                  <option value="active">Active Only ({tenants.filter(t => t.status === 'Active').length})</option>
                  <option value="suspended">Suspended ({tenants.filter(t => t.status === 'Suspended').length})</option>
                  <option value="balance_due">Has Remaining Balance ({tenants.filter(t => (Number(t.subscription?.remainingBalance) || 0) > 0).length})</option>
                  <option value="expiring_soon">Expiring Soon (≤30 Days)</option>
                  <option value="expired">Expired</option>
                </select>
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                  Showing {filteredTenants.length} of {tenants.length}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 min-w-[230px]">Cooperative & Tenant Identity</th>
                    <th className="px-4 py-3 min-w-[180px]">Subscription & Expiry</th>
                    <th className="px-4 py-3 min-w-[190px]">Software Fees & Balance</th>
                    <th className="px-4 py-3 min-w-[140px]">Dairy Volume & Staff</th>
                    <th className="px-4 py-3 text-right min-w-[220px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                        No cooperatives match the current search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map(t => {
                      const sub = t.subscription || {};
                      const totalDue = Number(sub.totalAmountDue || 0);
                      const amountPaid = Number(sub.amountPaid || 0);
                      const remaining = Number(sub.remainingBalance ?? Math.max(0, totalDue - amountPaid));
                      const daysRemaining = sub.daysRemaining;
                      const isExpired = sub.isExpired;

                      return (
                        <tr key={t.id} className="hover:bg-emerald-50/30 dark:hover:bg-slate-800/40 transition-colors">
                          {/* Cooperative & Tenant */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setSelectedTenantForProfile(t.id)}
                                className="font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-emerald-600 text-left transition flex items-center gap-1 group cursor-pointer"
                                title="Open cooperative management profile"
                              >
                                <span className="group-hover:underline">{t.organizationName || t.name}</span>
                                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 opacity-70" />
                              </button>
                              {Number(t.id) === 1 && (
                                <span className="text-[9px] uppercase px-1.5 py-0.5 font-bold tracking-wide bg-blue-100 text-blue-700 rounded-md">
                                  Primary
                                </span>
                              )}
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                t.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {t.status || 'Active'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-mono">
                              <span className="text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 select-all font-medium">
                                #{t.id}
                              </span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[180px]" title={`${t.slug}.dairynepal.com`}>
                                {t.slug}.dairynepal.com
                              </span>
                            </div>
                            {t.address && (
                              <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[230px]">
                                {t.address}
                              </div>
                            )}
                          </td>

                          {/* Subscription & Expiry */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold text-[10px]">
                                  {t.plan?.name || t.planId || 'Starter'}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  ({sub.billingCycle || 'Yearly'})
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 font-medium">
                                <span className="text-slate-400">Expires:</span>
                                <strong className="text-slate-800 dark:text-slate-200">
                                  {sub.expiryDate ? new Date(sub.expiryDate).toLocaleDateString() : 'Active'}
                                </strong>
                              </div>
                              <div>
                                {isExpired ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 inline-block">
                                    Expired ({Math.abs(daysRemaining)}d ago)
                                  </span>
                                ) : daysRemaining !== undefined && daysRemaining <= 30 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 inline-block">
                                    Expiring in {daysRemaining} days
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-block">
                                    {daysRemaining !== undefined ? `${daysRemaining} days left` : 'Active'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Software Fees & Balance */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Total Due:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">Rs. {totalDue.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Paid:</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">Rs. {amountPaid.toLocaleString()}</span>
                              </div>
                              <div className="pt-0.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Balance:</span>
                                {remaining <= 0 ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black text-[10px]">
                                    Paid in Full (Rs. 0)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-black text-[10px]">
                                    Rs. {remaining.toLocaleString()} Due
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Dairy Volume & Staff */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => setSelectedTenantForProfile(t.id)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
                                title="View staff user accounts"
                              >
                                <Users className="w-3.5 h-3.5 text-blue-600" />
                                <span>{t.staffCount || 0} Staff • {t.farmerCount || 0} Farmers</span>
                              </button>
                              <div className="text-[10px] text-slate-500 font-mono pl-1">
                                {(t.totalMilkLiters || 0).toLocaleString()} L milk logged
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {onSwitchTenant && (
                                <button
                                  type="button"
                                  onClick={() => onSwitchTenant(t)}
                                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title={`Switch active workspace to ${t.organizationName}`}
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Access Dairy</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedTenantForProfile(t.id)}
                                className="text-xs font-black px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                                title="Open full Cooperative Profile modal"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Profile</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(t)}
                                className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition inline-flex items-center cursor-pointer"
                                title="Quick edit cooperative details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleTenantStatus(t.id, t.status)}
                                className={`text-xs font-semibold px-2 py-1.5 rounded-lg border transition inline-flex items-center cursor-pointer ${
                                  t.status === 'Active'
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                }`}
                                title={t.status === 'Active' ? 'Suspend cooperative operations' : 'Activate cooperative operations'}
                              >
                                <span>{t.status === 'Active' ? 'Suspend' : 'Activate'}</span>
                              </button>
                              {Number(t.id) !== 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTenant(t.id, t.organizationName || t.name)}
                                  className="text-xs font-semibold p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition inline-flex items-center cursor-pointer"
                                  title="Permanently remove cooperative"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DOMAINS & SSL */}
      {activeTab === 'domains' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Custom Domains & SSL Certificates
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Map custom domains (e.g. erp.sanakisan.com.np) and manage HTTPS certificate provisioning for dairy cooperatives.
              </p>
            </div>

            {/* Bind New Custom Domain Form */}
            <form onSubmit={handleAddDomain} className="flex items-center gap-2 flex-wrap">
              <select
                value={newDomainForm.tenantId}
                onChange={(e) => setNewDomainForm(prev => ({ ...prev, tenantId: Number(e.target.value) }))}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold max-w-[200px]"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>
                    #{t.id} {t.organizationName || t.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                placeholder="portal.examplecoop.com.np"
                value={newDomainForm.domain}
                onChange={(e) => setNewDomainForm(prev => ({ ...prev, domain: e.target.value }))}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono min-w-[210px]"
              />
              <button
                type="submit"
                disabled={actionProcessing}
                className="text-xs px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bind Domain</span>
              </button>
            </form>
          </div>

          <div className="space-y-2.5">
            {domains.map(d => {
              const mappedTenant = tenants.find(t => Number(t.id) === Number(d.tenantId));
              return (
                <div key={d.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">{d.domain}</span>
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] uppercase font-bold">
                        {d.type}
                      </span>
                      {d.isPrimary && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-1">
                      Mapped Cooperative: <strong>{mappedTenant ? `${mappedTenant.organizationName} (#${d.tenantId})` : `#${d.tenantId}`}</strong> | SSL: <strong>{d.sslStatus}</strong>
                    </div>
                  </div>

                  <div>
                    {d.verified ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Verified & SSL Active</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleVerifyDomain(d.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Verify DNS & Issue SSL
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SUBSCRIPTION PLANS & ENTITLEMENTS */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Dairy Cooperative Subscription Plans & Pricing Tiers</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure monthly/yearly NPR pricing tiers, farmer capacity quotas, and default Dairy ERP module entitlements.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreatePlan}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Plan Tier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(p => (
              <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 flex flex-col justify-between hover:border-emerald-300 transition group">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-emerald-600 transition">{p.name}</h4>
                    <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      Tier
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-600">
                    Rs. {Number(p.priceMonthly || 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ month</span>
                  </div>
                  {p.priceYearly && (
                    <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                      Rs. {Number(p.priceYearly).toLocaleString()} / year (Billed annually)
                    </div>
                  )}
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 space-y-1 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>• Max Collection Centers: <strong>{p.maxBranches}</strong></div>
                    <div>• Max Staff Accounts: <strong>{p.maxStaff}</strong></div>
                    <div>• Max Registered Farmers: <strong>{Number(p.maxFarmers || 0).toLocaleString()}</strong></div>
                    <div>• Cloud Storage Quota: <strong>{p.storageQuotaGb || Math.round((p.storageQuotaMb || 0) / 1024)} GB</strong></div>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Enabled Modules:</span>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(p.modules || {}).map(([k, v]) => (
                        <span key={k} className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                          v ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          {k}: {v ? 'YES' : 'NO'}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <span className="font-mono text-[10px] text-slate-400 font-bold">{p.id}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditPlan(p)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold text-xs border border-emerald-200 hover:border-emerald-600 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Plan</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SUBSCRIPTION RENEWALS & BANK/FONEPAY VERIFICATION */}
      {activeTab === 'renewals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Verifications</span>
              <div className="text-2xl font-black text-amber-600 flex items-center gap-2">
                <span>{pendingRenewalsCount}</span>
                {pendingRenewalsCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />}
              </div>
              <div className="text-[11px] text-amber-700 font-bold">Action Required by Platform Owner</div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approved Renewals</span>
              <div className="text-2xl font-black text-emerald-600">
                {renewals.filter(r => r.status === 'APPROVED').length}
              </div>
              <div className="text-[11px] text-emerald-700 font-bold">Cooperative Licenses Extended</div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rejected Submissions</span>
              <div className="text-2xl font-black text-rose-600">
                {renewals.filter(r => r.status === 'REJECTED').length}
              </div>
              <div className="text-[11px] text-rose-700 font-bold">Feedback Sent to Cooperative</div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Renewal Revenue</span>
              <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400">
                Rs. {renewals.filter(r => r.status === 'APPROVED').reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-indigo-600 font-bold">{paymentConfig.bankName || 'Nabil Bank'} Verified</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Renewal Requests & Bank / FonePay Receipt Review</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect payment vouchers, verify bank/QR credit, and approve or reject cooperative license renewals.
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold flex-wrap">
                {[
                  { id: 'all', label: `All (${renewals.length})` },
                  { id: 'pending', label: `Pending (${pendingRenewalsCount})` },
                  { id: 'approved', label: `Approved (${renewals.filter(r => r.status === 'APPROVED').length})` },
                  { id: 'rejected', label: `Rejected (${renewals.filter(r => r.status === 'REJECTED').length})` }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRenewalFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      renewalFilter === f.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {renewals
                .filter(r => {
                  if (renewalFilter === 'pending') return r.status === 'PENDING_VERIFICATION';
                  if (renewalFilter === 'approved') return r.status === 'APPROVED';
                  if (renewalFilter === 'rejected') return r.status === 'REJECTED';
                  return true;
                })
                .length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  No renewal requests found in this filter category.
                </div>
              ) : (
                renewals
                  .filter(r => {
                    if (renewalFilter === 'pending') return r.status === 'PENDING_VERIFICATION';
                    if (renewalFilter === 'approved') return r.status === 'APPROVED';
                    if (renewalFilter === 'rejected') return r.status === 'REJECTED';
                    return true;
                  })
                  .map(r => {
                    const isPending = r.status === 'PENDING_VERIFICATION';
                    const isApproved = r.status === 'APPROVED';
                    const isRejected = r.status === 'REJECTED';

                    return (
                      <div key={r.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            onClick={() => setReceiptToInspect(r)}
                            className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 cursor-pointer group relative shadow-2xs hover:border-emerald-500 transition"
                            title="Click to inspect full receipt"
                          >
                            {r.receiptUrl?.startsWith('data:image/') || r.receiptUrl?.startsWith('http') ? (
                              <img src={r.receiptUrl} alt="Receipt" className="w-full h-full object-cover group-hover:scale-105 transition" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500">
                                <FileText className="w-6 h-6" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 dark:text-white text-sm">{r.tenantName}</span>
                              <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                                Tenant #{r.tenantId}
                              </span>
                              {isPending ? (
                                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300 inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Pending Verification</span>
                                </span>
                              ) : isApproved ? (
                                <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Approved</span>
                                </span>
                              ) : (
                                <span className="bg-rose-100 text-rose-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-300 inline-flex items-center gap-1">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>Rejected</span>
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-3 flex-wrap">
                              <span>Payer: <strong className="text-slate-900 dark:text-white">{r.payerName}</strong> ({r.payerPhone || '-'})</span>
                              <span>•</span>
                              <span>Plan: <strong className="text-blue-700 dark:text-blue-400">{r.planName}</strong> ({r.billingCycle})</span>
                              <span>•</span>
                              <span>Amount: <strong className="text-emerald-700 dark:text-emerald-400">{r.currency} {Number(r.amount).toLocaleString()}</strong></span>
                            </div>

                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 flex-wrap">
                              <span>Ref: <strong className="text-slate-700 dark:text-slate-300">{r.transactionRef || 'N/A'}</strong></span>
                              <span>•</span>
                              <span>Submitted: {new Date(r.submittedAt).toLocaleString()}</span>
                            </div>

                            {r.notes && (
                              <div className="text-[11px] text-slate-500 italic">{r.notes}</div>
                            )}

                            {isRejected && r.rejectionReason && (
                              <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg mt-1 font-medium">
                                <strong>Rejection Reason:</strong> {r.rejectionReason}
                              </div>
                            )}

                            {isApproved && (
                              <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg mt-1 font-medium">
                                Approved by {r.reviewedBy || 'Platform Owner'} on {new Date(r.reviewedAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                          <button
                            type="button"
                            onClick={() => setReceiptToInspect(r)}
                            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Inspect Voucher</span>
                          </button>

                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => setApproveConfirmTarget(r)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve Renewal</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRejectModalTarget(r);
                                  setRejectionReason('Transaction reference not found in bank statement.');
                                  setRejectionInstructions('Please verify the FonePay / Nabil Bank reference number and upload an uncropped payment slip.');
                                }}
                                className="px-3 py-1.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PLATFORM SECURITY AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Immutable Platform Security Audit Trail
              </h3>
              <p className="text-[11px] text-slate-500">
                Real-time developer console operations, license extensions, plan edits, domain verifications & grants
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">Append-Only Store ({auditLogs.length} Events)</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">No platform security events logged yet.</div>
            ) : (
              auditLogs.map((log, i) => (
                <div key={log.id || i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'WARNING' || log.status === 'ERROR'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {log.action}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {log.userEmail || 'admin@dairy.local'} ({log.userRole || 'SuperAdmin'})
                      </span>
                      {log.tenantId && <span className="text-slate-500">[Tenant #{log.tenantId}]</span>}
                    </div>
                    {log.details && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-sans">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 shrink-0 text-right">
                    <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                    <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CREATE NEW COOPERATIVE WIZARD MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-emerald-700 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black tracking-tight">Provision New Dairy Cooperative</h3>
                <p className="text-xs text-emerald-100">Creates isolated cooperative database, units, milk products, rate chart & SuperAdmin</p>
              </div>
              <button type="button" onClick={() => setCreateModalOpen(false)} className="text-white/80 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoop} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Cooperative / Dairy Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. चितवन दुग्ध उत्पादक सहकारी संस्था लि."
                    value={newCoop.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                      setNewCoop({ ...newCoop, name, slug: slug || newCoop.slug });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Unique Subdomain Slug *</label>
                  <input
                    type="text"
                    required
                    pattern="[a-z0-9-]+"
                    placeholder="e.g. chitwan-dairy"
                    value={newCoop.slug}
                    onChange={(e) => setNewCoop({ ...newCoop, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-blue-600"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">{newCoop.slug || 'coop'}.dairynepal.com</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Address / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bharatpur-10, Chitwan"
                    value={newCoop.address}
                    onChange={(e) => setNewCoop({ ...newCoop, address: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Subscription Plan *</label>
                  <select
                    value={newCoop.planId}
                    onChange={(e) => handleNewCoopPlanChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Rs. {Number(p.priceYearly || 0).toLocaleString()}/yr)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Billing Cycle</label>
                  <select
                    value={newCoop.billingCycle}
                    onChange={(e) => handleNewCoopBillingCycleChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                  >
                    <option value="Yearly">Yearly (Annual License)</option>
                    <option value="Monthly">Monthly (1 Month)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">License Expiry Date</label>
                  <input
                    type="date"
                    value={newCoop.subscriptionExpiryDate}
                    onChange={(e) => setNewCoop({ ...newCoop, subscriptionExpiryDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Total Software Fee Due (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newCoop.totalAmountDue}
                    onChange={(e) => setNewCoop({ ...newCoop, totalAmountDue: e.target.value })}
                    className="w-full p-2.5 rounded-xl border-2 border-emerald-400 bg-emerald-50/30 font-black font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Initial Payment Paid (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 35000"
                    value={newCoop.initialPayment}
                    onChange={(e) => setNewCoop({ ...newCoop, initialPayment: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 9855012345"
                    value={newCoop.phone}
                    onChange={(e) => setNewCoop({ ...newCoop, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                {/* Module Checkboxes */}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-900 flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCoop.enablePOS}
                      onChange={(e) => setNewCoop({ ...newCoop, enablePOS: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <div>
                      <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 block">Counter POS & Wholesale Orders</span>
                      <span className="text-[10px] text-indigo-700 dark:text-indigo-300 block">Retail billing, FonePay QR & scheduled deliveries</span>
                    </div>
                  </label>

                  <label className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900 flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCoop.enableProcessing}
                      onChange={(e) => setNewCoop({ ...newCoop, enableProcessing: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <div>
                      <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 block">Dairy Processing & Batches</span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">Paneer, Curd, Ghee, Butter production & stock batches</span>
                    </div>
                  </label>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white block">Initial Cooperative SuperAdmin Account</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Admin Username *</label>
                  <input
                    type="text"
                    required
                    pattern="[a-zA-Z0-9]+"
                    placeholder="e.g. chitwanadmin"
                    value={newCoop.adminUsername}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                      setNewCoop({
                        ...newCoop,
                        adminUsername: clean,
                        adminEmail: clean ? `${clean.toLowerCase()}@dairy.local` : ''
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Admin Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newCoop.adminPassword}
                    onChange={(e) => setNewCoop({ ...newCoop, adminPassword: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Cooperative Manager / Chairperson</label>
                  <input
                    type="text"
                    placeholder="e.g. Shyam Krishna Adhikari"
                    value={newCoop.managerName}
                    onChange={(e) => setNewCoop({ ...newCoop, managerName: e.target.value, adminName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md cursor-pointer"
                >
                  {actionProcessing ? 'Provisioning...' : 'Provision Cooperative Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK EDIT COOPERATIVE MODAL */}
      {editModalOpen && editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                  <Edit className="w-4 h-4 text-emerald-200" />
                  <span>Edit Cooperative & Credentials</span>
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Update organization details, subscription tier, expiry date, and reset Admin password
                </p>
              </div>
              <button type="button" onClick={() => setEditModalOpen(false)} className="text-white/80 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Cooperative Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Subdomain Slug *</label>
                  <input
                    type="text"
                    required
                    value={editForm.slug}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Admin Password Reset Box */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>Cooperative Admin Credentials</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Admin Name</label>
                    <input
                      type="text"
                      value={editForm.adminName}
                      onChange={(e) => setEditForm({ ...editForm, adminName: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reset Password (Optional)</label>
                    <input
                      type="text"
                      value={editForm.adminPassword}
                      onChange={(e) => setEditForm({ ...editForm, adminPassword: e.target.value })}
                      placeholder="Leave blank to keep current password"
                      className="w-full p-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Subscription & License Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subscription Plan</label>
                  <select
                    value={editForm.planId}
                    onChange={(e) => setEditForm({ ...editForm, planId: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={editForm.subscriptionExpiryDate}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionExpiryDate: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">License Fee Due (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.totalAmountDue}
                    onChange={(e) => setEditForm({ ...editForm, totalAmountDue: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Address</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md cursor-pointer"
                >
                  {actionProcessing ? 'Saving...' : 'Save Cooperative Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / CREATE SUBSCRIPTION PLAN MODAL */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-200" />
                  <span>{editingPlan ? `Edit Subscription Plan: ${editingPlan.name}` : 'Create New Subscription Plan'}</span>
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Customize plan NPR pricing, cooperative capacity limits & module entitlements
                </p>
              </div>
              <button type="button" onClick={() => setPlanModalOpen(false)} className="text-white/80 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    placeholder="e.g. Cooperative Professional"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Plan ID {editingPlan ? '(Read-only)' : '*'}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingPlan)}
                    value={planForm.id}
                    onChange={(e) => setPlanForm({ ...planForm, id: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-mono ${
                      editingPlan ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed text-slate-500' : 'bg-white dark:bg-slate-800'
                    }`}
                    placeholder="e.g. plan-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Monthly Price (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={planForm.priceMonthly}
                    onChange={(e) => setPlanForm({ ...planForm, priceMonthly: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-emerald-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Yearly Price (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={planForm.priceYearly}
                    onChange={(e) => setPlanForm({ ...planForm, priceYearly: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-emerald-700 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Max Centers</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={planForm.maxBranches}
                    onChange={(e) => setPlanForm({ ...planForm, maxBranches: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Max Staff</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={planForm.maxStaff}
                    onChange={(e) => setPlanForm({ ...planForm, maxStaff: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Farmers Quota</label>
                  <input
                    type="number"
                    required
                    min="50"
                    value={planForm.maxFarmers}
                    onChange={(e) => setPlanForm({ ...planForm, maxFarmers: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Storage (GB)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={planForm.storageQuotaGb}
                    onChange={(e) => setPlanForm({ ...planForm, storageQuotaGb: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Default Dairy Module Entitlements
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DAIRY_PLAN_MODULES.map(({ key, label }) => {
                    const isChecked = Boolean(planForm.modules?.[key]);
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition ${
                          isChecked
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 font-medium'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setPlanForm({
                            ...planForm,
                            modules: {
                              ...planForm.modules,
                              [key]: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span className="text-[11px] flex-1">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{actionProcessing ? 'Saving...' : editingPlan ? 'Save Plan Changes' : 'Create Plan Tier'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT GATEWAY & BANK CONFIG MODAL */}
      {paymentConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-amber-400" />
                  <span>SaaS Billing Bank & FonePay QR Settings</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">Shown to cooperatives when submitting software renewal payments</p>
              </div>
              <button type="button" onClick={() => setPaymentConfigModalOpen(false)} className="text-white/70 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentConfig} className="p-6 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Software Vendor Company Name</label>
                  <input
                    type="text"
                    value={paymentConfig.companyName || ''}
                    onChange={(e) => setPaymentConfig(prev => ({ ...prev, companyName: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={paymentConfig.bankName || ''}
                    onChange={(e) => setPaymentConfig(prev => ({ ...prev, bankName: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={paymentConfig.accountNumber || ''}
                    onChange={(e) => setPaymentConfig(prev => ({ ...prev, accountNumber: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    value={paymentConfig.accountName || ''}
                    onChange={(e) => setPaymentConfig(prev => ({ ...prev, accountName: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">FonePay Merchant ID</label>
                  <input
                    type="text"
                    value={paymentConfig.fonepayMerchantId || ''}
                    onChange={(e) => setPaymentConfig(prev => ({ ...prev, fonepayMerchantId: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={paymentConfig.supportEmail || ''}
                    onChange={(e) => setPaymentConfig(prev => ({ ...prev, supportEmail: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Support Phone</label>
                  <input
                    type="text"
                    value={paymentConfig.supportPhone || ''}
                    onChange={(e) => setPaymentConfig(prev => ({ ...prev, supportPhone: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md cursor-pointer"
                >
                  Save Payment Gateway
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPORT ACCESS GRANT MODAL */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-indigo-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black tracking-tight">Time-Limited Support Access Grant</h3>
                <p className="text-xs text-indigo-200">Zero backdoor access: All support sessions are expiring & audited</p>
              </div>
              <button type="button" onClick={() => setSupportModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupportGrant} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Select Cooperative *</label>
                <select
                  value={supportForm.tenantId}
                  onChange={(e) => setSupportForm({ ...supportForm, tenantId: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.organizationName || t.name} (#{t.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Documented Reason / Ticket # *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Ticket #402: Verify FAT/SNF rate calculation & farmer ledger sync"
                  value={supportForm.reason}
                  onChange={(e) => setSupportForm({ ...supportForm, reason: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Grant Duration (Minutes)</label>
                <select
                  value={supportForm.durationMinutes}
                  onChange={(e) => setSupportForm({ ...supportForm, durationMinutes: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                >
                  <option value={15}>15 Minutes (Emergency Quick Check)</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Hour (Standard)</option>
                  <option value={120}>2 Hours</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSupportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md cursor-pointer"
                >
                  Authorize Grant & Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVE CONFIRMATION MODAL */}
      {approveConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Confirm Renewal Approval</h3>
                <p className="text-xs text-slate-500">Extend cooperative subscription license</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Cooperative:</span>
                <strong className="text-slate-900 dark:text-white">{approveConfirmTarget.tenantName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Payer:</span>
                <strong className="text-slate-900 dark:text-white">{approveConfirmTarget.payerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Plan & Cycle:</span>
                <strong className="text-blue-700 dark:text-blue-400">{approveConfirmTarget.planName} ({approveConfirmTarget.billingCycle})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Verified Amount:</span>
                <strong className="text-emerald-700 dark:text-emerald-400">{approveConfirmTarget.currency} {Number(approveConfirmTarget.amount).toLocaleString()}</strong>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Approving updates tenant status to <strong>Active</strong> and extends expiration by <strong>{approveConfirmTarget.billingCycle === 'Monthly' ? '1 Month (+30 days)' : '1 Year (+365 days)'}</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setApproveConfirmTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionProcessing}
                onClick={() => handleApproveRenewal(approveConfirmTarget)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {actionProcessing ? 'Approving...' : 'Confirm & Extend License'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT RENEWAL MODAL */}
      {rejectModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Reject Renewal Request</h3>
                <p className="text-xs text-slate-500">Provide rejection reason and instructions for the cooperative</p>
              </div>
            </div>

            <form onSubmit={handleRejectRenewal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Rejection Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  'Transaction reference not found on bank statement',
                  'Receipt screenshot is blurry or unreadable',
                  'Paid amount does not match subscription plan fee'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Resubmission Instructions *</label>
                <textarea
                  required
                  rows={3}
                  value={rejectionInstructions}
                  onChange={(e) => setRejectionInstructions(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRejectModalTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {actionProcessing ? 'Rejecting...' : 'Reject Renewal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT INSPECTOR MODAL */}
      {receiptToInspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold">{receiptToInspect.tenantName} - Voucher Inspection</h4>
                <p className="text-[11px] text-slate-400">
                  Payer: {receiptToInspect.payerName} • Ref: {receiptToInspect.transactionRef || 'N/A'} • {receiptToInspect.currency} {Number(receiptToInspect.amount).toLocaleString()}
                </p>
              </div>
              <button type="button" onClick={() => setReceiptToInspect(null)} className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950 max-h-[70vh]">
              {receiptToInspect.receiptUrl?.startsWith('data:image/') || receiptToInspect.receiptUrl?.startsWith('http') ? (
                <img src={receiptToInspect.receiptUrl} alt="Receipt Full View" className="max-h-[60vh] max-w-full rounded-xl shadow-md object-contain" />
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-bold">Payment Voucher Reference: {receiptToInspect.transactionRef || 'N/A'}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{receiptToInspect.receiptFileName || 'Voucher uploaded via Portal'}</p>
                </div>
              )}
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Submitted on {new Date(receiptToInspect.submittedAt).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => setReceiptToInspect(null)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TENANT PROFILE & MANAGEMENT MODAL */}
      {selectedTenantForProfile && (
        <TenantProfileModal
          isOpen={Boolean(selectedTenantForProfile)}
          tenantId={selectedTenantForProfile}
          onClose={() => setSelectedTenantForProfile(null)}
          authToken={authToken}
          plans={plans}
          onSwitchTenant={onSwitchTenant}
          onTenantUpdated={fetchPlatformData}
        />
      )}
    </div>
  );
}
