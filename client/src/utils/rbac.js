import {
  LayoutDashboard,
  Milk,
  Receipt,
  ShoppingCart,
  CalendarDays,
  Package,
  Layers,
  Truck,
  DollarSign,
  Users,
  BarChart3,
  Sliders,
  SlidersHorizontal,
  ShieldCheck,
  Server
} from 'lucide-react';

export const SYSTEM_MODULES = [
  {
    id: 'dashboard',
    transKey: 'mod_dashboard',
    labelNe: 'ड्यासबोर्ड',
    labelEn: 'Dashboard',
    label: 'ड्यासबोर्ड',
    badgeText: 'Overview',
    description: 'Executive KPI metrics, daily collection overview, quick shortcuts',
    icon: LayoutDashboard,
    color: 'emerald',
    defaultRoles: ['SuperAdmin', 'Admin', 'User']
  },
  {
    id: 'milk-collection',
    transKey: 'mod_milk_collection',
    labelNe: 'दूध संकलन',
    labelEn: 'Milk Collection',
    label: 'दूध संकलन',
    badgeText: 'Core',
    description: 'Farmer milk intake, FAT/SNF automated testing & pricing, collection slips',
    icon: Milk,
    color: 'blue',
    defaultRoles: ['SuperAdmin', 'Admin', 'User']
  },
  {
    id: 'fat-snf-config',
    transKey: 'mod_fat_snf_config',
    labelNe: 'फ्याट तथा एस.एन.एफ. दर',
    labelEn: 'FAT & SNF Pricing',
    label: 'फ्याट तथा एस.एन.एफ. दर',
    badgeText: 'Pricing',
    description: 'Milk buying & selling rates configuration per FAT/SNF unit',
    icon: SlidersHorizontal,
    color: 'amber',
    defaultRoles: ['SuperAdmin', 'Admin']
  },
  {
    id: 'farmer-payments',
    transKey: 'mod_farmer_payments',
    labelNe: 'कृषक भुक्तानी',
    labelEn: 'Farmer Payments',
    label: 'कृषक भुक्तानी',
    badgeText: 'Payouts',
    description: 'Farmer accounts, milk delivery statements, payment disbursement slips',
    icon: Receipt,
    color: 'teal',
    defaultRoles: ['SuperAdmin', 'Admin']
  },
  {
    id: 'pos-sales',
    transKey: 'mod_pos_sales',
    labelNe: 'खुद्रा बिक्री',
    labelEn: 'Instant Sale / POS',
    label: 'खुद्रा बिक्री',
    badgeText: 'POS Counter',
    description: 'Fast retail sales, cart checkout, Fonepay QR, receipt slip printing',
    icon: ShoppingCart,
    color: 'indigo',
    defaultRoles: ['SuperAdmin', 'Admin', 'User']
  },
  {
    id: 'future-orders',
    transKey: 'mod_future_orders',
    labelNe: 'अर्डर तथा डेलिभरी',
    labelEn: 'Orders & Deliveries',
    label: 'अर्डर तथा डेलिभरी',
    badgeText: 'Wholesale',
    description: 'Scheduled institutional orders, wholesale delivery dispatch & tracking',
    icon: CalendarDays,
    color: 'cyan',
    defaultRoles: ['SuperAdmin', 'Admin', 'User']
  },
  {
    id: 'inventory',
    transKey: 'mod_inventory',
    labelNe: 'मौज्दात व्यवस्थापन',
    labelEn: 'Inventory & Stock',
    label: 'मौज्दात व्यवस्थापन',
    badgeText: 'Stock POS',
    description: 'Finished dairy products, stock batches, wastage & adjustments',
    icon: Package,
    color: 'purple',
    defaultRoles: ['SuperAdmin', 'Admin']
  },
  {
    id: 'production',
    transKey: 'mod_production',
    labelNe: 'दूध प्रशोधन',
    labelEn: 'Production Batches',
    label: 'दूध प्रशोधन',
    badgeText: 'Processing',
    description: 'Raw milk to Paneer, Curd, Ghee, Butter & Cream conversion batches',
    icon: Layers,
    color: 'rose',
    defaultRoles: ['SuperAdmin', 'Admin']
  },
  {
    id: 'purchases',
    transKey: 'mod_purchases',
    labelNe: 'कच्चा पदार्थ खरिद',
    labelEn: 'Procurement',
    label: 'कच्चा पदार्थ खरिद',
    badgeText: 'Suppliers',
    description: 'Supplier purchases, packaging materials, feeds & consumables',
    icon: Truck,
    color: 'amber',
    defaultRoles: ['SuperAdmin', 'Admin']
  },
  {
    id: 'finance',
    transKey: 'mod_finance',
    labelNe: 'वित्त तथा खर्च',
    labelEn: 'Finance & Ledgers',
    label: 'वित्त तथा खर्च',
    badgeText: 'Accounts',
    description: 'Operational expenses, Cash in Hand, Bank balances & general ledger',
    icon: DollarSign,
    color: 'emerald',
    defaultRoles: ['SuperAdmin', 'Admin']
  },
  {
    id: 'customers',
    transKey: 'mod_customers',
    labelNe: 'खाता सूची',
    labelEn: 'Accounts Directory',
    label: 'खाता सूची',
    badgeText: 'Directory',
    description: 'Farmers and wholesale buyers directory, balance status, history',
    icon: Users,
    color: 'blue',
    defaultRoles: ['SuperAdmin', 'Admin', 'User']
  },
  {
    id: 'reports',
    transKey: 'mod_reports',
    labelNe: 'प्रतिवेदन तथा विश्लेषण',
    labelEn: 'Reports & P&L',
    label: 'प्रतिवेदन तथा विश्लेषण',
    badgeText: 'Analytics',
    description: 'Profit & Loss statements, milk supply analysis, sales revenue audit',
    icon: BarChart3,
    color: 'violet',
    defaultRoles: ['SuperAdmin', 'Admin']
  },
  {
    id: 'audit-logs',
    transKey: 'mod_audit_logs',
    labelNe: 'कार्य सम्पादन लग',
    labelEn: 'Activity & Audit Log',
    label: 'कार्य सम्पादन लग',
    badgeText: 'Audit',
    description: 'Track and record all user actions across milk collections, payments, orders, and system operations',
    icon: ShieldCheck,
    color: 'indigo',
    defaultRoles: ['SuperAdmin', 'Admin']
  },
  {
    id: 'settings',
    transKey: 'mod_settings',
    labelNe: 'प्रणाली सेटिङ',
    labelEn: 'System Settings',
    label: 'प्रणाली सेटिङ',
    badgeText: 'Config',
    description: 'Measurement units, user management, cooperative subscription renewal',
    icon: Sliders,
    color: 'slate',
    defaultRoles: ['SuperAdmin', 'Admin']
  },
  {
    id: 'platform',
    transKey: 'mod_platform',
    labelNe: 'डेभलपर कन्सोल',
    labelEn: 'Developer Console',
    label: 'डेभलपर कन्सोल',
    badgeText: 'PRIMARY / OWNER',
    description: 'Multi-cooperative SaaS control panel, plans, custom domains, renewals & platform audit logs',
    icon: Server,
    color: 'slate',
    defaultRoles: ['SuperAdmin']
  }
];

