import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { multiTenantDb } from './multiTenantDb.js';
import { authenticate, generateToken, resolveTenantId, hashPassword } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(authenticate);

// Request Logger
app.use((req, res, next) => {
  const tid = req.headers['x-tenant-id'] || 'default';
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} (Tenant: ${tid})`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

function deriveUserHandle(username, email, name) {
  if (username && String(username).trim()) {
    return String(username).trim().toLowerCase();
  }
  if (email && String(email).includes('@')) {
    return String(email).split('@')[0].trim().toLowerCase();
  }
  if (name && String(name).trim()) {
    return String(name).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '.').replace(/^\.+|\.+$/g, '') || 'user';
  }
  return 'admin';
}

// User Context Resolver
function resolveUser(req) {
  if (req.user && (req.user.name || req.user.username)) {
    const email = req.user.email || 'admin@dairy.local';
    const name = req.user.name || req.user.username;
    return {
      id: req.user.userId || req.user.id || 1,
      username: deriveUserHandle(req.user.username, email, name),
      name,
      email,
      roles: req.user.roles || ['Admin']
    };
  }
  if (req.headers['x-user-name'] || req.headers['x-username']) {
    const name = req.headers['x-user-name']
      ? decodeURIComponent(req.headers['x-user-name'])
      : decodeURIComponent(req.headers['x-username']);
    const email = req.headers['x-user-email'] || 'staff@dairy.local';
    const headerUsername = req.headers['x-username']
      ? decodeURIComponent(req.headers['x-username'])
      : undefined;
    return {
      id: Number(req.headers['x-user-id']) || 1,
      username: deriveUserHandle(headerUsername, email, name),
      name,
      email,
      roles: ['Admin']
    };
  }
  const defaultUser = multiTenantDb.platform?.users?.[0] || {
    id: 1,
    username: 'admin',
    name: 'System Admin',
    email: 'admin@dairy.local',
    roles: ['SuperAdmin']
  };
  return {
    ...defaultUser,
    username: deriveUserHandle(defaultUser.username, defaultUser.email, defaultUser.name)
  };
}

// Activity & Audit Log Helper
function recordActivity(req, { action, actionLabelNe, actionLabelEn, category, details, referenceId, farmerId, customerId, user: userOverride, tenantId: tenantOverride, dateTimeUtms }) {
  try {
    const tid = Number(tenantOverride) || resolveTenantId(req);
    const user = userOverride ? {
      id: userOverride.userId || userOverride.id || 1,
      username: deriveUserHandle(userOverride.username, userOverride.email, userOverride.name),
      name: userOverride.name || userOverride.username || 'User',
      email: userOverride.email || 'staff@dairy.local'
    } : resolveUser(req);

    return multiTenantDb.logActivity(tid, {
      userId: user.id,
      username: user.username,
      userName: user.name,
      userEmail: user.email,
      farmerId,
      customerId,
      action,
      actionLabelNe,
      actionLabelEn,
      category,
      details,
      referenceId,
      dateTimeUtms
    });
  } catch (err) {
    console.error('Failed to record activity log:', err);
    return null;
  }
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function resolveAccountType(paymentMethod) {
  if (typeof paymentMethod === 'string') {
    const m = paymentMethod.toLowerCase();
    if (
      m.includes('bank') ||
      m.includes('cheque') ||
      m.includes('check') ||
      m.includes('fonepay') ||
      m.includes('qr') ||
      m.includes('online') ||
      m.includes('card')
    ) {
      return 2;
    }
    if (m.includes('cash')) return 1;
  }
  const code = Number(paymentMethod);
  return (code === 1 || code === 2 || code === 3) ? 2 : 1;
}

function getPaymentMethodLabel(paymentMethod) {
  const code = Number(paymentMethod);
  if (code === 1) return 'Cheque / Bank';
  if (code === 2) return 'Bank Transfer / Fonepay';
  if (code === 3) return 'Online / QR / Credit';
  return 'Cash';
}

function syncRawMilkStock(tData, deltaQty, dateTimeUtms) {
  const delta = round2(deltaQty);
  if (!delta) return;
  const rawMilkProduct = (tData.products || []).find(
    p => !p.isDeleted && (p.id === 1 || (p.nameInEnglish || '').toLowerCase().includes('raw milk'))
  );
  if (!rawMilkProduct) return;

  if (!tData.productStocks) tData.productStocks = [];
  let rawStock = tData.productStocks.find(s => s.productId === rawMilkProduct.id);
  if (!rawStock) {
    rawStock = {
      id: Date.now() + 1,
      productId: rawMilkProduct.id,
      batchNumber: `COL-${new Date().toISOString().slice(0, 10)}`,
      quantity: 0,
      usedQuantity: 0,
      dateTimeUtms: dateTimeUtms || Date.now()
    };
    tData.productStocks.push(rawStock);
  }

  if (delta > 0) {
    rawStock.quantity = round2((Number(rawStock.quantity) || 0) + delta);
  } else {
    const reduction = Math.abs(delta);
    const availableInQty = Math.max(0, (Number(rawStock.quantity) || 0) - (Number(rawStock.usedQuantity) || 0));
    if ((Number(rawStock.quantity) || 0) - reduction >= (Number(rawStock.usedQuantity) || 0) || (Number(rawStock.quantity) || 0) >= reduction) {
      rawStock.quantity = round2(Math.max(0, (Number(rawStock.quantity) || 0) - reduction));
    } else if (availableInQty > 0) {
      rawStock.usedQuantity = round2((Number(rawStock.usedQuantity) || 0) + reduction);
    } else {
      rawStock.usedQuantity = round2((Number(rawStock.usedQuantity) || 0) + reduction);
    }
  }
}

// ============================================================================
// AUDIT LOG & USER ACTIVITY TRACKING APIS
// ============================================================================

// GET /api/AuditLog
app.get('/api/AuditLog', (req, res) => {
  const tid = resolveTenantId(req);
  const result = multiTenantDb.getAuditLogs(tid, req.query);
  res.json(result);
});

// GET /api/AuditLog/stats
app.get('/api/AuditLog/stats', (req, res) => {
  const tid = resolveTenantId(req);
  const stats = multiTenantDb.getAuditStats(tid);
  res.json(stats);
});

// POST /api/AuditLog (client event recording)
app.post('/api/AuditLog', (req, res) => {
  const log = recordActivity(req, req.body);
  res.status(201).json(log);
});

// ============================================================================
// 1. AUTHENTICATION & USER APIS
// ============================================================================

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, username, identifier: rawIdentifier, password, tenantSlug } = req.body;
  const identifier = (username || email || rawIdentifier || '').trim();
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const session = multiTenantDb.authenticate(identifier, password, tenantSlug);
  if (!session) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
  }

  recordActivity(req, {
    user: session.user,
    tenantId: req.headers['x-tenant-id'] ? resolveTenantId(req) : session.activeTenant?.id,
    action: 'USER_LOGIN',
    category: 'Security & Auth',
    actionLabelNe: 'प्रयोगकर्ता लगइन',
    actionLabelEn: 'User Logged In',
    details: `User ${session.user.name} (@${session.user.username}) logged in${session.user.email ? ` (${session.user.email})` : ''}`,
    referenceId: session.user.username || session.user.email
  });
  res.json(session);
});

// POST /user/password-login
app.post('/user/password-login', (req, res) => {
  const { email, username, identifier: rawIdentifier, password } = req.body;
  const session = multiTenantDb.authenticate(username || email || rawIdentifier, password);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  recordActivity(req, {
    user: session.user,
    tenantId: req.headers['x-tenant-id'] ? resolveTenantId(req) : session.activeTenant?.id,
    action: 'USER_LOGIN',
    category: 'Security & Auth',
    actionLabelNe: 'प्रयोगकर्ता लगइन',
    actionLabelEn: 'User Logged In',
    details: `User ${session.user.name} (@${session.user.username}) logged in${session.user.email ? ` (${session.user.email})` : ''}`,
    referenceId: session.user.username || session.user.email
  });
  res.json(session);
});

// GET /user/local-login (1-click quick login for dev/demo)
app.get('/user/local-login', (req, res) => {
  const email = (req.query.email || 'admin@dairy.local').trim();
  const session = multiTenantDb.authenticate(email, 'Admin@123') ||
                  multiTenantDb.authenticate(email, 'Manager@123') ||
                  multiTenantDb.authenticate(email, 'Staff@123');

  if (!session) {
    const rawIdentifier = email.toLowerCase();
    const raw = multiTenantDb.platform.users.find(u =>
      !u.isDeleted &&
      u.isActive !== false &&
      (
        (u.email || '').toLowerCase() === rawIdentifier ||
        (u.username || '').toLowerCase() === rawIdentifier ||
        (u.email || '').toLowerCase().split('@')[0] === rawIdentifier
      )
    );
    if (raw) {
      const tenant = multiTenantDb.platform.tenants.find(t => t.id === raw.tenantId) || multiTenantDb.platform.tenants[0];
      const resolvedUsername = deriveUserHandle(raw.username, raw.email, raw.name);
      const token = generateToken({ ...raw, username: resolvedUsername }, tenant.id);
      const safeUser = {
        id: raw.id,
        username: resolvedUsername,
        email: raw.email,
        name: raw.name,
        roles: raw.roles,
        tenantId: tenant.id,
        tenantName: tenant.name,
        organizationName: tenant.organizationName
      };
      recordActivity(req, {
        user: safeUser,
        tenantId: req.headers['x-tenant-id'] ? resolveTenantId(req) : tenant.id,
        action: 'USER_LOGIN',
        category: 'Security & Auth',
        actionLabelNe: 'प्रयोगकर्ता स्विच / लगइन',
        actionLabelEn: 'User Session Switched',
        details: `Session switched to ${safeUser.name} (@${safeUser.username}, ${safeUser.roles?.join(', ') || 'Staff'})`,
        referenceId: safeUser.username || safeUser.email
      });
      return res.json({
        success: true,
        token,
        user: safeUser,
        activeTenant: tenant
      });
    }
    return res.status(404).json({ error: 'User not found' });
  }
  recordActivity(req, {
    user: session.user,
    tenantId: req.headers['x-tenant-id'] ? resolveTenantId(req) : session.activeTenant?.id,
    action: 'USER_LOGIN',
    category: 'Security & Auth',
    actionLabelNe: 'प्रयोगकर्ता स्विच / लगइन',
    actionLabelEn: 'User Session Switched',
    details: `Session switched to ${session.user.name} (@${session.user.username}, ${session.user.roles?.join(', ') || 'Staff'})`,
    referenceId: session.user.username || session.user.email
  });
  res.json(session);
});

// GET /user (Current authenticated user info)
app.get('/user', (req, res) => {
  const tid = resolveTenantId(req);
  const tenant = multiTenantDb.platform.tenants.find(t => t.id === tid) || multiTenantDb.platform.tenants[0];

  if (req.user) {
    return res.json({
      isAuthenticated: true,
      id: req.user.userId,
      username: deriveUserHandle(req.user.username, req.user.email, req.user.name),
      name: req.user.name,
      email: req.user.email,
      roles: req.user.roles || ['User'],
      tenantId: tenant.id,
      tenantName: tenant.name,
      organizationName: tenant.organizationName,
      subscriptionExpirationDateTime: tenant.expirationDateTimeUtms
    });
  }

  // Default guest/operator session if not logged in
  const defaultUser = multiTenantDb.platform.users[0];
  res.json({
    isAuthenticated: true,
    id: defaultUser.id,
    username: deriveUserHandle(defaultUser.username, defaultUser.email, defaultUser.name),
    name: defaultUser.name,
    email: defaultUser.email,
    roles: defaultUser.roles,
    tenantId: tenant.id,
    tenantName: tenant.name,
    organizationName: tenant.organizationName,
    subscriptionExpirationDateTime: tenant.expirationDateTimeUtms
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  const activeUser = resolveUser(req);
  recordActivity(req, {
    user: activeUser,
    action: 'USER_LOGOUT',
    category: 'Security & Auth',
    actionLabelNe: 'प्रयोगकर्ता लगआउट',
    actionLabelEn: 'User Logged Out',
    details: `User ${activeUser.name} (@${activeUser.username}) logged out (${activeUser.email})`,
    referenceId: activeUser.username || activeUser.email
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// ============================================================================
// 2. CUSTOMERS (FARMERS & BUYERS) APIS
// ============================================================================

// GET /api/Customer
app.get('/api/Customer', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  let list = tData.customers.filter(c => !c.isDeleted);

  const { customerTypes, filter, maxResultCount = 50, skipCount = 0 } = req.query;

  if (customerTypes) {
    const types = Array.isArray(customerTypes)
      ? customerTypes.map(Number)
      : [Number(customerTypes)];
    list = list.filter(c => types.includes(c.customerType));
  }

  if (filter) {
    const q = filter.trim().toLowerCase();
    list = list.filter(c =>
      (c.nameInNepali && c.nameInNepali.toLowerCase().includes(q)) ||
      (c.nameInEnglish && c.nameInEnglish.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.code && String(c.code) === q) ||
      (c.accountNumber && c.accountNumber.toLowerCase().includes(q))
    );
  }

  const enrichedList = list.map(c => multiTenantDb.calculateCustomerKPIs(c, tData));
  const totalCount = enrichedList.length;
  const items = enrichedList.slice(Number(skipCount), Number(skipCount) + Number(maxResultCount));

  res.json({ totalCount, items });
});

// GET /api/Customer/withLastProductQualityInfo
app.get('/api/Customer/withLastProductQualityInfo', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const code = req.query.code !== undefined && req.query.code !== '' ? Number(req.query.code) : null;
  const custId = (req.query.customerId || req.query.farmerId || req.query.id) ? Number(req.query.customerId || req.query.farmerId || req.query.id) : null;
  const beforeStartUtms = req.query.beforeStartUtms !== undefined && req.query.beforeStartUtms !== ''
    ? Number(req.query.beforeStartUtms)
    : null;

  const cust = tData.customers.find(c => {
    if (c.isDeleted) return false;
    if (code !== null && (Number(c.code) === code || String(c.code) === String(req.query.code))) return true;
    if (custId !== null && (Number(c.id) === custId)) return true;
    return false;
  });

  if (!cust) return res.status(404).json({ error: 'Customer not found' });

  const farmerColls = tData.milkCollections
    .filter(c => !c.isDeleted && (Number(c.farmerId) === cust.id || Number(c.customerId) === cust.id))
    .sort((a, b) => Number(b.dateTimeUtms) - Number(a.dateTimeUtms));

  const latestOverall = farmerColls[0] || null;
  const prevDateColl = Number.isFinite(beforeStartUtms)
    ? (farmerColls.find(c => Number(c.dateTimeUtms) < beforeStartUtms) || null)
    : latestOverall;

  if (prevDateColl) {
    const d = new Date(prevDateColl.dateTimeUtms);
    const pad = (n) => String(n).padStart(2, '0');
    const lastDateTimeLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    res.json({
      hasLastEntry: true,
      hasPreviousDateEntry: true,
      customer: multiTenantDb.calculateCustomerKPIs(cust, tData),
      lastFat: prevDateColl.fat !== undefined ? Number(prevDateColl.fat) : 4.5,
      lastSnf: prevDateColl.snf !== undefined ? Number(prevDateColl.snf) : 8.2,
      lastQuantity: prevDateColl.quantity !== undefined ? Number(prevDateColl.quantity) : 0,
      lastRate: prevDateColl.rate !== undefined ? Number(prevDateColl.rate) : 66.55,
      lastTotalPrice: prevDateColl.totalPrice !== undefined ? Number(prevDateColl.totalPrice) : 0,
      lastShift: prevDateColl.shift !== undefined ? Number(prevDateColl.shift) : 0,
      lastDateTimeUtms: prevDateColl.dateTimeUtms,
      lastDateTimeLocal,
      lastEntry: prevDateColl,
      previousDateEntry: prevDateColl,
      latestOverallEntry: latestOverall
    });
  } else {
    res.json({
      hasLastEntry: false,
      hasPreviousDateEntry: false,
      customer: multiTenantDb.calculateCustomerKPIs(cust, tData),
      lastFat: null,
      lastSnf: null,
      lastQuantity: 0,
      lastRate: 0,
      lastTotalPrice: 0,
      lastShift: new Date().getHours() < 12 ? 0 : 1,
      lastDateTimeUtms: null,
      lastDateTimeLocal: null,
      lastEntry: null,
      previousDateEntry: null,
      latestOverallEntry: latestOverall
    });
  }
});

// GET /api/Customer/code/:code
app.get('/api/Customer/code/:code', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const target = String(req.params.code).trim().toLowerCase();
  const cust = tData.customers.find(c => {
    if (c.isDeleted) return false;
    const cCode = String(c.code ?? c.id ?? '').trim().toLowerCase();
    if (cCode === target) return true;
    const numMatch = cCode.match(/(\d+)$/);
    if (numMatch && (numMatch[1] === target || String(parseInt(numMatch[1], 10)) === target)) return true;
    return false;
  });
  if (!cust) return res.status(404).json({ error: 'Customer not found with code ' + req.params.code });
  res.json(multiTenantDb.calculateCustomerKPIs(cust, tData));
});

// GET /api/Customer/:customerId
app.get('/api/Customer/:customerId', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const cust = tData.customers.find(c => c.id === Number(req.params.customerId) && !c.isDeleted);
  if (!cust) return res.status(404).json({ error: 'Customer not found' });
  res.json(multiTenantDb.calculateCustomerKPIs(cust, tData));
});

// GET /api/Customer/:customerId/history
app.get('/api/Customer/:customerId/history', (req, res) => {
  const tid = resolveTenantId(req);
  const history = multiTenantDb.getCustomerHistory(tid, req.params.customerId);
  if (!history) return res.status(404).json({ error: 'Farmer / Customer not found' });
  res.json(history);
});

// POST /api/Customer
app.post('/api/Customer', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);

  let finalCode = '';
  if (req.body.code !== undefined && req.body.code !== null && String(req.body.code).trim() !== '') {
    finalCode = String(req.body.code).trim().toUpperCase();
  } else {
    finalCode = multiTenantDb.getNextCustomerCode(tid);
  }

  const rawPhone = String(req.body.phone || '').trim();
  const cleanPhone = rawPhone.replace(/\D/g, '').slice(0, 10);
  if (rawPhone && cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Phone number must be exactly 10 digits without letters, spaces, or special characters.' });
  }

  const newCustomer = {
    id: Date.now(),
    code: finalCode,
    nameInNepali: req.body.nameInNepali || '',
    nameInEnglish: req.body.nameInEnglish || '',
    customerType: Number(req.body.customerType) || 1,
    phone: cleanPhone,
    address: req.body.address || '',
    provinceId: req.body.provinceId || '',
    provinceName: req.body.provinceName || '',
    districtId: req.body.districtId || '',
    districtName: req.body.districtName || '',
    municipalityId: req.body.municipalityId || '',
    municipalityName: req.body.municipalityName || '',
    ward: req.body.ward || '',
    accountNumber: req.body.accountNumber || '',
    remarks: req.body.remarks || '',
    isDeleted: false,
    creationDateTimeUtms: Date.now()
  };

  tData.customers.push(newCustomer);
  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    customerId: newCustomer.id,
    action: 'REGISTER_CUSTOMER',
    category: 'Accounts & Directory',
    actionLabelNe: 'नयाँ खाता दर्ता',
    actionLabelEn: 'Registered Account',
    details: `Registered account #${newCustomer.code} (${newCustomer.customerType === 1 ? 'Farmer' : 'Wholesale Customer'}) ${newCustomer.nameInEnglish || newCustomer.nameInNepali || 'Account'} (${newCustomer.phone || '-'})`,
    referenceId: `#${newCustomer.code}`
  });
  res.status(201).json(newCustomer);
});

