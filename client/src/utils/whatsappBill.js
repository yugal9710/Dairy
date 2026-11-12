import { useState, useEffect, useCallback } from 'react';

const WHATSAPP_AUTO_SEND_KEY = 'dairy_whatsapp_auto_send';
const WHATSAPP_AUTO_EVENT = 'dairy-whatsapp-auto-change';

const formatCurrencyText = (amount) => {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateText = (ts, lang = 'en') => {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleString(lang === 'en' ? 'en-US' : 'ne-NP', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Normalize Nepal / international phone numbers for https://wa.me/<digits> links.
 */
export function formatWhatsAppPhone(rawPhone, defaultCountryCode = '977') {
  if (!rawPhone) return '';
  const trimmed = String(rawPhone).trim();
  if (!trimmed) return '';

  let digits = trimmed.replace(/\D/g, '');
  if (!digits || digits.length < 7) return '';

  // Handle explicit international prefix: +... or 00...
  if (trimmed.startsWith('+')) {
    return digits;
  }
  if (digits.startsWith('00') && digits.length > 9) {
    return digits.slice(2);
  }

  // Strip single leading 0 on local formats (e.g. 09841000000 -> 9841000000)
  if (digits.startsWith('0') && digits.length >= 10) {
    digits = digits.replace(/^0+/, '');
  }

  // Prepend default country code (Nepal 977) for 9-10 digit local numbers
  if (digits.length === 9 || digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }

  return digits;
}

export function isWhatsAppAutoSendEnabled() {
  try {
    return localStorage.getItem(WHATSAPP_AUTO_SEND_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setWhatsAppAutoSendEnabled(enabled) {
  const next = Boolean(enabled);
  try {
    localStorage.setItem(WHATSAPP_AUTO_SEND_KEY, String(next));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WHATSAPP_AUTO_EVENT, { detail: next }));
  }
  return next;
}

export function useWhatsAppAutoSend() {
  const [autoSend, setAutoSendState] = useState(isWhatsAppAutoSendEnabled);

  useEffect(() => {
    const onCustomChange = (e) => setAutoSendState(Boolean(e.detail));
    const onStorageChange = (e) => {
      if (e.key === WHATSAPP_AUTO_SEND_KEY) {
        setAutoSendState(e.newValue === 'true');
      }
    };
    window.addEventListener(WHATSAPP_AUTO_EVENT, onCustomChange);
    window.addEventListener('storage', onStorageChange);
    return () => {
      window.removeEventListener(WHATSAPP_AUTO_EVENT, onCustomChange);
      window.removeEventListener('storage', onStorageChange);
    };
  }, []);

  const setAutoSend = useCallback((nextVal) => {
    const resolved = typeof nextVal === 'function' ? nextVal(isWhatsAppAutoSendEnabled()) : nextVal;
    setWhatsAppAutoSendEnabled(resolved);
    setAutoSendState(Boolean(resolved));
  }, []);

  return [autoSend, setAutoSend];
}

/**
 * Resolve customer / farmer contact name, code, and WhatsApp phone from bill payload & directory.
 */
export function resolveBillContact(data = {}, customers = []) {
  const contactId = data?.farmerId || data?.customerId || data?.farmer?.id || data?.customer?.id || data?.id;
  const matchedFromDirectory = customers.find(
    (c) =>
      (contactId && Number(c.id) === Number(contactId)) ||
      (data?.farmer?.code && String(c.code) === String(data.farmer.code)) ||
      (data?.customer?.code && String(c.code) === String(data.customer.code))
  );

  const entity = data?.farmer || data?.customer || matchedFromDirectory || (data?.nameInEnglish || data?.nameInNepali ? data : null);
  const rawPhone =
    data?.whatsappPhone ||
    data?.phone ||
    data?.customerPhone ||
    data?.farmer?.phone ||
    data?.customer?.phone ||
    matchedFromDirectory?.phone ||
    '';

  const name =
    data?.customerName ||
    entity?.nameInEnglish ||
    entity?.nameInNepali ||
    data?.farmerName ||
    'Customer';

  const code = entity?.code || data?.farmerCode || data?.customerCode || '';

  return {
    id: entity?.id || matchedFromDirectory?.id || null,
    code,
    name,
    phone: rawPhone,
    formattedPhone: formatWhatsAppPhone(rawPhone)
  };
}

/**
 * Build a complete WhatsApp bill/slip/statement message across all ERP bill types.
 */
export function buildWhatsAppBillMessage({ slipType, data = {}, tenant = {}, customers = [], lang = 'en' }) {
  const orgName = tenant?.organizationName || tenant?.name || 'Sana Kisan Agri Cooperative Ltd.';
  const orgAddress = tenant?.address || '';
  const contact = resolveBillContact(data, customers);
  const isNe = lang === 'ne';

  const lines = [
    `*${orgName}*`,
    ...(orgAddress ? [orgAddress] : []),
    '--------------------------------'
  ];

  if (slipType === 'milk-collection') {
    const qty = Number(data.quantity || data.Quantity || 0);
    const fat = Number(data.fat || data.Fat || 0);
    const snf = Number(data.snf || data.Snf || 0);
    const rate = Number(data.rate || data.Rate || 0);
    const total = Number(data.totalPrice || data.totalAmount || qty * rate || 0);
    const shiftVal = Number(data.shift ?? data.Shift ?? 0);
    const shiftLabel = shiftVal === 0 ? (isNe ? 'बिहानी (Morning)' : 'Morning') : (isNe ? 'बेलुकी (Evening)' : 'Evening');

    lines.push(
      isNe ? '*दूध संकलन रसिद / Milk Collection Slip*' : '*MILK COLLECTION SLIP*',
      `${isNe ? 'रसिद नं.' : 'Slip #'}: #${data.id || 'N/A'}`,
      `${isNe ? 'मिति' : 'Date'}: ${formatDateText(data.dateTimeUtms || data.DateTimeUtms, lang)}`,
      `${isNe ? 'शिफ्ट' : 'Shift'}: ${shiftLabel}`,
      `${isNe ? 'कृषक' : 'Farmer'}: ${contact.code ? `#${contact.code} - ` : ''}${contact.name}`,
      '--------------------------------',
      `${isNe ? 'परिमाण (Quantity)' : 'Quantity'}: ${qty.toFixed(2)} L`,
      `FAT: ${fat.toFixed(1)}%  |  SNF: ${snf.toFixed(1)}%`,
      `${isNe ? 'दर (Rate)' : 'Rate/L'}: ${formatCurrencyText(rate)}`,
      `*${isNe ? 'जम्मा रकम (Total)' : 'Total Payable'}: ${formatCurrencyText(total)}*`
    );
  } else if (slipType === 'farmer-slip' || slipType === 'farmer-payment') {
    const methodNum = Number(data.paymentMethod ?? data.PaymentMethod ?? 0);
    const methodLabel = methodNum === 1 || methodNum === 2 ? (isNe ? 'बैंक / डिजिटल' : 'Bank Transfer') : (isNe ? 'नगद' : 'Cash');
    const paidAmt = Number(data.amount ?? data.Amount ?? 0);

    lines.push(
      isNe ? '*कृषक भुक्तानी भौचर / Payment Voucher*' : '*FARMER PAYMENT VOUCHER*',
      `${isNe ? 'भौचर नं.' : 'Voucher'}: ${data.referenceNumber || data.ReferenceNumber || `#${data.id || 'N/A'}`}`,
      `${isNe ? 'मिति' : 'Date'}: ${formatDateText(data.dateTimeUtms || data.DateTimeUtms, lang)}`,
      `${isNe ? 'कृषक' : 'Farmer'}: ${contact.code ? `#${contact.code} - ` : ''}${contact.name}`,
      `${isNe ? 'भुक्तानी माध्यम' : 'Method'}: ${methodLabel}`,
      '--------------------------------',
      `*${isNe ? 'भुक्तानी रकम (Paid)' : 'Amount Paid'}: ${formatCurrencyText(paidAmt)}*`,
      ...(data.remarks || data.Remarks ? [`${isNe ? 'कैफियत' : 'Remarks'}: ${data.remarks || data.Remarks}`] : [])
    );
  } else if (slipType === 'farmer-statement') {
    const milkWorth = Number(data.milkCollectionTotalAmount || 0);
    const milkPaid = Number(data.milkCollectionPaidAmount || 0);
    const milkDue = Number(data.milkCollectionRemainingAmount || 0);
    const milkAdvance = Number(data.milkCollectionAdvanceAmount || 0);
    const salesTotal = Number(data.orderTotalAmount || 0);
    const salesDue = Number(data.orderRemainingAmount || 0);

    lines.push(
      isNe ? '*सदस्य/कृषक खाता विवरण / Account Statement*' : '*FARMER / MEMBER ACCOUNT STATEMENT*',
      `${isNe ? 'मिति' : 'Generated'}: ${formatDateText(Date.now(), lang)}`,
      `${isNe ? 'सदस्य' : 'Member'}: ${contact.code ? `#${contact.code} - ` : ''}${contact.name}`,
      '--------------------------------',
      `${isNe ? 'कुल दूध बिक्री' : 'Total Milk Supplied'}: ${formatCurrencyText(milkWorth)}`,
      `${isNe ? 'कुल भुक्तानी प्राप्त' : 'Total Paid'}: ${formatCurrencyText(milkPaid)}`,
      milkAdvance > 0
        ? `*${isNe ? 'पेश्की (Advance)' : 'Advance Paid'}: ${formatCurrencyText(milkAdvance)}*`
        : `*${isNe ? 'बाँकी पाउनुपर्ने' : 'Remaining Milk Due'}: ${formatCurrencyText(milkDue)}*`,
      ...(salesTotal > 0 ? [
        `${isNe ? 'सामान खरिद जम्मा' : 'Dairy Purchases'}: ${formatCurrencyText(salesTotal)}`,
        `${isNe ? 'खरिद बाँकी' : 'Credit Receivable'}: ${formatCurrencyText(salesDue)}`
      ] : [])
    );
  } else {
    // 'sale-slip' (Counter POS Sales & Future Order Bills)
    const items = data.orderProducts || data.items || [];
    const totalAmt = Number(data.totalAmount ?? data.TotalAmount ?? 0);
    const discount = Number(data.discountAmount ?? data.DiscountAmount ?? 0);
    const netAmt = Number(data.netAmount ?? Math.max(0, totalAmt - discount));
    const paidAmt = Number(data.totalPaid ?? data.paidAmount ?? data.PaidAmount ?? 0);
    const dueAmt = Math.max(0, Number(data.remainingAmount ?? data.balanceAmount ?? (netAmt - paidAmt)));
    const billId = data.orderNumber || data.id || 'BILL';

    lines.push(
      isNe ? '*बिक्री बिल / रसिद (Sales Receipt)*' : '*SALES BILL / RECEIPT*',
      `${isNe ? 'बिल नं.' : 'Bill #'}: #${billId}`,
      `${isNe ? 'मिति' : 'Date'}: ${formatDateText(data.orderDateTimeUtms || data.creationDateTimeUtms || data.orderDateUtms, lang)}`,
      `${isNe ? 'ग्राहक' : 'Customer'}: ${contact.code ? `#${contact.code} - ` : ''}${contact.name}`,
      ...(data.deliveryDateUtms ? [`${isNe ? 'डेलिभरी मिति' : 'Delivery'}: ${formatDateText(data.deliveryDateUtms, lang)}`] : []),
      ...(data.deliveryAddress ? [`${isNe ? 'ठेगाना' : 'Address'}: ${data.deliveryAddress}`] : []),
      '--------------------------------'
    );

    if (items.length > 0) {
      items.forEach((p, idx) => {
        const qty = Number(p.quantity || p.Quantity || 0);
        const unitPrice = Number(p.unitPrice || p.UnitPrice || 0);
        const lineTotal = Number(p.totalPrice || qty * unitPrice || 0);
        lines.push(`${idx + 1}. ${p.productName || p.name || 'Item'} x ${qty} = ${formatCurrencyText(lineTotal)}`);
      });
      lines.push('--------------------------------');
    }

    lines.push(`${isNe ? 'जम्मा रकम' : 'Subtotal'}: ${formatCurrencyText(totalAmt)}`);
    if (discount > 0) {
      lines.push(`${isNe ? 'छुट' : 'Discount'}: -${formatCurrencyText(discount)}`);
    }
    lines.push(`*${isNe ? 'खुद जम्मा (Net Total)' : 'Net Total'}: ${formatCurrencyText(netAmt)}*`);
    lines.push(`${isNe ? 'भुक्तानी (Paid)' : 'Paid'}: ${formatCurrencyText(paidAmt)}`);
    if (dueAmt > 0) {
      lines.push(`*${isNe ? 'बाँकी (Due)' : 'Balance Due'}: ${formatCurrencyText(dueAmt)}*`);
    }
    if (data.notes || data.remarks) {
      lines.push(`${isNe ? 'टिप्पणी' : 'Notes'}: ${data.notes || data.remarks}`);
    }
  }

  lines.push(
    '--------------------------------',
    isNe ? 'हाम्रो सेवा प्रयोग गर्नुभएकोमा धन्यवाद ।' : 'Thank you for your business!'
  );

  return lines.join('\n');
}

export function buildWhatsAppUrl({ phone = '', message = '' }) {
  const formatted = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message || '');
  if (formatted) {
    return `https://wa.me/${formatted}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

async function logWhatsAppShareAudit({ slipType, data, contact, formattedPhone }) {
  try {
    const labelMap = {
      'milk-collection': { en: 'Shared Milk Slip via WhatsApp', ne: 'व्हाट्सएपमा दूध रसिद पठाइयो' },
      'sale-slip': { en: 'Shared Sales Bill via WhatsApp', ne: 'व्हाट्सएपमा बिक्री बिल पठाइयो' },
      'farmer-slip': { en: 'Shared Payment Voucher via WhatsApp', ne: 'व्हाट्सएपमा भुक्तानी भौचर पठाइयो' },
      'farmer-payment': { en: 'Shared Payment Voucher via WhatsApp', ne: 'व्हाट्सएपमा भुक्तानी भौचर पठाइयो' },
      'farmer-statement': { en: 'Shared Account Statement via WhatsApp', ne: 'व्हाट्सएपमा खाता विवरण पठाइयो' }
    };
    const labels = labelMap[slipType] || { en: 'Shared Bill via WhatsApp', ne: 'व्हाट्सएपमा बिल पठाइयो' };
    const isFarmerType = slipType !== 'sale-slip';
    const refId = data?.referenceNumber || data?.orderNumber || (data?.id ? `#${data.id}` : 'WhatsApp');

    await fetch('/api/AuditLog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'WHATSAPP_SHARE_BILL',
        category: 'WhatsApp Share',
        actionLabelEn: labels.en,
        actionLabelNe: labels.ne,
        customerId: contact?.id || data?.customerId || null,
        farmerId: isFarmerType ? (contact?.id || data?.farmerId || null) : null,
        referenceId: String(refId),
        details: `${labels.en} (${refId}) to ${contact?.name || 'Customer'}${formattedPhone ? ` (+${formattedPhone})` : ''}`
      })
    });
  } catch {
    // Non-blocking audit logging
  }
}