export function isOwnerUser(user, activeTenant) {
  if (!user) return false;
  const roles = user.roles || [];
  if (!roles.includes('SuperAdmin')) return false;

  const userTenantId = Number(user.tenantId);
  const activeTid = activeTenant ? Number(activeTenant.id) : userTenantId;

  // The Developer Console is strictly the owner page for Tenant 1 (sfacl - साना किसान कृषि सहकारी सस्था लि.)
  const isTenant1 = (userTenantId === 1 || !userTenantId) && (activeTid === 1);
  const isOwnerTenantName = (!activeTenant || activeTenant.name === 'sfacl');
  return isTenant1 && isOwnerTenantName;
}

export function getModuleLabel(module, lang = 'ne') {
  if (!module) return '';
  return lang === 'en' ? (module.labelEn || module.label) : (module.labelNe || module.label);
}

export function isTabAllowed(tabId, userRoles = ['User'], activeTenant = null, currentUser = null) {
  if (tabId === 'platform') {
    if (currentUser) {
      return isOwnerUser(currentUser, activeTenant);
    }
    const tid = activeTenant ? Number(activeTenant.id) : 1;
    return userRoles.includes('SuperAdmin') && tid === 1 && (!activeTenant || activeTenant.name === 'sfacl');
  }
  if (userRoles.includes('SuperAdmin')) return true;
  const mod = SYSTEM_MODULES.find(m => m.id === tabId);
  if (!mod) return true;
  return mod.defaultRoles.some(r => userRoles.includes(r));
}