// PUT /api/Customer/:customerId
app.put('/api/Customer/:customerId', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const idx = tData.customers.findIndex(c => c.id === Number(req.params.customerId));
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });

  const updateData = { ...req.body };
  if (updateData.phone !== undefined) {
    const rawPhone = String(updateData.phone || '').trim();
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(0, 10);
    if (rawPhone && cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits without letters, spaces, or special characters.' });
    }
    updateData.phone = cleanPhone;
  }

  tData.customers[idx] = {
    ...tData.customers[idx],
    ...updateData,
    id: Number(req.params.customerId),
    lastUpdatedDateTimeUtms: Date.now()
  };
  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    customerId: tData.customers[idx].id,
    action: 'UPDATE_CUSTOMER',
    category: 'Accounts & Directory',
    actionLabelNe: 'खाता अद्यावधिक',
    actionLabelEn: 'Updated Account',
    details: `Updated details for account #${tData.customers[idx].code} ${tData.customers[idx].nameInEnglish || tData.customers[idx].nameInNepali}`,
    referenceId: `#${tData.customers[idx].code}`
  });
  res.json(tData.customers[idx]);
});

// DELETE /api/Customer/:customerId
app.delete('/api/Customer/:customerId', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const cust = tData.customers.find(c => c.id === Number(req.params.customerId));
  if (!cust) return res.status(404).json({ error: 'Customer not found' });

  cust.isDeleted = true;
  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'DELETE_CUSTOMER',
    category: 'Accounts & Directory',
    actionLabelNe: 'खाता खारेज / मेटाएको',
    actionLabelEn: 'Deleted Account',
    details: `Deactivated account #${cust.code} ${cust.nameInEnglish || cust.nameInNepali}`,
    referenceId: `#${cust.code}`
  });
  res.json({ success: true });
});

// ============================================================================
// 3. MILK COLLECTION APIS
// ============================================================================

const getCollectionActivityTs = (c) => Number(
  c?.updatedAtUtms ||
  c?.createdAtUtms ||
  (Number(c?.id) > 1000000000000 ? Number(c.id) : 0) ||
  c?.dateTimeUtms ||
  0
);

const nextCollectionActivityTs = (list = []) => {
  const now = Date.now();
  const maxExisting = list.reduce((max, item) => {
    const ts = Math.max(Number(item?.updatedAtUtms) || 0, Number(item?.createdAtUtms) || 0, Number(item?.id) > 1000000000000 ? Number(item.id) : 0);
    return ts > max ? ts : max;
  }, 0);
  return now > maxExisting ? now : maxExisting + 1;
};

// GET /api/MilkCollection
app.get('/api/MilkCollection', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  let list = tData.milkCollections.filter(c => !c.isDeleted);

  const { customerId, shift, startDateUtms, endDateUtms, filter, sortBy = 'recent', maxResultCount = 50, skipCount = 0 } = req.query;

  if (customerId) {
    list = list.filter(c => c.farmerId === Number(customerId));
  }
  if (shift !== undefined && shift !== null && shift !== '') {
    list = list.filter(c => c.shift === Number(shift));
  }
  if (startDateUtms) {
    list = list.filter(c => c.dateTimeUtms >= Number(startDateUtms));
  }
  if (endDateUtms) {
    list = list.filter(c => c.dateTimeUtms <= Number(endDateUtms));
  }
  if (filter) {
    const q = filter.trim().toLowerCase();
    list = list.filter(c => {
      const farmer = tData.customers.find(f => f.id === c.farmerId);
      return farmer && (
        (farmer.nameInNepali && farmer.nameInNepali.toLowerCase().includes(q)) ||
        (farmer.nameInEnglish && farmer.nameInEnglish.toLowerCase().includes(q)) ||
        String(farmer.code) === q
      );
    });
  }

  // Sort descending by recent activity by default, or by collection date if requested
  if (sortBy === 'date_asc') {
    list.sort((a, b) =>
      ((Number(a.dateTimeUtms) || 0) - (Number(b.dateTimeUtms) || 0)) ||
      (getCollectionActivityTs(a) - getCollectionActivityTs(b)) ||
      (Number(a.id) - Number(b.id))
    );
  } else if (sortBy === 'date_desc') {
    list.sort((a, b) =>
      ((Number(b.dateTimeUtms) || 0) - (Number(a.dateTimeUtms) || 0)) ||
      (getCollectionActivityTs(b) - getCollectionActivityTs(a)) ||
      (Number(b.id) - Number(a.id))
    );
  } else {
    list.sort((a, b) =>
      (getCollectionActivityTs(b) - getCollectionActivityTs(a)) ||
      ((Number(b.dateTimeUtms) || 0) - (Number(a.dateTimeUtms) || 0)) ||
      (Number(b.id) - Number(a.id))
    );
  }

  // Attach farmer object
  const items = list
    .slice(Number(skipCount), Number(skipCount) + Number(maxResultCount))
    .map(c => {
      const farmer = tData.customers.find(f => f.id === c.farmerId) || {};
      return {
        ...c,
        farmer: {
          id: farmer.id,
          code: farmer.code,
          nameInNepali: farmer.nameInNepali,
          nameInEnglish: farmer.nameInEnglish,
          phone: farmer.phone
        }
      };
    });

  res.json({ totalCount: list.length, items });
});

// GET /api/MilkCollection/Report (defined before /:milkCollectionId so it is not shadowed)
app.get('/api/MilkCollection/Report', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  let list = tData.milkCollections.filter(c => !c.isDeleted);

  const { startDateUtms, endDateUtms } = req.query;
  if (startDateUtms) list = list.filter(c => c.dateTimeUtms >= Number(startDateUtms));
  if (endDateUtms) list = list.filter(c => c.dateTimeUtms <= Number(endDateUtms));

  const totalQuantity = round2(list.reduce((acc, c) => acc + (Number(c.quantity) || 0), 0));
  const totalAmount = round2(list.reduce((acc, c) => acc + (Number(c.totalPrice) || 0), 0));
  // Volume-weighted average FAT and SNF
  const weightedFatSum = list.reduce((acc, c) => acc + (Number(c.fat) || 0) * (Number(c.quantity) || 0), 0);
  const weightedSnfSum = list.reduce((acc, c) => acc + (Number(c.snf) || 0) * (Number(c.quantity) || 0), 0);
  const avgFat = totalQuantity > 0 ? round2(weightedFatSum / totalQuantity) : 0;
  const avgSnf = totalQuantity > 0 ? round2(weightedSnfSum / totalQuantity) : 0;

  res.json({
    totalCount: list.length,
    items: list.map(c => {
      const farmer = tData.customers.find(f => f.id === c.farmerId) || {};
      return {
        ...c,
        farmerName: farmer.nameInNepali || farmer.nameInEnglish,
        farmerCode: farmer.code
      };
    }),
    summary: {
      totalQuantity,
      totalAmount,
      avgFat,
      avgSnf
    }
  });
});

// GET /api/MilkCollection/slip (defined before /:milkCollectionId so it is not shadowed)
app.get('/api/MilkCollection/slip', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const collId = Number(req.query.milkCollectionId);
  const coll = tData.milkCollections.find(c => c.id === collId && !c.isDeleted);
  if (!coll) return res.status(404).json({ error: 'Collection not found' });

  const farmer = tData.customers.find(f => f.id === coll.farmerId) || {};
  const tenant = multiTenantDb.platform.tenants.find(t => t.id === tid) || multiTenantDb.platform.tenants[0];

  res.json({
    milkCollection: {
      ...coll,
      farmer
    },
    tenant: {
      name: tenant.organizationName || tenant.name,
      address: tenant.address
    }
  });
});

// GET /api/MilkCollection/:id
app.get('/api/MilkCollection/:milkCollectionId', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const item = tData.milkCollections.find(c => c.id === Number(req.params.milkCollectionId) && !c.isDeleted);
  if (!item) return res.status(404).json({ error: 'Milk collection not found' });

  const farmer = tData.customers.find(f => f.id === item.farmerId) || {};
  res.json({
    ...item,
    farmer: {
      id: farmer.id,
      code: farmer.code,
      nameInNepali: farmer.nameInNepali,
      nameInEnglish: farmer.nameInEnglish,
      phone: farmer.phone
    }
  });
});

