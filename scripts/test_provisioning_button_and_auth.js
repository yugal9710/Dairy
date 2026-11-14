import assert from 'assert';

const BASE = 'http://localhost:5000';

async function testProvisioning() {
  console.log('====================================================');
  console.log('🧪 TESTING COOPERATIVE PROVISIONING & RESILIENT AUTH');
  console.log('====================================================\n');

  const testSlug = `test-coop-${Date.now().toString().slice(-4)}`;
  const newCoopPayload = {
    name: 'कञ्चनजंघा दुग्ध उत्पादक सहकारी संस्था',
    slug: testSlug,
    address: 'ताप्लेजुङ-१, कोशी',
    phone: '9841234567',
    planId: 'plan-professional',
    billingCycle: 'Yearly',
    totalAmountDue: 75000,
    initialPayment: 35000,
    adminUsername: `kanchan_${Date.now().toString().slice(-4)}`,
    adminPassword: 'Password@123',
    managerName: 'Ram Bahadur Limbu',
    enablePOS: true,
    enableProcessing: true
  };

  // 1. Test successful provisioning with platform owner headers
  console.log('>>> [1] Testing successful provisioning with x-tenant-id: 1 & sfacl.admin...');
  const res1 = await fetch(`${BASE}/api/platform/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': '1',
      'x-username': 'sfacl.admin'
    },
    body: JSON.stringify(newCoopPayload)
  });
  const data1 = await res1.json();
  assert.strictEqual(res1.status, 201, `Expected HTTP 201 but got ${res1.status}`);
  assert(data1.tenant && data1.tenant.id, 'Tenant should have an ID');
  assert.strictEqual(data1.tenant.name, testSlug);
  console.log(`  [PASS] Successfully provisioned tenant #${data1.tenant.id} (${data1.tenant.organizationName})`);

  // 2. Test duplicate slug handling (should return 400 with clean error message, not hang)
  console.log('\n>>> [2] Testing duplicate slug error handling...');
  const resDuplicate = await fetch(`${BASE}/api/platform/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': '1',
      'x-username': 'sfacl.admin'
    },
    body: JSON.stringify(newCoopPayload)
  });
  const dupData = await resDuplicate.json();
  assert.strictEqual(resDuplicate.status, 400, `Expected HTTP 400 but got ${resDuplicate.status}`);
  assert(dupData.error && dupData.error.includes('already exists'), 'Error message should clearly state slug exists');
  console.log(`  [PASS] Duplicate slug correctly rejected with: "${dupData.error}"`);

  // 3. Test non-owner access rejection
  console.log('\n>>> [3] Testing non-owner rejection...');
  const resForbidden = await fetch(`${BASE}/api/platform/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': '2',
      'x-username': 'himali.admin'
    },
    body: JSON.stringify({ name: 'Hacked Coop' })
  });
  assert.strictEqual(resForbidden.status, 403, `Expected HTTP 403 Forbidden`);
  console.log(`  [PASS] Non-owner forbidden from provisioning (HTTP 403)`);

  // 4. Verify tenant exists in directory
  console.log('\n>>> [4] Verifying tenant in platform list...');
  const resList = await fetch(`${BASE}/api/platform/tenants`, {
    headers: { 'x-tenant-id': '1', 'x-username': 'sfacl.admin' }
  });
  const list = await resList.json();
  const created = list.find(t => t.id === data1.tenant.id);
  assert(created, 'Newly created tenant should exist in tenant list');
  assert.strictEqual(created.status, 'Active');
  console.log(`  [PASS] Tenant verified in directory (Active status)`);

  console.log('\n====================================================');
  console.log('🎉 ALL PROVISIONING VERIFICATION CHECKS PASSED!');
  console.log('====================================================');
}

testProvisioning().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
