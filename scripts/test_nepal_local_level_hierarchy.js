import assert from 'assert';
import {
  getProvinces,
  getDistrictsByProvince,
  getLocalLevelsByDistrict,
  getWardsByLocalLevel,
  composeNepalAddress,
  findLocalLevel,
  NEPAL_LOCAL_LEVELS_HIERARCHY
} from '../client/src/data/nepalLocalLevels.js';

console.log('====================================================');
console.log('🇳🇵 TESTING NEPAL 753 DEPENDENT LOCAL-LEVEL HIERARCHY');
console.log('====================================================');

// Test 1: Exactly 7 Provinces
const provinces = getProvinces();
assert.strictEqual(provinces.length, 7, 'Must have exactly 7 provinces');
console.log('  [PASS] Test 1: Exactly 7 Provinces loaded:', provinces.map(p => p.name).join(', '));

// Test 2: District counts per province (14 + 8 + 13 + 11 + 12 + 10 + 9 = 77)
const expectedDistCounts = {
  Koshi: 14,
  Madhesh: 8,
  Bagmati: 13,
  Gandaki: 11,
  Lumbini: 12,
  Karnali: 10,
  Sudurpashchim: 9
};

let totalDistCount = 0;
for (const [prov, expectedCount] of Object.entries(expectedDistCounts)) {
  const dists = getDistrictsByProvince(prov);
  assert.strictEqual(dists.length, expectedCount, `${prov} must have ${expectedCount} districts`);
  totalDistCount += dists.length;
}
assert.strictEqual(totalDistCount, 77, 'Total districts must equal 77');
console.log('  [PASS] Test 2: All 77 Districts verified across all 7 Provinces');

// Test 3: Dependent District Isolation (no cross-province contamination)
const bagmatiDists = getDistrictsByProvince('Bagmati').map(d => d.name);
assert.ok(bagmatiDists.includes('Kathmandu'), 'Bagmati must include Kathmandu');
assert.ok(bagmatiDists.includes('Lalitpur'), 'Bagmati must include Lalitpur');
assert.ok(bagmatiDists.includes('Bhaktapur'), 'Bagmati must include Bhaktapur');
assert.ok(bagmatiDists.includes('Chitwan'), 'Bagmati must include Chitwan');
assert.ok(!bagmatiDists.includes('Bhojpur'), 'Bagmati must NOT include Bhojpur (Koshi)');
assert.ok(!bagmatiDists.includes('Kaski'), 'Bagmati must NOT include Kaski (Gandaki)');
assert.ok(!bagmatiDists.includes('Banke'), 'Bagmati must NOT include Banke (Lumbini)');
console.log('  [PASS] Test 3: Dependent District Isolation verified (no cross-province districts)');

// Test 4: Dependent Local Levels within District
const ktmLocalLevels = getLocalLevelsByDistrict('Bagmati', 'Kathmandu');
assert.strictEqual(ktmLocalLevels.length, 11, 'Kathmandu district must have 11 local levels');
const ktmNames = ktmLocalLevels.map(l => l.name);
assert.ok(ktmNames.includes('Kathmandu'), 'Must include Kathmandu Metro');
assert.ok(ktmNames.includes('Budhanilkantha'), 'Must include Budhanilkantha');
assert.ok(ktmNames.includes('Kirtipur'), 'Must include Kirtipur');
assert.ok(!ktmNames.includes('Pokhara'), 'Kathmandu must NOT include Pokhara');
console.log('  [PASS] Test 4: Kathmandu District local levels verified (11 local levels)');

const bhojpurLevels = getLocalLevelsByDistrict('Koshi', 'Bhojpur');
assert.strictEqual(bhojpurLevels.length, 9, 'Bhojpur district must have 9 local levels');
console.log('  [PASS] Test 5: Bhojpur District local levels verified (9 local levels)');