// POST /api/MilkCollection
app.post('/api/MilkCollection', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);

  const custId = req.body.customerId !== undefined ? req.body.customerId : (req.body.farmerId !== undefined ? req.body.farmerId : req.body.FarmerId);
  const rawQty = req.body.Quantity !== undefined ? req.body.Quantity : (req.body.quantity !== undefined ? req.body.quantity : 0);
  const rawFat = req.body.Fat !== undefined ? req.body.Fat : (req.body.fat !== undefined ? req.body.fat : 0);
  const rawSnf = req.body.Snf !== undefined ? req.body.Snf : (req.body.snf !== undefined ? req.body.snf : 0);
  const rawFatRate = req.body.FatRate !== undefined ? req.body.FatRate : (req.body.fatRate !== undefined ? req.body.fatRate : 0);
  const rawSnfRate = req.body.SnfRate !== undefined ? req.body.SnfRate : (req.body.snfRate !== undefined ? req.body.snfRate : 0);
  const rawRate = req.body.Rate !== undefined ? req.body.Rate : (req.body.rate !== undefined ? req.body.rate : 0);
  const rawShift = req.body.Shift !== undefined ? req.body.Shift : (req.body.shift !== undefined ? req.body.shift : 0);
  const shiftVal = (typeof rawShift === 'string' && rawShift.toLowerCase().includes('eve')) ? 1 : (Number(rawShift) || 0);
  const DateTimeUtms = req.body.DateTimeUtms || req.body.dateTimeUtms || (req.body.dateTimeLocal ? new Date(req.body.dateTimeLocal).getTime() : Date.now());

  const quantity = Number(rawQty);
  const fat = Number(rawFat) || 0;
  const snf = Number(rawSnf) || 0;

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'Milk quantity must be greater than zero' });
  }
  if (fat < 0 || snf < 0 || Number(rawFatRate) < 0 || Number(rawSnfRate) < 0 || Number(rawRate) < 0) {
    return res.status(400).json({ error: 'FAT, SNF, and rates cannot be negative' });
  }

  const config = tData.milkFatSnfConfig || {};
  const effectiveFatRate = Number(rawFatRate) > 0 ? Number(rawFatRate) : Number(config.buyingFatPrice || 7.5);
  const effectiveSnfRate = Number(rawSnfRate) > 0 ? Number(rawSnfRate) : Number(config.buyingSnfPrice || 4.0);

  let calculatedRate = Number(rawRate) || 0;
  if (Number(rawFatRate) > 0 && Number(rawSnfRate) > 0) {
    calculatedRate = (effectiveFatRate * fat) + (effectiveSnfRate * snf);
  } else if (!calculatedRate) {
    calculatedRate = (effectiveFatRate * fat) + (effectiveSnfRate * snf);
  }
  calculatedRate = round2(calculatedRate);

  const totalPrice = round2(
    req.body.totalPrice !== undefined && Number(req.body.totalPrice) > 0
      ? Number(req.body.totalPrice)
      : calculatedRate * quantity
  );

  const activityTs = nextCollectionActivityTs(tData.milkCollections);
  const newCollection = {
    id: activityTs,
    farmerId: Number(custId),
    quantity: round2(quantity),
    shift: shiftVal,
    fat: round2(fat),
    snf: round2(snf),
    fatRate: round2(effectiveFatRate),
    snfRate: round2(effectiveSnfRate),
    rate: calculatedRate,
    totalPrice,
    dateTimeUtms: Number(DateTimeUtms) || activityTs,
    createdAtUtms: activityTs,
    updatedAtUtms: activityTs,
    isDeleted: false
  };

  tData.milkCollections.push(newCollection);
  syncRawMilkStock(tData, newCollection.quantity, newCollection.dateTimeUtms);

  multiTenantDb.saveTenantData(tid, tData);
  const farmer = tData.customers.find(f => f.id === newCollection.farmerId) || {};
  recordActivity(req, {
    farmerId: newCollection.farmerId,
    customerId: newCollection.farmerId,
    action: 'RECORD_MILK_COLLECTION',
    category: 'Milk Collection',
    actionLabelNe: 'दूध संकलन प्रविष्टि',
    actionLabelEn: 'Recorded Milk Intake',
    details: `Recorded ${newCollection.quantity} L (${newCollection.shift === 0 ? 'Morning' : 'Evening'}) milk from Farmer #${farmer.code || newCollection.farmerId} ${farmer.nameInEnglish || farmer.nameInNepali || 'Farmer'} at रू ${newCollection.rate}/L (Total: रू ${newCollection.totalPrice})`,
    referenceId: `#${newCollection.id}`
  });
  res.status(201).json(newCollection.id);
});

// PUT /api/MilkCollection/:milkCollectionId
app.put('/api/MilkCollection/:milkCollectionId', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const idx = tData.milkCollections.findIndex(c => c.id === Number(req.params.milkCollectionId) && !c.isDeleted);
  if (idx === -1) return res.status(404).json({ error: 'Milk collection record not found' });

  const existing = tData.milkCollections[idx];
  const { customerId, Quantity, Fat, Snf, FatRate, SnfRate, Shift, DateTimeUtms } = req.body;

  const fat = Fat !== undefined ? Number(Fat) : existing.fat;
  const snf = Snf !== undefined ? Number(Snf) : existing.snf;
  const fatRate = FatRate !== undefined ? Number(FatRate) : existing.fatRate;
  const snfRate = SnfRate !== undefined ? Number(SnfRate) : existing.snfRate;
  const quantity = Quantity !== undefined ? Number(Quantity) : existing.quantity;

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'Milk quantity must be greater than zero' });
  }
  if (fat < 0 || snf < 0 || fatRate < 0 || snfRate < 0) {
    return res.status(400).json({ error: 'FAT, SNF, and rates cannot be negative' });
  }

  const rate = round2((fatRate * fat) + (snfRate * snf));
  const totalPrice = round2(rate * quantity);
  const qtyDelta = round2(quantity - (Number(existing.quantity) || 0));

  const activityTs = nextCollectionActivityTs(tData.milkCollections);
  tData.milkCollections[idx] = {
    ...existing,
    farmerId: customerId ? Number(customerId) : existing.farmerId,
    quantity: round2(quantity),
    shift: Shift !== undefined ? Number(Shift) : existing.shift,
    fat: round2(fat),
    snf: round2(snf),
    fatRate: round2(fatRate),
    snfRate: round2(snfRate),
    rate,
    totalPrice,
    dateTimeUtms: DateTimeUtms ? Number(DateTimeUtms) : existing.dateTimeUtms,
    createdAtUtms: existing.createdAtUtms || (Number(existing.id) > 1000000000000 ? Number(existing.id) : existing.dateTimeUtms),
    updatedAtUtms: activityTs
  };

  if (qtyDelta !== 0) {
    syncRawMilkStock(tData, qtyDelta, tData.milkCollections[idx].dateTimeUtms);
  }

  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    farmerId: tData.milkCollections[idx].farmerId,
    customerId: tData.milkCollections[idx].farmerId,
    action: 'UPDATE_MILK_COLLECTION',
    category: 'Milk Collection',
    actionLabelNe: 'दूध संकलन सम्पादन',
    actionLabelEn: 'Updated Milk Collection',
    details: `Updated milk collection #${req.params.milkCollectionId} to ${quantity}L at रू ${rate.toFixed(2)}/L (Total: रू ${totalPrice.toFixed(2)})`,
    referenceId: `#${req.params.milkCollectionId}`
  });
  res.json(tData.milkCollections[idx]);
});

// DELETE /api/MilkCollection/:milkCollectionId
app.delete('/api/MilkCollection/:milkCollectionId', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const coll = tData.milkCollections.find(c => c.id === Number(req.params.milkCollectionId));
  if (!coll) return res.status(404).json({ error: 'Record not found' });

  if (!coll.isDeleted) {
    coll.isDeleted = true;
    syncRawMilkStock(tData, -(Number(coll.quantity) || 0));
    multiTenantDb.saveTenantData(tid, tData);
    const farmer = tData.customers.find(f => f.id === coll.farmerId) || {};
    recordActivity(req, {
      action: 'DELETE_MILK_COLLECTION',
      category: 'Milk Collection',
      actionLabelNe: 'दूध संकलन रद्द',
      actionLabelEn: 'Deleted Milk Collection',
      details: `Deleted milk collection #${coll.id} of ${coll.quantity}L for Farmer #${farmer.code || coll.farmerId} ${farmer.nameInEnglish || farmer.nameInNepali || 'Farmer'}`,
      referenceId: `#${coll.id}`
    });
  }
  res.json({ success: true });
});

// ============================================================================
// 4. FAT & SNF CONFIGURATION APIS
// ============================================================================

// GET /api/MilkFatAndSnfConfiguration
app.get('/api/MilkFatAndSnfConfiguration', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  res.json(tData.milkFatSnfConfig || {
    id: 1,
    buyingFatPrice: 7.50,
    buyingSnfPrice: 4.00,
    sellingFatPrice: 9.00,
    sellingSnfPrice: 5.00,
    sellingPrice: 90.00
  });
});

// POST & PUT /api/MilkFatAndSnfConfiguration
app.post('/api/MilkFatAndSnfConfiguration', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const rateFields = ['buyingFatPrice', 'buyingSnfPrice', 'sellingFatPrice', 'sellingSnfPrice', 'sellingPrice'];
  for (const field of rateFields) {
    if (req.body[field] !== undefined && Number(req.body[field]) < 0) {
      return res.status(400).json({ error: `${field} cannot be negative` });
    }
  }
  tData.milkFatSnfConfig = {
    ...tData.milkFatSnfConfig,
    ...req.body,
    lastTimeUpdatedUtms: Date.now()
  };
  multiTenantDb.saveTenantData(tid, tData);
  const cfg = tData.milkFatSnfConfig;
  recordActivity(req, {
    action: 'UPDATE_FAT_SNF_CONFIG',
    category: 'System Configuration',
    actionLabelNe: 'फ्याट/एसएनएफ दर अद्यावधिक',
    actionLabelEn: 'Updated FAT/SNF Pricing Rates',
    details: `Updated milk pricing rates: Buy FAT रू ${cfg.buyingFatPrice}, Buy SNF रू ${cfg.buyingSnfPrice}, Sell FAT रू ${cfg.sellingFatPrice}, Sell SNF रू ${cfg.sellingSnfPrice}`,
    referenceId: 'FAT-SNF-CONFIG'
  });
  res.json(tData.milkFatSnfConfig);
});

app.put('/api/MilkFatAndSnfConfiguration/:id', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const rateFields = ['buyingFatPrice', 'buyingSnfPrice', 'sellingFatPrice', 'sellingSnfPrice', 'sellingPrice'];
  for (const field of rateFields) {
    if (req.body[field] !== undefined && Number(req.body[field]) < 0) {
      return res.status(400).json({ error: `${field} cannot be negative` });
    }
  }
  tData.milkFatSnfConfig = {
    ...tData.milkFatSnfConfig,
    ...req.body,
    lastTimeUpdatedUtms: Date.now()
  };
  multiTenantDb.saveTenantData(tid, tData);
  const cfg = tData.milkFatSnfConfig;
  recordActivity(req, {
    action: 'UPDATE_FAT_SNF_CONFIG',
    category: 'System Configuration',
    actionLabelNe: 'फ्याट/एसएनएफ दर अद्यावधिक',
    actionLabelEn: 'Updated FAT/SNF Pricing Rates',
    details: `Updated milk pricing rates: Buy FAT रू ${cfg.buyingFatPrice}, Buy SNF रू ${cfg.buyingSnfPrice}, Sell FAT रू ${cfg.sellingFatPrice}, Sell SNF रू ${cfg.sellingSnfPrice}`,
    referenceId: 'FAT-SNF-CONFIG'
  });
  res.json(tData.milkFatSnfConfig);
});

// ============================================================================
// 5. FARMER PAYMENTS (MILK COLLECTION PAYMENTS) APIS
// ============================================================================

// GET /api/MilkCollectionPayment
app.get('/api/MilkCollectionPayment', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  let list = tData.milkCollectionPayments.filter(p => !p.isDeleted);

  const { farmerId, maxResultCount = 50, skipCount = 0 } = req.query;
  if (farmerId) list = list.filter(p => p.farmerId === Number(farmerId));

  list.sort((a, b) => b.dateTimeUtms - a.dateTimeUtms);

  const items = list
    .slice(Number(skipCount), Number(skipCount) + Number(maxResultCount))
    .map(p => {
      const farmer = tData.customers.find(f => f.id === p.farmerId) || {};
      return {
        ...p,
        farmer: {
          id: farmer.id,
          code: farmer.code,
          phone: farmer.phone || '',
          nameInNepali: farmer.nameInNepali,
          nameInEnglish: farmer.nameInEnglish
        }
      };
    });

  res.json({ totalCount: list.length, items });
});

// POST /api/MilkCollectionPayment
app.post('/api/MilkCollectionPayment', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);

  const FarmerId = req.body.FarmerId !== undefined ? req.body.FarmerId : req.body.farmerId;
  const Amount = req.body.Amount !== undefined ? req.body.Amount : req.body.amount;
  const PaymentMethod = req.body.PaymentMethod !== undefined ? req.body.PaymentMethod : (req.body.paymentMethod !== undefined ? req.body.paymentMethod : 0);
  const ReferenceNumber = req.body.ReferenceNumber !== undefined ? req.body.ReferenceNumber : req.body.referenceNumber;
  const Remarks = req.body.Remarks !== undefined ? req.body.Remarks : req.body.remarks;
  const DateTimeUtms = req.body.DateTimeUtms !== undefined ? req.body.DateTimeUtms : req.body.dateTimeUtms;
  const amt = round2(Amount);

  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero' });
  }

  const farmer = tData.customers.find(f => f.id === Number(FarmerId));
  if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

  // Validation rule: Prevent payments from exceeding the total amount owed
  const enrichedFarmer = multiTenantDb.calculateCustomerKPIs(farmer, tData);
  const remainingDue = Math.max(0, Number(enrichedFarmer.milkCollectionRemainingAmount) || 0);
  const isAdvance = (Remarks || '').toLowerCase().includes('advance') || (Remarks || '').includes('पेश्की');

  if (!isAdvance && amt > (remainingDue + 0.05)) {
    return res.status(400).json({
      error: `Payment amount (रू ${amt.toFixed(2)}) cannot exceed the outstanding balance (रू ${remainingDue.toFixed(2)}).`,
      remainingDue,
      amount: amt
    });
  }

  const newPayment = {
    id: Date.now(),
    farmerId: Number(FarmerId),
    amount: amt,
    paymentMethod: Number(PaymentMethod),
    referenceNumber: ReferenceNumber || `VCHR-${Date.now().toString().slice(-6)}`,
    remarks: Remarks || 'Farmer milk supply settlement',
    dateTimeUtms: DateTimeUtms ? Number(DateTimeUtms) : Date.now(),
    isDeleted: false
  };

  tData.milkCollectionPayments.push(newPayment);

  // Record ledger entry
  const acctType = resolveAccountType(PaymentMethod); // 1: Cash, 2: Bank
  tData.cashBankLedgers.push({
    id: Date.now() + 1,
    accountType: acctType,
    transactionType: 2, // Outflow
    amount: amt,
    balanceAfter: 0,
    category: 'Milk Settlement',
    description: `Payment out to ${farmer.nameInEnglish || farmer.nameInNepali || 'Farmer'}`,
    referenceNumber: newPayment.referenceNumber,
    referenceType: 'PaymentOut',
    transactionDateUtms: newPayment.dateTimeUtms,
    isDeleted: false
  });

  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    farmerId: farmer.id,
    customerId: farmer.id,
    action: isAdvance ? 'RECORD_FARMER_ADVANCE' : 'DISBURSE_FARMER_PAYMENT',
    category: 'Farmer Payment',
    actionLabelNe: isAdvance ? 'कृषक पेश्की भुक्तान' : 'कृषक भुक्तानी भुक्तान',
    actionLabelEn: isAdvance ? 'Disbursed Farmer Advance' : 'Disbursed Farmer Payment',
    details: `Disbursed रू ${amt} to Farmer #${farmer.code || farmer.id} ${farmer.nameInEnglish || farmer.nameInNepali || 'Farmer'} via ${getPaymentMethodLabel(PaymentMethod)} (Voucher: ${newPayment.referenceNumber})`,
    referenceId: newPayment.referenceNumber
  });
  res.status(201).json(newPayment);
});

