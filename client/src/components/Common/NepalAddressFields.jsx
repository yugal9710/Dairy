import React, { useMemo } from 'react';
import {
  getProvinces,
  getDistricts,
  getMunicipalities,
  getWards,
  getProvince,
  getDistrict,
  getMunicipality
} from 'nepal-places';

export const EMPTY_NEPAL_LOCATION = {
  provinceId: '',
  provinceName: '',
  districtId: '',
  districtName: '',
  municipalityId: '',
  municipalityName: '',
  ward: ''
};

const MUNICIPALITY_TYPE_LABELS = {
  en: {
    metropolitan: 'Metropolitan City',
    sub_metropolitan: 'Sub-Metropolitan City',
    municipality: 'Municipality',
    rural_municipality: 'Rural Municipality'
  },
  ne: {
    metropolitan: 'महानगरपालिका',
    sub_metropolitan: 'उपमहानगरपालिका',
    municipality: 'नगरपालिका',
    rural_municipality: 'गाउँपालिका'
  }
};

const DEVANAGARI_CONSONANT_MAP = {
  'क': 'K', 'ख': 'K', 'ग': 'G', 'घ': 'G', 'ङ': 'N',
  'च': 'C', 'छ': 'C', 'ज': 'J', 'झ': 'J', 'ञ': 'N',
  'ट': 'T', 'ठ': 'T', 'ड': 'D', 'ढ': 'D', 'ण': 'N',
  'त': 'T', 'थ': 'T', 'द': 'D', 'ध': 'D', 'न': 'N',
  'प': 'P', 'फ': 'P', 'ब': 'B', 'भ': 'B', 'म': 'M',
  'य': 'Y', 'र': 'R', 'ल': 'L', 'व': 'V',
  'श': 'S', 'ष': 'S', 'स': 'S', 'ह': 'H',
  'अ': 'A', 'आ': 'A', 'इ': 'I', 'ई': 'I', 'उ': 'U', 'ऊ': 'U',
  'ए': 'E', 'ऐ': 'A', 'ओ': 'O', 'औ': 'O'
};

export function getCompanyCodePrefix(companyOrTenant) {
  if (!companyOrTenant) return 'JS';

  let raw = '';
  if (typeof companyOrTenant === 'string') {
    raw = companyOrTenant.trim();
  } else if (typeof companyOrTenant === 'object') {
    raw = (
      companyOrTenant.codePrefix ||
      companyOrTenant.companyName ||
      companyOrTenant.nameInEnglish ||
      companyOrTenant.englishName ||
      companyOrTenant.organizationName ||
      companyOrTenant.name ||
      ''
    ).trim();
  }

  if (!raw) return 'JS';

  // 1. If Latin / English letters are present
  const latinWords = raw.replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (latinWords.length > 0) {
    // If first word is exactly 2 letters (e.g. "JS", "SF", "KD")
    if (latinWords[0].length === 2) {
      return latinWords[0].toUpperCase();
    }
    // If multi-word (e.g. "Janaki Sweets" -> JS, "Sana Kisan" -> SK, "Dairy Nepal" -> DN)
    if (latinWords.length >= 2) {
      return (latinWords[0][0] + latinWords[1][0]).toUpperCase();
    }
    // Single word with at least 2 letters (e.g. "Janaki" -> JA, "Himalayan" -> HI, "sfacl" -> SF)
    if (latinWords[0].length >= 2) {
      return latinWords[0].slice(0, 2).toUpperCase();
    }
  }

  // 2. If object has a slug/short name in English (e.g. tenant.name = "sfacl" -> "SF")
  if (typeof companyOrTenant === 'object' && companyOrTenant.name) {
    const slugLetters = String(companyOrTenant.name).replace(/[^a-zA-Z]/g, '');
    if (slugLetters.length >= 2) {
      return slugLetters.slice(0, 2).toUpperCase();
    }
  }

  // 3. Devanagari transliteration mapping for first letters of Nepali words
  // e.g. "साना किसान" -> S + K = "SK", "जनकपुर सहकारी" -> J + S = "JS"
  const devWords = raw.split(/\s+/).filter(Boolean);
  if (devWords.length >= 2) {
    const c1 = DEVANAGARI_CONSONANT_MAP[devWords[0][0]] || '';
    const c2 = DEVANAGARI_CONSONANT_MAP[devWords[1][0]] || '';
    if (c1 && c2) return (c1 + c2).toUpperCase();
    if (c1) return (c1 + 'S').toUpperCase();
  } else if (devWords.length === 1) {
    const c1 = DEVANAGARI_CONSONANT_MAP[devWords[0][0]] || '';
    if (c1) return (c1 + 'S').toUpperCase();
  }

  return 'JS';
}

