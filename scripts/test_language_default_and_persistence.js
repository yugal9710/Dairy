import assert from 'assert';

function testLanguageDefaultAndPersistence() {
  console.log('====================================================');
  console.log('🌐 TESTING DEFAULT LOGIN LANGUAGE & PERSISTENCE');
  console.log('====================================================\n');

  // Simulated LocalStorage mock
  const mockStorage = new Map();
  const localStorage = {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k)
  };

  function getInitialLang(storage) {
    const saved = storage.getItem('dairy_lang');
    if (saved === 'ne' || saved === 'en') {
      return saved;
    }
    return 'en'; // English is default
  }

  function saveLang(storage, newLang) {
    const l = newLang === 'en' ? 'en' : 'ne';
    storage.setItem('dairy_lang', l);
    return l;
  }

  // 1. Initial state (no stored language) -> MUST be 'en'
  console.log('>>> [1] Fresh visit without prior stored language...');
  const initialLang = getInitialLang(localStorage);
  assert.strictEqual(initialLang, 'en', 'Default language must be English (en)');
  console.log(`  [PASS] Default login language is correctly "en" (English)`);

  // 2. User changes language to Nepali ('ne')
  console.log('\n>>> [2] User changes language to Nepali (ne)...');
  const changedLang = saveLang(localStorage, 'ne');
  assert.strictEqual(changedLang, 'ne');
  assert.strictEqual(localStorage.getItem('dairy_lang'), 'ne');
  console.log(`  [PASS] Language changed to "ne" and persisted in storage: "${localStorage.getItem('dairy_lang')}"`);

  // 3. User refreshes or logs in in the future -> MUST remain 'ne'
  console.log('\n>>> [3] Future login / page reload after change to Nepali...');
  const futureLangNe = getInitialLang(localStorage);
  assert.strictEqual(futureLangNe, 'ne', 'Nepali must remain selected as the default for future logins');
  console.log(`  [PASS] Language remained "ne" as the default for future logins`);

  // 4. User changes language back to English ('en')
  console.log('\n>>> [4] User changes language back to English (en)...');
  const changedLangEn = saveLang(localStorage, 'en');
  assert.strictEqual(changedLangEn, 'en');
  assert.strictEqual(localStorage.getItem('dairy_lang'), 'en');
  console.log(`  [PASS] Language changed to "en" and persisted in storage`);

  // 5. Future login -> MUST remain 'en'
  console.log('\n>>> [5] Future login / page reload after change to English...');
  const futureLangEn = getInitialLang(localStorage);
  assert.strictEqual(futureLangEn, 'en', 'English must remain selected as default');
  console.log(`  [PASS] Language remained "en" as the default for future logins`);

  console.log('\n====================================================');
  console.log('🎉 ALL LANGUAGE DEFAULT & PERSISTENCE TESTS PASSED!');
  console.log('====================================================');
}

testLanguageDefaultAndPersistence();
