import React, { useEffect, useMemo, useState } from 'react';
import { Printer, X, MessageCircle, Copy, Check, Phone, Zap } from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';
import {
  resolveBillContact,
  buildWhatsAppBillMessage,
  openWhatsAppBill,
  useWhatsAppAutoSend
} from '../../utils/whatsappBill';

export default function SlipPrintModal({ isOpen, onClose, slipType, data, tenant, customers = [] }) {
  const { lang, t } = useLanguage();
  const [autoSend, setAutoSend] = useWhatsAppAutoSend();
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [sharedStatus, setSharedStatus] = useState('');

  const contact = useMemo(() => resolveBillContact(data || {}, customers), [data, customers]);
  const isFarmerVoucher = slipType === 'farmer-payment' || slipType === 'farmer-slip';

  useEffect(() => {
    if (isOpen && data) {
      setWhatsappPhone(contact.phone || '');
      setSharedStatus('');
      setCopied(false);
    }
  }, [isOpen, data, contact.phone]);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const result = openWhatsAppBill({
      slipType,
      data,
      tenant,
      customers,
      lang,
      phoneOverride: whatsappPhone,
      askPhoneIfMissing: false
    });
    if (result?.launched) {
      setSharedStatus(
        result.formattedPhone
          ? (lang === 'en' ? `WhatsApp opened for +${result.formattedPhone}` : `+${result.formattedPhone} का लागि व्हाट्सएप खुल्यो`)
          : (lang === 'en' ? 'WhatsApp opened — choose contact to send' : 'व्हाट्सएप खुल्यो — ग्राहक छानेर पठाउनुहोस्')
      );
    }
  };

  const handleCopyBillText = async () => {
    const text = buildWhatsAppBillMessage({ slipType, data, tenant, customers, lang });
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const orgName = tenant?.organizationName || tenant?.name || (lang === 'en' ? 'Sana Kisan Agri Cooperative Ltd.' : 'साना किसान कृषि सहकारी सस्था लि.');
  const orgAddress = tenant?.address || (lang === 'en' ? 'Kathmandu, Nepal' : 'काठमाडौं, नेपाल');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-8">
        {/* Modal Controls (Hidden in print) */}
        <div className="bg-slate-800 text-white p-3.5 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">{lang === 'en' ? 'Bill & WhatsApp Share' : 'रसिद प्रिन्ट र व्हाट्सएप'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1fb857] text-slate-950 rounded-lg text-xs font-extrabold transition shadow-sm cursor-pointer"
              title={lang === 'en' ? 'Send bill on WhatsApp' : 'व्हाट्सएपमा बिल पठाउनुहोस्'}
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" /> {t('print')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WhatsApp Automation & Phone Strip (Hidden in print) */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 space-y-2 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[180px] relative">
              <Phone className="w-3.5 h-3.5 text-emerald-700 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder={lang === 'en' ? 'Customer WhatsApp # (e.g. 98XXXXXXXX)' : 'ग्राहकको व्हाट्सएप नम्बर (जस्तै 98...)'}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs font-semibold bg-white border border-emerald-300 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={handleCopyBillText}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold transition cursor-pointer"
              title={lang === 'en' ? 'Copy formatted WhatsApp bill text' : 'व्हाट्सएप बिल कपी गर्नुहोस्'}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (lang === 'en' ? 'Copied' : 'कपी भयो') : (lang === 'en' ? 'Copy' : 'कपी')}</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoSend(prev => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                autoSend
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
              title={lang === 'en' ? 'Automatically open WhatsApp whenever a new bill is saved for a customer with phone' : 'नयाँ बिल सुरक्षित हुँदा ग्राहकको नम्बर भएमा स्वतः व्हाट्सएप खोल्नुहोस्'}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? `Auto-Send: ${autoSend ? 'ON' : 'OFF'}` : `स्वत: पठाउने: ${autoSend ? 'चालु' : 'बन्द'}`}</span>
            </button>
          </div>

          {sharedStatus && (
            <div className="text-[11px] font-bold text-emerald-800">
              {sharedStatus}
            </div>
          )}
        </div>

        {/* Printable Area */}
        <div className="p-6 font-mono text-slate-800 print-slip print-container">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
            <h2 className="text-base font-black text-slate-900 leading-snug">{orgName}</h2>
            <p className="text-xs text-slate-600">{orgAddress}</p>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 py-0.5 rounded">
              {slipType === 'milk-collection' && (lang === 'en' ? 'Milk Collection Slip' : 'दूध संकलन रसिद')}
              {slipType === 'sale-slip' && (lang === 'en' ? 'Sales Receipt' : 'बिक्री बिल / रसिद')}
              {isFarmerVoucher && (lang === 'en' ? 'Farmer Payment Voucher' : 'कृषक भुक्तानी भौचर')}
              {slipType === 'farmer-statement' && (lang === 'en' ? 'Farmer Statement' : 'कृषक कारोबार विवरण')}
            </div>
          </div>

          {/* Type 1: Milk Collection Slip */}
          {slipType === 'milk-collection' && (
            <div>
              <div className="text-xs space-y-1 mb-3 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>{lang === 'en' ? 'Receipt #' : 'रसिद नं.'}: <strong>#{data.id || 'N/A'}</strong></span>
                  <span>{t('shift')}: <strong>{Number(data.shift ?? data.Shift) === 0 ? t('morning') : t('evening')}</strong></span>
                </div>
                <div className="flex justify-between">
                  <span>{t('code')}: <strong>#{contact.code || data.farmerCode || '1'}</strong></span>
                  <span>{t('date')}: <strong>{new Date(data.dateTimeUtms || data.DateTimeUtms || Date.now()).toLocaleDateString(lang === 'en' ? 'en-US' : 'ne-NP')}</strong></span>
                </div>
                <div>
                  {t('farmer')}: <strong>{contact.name}</strong>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1.5 mb-3">
                <div className="flex justify-between">
                  <span>{t('lblQuantity')}:</span>
                  <span className="font-bold text-sm text-blue-700">{data.quantity || data.Quantity} {t('liters')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('lblFat')}:</span>
                  <span className="font-semibold">{data.fat ?? data.Fat}%</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('lblSnf')}:</span>
                  <span className="font-semibold">{data.snf ?? data.Snf}%</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span>{t('lblCalculatedRate')}:</span>
                  <span className="font-bold">{formatNepaliCurrency(data.rate ?? data.Rate)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-slate-800 pt-1.5 text-sm font-black text-slate-900">
                  <span>{t('lblNetPayableAmount')}:</span>
                  <span className="text-emerald-700 font-extrabold">{formatNepaliCurrency(data.totalPrice)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Type 2: Instant Sale Receipt / Order Bill */}
          {slipType === 'sale-slip' && (
            <div>
              <div className="text-xs space-y-1 mb-3 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>{t('thBillNo')}: <strong>#{data.orderNumber || data.id || 'SALE'}</strong></span>
                  <span>{t('date')}: <strong>{new Date(data.orderDateTimeUtms || data.creationDateTimeUtms || Date.now()).toLocaleDateString(lang === 'en' ? 'en-US' : 'ne-NP')}</strong></span>
                </div>
                <div>
                  {t('customer')}: <strong>{data.customerName || contact.name || t('walkInCustomer')}</strong>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-300 pb-2 mb-2 text-xs">
                <div className="grid grid-cols-12 font-bold border-b pb-1 text-slate-600">
                  <div className="col-span-6">{t('items')}</div>
                  <div className="col-span-2 text-right">{t('quantity')}</div>
                  <div className="col-span-4 text-right">{t('amount')}</div>
                </div>
                {(data.orderProducts || data.items || []).map((p, idx) => (
                  <div key={idx} className="grid grid-cols-12 py-1 border-b border-slate-100">
                    <div className="col-span-6 truncate">{p.productName}</div>
                    <div className="col-span-2 text-right">{p.quantity}</div>
                    <div className="col-span-4 text-right">{formatNepaliCurrency(p.totalPrice || (p.quantity * p.unitPrice))}</div>
                  </div>
                ))}
              </div>

              <div className="text-xs space-y-1 mb-3">
                <div className="flex justify-between">
                  <span>{t('subtotal')}:</span>
                  <span>{formatNepaliCurrency(data.totalAmount)}</span>
                </div>
                {Number(data.discountAmount) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>{t('discount')}:</span>
                    <span>-{formatNepaliCurrency(data.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-t pt-1">
                  <span>{t('netTotal')}:</span>
                  <span className="text-emerald-700">{formatNepaliCurrency(data.netAmount || data.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('paidAmount')}:</span>
                  <span className="font-bold">{formatNepaliCurrency(data.totalPaid ?? data.paidAmount)}</span>
                </div>
                {Number(data.remainingAmount ?? data.balanceAmount) > 0 && (
                  <div className="flex justify-between font-bold text-rose-700">
                    <span>{t('dueAmount')}:</span>
                    <span>{formatNepaliCurrency(data.remainingAmount ?? data.balanceAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Type 3: Farmer Payment Voucher */}
          {isFarmerVoucher && (
            <div>
              <div className="text-xs space-y-1 mb-3 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>{t('lblVoucherNo')}: <strong>{data.referenceNumber || data.ReferenceNumber || `#${data.id || 'N/A'}`}</strong></span>
                  <span>{t('date')}: <strong>{new Date(data.dateTimeUtms || data.DateTimeUtms || Date.now()).toLocaleDateString(lang === 'en' ? 'en-US' : 'ne-NP')}</strong></span>
                </div>
                <div>
                  {t('farmer')}: <strong>{contact.name}</strong> ({t('code')}: #{contact.code || '-'})
                </div>
                <div>
                  {t('lblPaymentMethod')}: <strong>{Number(data.paymentMethod ?? data.PaymentMethod) === 1 || Number(data.paymentMethod ?? data.PaymentMethod) === 2 ? t('bank') : t('cash')}</strong>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2 mb-3">
                <div className="flex justify-between text-sm font-black">
                  <span>{t('paidAmount')}:</span>
                  <span className="text-emerald-700 text-base">{formatNepaliCurrency(data.amount ?? data.Amount)}</span>
                </div>
                {(data.remarks || data.Remarks) && (
                  <div className="text-slate-600 italic">
                    {t('remarks')}: {data.remarks || data.Remarks}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Type 4: Farmer / Member Account Statement */}
          {slipType === 'farmer-statement' && (
            <div>
              <div className="text-xs space-y-1 mb-3 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>{t('code')}: <strong>#{contact.code || data.id || '-'}</strong></span>
                  <span>{t('date')}: <strong>{new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ne-NP')}</strong></span>
                </div>
                <div>
                  {t('farmer')}: <strong>{contact.name}</strong>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 mb-3">
                <div className="flex justify-between">
                  <span>{lang === 'en' ? 'Total Milk Supplied:' : 'जम्मा दूध आपूर्ति:'}</span>
                  <span className="font-bold">{formatNepaliCurrency(data.milkCollectionTotalAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{lang === 'en' ? 'Total Payments Settled:' : 'जम्मा भुक्तानी:'}</span>
                  <span className="font-bold text-emerald-700">{formatNepaliCurrency(data.milkCollectionPaidAmount || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-black">
                  <span>
                    {Number(data.milkCollectionAdvanceAmount) > 0
                      ? (lang === 'en' ? 'Advance Paid:' : 'पेश्की भुक्तानी:')
                      : (lang === 'en' ? 'Remaining Milk Balance:' : 'बाँकी पाउनुपर्ने रकम:')}
                  </span>
                  <span className="text-emerald-700">
                    {formatNepaliCurrency(
                      Number(data.milkCollectionAdvanceAmount) > 0
                        ? data.milkCollectionAdvanceAmount
                        : (data.milkCollectionRemainingAmount || 0)
                    )}
                  </span>
                </div>
                {Number(data.orderRemainingAmount) > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1">
                    <span>{lang === 'en' ? 'Sales Credit Due:' : 'सामान उधारो बाँकी:'}</span>
                    <span>{formatNepaliCurrency(data.orderRemainingAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer note & Signature */}
          <div className="text-center border-t border-dashed border-slate-300 pt-3 text-[11px] text-slate-500">
            <p>{lang === 'en' ? 'Thank you for your business.' : 'हाम्रो सेवा प्रयोग गर्नुभएकोमा धन्यवाद ।'}</p>
            <div className="flex justify-between mt-6 pt-2 text-[10px] text-slate-400">
              <span>{lang === 'en' ? 'Authorized Signature' : 'तयारकर्ता हस्ताक्षर'}</span>
              <span>{lang === 'en' ? 'Customer Signature' : 'प्राप्तकर्ता हस्ताक्षर'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
