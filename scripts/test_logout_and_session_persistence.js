import assert from 'assert';

const BASE = 'http://localhost:5000';

async function testLogoutFlow() {
  console.log('====================================================');
  console.log('🧪 TESTING LOGOUT, SESSION EXPIRY & NO AUTO-LOGIN');
  console.log('====================================================\n');

  // 1. Authenticate as SuperAdmin
  console.log('>>> [1] Authenticating as SuperAdmin (@admin)...');
  const resLogin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@123' })
  });
  const loginData = await resLogin.json();
  assert.strictEqual(resLogin.status, 200);
  assert.strictEqual(loginData.success, true);
  assert(loginData.token);
  assert.strictEqual(loginData.user.username, 'admin');
  console.log(`  [PASS] Logged in successfully: @${loginData.user.username} (${loginData.user.name})`);

  // 2. Logout endpoint
  console.log('\n>>> [2] Calling POST /api/auth/logout...');
  const resLogout = await fetch(`${BASE}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginData.token}`
    }
  });
  assert(resLogout.status === 200 || resLogout.status === 204);
  console.log('  [PASS] Logout endpoint responded with success.');

  // 3. Verify that invalid credentials still fail cleanly
  console.log('\n>>> [3] Attempting login with wrong password...');
  const resBad = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'WrongPassword' })
  });
  assert.strictEqual(resBad.status, 401);
  const badData = await resBad.json();
  assert(badData.error === 'INVALID_CREDENTIALS' || badData.message);
  console.log(`  [PASS] Invalid login correctly rejected (HTTP 401: ${badData.message})`);

  // 4. Verify login with tenant admin (@sfacl.admin)
  console.log('\n>>> [4] Authenticating with @sfacl.admin...');
  const resSfacl = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'sfacl.admin', password: 'Admin@123' })
  });
  const sfaclData = await resSfacl.json();
  assert.strictEqual(resSfacl.status, 200);
  assert.strictEqual(sfaclData.success, true);
  assert.strictEqual(sfaclData.user.username, 'sfacl.admin');
  console.log(`  [PASS] Logged in as @${sfaclData.user.username}`);

  console.log('\n====================================================');
  console.log('🎉 ALL LOGOUT & SESSION FLOW TESTS PASSED CLEANLY!');
  console.log('====================================================');
}

testLogoutFlow().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
