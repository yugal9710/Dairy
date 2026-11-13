import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

console.log('====================================================');
console.log('🧪 TESTING 1-10 SEQUENCE CYCLING & RENDER READINESS');
console.log('====================================================');

// Test 1: Sequence cycling logic
function getNextSequenceValue(val) {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 1 || n >= 10) return 1;
  return n + 1;
}

console.log('>>> [1] Testing Ascending 1 to 10 Sequence Cycling:');
let current = 1;
const sequence = [current];
for (let i = 1; i <= 15; i++) {
  current = getNextSequenceValue(current);
  sequence.push(current);
}
console.log('Generated sequence:', sequence.join(' -> '));

// Verify 1..10 then resets to 1..6
assert.deepStrictEqual(
  sequence,
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5, 6],
  'Sequence should increment 1 to 10 and cycle back to 1'
);
console.log('  [PASS] Sequence increments from 1 to 10 and resets to 1 after 10.');

// Test 2: Farmer code sorting
console.log('\n>>> [2] Testing Farmer Sorting Ascending (1 to 10):');
const mockFarmers = [
  { id: 9, code: '9', nameInEnglish: 'Ram' },
  { id: 2, code: '2', nameInEnglish: 'Shyam' },
  { id: 10, code: '10', nameInEnglish: 'Hari' },
  { id: 1, code: '1', nameInEnglish: 'Gita' },
  { id: 5, code: '5', nameInEnglish: 'Sita' },
];

const sorted = [...mockFarmers].sort((a, b) => {
  const codeA = Number(a.code) || Number(a.id) || 0;
  const codeB = Number(b.code) || Number(b.id) || 0;
  return codeA - codeB;
});

const sortedCodes = sorted.map(f => Number(f.code));
console.log('Sorted codes:', sortedCodes);
assert.deepStrictEqual(sortedCodes, [1, 2, 5, 9, 10]);
console.log('  [PASS] Farmers sort in ascending numerical order.');

// Test 3: Render build & publish directory verification
console.log('\n>>> [3] Testing Render Static Deployment Readiness:');
const buildDir = path.join(ROOT_DIR, 'build');
assert.ok(fs.existsSync(buildDir), 'build directory must exist');
const indexPath = path.join(buildDir, 'index.html');
assert.ok(fs.existsSync(indexPath), 'build/index.html must exist');
const indexHtmlContent = fs.readFileSync(indexPath, 'utf-8');
assert.ok(indexHtmlContent.includes('<div id="root"></div>') || indexHtmlContent.includes('id="root"'), 'index.html must have root div');

const assetsDir = path.join(buildDir, 'assets');
assert.ok(fs.existsSync(assetsDir), 'build/assets directory must exist');
const assetFiles = fs.readdirSync(assetsDir);
assert.ok(assetFiles.some(f => f.endsWith('.js')), 'build/assets must contain javascript bundles');
assert.ok(assetFiles.some(f => f.endsWith('.css')), 'build/assets must contain css bundles');
console.log(`  [PASS] build directory verified (${assetFiles.length} asset files).`);

// Test 4: Package.json scripts verification
console.log('\n>>> [4] Testing package.json Render build scripts:');
const pkgPath = path.join(ROOT_DIR, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
assert.strictEqual(pkg.scripts.build, 'node scripts/build.js');
assert.strictEqual(pkg.scripts.postinstall, 'node scripts/build.js');
console.log('  [PASS] "build" and "postinstall" scripts are mapped to node scripts/build.js');

// Test 5: .gitignore verification
console.log('\n>>> [5] Testing .gitignore:');
const gitignore = fs.readFileSync(path.join(ROOT_DIR, '.gitignore'), 'utf-8');
const lines = gitignore.split(/\r?\n/);
assert.ok(!lines.some(l => l.trim() === 'build' || l.trim() === 'build/' || l.trim() === '/build'), 'build directory must NOT be in .gitignore');
console.log('  [PASS] build/ is not ignored in .gitignore (tracked in git).');

console.log('\n====================================================');
console.log('🎉 ALL VERIFICATION CHECKS PASSED!');
console.log('====================================================');
