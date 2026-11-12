import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, X, Save } from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';

export default function MilkFatSnfConfigModal({ isOpen, onClose, config, onSaveSuccess }) {
  const { lang, t } = useLanguage();
  const [buyingFatPrice, setBuyingFatPrice] = useState(7.50);
  const [buyingSnfPrice, setBuyingSnfPrice] = useState(4.00);
  const [sellingFatPrice, setSellingFatPrice] = useState(9.00);
  const [sellingSnfPrice, setSellingSnfPrice] = useState(5.00);
  const [sellingPrice, setSellingPrice] = useState(90.00);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (config) {
      setBuyingFatPrice(config.buyingFatPrice || 7.50);
      setBuyingSnfPrice(config.buyingSnfPrice || 4.00);
      setSellingFatPrice(config.sellingFatPrice || 9.00);
      setSellingSnfPrice(config.sellingSnfPrice || 5.00);
      setSellingPrice(config.sellingPrice || 90.00);
    }
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/MilkFatAndSnfConfiguration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyingFatPrice: Number(buyingFatPrice),
          buyingSnfPrice: Number(buyingSnfPrice),
          sellingFatPrice: Number(sellingFatPrice),
          sellingSnfPrice: Number(sellingSnfPrice),
          sellingPrice: Number(sellingPrice)
        })
      });

      if (res.ok) {
        const updated = await res.json();
        if (onSaveSuccess) onSaveSuccess(updated);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sampleRate = (4.5 * Number(buyingFatPrice) + 8.2 * Number(buyingSnfPrice)).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-200" />
            <h3 className="font-bold text-base">{t('fatSnfModalTitle')}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section 1: Buying Rates */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 border-b pb-1">
              {t('secFarmerBuyingRates')}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('lblBuyingFatPrice')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={buyingFatPrice}
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault(); }}
                  onChange={(e) => setBuyingFatPrice(e.target.value.replace(/[-+eE]/g, ''))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('lblBuyingSnfPrice')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={buyingSnfPrice}
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault(); }}
                  onChange={(e) => setBuyingSnfPrice(e.target.value.replace(/[-+eE]/g, ''))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                  required
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 italic">
              {lang === 'en'
                ? `Example: FAT 4.5% x Rs ${buyingFatPrice} + SNF 8.2% x Rs ${buyingSnfPrice} = Rs ${sampleRate} per Liter`
                : `उदाहरण: फ्याट ४.५% x रु ${buyingFatPrice} + एस.एन.एफ. ८.२% x रु ${buyingSnfPrice} = रु ${sampleRate} प्रति लिटर`}
            </p>
          </div>

          {/* Section 2: Selling Rates */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 border-b pb-1">
              {t('secSellingRates')}
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('lblSellingFatPrice')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellingFatPrice}
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault(); }}
                  onChange={(e) => setSellingFatPrice(e.target.value.replace(/[-+eE]/g, ''))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('lblSellingSnfPrice')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellingSnfPrice}
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault(); }}
                  onChange={(e) => setSellingSnfPrice(e.target.value.replace(/[-+eE]/g, ''))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('lblSellingFlatPrice')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellingPrice}
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault(); }}
                  onChange={(e) => setSellingPrice(e.target.value.replace(/[-+eE]/g, ''))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-600/20"
            >
              <Save className="w-4 h-4" /> {loading ? (lang === 'en' ? 'Saving...' : 'सुरक्षित गर्दै...') : t('btnSaveRates')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