// DELETE /api/MilkCollectionPayment/:id
app.delete('/api/MilkCollectionPayment/:id', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const paymentId = Number(req.params.id);

  const payment = (tData.milkCollectionPayments || []).find(p => p.id === paymentId);
  if (!payment) {
    return res.status(404).json({ error: 'Payment record not found' });
  }

  payment.isDeleted = true;

  // Also soft delete matching cash/bank ledger entry if exists
  if (payment.referenceNumber && tData.cashBankLedgers) {
    const ledgerEntry = tData.cashBankLedgers.find(l => l.referenceNumber === payment.referenceNumber);
    if (ledgerEntry) ledgerEntry.isDeleted = true;
  }

  multiTenantDb.saveTenantData(tid, tData);
  const farmer = tData.customers.find(f => f.id === payment.farmerId) || {};
  recordActivity(req, {
    farmerId: payment.farmerId,
    customerId: payment.farmerId,
    action: 'DELETE_FARMER_PAYMENT',
    category: 'Farmer Payment',
    actionLabelNe: 'कृषक भुक्तानी रद्द',
    actionLabelEn: 'Cancelled Farmer Payment',
    details: `Cancelled payment voucher ${payment.referenceNumber} of रू ${payment.amount} for Farmer #${farmer.code || payment.farmerId} ${farmer.nameInEnglish || farmer.nameInNepali || 'Farmer'}`,
    referenceId: payment.referenceNumber
  });

  multiTenantDb.saveTenantData(tid, tData);
  res.json({ success: true, message: 'Payment record deleted successfully' });
});

// GET /api/MilkCollectionPayment/farmer-slip
app.get('/api/MilkCollectionPayment/farmer-slip', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const farmerId = Number(req.query.farmerId);
  const farmer = tData.customers.find(f => f.id === farmerId);
  if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

  const enriched = multiTenantDb.calculateCustomerKPIs(farmer, tData);
  const tenant = multiTenantDb.platform.tenants.find(t => t.id === tid) || multiTenantDb.platform.tenants[0];

  const recentCollections = tData.milkCollections
    .filter(c => c.farmerId === farmerId && !c.isDeleted)
    .sort((a, b) => b.dateTimeUtms - a.dateTimeUtms)
    .slice(0, 10);

  const recentPayments = tData.milkCollectionPayments
    .filter(p => p.farmerId === farmerId && !p.isDeleted)
    .sort((a, b) => b.dateTimeUtms - a.dateTimeUtms)
    .slice(0, 10);

  res.json({
    tenant: {
      name: tenant.organizationName || tenant.name,
      address: tenant.address
    },
    farmer: enriched,
    recentCollections,
    recentPayments
  });
});

// ============================================================================
// 6. SALES ORDERS & INSTANT POS COUNTER APIS
// ============================================================================

// GET /api/Order
app.get('/api/Order', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  let list = tData.orders.filter(o => !o.isDeleted);

  const { customerId, saleType, startDateUtms, endDateUtms, filter, maxResultCount = 50, skipCount = 0 } = req.query;

  if (customerId) list = list.filter(o => o.customerId === Number(customerId));
  if (saleType) list = list.filter(o => o.saleType === Number(saleType));
  if (startDateUtms) list = list.filter(o => o.orderDateTimeUtms >= Number(startDateUtms));
  if (endDateUtms) list = list.filter(o => o.orderDateTimeUtms <= Number(endDateUtms));
  if (filter) {
    const q = filter.trim().toLowerCase();
    list = list.filter(o =>
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      String(o.id) === q
    );
  }

  list.sort((a, b) => b.orderDateTimeUtms - a.orderDateTimeUtms);

  const items = list
    .slice(Number(skipCount), Number(skipCount) + Number(maxResultCount))
    .map(o => {
      const cust = o.customerId ? tData.customers.find(c => c.id === o.customerId) : null;
      return {
        ...o,
        customer: cust ? { id: cust.id, code: cust.code, phone: cust.phone || '', nameInNepali: cust.nameInNepali, nameInEnglish: cust.nameInEnglish } : null,
        totalProduct: o.orderProducts ? o.orderProducts.length : 0
      };
    });

  res.json({ totalCount: list.length, items });
});

// GET /api/Order/future-orders
app.get('/api/Order/future-orders', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const list = (tData.futureOrders || []).filter(o => !o.isDeleted);
  res.json({ totalCount: list.length, items: list });
});

// GET /api/Order/slip
app.get('/api/Order/slip', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const orderId = Number(req.query.orderId);
  const order = tData.orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const tenant = multiTenantDb.platform.tenants.find(t => t.id === tid) || multiTenantDb.platform.tenants[0];

  res.json({
    tenant: {
      name: tenant.organizationName || tenant.name,
      address: tenant.address
    },
    orderDetails: order
  });
});

// GET /api/Order/:orderId
app.get('/api/Order/:orderId', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const order = tData.orders.find(o => o.id === Number(req.params.orderId) && !o.isDeleted);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const cust = order.customerId ? tData.customers.find(c => c.id === order.customerId) : null;
  res.json({
    ...order,
    customer: cust ? { id: cust.id, nameInNepali: cust.nameInNepali, nameInEnglish: cust.nameInEnglish } : null
  });
});

// POST /api/Order (Create Instant POS Sale)
app.post('/api/Order', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);

  const { CustomerId, OrderProducts = [], PaymentMethod = 0, DiscountAmount = 0, PaidAmount, Remarks, OrderDateTimeUtms, OrderDateUtms } = req.body;

  if (!Array.isArray(OrderProducts) || OrderProducts.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one product' });
  }

  for (const p of OrderProducts) {
    const qty = Number(p.Quantity);
    const price = Number(p.UnitPrice);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Product quantity must be greater than zero' });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: 'Product unit price cannot be negative' });
    }
  }

  const rawDiscount = Number(DiscountAmount) || 0;
  if (rawDiscount < 0) {
    return res.status(400).json({ error: 'Discount amount cannot be negative' });
  }
  if (PaidAmount !== undefined && PaidAmount !== '' && Number(PaidAmount) < 0) {
    return res.status(400).json({ error: 'Paid amount cannot be negative' });
  }

  const orderId = Date.now();
  const orderTime = Number(OrderDateTimeUtms || OrderDateUtms) || orderId;
  let totalAmount = 0;

  const processedProducts = OrderProducts.map((p, idx) => {
    const prodId = Number(p.ProductId);
    const qty = round2(p.Quantity);
    const price = round2(p.UnitPrice);
    const lineTotal = round2(qty * price);
    totalAmount = round2(totalAmount + lineTotal);

    // Deduct inventory stock across available batches (FIFO)
    const prodStocks = (tData.productStocks || []).filter(s => s.productId === prodId);
    let remainingToDeduct = qty;
    let usedBatch = 'POS';
    for (const s of prodStocks) {
      const avail = Math.max(0, (Number(s.quantity) || 0) - (Number(s.usedQuantity) || 0));
      if (avail > 0 && remainingToDeduct > 0) {
        const take = Math.min(avail, remainingToDeduct);
        s.usedQuantity = round2((Number(s.usedQuantity) || 0) + take);
        usedBatch = s.batchNumber || usedBatch;
        remainingToDeduct = round2(remainingToDeduct - take);
      }
    }
    if (remainingToDeduct > 0 && prodStocks.length > 0) {
      prodStocks[0].usedQuantity = round2((Number(prodStocks[0].usedQuantity) || 0) + remainingToDeduct);
      usedBatch = prodStocks[0].batchNumber || usedBatch;
    }

    // Log stock movement
    const prod = tData.products.find(pr => pr.id === prodId);
    tData.stockMovements.push({
      id: orderId + 100 + idx,
      productId: prodId,
      productName: prod ? (prod.nameInEnglish || prod.nameInNepali) : 'Product',
      movementType: 3, // Out / Sale
      quantity: qty,
      batchNumber: usedBatch,
      location: 'Retail Counter',
      reference: `SALE-${orderId}`,
      remarks: Remarks || 'Counter Sale',
      dateTimeUtms: orderTime
    });

    return {
      productId: prodId,
      productName: prod ? (prod.nameInNepali || prod.nameInEnglish) : 'Item',
      quantity: qty,
      unitPrice: price,
      totalPrice: lineTotal
    };
  });

  const discount = round2(Math.min(totalAmount, rawDiscount));
  const netAmount = round2(Math.max(0, totalAmount - discount));
  const rawPaid = (PaidAmount !== undefined && PaidAmount !== '' && PaidAmount !== null) ? Number(PaidAmount) : netAmount;
  const totalPaid = round2(Math.min(netAmount, Math.max(0, rawPaid)));
  const remaining = round2(Math.max(0, netAmount - totalPaid));

  let custName = 'काउन्टर ग्राहक (Walk-in)';
  let custObj = null;
  if (CustomerId) {
    const cust = tData.customers.find(c => c.id === Number(CustomerId));
    if (cust) {
      custName = cust.nameInEnglish || cust.nameInNepali;
      custObj = { id: cust.id, code: cust.code, phone: cust.phone || '', nameInNepali: cust.nameInNepali, nameInEnglish: cust.nameInEnglish };
    }
  }

  const newOrder = {
    id: orderId,
    saleType: 1, // Instant Sale
    customerId: CustomerId ? Number(CustomerId) : null,
    customerName: custName,
    customer: custObj,
    orderDateTimeUtms: orderTime,
    totalAmount,
    discountAmount: discount,
    netAmount,
    totalPaid,
    remainingAmount: remaining,
    paymentMethod: Number(PaymentMethod),
    remarks: Remarks || 'Instant Retail Counter Sale',
    orderProducts: processedProducts,
    isDeleted: false
  };

  tData.orders.push(newOrder);

  // If cash/bank payment made, record in ledger
  if (totalPaid > 0) {
    const acctType = resolveAccountType(PaymentMethod); // 1: Cash, 2: Bank
    tData.cashBankLedgers.push({
      id: orderId + 2,
      accountType: acctType,
      transactionType: 1, // Inflow
      amount: totalPaid,
      balanceAfter: 0,
      category: 'Instant Sale',
      description: `Payment received for Instant Sale #${newOrder.id}`,
      referenceNumber: `SALE-${newOrder.id}`,
      referenceType: 'Sale',
      transactionDateUtms: newOrder.orderDateTimeUtms,
      isDeleted: false
    });
  }

  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    customerId: newOrder.customerId,
    action: 'POS_SALE',
    category: 'Sales & Orders',
    actionLabelNe: 'काउन्टर खुद्रा बिक्री',
    actionLabelEn: 'Completed Counter POS Sale',
    details: `Processed retail counter sale bill #${newOrder.id} (${newOrder.customerName}) for रू ${newOrder.netAmount} (${newOrder.orderProducts?.length || 0} items, Paid: रू ${newOrder.totalPaid})`,
    referenceId: `#${newOrder.id}`
  });
  res.status(201).json(newOrder);
});

// Future Orders Endpoints
app.post('/api/Order/future-order', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  if (!tData.futureOrders) tData.futureOrders = [];

  const totAmt = round2(req.body.totalAmount);
  const paidAmt = round2(req.body.paidAmount);

  if (totAmt < 0 || paidAmt < 0) {
    return res.status(400).json({ error: 'Order amounts cannot be negative' });
  }
  if (paidAmt > (totAmt + 0.05)) {
    return res.status(400).json({ error: `Advance deposit (रू ${paidAmt.toFixed(2)}) cannot exceed order total (रू ${totAmt.toFixed(2)})` });
  }
  const orderItems = Array.isArray(req.body.items) ? req.body.items : [];
  for (const item of orderItems) {
    if (Number(item.quantity) <= 0 || Number(item.unitPrice) < 0) {
      return res.status(400).json({ error: 'Order item quantity must be positive and price non-negative' });
    }
  }

  const balAmt = round2(Math.max(0, totAmt - paidAmt));
  const paymentMethod = req.body.paymentMethod !== undefined ? req.body.paymentMethod : (req.body.PaymentMethod !== undefined ? req.body.PaymentMethod : 0);

  const newFutureOrder = {
    id: Date.now(),
    orderNumber: `ORD-${new Date().getFullYear()}-${tData.futureOrders.length + 1}`,
    ...req.body,
    paymentMethod: Number(paymentMethod),
    totalAmount: totAmt,
    paidAmount: paidAmt,
    balanceAmount: balAmt,
    status: req.body.status || 'Pending',
    changeLogs: [
      {
        timestamp: Date.now(),
        action: 'CREATED',
        details: paidAmt > 0
          ? `Order created with advance deposit of रू ${paidAmt}`
          : 'Order created with zero deposit'
      }
    ]
  };

  tData.futureOrders.push(newFutureOrder);

  // If advance deposit was paid, record cash/bank inflow ledger entry
  if (paidAmt > 0) {
    const acctType = resolveAccountType(paymentMethod);
    tData.cashBankLedgers.push({
      id: Date.now() + 1,
      accountType: acctType,
      transactionType: 1, // Inflow
      amount: paidAmt,
      balanceAfter: 0,
      category: 'Order Advance Deposit',
      description: `Advance deposit for Scheduled Order ${newFutureOrder.orderNumber} (${newFutureOrder.customerName || 'Customer'})`,
      referenceNumber: newFutureOrder.orderNumber,
      referenceType: 'FutureOrderDeposit',
      transactionDateUtms: Date.now(),
      isDeleted: false
    });
  }

  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    customerId: Number(req.body.customerId) || null,
    action: 'CREATE_FUTURE_ORDER',
    category: 'Sales & Orders',
    actionLabelNe: 'अग्रिम अर्डर सिर्जना',
    actionLabelEn: 'Created Scheduled Order',
    details: `Created scheduled order ${newFutureOrder.orderNumber} for ${newFutureOrder.customerName || 'Customer'} (Total: रू ${totAmt}, Advance Paid: रू ${paidAmt})`,
    referenceId: newFutureOrder.orderNumber
  });
  res.status(201).json(newFutureOrder);
});

// POST /api/Order/future-order/pay
app.post('/api/Order/future-order/pay', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const { orderId, amount, paymentMethod = 0 } = req.body;
  const order = (tData.futureOrders || []).find(o => o.id === Number(orderId) && !o.isDeleted);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const payAmt = round2(amount);
  if (!Number.isFinite(payAmt) || payAmt <= 0) return res.status(400).json({ error: 'Invalid payment amount' });

  const currentDue = round2(Math.max(0, (Number(order.totalAmount) || 0) - (Number(order.paidAmount) || 0)));
  if (payAmt > (currentDue + 0.05)) {
    return res.status(400).json({ error: `Payment amount exceeds outstanding due of रू ${currentDue}` });
  }

  order.paidAmount = round2((Number(order.paidAmount) || 0) + payAmt);
  order.balanceAmount = round2(Math.max(0, (Number(order.totalAmount) || 0) - order.paidAmount));

  if (!order.changeLogs) order.changeLogs = [];
  order.changeLogs.push({
    timestamp: Date.now(),
    action: 'PAYMENT_RECEIVED',
    details: `Collected payment of रू ${payAmt} via ${getPaymentMethodLabel(paymentMethod)}. Remaining balance: रू ${order.balanceAmount}`
  });

  // Record cash/bank inflow ledger entry
  const acctType = resolveAccountType(paymentMethod);
  tData.cashBankLedgers.push({
    id: Date.now(),
    accountType: acctType,
    transactionType: 1, // Inflow
    amount: payAmt,
    balanceAfter: 0,
    category: 'Order Settlement',
    description: `Balance payment for Scheduled Order ${order.orderNumber} (${order.customerName || 'Customer'})`,
    referenceNumber: order.orderNumber,
    referenceType: 'FutureOrderSettlement',
    transactionDateUtms: Date.now(),
    isDeleted: false
  });

  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'PAY_ORDER_BALANCE',
    category: 'Sales & Orders',
    actionLabelNe: 'अर्डर बक्यौता भुक्तानी',
    actionLabelEn: 'Received Order Payment',
    details: `Collected balance payment of रू ${payAmt} for order ${order.orderNumber} (${order.customerName || 'Customer'}). Remaining balance: रू ${order.balanceAmount}`,
    referenceId: order.orderNumber
  });
  res.json({ success: true, order });
});