export function formatCustomerCode(prefix, num) {
  const p = String(prefix || 'JS').trim().toUpperCase();
  const n = Number(num) || 1;
  const padded = String(n).padStart(3, '0');
  return `${p}${padded}`;
}

export function getNextCustomerCode(customers = [], companyOrTenant = null) {
  const prefix = getCompanyCodePrefix(companyOrTenant);
  if (!Array.isArray(customers) || customers.length === 0) {
    return formatCustomerCode(prefix, 1);
  }

  let maxNum = 0;
  let hasPrefixMatch = false;

  for (const c of customers) {
    if (!c || c.isDeleted) continue;
    const raw = String(c.code ?? c.id ?? '').trim().toUpperCase();
    if (raw.startsWith(prefix)) {
      hasPrefixMatch = true;
      const numPart = raw.slice(prefix.length);
      const val = parseInt(numPart, 10);
      if (Number.isFinite(val) && val > maxNum) {
        maxNum = val;
      }
    }
  }

  if (hasPrefixMatch) {
    return formatCustomerCode(prefix, maxNum + 1);
  }

  // If no customer has this prefix yet, check legacy numeric codes (e.g. 1..10)
  let maxLegacyNum = 0;
  for (const c of customers) {
    if (!c || c.isDeleted) continue;
    const raw = String(c.code ?? c.id ?? '').trim();
    const match = raw.match(/(\d+)$/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (Number.isFinite(val) && val > maxLegacyNum) {
        maxLegacyNum = val;
      }
    }
  }

  const nextNum = maxLegacyNum > 0 ? maxLegacyNum + 1 : 1;
  return formatCustomerCode(prefix, nextNum);
}

function getMunicipalityFullLabel(mun, lang = 'en') {
  if (!mun) return '';
  const name = lang === 'ne' ? (mun.name_np || mun.name) : (mun.name || mun.name_np);
  const typeLabel = MUNICIPALITY_TYPE_LABELS[lang]?.[mun.type] || '';
  return typeLabel ? `${name} ${typeLabel}` : name;
}

export function composeNepalAddress(location = {}, lang = 'en') {
  const prov = location.provinceId ? getProvince(Number(location.provinceId)) : null;
  const dist = location.districtId ? getDistrict(Number(location.districtId)) : null;
  const mun = location.municipalityId ? getMunicipality(Number(location.municipalityId)) : null;

  const provLabel = prov ? (lang === 'ne' ? (prov.name_np || prov.name) : prov.name) : (location.provinceName || '');
  const distLabel = dist ? (lang === 'ne' ? (dist.name_np || dist.name) : dist.name) : (location.districtName || '');
  const munLabel = mun ? getMunicipalityFullLabel(mun, lang) : (location.municipalityName || '');
  const wardNum = location.ward ? String(location.ward).trim() : '';

  const munWithWard = munLabel
    ? (wardNum ? `${munLabel}-${wardNum}` : munLabel)
    : (wardNum ? `${lang === 'ne' ? 'वडा नं.' : 'Ward'} ${wardNum}` : '');

  return [munWithWard, distLabel, provLabel].filter(Boolean).join(', ');
}

// Official administrative mapping correcting misaligned district IDs in dataset
const RAW_TO_REAL_DISTRICT_MAP = {
  // Madhesh (15-22):
  15: 18, // Parsa
  16: 15, // Bara
  17: 19, // Rautahat
  18: 21, // Sarlahi
  19: 22, // Siraha
  20: 16, // Dhanusha
  21: 20, // Saptari
  22: 17, // Mahottari

  // Lumbini (47-58):
  47: 52, // Kapilvastu
  48: 53, // Parasi
  49: 58, // Rupandehi
  50: 47, // Arghakhanchi
  51: 51, // Gulmi
  52: 54, // Palpa
  53: 50, // Dang
  54: 55, // Pyuthan
  55: 56, // Rolpa
  56: 57, // Rukum East
  57: 48, // Banke
  58: 49, // Bardiya

  // Karnali (59-68):
  59: 66, // Rukum West
  60: 67, // Salyan
  61: 60, // Dolpa
  62: 61, // Humla
  63: 63, // Jumla
  64: 64, // Kalikot
  65: 65, // Mugu
  66: 68, // Surkhet
  67: 59, // Dailekh
  68: 62, // Jajarkot

  // Sudurpashchim (69-77):
  69: 74, // Darchula
  70: 71, // Bajhang
  71: 72, // Bajura
  72: 70, // Baitadi
  73: 75, // Doti
  74: 69, // Achham
  75: 73, // Dadeldhura
  76: 77, // Kanchanpur
  77: 76  // Kailali
};

const REAL_TO_RAW_DISTRICT_MAP = {};
for (let i = 1; i <= 77; i++) {
  const real = RAW_TO_REAL_DISTRICT_MAP[i] || i;
  REAL_TO_RAW_DISTRICT_MAP[real] = i;
}

