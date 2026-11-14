import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const csvPath = path.join(ROOT_DIR, 'client', 'src', 'data', 'nepal_local_levels.csv');
const raw = fs.readFileSync(csvPath, 'utf-8');

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const tokens = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        tokens.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    tokens.push(cur.trim());

    if (tokens.length >= 7) {
      const sn = parseInt(tokens[0], 10);
      const province = tokens[1];
      const district = tokens[2];
      const name = tokens[3];
      const category = tokens[4];
      const fullTitle = tokens[5];
      const totalWards = parseInt(tokens[6], 10);
      rows.push({
        sn,
        province,
        district,
        name,
        category,
        fullTitle,
        totalWards
      });
    }
  }
  return rows;
}

const localLevels = parseCsv(raw);

const PROVINCE_NP = {
  'Koshi': 'कोशी',
  'Madhesh': 'मधेश',
  'Bagmati': 'बागमती',
  'Gandaki': 'गण्डकी',
  'Lumbini': 'लुम्बिनी',
  'Karnali': 'कर्णाली',
  'Sudurpashchim': 'सुदूरपश्चिम'
};

const DISTRICTS_NP = {
  // Koshi (14)
  'Bhojpur': 'भोजपुर',
  'Dhankuta': 'धनकुटा',
  'Ilam': 'इलाम',
  'Jhapa': 'झापा',
  'Khotang': 'खोटाङ',
  'Morang': 'मोरङ',
  'Okhaldhunga': 'ओखलढुङ्गा',
  'Panchthar': 'पाँचथर',
  'Sankhuwasabha': 'सङ्खुवासभा',
  'Solukhumbu': 'सोलुखुम्बु',
  'Sunsari': 'सुनसरी',
  'Taplejung': 'ताप्लेजुङ',
  'Terhathum': 'तेह्रथुम',
  'Udayapur': 'उदयपुर',

  // Madhesh (8)
  'Bara': 'बारा',
  'Dhanusha': 'धनुषा',
  'Mahottari': 'महोत्तरी',
  'Parsa': 'पर्सा',
  'Rautahat': 'रौतहट',
  'Saptari': 'सप्तरी',
  'Sarlahi': 'सर्लाही',
  'Siraha': 'सिराहा',

  // Bagmati (13)
  'Bhaktapur': 'भक्तपुर',
  'Chitwan': 'चितवन',
  'Dhading': 'धादिङ',
  'Dolakha': 'दोलखा',
  'Kathmandu': 'काठमाडौं',
  'Kavrepalanchok': 'काभ्रेपलाञ्चोक',
  'Lalitpur': 'ललितपुर',
  'Makwanpur': 'मकवानपुर',
  'Nuwakot': 'नुवाकोट',
  'Ramechhap': 'रामेछाप',
  'Rasuwa': 'रसुवा',
  'Sindhuli': 'सिन्धुली',
  'Sindhupalchok': 'सिन्धुपाल्चोक',

  // Gandaki (11)
  'Baglung': 'बागलुङ',
  'Gorkha': 'गोरखा',
  'Kaski': 'कास्की',
  'Lamjung': 'लमजुङ',
  'Manang': 'मनाङ',
  'Mustang': 'मुस्ताङ',
  'Myagdi': 'म्याग्दी',
  'Nawalpur': 'नवलपुर',
  'Parbat': 'पर्वत',
  'Syangja': 'स्याङ्जा',
  'Tanahun': 'तनहुँ',

  // Lumbini (12)
  'Arghakhanchi': 'अर्घाखाँची',
  'Banke': 'बाँके',
  'Bardiya': 'बर्दिया',
  'Dang': 'दाङ',
  'Eastern Rukum': 'पूर्वी रुकुम',
  'Gulmi': 'गुल्मी',
  'Kapilvastu': 'कपिलवस्तु',
  'Parasi': 'परासी',
  'Palpa': 'पाल्पा',
  'Pyuthan': 'प्युठान',
  'Rolpa': 'रोल्पा',
  'Rupandehi': 'रुपन्देही',

  // Karnali (10)
  'Dailekh': 'दैलेख',
  'Dolpa': 'डोल्पा',
  'Humla': 'हुम्ला',
  'Jajarkot': 'जाजरकोट',
  'Jumla': 'जुम्ला',
  'Kalikot': 'कालिकोट',
  'Mugu': 'मुगु',
  'Salyan': 'सल्यान',
  'Surkhet': 'सुर्खेत',
  'Western Rukum': 'पश्चिम रुकुम',

  // Sudurpashchim (9)
  'Achham': 'अछाम',
  'Baitadi': 'बैतडी',
  'Bajhang': 'बझाङ',
  'Bajura': 'बाजुरा',
  'Dadeldhura': 'डडेल्धुरा',
  'Darchula': 'दार्चुला',
  'Doti': 'डोटी',
  'Kailali': 'कैलाली',
  'Kanchanpur': 'कञ्चनपुर'
};