// POST /api/Order/status
app.post('/api/Order/status', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const { orderId, status, notes } = req.body;
  const order = (tData.futureOrders || []).find(o => o.id === Number(orderId));
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.status = status;
  if (!order.changeLogs) order.changeLogs = [];
  order.changeLogs.push({
    timestamp: Date.now(),
    action: `STATUS_CHANGED_${status.toUpperCase()}`,
    details: notes || `Status updated to ${status}`
  });

  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'UPDATE_ORDER_STATUS',
    category: 'Sales & Orders',
    actionLabelNe: 'अर्डर अवस्था परिवर्तन',
    actionLabelEn: 'Updated Order Status',
    details: `Updated order ${order.orderNumber} (${order.customerName || 'Customer'}) status to "${status}"`,
    referenceId: order.orderNumber
  });
  res.json({ success: true, order });
});

// DELETE /api/Order/future-order/:id
app.delete('/api/Order/future-order/:id', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const orderId = Number(req.params.id);
  const order = (tData.futureOrders || []).find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (!order.isDeleted) {
    order.isDeleted = true;
    if (!order.changeLogs) order.changeLogs = [];
    order.changeLogs.push({
      timestamp: Date.now(),
      action: 'ORDER_DELETED',
      details: 'Order was deleted'
    });

    // Soft-delete associated advance deposit & settlement ledger entries so Cash/Bank balances revert
    if (order.orderNumber && tData.cashBankLedgers) {
      tData.cashBankLedgers.forEach(l => {
        if (
          l.referenceNumber === order.orderNumber &&
          (l.referenceType === 'FutureOrderDeposit' || l.referenceType === 'FutureOrderSettlement')
        ) {
          l.isDeleted = true;
        }
      });
    }

    multiTenantDb.saveTenantData(tid, tData);
    recordActivity(req, {
      action: 'DELETE_FUTURE_ORDER',
      category: 'Sales & Orders',
      actionLabelNe: 'अर्डर मेटाएको',
      actionLabelEn: 'Deleted Future Order',
      details: `Deleted scheduled order ${order.orderNumber} for ${order.customerName || 'Customer'}`,
      referenceId: order.orderNumber
    });
  }
  res.json({ success: true, message: 'Future order deleted successfully' });
});

// GET /api/Order/future-order/slip
app.get('/api/Order/future-order/slip', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const orderId = Number(req.query.orderId);
  const order = (tData.futureOrders || []).find(o => o.id === orderId && !o.isDeleted);
  if (!order) return res.status(404).json({ error: 'Future order not found' });

  const tenant = multiTenantDb.platform.tenants.find(t => t.id === tid) || multiTenantDb.platform.tenants[0];
  const cust = order.customerId ? tData.customers.find(c => c.id === order.customerId) : null;

  res.json({
    tenant: {
      name: tenant.organizationName || tenant.name,
      address: tenant.address,
      phone: tenant.phone
    },
    customer: cust,
    order: order,
    orderDetails: order
  });
});

// ============================================================================
// 7. INVENTORY & PRODUCTS APIS
// ============================================================================

// GET /api/Product
app.get('/api/Product', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const list = tData.products.filter(p => !p.isDeleted);
  res.json({ totalCount: list.length, items: list });
});

// POST /api/Product
app.post('/api/Product', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const unit = tData.units.find(u => u.id === Number(req.body.unitId));

  const sellingPrice = Number(req.body.sellingPrice) || 0;
  const costPrice = Number(req.body.costPrice) || 0;
  const reorderLevel = Number(req.body.reorderLevel ?? 10);
  if (sellingPrice < 0 || costPrice < 0 || reorderLevel < 0) {
    return res.status(400).json({ error: 'Selling price, cost price, and reorder level cannot be negative' });
  }

  const newProd = {
    id: Date.now(),
    nameInEnglish: req.body.nameInEnglish || '',
    nameInNepali: req.body.nameInNepali || '',
    unitId: Number(req.body.unitId) || 1,
    unitName: unit ? unit.name : 'Unit',
    sellingPrice: round2(sellingPrice),
    costPrice: round2(costPrice),
    reorderLevel: round2(reorderLevel),
    description: req.body.description || '',
    isDeleted: false
  };

  tData.products.push(newProd);
  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'CREATE_PRODUCT',
    category: 'Inventory & Processing',
    actionLabelNe: 'नयाँ उत्पादन थप',
    actionLabelEn: 'Added New Product',
    details: `Added product ${newProd.nameInEnglish || newProd.nameInNepali} (Cost: रू ${newProd.costPrice}, Selling: रू ${newProd.sellingPrice})`,
    referenceId: `#${newProd.id}`
  });
  res.status(201).json(newProd);
});

// PUT /api/Product/:id
app.put('/api/Product/:id', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const idx = tData.products.findIndex(p => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  if (
    (req.body.sellingPrice !== undefined && Number(req.body.sellingPrice) < 0) ||
    (req.body.costPrice !== undefined && Number(req.body.costPrice) < 0) ||
    (req.body.reorderLevel !== undefined && Number(req.body.reorderLevel) < 0)
  ) {
    return res.status(400).json({ error: 'Selling price, cost price, and reorder level cannot be negative' });
  }

  const unit = req.body.unitId ? tData.units.find(u => u.id === Number(req.body.unitId)) : null;
  tData.products[idx] = {
    ...tData.products[idx],
    ...req.body,
    unitName: unit ? unit.name : (req.body.unitName || tData.products[idx].unitName),
    id: Number(req.params.id)
  };
  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'UPDATE_PRODUCT',
    category: 'Inventory & Processing',
    actionLabelNe: 'उत्पादन विवरण अद्यावधिक',
    actionLabelEn: 'Updated Product',
    details: `Updated product "${tData.products[idx].nameInEnglish}" (Sell NPR ${tData.products[idx].sellingPrice}, Cost NPR ${tData.products[idx].costPrice})`,
    referenceId: `PROD-${tData.products[idx].id}`
  });
  res.json(tData.products[idx]);
});

// DELETE /api/Product/:id
app.delete('/api/Product/:id', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const prod = tData.products.find(p => p.id === Number(req.params.id));
  if (!prod) return res.status(404).json({ error: 'Product not found' });

  prod.isDeleted = true;
  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'DELETE_PRODUCT',
    category: 'Inventory & Processing',
    actionLabelNe: 'उत्पादन हटाइयो',
    actionLabelEn: 'Deleted Product',
    details: `Removed product "${prod.nameInEnglish}"`,
    referenceId: `PROD-${prod.id}`
  });
  res.json({ success: true });
});

// GET /api/Inventory/summary
app.get('/api/Inventory/summary', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);

  const summary = tData.products.filter(p => !p.isDeleted).map(prod => {
    const stocks = (tData.productStocks || []).filter(s => s.productId === prod.id);
    const totalQty = stocks.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
    const usedQty = stocks.reduce((acc, s) => acc + (Number(s.usedQuantity) || 0), 0);
    const currentStock = round2(Math.max(0, totalQty - usedQty));
    const unitCost = Number(prod.costPrice) > 0 ? Number(prod.costPrice) : (Number(prod.sellingPrice) || 0);
    const stockValue = round2(currentStock * unitCost);
    const retailValue = round2(currentStock * (Number(prod.sellingPrice) || 0));
    const totalWastage = round2(
      (tData.stockMovements || [])
        .filter(m => Number(m.productId) === prod.id && Number(m.movementType) === 4)
        .reduce((acc, m) => acc + (Number(m.quantity) || 0), 0)
    );

    return {
      productId: prod.id,
      productName: prod.nameInNepali || prod.nameInEnglish,
      productNameEn: prod.nameInEnglish,
      unitName: prod.unitName || 'Unit',
      sellingPrice: prod.sellingPrice,
      costPrice: prod.costPrice,
      reorderLevel: prod.reorderLevel,
      currentStock,
      stockValue,
      retailValue,
      isLowStock: currentStock <= (prod.reorderLevel ?? 10),
      totalWastage
    };
  });

  res.json(summary);
});

// GET /api/Inventory/movements
app.get('/api/Inventory/movements', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const list = [...(tData.stockMovements || [])].sort((a, b) => (b.dateTimeUtms || b.movementDateUtms || 0) - (a.dateTimeUtms || a.movementDateUtms || 0));
  res.json({ totalCount: list.length, items: list });
});

// POST /api/Inventory/movements
app.post('/api/Inventory/movements', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const { productId, movementType, quantity, batchNumber, location, remarks, adjustmentDirection = 'add' } = req.body;
  const prod = tData.products.find(p => p.id === Number(productId) && !p.isDeleted);
  if (!prod) return res.status(404).json({ error: 'Product not found' });

  const mType = Number(movementType) || 1; // 1: In, 2: Out/Production, 3: Out/Sale, 4: Wastage/Damage, 5: Adjustment
  const qty = round2(Math.abs(Number(quantity)));
  if (!Number.isFinite(qty) || qty <= 0 || Number(quantity) < 0) {
    return res.status(400).json({ error: 'Movement quantity must be greater than zero' });
  }
  const direction = mType === 5
    ? (adjustmentDirection === 'subtract' ? 'subtract' : 'add')
    : (mType === 1 ? 'add' : 'subtract');

  const now = Date.now();
  const newMovement = {
    id: now,
    productId: Number(productId),
    productName: prod.nameInNepali || prod.nameInEnglish || 'Item',
    movementType: mType,
    adjustmentDirection: mType === 5 ? direction : undefined,
    quantity: qty,
    batchNumber: batchNumber || 'LOT-MANUAL',
    location: location || 'Warehouse',
    reference: `STK-${now.toString().slice(-6)}`,
    remarks: remarks || '',
    dateTimeUtms: now
  };

  if (!tData.stockMovements) tData.stockMovements = [];
  tData.stockMovements.push(newMovement);

  // Update product stock accordingly
  if (!tData.productStocks) tData.productStocks = [];
  let stock = tData.productStocks.find(s => s.productId === Number(productId));
  if (!stock) {
    stock = {
      id: now + 1,
      productId: Number(productId),
      batchNumber: newMovement.batchNumber,
      quantity: 0,
      usedQuantity: 0,
      dateTimeUtms: now
    };
    tData.productStocks.push(stock);
  }
  if (direction === 'add') {
    stock.quantity = round2((Number(stock.quantity) || 0) + qty);
  } else {
    stock.usedQuantity = round2((Number(stock.usedQuantity) || 0) + qty);
  }

  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: mType === 4 ? 'RECORD_STOCK_WASTAGE' : 'STOCK_MOVEMENT',
    category: 'Inventory & Processing',
    actionLabelNe: mType === 4 ? 'मौज्दात नोक्सानी प्रविष्टि' : 'मौज्दात समायोजन',
    actionLabelEn: mType === 4 ? 'Recorded Inventory Wastage' : 'Recorded Stock Movement',
    details: `${direction === 'add' ? '+' : '-'}${qty} ${prod.unitName || 'Unit'} of ${prod.nameInEnglish || prod.nameInNepali} (${mType === 4 ? 'Wastage/Leakage' : mType === 5 ? `Adjustment (${direction})` : mType === 1 ? 'Stock In' : 'Stock Out'})`,
    referenceId: newMovement.reference
  });
  res.status(201).json(newMovement);
});

// ============================================================================
// 8. PRODUCTION BATCHES APIS
// ============================================================================

// GET /api/Production
app.get('/api/Production', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const list = (tData.productionBatches || []).filter(b => !b.isDeleted);
  res.json({ totalCount: list.length, items: list });
});

// POST /api/Production
app.post('/api/Production', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  if (!tData.productionBatches) tData.productionBatches = [];

  const {
    batchNumber,
    inputRawMilkLiters,
    inputFat = 4.5,
    inputSnf = 8.2,
    wastageQuantity,
    leakageLiters,
    location,
    outputItems = [],
    remarks,
    status
  } = req.body;

  const rawLiters = round2(inputRawMilkLiters);
  const fat = round2(inputFat);
  const snf = round2(inputSnf);
  const wastageQty = round2(wastageQuantity !== undefined ? wastageQuantity : (leakageLiters !== undefined ? leakageLiters : 0));

  if (!Number.isFinite(rawLiters) || rawLiters <= 0) {
    return res.status(400).json({ error: 'Input raw milk liters must be greater than zero' });
  }
  if (fat < 0 || snf < 0 || wastageQty < 0) {
    return res.status(400).json({ error: 'FAT, SNF, and processing leakage cannot be negative' });
  }
  if (wastageQty > rawLiters) {
    return res.status(400).json({ error: `Processing leakage (${wastageQty} L) cannot exceed input raw milk (${rawLiters} L)` });
  }

  for (const o of outputItems) {
    if (Number(o.quantity) < 0) {
      return res.status(400).json({ error: 'Output item quantity cannot be negative' });
    }
  }
  const normalizedOutputs = outputItems
    .filter(o => Number(o.quantity) > 0)
    .map(o => ({
      productId: Number(o.productId),
      productName: o.productName,
      quantity: round2(o.quantity),
      unit: o.unit || 'KG'
    }));

  if (normalizedOutputs.length === 0) {
    return res.status(400).json({ error: 'At least one output product with positive quantity is required' });
  }

  const now = Date.now();
  const leakagePercentage = round2((wastageQty / rawLiters) * 100);

  const newBatch = {
    id: now,
    batchNumber: batchNumber || `BATCH-${new Date().getFullYear()}-${tData.productionBatches.length + 1}`,
    productionDateUtms: now,
    status: status === 'InProgress' || Number(status) === 0 ? 'InProgress' : 'Completed',
    location: location || 'Main Processing Plant',
    inputRawMilkLiters: rawLiters,
    inputFat: fat,
    inputSnf: snf,
    wastageQuantity: wastageQty,
    leakageLiters: wastageQty,
    leakagePercentage,
    outputItems: normalizedOutputs,
    remarks: remarks || '',
    isDeleted: false
  };

  // Deduct input raw milk from stock and record Production Out movement
  const rawMilkProduct = tData.products.find(p => !p.isDeleted && (p.id === 1 || (p.nameInEnglish || '').includes('Raw Milk')));
  if (rawMilkProduct) {
    const rawStock = tData.productStocks.find(s => s.productId === rawMilkProduct.id);
    if (rawStock) {
      rawStock.usedQuantity = round2((Number(rawStock.usedQuantity) || 0) + rawLiters);
    }
    if (!tData.stockMovements) tData.stockMovements = [];
    tData.stockMovements.push({
      id: now + 10,
      productId: rawMilkProduct.id,
      productName: rawMilkProduct.nameInNepali || rawMilkProduct.nameInEnglish || 'Raw Milk',
      movementType: 2, // Out / Production
      quantity: rawLiters,
      batchNumber: newBatch.batchNumber,
      location: newBatch.location,
      reference: newBatch.batchNumber,
      remarks: `Consumed in ${newBatch.batchNumber} (Processing leakage: ${wastageQty} L / ${leakagePercentage}%)`,
      dateTimeUtms: now
    });
  }

  // Add produced output items to stock and record Production In movements
  newBatch.outputItems.forEach((item, idx) => {
    const stock = tData.productStocks.find(s => s.productId === item.productId);
    if (stock) {
      stock.quantity = round2((Number(stock.quantity) || 0) + item.quantity);
    } else {
      tData.productStocks.push({
        id: now + 20 + idx,
        productId: item.productId,
        batchNumber: newBatch.batchNumber,
        quantity: item.quantity,
        usedQuantity: 0,
        dateTimeUtms: now
      });
    }
    if (!tData.stockMovements) tData.stockMovements = [];
    tData.stockMovements.push({
      id: now + 50 + idx,
      productId: item.productId,
      productName: item.productName,
      movementType: 1, // In / Production
      quantity: item.quantity,
      batchNumber: newBatch.batchNumber,
      location: newBatch.location,
      reference: newBatch.batchNumber,
      remarks: `Produced in ${newBatch.batchNumber}`,
      dateTimeUtms: now
    });
  });

  tData.productionBatches.push(newBatch);
  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'CREATE_PRODUCTION_BATCH',
    category: 'Inventory & Processing',
    actionLabelNe: 'उत्पादन ब्याच सुरु',
    actionLabelEn: 'Started Production Batch',
    details: `Processed ${newBatch.inputRawMilkLiters}L raw milk (Leakage: ${wastageQty}L / ${leakagePercentage}%) into ${newBatch.outputItems.map(o => `${o.quantity} ${o.unit} ${o.productName}`).join(', ')} (${newBatch.batchNumber})`,
    referenceId: newBatch.batchNumber
  });
  res.status(201).json(newBatch);
});