const kaskiLevels = getLocalLevelsByDistrict('Gandaki', 'Kaski');
assert.strictEqual(kaskiLevels.length, 5, 'Kaski district must have 5 local levels');
console.log('  [PASS] Test 6: Kaski District local levels verified (5 local levels)');

// Test 5: Dependent Wards belonging to Municipality
const ktmWards = getWardsByLocalLevel('Bagmati', 'Kathmandu', 'Kathmandu');
assert.strictEqual(ktmWards.length, 32, 'Kathmandu Metropolitan City must have 32 wards');
assert.strictEqual(ktmWards[0], 1, 'First ward must be 1');
assert.strictEqual(ktmWards[31], 32, 'Last ward must be 32');
console.log('  [PASS] Test 7: Kathmandu Metropolitan City wards verified (Ward 1 to 32)');

const pokharaWards = getWardsByLocalLevel('Gandaki', 'Kaski', 'Pokhara');
assert.strictEqual(pokharaWards.length, 33, 'Pokhara Metropolitan City must have 33 wards');
console.log('  [PASS] Test 8: Pokhara Metropolitan City wards verified (Ward 1 to 33)');

const bhojpurMunWards = getWardsByLocalLevel('Koshi', 'Bhojpur', 'Bhojpur');
assert.strictEqual(bhojpurMunWards.length, 12, 'Bhojpur Municipality must have 12 wards');
console.log('  [PASS] Test 9: Bhojpur Municipality wards verified (Ward 1 to 12)');

const arunWards = getWardsByLocalLevel('Koshi', 'Bhojpur', 'Arun');
assert.strictEqual(arunWards.length, 7, 'Arun Rural Municipality must have 7 wards');
console.log('  [PASS] Test 10: Arun Rural Municipality wards verified (Ward 1 to 7)');

// Test 6: Total 753 Local Levels & 6,743 Wards count verification
let totalLocalLevelsCount = 0;
let totalWardsCount = 0;

for (const prov of NEPAL_LOCAL_LEVELS_HIERARCHY) {
  for (const dist of prov.districts) {
    for (const ll of dist.localLevels) {
      totalLocalLevelsCount++;
      totalWardsCount += ll.totalWards;
    }
  }
}

assert.strictEqual(totalLocalLevelsCount, 753, 'Total local levels must be 753');
assert.strictEqual(totalWardsCount, 6743, 'Total wards across Nepal must sum to 6,743');
console.log(`  [PASS] Test 11: All ${totalLocalLevelsCount} Local Levels & ${totalWardsCount} Wards verified!`);

// Test 7: Address Composition Test
const addrEn = composeNepalAddress({
  provinceName: 'Koshi',
  districtName: 'Bhojpur',
  municipalityName: 'Bhojpur Municipality',
  ward: '4'
}, 'en');
assert.strictEqual(addrEn, 'Bhojpur Municipality-4, Bhojpur, Koshi');
console.log('  [PASS] Test 12: English address composition verified:', addrEn);

const addrNe = composeNepalAddress({
  provinceName: 'Bagmati',
  districtName: 'Kathmandu',
  municipalityName: 'Kathmandu Metropolitan City',
  ward: '12'
}, 'ne');
assert.strictEqual(addrNe, 'Kathmandu Metropolitan City-12, काठमाडौं, बागमती');
console.log('  [PASS] Test 13: Nepali address composition verified:', addrNe);

// Test 8: Search / Find Local Level
const foundBhojpur = findLocalLevel('Bhojpur');
assert.strictEqual(foundBhojpur.category, 'Municipality');
assert.strictEqual(foundBhojpur.totalWards, 12);
assert.strictEqual(foundBhojpur.district, 'Bhojpur');
assert.strictEqual(foundBhojpur.province, 'Koshi');
console.log('  [PASS] Test 14: findLocalLevel verified for Bhojpur');

console.log('====================================================');
console.log('🎉 ALL 14/14 NEPAL LOCAL-LEVEL TESTS PASSED CLEANLY!');
console.log('====================================================');
