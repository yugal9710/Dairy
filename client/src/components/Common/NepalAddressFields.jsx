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

export function getNextCustomerCode(customers = []) {
  if (!Array.isArray(customers) || customers.length === 0) return 1;
  const maxCode = customers.reduce((max, c) => {
    const num = Number(c?.code);
    return Number.isFinite(num) && num > max ? num : max;
  }, 0);
  return maxCode + 1;
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

export default function NepalAddressFields({ value = EMPTY_NEPAL_LOCATION, onChange, lang = 'en', compact = false }) {
  const provinces = useMemo(() => getProvinces(), []);

  const districts = useMemo(() => {
    if (!value?.provinceId) return [];
    return [...getDistricts(Number(value.provinceId))].sort((a, b) => a.name.localeCompare(b.name));
  }, [value?.provinceId]);

  const municipalities = useMemo(() => {
    if (!value?.districtId) return [];
    return [...getMunicipalities(Number(value.districtId))].sort((a, b) => a.name.localeCompare(b.name));
  }, [value?.districtId]);

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