// PUT /api/Production/:id/status
app.put('/api/Production/:id/status', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const batch = (tData.productionBatches || []).find(b => b.id === Number(req.params.id));
  if (!batch) return res.status(404).json({ error: 'Production batch not found' });

  const rawStatus = req.body.status;
  const previousStatus = batch.status || 'InProgress';
  batch.status = (rawStatus === 'InProgress' || Number(rawStatus) === 0) ? 'InProgress' : 'Completed';
  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'UPDATE_PRODUCTION_STATUS',
    category: 'Inventory & Processing',
    actionLabelNe: 'उत्पादन ब्याच स्थिति परिवर्तन',
    actionLabelEn: 'Updated Production Status',
    details: `Changed production batch ${batch.batchNumber || `#${batch.id}`} status from ${previousStatus} to ${batch.status}`,
    referenceId: batch.batchNumber || `BATCH-${batch.id}`
  });
  res.json({ success: true, batch });
});

// ============================================================================
// 9. PURCHASES / PROCUREMENT APIS
// ============================================================================

// GET /api/Purchase
app.get('/api/Purchase', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const list = (tData.purchases || []).filter(p => !p.isDeleted);
  res.json({ totalCount: list.length, items: list });
});

// POST /api/Purchase
app.post('/api/Purchase', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  if (!tData.purchases) tData.purchases = [];
  if (!tData.stockMovements) tData.stockMovements = [];

  const { supplierName, invoiceNumber, purchaseDateUtms, paymentStatus = 0, paymentMethod = 0, paidAmount, location, remarks, items = [] } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Purchase must include at least one item' });
  }
  for (const it of items) {
    if (!Number.isFinite(Number(it.quantity)) || Number(it.quantity) <= 0) {
      return res.status(400).json({ error: 'Purchase item quantity must be greater than zero' });
    }
    if (!Number.isFinite(Number(it.unitPrice)) || Number(it.unitPrice) < 0) {
      return res.status(400).json({ error: 'Purchase unit price cannot be negative' });
    }
  }
  if (paidAmount !== undefined && paidAmount !== '' && Number(paidAmount) < 0) {
    return res.status(400).json({ error: 'Paid amount cannot be negative' });
  }

  const now = Date.now();
  const purDate = purchaseDateUtms ? Number(purchaseDateUtms) : now;
  const invNum = invoiceNumber || `INV-${now.toString().slice(-6)}`;
  let totalAmount = 0;

  const preparedEntries = items.map((it, idx) => {
    const prodId = Number(it.productId);
    const qty = round2(it.quantity);
    const price = round2(it.unitPrice);
    const total = round2(qty * price);
    totalAmount = round2(totalAmount + total);
    const batch = it.batchNumber || `PUR-${now.toString().slice(-4)}`;
    const prod = tData.products.find(p => p.id === prodId);

    return {
      idx,
      prodId,
      qty,
      price,
      total,
      batch,
      expiryDateUtms: it.expiryDateUtms || (now + 30 * 86400000),
      movementName: it.productName || (prod ? (prod.nameInNepali || prod.nameInEnglish) : 'Material'),
      itemName: it.productName || (prod ? (prod.nameInEnglish || prod.nameInNepali) : 'Material')
    };
  });

  const computedPaid = paidAmount !== undefined && paidAmount !== '' && paidAmount !== null
    ? round2(paidAmount)
    : (Number(paymentStatus) === 0 ? totalAmount : 0);

  if (computedPaid > totalAmount + 0.05) {
    return res.status(400).json({ error: `Paid amount (रू ${computedPaid.toFixed(2)}) cannot exceed purchase total (रू ${totalAmount.toFixed(2)})` });
  }
  const safePaid = round2(Math.min(totalAmount, Math.max(0, computedPaid)));
  const derivedStatus = safePaid >= totalAmount - 0.01 ? 0 : (safePaid > 0 ? 1 : 2);

  // Validation passed; now mutate stock and movement records
  const processedItems = preparedEntries.map((entry) => {
    const existingStock = (tData.productStocks || []).find(s => s.productId === entry.prodId);
    if (existingStock) {
      existingStock.quantity = round2((Number(existingStock.quantity) || 0) + entry.qty);
    } else {
      tData.productStocks.push({
        id: now + entry.idx + 1,
        productId: entry.prodId,
        batchNumber: entry.batch,
        quantity: entry.qty,
        usedQuantity: 0,
        expiryDateUtms: entry.expiryDateUtms,
        dateTimeUtms: purDate
      });
    }

    tData.stockMovements.push({
      id: now + 100 + entry.idx,
      productId: entry.prodId,
      productName: entry.movementName,
      movementType: 1, // In / Purchase
      quantity: entry.qty,
      batchNumber: entry.batch,
      location: location || 'Main Warehouse',
      reference: invNum,
      remarks: `Purchased from ${supplierName || 'Supplier'}`,
      dateTimeUtms: purDate
    });

    return {
      productId: entry.prodId,
      productName: entry.itemName,
      quantity: entry.qty,
      unitPrice: entry.price,
      totalPrice: entry.total,
      batchNumber: entry.batch
    };
  });

  const newPurchase = {
    id: now,
    supplierName: supplierName || 'Supplier',
    invoiceNumber: invNum,
    purchaseDateUtms: purDate,
    paymentStatus: derivedStatus,
    paymentMethod: Number(paymentMethod),
    totalAmount,
    paidAmount: safePaid,
    location: location || 'Main Warehouse',
    remarks: remarks || '',
    items: processedItems,
    isDeleted: false
  };

  tData.purchases.push(newPurchase);

  // If payment made, record in ledger
  if (newPurchase.paidAmount > 0) {
    const acctType = resolveAccountType(paymentMethod);
    tData.cashBankLedgers.push({
      id: now + 50,
      accountType: acctType,
      transactionType: 2, // Outflow
      amount: newPurchase.paidAmount,
      balanceAfter: 0,
      category: 'Supplier Purchase',
      description: `Payment for purchase from ${newPurchase.supplierName} (Inv: ${newPurchase.invoiceNumber})`,
      referenceNumber: newPurchase.invoiceNumber,
      referenceType: 'Purchase',
      transactionDateUtms: newPurchase.purchaseDateUtms,
      isDeleted: false
    });
  }

  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'RECORD_PURCHASE',
    category: 'Inventory & Processing',
    actionLabelNe: 'कच्चा पदार्थ खरिद',
    actionLabelEn: 'Recorded Procurement Purchase',
    details: `Purchased inventory items from ${newPurchase.supplierName} for रू ${newPurchase.totalAmount} (Inv: ${newPurchase.invoiceNumber}, Paid: रू ${newPurchase.paidAmount} via ${getPaymentMethodLabel(paymentMethod)})`,
    referenceId: newPurchase.invoiceNumber
  });
  res.status(201).json(newPurchase);
});

// ============================================================================
// 10. FINANCE, EXPENSES & CASH/BANK APIS
// ============================================================================

// GET /api/Finance/payments-in
app.get('/api/Finance/payments-in', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const list = (tData.customerPayments || []).filter(p => !p.isDeleted);
  res.json({ totalCount: list.length, items: list });
});

// POST /api/Finance/payments-in
app.post('/api/Finance/payments-in', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  if (!tData.customerPayments) tData.customerPayments = [];

  const { customerId, amount, paymentMethod = 0, referenceNumber, remarks, paymentDateUtms } = req.body;
  const cust = tData.customers.find(c => c.id === Number(customerId)) || {};
  const amt = round2(amount);

  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero' });
  }

  const now = Date.now();
  const acctType = resolveAccountType(paymentMethod);
  const newPayment = {
    id: now,
    customerId: Number(customerId),
    customerName: cust.nameInEnglish || cust.nameInNepali || 'Customer',
    amount: amt,
    paymentMethod: Number(paymentMethod),
    referenceNumber: referenceNumber || `RCPT-${now.toString().slice(-6)}`,
    remarks: remarks || '',
    paymentDateUtms: paymentDateUtms ? Number(paymentDateUtms) : now,
    isDeleted: false
  };

  tData.customerPayments.push(newPayment);

  // Record ledger entry
  tData.cashBankLedgers.push({
    id: now + 1,
    accountType: acctType,
    transactionType: 1, // Inflow
    amount: amt,
    balanceAfter: 0,
    category: 'Customer Payment',
    description: `Payment received from ${newPayment.customerName}`,
    referenceNumber: newPayment.referenceNumber,
    referenceType: 'CustomerPayment',
    transactionDateUtms: newPayment.paymentDateUtms,
    isDeleted: false
  });

  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'CUSTOMER_PAYMENT',
    category: 'Sales & Orders',
    actionLabelNe: 'ग्राहक रकम भुक्तानी',
    actionLabelEn: 'Customer Balance Payment',
    details: `Collected payment of रू ${amt} from ${newPayment.customerName} via ${acctType === 2 ? 'Bank' : 'Cash'} (Rcpt: ${newPayment.referenceNumber})`,
    referenceId: newPayment.referenceNumber
  });
  res.status(201).json(newPayment);
});

const handleGetPaymentsOut = (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const farmerPayouts = (tData.milkCollectionPayments || []).filter(p => !p.isDeleted);
  const generalPayouts = (tData.generalDisbursements || []).filter(p => !p.isDeleted);
  const list = [...farmerPayouts, ...generalPayouts].sort((a, b) => (b.dateTimeUtms || 0) - (a.dateTimeUtms || 0));
  res.json({ totalCount: list.length, items: list });
};

const handleCreatePaymentOut = (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);

  const { farmerId, recipientName, recipient, amount, paymentMethod = 0, referenceNumber, remarks, category, paymentDateUtms } = req.body;
  const amt = round2(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero' });
  }

  const now = Date.now();
  const finalRecipient = recipientName || recipient || 'Supplier/Farmer';
  const newPayout = {
    id: now,
    farmerId: farmerId ? Number(farmerId) : null,
    recipientName: finalRecipient,
    recipient: finalRecipient,
    amount: amt,
    paymentMethod: Number(paymentMethod),
    referenceNumber: referenceNumber || `VCHR-${now.toString().slice(-6)}`,
    category: category || 'Settlement',
    remarks: remarks || '',
    dateTimeUtms: paymentDateUtms ? Number(paymentDateUtms) : now,
    isDeleted: false
  };

  if (farmerId) {
    const farmer = tData.customers.find(f => f.id === Number(farmerId));
    if (farmer) {
      const enrichedFarmer = multiTenantDb.calculateCustomerKPIs(farmer, tData);
      const remainingDue = Math.max(0, Number(enrichedFarmer.milkCollectionRemainingAmount) || 0);
      const isAdvance = (remarks || '').toLowerCase().includes('advance') || (category || '').toLowerCase().includes('advance') || (remarks || '').includes('पेश्की');
      if (!isAdvance && amt > (remainingDue + 0.05)) {
        return res.status(400).json({
          error: `Payment amount (रू ${amt.toFixed(2)}) cannot exceed the outstanding balance (रू ${remainingDue.toFixed(2)}).`
        });
      }
    }
    tData.milkCollectionPayments.push(newPayout);
  } else {
    if (!tData.generalDisbursements) tData.generalDisbursements = [];
    tData.generalDisbursements.push(newPayout);
  }

  // Record in ledger
  const acctType = resolveAccountType(paymentMethod);
  tData.cashBankLedgers.push({
    id: now + 1,
    accountType: acctType,
    transactionType: 2, // Outflow
    amount: amt,
    balanceAfter: 0,
    category: category || 'Payment Out',
    description: `Payment out to ${finalRecipient}`,
    referenceNumber: newPayout.referenceNumber,
    referenceType: 'PaymentOut',
    transactionDateUtms: newPayout.dateTimeUtms,
    isDeleted: false
  });

  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'DISBURSE_PAYMENT_OUT',
    category: 'Finance & Expenses',
    actionLabelNe: 'रकम भुक्तानी भुक्तान',
    actionLabelEn: 'Disbursed Payment Out',
    details: `Disbursed payment of रू ${amt} to ${newPayout.recipientName} (${newPayout.category}) via ${acctType === 2 ? 'Bank' : 'Cash'}`,
    referenceId: newPayout.referenceNumber
  });
  res.status(201).json(newPayout);
};

// GET & POST /api/Finance/payments-out and /api/Finance/disbursements
app.get('/api/Finance/payments-out', handleGetPaymentsOut);
app.post('/api/Finance/payments-out', handleCreatePaymentOut);
app.get('/api/Finance/disbursements', handleGetPaymentsOut);
app.post('/api/Finance/disbursements', handleCreatePaymentOut);

