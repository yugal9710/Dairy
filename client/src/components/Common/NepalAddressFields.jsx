import React, { useMemo } from 'react';
import {
  getProvinces,
  getDistrictsByProvince,
  getLocalLevelsByDistrict,
  getWardsByLocalLevel,
  composeNepalAddress,
  findLocalLevel,
  PROVINCE_NAMES_NP,
  DISTRICT_NAMES_NP,
  CATEGORY_NAMES_NP
} from '../../data/nepalLocalLevels';

export const EMPTY_NEPAL_LOCATION = {
  provinceId: '',
  provinceName: '',
  districtId: '',
  districtName: '',
  municipalityId: '',
  municipalityName: '',
  ward: ''
};

export { composeNepalAddress };

export function getNextCustomerCode(customers = []) {
  if (!Array.isArray(customers) || customers.length === 0) return 1;
  const maxCode = customers.reduce((max, c) => {
    const num = Number(c?.code);
    return Number.isFinite(num) && num > max ? num : max;
  }, 0);
  return maxCode + 1;
}

export default function NepalAddressFields({
  value = EMPTY_NEPAL_LOCATION,
  onChange,
  lang = 'en',
  compact = false
}) {
  // 1. All Provinces (7)
  const provinces = useMemo(() => getProvinces(), []);

  // Normalize selected province (support name or id)
  const selectedProvinceName = useMemo(() => {
    if (!value) return '';
    const raw = String(value.provinceName || value.provinceId || '').trim();
    if (!raw) return '';
    const match = provinces.find(
      p => p.name.toLowerCase() === raw.toLowerCase() || p.nameNp.toLowerCase() === raw.toLowerCase()
    );
    return match ? match.name : raw;
  }, [value?.provinceName, value?.provinceId, provinces]);

  // 2. Dependent Districts: ONLY districts in selected province
  const districts = useMemo(() => {
    if (!selectedProvinceName) return [];
    return getDistrictsByProvince(selectedProvinceName);
  }, [selectedProvinceName]);

  // Normalize selected district
  const selectedDistrictName = useMemo(() => {
    if (!value) return '';
    const raw = String(value.districtName || value.districtId || '').trim();
    if (!raw) return '';
    const match = districts.find(
      d => d.name.toLowerCase() === raw.toLowerCase() || d.nameNp.toLowerCase() === raw.toLowerCase()
    );
    return match ? match.name : raw;
  }, [value?.districtName, value?.districtId, districts]);

  // 3. Dependent Local Levels: ONLY local levels in selected district
  const localLevels = useMemo(() => {
    if (!selectedDistrictName) return [];
    return getLocalLevelsByDistrict(selectedProvinceName, selectedDistrictName);
  }, [selectedProvinceName, selectedDistrictName]);

  // Selected Local Level object
  const selectedLocalLevel = useMemo(() => {
    if (!value) return null;
    const raw = String(value.municipalityName || value.municipalityId || '').trim();
    if (!raw || localLevels.length === 0) return null;
    return (
      localLevels.find(
        ll => ll.name.toLowerCase() === raw.toLowerCase() ||
              ll.fullTitle.toLowerCase() === raw.toLowerCase() ||
              String(ll.sn) === raw
      ) || null
    );
  }, [value?.municipalityName, value?.municipalityId, localLevels]);

  // 4. Dependent Wards: ONLY wards belonging to selected municipality
  const wards = useMemo(() => {
    if (!selectedLocalLevel) return [];
    return Array.from({ length: selectedLocalLevel.totalWards }, (_, i) => i + 1);
  }, [selectedLocalLevel]);

  // Emit changes to parent component
  const emitChange = (nextLocation) => {
    if (onChange) {
      const composed = composeNepalAddress(nextLocation, lang);
      onChange(nextLocation, composed);
    }
  };

  // Province Change -> resets District, Municipality, and Ward
  const handleProvinceChange = (e) => {
    const provName = e.target.value;
    const nextLoc = {
      ...EMPTY_NEPAL_LOCATION,
      provinceId: provName,
      provinceName: provName
    };
    emitChange(nextLoc);
  };

  // District Change -> resets Municipality and Ward
  const handleDistrictChange = (e) => {
    const distName = e.target.value;
    const nextLoc = {
      ...value,
      provinceId: selectedProvinceName,
      provinceName: selectedProvinceName,
      districtId: distName,
      districtName: distName,
      municipalityId: '',
      municipalityName: '',
      ward: ''
    };
    emitChange(nextLoc);
  };

  // Municipality Change -> resets Ward
  const handleMunicipalityChange = (e) => {
    const localLevelVal = e.target.value;
    const target = localLevels.find(
      ll => ll.name === localLevelVal || ll.fullTitle === localLevelVal || String(ll.sn) === localLevelVal
    );

    const nextLoc = {
      ...value,
      provinceId: selectedProvinceName,
      provinceName: selectedProvinceName,
      districtId: selectedDistrictName,
      districtName: selectedDistrictName,
      municipalityId: target ? String(target.sn) : localLevelVal,
      municipalityName: target ? target.fullTitle : localLevelVal,
      ward: ''
    };
    emitChange(nextLoc);
  };

  // Ward Change
  const handleWardChange = (e) => {
    const wardVal = e.target.value;
    const nextLoc = {
      ...value,
      provinceId: selectedProvinceName,
      provinceName: selectedProvinceName,
      districtId: selectedDistrictName,
      districtName: selectedDistrictName,
      municipalityId: selectedLocalLevel ? String(selectedLocalLevel.sn) : (value.municipalityId || ''),
      municipalityName: selectedLocalLevel ? selectedLocalLevel.fullTitle : (value.municipalityName || ''),
      ward: wardVal
    };
    emitChange(nextLoc);
  };

  const selectBaseClass = `w-full px-3 ${compact ? 'py-1.5' : 'py-2'} text-xs border rounded-xl outline-none font-medium transition cursor-pointer`;
  const activeClass = 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 shadow-2xs';
  const disabledClass = 'border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 cursor-not-allowed';

  const labelClass = 'block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. Province Dropdown */}
        <div>
          <label className={labelClass}>
            {lang === 'en' ? 'Province' : 'प्रदेश'}
            <span className="text-rose-500 ml-0.5">*</span>
          </label>
          <select
            value={selectedProvinceName}
            onChange={handleProvinceChange}
            className={`${selectBaseClass} ${activeClass}`}
          >
            <option value="">
              {lang === 'en' ? '-- Select Province --' : '-- प्रदेश छान्नुहोस् --'}
            </option>
            {provinces.map((p) => (
              <option key={p.name} value={p.name}>
                {lang === 'ne' ? `${p.nameNp} (${p.name})` : `${p.name} (${p.nameNp})`}
              </option>
            ))}
          </select>
        </div>

        {/* 2. District Dropdown (Dependent on Province) */}
        <div>
          <label className={labelClass}>
            {lang === 'en' ? 'District' : 'जिल्ला'}
            <span className="text-rose-500 ml-0.5">*</span>
          </label>
          <select
            value={selectedDistrictName}
            onChange={handleDistrictChange}
            disabled={!selectedProvinceName}
            className={`${selectBaseClass} ${selectedProvinceName ? activeClass : disabledClass}`}
          >
            <option value="">
              {!selectedProvinceName
                ? (lang === 'en' ? '-- Select Province First --' : '-- पहिले प्रदेश छान्नुहोस् --')
                : (lang === 'en' ? '-- Select District --' : '-- जिल्ला छान्नुहोस् --')}
            </option>
            {districts.map((d) => (
              <option key={d.name} value={d.name}>
                {lang === 'ne' ? `${d.nameNp} (${d.name})` : `${d.name} (${d.nameNp})`}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Municipality / Local Level Dropdown (Dependent on District) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {lang === 'en' ? 'Local Level / Municipality' : 'स्थानीय तह / नगरपालिका'}
              <span className="text-rose-500 ml-0.5">*</span>
            </label>
            {selectedLocalLevel && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {selectedLocalLevel.totalWards} {lang === 'en' ? 'Wards' : 'वडा'}
              </span>
            )}
          </div>
          <select
            value={selectedLocalLevel ? selectedLocalLevel.fullTitle : (value?.municipalityName || '')}
            onChange={handleMunicipalityChange}
            disabled={!selectedDistrictName}
            className={`${selectBaseClass} ${selectedDistrictName ? activeClass : disabledClass}`}
          >
            <option value="">
              {!selectedDistrictName
                ? (lang === 'en' ? '-- Select District First --' : '-- पहिले जिल्ला छान्नुहोस् --')
                : (lang === 'en' ? '-- Select Local Level --' : '-- स्थानीय तह छान्नुहोस् --')}
            </option>
            {localLevels.map((ll) => (
              <option key={ll.sn} value={ll.fullTitle}>
                {lang === 'ne' ? `${ll.fullTitleNp || ll.fullTitle}` : `${ll.fullTitle}`}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Ward Dropdown (Dependent on Municipality) */}
        <div>
          <label className={labelClass}>
            {lang === 'en' ? 'Ward Number' : 'वडा नं.'}
            <span className="text-rose-500 ml-0.5">*</span>
          </label>
          <select
            value={value?.ward || ''}
            onChange={handleWardChange}
            disabled={!selectedLocalLevel}
            className={`${selectBaseClass} ${selectedLocalLevel ? activeClass : disabledClass}`}
          >
            <option value="">
              {!selectedLocalLevel
                ? (lang === 'en' ? '-- Select Municipality First --' : '-- पहिले नगरपालिका छान्नुहोस् --')
                : (lang === 'en' ? '-- Select Ward --' : '-- वडा छान्नुहोस् --')}
            </option>
            {wards.map((w) => (
              <option key={w} value={String(w)}>
                {lang === 'ne' ? `वडा नं. ${w}` : `Ward ${w}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Composed Address Preview Pill */}
      {(selectedLocalLevel || value?.ward) && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
          <span className="shrink-0 font-bold">📍 {lang === 'en' ? 'Location:' : 'ठेगाना:'}</span>
          <span className="truncate">
            {composeNepalAddress(
              {
                provinceName: selectedProvinceName,
                districtName: selectedDistrictName,
                municipalityName: selectedLocalLevel ? selectedLocalLevel.fullTitle : value?.municipalityName,
                ward: value?.ward
              },
              lang
            )}
          </span>
        </div>
      )}
    </div>
  );
}
