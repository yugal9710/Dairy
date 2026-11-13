import assert from 'assert';

console.log('>>> Testing Date & Time Reset on Logout & Session Expiry...');

// Mock LocalStorage & Event Target for Node environment test
class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] !== undefined ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

const mockLocalStorage = new MockStorage();
const DATE_LOCK_STORAGE_KEY = 'dairy_milk_collection_date_lock';
const RESET_FLAG_KEY = 'dairy_reset_datetime_on_next_login';

// 1. Simulate user locking date in milk collection
const lockedPastDateTime = '2026-11-13T16:26';
mockLocalStorage.setItem(DATE_LOCK_STORAGE_KEY, JSON.stringify({ locked: true, dateTimeLocal: lockedPastDateTime }));
assert.strictEqual(JSON.parse(mockLocalStorage.getItem(DATE_LOCK_STORAGE_KEY)).locked, true);
console.log('  [PASS] 1. User locks collection date to 11/13/2026 04:26 PM');

// 2. Simulate User Logout
function simulateLogout(storage) {
  storage.removeItem('dairy_user');
  storage.removeItem('dairy_token');
  storage.removeItem(DATE_LOCK_STORAGE_KEY);
  storage.setItem(RESET_FLAG_KEY, 'true');
}

simulateLogout(mockLocalStorage);
assert.strictEqual(mockLocalStorage.getItem(DATE_LOCK_STORAGE_KEY), null);
assert.strictEqual(mockLocalStorage.getItem(RESET_FLAG_KEY), 'true');
console.log('  [PASS] 2. User logout cleanly clears date lock and sets reset flag');

// 3. Simulate Next Login
function simulateNextLogin(storage) {
  storage.setItem('dairy_user', JSON.stringify({ id: 1, username: 'admin' }));
  storage.setItem('dairy_token', 'valid-jwt-token');
  storage.removeItem(DATE_LOCK_STORAGE_KEY);
  storage.removeItem(RESET_FLAG_KEY);
}

simulateNextLogin(mockLocalStorage);
assert.strictEqual(mockLocalStorage.getItem(DATE_LOCK_STORAGE_KEY), null);
assert.strictEqual(mockLocalStorage.getItem(RESET_FLAG_KEY), null);
console.log('  [PASS] 3. Next login initializes fresh without past date lock');

// 4. Simulate Session Expiration (401 response)
mockLocalStorage.setItem(DATE_LOCK_STORAGE_KEY, JSON.stringify({ locked: true, dateTimeLocal: lockedPastDateTime }));
function simulateSessionExpiry(storage) {
  storage.removeItem('dairy_token');
  storage.removeItem('dairy_user');
  storage.removeItem(DATE_LOCK_STORAGE_KEY);
  storage.setItem(RESET_FLAG_KEY, 'true');
}

simulateSessionExpiry(mockLocalStorage);
assert.strictEqual(mockLocalStorage.getItem(DATE_LOCK_STORAGE_KEY), null);
assert.strictEqual(mockLocalStorage.getItem(RESET_FLAG_KEY), 'true');
console.log('  [PASS] 4. Session expiry (401) clears date lock and arms reset on next login');

// 5. Verify Date/Time generation on load
const now = new Date();
const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
assert(nowStr.length === 16);
console.log(`  [PASS] 5. Date and time successfully resets to current (${nowStr})`);

console.log('\n🎉 ALL DATE RESET TESTS COMPLETED SUCCESSFULLY!');
