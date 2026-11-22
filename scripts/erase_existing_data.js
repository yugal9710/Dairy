import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'server', 'data');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');
const PLATFORM_FILE = path.join(DATA_DIR, 'platform.json');

console.log('====================================================');
console.log('🧹 ERASING ALL OPERATIONAL DATA & CUSTOMERS / FARMERS');
console.log('====================================================');

// 1. Process all tenant files
if (fs.existsSync(TENANTS_DIR)) {
  const files = fs.readdirSync(TENANTS_DIR).filter(f => f.startsWith('tenant_') && f.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(TENANTS_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Empty all operational / transactional arrays and customer/farmer registry
      data.customers = [];
      data.milkCollections = [];
      data.milkCollectionPayments = [];
      data.orders = [];
      data.futureOrders = [];
      data.productionBatches = [];
      data.purchases = [];
      data.stockMovements = [];
      data.expenses = [];
      data.customerPayments = [];
      data.cashBankLedgers = [];
      data.auditLogs = [];

      // Reset product stock counts to 0
      if (Array.isArray(data.products) && data.products.length > 0) {
        data.productStocks = data.products
          .filter(p => !p.isDeleted)
          .map((p, idx) => ({
            id: idx + 1,
            productId: p.id,
            batchNumber: `INIT-LOT-${String(p.id).padStart(2, '0')}`,
            quantity: 0,
            usedQuantity: 0,
            expiryDateUtms: null,
            dateTimeUtms: Date.now()
          }));
      } else {
        data.productStocks = [];
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`✓ Cleaned ${file}: 0 customers, 0 collections, 0 orders, 0 stock movements.`);
    } catch (err) {
      console.error(`✗ Error processing ${file}:`, err.message);
    }
  }
}

// 2. Clean billings in platform.json while preserving cooperatives, users, and plans
if (fs.existsSync(PLATFORM_FILE)) {
  try {
    const platform = JSON.parse(fs.readFileSync(PLATFORM_FILE, 'utf8'));
    platform.billings = [];
    fs.writeFileSync(PLATFORM_FILE, JSON.stringify(platform, null, 2), 'utf8');
    console.log('✓ Cleaned platform.json: 0 billings preserved cooperatives & user credentials.');
  } catch (err) {
    console.error('✗ Error processing platform.json:', err.message);
  }
}

console.log('====================================================');
console.log('🎉 ALL EXISTING DATA ERASED SUCCESSFULLY!');
console.log('====================================================');
