import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DairyDashboard from './components/Dashboard/DairyDashboard';
import MilkCollectionManager from './components/MilkCollection/MilkCollectionManager';
import MilkFatSnfConfigModal from './components/MilkCollection/MilkFatSnfConfigModal';
import FatSnfPricingManager from './components/MilkCollection/FatSnfPricingManager';
import FarmerPaymentManager from './components/FarmerPayments/FarmerPaymentManager';
import InstantSalePOS from './components/Sales/InstantSalePOS';
import OrderManager from './components/Orders/OrderManager';
import InventoryManager from './components/Inventory/InventoryManager';
import ProductionManager from './components/Production/ProductionManager';
import PurchaseManager from './components/Purchases/PurchaseManager';
import FinanceManager from './components/Finance/FinanceManager';
import CustomerManager from './components/Customers/CustomerManager';
import ReportsManager from './components/Reports/ReportsManager';
import SettingsManager from './components/Settings/SettingsManager';
import AuditLogViewer from './components/Audit/AuditLogViewer';
import DeveloperControlPanel from './components/Developer/DeveloperControlPanel';
import { isTabAllowed } from './utils/rbac';
import { syncFetchAuthContext, getDerivedUsername } from './utils/fetchAuth';

import LoginModal from './components/Auth/LoginModal';
import NepaliCalendarModal from './components/Common/NepaliCalendarModal';
import SlipPrintModal from './components/Common/SlipPrintModal';
import FarmerProfileModal from './components/Common/FarmerProfileModal';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

