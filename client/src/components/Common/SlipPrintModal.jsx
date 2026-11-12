import React from 'react';
import { Printer, X } from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';

export default function SlipPrintModal({ isOpen, onClose, slipType, data, tenant }) {
  const { lang, t } = useLanguage();
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
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
            <span className="font-semibold text-sm">{lang === 'en' ? 'Print Preview' : 'प्रिन्ट रसिद पूर्वावलोकन'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              <Printer className="w-4 h-4" /> {t('print')}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
              {slipType === 'farmer-payment' && (lang === 'en' ? 'Farmer Payment Voucher' : 'कृषक भुक्तानी भौचर')}
              {slipType === 'farmer-statement' && (lang === 'en' ? 'Farmer Statement' : 'कृषक कारोबार विवरण')}
            </div>
          </div>

          {/* Type 1: Milk Collection Slip */}
          {slipType === 'milk-collection' && (
            <div>
              <div className="text-xs space-y-1 mb-3 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>{lang === 'en' ? 'Receipt #' : 'रसिद नं.'}: <strong>#{data.id || 'N/A'}</strong></span>
                  <span>{t('shift')}: <strong>{data.shift === 0 ? t('morning') : t('evening')}</strong></span>
                </div>
                <div className="flex justify-between">
                  <span>{t('code')}: <strong>#{data.farmer?.code || data.farmerCode || '1'}</strong></span>
                  <span>{t('date')}: <strong>{new Date(data.dateTimeUtms || Date.now()).toLocaleDateString(lang === 'en' ? 'en-US' : 'ne-NP')}</strong></span>
                </div>
                <div>
                  {t('farmer')}: <strong>{lang === 'en' ? (data.farmer?.nameInEnglish || data.farmer?.nameInNepali || data.farmerName || 'Farmer') : (data.farmer?.nameInNepali || data.farmer?.nameInEnglish || data.farmerName || 'कृषक')}</strong>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1.5 mb-3">
                <div className="flex justify-between">
                  <span>{t('lblQuantity')}:</span>
                  <span className="font-bold text-sm text-blue-700">{data.quantity} {t('liters')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('lblFat')}:</span>
                  <span className="font-semibold">{data.fat}%</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('lblSnf')}:</span>
                  <span className="font-semibold">{data.snf}%</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span>{t('lblCalculatedRate')}:</span>
                  <span className="font-bold">{formatNepaliCurrency(data.rate)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-slate-800 pt-1.5 text-sm font-black text-slate-900">
                  <span>{t('lblNetPayableAmount')}:</span>
                  <span className="text-emerald-700 font-extrabold">{formatNepaliCurrency(data.totalPrice)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Type 2: Instant Sale Receipt */}
          {slipType === 'sale-slip' && (
            <div>
              <div className="text-xs space-y-1 mb-3 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>{t('thBillNo')}: <strong>#{data.id || 'SALE'}</strong></span>
                  <span>{t('date')}: <strong>{new Date(data.orderDateTimeUtms || Date.now()).toLocaleDateString(lang === 'en' ? 'en-US' : 'ne-NP')}</strong></span>
                </div>
                <div>
                  {t('customer')}: <strong>{data.customerName || (lang === 'en' ? (data.customer?.nameInEnglish || data.customer?.nameInNepali) : (data.customer?.nameInNepali || data.customer?.nameInEnglish)) || t('walkInCustomer')}</strong>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-300 pb-2 mb-2 text-xs">
                <div className="grid grid-cols-12 font-bold border-b pb-1 text-slate-600">
                  <div className="col-span-6">{t('items')}</div>
                  <div className="col-span-2 text-right">{t('quantity')}</div>
                  <div className="col-span-4 text-right">{t('amount')}</div>
                </div>
                {(data.orderProducts || []).map((p, idx) => (
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
                  <span className="font-bold">{formatNepaliCurrency(data.totalPaid)}</span>
                </div>
                {Number(data.remainingAmount) > 0 && (
                  <div className="flex justify-between font-bold text-rose-700">
                    <span>{t('dueAmount')}:</span>
                    <span>{formatNepaliCurrency(data.remainingAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Type 3: Farmer Payment Voucher */}
          {slipType === 'farmer-payment' && (
            <div>
              <div className="text-xs space-y-1 mb-3 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>{t('lblVoucherNo')}: <strong>{data.referenceNumber || `#${data.id}`}</strong></span>
                  <span>{t('date')}: <strong>{new Date(data.dateTimeUtms || Date.now()).toLocaleDateString(lang === 'en' ? 'en-US' : 'ne-NP')}</strong></span>
                </div>
                <div>
                  {t('farmer')}: <strong>{lang === 'en' ? (data.farmer?.nameInEnglish || data.farmer?.nameInNepali || 'Farmer') : (data.farmer?.nameInNepali || data.farmer?.nameInEnglish || 'कृषक')}</strong> ({t('code')}: #{data.farmer?.code})
                </div>
                <div>
                  {t('lblPaymentMethod')}: <strong>{data.paymentMethod === 1 ? t('bank') : t('cash')}</strong>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2 mb-3">
                <div className="flex justify-between text-sm font-black">
                  <span>{t('paidAmount')}:</span>
                  <span className="text-emerald-700 text-base">{formatNepaliCurrency(data.amount)}</span>
                </div>
                {data.remarks && (
                  <div className="text-slate-600 italic">
                    {t('remarks')}: {data.remarks}
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
