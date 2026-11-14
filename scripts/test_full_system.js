import assert from 'assert';

const BASE = 'http://localhost:5000';

async function req(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE}${url}`;
  const { headers, ...restOptions } = options;
  const res = await fetch(fullUrl, {
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    ...restOptions
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

function getItems(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 DAIRY ERP 2.0 - FULL SYSTEM COMPREHENSIVE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    return fn()
      .then(() => {
        console.log(`  [PASS] Test ${total}: ${name}`);
        passed++;
      })
      .catch(err => {
        console.error(`  [FAIL] Test ${total}: ${name}`);
        console.error('         Error:', err.message);
        throw err;
      });
  }

  // ----------------------------------------------------
  // TEST GROUP 1: AUTHENTICATION FOR ALL 3 TENANTS & 7 USERS
  // ----------------------------------------------------
  console.log('>>> GROUP 1: Multi-Tenant Authentication (3 Tenants, 7 Users)');

  let sfaclSuperToken, sfaclAdminToken, sfaclStaffToken;
  let himaliAdminToken, himaliStaffToken;
  let annaAdminToken, annaStaffToken;

  await test('Login Tenant 1 SuperAdmin (@admin)', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.username, 'admin');
    assert.strictEqual(res.data.user.tenantId, 1);
    assert(res.data.user.roles.includes('SuperAdmin'));
    assert.strictEqual(res.data.activeTenant.name, 'sfacl');
    sfaclSuperToken = res.data.token;
  });

  await test('Login Tenant 1 Admin (@sfacl.admin)', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'sfacl.admin', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.username, 'sfacl.admin');
    assert.strictEqual(res.data.user.tenantId, 1);
    assert(res.data.user.roles.includes('SuperAdmin'));
    sfaclAdminToken = res.data.token;
  });

  await test('Login Tenant 1 Staff (@sfacl.staff)', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'sfacl.staff', password: 'Staff@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.username, 'sfacl.staff');
    assert.strictEqual(res.data.user.tenantId, 1);
    assert(res.data.user.roles.includes('User'));
    sfaclStaffToken = res.data.token;
  });

  await test('Login Tenant 2 Admin (@himali.admin)', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'himali.admin', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.username, 'himali.admin');
    assert.strictEqual(res.data.user.tenantId, 2);
    assert.strictEqual(res.data.activeTenant.name, 'himali');
    himaliAdminToken = res.data.token;
  });

  await test('Login Tenant 2 Staff (@himali.staff)', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'himali.staff', password: 'Staff@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.username, 'himali.staff');
    assert.strictEqual(res.data.user.tenantId, 2);
    himaliStaffToken = res.data.token;
  });

  await test('Login Tenant 3 Admin (@anna.admin)', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'anna.admin', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.username, 'anna.admin');
    assert.strictEqual(res.data.user.tenantId, 3);
    assert.strictEqual(res.data.activeTenant.name, 'annapurna');
    annaAdminToken = res.data.token;
  });

  await test('Login Tenant 3 Staff (@anna.staff)', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'anna.staff', password: 'Staff@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.username, 'anna.staff');
    assert.strictEqual(res.data.user.tenantId, 3);
    annaStaffToken = res.data.token;
  });

  await test('Reject invalid credentials', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'nb.superadmin', password: 'WrongPassword' })
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.error, 'INVALID_CREDENTIALS');
  });

  // ----------------------------------------------------
  // TEST GROUP 2: TENANT DATA ISOLATION
  // ----------------------------------------------------
  console.log('\n>>> GROUP 2: Tenant Data Isolation & Boundary Testing');

  await test('Verify Tenant 1 Customers (Kathmandu/Gaushala region)', async () => {
    const res = await req('/api/Customer?tenantId=1', {
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` }
    });
    assert.strictEqual(res.status, 200);
    const items = getItems(res.data);
    assert(items.length >= 9);
    assert(items.some(c => c.nameInEnglish.includes('Ram Bahadur') && (c.address.includes('काठमाडौं') || c.address.includes('गौशाला'))));
  });

  await test('Verify Tenant 2 Customers (Makwanpur region)', async () => {
    const res = await req('/api/Customer?tenantId=2', {
      headers: { 'x-tenant-id': '2', Authorization: `Bearer ${himaliAdminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const items = getItems(res.data);
    assert(items.length >= 9);
    assert(items.some(c => c.nameInEnglish.includes('Dil Bahadur') && c.address.includes('मकवानपुर')));
  });

  await test('Verify Tenant 3 Customers (Kaski/Pokhara region)', async () => {
    const res = await req('/api/Customer?tenantId=3', {
      headers: { 'x-tenant-id': '3', Authorization: `Bearer ${annaAdminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const items = getItems(res.data);
    assert(items.length >= 9);
    assert(items.some(c => c.nameInEnglish.includes('Tek Bahadur') && c.address.includes('कास्की')));
  });

  // ----------------------------------------------------
  // TEST GROUP 3: MILK COLLECTION MODULE & CALCULATIONS
  // ----------------------------------------------------
  console.log('\n>>> GROUP 3: Milk Collection Intake & FAT/SNF Rate Formula');

  let testCollectionId;

  await test('Add Milk Intake with automated FAT/SNF pricing', async () => {
    const body = {
      farmerId: 1,
      quantity: 20.0,
      shift: 0, // Morning
      fat: 4.5,
      snf: 8.2,
      dateTimeLocal: new Date().toISOString()
    };
    const res = await req('/api/MilkCollection', {
      method: 'POST',
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` },
      body: JSON.stringify(body)
    });
    console.log('Test 12 response:', res.status, res.data);
    assert(res.status === 201 || res.status === 200);
    testCollectionId = typeof res.data === 'object' ? res.data.id : res.data;
    assert(testCollectionId);
  });

  await test('Verify Milk Intake appears in collections list', async () => {
    const res = await req('/api/MilkCollection?tenantId=1', {
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` }
    });
    assert.strictEqual(res.status, 200);
    const items = getItems(res.data);
    const found = items.find(c => Number(c.id) === Number(testCollectionId));
    assert(found);
    assert.strictEqual(Number(found.quantity), 20.0);
    assert(Number(found.rate) > 0);
    assert.strictEqual(Number(found.totalPrice), Math.round(Number(found.rate) * 20.0 * 100) / 100);
  });

  await test('Update Milk Intake quantity and verify recalculation', async () => {
    const res = await req(`/api/MilkCollection/${testCollectionId}`, {
      method: 'PUT',
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` },
      body: JSON.stringify({ Quantity: 25.0, Fat: 4.5, Snf: 8.2, FatRate: 7.50, SnfRate: 4.00 })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(Number(res.data.quantity), 25.0);
    assert.strictEqual(Number(res.data.rate), 66.55); // (4.5*7.50) + (8.2*4.00) = 66.55
    assert.strictEqual(Number(res.data.totalPrice), 1663.75); // 25 * 66.55
  });

  // ----------------------------------------------------
  // TEST GROUP 4: CUSTOMER DIRECTORY & NEPAL ADDRESS FIELDS
  // ----------------------------------------------------
  console.log('\n>>> GROUP 4: Farmer / Customer Registration & Cascading Address');

  let newFarmerId;

  await test('Register new Farmer with Nepal cascading address', async () => {
    const body = {
      nameInNepali: 'कमल थापा मगर',
      nameInEnglish: 'Kamal Thapa Magar',
      customerType: 1, // Milk Supplier Farmer
      phone: '9841998877',
      address: 'धुलिखेल-३, काभ्रेपलाञ्चोक, बागमती प्रदेश',
      accountNumber: 'NABIL-0991823',
      province: 'Bagmati',
      district: 'Kavrepalanchok',
      municipality: 'Dhulikhel Municipality',
      ward: '3',
      remarks: 'नयाँ दर्ता भएको कृषक'
    };
    const res = await req('/api/Customer', {
      method: 'POST',
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` },
      body: JSON.stringify(body)
    });
    assert(res.status === 201 || res.status === 200);
    assert(res.data.id);
    assert(res.data.code);
    newFarmerId = res.data.id;
    assert.strictEqual(res.data.nameInEnglish, 'Kamal Thapa Magar');
  });

  await test('Check newly registered farmer in customer list', async () => {
    const res = await req(`/api/Customer/${newFarmerId}?tenantId=1`, {
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.nameInEnglish, 'Kamal Thapa Magar');
  });

  // ----------------------------------------------------
  // TEST GROUP 5: FAT & SNF PRICING CONFIGURATION
  // ----------------------------------------------------
  console.log('\n>>> GROUP 5: FAT & SNF Pricing Configuration');

  await test('Fetch current FAT/SNF rates', async () => {
    const res = await req('/api/MilkFatAndSnfConfiguration?tenantId=1', {
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.buyingFatPrice > 0);
    assert(res.data.buyingSnfPrice > 0);
  });

  await test('Update FAT/SNF rates and verify persistence', async () => {
    const res = await req('/api/MilkFatAndSnfConfiguration/1', {
      method: 'PUT',
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` },
      body: JSON.stringify({
        buyingFatPrice: 7.60,
        buyingSnfPrice: 4.10,
        sellingFatPrice: 9.10,
        sellingSnfPrice: 5.10,
        sellingPrice: 92.00
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(Number(res.data.buyingFatPrice), 7.60);
    assert.strictEqual(Number(res.data.buyingSnfPrice), 4.10);
  });

  // ----------------------------------------------------
  // TEST GROUP 6: FARMER PAYMENTS & LEDGER
  // ----------------------------------------------------
  console.log('\n>>> GROUP 6: Farmer Payouts & Ledger Statements');

  await test('Record Farmer payment disbursement slip', async () => {
    const body = {
      farmerId: 1,
      amount: 1500.00,
      paymentMethod: 0, // Cash
      referenceNumber: 'VCHR-TEST-001',
      remarks: 'दूध संकलन बापत नगद भुक्तानी'
    };
    const res = await req('/api/MilkCollectionPayment', {
      method: 'POST',
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` },
      body: JSON.stringify(body)
    });
    assert(res.status === 201 || res.status === 200);
    assert(res.data.id);
  });

  // ----------------------------------------------------
  // TEST GROUP 7: POS RETAIL SALES & CART CHECKOUT
  // ----------------------------------------------------
  console.log('\n>>> GROUP 7: POS Counter / Retail Sales & Inventory Depletion');

  await test('Checkout retail POS cart with discount and cash receipt', async () => {
    const body = {
      CustomerId: null,
      PaymentMethod: 0,
      OrderProducts: [
        { ProductId: 2, ProductName: 'पाश्चराइज्ड प्रशोधित दूध', Quantity: 4, UnitPrice: 50.00 },
        { ProductId: 3, ProductName: 'ताजा दही', Quantity: 2, UnitPrice: 120.00 }
      ],
      DiscountAmount: 20.00,
      PaidAmount: 420.00,
      Remarks: 'POS Counter Sale'
    };
    const res = await req('/api/Order', {
      method: 'POST',
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` },
      body: JSON.stringify(body)
    });
    assert(res.status === 201 || res.status === 200);
    assert(res.data.id);
    assert.strictEqual(Number(res.data.netAmount), 420.00);
  });

  // ----------------------------------------------------
  // TEST GROUP 8: SCHEDULED WHOLESALE ORDERS & DISPATCH
  // ----------------------------------------------------
  console.log('\n>>> GROUP 8: Wholesale Orders & Delivery Dispatch');

  let orderId;

  await test('Create Scheduled Wholesale Order with advance payment', async () => {
    const body = {
      customerId: 6,
      customerName: 'Hotel Namobuddha View',
      orderDateUtms: Date.now(),
      deliveryDateUtms: Date.now() + 86400000,
      deliveryAddress: 'धुलिखेल बजार, काभ्रे',
      status: 'Confirmed',
      totalAmount: 3750.00,
      paidAmount: 2000.00,
      balanceAmount: 1750.00,
      paymentMethod: 2,
      notes: 'बिहान ८ बजे अगावै पनिर डेलिभरी गर्नुपर्ने',
      items: [
        { productId: 4, productName: 'ताजा पनिर', quantity: 5, unitPrice: 750.00, totalPrice: 3750.00 }
      ]
    };
    const res = await req('/api/Order/future-order', {
      method: 'POST',
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` },
      body: JSON.stringify(body)
    });
    assert(res.status === 201 || res.status === 200);
    assert(res.data.id);
    orderId = res.data.id;
  });

  await test('Update Wholesale Order status to Delivered', async () => {
    const res = await req('/api/Order/status', {
      method: 'POST',
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` },
      body: JSON.stringify({ orderId, status: 'Delivered', isFutureOrder: true })
    });
    assert(res.status === 201 || res.status === 200);
  });

  // ----------------------------------------------------
  // TEST GROUP 9: INVENTORY & STOCK MANAGEMENT
  // ----------------------------------------------------
  console.log('\n>>> GROUP 9: Inventory Products & Stock Summary');

  await test('List products and stock summary', async () => {
    const res = await req('/api/Product?tenantId=1', {
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` }
    });
    assert.strictEqual(res.status, 200);
    const items = getItems(res.data);
    assert(items.length >= 7);
  });

  await test('Add new dairy product (Strawberry Lassi)', async () => {
    const body = {
      nameInEnglish: 'Strawberry Lassi',
      nameInNepali: 'स्ट्रबेरी लस्सी',
      unitId: 4,
      unitName: 'Pouch',
      sellingPrice: 60.00,
      costPrice: 42.00,
      reorderLevel: 20.0,
      description: 'ताजा स्ट्रबेरी स्वादको लस्सी'
    };
    const res = await req('/api/Product', {
      method: 'POST',
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` },
      body: JSON.stringify(body)
    });
    assert(res.status === 201 || res.status === 200);
    assert(res.data.id);
    assert.strictEqual(res.data.nameInEnglish, 'Strawberry Lassi');
  });

  // ----------------------------------------------------
  // TEST GROUP 10: PRODUCTION BATCHES & PROCESSING
  // ----------------------------------------------------
  console.log('\n>>> GROUP 10: Dairy Processing & Production Conversion');

  await test('Record production batch (Raw Milk -> Curd + Butter)', async () => {
    const body = {
      batchNumber: 'BATCH-TEST-99',
      productionDateUtms: Date.now(),
      status: 'Completed',
      inputRawMilkLiters: 150.0,
      wastageQuantity: 3.0,
      leakageLiters: 3.0,
      netProcessedMilkLiters: 147.0,
      leakagePercentage: 2.0,
      yieldRecoveryPercentage: 98.0,
      inputFat: 4.8,
      inputSnf: 8.4,
      location: 'Main Processing Plant',
      outputItems: [
        { productId: 3, productName: 'ताजा दही', quantity: 90.0, unit: 'Litre' },
        { productId: 6, productName: 'ताजा नौनी घिउ', quantity: 6.0, unit: 'Kilogram' }
      ],
      remarks: 'दही र नौनी प्रशोधन परीक्षण ब्याच'
    };
    const res = await req('/api/Production', {
      method: 'POST',
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      console.log('DEBUG TEST 25 ERROR:', res.status, res.data);
    }
    assert(res.status === 201 || res.status === 200);
    assert(res.data.id);
    assert.strictEqual(Number(res.data.inputRawMilkLiters), 150.0);
  });

  // ----------------------------------------------------
  // TEST GROUP 11: PROCUREMENT / SUPPLIER PURCHASES
  // ----------------------------------------------------
  console.log('\n>>> GROUP 11: Raw Material Procurement & Invoicing');

  await test('Record raw material purchase invoice from supplier', async () => {
    const body = {
      supplierName: 'Kavre Agro Packaging Suppliers',
      invoiceNumber: 'KAS-2026-101',
      purchaseDateUtms: Date.now(),
      paymentStatus: 1, // Full paid
      paymentMethod: 2, // Bank
      totalAmount: 1900.00,
      paidAmount: 1900.00,
      location: 'Central Storage',
      remarks: 'प्याकेजिङ प्लास्टिक तथा क्रेट खरिद',
      items: [
        { productId: 2, productName: 'Standard Pasteurized Milk', quantity: 50.0, unitPrice: 38.00, totalPrice: 1900.00, batchNumber: 'LOT-KAS-01' }
      ]
    };
    const res = await req('/api/Purchase', {
      method: 'POST',
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` },
      body: JSON.stringify(body)
    });
    console.log('Purchase response:', res.status, res.data);
    assert(res.status === 201 || res.status === 200);
    assert(res.data.id);
  });

  // ----------------------------------------------------
  // TEST GROUP 12: FINANCE & LEDGERS
  // ----------------------------------------------------
  console.log('\n>>> GROUP 12: Expenses, Cash/Bank Reconciliations & Ledgers');

  await test('Record operational expense voucher', async () => {
    const body = {
      category: 'Electricity',
      amount: 1200.00,
      paymentMethod: 2,
      recipient: 'NEA Dhulikhel Branch',
      referenceNumber: 'NEA-NOV-2026',
      remarks: 'चिलिङ सेन्टरको विद्युत बिल भुक्तानी'
    };
    const res = await req('/api/Finance/expenses', {
      method: 'POST',
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` },
      body: JSON.stringify(body)
    });
    assert(res.status === 201 || res.status === 200);
    assert(res.data.id);
  });

  await test('Verify Cash in Hand and Bank Balances', async () => {
    const res = await req('/api/Finance/cash-bank-summary?tenantId=1', {
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert(typeof res.data.cashBalance === 'number');
    assert(typeof res.data.bankBalance === 'number');
    assert(typeof res.data.totalBalance === 'number');
  });

  // ----------------------------------------------------
  // TEST GROUP 13: REPORTS & PROFIT/LOSS CALCULATIONS
  // ----------------------------------------------------
  console.log('\n>>> GROUP 13: Reports & Profit and Loss Statement');

  await test('Generate Profit & Loss (P&L) breakdown', async () => {
    const res = await req('/api/Reports/profit-loss?tenantId=1', {
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.totalSalesRevenue !== undefined);
    assert(res.data.totalOperatingExpenses !== undefined);
    assert(res.data.grossProfit !== undefined);
    assert(res.data.netProfit !== undefined);
  });

  // ----------------------------------------------------
  // TEST GROUP 14: SYSTEM SETTINGS & USER ROLES
  // ----------------------------------------------------
  console.log('\n>>> GROUP 14: System Settings & Role-Based User Provisioning');

  await test('List units of measurement', async () => {
    const res = await req('/api/Unit?tenantId=1', {
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` }
    });
    assert.strictEqual(res.status, 200);
    const items = getItems(res.data);
    assert(items.length >= 6);
  });

  const testAccUsername = `sfacl.acct_${Date.now().toString().slice(-4)}`;
  await test('Create new staff user with username and role in Settings', async () => {
    const body = {
      username: testAccUsername,
      name: 'Ramesh Adhikari',
      email: '',
      password: 'Admin@123',
      roles: ['Admin']
    };
    const res = await req('/api/UserManager', {
      method: 'POST',
      headers: { 'x-tenant-id': '1', Authorization: `Bearer ${sfaclSuperToken}` },
      body: JSON.stringify(body)
    });
    assert(res.status === 201 || res.status === 200);
    assert.strictEqual(res.data.username, testAccUsername);
    assert(res.data.roles.includes('Admin'));
  });

  await test(`Authenticate with newly created user (@${testAccUsername})`, async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: testAccUsername, password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.username, testAccUsername);
    assert(res.data.user.roles.includes('Admin'));
  });

  // ----------------------------------------------------
  // TEST GROUP 15: DEVELOPER CONSOLE & PLATFORM ENGINE
  // ----------------------------------------------------
  console.log('\n>>> GROUP 15: Multi-Cooperative Developer Control Panel');

  await test('Owner (Tenant 1 Admin) can access Developer Console', async () => {
    const res = await req('/api/platform/tenants', {
      headers: { 'x-tenant-id': '1', 'x-username': 'admin', Authorization: `Bearer ${sfaclSuperToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.length >= 3);
    const slugs = res.data.map(t => t.name);
    assert(slugs.includes('sfacl'));
    assert(slugs.includes('himali'));
    assert(slugs.includes('annapurna'));
  });

  await test('Non-owner Tenant 2 is blocked from Developer Console (HTTP 403 Forbidden)', async () => {
    const res = await req('/api/platform/tenants', {
      headers: { 'x-tenant-id': '2', 'x-username': 'himali.admin', Authorization: `Bearer ${himaliAdminToken}` }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.error, 'Forbidden');
  });

  await test('Non-owner Tenant 3 is blocked from Developer Console (HTTP 403 Forbidden)', async () => {
    const res = await req('/api/platform/overview', {
      headers: { 'x-tenant-id': '3', 'x-username': 'anna.admin', Authorization: `Bearer ${annaAdminToken}` }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.error, 'Forbidden');
  });

  await test('List platform subscription plans (Owner Only)', async () => {
    const res = await req('/api/platform/subscriptions', {
      headers: { 'x-tenant-id': '1', 'x-username': 'admin', Authorization: `Bearer ${sfaclSuperToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.plans.length >= 3);
  });

  await test('List platform audit logs (Owner Only)', async () => {
    const res = await req('/api/platform/audit-logs', {
      headers: { 'x-tenant-id': '1', 'x-username': 'admin', Authorization: `Bearer ${sfaclSuperToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
  });

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${total} AUTOMATED SYSTEM TESTS COMPLETED SUCCESSFULLY!`);
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
