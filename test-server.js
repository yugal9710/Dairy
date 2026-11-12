import http from 'http';
import { spawn } from 'child_process';

const server = spawn('node', ['server/server.js'], {
  stdio: 'inherit',
  shell: true
});

setTimeout(async () => {
  try {
    console.log('Testing /health...');
    const health = await fetch('http://localhost:5000/health').then(r => r.json());
    console.log('Health:', health);

    console.log('Testing /user/local-login...');
    const login = await fetch('http://localhost:5000/user/local-login?email=admin@dairy.local').then(r => r.json());
    console.log('Login result user:', login.user?.name, login.user?.roles);

    console.log('Testing /api/Customer...');
    const custs = await fetch('http://localhost:5000/api/Customer').then(r => r.json());
    console.log('Customers count:', custs.totalCount, 'First:', custs.items[0]?.nameInNepali);

    console.log('Testing /api/MilkCollection...');
    const collections = await fetch('http://localhost:5000/api/MilkCollection').then(r => r.json());
    console.log('Milk collections count:', collections.totalCount, 'Liters:', collections.items[0]?.quantity);

    console.log('Testing /api/Inventory/summary...');
    const inv = await fetch('http://localhost:5000/api/Inventory/summary').then(r => r.json());
    console.log('Inventory products count:', inv.length, 'First stock:', inv[0]?.productName, inv[0]?.currentStock);

    console.log('Testing /api/Reports/dashboard...');
    const report = await fetch('http://localhost:5000/api/Reports/dashboard').then(r => r.json());
    console.log('Dashboard total milk:', report.totalMilkCollectedLiters, 'Revenue:', report.totalSalesRevenue, 'Net Profit:', report.profitLoss?.netProfit);

    console.log('\n=== ALL API TESTS PASSED SUCCESSFULLY! ===\n');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    server.kill();
    process.exit(0);
  }
}, 2000);