// GET /api/Finance/expenses
app.get('/api/Finance/expenses', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  let list = (tData.expenses || []).filter(e => !e.isDeleted);

  const { category, filter } = req.query;
  if (category) list = list.filter(e => e.category === category);
  if (filter) {
    const q = filter.trim().toLowerCase();
    list = list.filter(e => (e.recipient && e.recipient.toLowerCase().includes(q)) || (e.remarks && e.remarks.toLowerCase().includes(q)));
  }

  res.json({ totalCount: list.length, items: list });
});

// POST /api/Finance/expenses
app.post('/api/Finance/expenses', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  if (!tData.expenses) tData.expenses = [];

  const { category, amount, paymentMethod = 0, recipient, referenceNumber, remarks, expenseDateUtms } = req.body;
  const amt = round2(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Expense amount must be greater than zero' });
  }

  const now = Date.now();
  const acctType = resolveAccountType(paymentMethod);
  const newExpense = {
    id: now,
    category: category || 'Miscellaneous',
    amount: amt,
    paymentMethod: Number(paymentMethod),
    recipient: recipient || 'Vendor',
    referenceNumber: referenceNumber || `EXP-${now.toString().slice(-6)}`,
    remarks: remarks || '',
    expenseDateUtms: expenseDateUtms ? Number(expenseDateUtms) : now,
    isDeleted: false
  };

  tData.expenses.push(newExpense);

  // Record ledger entry
  tData.cashBankLedgers.push({
    id: now + 1,
    accountType: acctType,
    transactionType: 2, // Outflow
    amount: amt,
    balanceAfter: 0,
    category: `Expense: ${newExpense.category}`,
    description: `Operating Expense for ${newExpense.category} paid to ${newExpense.recipient}`,
    referenceNumber: newExpense.referenceNumber,
    referenceType: 'Expense',
    transactionDateUtms: newExpense.expenseDateUtms,
    isDeleted: false
  });

  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'RECORD_EXPENSE',
    category: 'Finance & Expenses',
    actionLabelNe: 'खर्च प्रविष्टि',
    actionLabelEn: 'Recorded Operating Expense',
    details: `Recorded expense of रू ${amt} for "${newExpense.category}" paid to ${newExpense.recipient} via ${acctType === 2 ? 'Bank' : 'Cash'}`,
    referenceId: newExpense.referenceNumber
  });
  res.status(201).json(newExpense);
});

// DELETE /api/Finance/expenses/:id
app.delete('/api/Finance/expenses/:id', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const exp = (tData.expenses || []).find(e => e.id === Number(req.params.id));
  if (!exp) return res.status(404).json({ error: 'Expense not found' });

  if (!exp.isDeleted) {
    exp.isDeleted = true;
    // Also soft-delete associated ledger entry so Cash/Bank balance reverts
    if (exp.referenceNumber && tData.cashBankLedgers) {
      tData.cashBankLedgers.forEach(l => {
        if (l.referenceNumber === exp.referenceNumber && l.referenceType === 'Expense') {
          l.isDeleted = true;
        }
      });
    }
    multiTenantDb.saveTenantData(tid, tData);
    recordActivity(req, {
      action: 'DELETE_EXPENSE',
      category: 'Finance & Expenses',
      actionLabelNe: 'खर्च रद्द',
      actionLabelEn: 'Deleted Operating Expense',
      details: `Deleted expense "${exp.category}" (${exp.recipient}) of रू ${exp.amount}`,
      referenceId: exp.referenceNumber || `#${exp.id}`
    });
  }
  res.json({ success: true });
});

// GET /api/Finance/cash-bank-summary
app.get('/api/Finance/cash-bank-summary', (req, res) => {
  const tid = resolveTenantId(req);
  res.json(multiTenantDb.getCashBankSummary(tid));
});

// GET /api/Finance/ledger
app.get('/api/Finance/ledger', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const allActive = [...(tData.cashBankLedgers || [])].filter(l => !l.isDeleted);

  // Calculate accurate chronological running balances across ALL ledger entries first
  let runningCash = 25000;
  let runningBank = 75000;
  const ascendingAll = [...allActive].sort((a, b) => (a.transactionDateUtms - b.transactionDateUtms) || (a.id - b.id));
  ascendingAll.forEach(item => {
    const amt = Number(item.amount) || 0;
    if (item.accountType === 1) {
      runningCash = round2(item.transactionType === 1 ? runningCash + amt : runningCash - amt);
      item.balanceAfter = runningCash;
    } else {
      runningBank = round2(item.transactionType === 1 ? runningBank + amt : runningBank - amt);
      item.balanceAfter = runningBank;
    }
  });

  let list = ascendingAll;
  const { accountType, transactionType, filter } = req.query;
  if (accountType) list = list.filter(l => l.accountType === Number(accountType));
  if (transactionType) list = list.filter(l => l.transactionType === Number(transactionType));
  if (filter) {
    const q = filter.trim().toLowerCase();
    list = list.filter(l => (l.description && l.description.toLowerCase().includes(q)) || (l.category && l.category.toLowerCase().includes(q)));
  }

  list = [...list].sort((a, b) => (b.transactionDateUtms - a.transactionDateUtms) || (b.id - a.id));

  res.json({ totalCount: list.length, items: list });
});

// ============================================================================
// 11. REPORTS & DASHBOARD ANALYTICS APIS
// ============================================================================

// GET /api/Reports/dashboard
app.get('/api/Reports/dashboard', (req, res) => {
  const tid = resolveTenantId(req);
  const { fromDateUtms, toDateUtms } = req.query;
  res.json(multiTenantDb.getDashboardAnalytics(tid, fromDateUtms, toDateUtms));
});

// GET /api/Reports/profit-loss
app.get('/api/Reports/profit-loss', (req, res) => {
  const tid = resolveTenantId(req);
  const { fromDateUtms, toDateUtms } = req.query;
  const analytics = multiTenantDb.getDashboardAnalytics(tid, fromDateUtms, toDateUtms);
  res.json(analytics.profitLoss);
});

// ============================================================================
// PLATFORM & DEVELOPER CONTROL PANEL APIS (SUPERADMIN)
// ============================================================================

// Overview Dashboard
app.get('/api/platform/overview', (req, res) => {
  res.json(multiTenantDb.getPlatformOverview());
});

// Tenant List
app.get('/api/platform/tenants', (req, res) => {
  res.json(multiTenantDb.getAllTenants());
});