/**
 * Open WhatsApp Web / Desktop / App with the formatted bill and customer's number.
 */
export function openWhatsAppBill({
  slipType,
  data = {},
  tenant = {},
  customers = [],
  lang = 'en',
  phoneOverride = '',
  askPhoneIfMissing = false
}) {
  const contact = resolveBillContact(data, customers);
  let targetPhone = phoneOverride || contact.phone || '';
  let formattedPhone = formatWhatsAppPhone(targetPhone);

  if (!formattedPhone && askPhoneIfMissing && typeof window !== 'undefined') {
    const promptMsg = lang === 'en'
      ? `Enter WhatsApp number for ${contact.name} (leave empty to choose contact in WhatsApp):`
      : `${contact.name} को व्हाट्सएप नम्बर लेख्नुहोस् (खाली छोडेमा व्हाट्सएप भित्र छान्न सकिन्छ):`;
    const entered = window.prompt(promptMsg, targetPhone || '98');
    if (entered === null) {
      return { launched: false, reason: 'cancelled' };
    }
    targetPhone = entered;
    formattedPhone = formatWhatsAppPhone(entered);
  }

  const message = buildWhatsAppBillMessage({ slipType, data, tenant, customers, lang });
  const url = buildWhatsAppUrl({ phone: targetPhone, message });

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  logWhatsAppShareAudit({ slipType, data, contact, formattedPhone });
  return { launched: true, url, formattedPhone, message };
}

/**
 * Automatically send bill via WhatsApp on save when Auto-Send automation is enabled and customer has a phone.
 */
export function maybeAutoSendWhatsApp({ slipType, data = {}, tenant = {}, customers = [], lang = 'en' }) {
  if (!isWhatsAppAutoSendEnabled()) {
    return { launched: false, reason: 'disabled' };
  }
  const contact = resolveBillContact(data, customers);
  if (!contact.formattedPhone) {
    return { launched: false, reason: 'no-phone' };
  }
  return openWhatsAppBill({
    slipType,
    data,
    tenant,
    customers,
    lang,
    phoneOverride: contact.phone,
    askPhoneIfMissing: false
  });
}