function DairyMainApp() {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState('units');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('dairy_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarCollapsed(prev => {
        const next = !prev;
        try { localStorage.setItem('dairy_sidebar_collapsed', String(next)); } catch (_) {}
        return next;
      });
    } else {
      setSidebarOpen(prev => !prev);
    }
  };

  const handleNavigateTab = (tab, subTab) => {
    const roles = currentUser?.roles || ['User'];
    if (!isTabAllowed(tab, roles, currentUser)) return;
    setActiveTab(tab);
    if (subTab) setSettingsSubTab(subTab);
  };

  // Modals
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [fatSnfConfigModalOpen, setFatSnfConfigModalOpen] = useState(false);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [slipModalData, setSlipModalData] = useState({ type: '', data: null });
  const [farmerProfileState, setFarmerProfileState] = useState({ isOpen: false, farmer: null, tab: 'all' });

  // Auth & Tenant State
  const [authToken, setAuthToken] = useState(() => {
    try {
      return localStorage.getItem('dairy_token') || '';
    } catch {
      return '';
    }
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('dairy_user');
      return saved ? JSON.parse(saved) : {
        id: 1,
        username: 'admin',
        name: 'System Admin',
        email: 'admin@dairy.local',
        roles: ['SuperAdmin', 'Admin']
      };
    } catch {
      return null;
    }
  });

  const [activeTenant, setActiveTenant] = useState({
    id: 1,
    name: 'sfacl',
    organizationName: 'साना किसान कृषि सहकारी सस्था लि.',
    address: 'गौशाला-१२, काठमाडौं',
    timezone: 'Asia/Kathmandu',
    host: 'sfacl.dairynepal.com',
    expirationDateTimeUtms: 1893456000000
  });

  const [availableTenants, setAvailableTenants] = useState([]);

  // Core Data States
  const [analytics, setAnalytics] = useState(null);
  const [cashBank, setCashBank] = useState({ cashBalance: 25000, bankBalance: 75000, totalBalance: 100000 });
  const [collections, setCollections] = useState([]);
  const [orders, setOrders] = useState([]);
  const [futureOrders, setFutureOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventorySummary, setInventorySummary] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [units, setUnits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [batches, setBatches] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [users, setUsers] = useState([]);
  const [fatSnfConfig, setFatSnfConfig] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // Fetch all core system data
  const fetchData = useCallback(async () => {
    try {
      syncFetchAuthContext({
        user: currentUser,
        token: authToken,
        tenantId: activeTenant?.id || 1
      });
      const tenantHeaders = {
        'x-tenant-id': String(activeTenant?.id || 1),
        'x-user-name': encodeURIComponent(currentUser?.name || 'System Admin'),
        'x-username': encodeURIComponent(getDerivedUsername(currentUser)),
        'x-user-id': String(currentUser?.id || 1),
        'x-user-email': currentUser?.email || ''
      };

      const [
        tenantsRes,
        analyticsRes,
        cashBankRes,
        collectionsRes,
        ordersRes,
        futureOrdersRes,
        productsRes,
        invRes,
        movementsRes,
        unitsRes,
        custRes,
        paymentsRes,
        purchasesRes,
        batchesRes,
        expensesRes,
        ledgerRes,
        usersRes,
        configRes,
        auditRes
      ] = await Promise.all([
        fetch('/api/Tenant'),
        fetch('/api/Reports/dashboard', { headers: tenantHeaders }),
        fetch('/api/Finance/cash-bank-summary', { headers: tenantHeaders }),
        fetch('/api/MilkCollection', { headers: tenantHeaders }),
        fetch('/api/Order', { headers: tenantHeaders }),
        fetch('/api/Order/future-orders', { headers: tenantHeaders }),
        fetch('/api/Product', { headers: tenantHeaders }),
        fetch('/api/Inventory/summary', { headers: tenantHeaders }),
        fetch('/api/Inventory/movements', { headers: tenantHeaders }),
        fetch('/api/Unit', { headers: tenantHeaders }),
        fetch('/api/Customer', { headers: tenantHeaders }),
        fetch('/api/MilkCollectionPayment', { headers: tenantHeaders }),
        fetch('/api/Purchase', { headers: tenantHeaders }),
        fetch('/api/Production', { headers: tenantHeaders }),
        fetch('/api/Finance/expenses', { headers: tenantHeaders }),
        fetch('/api/Finance/ledger', { headers: tenantHeaders }),
        fetch('/api/UserManager', { headers: tenantHeaders }),
        fetch('/api/MilkFatAndSnfConfiguration', { headers: tenantHeaders }),
        fetch('/api/AuditLog?maxResultCount=500', { headers: tenantHeaders })
      ]);

      if (tenantsRes.ok) {
        const d = await tenantsRes.json();
        setAvailableTenants(d.items || []);
      }
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (cashBankRes.ok) setCashBank(await cashBankRes.json());
      if (collectionsRes.ok) {
        const d = await collectionsRes.json();
        setCollections(d.items || []);
      }
      if (ordersRes.ok) {
        const d = await ordersRes.json();
        setOrders(d.items || []);
      }
      if (futureOrdersRes.ok) {
        const d = await futureOrdersRes.json();
        setFutureOrders(d.items || []);
      }
      if (productsRes.ok) {
        const d = await productsRes.json();
        setProducts(d.items || []);
      }
      if (invRes.ok) setInventorySummary(await invRes.json());
      if (movementsRes.ok) {
        const d = await movementsRes.json();
        setStockMovements(d.items || []);
      }
      if (unitsRes.ok) {
        const d = await unitsRes.json();
        setUnits(d.items || []);
      }
      if (custRes.ok) {
        const d = await custRes.json();
        setCustomers(d.items || []);
      }
      if (paymentsRes.ok) {
        const d = await paymentsRes.json();
        setPayments(d.items || []);
      }
      if (purchasesRes.ok) {
        const d = await purchasesRes.json();
        setPurchases(d.items || []);
      }
      if (batchesRes.ok) {
        const d = await batchesRes.json();
        setBatches(d.items || []);
      }
      if (expensesRes.ok) {
        const d = await expensesRes.json();
        setExpenses(d.items || []);
      }
      if (ledgerRes.ok) {
        const d = await ledgerRes.json();
        setLedger(d.items || []);
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.items || []);
      }
      if (configRes.ok) setFatSnfConfig(await configRes.json());
      if (auditRes.ok) {
        const d = await auditRes.json();
        setAuditLogs(d.items || []);
      }
    } catch (err) {
      console.error('Error fetching dairy data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.id, currentUser?.name, currentUser?.id, currentUser?.email]);

  useEffect(() => {
    syncFetchAuthContext({
      user: currentUser,
      token: authToken,
      tenantId: activeTenant?.id || 1
    });
  }, [currentUser, authToken, activeTenant?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const roles = currentUser?.roles || ['User'];
    if (!isTabAllowed(activeTab, roles, currentUser)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentUser]);

  const handleTenantUpdated = useCallback(async () => {
    await fetchData();
    try {
      const res = await fetch(`/api/Tenant/${activeTenant?.id || 1}`);
      if (res.ok) {
        const fresh = await res.json();
        setActiveTenant(fresh);
      }
    } catch (_) {}
  }, [fetchData, activeTenant?.id]);

  const handleSwitchTenant = async (tOrId) => {
    if (!tOrId) return;
    if (typeof tOrId === 'object') {
      setActiveTenant(tOrId);
    } else {
      const numId = Number(tOrId);
      const found = availableTenants.find(t => Number(t.id) === numId);
      if (found) {
        setActiveTenant(found);
      } else {
        try {
          const res = await fetch(`/api/Tenant/${numId}`);
          if (res.ok) {
            const fresh = await res.json();
            setActiveTenant(fresh);
          }
        } catch (err) {
          console.error('Error switching cooperative:', err);
        }
      }
    }
    if (activeTab === 'platform') {
      setActiveTab('dashboard');
    }
  };

  const handleLoginSuccess = (data) => {
    const loggedUser = data.user ? {
      ...data.user,
      username: getDerivedUsername(data.user)
    } : null;
    const nextTenantId = data.activeTenant?.id || activeTenant?.id || 1;
    syncFetchAuthContext({
      user: loggedUser,
      token: data.token || '',
      tenantId: nextTenantId
    });
    setCurrentUser(loggedUser);
    if (data.token) {
      setAuthToken(data.token);
      try { localStorage.setItem('dairy_token', data.token); } catch (e) {}
    } else {
      setAuthToken('');
      try { localStorage.removeItem('dairy_token'); } catch (e) {}
    }
    if (data.activeTenant) setActiveTenant(data.activeTenant);
    try {
      localStorage.setItem('dairy_user', JSON.stringify(loggedUser));
    } catch (e) {}
    fetchData();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    syncFetchAuthContext({
      user: null,
      token: '',
      tenantId: activeTenant?.id || 1
    });
    setCurrentUser(null);
    setAuthToken('');
    try {
      localStorage.removeItem('dairy_user');
      localStorage.removeItem('dairy_token');
    } catch (e) {}
  };

  const handleOpenPrintSlip = (type, data) => {
    setSlipModalData({ type, data });
    setSlipModalOpen(true);
  };

  const handleInspectFarmer = (farmerOrRef, tab = 'all') => {
    if (!farmerOrRef) return;
    const matched = customers.find(
      c => Number(c.id) === Number(farmerOrRef.id) ||
        (farmerOrRef.code && String(c.code) === String(farmerOrRef.code))
    ) || farmerOrRef;
    setFarmerProfileState({ isOpen: true, farmer: matched, tab: tab || 'all' });
  };

  const subscriptionWarning = activeTenant?.expirationDateTimeUtms && activeTenant.expirationDateTimeUtms < Date.now() + 30 * 86400000 ? {
    isExpired: activeTenant.expirationDateTimeUtms < Date.now(),
    message: activeTenant.expirationDateTimeUtms < Date.now()
      ? (lang === 'en' ? 'Warning: Software subscription expired. Please renew.' : 'सावधानी: यो संस्थाको सफ्टवेयर सदस्यता समाप्त भएको छ । कृपया तुरुन्त नवीकरण गर्नुहोस् ।')
      : (lang === 'en' ? 'Notice: Software subscription expires soon. Please renew on time.' : 'सूचना: सफ्टवेयर सदस्यता चाँडै समाप्त हुँदैछ । कृपया समयमै नवीकरण गर्नुहोस् ।')
  } : null;

  return (
    <ErrorBoundary>
      <div className="h-screen print:h-auto bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden print:overflow-visible text-slate-800 dark:text-slate-100 antialiased font-sans">
        {/* Top Navbar */}
        <Navbar
          currentUser={currentUser}
          activeTenant={activeTenant}
          availableTenants={availableTenants}
          onSwitchTenant={handleSwitchTenant}
          onOpenLogin={() => setLoginModalOpen(true)}
          onOpenCalendar={() => setCalendarModalOpen(true)}
          subscriptionWarning={subscriptionWarning}
          onToggleSidebar={handleToggleSidebar}
          isSidebarOpen={sidebarOpen}
          onNavigateTab={handleNavigateTab}
          onOpenFatSnfConfig={() => setFatSnfConfigModalOpen(true)}
        />

        {/* Body Layout: Sidebar + Main Content */}
        <div className="flex-1 min-h-0 flex overflow-hidden print:overflow-visible">
          <Sidebar
            activeTab={activeTab}
            onTabChange={handleNavigateTab}
            currentUser={currentUser}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => {
              setSidebarCollapsed(prev => {
                const next = !prev;
                try { localStorage.setItem('dairy_sidebar_collapsed', String(next)); } catch (_) {}
                return next;
              });
            }}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            counts={{
              'milk-collection': collections.length,
              'future-orders': futureOrders.length,
              'inventory': inventorySummary.filter(i => i.isLowStock).length,
              'audit-logs': auditLogs.length
            }}
          />

          <main className="flex-1 min-h-0 p-4 lg:p-6 overflow-y-auto print:overflow-visible">
            {activeTab === 'dashboard' && (
              <DairyDashboard
                analytics={analytics}
                cashBank={cashBank}
                inventorySummary={inventorySummary}
                recentCollections={collections}
                recentOrders={orders}
                onNavigateTab={setActiveTab}
                onOpenAddMilk={() => setActiveTab('milk-collection')}
                onOpenPos={() => setActiveTab('pos-sales')}
                onOpenRecordExpense={() => setActiveTab('finance')}
                onOpenFarmerPayment={() => setActiveTab('farmer-payments')}
                onInspectFarmer={handleInspectFarmer}
              />
            )}

            {activeTab === 'milk-collection' && (
              <MilkCollectionManager
                collections={collections}
                farmers={customers.filter(c => c.customerType === 1 || c.customerType === 3)}
                config={fatSnfConfig}
                tenant={activeTenant}
                onRefresh={fetchData}
                onPrintSlip={(col) => handleOpenPrintSlip('milk-collection', col)}
                onInspectFarmer={handleInspectFarmer}
              />
            )}

            {activeTab === 'fat-snf-config' && (
              <FatSnfPricingManager
                config={fatSnfConfig}
                onOpenEditModal={() => setFatSnfConfigModalOpen(true)}
              />
            )}

            {activeTab === 'farmer-payments' && (
              <FarmerPaymentManager
                farmers={customers}
                payments={payments}
                collections={collections}
                auditLogs={auditLogs}
                tenant={activeTenant}
                onRefresh={fetchData}
                onPrintSlip={(farmer) => handleOpenPrintSlip('farmer-statement', farmer)}
                onPrintPaymentSlip={(payment) => handleOpenPrintSlip('farmer-slip', payment)}
                onPrintMilkSlip={(col) => handleOpenPrintSlip('milk-collection', col)}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'pos-sales' && (
              <InstantSalePOS
                products={products}
                inventorySummary={inventorySummary}
                customers={customers}
                orders={orders}
                tenant={activeTenant}
                onRefresh={fetchData}
                onPrintReceipt={(ord) => handleOpenPrintSlip('sale-slip', ord)}
              />
            )}

            {activeTab === 'future-orders' && (
              <OrderManager
                futureOrders={futureOrders}
                customers={customers}
                products={products}
                tenant={activeTenant}
                onRefresh={fetchData}
                onPrintSlip={(ord) => handleOpenPrintSlip('sale-slip', ord)}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryManager
                products={products}
                inventorySummary={inventorySummary}
                units={units}
                movements={stockMovements}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'production' && (
              <ProductionManager
                batches={batches}
                products={products}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'purchases' && (
              <PurchaseManager
                purchases={purchases}
                products={products}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'finance' && (
              <FinanceManager
                cashBank={cashBank}
                ledger={ledger}
                expenses={expenses}
                customers={customers}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'customers' && (
              <CustomerManager
                tenant={activeTenant}
                customers={customers}
                collections={collections}
                payments={payments}
                auditLogs={auditLogs}
                onRefresh={fetchData}
                onOpenRecordMilk={() => setActiveTab('milk-collection')}
                onOpenRecordPayment={() => setActiveTab('farmer-payments')}
                onPrintFarmerReport={(f) => handleOpenPrintSlip('farmer-statement', f)}
                onPrintSlip={(data) => handleOpenPrintSlip('milk-collection', data)}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsManager
                analytics={analytics}
                collections={collections}
                orders={orders}
                tenant={activeTenant}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsManager
                tenant={activeTenant}
                units={units}
                users={users}
                currentUser={currentUser}
                onRefresh={fetchData}
                initialTab={settingsSubTab}
              />
            )}

            {activeTab === 'audit-logs' && (
              <AuditLogViewer
                auditLogs={auditLogs}
                onRefresh={fetchData}
                activeTenant={activeTenant}
              />
            )}

            {activeTab === 'platform' && currentUser?.roles?.includes('SuperAdmin') && (
              <DeveloperControlPanel
                authToken={authToken}
                onTenantUpdated={handleTenantUpdated}
                onSwitchTenant={handleSwitchTenant}
              />
            )}
          </main>
        </div>

        {/* Global Modals */}
        <LoginModal
          isOpen={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
          currentUser={currentUser}
          activeTenant={activeTenant}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
        />

        <NepaliCalendarModal
          isOpen={calendarModalOpen}
          onClose={() => setCalendarModalOpen(false)}
        />

        <MilkFatSnfConfigModal
          isOpen={fatSnfConfigModalOpen}
          onClose={() => setFatSnfConfigModalOpen(false)}
          config={fatSnfConfig}
          onSaveSuccess={(cfg) => {
            setFatSnfConfig(cfg);
            fetchData();
          }}
        />

        <FarmerProfileModal
          isOpen={farmerProfileState.isOpen}
          farmer={farmerProfileState.farmer}
          onClose={() => setFarmerProfileState({ isOpen: false, farmer: null, tab: 'all' })}
          defaultTab={farmerProfileState.tab}
          initialCollections={collections}
          initialPayments={payments}
          initialAuditLogs={auditLogs}
          tenant={activeTenant}
          onOpenRecordMilk={() => {
            setFarmerProfileState({ isOpen: false, farmer: null, tab: 'all' });
            handleNavigateTab('milk-collection');
          }}
          onOpenRecordPayment={() => {
            setFarmerProfileState({ isOpen: false, farmer: null, tab: 'all' });
            handleNavigateTab('farmer-payments');
          }}
          onPrintStatement={(f) => handleOpenPrintSlip('farmer-statement', f)}
          onPrintMilkSlip={(col) => handleOpenPrintSlip('milk-collection', col)}
          onPrintPaymentSlip={(p) => handleOpenPrintSlip('farmer-slip', p)}
          refreshTrigger={collections.length + payments.length + auditLogs.length}
        />

        <SlipPrintModal
          isOpen={slipModalOpen}
          onClose={() => setSlipModalOpen(false)}
          slipType={slipModalData.type}
          data={slipModalData.data}
          tenant={activeTenant}
          customers={customers}
        />
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <DairyMainApp />
    </LanguageProvider>
  );
}