const CATEGORY_NP = {
  'Metropolitan City': 'महानगरपालिका',
  'Sub-Metropolitan City': 'उपमहानगरपालिका',
  'Municipality': 'नगरपालिका',
  'Rural Municipality': 'गाउँपालिका'
};

// Group by Province -> District -> Local Levels
const provincesMap = new Map();
for (const item of localLevels) {
  if (!provincesMap.has(item.province)) {
    provincesMap.set(item.province, new Map());
  }
  const distMap = provincesMap.get(item.province);
  if (!distMap.has(item.district)) {
    distMap.set(item.district, []);
  }
  distMap.get(item.district).push({
    sn: item.sn,
    name: item.name,
    category: item.category,
    fullTitle: item.fullTitle,
    totalWards: item.totalWards
  });
}

const hierarchicalData = [];
for (const [prov, distMap] of provincesMap.entries()) {
  const districts = [];
  for (const [dist, lls] of distMap.entries()) {
    districts.push({
      district: dist,
      districtNp: DISTRICTS_NP[dist] || dist,
      localLevels: lls
    });
  }
  hierarchicalData.push({
    province: prov,
    provinceNp: PROVINCE_NP[prov] || prov,
    districts
  });
}

const jsCode = `// Generated from official Nepal 753 Local Levels Data Sheet
export const PROVINCE_NAMES_NP = ${JSON.stringify(PROVINCE_NP, null, 2)};
export const DISTRICT_NAMES_NP = ${JSON.stringify(DISTRICTS_NP, null, 2)};
export const CATEGORY_NAMES_NP = ${JSON.stringify(CATEGORY_NP, null, 2)};

export const NEPAL_LOCAL_LEVELS_HIERARCHY = ${JSON.stringify(hierarchicalData, null, 2)};

// ----------------------------------------------------
// 1. GET ALL PROVINCES (7 Provinces)
// ----------------------------------------------------
export function getProvinces() {
  return NEPAL_LOCAL_LEVELS_HIERARCHY.map(p => ({
    name: p.province,
    nameNp: p.provinceNp
  }));
}

// ----------------------------------------------------
// 2. WHEN A PROVINCE IS SELECTED: Show ONLY districts within that province
// ----------------------------------------------------
export function getDistrictsByProvince(provinceName) {
  if (!provinceName) return [];
  const normalized = String(provinceName).trim().toLowerCase();
  const prov = NEPAL_LOCAL_LEVELS_HIERARCHY.find(
    p => p.province.toLowerCase() === normalized || p.provinceNp.toLowerCase() === normalized
  );
  if (!prov) return [];
  return prov.districts.map(d => ({
    name: d.district,
    nameNp: d.districtNp
  }));
}

// ----------------------------------------------------
// 3. WHEN A DISTRICT IS SELECTED: Show ONLY local levels / municipalities in that district
// ----------------------------------------------------
export function getLocalLevelsByDistrict(provinceName, districtName) {
  if (!districtName) return [];
  const normDist = String(districtName).trim().toLowerCase();
  const normProv = provinceName ? String(provinceName).trim().toLowerCase() : null;

  let prov = null;
  if (normProv) {
    prov = NEPAL_LOCAL_LEVELS_HIERARCHY.find(
      p => p.province.toLowerCase() === normProv || p.provinceNp.toLowerCase() === normProv
    );
  }

  const searchDist = (targetProv) => {
    const d = targetProv.districts.find(
      item => item.district.toLowerCase() === normDist || item.districtNp.toLowerCase() === normDist
    );
    if (!d) return null;
    return d.localLevels.map(ll => ({
      ...ll,
      categoryNp: CATEGORY_NAMES_NP[ll.category] || ll.category,
      fullTitleNp: \`\${ll.name} \${CATEGORY_NAMES_NP[ll.category] || ll.category}\`
    }));
  };

  if (prov) {
    const list = searchDist(prov);
    if (list) return list;
  }

  // Fallback: search across all provinces if province wasn't provided or mismatched
  for (const p of NEPAL_LOCAL_LEVELS_HIERARCHY) {
    const list = searchDist(p);
    if (list) return list;
  }
  return [];
}

// ----------------------------------------------------
// 4. WHEN A MUNICIPALITY IS SELECTED: Show ONLY wards belonging to that municipality
// ----------------------------------------------------
export function getWardsByLocalLevel(provinceName, districtName, localLevelNameOrSn) {
  if (!localLevelNameOrSn) return [];
  const targetStr = String(localLevelNameOrSn).trim().toLowerCase();
  const localLevels = getLocalLevelsByDistrict(provinceName, districtName);
  
  const found = localLevels.find(
    ll => ll.name.toLowerCase() === targetStr ||
          ll.fullTitle.toLowerCase() === targetStr ||
          String(ll.sn) === targetStr
  );

  if (!found) return [];
  return Array.from({ length: found.totalWards }, (_, i) => i + 1);
}

// ----------------------------------------------------
// FIND LOCAL LEVEL RECORD
// ----------------------------------------------------
export function findLocalLevel(localLevelNameOrSn, districtName = null) {
  if (!localLevelNameOrSn) return null;
  const targetStr = String(localLevelNameOrSn).trim().toLowerCase();
  const normDist = districtName ? String(districtName).trim().toLowerCase() : null;

  for (const p of NEPAL_LOCAL_LEVELS_HIERARCHY) {
    for (const d of p.districts) {
      if (normDist && d.district.toLowerCase() !== normDist && d.districtNp.toLowerCase() !== normDist) {
        continue;
      }
      for (const ll of d.localLevels) {
        if (
          ll.name.toLowerCase() === targetStr ||
          ll.fullTitle.toLowerCase() === targetStr ||
          String(ll.sn) === targetStr
        ) {
          return {
            ...ll,
            categoryNp: CATEGORY_NAMES_NP[ll.category] || ll.category,
            fullTitleNp: \`\${ll.name} \${CATEGORY_NAMES_NP[ll.category] || ll.category}\`,
            district: d.district,
            districtNp: d.districtNp,
            province: p.province,
            provinceNp: p.provinceNp
          };
        }
      }
    }
  }
  return null;
}

// ----------------------------------------------------
// ADDRESS COMPOSER
// ----------------------------------------------------
export function composeNepalAddress(location = {}, lang = 'en') {
  const provName = location.provinceName || location.province || '';
  const distName = location.districtName || location.district || '';
  const munName = location.municipalityName || location.localLevelName || location.municipality || '';
  const ward = location.ward ? String(location.ward).trim() : '';

  const provNp = PROVINCE_NAMES_NP[provName] || provName;
  const distNp = DISTRICT_NAMES_NP[distName] || distName;

  const pLabel = lang === 'ne' ? provNp : provName;
  const dLabel = lang === 'ne' ? distNp : distName;
  const mLabel = munName;

  const munWithWard = mLabel
    ? (ward ? \`\${mLabel}-\${ward}\` : mLabel)
    : (ward ? (lang === 'ne' ? \`वडा नं. \${ward}\` : \`Ward \${ward}\`) : '');

  return [munWithWard, dLabel, pLabel].filter(Boolean).join(', ');
}
`;

const targetJsPath = path.join(ROOT_DIR, 'client', 'src', 'data', 'nepalLocalLevels.js');
fs.writeFileSync(targetJsPath, jsCode, 'utf-8');
console.log('✓ nepalLocalLevels.js generated cleanly.');
