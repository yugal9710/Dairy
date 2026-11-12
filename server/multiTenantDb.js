import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { hashPassword, verifyPassword, generateToken } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');
const PLATFORM_FILE = path.join(DATA_DIR, 'platform.json');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(TENANTS_DIR)) fs.mkdirSync(TENANTS_DIR, { recursive: true });

// Initial 10 Tenants matching Dairy-dev/init.sql
const DEFAULT_TENANTS = [
  {
    id: 1,
    name: 'sfacl',
    host: 'sfacl.dairynepal.com',
    organizationName: 'साना किसान कृषि सहकारी सस्था लि.',
    address: 'गौशाला-१२, काठमाडौं',
    timezone: 'Asia/Kathmandu',
    expirationDateTimeUtms: Date.now() + 365 * 24 * 3600 * 1000,
    subscriptionAmount: 35000,
    isDeleted: false
  },
  {
    id: 2,
    name: 'kds',
    host: 'kds.dairynepal.com',
    organizationName: 'किसान दुध संकलन तथा प्रशोधन केन्द्र',
    address: 'इम्लिबजार, महोत्तरी',
    timezone: 'Asia/Kathmandu',
    expirationDateTimeUtms: Date.now() + 180 * 24 * 3600 * 1000,
    subscriptionAmount: 30000,
    isDeleted: false
  },
  {
    id: 3,
    name: 'kduks',
    host: 'kduks.dairynepal.com',
    organizationName: 'कान्तिबजार दुग्ध उत्पादन कृषक समुह',
    address: 'कान्तिबजार-४, धनुषा',
    timezone: 'Asia/Kathmandu',
    expirationDateTimeUtms: Date.now() + 120 * 24 * 3600 * 1000,
    subscriptionAmount: 24000,
    isDeleted: false
  },
  {
    id: 4,
    name: 'ndc',
    host: 'ndc.dairynepal.com',
    organizationName: 'नेपाल डेरी को-अपरेटिभ लि.',
    address: 'नयाँ बानेश्वर, काठमाडौं',
    timezone: 'Asia/Kathmandu',
    expirationDateTimeUtms: Date.now() + 240 * 24 * 3600 * 1000,
    subscriptionAmount: 40000,
    isDeleted: false
  },
  {
    id: 5,
    name: 'himalayan',
    host: 'himalayan.dairynepal.com',
    organizationName: 'हिमालयन अर्गानिक डेरी फार्म',
    address: 'धुलिखेल-३, काभ्रे',
    timezone: 'Asia/Kathmandu',
    expirationDateTimeUtms: Date.now() + 300 * 24 * 3600 * 1000,
    subscriptionAmount: 28000,
    isDeleted: false
  },
  {
    id: 6,
    name: 'annapurna',
    host: 'annapurna.dairynepal.com',
    organizationName: 'अन्नपूर्ण दुग्ध उत्पादक सहकारी',
    address: 'पोखरा-८, कास्की',
    timezone: 'Asia/Kathmandu',
    expirationDateTimeUtms: Date.now() + 90 * 24 * 3600 * 1000,
    subscriptionAmount: 32000,
    isDeleted: false
  },
  {
    id: 7,
    name: 'lumbini',
    host: 'lumbini.dairynepal.com',
    organizationName: 'लुम्बिनी कृषि तथा दुग्ध संकलन केन्द्र',
    address: 'बुटवल-११, रुपन्देही',
    timezone: 'Asia/Kathmandu',
    expirationDateTimeUtms: Date.now() + 15 * 24 * 3600 * 1000, // Expiring soon
    subscriptionAmount: 22000,
    isDeleted: false
  },
  {
    id: 8,
    name: 'mithila',
    host: 'mithila.dairynepal.com',
    organizationName: 'मिथिला दुग्ध उद्योग प्रा. लि.',
    address: 'जनकपुरधाम-४, धनुषा',
    timezone: 'Asia/Kathmandu',
    expirationDateTimeUtms: Date.now() - 5 * 24 * 3600 * 1000, // Expired
    subscriptionAmount: 26000,
    isDeleted: false
  },
  {
    id: 9,
    name: 'sagarmatha',
    host: 'sagarmatha.dairynepal.com',
    organizationName: 'सगरमाथा गाई फार्म तथा डेरी',
    address: 'गाईघाट-२, उदयपुर',
    timezone: 'Asia/Kathmandu',
    expirationDateTimeUtms: Date.now() + 200 * 24 * 3600 * 1000,
    subscriptionAmount: 18000,
    isDeleted: false
  },
  {
    id: 10,
    name: 'everest',
    host: 'everest.dairynepal.com',
    organizationName: 'एभरेष्ट मिल्क प्रोडक्सन प्रा. लि.',
    address: 'हेटौंडा-५, मकवानपुर',
    timezone: 'Asia/Kathmandu',
    expirationDateTimeUtms: Date.now() + 320 * 24 * 3600 * 1000,
    subscriptionAmount: 30000,
    isDeleted: false
  }
];

// Initial Platform Users
function deriveUsername(user = {}) {
  if (user.username && String(user.username).trim()) {
    return String(user.username).trim().toLowerCase();
  }
  if (user.email && String(user.email).includes('@')) {
    return String(user.email).split('@')[0].trim().toLowerCase();
  }
  if (user.name && String(user.name).trim()) {
    return String(user.name).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '.').replace(/^\.+|\.+$/g, '') || 'user';
  }
  return 'admin';
}

