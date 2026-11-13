import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'server', 'data');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');
const PLATFORM_FILE = path.join(DATA_DIR, 'platform.json');

console.log('>>> 1. Cleaning existing data and tenants...');
if (fs.existsSync(TENANTS_DIR)) {
  const files = fs.readdirSync(TENANTS_DIR);
  for (const f of files) {
    fs.unlinkSync(path.join(TENANTS_DIR, f));
    console.log(`Deleted tenant file: ${f}`);
  }
}
if (fs.existsSync(PLATFORM_FILE)) {
  fs.unlinkSync(PLATFORM_FILE);
  console.log('Deleted platform.json');
}

console.log('>>> 2. Initializing new 3-tenant database...');
// Dynamically import multiTenantDb
const { multiTenantDb: db } = await import('../server/multiTenantDb.js');

// Load tenants 1, 2, 3 to build their initial operational databases
const t1Data = db.getTenantData(1);
const t2Data = db.getTenantData(2);
const t3Data = db.getTenantData(3);

console.log('\n>>> 3. Verification of generated tenants & users:');
const platform = JSON.parse(fs.readFileSync(PLATFORM_FILE, 'utf8'));
console.log(`Platform Tenants count: ${platform.tenants.length}`);
platform.tenants.forEach(t => {
  console.log(` - Tenant #${t.id}: ${t.name} (${t.organizationName}) @ ${t.address}`);
});

console.log(`\nPlatform Users count: ${platform.users.length}`);
platform.users.forEach(u => {
  console.log(` - User #${u.id}: @${u.username} (Tenant #${u.tenantId}, Roles: [${u.roles.join(', ')}])`);
});

console.log(`\nTenant 1 Customers count: ${t1Data.customers.length}`);
console.log(`Tenant 2 Customers count: ${t2Data.customers.length}`);
console.log(`Tenant 3 Customers count: ${t3Data.customers.length}`);

console.log('\n>>> RESEED_COMPLETED_SUCCESSFULLY');