// Create New Cooperative Wizard
app.post('/api/platform/tenants', (req, res) => {
  try {
    const created = multiTenantDb.createTenant(req.body);
    recordActivity(req, {
      action: 'PLATFORM_CREATE_COOPERATIVE',
      category: 'System Configuration',
      actionLabelNe: 'नयाँ सहकारी दर्ता',
      actionLabelEn: 'Created New Cooperative',
      details: `Created new cooperative "${created.tenant.organizationName}" (${created.tenant.name}) with plan ${created.tenant.planId}`,
      referenceId: `#${created.tenant.id}`
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Edit Tenant Details
app.put('/api/platform/tenants/:id', (req, res) => {
  try {
    const updated = multiTenantDb.updateTenant(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Tenant not found' });
    recordActivity(req, {
      action: 'PLATFORM_UPDATE_COOPERATIVE',
      category: 'System Configuration',
      actionLabelNe: 'सहकारी विवरण अद्यावधिक',
      actionLabelEn: 'Updated Cooperative Profile',
      details: `Updated cooperative profile #${req.params.id} (${updated.organizationName})`,
      referenceId: `#${req.params.id}`
    });
    res.json({ success: true, tenant: updated, ...updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Tenant Status (Active / Suspended / Offboarding)
app.put('/api/platform/tenants/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const updated = multiTenantDb.updateTenantStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'Tenant not found' });
    recordActivity(req, {
      action: 'PLATFORM_TENANT_STATUS',
      category: 'System Configuration',
      actionLabelNe: 'सहकारी स्थिति परिवर्तन',
      actionLabelEn: 'Updated Cooperative Status',
      details: `Changed cooperative status to ${status} for #${req.params.id}`,
      referenceId: `#${req.params.id}`
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Tenant
app.delete('/api/platform/tenants/:id', (req, res) => {
  try {
    const success = multiTenantDb.deleteTenant(req.params.id);
    if (!success) return res.status(404).json({ error: 'Tenant not found' });
    recordActivity(req, {
      action: 'PLATFORM_DELETE_COOPERATIVE',
      category: 'System Configuration',
      actionLabelNe: 'सहकारी खारेज गरियो',
      actionLabelEn: 'Deleted Cooperative',
      details: `Deleted cooperative tenant #${req.params.id}`,
      referenceId: `#${req.params.id}`
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Full Tenant Profile Details
app.get('/api/platform/tenants/:id', (req, res) => {
  const profile = multiTenantDb.getTenantProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Tenant not found' });
  res.json(profile);
});

// Tenant Users
app.get('/api/platform/tenants/:id/users', (req, res) => {
  res.json(multiTenantDb.getTenantUsers(req.params.id));
});

app.post('/api/platform/tenants/:id/users', (req, res) => {
  try {
    const user = multiTenantDb.addUserToTenant(req.params.id, req.body);
    recordActivity(req, {
      action: 'PLATFORM_CREATE_TENANT_USER',
      category: 'System Configuration',
      actionLabelNe: 'सहकारी प्रयोगकर्ता थपियो',
      actionLabelEn: 'Added Cooperative User',
      details: `Added user ${user.name} (@${user.username}) to tenant #${req.params.id}`,
      referenceId: `USR-${user.id}`
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/platform/tenants/:id/users/:userId', (req, res) => {
  try {
    const updated = multiTenantDb.updateTenantUser(req.params.id, req.params.userId, req.body);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    recordActivity(req, {
      action: 'PLATFORM_UPDATE_TENANT_USER',
      category: 'System Configuration',
      actionLabelNe: 'प्रयोगकर्ता विवरण अद्यावधिक',
      actionLabelEn: 'Updated Cooperative User',
      details: `Updated user ${updated.name} (@${updated.username}) in tenant #${req.params.id}`,
      referenceId: `USR-${updated.id}`
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/platform/tenants/:id/users/:userId', (req, res) => {
  const success = multiTenantDb.removeUserFromTenant(req.params.id, req.params.userId);
  if (success) {
    recordActivity(req, {
      action: 'PLATFORM_REMOVE_TENANT_USER',
      category: 'System Configuration',
      actionLabelNe: 'प्रयोगकर्ता हटाइयो',
      actionLabelEn: 'Removed Cooperative User',
      details: `Removed user #${req.params.userId} from tenant #${req.params.id}`,
      referenceId: `USR-${req.params.userId}`
    });
  }
  res.json({ success });
});

// Tenant Payments / Billings
app.get('/api/platform/tenants/:id/payments', (req, res) => {
  res.json(multiTenantDb.getTenantPayments(req.params.id));
});

app.post('/api/platform/tenants/:id/payments', (req, res) => {
  const payment = multiTenantDb.recordTenantPayment(req.params.id, req.body);
  recordActivity(req, {
    action: 'PLATFORM_RECORD_PAYMENT',
    category: 'System Configuration',
    actionLabelNe: 'सदस्यता भुक्तानी दर्ता',
    actionLabelEn: 'Recorded Subscription Payment',
    details: `Recorded subscription payment of NPR ${payment.amount} for tenant #${req.params.id}`,
    referenceId: payment.invoiceNo || `BILL-${payment.id}`
  });
  res.status(201).json(payment);
});

app.delete('/api/platform/tenants/:id/payments/:paymentId', (req, res) => {
  const success = multiTenantDb.deleteTenantPayment(req.params.id, req.params.paymentId);
  if (success) {
    recordActivity(req, {
      action: 'PLATFORM_DELETE_PAYMENT',
      category: 'System Configuration',
      actionLabelNe: 'भुक्तानी अभिलेख मेटाइयो',
      actionLabelEn: 'Deleted Subscription Payment',
      details: `Deleted billing record #${req.params.paymentId} for tenant #${req.params.id}`,
      referenceId: `BILL-${req.params.paymentId}`
    });
  }
  res.json({ success });
});

// Subscription Extension
app.post('/api/platform/tenants/:id/subscription/extend', (req, res) => {
  const tenant = multiTenantDb.extendSubscription(req.params.id, req.body);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  recordActivity(req, {
    action: 'PLATFORM_EXTEND_SUBSCRIPTION',
    category: 'System Configuration',
    actionLabelNe: 'सदस्यता अवधि थप',
    actionLabelEn: 'Extended Subscription',
    details: `Extended subscription for ${tenant.organizationName || `tenant #${req.params.id}`}`,
    referenceId: `#${req.params.id}`
  });
  res.json({ success: true, tenant });
});

// Toggle Module Flag
app.post('/api/platform/tenants/:id/toggle-module', (req, res) => {
  const key = req.body.moduleName || req.body.module;
  if (!key) return res.status(400).json({ error: 'Module name is required' });
  const tenant = multiTenantDb.toggleModule(req.params.id, key, req.body.enabled);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  recordActivity(req, {
    action: 'PLATFORM_TOGGLE_MODULE',
    category: 'System Configuration',
    actionLabelNe: 'मोड्युल स्थिति परिवर्तन',
    actionLabelEn: 'Toggled Tenant Module',
    details: `Set module "${key}" = ${Boolean(tenant.modules?.[key])} for tenant #${req.params.id}`,
    referenceId: `${req.params.id}:${key}`
  });
  res.json({
    success: true,
    module: key,
    enabled: Boolean(tenant.modules?.[key]),
    modules: tenant.modules,
    tenant
  });
});

// Domains
app.get('/api/platform/domains', (req, res) => {
  res.json(multiTenantDb.getPlatformDomains());
});

app.post('/api/platform/domains', (req, res) => {
  try {
    const dom = multiTenantDb.addCustomDomain(req.body.tenantId, req.body.domain, req.body.type || 'custom');
    recordActivity(req, {
      action: 'PLATFORM_ADD_DOMAIN',
      category: 'System Configuration',
      actionLabelNe: 'कस्टम डोमेन थपियो',
      actionLabelEn: 'Added Custom Domain',
      details: `Added domain "${dom.domain}" (${dom.type}) for tenant #${dom.tenantId}`,
      referenceId: dom.domain
    });
    res.status(201).json({ success: true, domain: dom });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/platform/domains/verify', (req, res) => {
  try {
    const target = req.body.domainId || req.body.domain;
    const domain = multiTenantDb.verifyDomain(target);
    recordActivity(req, {
      action: 'PLATFORM_VERIFY_DOMAIN',
      category: 'System Configuration',
      actionLabelNe: 'डोमेन प्रमाणित',
      actionLabelEn: 'Verified Domain',
      details: `Verified domain "${domain?.domain || target}"`,
      referenceId: String(domain?.domain || target)
    });
    res.json({ success: true, domain });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Plans
app.get('/api/platform/subscriptions', (req, res) => {
  res.json(multiTenantDb.getPlatformPlans());
});

app.put('/api/platform/plans/:id', (req, res) => {
  const updated = multiTenantDb.updatePlan(req.params.id, req.body);
  recordActivity(req, {
    action: 'PLATFORM_UPDATE_PLAN',
    category: 'System Configuration',
    actionLabelNe: 'योजना विवरण अद्यावधिक',
    actionLabelEn: 'Updated Subscription Plan',
    details: `Updated subscription plan "${updated?.name || req.params.id}"`,
    referenceId: req.params.id
  });
  res.json({ success: true, plan: updated });
});

app.post('/api/platform/plans', (req, res) => {
  const created = multiTenantDb.createPlan(req.body);
  recordActivity(req, {
    action: 'PLATFORM_CREATE_PLAN',
    category: 'System Configuration',
    actionLabelNe: 'नयाँ योजना सिर्जना',
    actionLabelEn: 'Created Subscription Plan',
    details: `Created subscription plan "${created?.name || created?.id}"`,
    referenceId: created?.id
  });
  res.status(201).json({ success: true, plan: created });
});

// Renewals
app.get('/api/platform/renewals', (req, res) => {
  res.json(multiTenantDb.getAllRenewals(req.query.status));
});

app.post('/api/platform/renewals/:id/approve', (req, res) => {
  try {
    const renewal = multiTenantDb.approveRenewalRequest(req.params.id, req.user);
    recordActivity(req, {
      action: 'PLATFORM_APPROVE_RENEWAL',
      category: 'System Configuration',
      actionLabelNe: 'नवीकरण अनुरोध स्वीकृत',
      actionLabelEn: 'Approved Renewal Request',
      details: `Approved renewal #${req.params.id} for tenant #${renewal?.tenantId || ''}`,
      referenceId: `REN-${req.params.id}`
    });
    res.json({ success: true, renewal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/platform/renewals/:id/reject', (req, res) => {
  try {
    const renewal = multiTenantDb.rejectRenewalRequest(req.params.id, req.user, req.body);
    recordActivity(req, {
      action: 'PLATFORM_REJECT_RENEWAL',
      category: 'System Configuration',
      actionLabelNe: 'नवीकरण अनुरोध अस्वीकृत',
      actionLabelEn: 'Rejected Renewal Request',
      details: `Rejected renewal #${req.params.id} (${req.body.reason || 'No reason'})`,
      referenceId: `REN-${req.params.id}`
    });
    res.json({ success: true, renewal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Payment Config
app.get('/api/platform/payment-config', (req, res) => {
  res.json(multiTenantDb.getPaymentConfig());
});

app.put('/api/platform/payment-config', (req, res) => {
  const updated = multiTenantDb.updatePaymentConfig(req.body);
  recordActivity(req, {
    action: 'PLATFORM_UPDATE_PAYMENT_CONFIG',
    category: 'System Configuration',
    actionLabelNe: 'भुक्तानी सेटिङ अद्यावधिक',
    actionLabelEn: 'Updated Payment Config',
    details: 'Updated platform subscription payment gateway configuration'
  });
  res.json({ success: true, paymentConfig: updated });
});

// Notifications
app.get('/api/platform/notifications', (req, res) => {
  res.json(multiTenantDb.getPlatformNotifications());
});

app.post('/api/platform/notifications/:id/read', (req, res) => {
  const success = multiTenantDb.markNotificationRead(req.params.id);
  if (success) {
    recordActivity(req, {
      action: 'PLATFORM_MARK_NOTIFICATION_READ',
      category: 'System Configuration',
      actionLabelNe: 'सूचना पढिएको चिन्ह',
      actionLabelEn: 'Marked Notification Read',
      details: `Marked platform notification #${req.params.id} as read`,
      referenceId: `NOTIF-${req.params.id}`
    });
  }
  res.json({ success });
});

// Platform Audit Logs
app.get('/api/platform/audit-logs', (req, res) => {
  res.json(multiTenantDb.platform.auditLogs || []);
});

// Support Grants
app.get('/api/platform/support-grants', (req, res) => {
  res.json(multiTenantDb.platform.supportGrants || []);
});

app.post('/api/platform/support-grant', (req, res) => {
  const grant = multiTenantDb.createSupportGrant(req.body);
  recordActivity(req, {
    action: 'PLATFORM_SUPPORT_GRANT',
    category: 'Security & Auth',
    actionLabelNe: 'सपोर्ट पहुँच प्रदान',
    actionLabelEn: 'Issued Support Access Grant',
    details: `Created support grant for tenant #${grant.tenantId || req.body.tenantId || ''}`,
    referenceId: grant?.id ? `GRANT-${grant.id}` : null
  });
  res.status(201).json(grant);
});

// ============================================================================
// 12. TENANTS & SUBSCRIPTIONS (SUPERADMIN) APIS
// ============================================================================

// GET /api/Tenant
app.get('/api/Tenant', (req, res) => {
  const list = multiTenantDb.platform.tenants.filter(t => !t.isDeleted);
  res.json({ totalCount: list.length, items: list });
});

// GET /api/Tenant/:tenantId
app.get('/api/Tenant/:tenantId', (req, res) => {
  const tenant = multiTenantDb.platform.tenants.find(t => t.id === Number(req.params.tenantId) && !t.isDeleted);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  res.json(tenant);
});

// POST /api/Tenant
app.post('/api/Tenant', (req, res) => {
  const newTenant = {
    id: Date.now(),
    name: req.body.name || `dairy_${Date.now()}`,
    host: req.body.host || '',
    organizationName: req.body.organizationName || 'New Dairy Cooperative',
    address: req.body.address || '',
    timezone: req.body.timezone || 'Asia/Kathmandu',
    expirationDateTimeUtms: Date.now() + 365 * 86400000,
    subscriptionAmount: Number(req.body.subscriptionAmount) || 30000,
    isDeleted: false
  };

  multiTenantDb.platform.tenants.push(newTenant);
  multiTenantDb.savePlatform();
  recordActivity(req, {
    action: 'CREATE_TENANT',
    category: 'System Configuration',
    actionLabelNe: 'नयाँ सहकारी थपियो',
    actionLabelEn: 'Created Cooperative Tenant',
    details: `Created cooperative "${newTenant.organizationName}" (${newTenant.name})`,
    referenceId: `#${newTenant.id}`
  });
  res.status(201).json(newTenant);
});

// PUT /api/Tenant/:tenantId
app.put('/api/Tenant/:tenantId', (req, res) => {
  const idx = multiTenantDb.platform.tenants.findIndex(t => t.id === Number(req.params.tenantId));
  if (idx === -1) return res.status(404).json({ error: 'Tenant not found' });

  multiTenantDb.platform.tenants[idx] = {
    ...multiTenantDb.platform.tenants[idx],
    ...req.body,
    id: Number(req.params.tenantId)
  };
  multiTenantDb.savePlatform();
  recordActivity(req, {
    action: 'UPDATE_TENANT',
    category: 'System Configuration',
    actionLabelNe: 'सहकारी विवरण अद्यावधिक',
    actionLabelEn: 'Updated Cooperative Settings',
    details: `Updated tenant settings for "${multiTenantDb.platform.tenants[idx].organizationName}"`,
    referenceId: `#${req.params.tenantId}`
  });
  res.json(multiTenantDb.platform.tenants[idx]);
});

// POST /api/Tenant/renew
app.post('/api/Tenant/renew', (req, res) => {
  const { tenantId, extendedMonths = 12, amountPaid = 35000, remarks } = req.body;
  const tenant = multiTenantDb.platform.tenants.find(t => t.id === Number(tenantId));
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const currentExpiry = Math.max(Date.now(), tenant.expirationDateTimeUtms || Date.now());
  tenant.expirationDateTimeUtms = currentExpiry + Number(extendedMonths) * 30 * 86400000;

  multiTenantDb.platform.billings.push({
    id: Date.now(),
    tenantId: tenant.id,
    amount: Number(amountPaid),
    remarks: remarks || `सदस्यता नवीकरण (${extendedMonths} महिना)`,
    dateTimeUtms: Date.now(),
    paymentMethod: 2,
    isDeleted: false
  });

  multiTenantDb.savePlatform();
  recordActivity(req, {
    tenantId: tenant.id,
    action: 'RENEW_TENANT_SUBSCRIPTION',
    category: 'System Configuration',
    actionLabelNe: 'सदस्यता नवीकरण',
    actionLabelEn: 'Renewed Cooperative Subscription',
    details: `Renewed ${tenant.organizationName} by ${extendedMonths} months (NPR ${Number(amountPaid)})`,
    referenceId: `#${tenant.id}`
  });
  res.json({ success: true, tenant });
});

// ============================================================================
// 13. UNITS OF MEASUREMENT APIS
// ============================================================================

// GET /api/Unit
app.get('/api/Unit', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const list = (tData.units || []).filter(u => !u.isDeleted);
  res.json({ totalCount: list.length, items: list });
});

// POST /api/Unit
app.post('/api/Unit', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  if (!tData.units) tData.units = [];

  const newUnit = {
    id: Date.now(),
    name: req.body.name || 'Unit',
    nameInNepali: req.body.nameInNepali || req.body.name || 'एकाइ',
    code: req.body.code || 'U',
    isDeleted: false
  };

  tData.units.push(newUnit);
  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'CREATE_UNIT',
    category: 'System Configuration',
    actionLabelNe: 'मापन एकाइ थपियो',
    actionLabelEn: 'Added Measurement Unit',
    details: `Added unit "${newUnit.name}" (${newUnit.code})`,
    referenceId: `UNIT-${newUnit.id}`
  });
  res.status(201).json(newUnit);
});

// DELETE /api/Unit/:unitId
app.delete('/api/Unit/:unitId', (req, res) => {
  const tid = resolveTenantId(req);
  const tData = multiTenantDb.getTenantData(tid);
  const u = (tData.units || []).find(unit => unit.id === Number(req.params.unitId));
  if (!u) return res.status(404).json({ error: 'Unit not found' });

  u.isDeleted = true;
  multiTenantDb.saveTenantData(tid, tData);
  recordActivity(req, {
    action: 'DELETE_UNIT',
    category: 'System Configuration',
    actionLabelNe: 'मापन एकाइ हटाइयो',
    actionLabelEn: 'Deleted Measurement Unit',
    details: `Deleted unit "${u.name}" (${u.code})`,
    referenceId: `UNIT-${u.id}`
  });
  res.json({ success: true });
});

// ============================================================================
// 14. USER MANAGEMENT APIS
// ============================================================================

// GET /api/UserManager
app.get('/api/UserManager', (req, res) => {
  const hasTenantHeader = req.headers['x-tenant-id'] !== undefined;
  const tid = hasTenantHeader ? resolveTenantId(req) : null;
  const list = multiTenantDb.platform.users
    .filter(u => !u.isDeleted && (tid === null || Number(u.tenantId) === Number(tid)))
    .map(({ passwordHash, ...safeUser }) => ({
      ...safeUser,
      username: deriveUserHandle(safeUser.username, safeUser.email, safeUser.name)
    }));
  res.json({ totalCount: list.length, items: list });
});

// GET /api/UserManager/UserRole
app.get('/api/UserManager/UserRole', (req, res) => {
  res.json([
    { id: 1, name: 'SuperAdmin' },
    { id: 2, name: 'Admin' },
    { id: 3, name: 'User' }
  ]);
});

// POST /api/UserManager
app.post('/api/UserManager', (req, res) => {
  const { email = '', username, name, password = 'Password123', roles = ['User'], tenantId } = req.body;
  const rawIdentifier = (username || email || '').trim();
  if (!rawIdentifier || !name || !String(name).trim()) {
    return res.status(400).json({ error: 'Username and name are required' });
  }

  const resolvedTenantId = Number(tenantId) || resolveTenantId(req);
  const resolvedEmail = String(email || '').trim().toLowerCase();
  let resolvedUsername;
  try {
    resolvedUsername = multiTenantDb.assertUniqueUsername(
      deriveUserHandle(username, resolvedEmail, name)
    );
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const newUser = {
    id: Date.now(),
    tenantId: resolvedTenantId,
    username: resolvedUsername,
    email: resolvedEmail,
    name: String(name).trim(),
    passwordHash: hashPassword(password),
    roles: Array.isArray(roles) ? roles : [roles],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: Date.now()
  };

  multiTenantDb.platform.users.push(newUser);
  multiTenantDb.savePlatform();
  recordActivity(req, {
    action: 'CREATE_USER',
    category: 'System Configuration',
    actionLabelNe: 'नयाँ प्रयोगकर्ता सिर्जना',
    actionLabelEn: 'Created User Account',
    details: `Created user ${newUser.name} (@${newUser.username}, roles: ${newUser.roles.join(', ')})`,
    referenceId: `USR-${newUser.id}`
  });
  const { passwordHash, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

// POST /api/UserManager/reset-password
app.post('/api/UserManager/reset-password', (req, res) => {
  const { userId, newPassword = 'Password123' } = req.body;
  const user = multiTenantDb.platform.users.find(u => u.id === Number(userId));
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.passwordHash = hashPassword(newPassword);
  multiTenantDb.savePlatform();
  recordActivity(req, {
    action: 'RESET_USER_PASSWORD',
    category: 'Security & Auth',
    actionLabelNe: 'पासवर्ड रिसेट',
    actionLabelEn: 'Reset User Password',
    details: `Reset password for ${user.name} (@${deriveUserHandle(user.username, user.email, user.name)})`,
    referenceId: `USR-${user.id}`
  });
  res.json({ success: true });
});

// POST /api/UserManager/toggle-status
app.post('/api/UserManager/toggle-status', (req, res) => {
  const { userId } = req.body;
  const user = multiTenantDb.platform.users.find(u => u.id === Number(userId));
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.isActive = !user.isActive;
  multiTenantDb.savePlatform();
  recordActivity(req, {
    action: 'TOGGLE_USER_STATUS',
    category: 'Security & Auth',
    actionLabelNe: 'प्रयोगकर्ता स्थिति परिवर्तन',
    actionLabelEn: 'Toggled User Status',
    details: `${user.isActive ? 'Activated' : 'Deactivated'} user ${user.name} (@${deriveUserHandle(user.username, user.email, user.name)})`,
    referenceId: `USR-${user.id}`
  });
  res.json({ success: true, isActive: user.isActive });
});

// ============================================================================
// 15. TENANT SUBSCRIPTION BILLING APIS
// ============================================================================

// GET /api/Billing
app.get('/api/Billing', (req, res) => {
  const list = multiTenantDb.platform.billings.filter(b => !b.isDeleted);
  res.json({ totalCount: list.length, items: list });
});

// Health check endpoint for Render / load balancers
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================================================
// STATIC ASSET SERVING IN PRODUCTION
// ============================================================================
const distBuildDir = path.join(__dirname, '..', 'client', 'dist');
const legacyBuildDir = path.join(__dirname, '..', 'build');
const clientDist = fs.existsSync(distBuildDir)
  ? distBuildDir
  : fs.existsSync(legacyBuildDir)
    ? legacyBuildDir
    : null;

if (clientDist) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start HTTP Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🥛 Dairy ERP 2.0 API Server running on http://0.0.0.0:${PORT}`);
});