const DEFAULT_USERS = [
  {
    id: 1,
    tenantId: 1,
    username: 'admin',
    email: 'admin@dairy.local',
    name: 'System Admin',
    passwordHash: hashPassword('Admin@123'),
    roles: ['SuperAdmin', 'Admin'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: 1793502249000
  },
  {
    id: 2,
    tenantId: 1,
    username: 'manager',
    email: 'manager@dairy.local',
    name: 'Dairy Manager',
    passwordHash: hashPassword('Manager@123'),
    roles: ['Admin'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: 1793502249000
  },
  {
    id: 3,
    tenantId: 1,
    username: 'staff',
    email: 'staff@dairy.local',
    name: 'Counter Operator',
    passwordHash: hashPassword('Staff@123'),
    roles: ['User'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: 1793502249000
  },
  {
    id: 4,
    tenantId: 1,
    username: 'bipin.paul',
    email: 'bipin.paul@dairy.local',
    name: 'Bipin Paul',
    passwordHash: hashPassword('Admin@123'),
    roles: ['SuperAdmin'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: 1793502249000
  },
  {
    id: 5,
    tenantId: 1,
    username: 'sita.sharma',
    email: 'sita.sharma@dairy.local',
    name: 'Sita Sharma',
    passwordHash: hashPassword('Admin@123'),
    roles: ['User'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: 1793502249000
  }
];

// Initial Platform Subscription Plans for Dairy Cooperatives
const DEFAULT_PLANS = [
  {
    id: 'plan-starter',
    name: 'Cooperative Starter',
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
      smsAlerts: false
    }
  },
  {
    id: 'plan-professional',
    name: 'Cooperative Professional',
    priceMonthly: 7500,
    priceYearly: 75000,
    maxBranches: 3,
    maxStaff: 15,
    maxFarmers: 2500,
    storageQuotaGb: 25,
    modules: {
      milkCollection: true,
      fatSnfPricing: true,
      farmerLedger: true,
      basicReports: true,
      pos: true,
      futureOrders: true,
      dairyProcessing: true,
      nepaliBS: true,
      smsAlerts: true
    }
  },
  {
    id: 'plan-enterprise',
    name: 'Dairy Federation Enterprise',
    priceMonthly: 18000,
    priceYearly: 180000,
    maxBranches: 10,
    maxStaff: 50,
    maxFarmers: 10000,
    storageQuotaGb: 100,
    modules: {
      milkCollection: true,
      fatSnfPricing: true,
      farmerLedger: true,
      basicReports: true,
      pos: true,
      futureOrders: true,
      dairyProcessing: true,
      nepaliBS: true,
      smsAlerts: true,
      multiBranch: true,
      customDomain: true,
      auditTrail: true,
      prioritySupport: true
    }
  }
];

class MultiTenantDatabase {
  constructor() {
    this.platform = this.loadPlatform();
    this.tenantCaches = new Map();
  }

  loadPlatform() {
    let initialPlatform = null;
    if (fs.existsSync(PLATFORM_FILE)) {
      try {
        initialPlatform = JSON.parse(fs.readFileSync(PLATFORM_FILE, 'utf8'));
      } catch (e) {
        console.error('Failed to parse platform.json, reinitializing...', e);
      }
    }
    if (!initialPlatform) {
      initialPlatform = {
        tenants: DEFAULT_TENANTS,
        users: DEFAULT_USERS,
        billings: [
          {
            id: 1,
            tenantId: 1,
            amount: 35000,
            remarks: 'वार्षिक सफ्टवेयर सदस्यता नवीकरण शुल्क (पूर्ण भुक्तानी)',
            dateTimeUtms: Date.now() - 30 * 24 * 3600 * 1000,
            paymentMethod: 2,
            isDeleted: false
          }
        ],
        auditLogs: []
      };
    }

    if (!initialPlatform.plans || initialPlatform.plans.length === 0) {
      initialPlatform.plans = DEFAULT_PLANS;
    }
    if (!initialPlatform.domains || initialPlatform.domains.length === 0) {
      initialPlatform.domains = (initialPlatform.tenants || []).map((t, idx) => ({
        id: `dom-${t.id || idx + 1}`,
        tenantId: t.id,
        domain: t.host || `${t.name}.dairynepal.com`,
        type: 'subdomain',
        isPrimary: true,
        verified: true,
        sslStatus: 'active'
      }));
    }
    if (!initialPlatform.renewalRequests) {
      initialPlatform.renewalRequests = [
        {
          id: 'ren-001',
          tenantId: 2,
          tenantName: 'किसान दुध संकलन तथा प्रशोधन केन्द्र',
          planId: 'plan-professional',
          planName: 'Cooperative Professional',
          billingCycle: 'Yearly',
          amount: 75000,
          currency: 'Rs.',
          method: 'FonePay QR',
          payerName: 'Hari Prasad Sharma',
          payerPhone: '9851029384',
          userName: 'Kisan Dairy Manager',
          userEmail: 'manager@kds.dairynepal.com',
          transactionRef: 'FONEPAY-981023',
          submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          status: 'PENDING_VERIFICATION',
          receiptUrl: null,
          receiptFileName: 'fonepay-voucher-981023.pdf',
          notes: 'वार्षिक सदस्यता नवीकरण (FonePay मार्फत भुक्तानी)'
        }
      ];
    }
    if (!initialPlatform.auditLogs || initialPlatform.auditLogs.length === 0) {
      initialPlatform.auditLogs = [
        {
          id: 'paudit-init',
          timestamp: new Date().toISOString(),
          action: 'PLATFORM_CONSOLE_INITIALIZED',
          status: 'SUCCESS',
          userEmail: 'admin@dairy.local',
          userRole: 'SuperAdmin',
          tenantId: 1,
          details: 'Dairy ERP 2.0 Multi-Cooperative Developer Control Panel initialized'
        }
      ];
    }
    if (!initialPlatform.paymentConfig) {
      initialPlatform.paymentConfig = {
        companyName: 'Dairy Nepal SaaS ERP Solutions',
        bankName: 'Nabil Bank Ltd.',
        accountName: 'DAIRY NEPAL SAAS SOLUTIONS PVT LTD',
        accountNumber: '01201017500892',
        branch: 'Kathmandu Main Branch',
        swiftCode: 'NARNNPKT',
        fonepayMerchantId: 'MERCHANT-DAIRY-NEPAL-2026',
        fonepayQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=FonePay%3ADairyNepalERP%3A9841234567',
        supportEmail: 'billing@dairynepal.com',
        supportPhone: '+977-1-4412345 / 9801234567'
      };
    }
    if (!initialPlatform.notifications) {
      initialPlatform.notifications = [
        {
          id: 'notif-1',
          type: 'SYSTEM',
          title: 'Dairy 2.0 Developer Console Initialized',
          message: 'Multi-cooperative management, custom domains, and subscription engines active.',
          createdAt: new Date().toISOString(),
          isRead: false
        }
      ];
    }

    this.savePlatform(initialPlatform);
    return initialPlatform;
  }

  savePlatform(data = this.platform) {
    fs.writeFileSync(PLATFORM_FILE, JSON.stringify(data, null, 2), 'utf8');
  }

  getTenantFilePath(tenantId) {
    return path.join(TENANTS_DIR, `tenant_${tenantId}.json`);
  }

  getTenantData(tenantId = 1) {
    const tid = Number(tenantId) || 1;
    if (this.tenantCaches.has(tid)) {
      return this.tenantCaches.get(tid);
    }

    const filePath = this.getTenantFilePath(tid);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.tenantCaches.set(tid, data);
        return data;
      } catch (err) {
        console.error(`Failed to read tenant_${tid}.json, recreating...`, err);
      }
    }

    const initialTenantData = this.buildInitialTenantData(tid);
    this.saveTenantData(tid, initialTenantData);
    this.tenantCaches.set(tid, initialTenantData);
    return initialTenantData;
  }

  saveTenantData(tenantId, data) {
    const tid = Number(tenantId) || 1;
    const filePath = this.getTenantFilePath(tid);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    this.tenantCaches.set(tid, data);
  }

  round2(num) {
    return Math.round((Number(num) || 0) * 100) / 100;
  }

  buildInitialTenantData(tenantId) {
    const now = Date.now();
    const day = 86400000;
    const hr = 3600000;

    return {
      tenantId: tenantId,
      auditLogs: [],
      units: [
        { id: 1, name: 'Litre', nameInNepali: 'लिटर', code: 'L', isDeleted: false },
        { id: 2, name: 'Kilogram', nameInNepali: 'किलो', code: 'KG', isDeleted: false },
        { id: 3, name: 'Packet', nameInNepali: 'प्याकेट', code: 'PKT', isDeleted: false },
        { id: 4, name: 'Pouch', nameInNepali: 'पाउच', code: 'PCH', isDeleted: false },
        { id: 5, name: 'Piece', nameInNepali: 'थान', code: 'PC', isDeleted: false },
        { id: 6, name: 'Carton', nameInNepali: 'कार्टुन', code: 'CTN', isDeleted: false }
      ],
      products: [
        {
          id: 1,
          nameInEnglish: 'Raw Milk',
          nameInNepali: 'काँचो दूध',
          unitId: 1,
          unitName: 'Litre',
          sellingPrice: 85.00,
          costPrice: 65.00,
          reorderLevel: 50.0,
          description: 'ताजा गाई तथा भैँसीको काँचो दूध',
          isDeleted: false
        },
        {
          id: 2,
          nameInEnglish: 'Standard Pasteurized Milk',
          nameInNepali: 'पाश्चराइज्ड प्रशोधित दूध',
          unitId: 4,
          unitName: 'Pouch',
          sellingPrice: 50.00,
          costPrice: 38.00,
          reorderLevel: 100.0,
          description: '५०० मिलि पाश्चराइज्ड प्याकेट दूध',
          isDeleted: false
        },
        {
          id: 3,
          nameInEnglish: 'Fresh Curd / Dahi',
          nameInNepali: 'ताजा दही',
          unitId: 1,
          unitName: 'Litre',
          sellingPrice: 120.00,
          costPrice: 85.00,
          reorderLevel: 25.0,
          description: 'घरेलु स्वादको शुद्ध दही',
          isDeleted: false
        },
        {
          id: 4,
          nameInEnglish: 'Fresh Paneer',
          nameInNepali: 'ताजा पनिर',
          unitId: 2,
          unitName: 'Kilogram',
          sellingPrice: 750.00,
          costPrice: 580.00,
          reorderLevel: 15.0,
          description: 'नरम र ताजा पनिर',
          isDeleted: false
        },
        {
          id: 5,
          nameInEnglish: 'Pure Cow Ghee',
          nameInNepali: 'शुद्ध गाईको घिउ',
          unitId: 2,
          unitName: 'Kilogram',
          sellingPrice: 1400.00,
          costPrice: 1100.00,
          reorderLevel: 10.0,
          description: 'परम्परागत विधिबाट निर्मित शुद्ध घिउ',
          isDeleted: false
        },
        {
          id: 6,
          nameInEnglish: 'White Butter / Nauni',
          nameInNepali: 'ताजा नौनी घिउ',
          unitId: 2,
          unitName: 'Kilogram',
          sellingPrice: 950.00,
          costPrice: 750.00,
          reorderLevel: 8.0,
          description: 'ताजा नौनी',
          isDeleted: false
        },
        {
          id: 7,
          nameInEnglish: 'Fresh Cream',
          nameInNepali: 'ताजा क्रिम',
          unitId: 1,
          unitName: 'Litre',
          sellingPrice: 450.00,
          costPrice: 340.00,
          reorderLevel: 10.0,
          description: 'बाक्लो दुग्ध क्रिम',
          isDeleted: false
        }
      ],
      // Reconciled stocks: Opening/Purchased/Collected/Produced - Consumed - Sold - Wastage = Current On Hand
      // Raw Milk (id 1): 300.0 collected + 80.0 purchased = 380.0 in; 280.0 processed + 12.0 sold + 3.0 wastage = 295.0 used -> 85.0 L on hand
      // Pasteurized Milk (id 2): 120.0 opening + 160.0 produced = 280.0 in; 80.0 sold + 4.0 wastage = 84.0 used -> 196.0 Pouch on hand
      // Curd (id 3): 20.0 purchased + 60.0 produced = 80.0 in; 37.0 sold = 37.0 used -> 43.0 L on hand
      // Paneer (id 4): 10.0 opening + 14.0 produced = 24.0 in; 13.0 sold = 13.0 used -> 11.0 KG on hand (Low Stock <= 15)
      // Ghee (id 5): 21.0 opening + 2.0 produced = 23.0 in; 8.0 sold = 8.0 used -> 15.0 KG on hand
      // White Butter (id 6): 10.0 opening + 4.0 produced = 14.0 in; 2.0 sold = 2.0 used -> 12.0 KG on hand
      // Cream (id 7): 10.0 opening + 8.0 produced = 18.0 in; 4.0 sold = 4.0 used -> 14.0 L on hand
      productStocks: [
        { id: 1, productId: 1, batchNumber: 'RAW-LOT-2026-01', quantity: 380.0, usedQuantity: 295.0, expiryDateUtms: now + 2 * day, dateTimeUtms: now - 2 * day },
        { id: 2, productId: 2, batchNumber: 'PAS-LOT-2026-01', quantity: 280.0, usedQuantity: 84.0, expiryDateUtms: now + 3 * day, dateTimeUtms: now - 2 * day },
        { id: 3, productId: 3, batchNumber: 'DAHI-LOT-2026-01', quantity: 80.0, usedQuantity: 37.0, expiryDateUtms: now + 4 * day, dateTimeUtms: now - 2 * day },
        { id: 4, productId: 4, batchNumber: 'PAN-LOT-2026-01', quantity: 24.0, usedQuantity: 13.0, expiryDateUtms: now + 6 * day, dateTimeUtms: now - 2 * day },
        { id: 5, productId: 5, batchNumber: 'GHEE-LOT-2026-01', quantity: 23.0, usedQuantity: 8.0, expiryDateUtms: now + 180 * day, dateTimeUtms: now - 2 * day },
        { id: 6, productId: 6, batchNumber: 'BUTTER-LOT-2026-01', quantity: 14.0, usedQuantity: 2.0, expiryDateUtms: now + 15 * day, dateTimeUtms: now - 2 * day },
        { id: 7, productId: 7, batchNumber: 'CREAM-LOT-2026-01', quantity: 18.0, usedQuantity: 4.0, expiryDateUtms: now + 5 * day, dateTimeUtms: now - 2 * day }
      ],
      customers: [
        {
          id: 1,
          code: 1,
          nameInNepali: 'राम बहादुर थापा',
          nameInEnglish: 'Ram Bahadur Thapa',
          customerType: 1,
          phone: '9841234567',
          address: 'गौशाला-४, काठमाडौं',
          accountNumber: 'NABIL-012004592',
          remarks: 'नियमित बिहानी तथा बेलुकी दूध संकलक कृषक',
          isDeleted: false,
          creationDateTimeUtms: now - 60 * day
        },
        {
          id: 2,
          code: 2,
          nameInNepali: 'हरि प्रसाद शर्मा',
          nameInEnglish: 'Hari Prasad Sharma',
          customerType: 1,
          phone: '9851029384',
          address: 'चाबहिल-७, काठमाडौं',
          accountNumber: 'GBIME-99882211',
          remarks: 'गाई फार्म सञ्चालक',
          isDeleted: false,
          creationDateTimeUtms: now - 50 * day
        },
        {
          id: 3,
          code: 3,
          nameInNepali: 'सीता माया गुरुङ',
          nameInEnglish: 'Sita Maya Gurung',
          customerType: 1,
          phone: '9812938475',
          address: 'साँखु-२, काठमाडौं',
          accountNumber: 'NIC-554433221',
          remarks: 'भैँसी फार्म',
          isDeleted: false,
          creationDateTimeUtms: now - 40 * day
        },
        {
          id: 4,
          code: 4,
          nameInNepali: 'श्याम सुन्दर यादव',
          nameInEnglish: 'Shyam Sundar Yadav',
          customerType: 1,
          phone: '9803456789',
          address: 'भक्तपुर-९, कमलविनायक',
          accountNumber: 'PRABHU-887766',
          remarks: 'दैनिक दूध आपूर्तिकर्ता',
          isDeleted: false,
          creationDateTimeUtms: now - 30 * day
        },
        {
          id: 5,
          code: 5,
          nameInNepali: 'कृष्ण बहादुर कार्की',
          nameInEnglish: 'Krishna Bahadur Karki',
          customerType: 1,
          phone: '9860112233',
          address: 'बौद्ध-६, काठमाडौं',
          accountNumber: 'EVEREST-112244',
          remarks: 'उच्च फ्याट दूध आपूर्तिकर्ता',
          isDeleted: false,
          creationDateTimeUtms: now - 20 * day
        },
        {
          id: 6,
          code: 6,
          nameInNepali: 'होटल अन्नपूर्ण भ्यु',
          nameInEnglish: 'Hotel Annapurna View',
          customerType: 2,
          phone: '01-4499881',
          address: 'दरबारमार्ग, काठमाडौं',
          accountNumber: 'HBL-990011',
          remarks: 'दैनिक दूध, दही र पनिरको थोक खरिदकर्ता',
          isDeleted: false,
          creationDateTimeUtms: now - 45 * day
        },
        {
          id: 7,
          code: 7,
          nameInNepali: 'पोखरा स्वीट्स एन्ड बेकरी',
          nameInEnglish: 'Pokhara Sweets & Bakery',
          customerType: 2,
          phone: '9846011223',
          address: 'न्यूरोड, काठमाडौं',
          accountNumber: 'SBI-223344',
          remarks: 'मिठाई उत्पादनका लागि थोक पनिर र क्रिम खरिदकर्ता',
          isDeleted: false,
          creationDateTimeUtms: now - 35 * day
        },
        {
          id: 8,
          code: 8,
          nameInNepali: 'लेकसाइड क्याफे',
          nameInEnglish: 'Lakeside Organic Cafe',
          customerType: 2,
          phone: '9811223344',
          address: 'झम्सीखेल, ललितपुर',
          accountNumber: 'NIMB-778899',
          remarks: 'अर्गानिक दूध तथा दही खरिदकर्ता',
          isDeleted: false,
          creationDateTimeUtms: now - 25 * day
        },
        {
          id: 9,
          code: 9,
          nameInNepali: 'न्यू किराना तथा डेरी स्टोर',
          nameInEnglish: 'New Kirana & Dairy Store',
          customerType: 3,
          phone: '9801998877',
          address: 'सिनामंगल, काठमाडौं',
          accountNumber: 'KBL-445566',
          remarks: 'स्थानीय दुध बिक्रेता तथा संकलन केन्द्र',
          isDeleted: false,
          creationDateTimeUtms: now - 15 * day
        }
      ],
      milkFatSnfConfig: {
        id: 1,
        buyingFatPrice: 7.50,
        buyingSnfPrice: 4.00,
        sellingFatPrice: 9.00,
        sellingSnfPrice: 5.00,
        sellingPrice: 90.00,
        lastTimeUpdatedUtms: now - day
      },
      // Total collected: 300.0 L | Total Milk Purchase Cost: Rs 20,117.35
      milkCollections: [
        { id: 1, farmerId: 1, quantity: 50.0, shift: 0, fat: 4.6, snf: 8.3, fatRate: 7.50, snfRate: 4.00, rate: 67.70, totalPrice: 3385.00, dateTimeUtms: now - day - 4 * hr, isDeleted: false },
        { id: 2, farmerId: 2, quantity: 40.0, shift: 0, fat: 4.2, snf: 8.1, fatRate: 7.50, snfRate: 4.00, rate: 63.90, totalPrice: 2556.00, dateTimeUtms: now - day - 3 * hr, isDeleted: false },
        { id: 3, farmerId: 3, quantity: 45.0, shift: 0, fat: 5.0, snf: 8.5, fatRate: 7.50, snfRate: 4.00, rate: 71.50, totalPrice: 3217.50, dateTimeUtms: now - day - 2 * hr, isDeleted: false },
        { id: 4, farmerId: 1, quantity: 35.0, shift: 1, fat: 4.5, snf: 8.2, fatRate: 7.50, snfRate: 4.00, rate: 66.55, totalPrice: 2329.25, dateTimeUtms: now - day + 4 * hr, isDeleted: false },
        { id: 5, farmerId: 4, quantity: 30.0, shift: 1, fat: 4.4, snf: 8.0, fatRate: 7.50, snfRate: 4.00, rate: 65.00, totalPrice: 1950.00, dateTimeUtms: now - day + 5 * hr, isDeleted: false },
        { id: 6, farmerId: 1, quantity: 40.0, shift: 0, fat: 4.5, snf: 8.2, fatRate: 7.50, snfRate: 4.00, rate: 66.55, totalPrice: 2662.00, dateTimeUtms: now - 3 * hr, isDeleted: false },
        { id: 7, farmerId: 2, quantity: 32.0, shift: 0, fat: 4.3, snf: 8.1, fatRate: 7.50, snfRate: 4.00, rate: 64.65, totalPrice: 2068.80, dateTimeUtms: now - 2 * hr, isDeleted: false },
        { id: 8, farmerId: 5, quantity: 28.0, shift: 0, fat: 4.8, snf: 8.4, fatRate: 7.50, snfRate: 4.00, rate: 69.60, totalPrice: 1948.80, dateTimeUtms: now - 1 * hr, isDeleted: false }
      ],
      // Total Farmer Paid: Rs 10,000.00 | Remaining Payables: Rs 10,117.35
      milkCollectionPayments: [
        {
          id: 1,
          farmerId: 1,
          amount: 5000.00,
          paymentMethod: 0,
          referenceNumber: 'VCHR-FARM-01',
          remarks: 'दूध आपूर्ति बापत आंशिक नगद भुक्तानी',
          dateTimeUtms: now - 18 * hr,
          isDeleted: false
        },
        {
          id: 2,
          farmerId: 2,
          amount: 3000.00,
          paymentMethod: 2,
          referenceNumber: 'BANK-TR-8491',
          remarks: 'बैंक ट्रान्सफर मार्फत भुक्तानी',
          dateTimeUtms: now - 17 * hr,
          isDeleted: false
        },
        {
          id: 3,
          farmerId: 3,
          amount: 2000.00,
          paymentMethod: 0,
          referenceNumber: 'VCHR-FARM-02',
          remarks: 'नगद आंशिक भुक्तानी',
          dateTimeUtms: now - 16 * hr,
          isDeleted: false
        }
      ],
      // Total Net Sales Revenue: 12000 + 10250 + 5400 + 6150 = Rs 33,800.00
      orders: [
        {
          id: 1,
          saleType: 1,
          customerId: 6,
          customerName: 'Hotel Annapurna View',
          orderDateTimeUtms: now - 20 * hr,
          totalAmount: 12250.00,
          discountAmount: 250.00,
          netAmount: 12000.00,
          totalPaid: 8500.00,
          remainingAmount: 3500.00,
          paymentMethod: 2,
          remarks: 'होटल थोक डेलिभरी बिल (Fonepay/Bank)',
          orderProducts: [
            { productId: 2, productName: 'पाश्चराइज्ड प्रशोधित दूध', quantity: 35, unitPrice: 50.00, totalPrice: 1750.00 },
            { productId: 3, productName: 'ताजा दही', quantity: 15, unitPrice: 120.00, totalPrice: 1800.00 },
            { productId: 4, productName: 'ताजा पनिर', quantity: 6, unitPrice: 750.00, totalPrice: 4500.00 },
            { productId: 5, productName: 'शुद्ध गाईको घिउ', quantity: 3, unitPrice: 1400.00, totalPrice: 4200.00 }
          ],
          isDeleted: false
        },
        {
          id: 2,
          saleType: 1,
          customerId: 7,
          customerName: 'Pokhara Sweets & Bakery',
          orderDateTimeUtms: now - 14 * hr,
          totalAmount: 10250.00,
          discountAmount: 0.00,
          netAmount: 10250.00,
          totalPaid: 10250.00,
          remainingAmount: 0.00,
          paymentMethod: 0,
          remarks: 'मिठाई भण्डारको लागि पनिर, घिउ र क्रिम नगद बिक्री',
          orderProducts: [
            { productId: 4, productName: 'ताजा पनिर', quantity: 5, unitPrice: 750.00, totalPrice: 3750.00 },
            { productId: 5, productName: 'शुद्ध गाईको घिउ', quantity: 2, unitPrice: 1400.00, totalPrice: 2800.00 },
            { productId: 6, productName: 'ताजा नौनी घिउ', quantity: 2, unitPrice: 950.00, totalPrice: 1900.00 },
            { productId: 7, productName: 'ताजा क्रिम', quantity: 4, unitPrice: 450.00, totalPrice: 1800.00 }
          ],
          isDeleted: false
        },
        {
          id: 3,
          saleType: 1,
          customerId: 8,
          customerName: 'Lakeside Organic Cafe',
          orderDateTimeUtms: now - 8 * hr,
          totalAmount: 5460.00,
          discountAmount: 60.00,
          netAmount: 5400.00,
          totalPaid: 4000.00,
          remainingAmount: 1400.00,
          paymentMethod: 2,
          remarks: 'क्याफे नियमित आपूर्ति (Fonepay)',
          orderProducts: [
            { productId: 2, productName: 'पाश्चराइज्ड प्रशोधित दूध', quantity: 30, unitPrice: 50.00, totalPrice: 1500.00 },
            { productId: 3, productName: 'ताजा दही', quantity: 12, unitPrice: 120.00, totalPrice: 1440.00 },
            { productId: 4, productName: 'ताजा पनिर', quantity: 2, unitPrice: 750.00, totalPrice: 1500.00 },
            { productId: 1, productName: 'काँचो दूध', quantity: 12, unitPrice: 85.00, totalPrice: 1020.00 }
          ],
          isDeleted: false
        },
        {
          id: 4,
          saleType: 1,
          customerId: null,
          customerName: 'काउन्टर ग्राहक (Walk-in)',
          orderDateTimeUtms: now - 3 * hr,
          totalAmount: 6150.00,
          discountAmount: 0.00,
          netAmount: 6150.00,
          totalPaid: 6150.00,
          remainingAmount: 0.00,
          paymentMethod: 0,
          remarks: 'नगद काउन्टर खुद्रा बिक्री',
          orderProducts: [
            { productId: 2, productName: 'पाश्चराइज्ड प्रशोधित दूध', quantity: 15, unitPrice: 50.00, totalPrice: 750.00 },
            { productId: 3, productName: 'ताजा दही', quantity: 10, unitPrice: 120.00, totalPrice: 1200.00 },
            { productId: 5, productName: 'शुद्ध गाईको घिउ', quantity: 3, unitPrice: 1400.00, totalPrice: 4200.00 }
          ],
          isDeleted: false
        }
      ],
      futureOrders: [
        {
          id: 101,
          orderNumber: 'ORD-2026-001',
          customerId: 7,
          customerName: 'Pokhara Sweets & Bakery',
          orderDateUtms: now - day,
          deliveryDateUtms: now + day,
          deliveryAddress: 'न्यूरोड, काठमाडौं',
          status: 'Confirmed',
          totalAmount: 14850.00,
          paidAmount: 5000.00,
          balanceAmount: 9850.00,
          paymentMethod: 2,
          notes: 'बिहानी ७ बजेभित्र पनिर र क्रिम डेलिभरी गर्नुपर्ने',
          items: [
            { productId: 4, productName: 'ताजा पनिर', quantity: 15, unitPrice: 750.00, totalPrice: 11250.00 },
            { productId: 7, productName: 'ताजा क्रिम', quantity: 8, unitPrice: 450.00, totalPrice: 3600.00 }
          ],
          deliveries: [],
          changeLogs: [
            { timestamp: now - day, action: 'CREATED', details: 'Order placed for Rs. 14,850 with Rs. 5,000 advance bank deposit' }
          ]
        }
      ],
      // Production Batches: 180 L + 100 L = 280 L Raw Input; Processing Leakage = 4.5 L + 2.0 L = 6.5 L
      productionBatches: [
        {
          id: 1,
          batchNumber: 'BATCH-2026-001',
          productionDateUtms: now - day + 2 * hr,
          status: 'Completed',
          inputRawMilkLiters: 180.0,
          wastageQuantity: 4.5,
          leakageLiters: 4.5,
          netProcessedMilkLiters: 175.5,
          leakagePercentage: 2.5,
          yieldRecoveryPercentage: 97.5,
          inputFat: 4.8,
          inputSnf: 8.4,
          location: 'Main Processing Plant',
          outputItems: [
            { productId: 2, productName: 'पाश्चराइज्ड प्रशोधित दूध', quantity: 160.0, unit: 'Pouch' },
            { productId: 4, productName: 'ताजा पनिर', quantity: 14.0, unit: 'Kilogram' },
            { productId: 7, productName: 'ताजा क्रिम', quantity: 8.0, unit: 'Litre' }
          ],
          remarks: 'पाश्चराइजेशन तथा पनिर/क्रिम प्रशोधन सम्पन्न (२.५% प्रशोधन नोक्सानी)',
          isDeleted: false
        },
        {
          id: 2,
          batchNumber: 'BATCH-2026-002',
          productionDateUtms: now - 10 * hr,
          status: 'Completed',
          inputRawMilkLiters: 100.0,
          wastageQuantity: 2.0,
          leakageLiters: 2.0,
          netProcessedMilkLiters: 98.0,
          leakagePercentage: 2.0,
          yieldRecoveryPercentage: 98.0,
          inputFat: 4.6,
          inputSnf: 8.3,
          location: 'Fermentation & Ghee Unit',
          outputItems: [
            { productId: 3, productName: 'ताजा दही', quantity: 60.0, unit: 'Litre' },
            { productId: 5, productName: 'शुद्ध गाईको घिउ', quantity: 2.0, unit: 'Kilogram' },
            { productId: 6, productName: 'ताजा नौनी घिउ', quantity: 4.0, unit: 'Kilogram' }
          ],
          remarks: 'दही, घिउ र नौनी उत्पादन ब्याच सम्पन्न (२.०% प्रशोधन नोक्सानी)',
          isDeleted: false
        }
      ],
      // Supplier Purchase Total: 4640 + 1400 = Rs 6,040.00 (Paid Rs 5,000.00 Bank, Due Rs 1,040.00)
      purchases: [
        {
          id: 1,
          supplierName: 'Himalayan Dairy Suppliers Ltd.',
          invoiceNumber: 'HDP-2026-9041',
          purchaseDateUtms: now - 2 * day,
          paymentStatus: 1,
          paymentMethod: 2,
          totalAmount: 6040.00,
          paidAmount: 5000.00,
          location: 'Central Warehouse - Bay 2',
          remarks: 'कच्चा दूध तथा दही स्टक आपूर्ति खरिद',
          items: [
            { productId: 1, productName: 'Raw Milk', quantity: 80.0, unitPrice: 58.00, totalPrice: 4640.00, batchNumber: 'RAW-LOT-2026-01' },
            { productId: 3, productName: 'Fresh Curd / Dahi', quantity: 20.0, unitPrice: 70.00, totalPrice: 1400.00, batchNumber: 'DAHI-LOT-2026-01' }
          ],
          isDeleted: false
        }
      ],
      stockMovements: [
        { id: 1, productId: 1, productName: 'Raw Milk', movementType: 1, quantity: 80.0, batchNumber: 'RAW-LOT-2026-01', location: 'Chilling Vat 1', reference: 'HDP-2026-9041', remarks: 'Supplier Raw Milk Purchase', dateTimeUtms: now - 2 * day },
        { id: 2, productId: 3, productName: 'Fresh Curd / Dahi', movementType: 1, quantity: 20.0, batchNumber: 'DAHI-LOT-2026-01', location: 'Cold Storage', reference: 'HDP-2026-9041', remarks: 'Supplier Curd Purchase', dateTimeUtms: now - 2 * day },
        { id: 3, productId: 2, productName: 'Standard Pasteurized Milk', movementType: 1, quantity: 120.0, batchNumber: 'PAS-LOT-2026-01', location: 'Cold Storage', reference: 'OPENING-STOCK', remarks: 'Opening Packaged Stock', dateTimeUtms: now - 2 * day + hr },
        { id: 4, productId: 4, productName: 'Fresh Paneer', movementType: 1, quantity: 10.0, batchNumber: 'PAN-LOT-2026-01', location: 'Cold Storage', reference: 'OPENING-STOCK', remarks: 'Opening Paneer Stock', dateTimeUtms: now - 2 * day + hr },
        { id: 5, productId: 5, productName: 'Pure Cow Ghee', movementType: 1, quantity: 21.0, batchNumber: 'GHEE-LOT-2026-01', location: 'Main Shelf', reference: 'OPENING-STOCK', remarks: 'Opening Ghee Stock', dateTimeUtms: now - 2 * day + hr },
        { id: 6, productId: 6, productName: 'White Butter / Nauni', movementType: 1, quantity: 10.0, batchNumber: 'BUTTER-LOT-2026-01', location: 'Cold Storage', reference: 'OPENING-STOCK', remarks: 'Opening Butter Stock', dateTimeUtms: now - 2 * day + hr },
        { id: 7, productId: 7, productName: 'Fresh Cream', movementType: 1, quantity: 10.0, batchNumber: 'CREAM-LOT-2026-01', location: 'Cold Storage', reference: 'OPENING-STOCK', remarks: 'Opening Cream Stock', dateTimeUtms: now - 2 * day + hr },
        { id: 8, productId: 1, productName: 'Raw Milk', movementType: 1, quantity: 300.0, batchNumber: 'COL-2026', location: 'Chilling Vat 1', reference: 'FARMER-COLLECTIONS', remarks: 'Farmer Raw Milk Collections Intake', dateTimeUtms: now - day - 4 * hr },
        { id: 9, productId: 1, productName: 'Raw Milk', movementType: 2, quantity: 180.0, batchNumber: 'RAW-LOT-2026-01', location: 'Main Processing Plant', reference: 'BATCH-2026-001', remarks: 'Consumed in Production Batch 1 (4.5 L processing leakage)', dateTimeUtms: now - day + 2 * hr },
        { id: 10, productId: 2, productName: 'Standard Pasteurized Milk', movementType: 1, quantity: 160.0, batchNumber: 'PAS-LOT-2026-01', location: 'Packaging Bay', reference: 'BATCH-2026-001', remarks: 'Production Batch Output', dateTimeUtms: now - day + 2 * hr + 1000 },
        { id: 11, productId: 4, productName: 'Fresh Paneer', movementType: 1, quantity: 14.0, batchNumber: 'PAN-LOT-2026-01', location: 'Cold Storage', reference: 'BATCH-2026-001', remarks: 'Production Batch Output', dateTimeUtms: now - day + 2 * hr + 2000 },
        { id: 12, productId: 7, productName: 'Fresh Cream', movementType: 1, quantity: 8.0, batchNumber: 'CREAM-LOT-2026-01', location: 'Cold Storage', reference: 'BATCH-2026-001', remarks: 'Production Batch Output', dateTimeUtms: now - day + 2 * hr + 3000 },
        { id: 13, productId: 1, productName: 'Raw Milk', movementType: 2, quantity: 100.0, batchNumber: 'RAW-LOT-2026-01', location: 'Fermentation & Ghee Unit', reference: 'BATCH-2026-002', remarks: 'Consumed in Production Batch 2 (2.0 L processing leakage)', dateTimeUtms: now - 10 * hr },
        { id: 14, productId: 3, productName: 'Fresh Curd / Dahi', movementType: 1, quantity: 60.0, batchNumber: 'DAHI-LOT-2026-01', location: 'Cold Storage', reference: 'BATCH-2026-002', remarks: 'Production Batch Output', dateTimeUtms: now - 10 * hr + 1000 },
        { id: 15, productId: 5, productName: 'Pure Cow Ghee', movementType: 1, quantity: 2.0, batchNumber: 'GHEE-LOT-2026-01', location: 'Main Shelf', reference: 'BATCH-2026-002', remarks: 'Production Batch Output', dateTimeUtms: now - 10 * hr + 2000 },
        { id: 16, productId: 6, productName: 'White Butter / Nauni', movementType: 1, quantity: 4.0, batchNumber: 'BUTTER-LOT-2026-01', location: 'Cold Storage', reference: 'BATCH-2026-002', remarks: 'Production Batch Output', dateTimeUtms: now - 10 * hr + 3000 },
        { id: 17, productId: 1, productName: 'Raw Milk', movementType: 4, quantity: 3.0, batchNumber: 'RAW-LOT-2026-01', location: 'Chilling Vat 1', reference: 'LEAK-RAW-01', remarks: 'Can transfer spillage & chilling pipe leakage', dateTimeUtms: now - 9 * hr },
        { id: 18, productId: 2, productName: 'Standard Pasteurized Milk', movementType: 4, quantity: 4.0, batchNumber: 'PAS-LOT-2026-01', location: 'Cold Storage', reference: 'LEAK-PCH-01', remarks: 'Burst/leaking milk pouches damaged in handling', dateTimeUtms: now - 6 * hr },
        { id: 19, productId: 1, productName: 'Raw Milk', movementType: 3, quantity: 12.0, batchNumber: 'RAW-LOT-2026-01', location: 'Retail Counter', reference: 'SALE-3', remarks: 'Direct raw milk sale (#3)', dateTimeUtms: now - 8 * hr },
        { id: 20, productId: 2, productName: 'Standard Pasteurized Milk', movementType: 3, quantity: 80.0, batchNumber: 'PAS-LOT-2026-01', location: 'Retail Counter', reference: 'SALES-BATCH', remarks: 'POS & Wholesale Sales Outflow', dateTimeUtms: now - 3 * hr },
        { id: 21, productId: 3, productName: 'Fresh Curd / Dahi', movementType: 3, quantity: 37.0, batchNumber: 'DAHI-LOT-2026-01', location: 'Retail Counter', reference: 'SALES-BATCH', remarks: 'POS & Wholesale Sales Outflow', dateTimeUtms: now - 3 * hr },
        { id: 22, productId: 4, productName: 'Fresh Paneer', movementType: 3, quantity: 13.0, batchNumber: 'PAN-LOT-2026-01', location: 'Retail Counter', reference: 'SALES-BATCH', remarks: 'POS & Wholesale Sales Outflow', dateTimeUtms: now - 8 * hr },
        { id: 23, productId: 5, productName: 'Pure Cow Ghee', movementType: 3, quantity: 8.0, batchNumber: 'GHEE-LOT-2026-01', location: 'Retail Counter', reference: 'SALES-BATCH', remarks: 'POS & Wholesale Sales Outflow', dateTimeUtms: now - 3 * hr },
        { id: 24, productId: 6, productName: 'White Butter / Nauni', movementType: 3, quantity: 2.0, batchNumber: 'BUTTER-LOT-2026-01', location: 'Retail Counter', reference: 'SALE-2', remarks: 'Wholesale Sale (#2)', dateTimeUtms: now - 14 * hr },
        { id: 25, productId: 7, productName: 'Fresh Cream', movementType: 3, quantity: 4.0, batchNumber: 'CREAM-LOT-2026-01', location: 'Retail Counter', reference: 'SALE-2', remarks: 'Wholesale Sale (#2)', dateTimeUtms: now - 14 * hr }
      ],
      // Operating Expenses Total: 1450 + 800 + 650 = Rs 2,900.00
      expenses: [
        {
          id: 1,
          category: 'Electricity',
          amount: 1450.00,
          paymentMethod: 2,
          recipient: 'Nepal Electricity Authority',
          referenceNumber: 'NEA-OCT-2026',
          remarks: 'डेरी प्रशोधन प्लान्टको मासिक विद्युत महसुल',
          expenseDateUtms: now - 15 * hr,
          isDeleted: false
        },
        {
          id: 2,
          category: 'Transport',
          amount: 800.00,
          paymentMethod: 0,
          recipient: 'Sita Cold Transport',
          referenceNumber: 'TR-502',
          remarks: 'रेफ्रिजरेटेड भ्यान ढुवानी खर्च',
          expenseDateUtms: now - 13 * hr,
          isDeleted: false
        },
        {
          id: 3,
          category: 'Packaging',
          amount: 650.00,
          paymentMethod: 0,
          recipient: 'Nepal Packaging Industries',
          referenceNumber: 'PKG-8821',
          remarks: 'दूध र दही प्याकिङ प्लास्टिक खरिद',
          expenseDateUtms: now - 2 * day + 2 * hr,
          isDeleted: false
        }
      ],
      customerPayments: [
        {
          id: 1,
          customerId: 6,
          customerName: 'Hotel Annapurna View',
          orderId: 1,
          amount: 2000.00,
          paymentMethod: 2,
          referenceNumber: 'FP-TXN-998822',
          remarks: 'होटल अन्नपूर्णको आंशिक बक्यौता भुक्तानी (Fonepay QR)',
          paymentDateUtms: now - 12 * hr,
          isDeleted: false
        }
      ],
      // Reconciled Cash & Bank Ledgers (Base float: Cash Rs 25,000, Bank Rs 75,000)
      // Final Cash = 25000 - 650 - 5000 + 10250 - 800 - 2000 + 6150 = Rs 32,950.00
      // Final Bank = 75000 - 5000 + 5000 + 8500 - 3000 - 1450 + 2000 + 4000 = Rs 85,050.00
      cashBankLedgers: [
        { id: 1, accountType: 2, transactionType: 2, amount: 5000.00, balanceAfter: 70000.00, category: 'Supplier Purchase', description: 'Payment for purchase from Himalayan Dairy Suppliers Ltd.', referenceNumber: 'HDP-2026-9041', referenceType: 'Purchase', transactionDateUtms: now - 2 * day, isDeleted: false },
        { id: 2, accountType: 1, transactionType: 2, amount: 650.00, balanceAfter: 24350.00, category: 'Expense: Packaging', description: 'Operating Expense for Packaging paid to Nepal Packaging Industries', referenceNumber: 'PKG-8821', referenceType: 'Expense', transactionDateUtms: now - 2 * day + 2 * hr, isDeleted: false },
        { id: 3, accountType: 2, transactionType: 1, amount: 5000.00, balanceAfter: 75000.00, category: 'Order Advance Deposit', description: 'Advance deposit for Scheduled Order ORD-2026-001 (Pokhara Sweets & Bakery)', referenceNumber: 'ORD-2026-001', referenceType: 'FutureOrderDeposit', transactionDateUtms: now - day, isDeleted: false },
        { id: 4, accountType: 2, transactionType: 1, amount: 8500.00, balanceAfter: 83500.00, category: 'Instant Sale', description: 'Payment received for Instant Sale #1 (Hotel Annapurna View)', referenceNumber: 'SALE-1', referenceType: 'Sale', transactionDateUtms: now - 20 * hr, isDeleted: false },
        { id: 5, accountType: 1, transactionType: 2, amount: 5000.00, balanceAfter: 19350.00, category: 'Milk Settlement', description: 'Payment out to Ram Bahadur Thapa (Farmer)', referenceNumber: 'VCHR-FARM-01', referenceType: 'PaymentOut', transactionDateUtms: now - 18 * hr, isDeleted: false },
        { id: 6, accountType: 2, transactionType: 2, amount: 3000.00, balanceAfter: 80500.00, category: 'Milk Settlement', description: 'Bank Transfer to Hari Prasad Sharma (Farmer)', referenceNumber: 'BANK-TR-8491', referenceType: 'PaymentOut', transactionDateUtms: now - 17 * hr, isDeleted: false },
        { id: 7, accountType: 1, transactionType: 2, amount: 2000.00, balanceAfter: 17350.00, category: 'Milk Settlement', description: 'Payment out to Sita Maya Gurung (Farmer)', referenceNumber: 'VCHR-FARM-02', referenceType: 'PaymentOut', transactionDateUtms: now - 16 * hr, isDeleted: false },
        { id: 8, accountType: 2, transactionType: 2, amount: 1450.00, balanceAfter: 79050.00, category: 'Expense: Electricity', description: 'Operating Expense for Electricity paid to NEA', referenceNumber: 'NEA-OCT-2026', referenceType: 'Expense', transactionDateUtms: now - 15 * hr, isDeleted: false },
        { id: 9, accountType: 1, transactionType: 1, amount: 10250.00, balanceAfter: 27600.00, category: 'Instant Sale', description: 'Payment received for Instant Sale #2 (Pokhara Sweets)', referenceNumber: 'SALE-2', referenceType: 'Sale', transactionDateUtms: now - 14 * hr, isDeleted: false },
        { id: 10, accountType: 1, transactionType: 2, amount: 800.00, balanceAfter: 26800.00, category: 'Expense: Transport', description: 'Operating Expense for Transport paid to Sita Cold Transport', referenceNumber: 'TR-502', referenceType: 'Expense', transactionDateUtms: now - 13 * hr, isDeleted: false },
        { id: 11, accountType: 2, transactionType: 1, amount: 2000.00, balanceAfter: 81050.00, category: 'Customer Payment', description: 'Payment received from Hotel Annapurna View (Fonepay)', referenceNumber: 'FP-TXN-998822', referenceType: 'CustomerPayment', transactionDateUtms: now - 12 * hr, isDeleted: false },
        { id: 12, accountType: 2, transactionType: 1, amount: 4000.00, balanceAfter: 85050.00, category: 'Instant Sale', description: 'Payment received for Instant Sale #3 (Lakeside Cafe)', referenceNumber: 'SALE-3', referenceType: 'Sale', transactionDateUtms: now - 8 * hr, isDeleted: false },
        { id: 13, accountType: 1, transactionType: 1, amount: 6150.00, balanceAfter: 32950.00, category: 'Instant Sale', description: 'Payment received for Instant Sale #4 (Walk-in)', referenceNumber: 'SALE-4', referenceType: 'Sale', transactionDateUtms: now - 3 * hr, isDeleted: false }
      ]
    };
  }

  // Authentication
  authenticate(emailOrUsername, password, tenantSlug = null) {
    const raw = (emailOrUsername || '').trim().toLowerCase();
    const cleanUser = raw.split('@')[0];

    const user = this.platform.users.find(u => {
      if (u.isDeleted || !u.isActive) return false;
      const uEmail = (u.email || '').toLowerCase();
      const uUsername = (u.username || '').toLowerCase();
      const uClean = uEmail.split('@')[0];
      return uEmail === raw || uUsername === raw || uClean === raw || uClean === cleanUser;
    });

    if (!user) return null;
    if (!verifyPassword(password, user.passwordHash)) {
      return null;
    }

    let tenant = this.platform.tenants.find(t => t.id === user.tenantId);
    if (tenantSlug) {
      const match = this.platform.tenants.find(t => t.name === tenantSlug);
      if (match) tenant = match;
    }
    if (!tenant) tenant = this.platform.tenants[0];

    const resolvedUsername = deriveUsername(user);
    const token = generateToken({ ...user, username: resolvedUsername }, tenant.id);
    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: resolvedUsername,
        email: user.email,
        name: user.name,
        roles: user.roles,
        tenantId: tenant.id,
        tenantName: tenant.name,
        organizationName: tenant.organizationName
      },
      activeTenant: tenant
    };
  }

  // Customer calculations helper
  calculateCustomerKPIs(customer, tenantData) {
    const collections = tenantData.milkCollections.filter(c => c.farmerId === customer.id && !c.isDeleted);
    const payments = tenantData.milkCollectionPayments.filter(p => p.farmerId === customer.id && !p.isDeleted);
    const orders = tenantData.orders.filter(o => o.customerId === customer.id && !o.isDeleted);
    const custPayments = tenantData.customerPayments.filter(p => p.customerId === customer.id && !p.isDeleted);

    const totalMilkQuantity = this.round2(collections.reduce((acc, c) => acc + (Number(c.quantity) || 0), 0));
    const milkCollectionTotalAmount = this.round2(collections.reduce((acc, c) => acc + (Number(c.totalPrice) || 0), 0));
    const milkCollectionTotalAmountPaid = this.round2(payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0));
    const milkCollectionRemainingAmount = this.round2(milkCollectionTotalAmount - milkCollectionTotalAmountPaid);

    const totalPurchased = this.round2(orders.reduce((acc, o) => acc + (Number(o.netAmount ?? o.totalAmount) || 0), 0));
    const totalOrderPaid = this.round2(
      orders.reduce((acc, o) => acc + (Number(o.totalPaid) || 0), 0) +
      custPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
    );
    const outstandingBalance = Math.max(0, this.round2(totalPurchased - totalOrderPaid));

    return {
      ...customer,
      totalMilkQuantity,
      milkCollectionTotalAmount,
      milkCollectionTotalAmountPaid,
      milkCollectionRemainingAmount,
      totalPurchased,
      totalPaid: totalOrderPaid,
      outstandingBalance
    };
  }

  // Dashboard & Profit-Loss Analytics
  getDashboardAnalytics(tenantId, fromDateUtms, toDateUtms) {
    const tData = this.getTenantData(tenantId);
    let collections = tData.milkCollections.filter(c => !c.isDeleted);
    let orders = tData.orders.filter(o => !o.isDeleted);
    let purchases = tData.purchases.filter(p => !p.isDeleted);
    let expenses = tData.expenses.filter(e => !e.isDeleted);
    let batches = (tData.productionBatches || []).filter(b => !b.isDeleted);
    let movements = tData.stockMovements || [];

    if (fromDateUtms) {
      collections = collections.filter(c => c.dateTimeUtms >= Number(fromDateUtms));
      orders = orders.filter(o => o.orderDateTimeUtms >= Number(fromDateUtms));
      purchases = purchases.filter(p => p.purchaseDateUtms >= Number(fromDateUtms));
      expenses = expenses.filter(e => e.expenseDateUtms >= Number(fromDateUtms));
      batches = batches.filter(b => (b.productionDateUtms || 0) >= Number(fromDateUtms));
      movements = movements.filter(m => (m.dateTimeUtms || m.movementDateUtms || 0) >= Number(fromDateUtms));
    }
    if (toDateUtms) {
      collections = collections.filter(c => c.dateTimeUtms <= Number(toDateUtms));
      orders = orders.filter(o => o.orderDateTimeUtms <= Number(toDateUtms));
      purchases = purchases.filter(p => p.purchaseDateUtms <= Number(toDateUtms));
      expenses = expenses.filter(e => e.expenseDateUtms <= Number(toDateUtms));
      batches = batches.filter(b => (b.productionDateUtms || 0) <= Number(toDateUtms));
      movements = movements.filter(m => (m.dateTimeUtms || m.movementDateUtms || 0) <= Number(toDateUtms));
    }

    // Revenue
    const totalSalesRevenue = this.round2(
      orders.reduce((acc, o) => acc + (Number(o.netAmount ?? o.totalAmount) || 0), 0)
    );

    // COGS
    const totalMilkPurchaseCost = this.round2(collections.reduce((acc, c) => acc + (Number(c.totalPrice) || 0), 0));
    const totalSupplierPurchaseCost = this.round2(purchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0));
    const costOfGoodsSold = this.round2(totalMilkPurchaseCost + totalSupplierPurchaseCost);
    const grossProfit = this.round2(totalSalesRevenue - costOfGoodsSold);

    // Expenses Breakdown
    const expenseBreakdown = {};
    let totalOperatingExpenses = 0;
    expenses.forEach(e => {
      const cat = e.category || 'Miscellaneous';
      const amt = Number(e.amount) || 0;
      expenseBreakdown[cat] = this.round2((expenseBreakdown[cat] || 0) + amt);
      totalOperatingExpenses += amt;
    });
    totalOperatingExpenses = this.round2(totalOperatingExpenses);

    const netProfit = this.round2(grossProfit - totalOperatingExpenses);

    // Farmer Balances & Customer Receivables
    const farmerBalances = tData.customers
      .filter(c => (c.customerType === 1 || c.customerType === 3) && !c.isDeleted)
      .map(c => {
        const enriched = this.calculateCustomerKPIs(c, tData);
        return {
          customerId: c.id,
          farmerName: c.nameInNepali || c.nameInEnglish,
          phone: c.phone,
          totalMilkQuantity: enriched.totalMilkQuantity,
          totalMilkAmount: enriched.milkCollectionTotalAmount,
          totalPaidAmount: enriched.milkCollectionTotalAmountPaid,
          dueBalance: enriched.milkCollectionRemainingAmount
        };
      });

    const customerBalances = tData.customers
      .filter(c => (c.customerType === 2 || c.customerType === 3) && !c.isDeleted)
      .map(c => {
        const enriched = this.calculateCustomerKPIs(c, tData);
        return {
          customerId: c.id,
          customerName: c.nameInEnglish || c.nameInNepali,
          phone: c.phone,
          totalPurchased: enriched.totalPurchased,
          totalPaid: enriched.totalPaid,
          outstandingBalance: enriched.outstandingBalance
        };
      });

    const totalFarmerPayables = this.round2(farmerBalances.reduce((acc, f) => acc + Math.max(0, f.dueBalance), 0));
    const totalCustomerReceivables = this.round2(customerBalances.reduce((acc, c) => acc + Math.max(0, c.outstandingBalance), 0));

    // Total milk volume & weighted average quality
    const totalMilkCollectedLiters = this.round2(collections.reduce((acc, c) => acc + (Number(c.quantity) || 0), 0));
    const morningMilkLiters = this.round2(collections.filter(c => c.shift === 0).reduce((acc, c) => acc + (Number(c.quantity) || 0), 0));
    const eveningMilkLiters = this.round2(collections.filter(c => c.shift === 1).reduce((acc, c) => acc + (Number(c.quantity) || 0), 0));

    const weightedFatSum = collections.reduce((acc, c) => acc + (Number(c.fat) || 0) * (Number(c.quantity) || 0), 0);
    const weightedSnfSum = collections.reduce((acc, c) => acc + (Number(c.snf) || 0) * (Number(c.quantity) || 0), 0);
    const weightedAvgFat = totalMilkCollectedLiters > 0 ? this.round2(weightedFatSum / totalMilkCollectedLiters) : 0;
    const weightedAvgSnf = totalMilkCollectedLiters > 0 ? this.round2(weightedSnfSum / totalMilkCollectedLiters) : 0;

    // Raw Milk Mass Balance & Leakage Calculation
    const rawMilkProduct = (tData.products || []).find(p => !p.isDeleted && (p.id === 1 || (p.nameInEnglish || '').includes('Raw Milk')));
    const rawMilkId = rawMilkProduct ? rawMilkProduct.id : 1;

    const purchasedRawMilkLiters = this.round2(
      purchases.reduce((acc, p) => {
        const rawQty = (p.items || [])
          .filter(it => Number(it.productId) === rawMilkId)
          .reduce((s, it) => s + (Number(it.quantity) || 0), 0);
        return acc + rawQty;
      }, 0)
    );
    const processedRawMilkLiters = this.round2(batches.reduce((acc, b) => acc + (Number(b.inputRawMilkLiters) || 0), 0));
    const processingLeakageLiters = this.round2(batches.reduce((acc, b) => acc + (Number(b.wastageQuantity ?? b.leakageLiters) || 0), 0));
    const rawMilkSoldLiters = this.round2(
      orders.reduce((acc, o) => {
        const rawQty = (o.orderProducts || [])
          .filter(it => Number(it.productId) === rawMilkId)
          .reduce((s, it) => s + (Number(it.quantity) || 0), 0);
        return acc + rawQty;
      }, 0)
    );
    const storageWastageRawLiters = this.round2(
      movements
        .filter(m => Number(m.productId) === rawMilkId && Number(m.movementType) === 4)
        .reduce((acc, m) => acc + (Number(m.quantity) || 0), 0)
    );
    const totalInventoryWastageUnits = this.round2(
      movements
        .filter(m => Number(m.movementType) === 4)
        .reduce((acc, m) => acc + (Number(m.quantity) || 0), 0)
    );

    const allCollections = tData.milkCollections.filter(c => !c.isDeleted);
    const allPurchases = tData.purchases.filter(p => !p.isDeleted);
    const allOrders = tData.orders.filter(o => !o.isDeleted);
    const allBatches = (tData.productionBatches || []).filter(b => !b.isDeleted);
    const allMovements = tData.stockMovements || [];

    const allCollectedRaw = allCollections.reduce((a, c) => a + (Number(c.quantity) || 0), 0);
    const allPurchasedRaw = allPurchases.reduce((a, p) => a + (p.items || []).filter(it => Number(it.productId) === rawMilkId).reduce((s, it) => s + (Number(it.quantity) || 0), 0), 0);
    const allProcessedRaw = allBatches.reduce((a, b) => a + (Number(b.inputRawMilkLiters) || 0), 0);
    const allSoldRaw = allOrders.reduce((a, o) => a + (o.orderProducts || []).filter(it => Number(it.productId) === rawMilkId).reduce((s, it) => s + (Number(it.quantity) || 0), 0), 0);
    const allWastageRaw = allMovements.filter(m => Number(m.productId) === rawMilkId && Number(m.movementType) === 4).reduce((a, m) => a + (Number(m.quantity) || 0), 0);
    const allAdjustRaw = allMovements
      .filter(m => Number(m.productId) === rawMilkId && Number(m.movementType) === 5)
      .reduce((a, m) => {
        const sign = m.adjustmentDirection === 'subtract' || Number(m.quantity) < 0 ? -1 : 1;
        return a + sign * Math.abs(Number(m.quantity) || 0);
      }, 0);

    const rawStocks = (tData.productStocks || []).filter(s => Number(s.productId) === rawMilkId);
    const actualRawStockLiters = this.round2(
      Math.max(0, rawStocks.reduce((a, s) => a + ((Number(s.quantity) || 0) - (Number(s.usedQuantity) || 0)), 0))
    );
    const expectedRawStockLiters = this.round2(
      Math.max(0, allCollectedRaw + allPurchasedRaw + allAdjustRaw - allProcessedRaw - allSoldRaw - allWastageRaw)
    );
    const unaccountedVarianceLiters = this.round2(expectedRawStockLiters - actualRawStockLiters);

    const totalRawInputPeriod = this.round2(totalMilkCollectedLiters + purchasedRawMilkLiters);
    const totalMilkLeakageLiters = this.round2(processingLeakageLiters + storageWastageRawLiters);
    const leakageRatePercentage = totalRawInputPeriod > 0
      ? this.round2((totalMilkLeakageLiters / totalRawInputPeriod) * 100)
      : 0;

    return {
      totalMilkCollectedLiters,
      morningMilkLiters,
      eveningMilkLiters,
      weightedAvgFat,
      weightedAvgSnf,
      totalMilkProcurementCost: totalMilkPurchaseCost,
      totalSalesRevenue,
      totalCustomerReceivables,
      totalFarmerPayables,
      farmerBalances,
      customerBalances,
      leakageSummary: {
        collectedRawMilkLiters: totalMilkCollectedLiters,
        purchasedRawMilkLiters,
        totalRawInputLiters: totalRawInputPeriod,
        processedRawMilkLiters,
        processingLeakageLiters,
        storageWastageRawLiters,
        totalMilkLeakageLiters,
        leakageRatePercentage,
        rawMilkSoldLiters,
        totalInventoryWastageUnits,
        expectedRawStockLiters,
        actualRawStockLiters,
        unaccountedVarianceLiters
      },
      profitLoss: {
        totalSalesRevenue,
        totalMilkPurchaseCost,
        totalSupplierPurchaseCost,
        costOfGoodsSold,
        grossProfit,
        grossMarginPercentage: totalSalesRevenue > 0 ? this.round2((grossProfit / totalSalesRevenue) * 100) : 0,
        totalOperatingExpenses,
        expenseBreakdown,
        netProfit,
        netProfitMarginPercentage: totalSalesRevenue > 0 ? this.round2((netProfit / totalSalesRevenue) * 100) : 0
      }
    };
  }

  getCashBankSummary(tenantId) {
    const tData = this.getTenantData(tenantId);
    let cashBalance = 25000; // Standard base cash float
    let bankBalance = 75000; // Standard base bank float

    tData.cashBankLedgers.filter(l => !l.isDeleted).forEach(entry => {
      const amt = Number(entry.amount) || 0;
      if (entry.accountType === 1) { // Cash
        if (entry.transactionType === 1) cashBalance += amt;
        else cashBalance -= amt;
      } else { // Bank
        if (entry.transactionType === 1) bankBalance += amt;
        else bankBalance -= amt;
      }
    });

    cashBalance = this.round2(cashBalance);
    bankBalance = this.round2(bankBalance);
    return {
      cashBalance,
      bankBalance,
      totalBalance: this.round2(cashBalance + bankBalance)
    };
  }

  logActivity(tenantId, entry) {
    const tid = Number(tenantId) || 1;
    const tData = this.getTenantData(tid);
    if (!tData.auditLogs) tData.auditLogs = [];

    const now = entry.dateTimeUtms || Date.now();
    const userEmail = entry.userEmail || 'admin@dairy.local';
    const userName = entry.userName || 'System Admin';
    const username = deriveUsername({
      username: entry.username,
      email: userEmail,
      name: userName
    });
    const dateObj = new Date(now);
    const logEntry = {
      id: now + Math.floor(Math.random() * 1000),
      tenantId: tid,
      userId: Number(entry.userId) || 1,
      username,
      userName,
      userEmail,
      ...(entry.farmerId ? { farmerId: Number(entry.farmerId) } : {}),
      ...(entry.customerId ? { customerId: Number(entry.customerId) } : {}),
      action: entry.action || 'ACTIVITY',
      actionLabelNe: entry.actionLabelNe || entry.actionLabel || 'कार्य सम्पादन',
      actionLabelEn: entry.actionLabelEn || entry.actionLabel || 'User Activity',
      category: entry.category || 'General',
      details: entry.details || '',
      referenceId: entry.referenceId ? String(entry.referenceId) : null,
      dateTimeUtms: now,
      dateTimeIso: dateObj.toISOString(),
      dateStr: dateObj.toISOString().slice(0, 10),
      isDeleted: false
    };

    tData.auditLogs.unshift(logEntry);
    if (tData.auditLogs.length > 2500) {
      tData.auditLogs = tData.auditLogs.slice(0, 2500);
    }

    this.saveTenantData(tid, tData);
    return logEntry;
  }

  getAuditLogs(tenantId, query = {}) {
    const tid = Number(tenantId) || 1;
    const tData = this.getTenantData(tid);
    let list = (tData.auditLogs || [])
      .filter(l => !l.isDeleted)
      .map(l => (l.username ? l : { ...l, username: deriveUsername({ email: l.userEmail, name: l.userName }) }));

    const { category, userId, username, search, startDateUtms, endDateUtms, maxResultCount = 100, skipCount = 0 } = query;

    if (category && category !== 'all') {
      list = list.filter(l => l.category && l.category.toLowerCase() === category.toLowerCase());
    }
    if (userId) {
      list = list.filter(l => l.userId === Number(userId));
    }
    if (username && username !== 'all') {
      const targetUser = String(username).trim().toLowerCase();
      list = list.filter(l => (l.username || '').toLowerCase() === targetUser);
    }
    if (startDateUtms) {
      list = list.filter(l => l.dateTimeUtms >= Number(startDateUtms));
    }
    if (endDateUtms) {
      list = list.filter(l => l.dateTimeUtms <= Number(endDateUtms));
    }
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter(l => {
        return (
          (l.username && l.username.toLowerCase().includes(q)) ||
          (l.userName && l.userName.toLowerCase().includes(q)) ||
          (l.userEmail && l.userEmail.toLowerCase().includes(q)) ||
          (l.details && l.details.toLowerCase().includes(q)) ||
          (l.action && l.action.toLowerCase().includes(q)) ||
          (l.actionLabelNe && l.actionLabelNe.includes(q)) ||
          (l.actionLabelEn && l.actionLabelEn.toLowerCase().includes(q)) ||
          (l.referenceId && l.referenceId.toLowerCase().includes(q))
        );
      });
    }

    list.sort((a, b) => b.dateTimeUtms - a.dateTimeUtms);

    return {
      totalCount: list.length,
      items: list.slice(Number(skipCount), Number(skipCount) + Number(maxResultCount))
    };
  }

  getAuditStats(tenantId) {
    const tid = Number(tenantId) || 1;
    const tData = this.getTenantData(tid);
    const logs = (tData.auditLogs || []).filter(l => !l.isDeleted);

    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const todayCount = logs.filter(l => l.dateTimeUtms >= startOfToday).length;

    const categoryMap = {};
    const userMap = {};

    logs.forEach(l => {
      categoryMap[l.category] = (categoryMap[l.category] || 0) + 1;
      const uName = l.userName || 'System Admin';
      const uHandle = l.username || deriveUsername({ email: l.userEmail, name: l.userName });
      const key = `${uHandle}::${uName}`;
      if (!userMap[key]) userMap[key] = { username: uHandle, name: uName, count: 0 };
      userMap[key].count += 1;
    });

    const topUsers = Object.values(userMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalCount: logs.length,
      todayCount,
      categoryBreakdown: categoryMap,
      topUsers
    };
  }

  // ============================================================================
  // DEVELOPER & PLATFORM ADMIN METHODS
  // ============================================================================

  getPlatformOverview() {
    const totalTenants = (this.platform.tenants || []).length;
    const activeTenants = (this.platform.tenants || []).filter(t => !t.isDeleted && t.status !== 'Suspended').length;
    const totalUsers = (this.platform.users || []).length;

    let totalFarmers = 0;
    let totalMilkLiters = 0;
    let totalCollections = 0;
    let totalSales = 0;

    for (const t of (this.platform.tenants || [])) {
      if (t.isDeleted) continue;
      const tData = this.getTenantData(t.id);
      if (tData) {
        totalFarmers += (tData.customers || []).filter(c => !c.isDeleted && (c.customerType === 1 || c.customerType === 3)).length;
        const colList = (tData.milkCollections || []).filter(c => !c.isDeleted);
        totalCollections += colList.length;
        totalMilkLiters += colList.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
        totalSales += (tData.orders || []).filter(o => !o.isDeleted).reduce((sum, o) => sum + (Number(o.total || o.totalAmount) || 0), 0);
      }
    }

    const renewals = this.platform.renewalRequests || [];
    const pendingRenewalsCount = renewals.filter(r => r.status === 'PENDING_VERIFICATION').length;
    const approvedRenewalsCount = renewals.filter(r => r.status === 'APPROVED').length;
    const totalRenewalRevenue = renewals.filter(r => r.status === 'APPROVED').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    let mrr = 0;
    (this.platform.tenants || []).forEach(t => {
      if (t.isDeleted || t.status === 'Suspended') return;
      const plan = (this.platform.plans || []).find(p => p.id === t.planId) || this.platform.plans?.[0];
      const cycle = t.subscription?.billingCycle || 'Yearly';
      if (cycle === 'Monthly') {
        mrr += Number(plan?.priceMonthly || 3500);
      } else {
        mrr += Math.round((Number(plan?.priceYearly || 35000) / 12));
      }
    });

    const totalRevenue = (this.platform.billings || []).reduce((sum, b) => sum + (Number(b.amount) || 0), 0) + totalRenewalRevenue;

    return {
      totalTenants,
      activeTenants,
      totalUsers,
      totalFarmers,
      totalMilkLiters: Number(totalMilkLiters.toFixed(2)),
      totalCollections,
      totalSales: Number(totalSales.toFixed(2)),
      mrr,
      totalRevenue,
      pendingRenewalsCount,
      approvedRenewalsCount,
      totalRenewalRevenue,
      plans: this.platform.plans || [],
      systemHealth: {
        status: 'OPERATIONAL',
        uptime: '99.98%',
        activeNodes: 1,
        databaseLatencyMs: 4,
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      },
      recentAuditLogs: (this.platform.auditLogs || []).slice(0, 15)
    };
  }

  logPlatformAction({ action, status = 'SUCCESS', userEmail = 'admin@dairy.local', userRole = 'SuperAdmin', tenantId = null, details = '' }) {
    if (!this.platform.auditLogs) this.platform.auditLogs = [];
    this.platform.auditLogs.unshift({
      id: `paudit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      action,
      status,
      userEmail,
      userRole,
      tenantId,
      details
    });
    if (this.platform.auditLogs.length > 1000) {
      this.platform.auditLogs = this.platform.auditLogs.slice(0, 1000);
    }
    this.savePlatform();
  }

  getAllTenants() {
    return (this.platform.tenants || []).filter(t => !t.isDeleted).map(t => {
      const domains = (this.platform.domains || []).filter(d => d.tenantId === t.id);
      const sub = (this.platform.plans || []).find(p => p.id === t.planId) || (this.platform.plans || [])[0];
      const users = (this.platform.users || []).filter(u => u.tenantId === t.id && !u.isDeleted);
      const adminUser = users.find(u => (u.roles || []).includes('SuperAdmin') || (u.roles || []).includes('Admin')) || users[0] || null;
      const tData = this.getTenantData(t.id);

      const farmerCount = (tData?.customers || []).filter(c => !c.isDeleted && (c.customerType === 1 || c.customerType === 3)).length;
      const collectionCount = (tData?.milkCollections || []).filter(c => !c.isDeleted).length;
      const totalMilkLiters = (tData?.milkCollections || []).filter(c => !c.isDeleted).reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);

      const approvedRenewals = (this.platform.renewalRequests || [])
        .filter(r => r.tenantId === t.id && r.status === 'APPROVED')
        .map(r => ({
          id: r.id,
          date: r.reviewedAt ? r.reviewedAt.split('T')[0] : (r.submittedAt ? r.submittedAt.split('T')[0] : '2026-01-01'),
          amount: Number(r.amount) || 0,
          currency: 'Rs.',
          method: r.method || 'FonePay / Bank',
          transactionRef: r.transactionRef || 'APPROVED_RENEWAL',
          invoiceNo: `INV-DAIRY-${String(r.id).slice(-6).toUpperCase()}`,
          billingPeriod: `${r.planName || (sub ? sub.name : 'Subscription')} (${r.billingCycle || 'Yearly'})`,
          status: 'PAID',
          notes: r.notes || 'Cooperative license renewal',
          receiptUrl: r.receiptUrl || null,
          recordedAt: r.reviewedAt || r.submittedAt || new Date().toISOString()
        }));

      const tenantBillings = (this.platform.billings || [])
        .filter(b => b.tenantId === t.id && !b.isDeleted)
        .map(b => ({
          id: b.id,
          date: new Date(b.dateTimeUtms).toISOString().split('T')[0],
          amount: Number(b.amount) || 0,
          currency: 'Rs.',
          method: b.paymentMethod === 1 ? 'Cash' : 'Bank / FonePay',
          transactionRef: `BIL-${b.id}`,
          invoiceNo: `INV-SAAS-${b.id}`,
          billingPeriod: b.remarks || 'Annual License',
          status: 'PAID',
          notes: b.remarks || '',
          receiptUrl: null,
          recordedAt: new Date(b.dateTimeUtms).toISOString()
        }));

      const allPayments = [...tenantBillings, ...approvedRenewals].sort((a, b) => new Date(b.date || b.recordedAt) - new Date(a.date || a.recordedAt));
      const amountPaid = allPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const billingCycle = t.subscription?.billingCycle || 'Yearly';
      const defaultPlanCost = billingCycle === 'Monthly'
        ? (Number(sub?.priceMonthly) || 3500)
        : (Number(sub?.priceYearly) || 35000);
      const totalAmountDue = t.subscription?.totalAmountDue !== undefined && t.subscription?.totalAmountDue !== null
        ? Number(t.subscription.totalAmountDue)
        : (t.subscriptionAmount !== undefined ? Number(t.subscriptionAmount) : defaultPlanCost);

      const remainingBalance = Math.max(0, totalAmountDue - amountPaid);
      const expiryDateUtms = t.expirationDateTimeUtms || (t.subscription?.expiryDate ? new Date(t.subscription.expiryDate).getTime() : (Date.now() + 365 * 24 * 3600 * 1000));
      const daysRemaining = Math.ceil((expiryDateUtms - Date.now()) / (1000 * 60 * 60 * 24));
      const isExpired = daysRemaining < 0;

      const subscription = {
        planId: t.planId || sub?.id || 'plan-starter',
        planName: sub ? sub.name : 'Cooperative Starter',
        status: t.status === 'Suspended' ? 'Suspended' : (isExpired ? 'Expired' : (t.subscription?.status || 'Active')),
        billingCycle,
        startDate: t.createdAt || '2026-01-01T00:00:00.000Z',
        expiryDate: new Date(expiryDateUtms).toISOString(),
        daysRemaining,
        isExpired,
        totalAmountDue,
        amountPaid,
        remainingBalance,
        paymentsCount: allPayments.length,
        lastPayment: allPayments[0] || null
      };

      return {
        id: t.id,
        name: t.name,
        slug: t.name,
        organizationName: t.organizationName || t.name,
        address: t.address || 'Kathmandu, Nepal',
        phone: t.phone || '9841000000',
        email: t.email || `${t.name}@dairynepal.com`,
        managerName: t.managerName || (adminUser ? adminUser.name : 'Cooperative Manager'),
        status: t.status || 'Active',
        country: 'Nepal',
        currency: 'Rs.',
        timeZone: t.timezone || 'Asia/Kathmandu',
        expirationDateTimeUtms: expiryDateUtms,
        domains,
        planId: t.planId || (sub ? sub.id : 'plan-starter'),
        plan: sub || { id: 'plan-starter', name: 'Cooperative Starter' },
        subscription,
        payments: allPayments,
        staffCount: users.length,
        usersCount: users.length,
        farmerCount,
        collectionCount,
        totalMilkLiters: Number(totalMilkLiters.toFixed(2)),
        adminUser: adminUser ? {
          id: adminUser.id,
          name: adminUser.name,
          username: adminUser.email ? adminUser.email.split('@')[0] : 'admin',
          email: adminUser.email
        } : null,
        modules: t.modules || (sub ? sub.modules : { milkCollection: true, pos: true, inventory: true })
      };
    });
  }

  getTenantById(id) {
    return (this.platform.tenants || []).find(t => t.id === Number(id) || String(t.id) === String(id));
  }

  getPlanById(id) {
    return (this.platform.plans || []).find(p => p.id === id);
  }

  getPlatformPlans() {
    return { plans: this.platform.plans || DEFAULT_PLANS };
  }

  updatePlan(id, planData) {
    if (!this.platform.plans) this.platform.plans = DEFAULT_PLANS;
    const idx = this.platform.plans.findIndex(p => p.id === id);
    const normalized = {
      ...planData,
      ...(planData.storageQuotaMb !== undefined ? { storageQuotaGb: Math.round(Number(planData.storageQuotaMb) / 1024) } : {})
    };
    if (idx === -1) {
      this.platform.plans.push({ id, ...normalized });
    } else {
      this.platform.plans[idx] = { ...this.platform.plans[idx], ...normalized };
    }
    const updated = this.platform.plans[idx >= 0 ? idx : this.platform.plans.length - 1];
    this.logPlatformAction({
      action: 'PLAN_UPDATED',
      details: `Updated subscription plan "${updated.name}" (${updated.id}) — Rs. ${updated.priceMonthly}/mo, Rs. ${updated.priceYearly}/yr`
    });
    return updated;
  }

  createPlan(planData) {
    if (!this.platform.plans) this.platform.plans = DEFAULT_PLANS;
    const newPlan = {
      id: planData.id || `plan-${Date.now()}`,
      name: planData.name || 'Custom Plan',
      priceMonthly: Number(planData.priceMonthly) || 5000,
      priceYearly: Number(planData.priceYearly) || 50000,
      maxBranches: Number(planData.maxBranches) || 1,
      maxStaff: Number(planData.maxStaff) || 5,
      maxFarmers: Number(planData.maxFarmers || planData.maxPatients) || 1000,
      storageQuotaGb: Number(planData.storageQuotaGb) || Math.round((Number(planData.storageQuotaMb) || 10240) / 1024) || 10,
      modules: planData.modules || { milkCollection: true, fatSnfPricing: true, farmerLedger: true, pos: true, nepaliBS: true }
    };
    this.platform.plans.push(newPlan);
    this.logPlatformAction({
      action: 'PLAN_CREATED',
      details: `Created subscription plan tier "${newPlan.name}" (${newPlan.id})`
    });
    return newPlan;
  }

  createTenant(data) {
    const cleanSlug = (data.slug || data.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `coop-${Date.now()}`;
    const existing = (this.platform.tenants || []).find(t => t.name.toLowerCase() === cleanSlug);
    if (existing) {
      throw new Error(`Cooperative with slug "${cleanSlug}" already exists.`);
    }

    const nextId = (this.platform.tenants || []).length > 0
      ? Math.max(...this.platform.tenants.map(t => Number(t.id) || 0)) + 1
      : 1;

    const plan = this.getPlanById(data.planId) || this.platform.plans?.[0];
    const expiryUtms = data.subscriptionExpiryDate
      ? new Date(data.subscriptionExpiryDate).getTime()
      : (Date.now() + 365 * 24 * 3600 * 1000);
    const totalFeeDue = data.totalAmountDue !== undefined && data.totalAmountDue !== ''
      ? Number(data.totalAmountDue)
      : (plan?.priceYearly || 35000);
    const now = Date.now();

    const newTenant = {
      id: nextId,
      name: cleanSlug,
      host: `${cleanSlug}.dairynepal.com`,
      organizationName: data.organizationName || data.name || 'New Dairy Cooperative',
      address: data.address || 'Kathmandu, Nepal',
      phone: data.phone || '9841000000',
      email: data.email || data.adminEmail || `${cleanSlug}@dairynepal.com`,
      managerName: data.managerName || data.adminName || 'Cooperative Manager',
      timezone: data.timeZone || 'Asia/Kathmandu',
      status: 'Active',
      planId: data.planId || 'plan-professional',
      expirationDateTimeUtms: expiryUtms,
      subscriptionAmount: totalFeeDue,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      modules: {
        ...(plan ? plan.modules : {}),
        milkCollection: true,
        fatSnfPricing: true,
        nepaliBS: true,
        pos: data.enablePOS !== undefined ? Boolean(data.enablePOS) : true,
        dairyProcessing: data.enableProcessing !== undefined ? Boolean(data.enableProcessing) : true,
        farmerLedger: data.enableFarmerLedger !== undefined ? Boolean(data.enableFarmerLedger) : true
      },
      subscription: {
        planId: data.planId || 'plan-professional',
        planName: plan?.name || 'Cooperative Professional',
        status: 'Active',
        billingCycle: data.billingCycle || 'Yearly',
        startDate: new Date().toISOString(),
        expiryDate: new Date(expiryUtms).toISOString(),
        totalAmountDue: totalFeeDue,
        amountPaid: Number(data.initialPayment) || 0
      }
    };

    this.platform.tenants.push(newTenant);

    // Create default domain
    if (!this.platform.domains) this.platform.domains = [];
    this.platform.domains.push({
      id: `dom-${newTenant.id}`,
      tenantId: newTenant.id,
      domain: `${cleanSlug}.dairynepal.com`,
      type: 'subdomain',
      isPrimary: true,
      verified: true,
      sslStatus: 'active'
    });

    // Create Initial Admin User if provided
    let createdAdmin = null;
    if (data.adminUsername || data.adminEmail) {
      const adminPass = data.adminPassword || 'Admin@123';
      const nextUserId = (this.platform.users || []).length > 0
        ? Math.max(...this.platform.users.map(u => Number(u.id) || 0)) + 1
        : 1;

      const resolvedEmail = data.adminEmail || `${data.adminUsername || cleanSlug}@dairy.local`;
      createdAdmin = {
        id: nextUserId,
        tenantId: newTenant.id,
        email: resolvedEmail.toLowerCase(),
        name: data.adminName || data.managerName || `${newTenant.organizationName} Admin`,
        passwordHash: hashPassword(adminPass),
        roles: ['SuperAdmin', 'Admin'],
        isActive: true,
        isDeleted: false,
        creationDateTimeUtms: now
      };
      this.platform.users.push(createdAdmin);
    }

    // Record initial payment if provided
    if (data.initialPayment && Number(data.initialPayment) > 0) {
      this.platform.billings.push({
        id: now,
        tenantId: newTenant.id,
        amount: Number(data.initialPayment),
        remarks: 'सफ्टवेयर स्थापना तथा सदस्यता पहिलो भुक्तानी',
        dateTimeUtms: now,
        paymentMethod: 2,
        isDeleted: false
      });
    }

    // Initialize isolated tenant data store matching full Dairy ERP 2.0 schema
    const defaultData = {
      tenantId: newTenant.id,
      name: newTenant.name,
      organizationName: newTenant.organizationName,
      units: [
        { id: 1, name: 'Litre', nameInNepali: 'लिटर', code: 'L', isDeleted: false },
        { id: 2, name: 'Kilogram', nameInNepali: 'किलो', code: 'KG', isDeleted: false },
        { id: 3, name: 'Packet', nameInNepali: 'प्याकेट', code: 'PKT', isDeleted: false },
        { id: 4, name: 'Pouch', nameInNepali: 'पाउच', code: 'PCH', isDeleted: false }
      ],
      products: [
        { id: 1, nameInEnglish: 'Raw Milk', nameInNepali: 'काँचो दूध', unitId: 1, unitName: 'Litre', sellingPrice: 85.00, costPrice: 65.00, reorderLevel: 50, description: 'ताजा गाई तथा भैँसीको काँचो दूध', isDeleted: false },
        { id: 2, nameInEnglish: 'Standard Pasteurized Milk', nameInNepali: 'पाश्चराइज्ड प्रशोधित दूध', unitId: 4, unitName: 'Pouch', sellingPrice: 50.00, costPrice: 38.00, reorderLevel: 100, description: '५०० मिलि पाश्चराइज्ड प्याकेट दूध', isDeleted: false },
        { id: 3, nameInEnglish: 'Fresh Curd / Dahi', nameInNepali: 'ताजा दही', unitId: 1, unitName: 'Litre', sellingPrice: 120.00, costPrice: 85.00, reorderLevel: 25, description: 'घरेलु स्वादको शुद्ध दही', isDeleted: false },
        { id: 4, nameInEnglish: 'Fresh Paneer', nameInNepali: 'ताजा पनिर', unitId: 2, unitName: 'Kilogram', sellingPrice: 750.00, costPrice: 580.00, reorderLevel: 15, description: 'नरम र ताजा पनिर', isDeleted: false },
        { id: 5, nameInEnglish: 'Pure Cow Ghee', nameInNepali: 'शुद्ध गाईको घिउ', unitId: 2, unitName: 'Kilogram', sellingPrice: 1400.00, costPrice: 1100.00, reorderLevel: 10, description: 'परम्परागत विधिबाट निर्मित शुद्ध घिउ', isDeleted: false }
      ],
      productStocks: [
        { id: 1, productId: 1, batchNumber: 'INIT-RAW-01', quantity: 0, usedQuantity: 0, expiryDateUtms: now + 7 * 86400000, dateTimeUtms: now },
        { id: 2, productId: 2, batchNumber: 'INIT-PAS-01', quantity: 0, usedQuantity: 0, expiryDateUtms: now + 7 * 86400000, dateTimeUtms: now }
      ],
      customers: [],
      milkFatSnfConfig: {
        id: 1,
        buyingFatPrice: 7.50,
        buyingSnfPrice: 4.00,
        sellingFatPrice: 9.00,
        sellingSnfPrice: 5.00,
        sellingPrice: 90.00,
        lastTimeUpdatedUtms: now
      },
      milkCollections: [],
      milkCollectionPayments: [],
      orders: [],
      futureOrders: [],
      productionBatches: [],
      purchases: [],
      stockMovements: [],
      expenses: [],
      customerPayments: [],
      cashBankLedgers: [],
      auditLogs: []
    };

    this.saveTenantData(newTenant.id, defaultData);
    this.logPlatformAction({
      action: 'COOPERATIVE_PROVISIONED',
      tenantId: newTenant.id,
      details: `Provisioned cooperative "${newTenant.organizationName}" (${cleanSlug}.dairynepal.com) on ${newTenant.subscription.planName}`
    });

    const safeAdmin = createdAdmin
      ? (({ passwordHash, ...rest }) => rest)(createdAdmin)
      : null;

    return {
      success: true,
      tenant: newTenant,
      adminUser: safeAdmin
    };
  }

  updateTenant(id, updates = {}) {
    const tenant = this.getTenantById(id);
    if (!tenant) return null;

    if (updates.name) tenant.organizationName = updates.name.trim();
    if (updates.organizationName) tenant.organizationName = updates.organizationName.trim();
    if (updates.slug) {
      const cleanSlug = updates.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      tenant.name = cleanSlug;
      tenant.host = `${cleanSlug}.dairynepal.com`;
      const primaryDom = (this.platform.domains || []).find(d => d.tenantId === tenant.id && d.isPrimary);
      if (primaryDom) primaryDom.domain = `${cleanSlug}.dairynepal.com`;
    }
    if (updates.address !== undefined) tenant.address = updates.address;
    if (updates.phone !== undefined) tenant.phone = updates.phone;
    if (updates.email !== undefined) tenant.email = updates.email;
    if (updates.managerName !== undefined) tenant.managerName = updates.managerName;
    if (updates.timezone !== undefined || updates.timeZone !== undefined) {
      tenant.timezone = updates.timeZone || updates.timezone;
    }
    if (updates.status) tenant.status = updates.status;
    if (updates.planId) {
      tenant.planId = updates.planId;
      const plan = this.getPlanById(updates.planId);
      if (plan && plan.modules) tenant.modules = { ...plan.modules, ...(tenant.modules || {}) };
    }
    if (updates.subscriptionExpiryDate) {
      tenant.expirationDateTimeUtms = new Date(updates.subscriptionExpiryDate).getTime();
    }
    if (updates.subscription && typeof updates.subscription === 'object') {
      tenant.subscription = { ...(tenant.subscription || {}), ...updates.subscription };
      if (updates.subscription.expiryDate) {
        tenant.expirationDateTimeUtms = new Date(updates.subscription.expiryDate).getTime();
      }
      if (updates.subscription.status && updates.subscription.status === 'Suspended') {
        tenant.status = 'Suspended';
      }
    }
    if (updates.modules) {
      tenant.modules = { ...(tenant.modules || {}), ...updates.modules };
    }
    if (updates.enablePOS !== undefined) {
      tenant.modules = { ...(tenant.modules || {}), pos: Boolean(updates.enablePOS) };
    }
    if (updates.enableProcessing !== undefined) {
      tenant.modules = { ...(tenant.modules || {}), dairyProcessing: Boolean(updates.enableProcessing) };
    }
    if (updates.enableFarmerLedger !== undefined) {
      tenant.modules = { ...(tenant.modules || {}), farmerLedger: Boolean(updates.enableFarmerLedger) };
    }

    // Update admin user if credentials provided
    if (updates.adminPassword || updates.adminName || updates.adminEmail || updates.adminUsername) {
      const admin = (this.platform.users || []).find(u => u.tenantId === tenant.id && (u.roles || []).includes('SuperAdmin'));
      if (admin) {
        if (updates.adminPassword) admin.passwordHash = hashPassword(updates.adminPassword);
        if (updates.adminName) admin.name = updates.adminName;
        if (updates.adminEmail) admin.email = updates.adminEmail;
        else if (updates.adminUsername) admin.email = `${updates.adminUsername.toLowerCase()}@dairy.local`;
      }
    }

    this.logPlatformAction({
      action: 'TENANT_UPDATED',
      tenantId: tenant.id,
      details: `Updated cooperative profile "${tenant.organizationName}" (Plan: ${tenant.planId || 'default'}, Status: ${tenant.status || 'Active'})`
    });
    return tenant;
  }

  updateTenantStatus(id, status) {
    const tenant = this.getTenantById(id);
    if (!tenant) return null;
    tenant.status = status;
    this.logPlatformAction({
      action: 'TENANT_STATUS_CHANGED',
      tenantId: tenant.id,
      details: `Changed cooperative status of "${tenant.organizationName}" to ${status}`
    });
    return tenant;
  }

  deleteTenant(id) {
    const numId = Number(id);
    if (numId === 1) {
      throw new Error('The primary cooperative tenant cannot be deleted.');
    }
    const idx = (this.platform.tenants || []).findIndex(t => t.id === numId);
    if (idx === -1) return false;

    const deletedName = this.platform.tenants[idx].organizationName || this.platform.tenants[idx].name;
    this.platform.tenants.splice(idx, 1);

    // Cascade remove cooperative's domains, staff users, billings, renewal requests, support grants & store file
    if (this.platform.domains) {
      this.platform.domains = this.platform.domains.filter(d => Number(d.tenantId) !== numId);
    }
    if (this.platform.users) {
      this.platform.users = this.platform.users.filter(u => Number(u.tenantId) !== numId);
    }
    if (this.platform.billings) {
      this.platform.billings = this.platform.billings.filter(b => Number(b.tenantId) !== numId);
    }
    if (this.platform.renewalRequests) {
      this.platform.renewalRequests = this.platform.renewalRequests.filter(r => Number(r.tenantId) !== numId);
    }
    if (this.platform.supportGrants) {
      this.platform.supportGrants = this.platform.supportGrants.filter(g => Number(g.tenantId) !== numId);
    }
    this.tenantCaches.delete(numId);
    const tenantFile = this.getTenantFilePath(numId);
    if (fs.existsSync(tenantFile)) {
      try { fs.unlinkSync(tenantFile); } catch (e) {}
    }

    this.logPlatformAction({
      action: 'TENANT_DELETED',
      tenantId: numId,
      details: `Permanently removed cooperative "${deletedName}" (#${numId}) and cleaned associated records`
    });
    return true;
  }

  getTenantProfile(id) {
    const tenant = this.getTenantById(id);
    if (!tenant) return null;
    const tData = this.getTenantData(tenant.id);

    const users = (this.platform.users || [])
      .filter(u => u.tenantId === tenant.id && !u.isDeleted)
      .map(({ passwordHash, ...safeUser }) => safeUser);
    const domains = (this.platform.domains || []).filter(d => d.tenantId === tenant.id);
    const plan = this.getPlanById(tenant.planId) || this.platform.plans?.[0];

    const directBillings = (this.platform.billings || [])
      .filter(b => b.tenantId === tenant.id && !b.isDeleted)
      .map(b => ({
        id: b.id,
        date: new Date(b.dateTimeUtms).toISOString().split('T')[0],
        amount: Number(b.amount) || 0,
        currency: 'Rs.',
        method: b.paymentMethod === 1 ? 'Cash' : 'Direct / Bank',
        transactionRef: b.transactionRef || `BIL-${b.id}`,
        invoiceNo: b.invoiceNo || `INV-SAAS-${b.id}`,
        billingPeriod: b.remarks || 'Annual License',
        status: 'PAID',
        notes: b.remarks || ''
      }));

    const approvedRenewals = (this.platform.renewalRequests || [])
      .filter(r => r.tenantId === tenant.id && r.status === 'APPROVED')
      .map(r => ({
        id: r.id,
        date: r.reviewedAt ? r.reviewedAt.split('T')[0] : (r.submittedAt ? r.submittedAt.split('T')[0] : '2026-01-01'),
        amount: Number(r.amount) || 0,
        currency: 'Rs.',
        method: r.method || 'FonePay QR',
        transactionRef: r.transactionRef || 'APPROVED_RENEWAL',
        invoiceNo: `INV-REN-${String(r.id).slice(-5).toUpperCase()}`,
        billingPeriod: `${r.planName || (plan ? plan.name : 'Subscription')} (${r.billingCycle || 'Yearly'})`,
        status: 'PAID',
        notes: r.notes || 'Approved cooperative renewal'
      }));

    const payments = [...directBillings, ...approvedRenewals].sort((a, b) => new Date(b.date) - new Date(a.date));
    const amountPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const billingCycle = tenant.subscription?.billingCycle || 'Yearly';
    const defaultPlanCost = billingCycle === 'Monthly'
      ? (Number(plan?.priceMonthly) || 3500)
      : (Number(plan?.priceYearly) || 35000);
    const totalAmountDue = tenant.subscription?.totalAmountDue !== undefined && tenant.subscription?.totalAmountDue !== null
      ? Number(tenant.subscription.totalAmountDue)
      : (tenant.subscriptionAmount !== undefined ? Number(tenant.subscriptionAmount) : defaultPlanCost);
    const remainingBalance = Math.max(0, totalAmountDue - amountPaid);
    const expiryDateUtms = tenant.expirationDateTimeUtms || Date.now() + 365 * 24 * 3600 * 1000;
    const daysRemaining = Math.ceil((expiryDateUtms - Date.now()) / (1000 * 60 * 60 * 24));

    return {
      tenant: {
        id: tenant.id,
        name: tenant.organizationName || tenant.name,
        slug: tenant.name,
        organizationName: tenant.organizationName,
        address: tenant.address,
        phone: tenant.phone,
        email: tenant.email,
        managerName: tenant.managerName,
        status: tenant.status || 'Active',
        country: 'Nepal',
        currency: 'Rs.',
        timeZone: tenant.timezone || 'Asia/Kathmandu',
        planId: tenant.planId || plan?.id || 'plan-professional',
        modules: tenant.modules || (plan ? plan.modules : {}),
        subscription: {
          planId: tenant.planId || plan?.id || 'plan-professional',
          planName: plan?.name || 'Cooperative Professional',
          status: tenant.status === 'Suspended' ? 'Suspended' : (daysRemaining < 0 ? 'Expired' : 'Active'),
          billingCycle,
          expiryDate: new Date(expiryDateUtms).toISOString(),
          daysRemaining,
          isExpired: daysRemaining < 0,
          totalAmountDue,
          amountPaid,
          remainingBalance,
          payments
        }
      },
      stats: {
        farmersCount: (tData?.customers || []).filter(c => !c.isDeleted && (c.customerType === 1 || c.customerType === 3)).length,
        collectionsCount: (tData?.milkCollections || []).filter(c => !c.isDeleted).length,
        productsCount: (tData?.products || []).filter(p => !p.isDeleted).length,
        ordersCount: (tData?.orders || []).filter(o => !o.isDeleted).length
      },
      users,
      domains,
      payments
    };
  }

  getTenantUsers(tenantId) {
    return (this.platform.users || [])
      .filter(u => u.tenantId === Number(tenantId) && !u.isDeleted)
      .map(({ passwordHash, ...safeUser }) => safeUser);
  }

  addUserToTenant(tenantId, data) {
    const nextUserId = (this.platform.users || []).length > 0
      ? Math.max(...this.platform.users.map(u => Number(u.id) || 0)) + 1
      : 1;

    const resolvedEmail = (data.email || `staff_${nextUserId}@dairy.local`).toLowerCase();
    const resolvedUsername = deriveUsername({ username: data.username, email: resolvedEmail, name: data.name });

    const newUser = {
      id: nextUserId,
      tenantId: Number(tenantId),
      username: resolvedUsername,
      name: data.name || 'Staff User',
      email: resolvedEmail,
      passwordHash: hashPassword(data.password || 'Staff@123'),
      roles: data.role ? [data.role] : ['User'],
      isActive: true,
      isDeleted: false,
      creationDateTimeUtms: Date.now()
    };

    this.platform.users.push(newUser);
    this.logPlatformAction({
      action: 'TENANT_USER_CREATED',
      tenantId: Number(tenantId),
      details: `Created staff user ${newUser.name} (@${newUser.username} / ${newUser.email}) with role ${newUser.roles.join(', ')}`
    });
    const { passwordHash, ...safeUser } = newUser;
    return safeUser;
  }

  updateTenantUser(tenantId, userId, data) {
    const user = (this.platform.users || []).find(u => u.id === Number(userId) && u.tenantId === Number(tenantId));
    if (!user) return null;

    if (data.name) user.name = data.name;
    if (data.email) user.email = data.email.toLowerCase();
    if (data.username) user.username = deriveUsername({ username: data.username, email: user.email, name: user.name });
    else if (!user.username) user.username = deriveUsername(user);
    if (data.role) user.roles = [data.role];
    if (data.password) user.passwordHash = hashPassword(data.password);
    if (data.isActive !== undefined) user.isActive = Boolean(data.isActive);

    this.logPlatformAction({
      action: 'TENANT_USER_UPDATED',
      tenantId: Number(tenantId),
      details: `Updated staff account ${user.name} (@${user.username}, #${userId})`
    });
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  removeUserFromTenant(tenantId, userId) {
    const user = (this.platform.users || []).find(u => u.id === Number(userId) && u.tenantId === Number(tenantId));
    if (!user) return false;
    user.isDeleted = true;
    this.logPlatformAction({
      action: 'TENANT_USER_REMOVED',
      tenantId: Number(tenantId),
      details: `Removed staff user ${user.name} (${user.email})`
    });
    return true;
  }

  getTenantPayments(tenantId) {
    return (this.platform.billings || []).filter(b => b.tenantId === Number(tenantId) && !b.isDeleted);
  }

  recordTenantPayment(tenantId, data) {
    const newBilling = {
      id: Date.now(),
      tenantId: Number(tenantId),
      amount: Number(data.amount) || 0,
      remarks: data.notes || data.billingPeriod || 'सदस्यता भुक्तानी',
      transactionRef: data.transactionRef || '',
      invoiceNo: data.invoiceNo || '',
      dateTimeUtms: data.date ? new Date(data.date).getTime() : Date.now(),
      paymentMethod: data.method === 'Cash' ? 1 : 2,
      isDeleted: false
    };

    if (!this.platform.billings) this.platform.billings = [];
    this.platform.billings.push(newBilling);
    this.logPlatformAction({
      action: 'TENANT_PAYMENT_RECORDED',
      tenantId: Number(tenantId),
      details: `Recorded Rs. ${newBilling.amount.toLocaleString()} license payment (${newBilling.remarks})`
    });
    return newBilling;
  }

  deleteTenantPayment(tenantId, paymentId) {
    const idx = (this.platform.billings || []).findIndex(b => b.id === Number(paymentId) && b.tenantId === Number(tenantId));
    if (idx === -1) return false;
    const amt = this.platform.billings[idx].amount;
    this.platform.billings[idx].isDeleted = true;
    this.logPlatformAction({
      action: 'TENANT_PAYMENT_DELETED',
      tenantId: Number(tenantId),
      details: `Deleted software payment record #${paymentId} (Rs. ${amt})`
    });
    return true;
  }

  extendSubscription(tenantId, data) {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return null;

    if (data.expiryDate) {
      tenant.expirationDateTimeUtms = new Date(data.expiryDate).getTime();
    } else {
      const months = Number(data.months) || (data.billingCycle === 'Monthly' ? 1 : 12);
      const currentExpiry = Math.max(Date.now(), tenant.expirationDateTimeUtms || Date.now());
      tenant.expirationDateTimeUtms = currentExpiry + (months * 30 * 86400000);
    }

    if (data.planId) tenant.planId = data.planId;
    if (data.status) tenant.status = data.status;
    else tenant.status = 'Active';

    const plan = this.getPlanById(tenant.planId);
    if (data.totalAmountDue !== undefined && data.totalAmountDue !== '') {
      tenant.subscriptionAmount = Number(data.totalAmountDue);
    }

    tenant.subscription = {
      ...(tenant.subscription || {}),
      planId: tenant.planId,
      planName: plan?.name || tenant.subscription?.planName || 'Cooperative Plan',
      billingCycle: data.billingCycle || tenant.subscription?.billingCycle || 'Yearly',
      status: tenant.status,
      expiryDate: new Date(tenant.expirationDateTimeUtms).toISOString(),
      ...(data.totalAmountDue !== undefined && data.totalAmountDue !== '' ? { totalAmountDue: Number(data.totalAmountDue) } : {})
    };

    if (data.amount && Number(data.amount) > 0) {
      this.recordTenantPayment(tenantId, {
        amount: Number(data.amount),
        notes: data.notes || `सफ्टवेयर नवीकरण - ${tenant.organizationName}`
      });
    }

    this.logPlatformAction({
      action: 'SUBSCRIPTION_EXTENDED',
      tenantId: tenant.id,
      details: `Updated license for "${tenant.organizationName}" (Plan: ${tenant.planId}, Expires: ${new Date(tenant.expirationDateTimeUtms).toISOString().split('T')[0]})`
    });
    return tenant;
  }

  toggleModule(tenantId, moduleName, enabled) {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return null;

    if (!tenant.modules) tenant.modules = {};
    const nextVal = enabled === undefined || enabled === null ? !Boolean(tenant.modules[moduleName]) : Boolean(enabled);
    tenant.modules[moduleName] = nextVal;
    this.logPlatformAction({
      action: 'MODULE_FLAG_TOGGLED',
      tenantId: tenant.id,
      details: `Set module "${moduleName}" to ${nextVal ? 'ENABLED' : 'DISABLED'} for "${tenant.organizationName}"`
    });
    return tenant;
  }

  getPlatformDomains() {
    return this.platform.domains || [];
  }

  addCustomDomain(tenantId, domainName, type = 'custom') {
    if (!this.platform.domains) this.platform.domains = [];
    const clean = String(domainName || '').trim().toLowerCase();
    if (!clean) throw new Error('Domain name is required');
    const existing = this.platform.domains.find(d => d.domain.toLowerCase() === clean);
    if (existing) throw new Error(`Domain "${clean}" is already mapped.`);

    const newDom = {
      id: `dom-${Date.now()}`,
      tenantId: Number(tenantId) || 1,
      domain: clean,
      type,
      verified: false,
      sslStatus: 'pending_dns',
      isPrimary: false
    };
    this.platform.domains.push(newDom);
    this.logPlatformAction({
      action: 'DOMAIN_ADDED',
      tenantId: newDom.tenantId,
      details: `Added ${type} domain ${clean} for tenant #${newDom.tenantId}`
    });
    return newDom;
  }

  verifyDomain(domainOrId) {
    if (!domainOrId) throw new Error('Domain ID or hostname is required');
    const domain = (this.platform.domains || []).find(
      d => d.id === domainOrId || d.domain === domainOrId
    );
    if (!domain) {
      throw new Error('Domain record not found');
    }
    domain.verified = true;
    domain.sslStatus = 'active';
    this.logPlatformAction({
      action: 'DOMAIN_VERIFIED',
      tenantId: domain.tenantId,
      details: `Verified DNS and provisioned SSL for ${domain.domain}`
    });
    return domain;
  }

  getAllRenewals(status) {
    let list = this.platform.renewalRequests || [];
    if (status && status !== 'all') {
      list = list.filter(r => r.status.toLowerCase() === status.toLowerCase());
    }
    return list;
  }

  approveRenewalRequest(id, user = null) {
    const renewal = (this.platform.renewalRequests || []).find(r => r.id === id);
    if (!renewal) throw new Error('Renewal request not found');

    renewal.status = 'APPROVED';
    renewal.reviewedAt = new Date().toISOString();
    renewal.reviewedBy = user?.name || 'Platform SuperAdmin';

    // Extend tenant expiration
    const tenant = this.getTenantById(renewal.tenantId);
    if (tenant) {
      const months = renewal.billingCycle === 'Monthly' ? 1 : 12;
      const currentExpiry = Math.max(Date.now(), tenant.expirationDateTimeUtms || Date.now());
      tenant.expirationDateTimeUtms = currentExpiry + (months * 30 * 86400000);
      tenant.status = 'Active';
      if (renewal.planId) tenant.planId = renewal.planId;
    }

    this.logPlatformAction({
      action: 'RENEWAL_APPROVED',
      tenantId: renewal.tenantId,
      userEmail: user?.email || 'admin@dairy.local',
      details: `Approved renewal ${renewal.id} (Rs. ${renewal.amount}) for "${renewal.tenantName}"`
    });
    return renewal;
  }

  rejectRenewalRequest(id, user = null, data = {}) {
    const renewal = (this.platform.renewalRequests || []).find(r => r.id === id);
    if (!renewal) throw new Error('Renewal request not found');

    renewal.status = 'REJECTED';
    renewal.reviewedAt = new Date().toISOString();
    renewal.reviewedBy = user?.name || 'Platform SuperAdmin';
    renewal.rejectionReason = data.reason || 'Payment verification failed';
    renewal.rejectionInstructions = data.instructions || 'Please re-upload a clear receipt voucher.';

    this.logPlatformAction({
      action: 'RENEWAL_REJECTED',
      tenantId: renewal.tenantId,
      status: 'WARNING',
      userEmail: user?.email || 'admin@dairy.local',
      details: `Rejected renewal ${renewal.id} for "${renewal.tenantName}": ${renewal.rejectionReason}`
    });
    return renewal;
  }

  getPaymentConfig() {
    return this.platform.paymentConfig || {};
  }

  updatePaymentConfig(data) {
    this.platform.paymentConfig = {
      ...(this.platform.paymentConfig || {}),
      ...data
    };
    this.logPlatformAction({
      action: 'PAYMENT_CONFIG_UPDATED',
      details: `Updated platform bank & FonePay gateway configuration`
    });
    return this.platform.paymentConfig;
  }

  getPlatformNotifications() {
    return this.platform.notifications || [];
  }

  markNotificationRead(id) {
    const notif = (this.platform.notifications || []).find(n => n.id === id);
    if (!notif) return false;
    notif.isRead = true;
    this.savePlatform();
    return true;
  }

  createSupportGrant(data) {
    const token = crypto.randomBytes(24).toString('hex');
    const grant = {
      id: `grant-${Date.now()}`,
      tenantId: data.tenantId,
      reason: data.reason || 'Support inspection',
      durationMinutes: Number(data.durationMinutes) || 60,
      token,
      expiresAt: new Date(Date.now() + (Number(data.durationMinutes) || 60) * 60000).toISOString(),
      createdAt: new Date().toISOString()
    };
    if (!this.platform.supportGrants) this.platform.supportGrants = [];
    this.platform.supportGrants.unshift(grant);
    this.logPlatformAction({
      action: 'SUPPORT_GRANT_AUTHORIZED',
      tenantId: Number(data.tenantId) || data.tenantId,
      details: `Authorized ${grant.durationMinutes}m audited support grant for Tenant #${data.tenantId}: ${grant.reason}`
    });
    return grant;
  }

  getCustomerHistory(tenantId, customerId) {
    const tid = Number(tenantId) || 1;
    const cid = Number(customerId);
    const tData = this.getTenantData(tid);
    const cust = (tData.customers || []).find(c => Number(c.id) === cid);
    if (!cust) return null;

    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
    const profile = this.calculateCustomerKPIs(cust, tData);

    const allCollections = (tData.milkCollections || []).filter(c => Number(c.farmerId) === cid);
    const milkCollections = allCollections
      .filter(c => !c.isDeleted)
      .sort((a, b) => (Number(b.dateTimeUtms) || 0) - (Number(a.dateTimeUtms) || 0));

    const allPayments = (tData.milkCollectionPayments || []).filter(p => Number(p.farmerId) === cid);
    const payments = allPayments
      .filter(p => !p.isDeleted)
      .sort((a, b) => (Number(b.dateTimeUtms) || 0) - (Number(a.dateTimeUtms) || 0));

    const allOrders = (tData.orders || []).filter(o => Number(o.customerId) === cid);
    const orders = allOrders
      .filter(o => !o.isDeleted)
      .sort((a, b) => (Number(b.orderDateTimeUtms || b.dateTimeUtms) || 0) - (Number(a.orderDateTimeUtms || a.dateTimeUtms) || 0));

    const allFutureOrders = (tData.futureOrders || []).filter(fo => Number(fo.customerId) === cid);
    const futureOrders = allFutureOrders
      .filter(fo => !fo.isDeleted)
      .sort((a, b) => (Number(b.creationDateTimeUtms || b.orderDateTimeUtms) || 0) - (Number(a.creationDateTimeUtms || a.orderDateTimeUtms) || 0));

    const customerPayments = (tData.customerPayments || [])
      .filter(cp => !cp.isDeleted && Number(cp.customerId) === cid)
      .sort((a, b) => (Number(b.dateTimeUtms) || 0) - (Number(a.dateTimeUtms) || 0));

    // Chronological running farmer milk ledger
    const ledgerItems = [
      ...milkCollections.map(c => ({
        id: `col-${c.id}`,
        entityId: c.id,
        type: 'delivery',
        dateTimeUtms: Number(c.dateTimeUtms) || 0,
        descriptionEn: `${Number(c.quantity || 0).toFixed(2)} L Milk (${Number(c.shift) === 0 ? 'Morning' : 'Evening'} · FAT ${Number(c.fat || 0).toFixed(1)}% / SNF ${Number(c.snf || 0).toFixed(1)}%)`,
        descriptionNe: `${Number(c.quantity || 0).toFixed(2)} लि. दूध (${Number(c.shift) === 0 ? 'बिहानी' : 'बेलुकी'} · FAT ${Number(c.fat || 0).toFixed(1)}% / SNF ${Number(c.snf || 0).toFixed(1)}%)`,
        debit: round2(c.totalPrice || (Number(c.quantity) * Number(c.rate))),
        credit: 0,
        reference: `#${c.id}`
      })),
      ...payments.map(p => ({
        id: `pay-${p.id}`,
        entityId: p.id,
        type: 'payment',
        dateTimeUtms: Number(p.dateTimeUtms) || 0,
        descriptionEn: `Payment Out (${p.referenceNumber || `PAY-${p.id}`})${p.remarks ? ` · ${p.remarks}` : ''}`,
        descriptionNe: `भुक्तानी (${p.referenceNumber || `PAY-${p.id}`})${p.remarks ? ` · ${p.remarks}` : ''}`,
        debit: 0,
        credit: round2(p.amount),
        reference: p.referenceNumber || `PAY-${p.id}`
      }))
    ].sort((a, b) => a.dateTimeUtms - b.dateTimeUtms);

    let running = 0;
    const ledgerWithBalance = ledgerItems.map(item => {
      running = round2(running + item.debit - item.credit);
      return { ...item, balanceAfter: running };
    }).reverse();

    // Match audit logs belonging to this farmer/customer
    const refSet = new Set();
    allCollections.forEach(c => {
      refSet.add(`#${c.id}`);
      refSet.add(String(c.id));
    });
    allPayments.forEach(p => {
      if (p.referenceNumber) refSet.add(String(p.referenceNumber).trim().toUpperCase());
      refSet.add(`#${p.id}`);
      refSet.add(String(p.id));
    });
    allOrders.forEach(o => {
      refSet.add(`#${o.id}`);
      refSet.add(`SALE-${o.id}`);
      if (o.billNumber) refSet.add(String(o.billNumber).trim().toUpperCase());
    });
    allFutureOrders.forEach(fo => {
      refSet.add(`FO-${fo.id}`);
      refSet.add(`#${fo.id}`);
    });
    customerPayments.forEach(cp => {
      if (cp.referenceNumber) refSet.add(String(cp.referenceNumber).trim().toUpperCase());
    });
    if (cust.code !== undefined && cust.code !== null && String(cust.code).trim() !== '') {
      refSet.add(`#${String(cust.code).trim()}`);
    }

    const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const codeRegex = (cust.code !== undefined && cust.code !== null && String(cust.code).trim() !== '')
      ? new RegExp(`(?:^|[^0-9a-zA-Z])#0*${esc(String(cust.code).trim())}(?!\\d)`)
      : null;
    const nameEn = (cust.nameInEnglish || '').trim().toLowerCase();
    const nameNe = (cust.nameInNepali || '').trim();

    const auditLogs = (tData.auditLogs || [])
      .filter(l => !l.isDeleted)
      .map(l => (l.username ? l : { ...l, username: deriveUsername({ email: l.userEmail, name: l.userName }) }))
      .filter(l => {
        const logFarmerId = l.farmerId !== undefined && l.farmerId !== null ? Number(l.farmerId) : null;
        const logCustomerId = l.customerId !== undefined && l.customerId !== null ? Number(l.customerId) : null;
        if (logFarmerId === cid || logCustomerId === cid) return true;
        if ((logFarmerId && logFarmerId !== cid) || (logCustomerId && logCustomerId !== cid)) {
          return false;
        }
        const ref = l.referenceId ? String(l.referenceId).trim() : '';
        if (ref && (refSet.has(ref) || refSet.has(ref.toUpperCase()))) return true;
        const details = String(l.details || '');
        const detailsLower = details.toLowerCase();
        if (codeRegex && codeRegex.test(details)) return true;
        if (nameEn.length >= 3 && detailsLower.includes(nameEn)) return true;
        if (nameNe.length >= 2 && details.includes(nameNe)) return true;
        return false;
      })
      .sort((a, b) => (Number(b.dateTimeUtms) || 0) - (Number(a.dateTimeUtms) || 0));

    // Attach recordedBy metadata by referenceId lookup where available
    const auditByRef = new Map();
    auditLogs.forEach(l => {
      if (l.referenceId && !auditByRef.has(String(l.referenceId))) {
        auditByRef.set(String(l.referenceId), l);
      }
    });

    const totalLiters = milkCollections.reduce((acc, c) => acc + (Number(c.quantity) || 0), 0);
    const weightedFat = totalLiters > 0
      ? round2(milkCollections.reduce((acc, c) => acc + (Number(c.fat) || 0) * (Number(c.quantity) || 0), 0) / totalLiters)
      : 0;
    const weightedSnf = totalLiters > 0
      ? round2(milkCollections.reduce((acc, c) => acc + (Number(c.snf) || 0) * (Number(c.quantity) || 0), 0) / totalLiters)
      : 0;

    return {
      profile,
      stats: {
        totalCollections: milkCollections.length,
        totalLiters: round2(totalLiters),
        avgFat: weightedFat,
        avgSnf: weightedSnf,
        totalPayments: payments.length,
        totalOrders: orders.length,
        totalFutureOrders: futureOrders.length,
        totalAuditActions: auditLogs.length
      },
      milkCollections: milkCollections.map(c => {
        const log = auditByRef.get(`#${c.id}`) || auditByRef.get(String(c.id));
        return log ? { ...c, recordedByUsername: log.username, recordedByName: log.userName } : c;
      }),
      payments: payments.map(p => {
        const log = (p.referenceNumber && auditByRef.get(String(p.referenceNumber))) || auditByRef.get(`#${p.id}`);
        return log ? { ...p, recordedByUsername: log.username, recordedByName: log.userName } : p;
      }),
      orders,
      futureOrders,
      customerPayments,
      ledger: ledgerWithBalance,
      auditLogs
    };
  }
}

export const multiTenantDb = new MultiTenantDatabase();
