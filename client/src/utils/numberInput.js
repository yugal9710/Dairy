/**
 * Shared input guards preventing negative numeric values across ERP forms.
 */

export const preventNegativeKey = (e) => {
  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
    e.preventDefault();
  }
};

export const nonNegativeValue = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  const str = String(val);
  if (str.startsWith('-')) return '';
  const num = Number(str);
  if (Number.isNaN(num) || num < 0) return '0';
  return val;
};
