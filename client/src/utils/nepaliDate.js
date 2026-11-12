import NepaliDate from 'nepali-date-converter';

export const NEPALI_MONTHS = [
  { bs: 'वैशाख', en: 'Baisakh', short: 'बैशाख' },
  { bs: 'जेठ', en: 'Jestha', short: 'जेठ' },
  { bs: 'असार', en: 'Ashadh', short: 'असार' },
  { bs: 'श्रावण', en: 'Shrawan', short: 'साउन' },
  { bs: 'भाद्र', en: 'Bhadra', short: 'भदौ' },
  { bs: 'असोज', en: 'Ashwin', short: 'असोज' },
  { bs: 'कार्तिक', en: 'Kartik', short: 'कात्तिक' },
  { bs: 'मंसिर', en: 'Mangsir', short: 'मंसिर' },
  { bs: 'पुष', en: 'Poush', short: 'पुष' },
  { bs: 'माघ', en: 'Magh', short: 'माघ' },
  { bs: 'फागुन', en: 'Falgun', short: 'फागुन' },
  { bs: 'चैत', en: 'Chaitra', short: 'चैत' }
];

export const NEPALI_DAYS = [
  { bs: 'आइत', en: 'Sun', fullBs: 'आइतबार', fullEn: 'Sunday', isHoliday: false },
  { bs: 'सोम', en: 'Mon', fullBs: 'सोमबार', fullEn: 'Monday', isHoliday: false },
  { bs: 'मङ्गल', en: 'Tue', fullBs: 'मङ्गलबार', fullEn: 'Tuesday', isHoliday: false },
  { bs: 'बुध', en: 'Wed', fullBs: 'बुधबार', fullEn: 'Wednesday', isHoliday: false },
  { bs: 'बिही', en: 'Thu', fullBs: 'बिहीबार', fullEn: 'Thursday', isHoliday: false },
  { bs: 'शुक्र', en: 'Fri', fullBs: 'शुक्रबार', fullEn: 'Friday', isHoliday: false },
  { bs: 'शनि', en: 'Sat', fullBs: 'शनिबार', fullEn: 'Saturday', isHoliday: true }
];

export const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toNepaliDigits(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\d/g, d => NEPALI_DIGITS[Number(d)]);
}

export function formatNepaliCurrency(amount) {
  const num = Number(amount) || 0;
  return `रू\u00A0${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getTodayBS() {
  try {
    const nd = new NepaliDate(new Date());
    const y = nd.getYear();
    const m = nd.getMonth();
    const d = nd.getDate();
    const day = nd.getDay();
    const monthName = NEPALI_MONTHS[m] ? NEPALI_MONTHS[m].bs : '';
    const dayName = NEPALI_DAYS[day] ? NEPALI_DAYS[day].fullBs : '';
    return {
      year: y,
      month: m,
      date: d,
      day: day,
      monthName,
      dayName,
      formattedBs: `${toNepaliDigits(d)} ${monthName} ${toNepaliDigits(y)}`,
      shortBs: `${y}/${String(m + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}`
    };
  } catch (e) {
    const d = new Date();
    return {
      year: 2083,
      month: 7,
      date: 24,
      day: 2,
      monthName: 'कार्तिक',
      dayName: 'मङ्गलबार',
      formattedBs: `२४ कार्तिक २०८३`,
      shortBs: '2083/07/24'
    };
  }
}

export function adToBs(dateInput) {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const nd = new NepaliDate(d);
    const m = nd.getMonth();
    return {
      year: nd.getYear(),
      month: m + 1,
      date: nd.getDate(),
      monthName: NEPALI_MONTHS[m] ? NEPALI_MONTHS[m].bs : '',
      formattedBs: `${toNepaliDigits(nd.getDate())} ${NEPALI_MONTHS[m]?.bs || ''} ${toNepaliDigits(nd.getYear())}`,
      shortBs: `${nd.getYear()}/${String(m + 1).padStart(2, '0')}/${String(nd.getDate()).padStart(2, '0')}`
    };
  } catch (e) {
    return { formattedBs: '', shortBs: '' };
  }
}