export default function NepalAddressFields({ value = EMPTY_NEPAL_LOCATION, onChange, lang = 'en', compact = false }) {
  const provinces = useMemo(() => getProvinces(), []);

  const districts = useMemo(() => {
    if (!value?.provinceId) return [];
    return [...getDistricts(Number(value.provinceId))].sort((a, b) => {
      const nameA = lang === 'ne' ? (a.name_np || a.name) : a.name;
      const nameB = lang === 'ne' ? (b.name_np || b.name) : b.name;
      return nameA.localeCompare(nameB);
    });
  }, [value?.provinceId, lang]);

  const municipalities = useMemo(() => {
    if (!value?.districtId) return [];
    const realDistId = Number(value.districtId);
    const rawDistId = REAL_TO_RAW_DISTRICT_MAP[realDistId] || realDistId;
    return [...getMunicipalities(rawDistId)].sort((a, b) => {
      const nameA = lang === 'ne' ? (a.name_np || a.name) : a.name;
      const nameB = lang === 'ne' ? (b.name_np || b.name) : b.name;
      return nameA.localeCompare(nameB);
    });
  }, [value?.districtId, lang]);

  const wards = useMemo(() => {
    if (!value?.municipalityId) return [];
    return getWards(Number(value.municipalityId));
  }, [value?.municipalityId]);

  const emitChange = (nextLocation) => {
    if (onChange) {
      onChange(nextLocation, composeNepalAddress(nextLocation, lang));
    }
  };

  const handleProvinceChange = (e) => {
    const provinceId = e.target.value;
    const prov = provinceId ? getProvince(Number(provinceId)) : null;
    emitChange({
      ...EMPTY_NEPAL_LOCATION,
      provinceId,
      provinceName: prov ? prov.name : ''
    });
  };

  const handleDistrictChange = (e) => {
    const districtId = e.target.value;
    const dist = districtId ? getDistrict(Number(districtId)) : null;
    emitChange({
      ...value,
      districtId,
      districtName: dist ? dist.name : '',
      municipalityId: '',
      municipalityName: '',
      ward: ''
    });
  };

  const handleMunicipalityChange = (e) => {
    const municipalityId = e.target.value;
    const mun = municipalityId ? getMunicipality(Number(municipalityId)) : null;
    emitChange({
      ...value,
      municipalityId,
      municipalityName: mun ? getMunicipalityFullLabel(mun, 'en') : '',
      ward: ''
    });
  };

  const handleWardChange = (e) => {
    emitChange({
      ...value,
      ward: e.target.value
    });
  };

  const selectClass = `w-full px-3 ${compact ? 'py-1.5' : 'py-2'} text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-900/50 cursor-pointer`;
  const labelClass = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={labelClass}>{lang === 'en' ? 'Province' : 'प्रदेश'}</label>
        <select value={value?.provinceId || ''} onChange={handleProvinceChange} className={selectClass}>
          <option value="">{lang === 'en' ? '-- Select Province --' : '-- प्रदेश छान्नुहोस् --'}</option>
          {provinces.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {lang === 'ne' ? `${p.name_np} (${p.name})` : `${p.name} (${p.name_np})`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>{lang === 'en' ? 'District' : 'जिल्ला'}</label>
        <select
          value={value?.districtId || ''}
          onChange={handleDistrictChange}
          disabled={!value?.provinceId}
          className={selectClass}
        >
          <option value="">{lang === 'en' ? '-- Select District --' : '-- जिल्ला छान्नुहोस् --'}</option>
          {districts.map((d) => (
            <option key={d.id} value={String(d.id)}>
              {lang === 'ne' ? `${d.name_np} (${d.name})` : `${d.name} (${d.name_np})`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>{lang === 'en' ? 'Municipality / Local Level' : 'नगरपालिका / गाउँपालिका'}</label>
        <select
          value={value?.municipalityId || ''}
          onChange={handleMunicipalityChange}
          disabled={!value?.districtId}
          className={selectClass}
        >
          <option value="">{lang === 'en' ? '-- Select Municipality --' : '-- स्थानीय तह छान्नुहोस् --'}</option>
          {municipalities.map((m) => (
            <option key={m.id} value={String(m.id)}>
              {getMunicipalityFullLabel(m, lang)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>{lang === 'en' ? 'Ward No.' : 'वडा नं.'}</label>
        <select
          value={value?.ward || ''}
          onChange={handleWardChange}
          disabled={!value?.municipalityId}
          className={selectClass}
        >
          <option value="">{lang === 'en' ? '-- Select Ward --' : '-- वडा छान्नुहोस् --'}</option>
          {wards.map((w) => (
            <option key={w.id} value={String(w.ward_number)}>
              {lang === 'ne' ? `वडा नं. ${w.ward_number}` : `Ward ${w.ward_number}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
