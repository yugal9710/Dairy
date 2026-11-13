import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Save,
  X,
  User,
  Printer,
  Trash2,
  Edit,
  Search,
  Calendar,
  RotateCcw,
  UserCheck,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Info,
  Milk,
  Plus,
  Lock,
  Unlock,
  MessageCircle,
  Zap
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  openWhatsAppBill,
  maybeAutoSendWhatsApp,
  useWhatsAppAutoSend
} from '../../utils/whatsappBill';

const DATE_LOCK_STORAGE_KEY = 'dairy_milk_collection_date_lock';

const getNowDateTimeLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getCollectionActivityUtms = (c) => Number(
  c?.updatedAtUtms ||
  c?.createdAtUtms ||
  (Number(c?.id) > 1000000000000 ? Number(c.id) : 0) ||
  c?.dateTimeUtms ||
  0
);

const loadSavedDateLock = () => {
  try {
    const raw = localStorage.getItem(DATE_LOCK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.locked && parsed?.dateTimeLocal) {
        return { locked: true, dateTimeLocal: String(parsed.dateTimeLocal) };
      }
    }
  } catch (_) {}
  return { locked: false, dateTimeLocal: '' };
};

export default function MilkCollectionManager({
  collections = [],
  farmers = [],
  config,
  tenant,
  onRefresh,
  onPrintSlip,
  onInspectFarmer
}) {
  const { lang, t } = useLanguage();
  const formRef = useRef(null);
  const [autoWhatsApp, setAutoWhatsApp] = useWhatsAppAutoSend();

  // Modal State for "Record Milk Intake" (Image 2)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditingId, setModalEditingId] = useState(null);

  // ----------------------------------------------------
  // Inline Form State (Image 1 Top Section)
  // ----------------------------------------------------
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const savedLock = useMemo(loadSavedDateLock, []);
  const [isDateLocked, setIsDateLocked] = useState(savedLock.locked);

  const [farmerCode, setFarmerCode] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [fat, setFat] = useState('');
  const [snf, setSnf] = useState('');
  const [dateTimeLocal, setDateTimeLocal] = useState(
    savedLock.locked ? savedLock.dateTimeLocal : getNowDateTimeLocal()
  );
  const [shift, setShift] = useState(() => {
    const refDt = savedLock.locked && savedLock.dateTimeLocal ? new Date(savedLock.dateTimeLocal) : new Date();
    return refDt.getHours() < 12 ? 0 : 1; // 0: Morning, 1: Evening
  });

  useEffect(() => {
    try {
      if (isDateLocked && dateTimeLocal) {
        localStorage.setItem(DATE_LOCK_STORAGE_KEY, JSON.stringify({ locked: true, dateTimeLocal }));
      } else {
        localStorage.removeItem(DATE_LOCK_STORAGE_KEY);
      }
    } catch (_) {}
  }, [isDateLocked, dateTimeLocal]);

  const [inlineLoading, setInlineLoading] = useState(false);
  const [inlineNotice, setInlineNotice] = useState('');
  const [inlineNoticeType, setInlineNoticeType] = useState('warning'); // 'warning' | 'info' | 'success'

  // ----------------------------------------------------
  // Modal Form State (Image 2)
  // ----------------------------------------------------
  const [modalFarmerCode, setModalFarmerCode] = useState('1');
  const [modalSelectedFarmerId, setModalSelectedFarmerId] = useState('');
  const [modalShift, setModalShift] = useState(1); // Default Evening or Morning
  const [modalDate, setModalDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [modalQuantity, setModalQuantity] = useState('0.0');
  const [modalFat, setModalFat] = useState('4.5');
  const [modalSnf, setModalSnf] = useState('8.2');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalNotice, setModalNotice] = useState('');

  // ----------------------------------------------------
  // Filter Bar State (Image 1 Bottom Section)
  // ----------------------------------------------------
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');

  // Rate config values from MilkFatAndSnfConfiguration
  const fatRate = Number(config?.buyingFatPrice || 7.50);
  const snfRate = Number(config?.buyingSnfPrice || 4.00);

  // ----------------------------------------------------
  // Negative Number Prevention Helpers
  // ----------------------------------------------------
  const sanitizeNonNegative = (val) => {
    if (val === null || val === undefined) return '';
    return String(val).replace(/[-+eE]/g, '');
  };

  const preventNegativeKey = (e) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  };

  // ----------------------------------------------------
  // Inline Auto-Calculations (Protected from negative values)
  // ----------------------------------------------------
  const safeFat = Math.max(0, Number(fat) || 0);
  const safeSnf = Math.max(0, Number(snf) || 0);
  const safeQty = Math.max(0, Number(quantity) || 0);
  const totalFatPriceNum = safeFat * fatRate;
  const totalSnfPriceNum = safeSnf * snfRate;
  const totalFatPrice = fat !== '' ? totalFatPriceNum.toFixed(2) : '';
  const totalSnfPrice = snf !== '' ? totalSnfPriceNum.toFixed(2) : '';
  const inlineCurrentRate = Number((totalFatPriceNum + totalSnfPriceNum).toFixed(2));
  const inlineCurrentTotal = (inlineCurrentRate * safeQty).toFixed(2);

  // ----------------------------------------------------
  // Modal Auto-Calculations (Protected from negative values)
  // ----------------------------------------------------
  const modalCalculatedRate = useMemo(() => {
    const f = Math.max(0, Number(modalFat) || 0);
    const s = Math.max(0, Number(modalSnf) || 0);
    return Number((f * fatRate + s * snfRate).toFixed(2));
  }, [modalFat, modalSnf, fatRate, snfRate]);

  const modalCalculatedTotal = useMemo(() => {
    const q = Math.max(0, Number(modalQuantity) || 0);
    return Number((modalCalculatedRate * q).toFixed(2));
  }, [modalCalculatedRate, modalQuantity]);

  const getSelectedDayStartUtms = (dtLocal) => {
    if (dtLocal) {
      const datePart = String(dtLocal).split('T')[0];
      const parts = datePart.split('-').map(Number);
      if (parts.length === 3 && parts.every(Number.isFinite)) {
        return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0).getTime();
      }
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  };

  const checkInlineDuplicateNotice = (farmerObj, dtLocal, currentShift) => {
    if (!farmerObj) return '';
    const refDateStr = (dtLocal ? new Date(dtLocal) : new Date()).toDateString();
    const duplicate = collections.find(c => {
      if (c.isDeleted || (inlineEditingId && c.id === inlineEditingId)) return false;
      const cDate = new Date(c.dateTimeUtms).toDateString();
      const cFarmerId = c.customerId || c.farmerId;
      return cDate === refDateStr && Number(cFarmerId) === Number(farmerObj.id) && Number(c.shift) === Number(currentShift);
    });
    if (!duplicate) return '';
    const shiftText = Number(currentShift) === 0
      ? (lang === 'en' ? 'Morning' : 'बिहानी')
      : (lang === 'en' ? 'Evening' : 'बेलुकी');
    const dateDisplay = (dtLocal ? new Date(dtLocal) : new Date()).toLocaleDateString();
    return lang === 'en'
      ? `Notice: Farmer #${farmerObj.code || farmerObj.id} already has a ${shiftText} entry on ${dateDisplay}.`
      : `सूचना: कृषक नं. #${farmerObj.code || farmerObj.id} को ${dateDisplay} (${shiftText} शिफ्ट) को दूध दर्ता भइसकेको छ ।`;
  };

  const handleToggleDateLock = () => {
    if (isDateLocked) {
      setIsDateLocked(false);
      setInlineNoticeType('info');
      setInlineNotice(
        lang === 'en'
          ? 'Collection date unlocked. You may now select a different date.'
          : 'संकलन मिति अनलक गरियो । अब अर्को मिति छनौट गर्न सक्नुहुन्छ ।'
      );
      return;
    }

    const activeDt = dateTimeLocal || getNowDateTimeLocal();
    if (!dateTimeLocal) {
      setDateTimeLocal(activeDt);
      setShift(new Date(activeDt).getHours() < 12 ? 0 : 1);
    }
    setIsDateLocked(true);
    const displayDt = new Date(activeDt).toLocaleString();
    setInlineNoticeType('info');
    setInlineNotice(
      lang === 'en'
        ? `Date locked to ${displayDt}. Date stays fixed across entries until unlocked.`
        : `मिति ${displayDt} मा लक गरियो । अनलक नगरेसम्म मिति स्थिर रहनेछ ।`
    );
  };

  // Adjust shift when dateTimeLocal changes in inline form (blocked when locked)
  const handleDateTimeChange = (e) => {
    if (isDateLocked) return;
    const val = e.target.value;
    setDateTimeLocal(val);
    let nextShift = shift;
    if (val) {
      const h = new Date(val).getHours();
      nextShift = h < 12 ? 0 : 1;
      setShift(nextShift);
    }
    if (selectedFarmer) {
      const dupMsg = checkInlineDuplicateNotice(selectedFarmer, val, nextShift);
      if (dupMsg) {
        setInlineNoticeType('warning');
        setInlineNotice(dupMsg);
      } else if (inlineNoticeType === 'warning') {
        setInlineNotice('');
      }
    }
  };

  // Farmer lookup by code for inline form (does NOT auto-fill FAT/SNF; only Allocated button fills previous-date FAT & SNF)
  const lookupFarmerInline = (codeStr) => {
    if (!codeStr || !String(codeStr).trim()) {
      if (selectedFarmer && !inlineEditingId) {
        setFat('');
        setSnf('');
      }
      setSelectedFarmer(null);
      setInlineNotice('');
      setInlineNoticeType('warning');
      return;
    }
    const cleanCode = String(codeStr).trim().toUpperCase();
    const matched = farmers.find(f => {
      const fCode = String(f.code || '').trim().toUpperCase();
      const fId = String(f.id);
      if (fCode === cleanCode || fId === cleanCode) return true;
      const numMatch = fCode.match(/(\d+)$/);
      if (numMatch && (numMatch[1] === cleanCode || String(parseInt(numMatch[1], 10)) === cleanCode)) {
        return true;
      }
      return false;
    });
    if (matched) {
      if (selectedFarmer && Number(selectedFarmer.id) !== Number(matched.id) && !inlineEditingId) {
        setFat('');
        setSnf('');
      }
      setSelectedFarmer(matched);
      const dupMsg = checkInlineDuplicateNotice(matched, dateTimeLocal, shift);
      if (dupMsg) {
        setInlineNoticeType('warning');
        setInlineNotice(dupMsg);
      } else {
        setInlineNotice('');
      }
    } else {
      if (selectedFarmer && !inlineEditingId) {
        setFat('');
        setSnf('');
      }
      setSelectedFarmer(null);
      setInlineNotice('');
      setInlineNoticeType('warning');
    }
  };

  const handleFarmerCodeChange = (e) => {
    const val = e.target.value;
    setFarmerCode(val);
    lookupFarmerInline(val);
  };

  // Reset Inline Form (keeps locked date & shift fixed when Date Lock is active)
  const handleResetInlineForm = () => {
    setInlineEditingId(null);
    setFarmerCode('');
    setSelectedFarmer(null);
    setQuantity('');
    setFat('');
    setSnf('');
    if (!isDateLocked) {
      const freshNow = getNowDateTimeLocal();
      setDateTimeLocal(freshNow);
      setShift(new Date().getHours() < 12 ? 0 : 1);
    }
    setInlineNotice('');
    setInlineNoticeType('warning');
  };

  // Shared helper: looks up the farmer's latest entry strictly from a previous date (< selectedDayStart)
  const lookupPreviousDateFatSnf = async (farmer, referenceDtString) => {
    const selectedDayStart = getSelectedDayStartUtms(referenceDtString);
    const selectedDateDisplay = new Date(selectedDayStart).toLocaleDateString();

    const localPrev = collections
      .filter(c =>
        !c.isDeleted &&
        (Number(c.farmerId) === Number(farmer.id) || Number(c.customerId) === Number(farmer.id)) &&
        Number(c.dateTimeUtms) < selectedDayStart
      )
      .sort((a, b) => Number(b.dateTimeUtms) - Number(a.dateTimeUtms))[0];

    let info = null;
    try {
      const res = await fetch(
        `/api/Customer/withLastProductQualityInfo?code=${encodeURIComponent(farmer.code || farmer.id)}&customerId=${encodeURIComponent(farmer.id)}&beforeStartUtms=${selectedDayStart}`
      );
      if (res.ok) {
        info = await res.json();
      }
    } catch (err) {
      console.warn('Failed to fetch previous-date quality info:', err);
    }

    const target = info?.previousDateEntry || (info?.hasPreviousDateEntry ? info?.lastEntry : null) || localPrev;
    if (!target || Number(target.dateTimeUtms) >= selectedDayStart) {
      return { found: false, selectedDateDisplay };
    }

    return {
      found: true,
      fat: target.fat !== undefined ? Number(target.fat) : (info?.lastFat ?? 0),
      snf: target.snf !== undefined ? Number(target.snf) : (info?.lastSnf ?? 0),
      prevDateDisplay: new Date(target.dateTimeUtms).toLocaleDateString()
    };
  };

  // Allocated button action: fills ONLY FAT & SNF using data from the previous date
  const handleApplyLastQuality = async () => {
    let farmer = selectedFarmer;

    // If farmer is not set yet but farmerCode has a value, resolve it
    if (!farmer && farmerCode && String(farmerCode).trim()) {
      const cleanCode = String(farmerCode).trim();
      const matched = farmers.find(f => String(f.code) === cleanCode || String(f.id) === cleanCode);
      if (matched) {
        farmer = matched;
        setSelectedFarmer(matched);
      }
    }

    if (!farmer) {
      setInlineNoticeType('warning');
      setInlineNotice(
        lang === 'en'
          ? 'Please enter or select a farmer first.'
          : 'कृपया पहिले कृषक छान्नुहोस् वा कृषक कोड प्रविष्ट गर्नुहोस् ।'
      );
      return;
    }

    const result = await lookupPreviousDateFatSnf(farmer, dateTimeLocal);
    if (!result.found) {
      setInlineNoticeType('info');
      setInlineNotice(
        lang === 'en'
          ? `No previous-date milk collection entry found for Farmer #${farmer.code} (${farmer.nameInEnglish || farmer.nameInNepali || ''}) before ${result.selectedDateDisplay}.`
          : `${result.selectedDateDisplay} भन्दा अघिल्लो मितिमा कृषक नं. #${farmer.code} (${farmer.nameInNepali || farmer.nameInEnglish}) को दूध संकलन प्रविष्टि भेटिएन ।`
      );
      return;
    }

    // Fill ONLY FAT & SNF from previous date; keep selected/locked Date, Quantity, and Shift unchanged
    setFat(String(result.fat));
    setSnf(String(result.snf));

    setInlineNoticeType('success');
    setInlineNotice(
      lang === 'en'
        ? `✓ Allocated FAT (${result.fat}%) & SNF (${result.snf}%) from previous date (${result.prevDateDisplay}) for Farmer #${farmer.code}.`
        : `✓ कृषक नं. #${farmer.code} को अघिल्लो मिति (${result.prevDateDisplay}) बाट फ्याट (${result.fat}%) र एस.एन.एफ. (${result.snf}%) भरियो ।`
    );
  };

  // Save Inline Form (Submit)
  const handleInlineSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFarmer) {
      alert(lang === 'en' ? 'Please enter a valid farmer code.' : 'कृपया मान्य कृषक कोड प्रविष्ट गर्नुहोस् ।');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      alert(lang === 'en' ? 'Milk quantity must be greater than zero.' : 'कृपया दूधको परिमाण शून्यभन्दा बढी प्रविष्ट गर्नुहोस् ।');
      return;
    }
    if (Number(fat) < 0 || Number(snf) < 0) {
      alert(lang === 'en' ? 'FAT and SNF cannot be negative.' : 'फ्याट र एस.एन.एफ. ऋणात्मक हुन सक्दैन ।');
      return;
    }

    setInlineLoading(true);
    try {
      const dateUtms = dateTimeLocal ? new Date(dateTimeLocal).getTime() : Date.now();
      const payload = {
        customerId: Number(selectedFarmer.id),
        Quantity: Math.max(0.01, Number(quantity)),
        Fat: Math.max(0, Number(fat)),
        Snf: Math.max(0, Number(snf)),
        FatRate: fatRate,
        SnfRate: snfRate,
        Rate: inlineCurrentRate,
        Shift: Number(shift),
        DateTimeUtms: dateUtms
      };

      const url = inlineEditingId ? `/api/MilkCollection/${inlineEditingId}` : '/api/MilkCollection';
      const method = inlineEditingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedData = await res.json().catch(() => null);
        const resolvedId = (typeof savedData === 'number' || typeof savedData === 'string') ? savedData : (savedData?.id || inlineEditingId);
        const slipPayload = {
          ...payload,
          id: resolvedId,
          farmer: selectedFarmer,
          totalPrice: Number(inlineCurrentTotal)
        };
        maybeAutoSendWhatsApp({
          slipType: 'milk-collection',
          data: slipPayload,
          tenant,
          customers: farmers,
          lang
        });
        if (onPrintSlip) {
          onPrintSlip(slipPayload);
        }
        handleResetInlineForm();
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || err.message || 'Error saving milk collection.');
      }
    } catch (err) {
      console.error(err);
      alert('Network or server error.');
    } finally {
      setInlineLoading(false);
    }
  };

  // ----------------------------------------------------
  // Modal Handlers (Image 2)
  // ----------------------------------------------------
  const handleOpenAddModal = () => {
    setModalEditingId(null);
    setModalFarmerCode('1');
    const defaultFarmer = farmers.find(f => String(f.code) === '1') || farmers[0];
    setModalSelectedFarmerId(defaultFarmer ? String(defaultFarmer.id) : '');
    setModalShift(isDateLocked ? Number(shift) : 1);
    if (isDateLocked && dateTimeLocal) {
      setModalDate(String(dateTimeLocal).split('T')[0]);
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      setModalDate(`${y}-${m}-${d}`);
    }
    setModalQuantity('');
    setModalFat('');
    setModalSnf('');
    setModalNotice('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (col) => {
    setModalEditingId(col.id);
    const fId = col.customerId || col.farmerId;
    setModalSelectedFarmerId(String(fId));
    const matchedF = farmers.find(f => f.id === fId);
    setModalFarmerCode(String(matchedF?.code || col.farmer?.code || ''));
    setModalShift(col.shift !== undefined ? Number(col.shift) : 0);
    if (col.dateTimeUtms) {
      const d = new Date(col.dateTimeUtms);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setModalDate(`${y}-${m}-${day}`);
    }
    setModalQuantity(String(col.quantity || '0.0'));
    setModalFat(String(col.fat || '4.5'));
    setModalSnf(String(col.snf || '8.2'));
    setModalNotice('');
    setModalOpen(true);
  };

  const handleModalFarmerCodeChange = (code) => {
    setModalFarmerCode(code);
    const cleanCode = String(code || '').trim().toUpperCase();
    const matched = farmers.find(f => {
      const fCode = String(f.code || '').trim().toUpperCase();
      const fId = String(f.id);
      if (fCode === cleanCode || fId === cleanCode) return true;
      const numMatch = fCode.match(/(\d+)$/);
      if (numMatch && (numMatch[1] === cleanCode || String(parseInt(numMatch[1], 10)) === cleanCode)) {
        return true;
      }
      return false;
    });
    if (matched) {
      if (String(matched.id) !== String(modalSelectedFarmerId) && !modalEditingId) {
        setModalFat('');
        setModalSnf('');
        setModalNotice('');
      }
      setModalSelectedFarmerId(String(matched.id));
    } else {
      if (modalSelectedFarmerId && !modalEditingId) {
        setModalFat('');
        setModalSnf('');
        setModalNotice('');
      }
      setModalSelectedFarmerId('');
    }
  };

  const handleModalFarmerSelectChange = (fId) => {
    if (String(fId) !== String(modalSelectedFarmerId) && !modalEditingId) {
      setModalFat('');
      setModalSnf('');
      setModalNotice('');
    }
    setModalSelectedFarmerId(fId);
    const matched = farmers.find(f => String(f.id) === String(fId));
    if (matched) {
      setModalFarmerCode(String(matched.code || ''));
    }
  };

  const handleModalApplyPreviousQuality = async () => {
    const farmer = farmers.find(f => String(f.id) === String(modalSelectedFarmerId));
    if (!farmer) {
      setModalNotice(lang === 'en' ? 'Please select a farmer first.' : 'कृपया पहिले कृषक छान्नुहोस् ।');
      return;
    }
    const result = await lookupPreviousDateFatSnf(farmer, modalDate);
    if (!result.found) {
      setModalNotice(
        lang === 'en'
          ? `No previous-date entry found for Farmer #${farmer.code} before ${result.selectedDateDisplay}.`
          : `${result.selectedDateDisplay} भन्दा अघिल्लो मितिमा प्रविष्टि भेटिएन ।`
      );
      return;
    }
    setModalFat(String(result.fat));
    setModalSnf(String(result.snf));
    setModalNotice(
      lang === 'en'
        ? `✓ Allocated FAT (${result.fat}%) & SNF (${result.snf}%) from ${result.prevDateDisplay}.`
        : `✓ ${result.prevDateDisplay} बाट फ्याट (${result.fat}%) र एस.एन.एफ. (${result.snf}%) भरियो ।`
    );
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!modalSelectedFarmerId) {
      alert(lang === 'en' ? 'Please select a farmer.' : 'कृपया कृषक छनौट गर्नुहोस् ।');
      return;
    }
    if (!modalQuantity || Number(modalQuantity) <= 0) {
      alert(lang === 'en' ? 'Milk quantity must be greater than zero.' : 'कृपया दूधको परिमाण शून्यभन्दा बढी प्रविष्ट गर्नुहोस् ।');
      return;
    }
    if (Number(modalFat) < 0 || Number(modalSnf) < 0) {
      alert(lang === 'en' ? 'FAT and SNF cannot be negative.' : 'फ्याट र एस.एन.एफ. ऋणात्मक हुन सक्दैन ।');
      return;
    }

    setModalLoading(true);
    try {
      const dateParts = modalDate ? modalDate.split('-') : [];
      let dateUtms = Date.now();
      if (dateParts.length === 3) {
        const d = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
        d.setHours(modalShift === 0 ? 8 : 17, 0, 0, 0);
        dateUtms = d.getTime();
      }

      const payload = {
        customerId: Number(modalSelectedFarmerId),
        Quantity: Math.max(0.01, Number(modalQuantity)),
        Fat: Math.max(0, Number(modalFat)),
        Snf: Math.max(0, Number(modalSnf)),
        FatRate: fatRate,
        SnfRate: snfRate,
        Rate: modalCalculatedRate,
        Shift: Number(modalShift),
        DateTimeUtms: dateUtms
      };

      const url = modalEditingId ? `/api/MilkCollection/${modalEditingId}` : '/api/MilkCollection';
      const method = modalEditingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedData = await res.json().catch(() => null);
        const farmerObj = farmers.find(f => f.id === Number(modalSelectedFarmerId));
        const resolvedId = (typeof savedData === 'number' || typeof savedData === 'string') ? savedData : (savedData?.id || modalEditingId);
        const slipPayload = {
          ...payload,
          id: resolvedId,
          farmer: farmerObj,
          totalPrice: modalCalculatedTotal
        };
        maybeAutoSendWhatsApp({
          slipType: 'milk-collection',
          data: slipPayload,
          tenant,
          customers: farmers,
          lang
        });
        if (onPrintSlip) {
          onPrintSlip(slipPayload);
        }
        setModalOpen(false);
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Error saving milk collection.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving record.');
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Collection
  const handleDelete = async (id) => {
    const confirmMsg = lang === 'en' ? 'Are you sure you want to delete this record?' : 'के तपाईं यो रेकर्ड मेटाउन निश्चित हुनुहुन्छ ?';
    if (!confirm(confirmMsg)) return;
    try {
      const res = await fetch(`/api/MilkCollection/${id}`, { method: 'DELETE' });
      if (res.ok && onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  // ----------------------------------------------------
  // Statistics Calculations (Image 1 Middle Section)
  // ----------------------------------------------------
  const todayDateStr = new Date().toDateString();

  const calculateStats = (subset) => {
    const uniqueFarmers = new Set(subset.map(c => c.customerId || c.farmerId)).size;
    const totalQty = subset.reduce((acc, c) => acc + (Number(c.quantity) || 0), 0);
    const totalPrice = subset.reduce((acc, c) => acc + (Number(c.totalPrice || c.totalAmount) || 0), 0);
    const avgFat = totalQty > 0
      ? subset.reduce((acc, c) => acc + (Number(c.fat) || 0) * (Number(c.quantity) || 0), 0) / totalQty
      : 0;
    const avgSnf = totalQty > 0
      ? subset.reduce((acc, c) => acc + (Number(c.snf) || 0) * (Number(c.quantity) || 0), 0) / totalQty
      : 0;
    return {
      farmerCount: uniqueFarmers,
      totalQuantity: totalQty,
      totalPrice: totalPrice,
      avgFat: avgFat,
      avgSnf: avgSnf
    };
  };

  const todayList = useMemo(() => {
    return collections.filter(c => new Date(c.dateTimeUtms).toDateString() === todayDateStr && !c.isDeleted);
  }, [collections, todayDateStr]);

  const todayStats = useMemo(() => calculateStats(todayList), [todayList]);
  const morningStats = useMemo(() => calculateStats(todayList.filter(c => Number(c.shift) === 0)), [todayList]);
  const eveningStats = useMemo(() => calculateStats(todayList.filter(c => Number(c.shift) === 1)), [todayList]);

  // ----------------------------------------------------
  // Filtered & Sorted Collections for Grid Table
  // ----------------------------------------------------
  const filteredCollections = useMemo(() => {
    const filtered = collections.filter(c => {
      if (c.isDeleted) return false;
      if (filterShift !== '' && Number(c.shift) !== Number(filterShift)) return false;
      if (filterStartDate) {
        const startUtms = new Date(filterStartDate).setHours(0, 0, 0, 0);
        if (c.dateTimeUtms < startUtms) return false;
      }
      if (filterEndDate) {
        const endUtms = new Date(filterEndDate).setHours(23, 59, 59, 999);
        if (c.dateTimeUtms > endUtms) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const f = c.farmer || farmers.find(fm => fm.id === (c.customerId || c.farmerId));
        const fName = (f?.nameInNepali || f?.nameInEnglish || '').toLowerCase();
        const fCode = String(f?.code || c.farmerId || '');
        if (!fName.includes(q) && !fCode.includes(q)) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'date_asc') {
        return (
          ((Number(a.dateTimeUtms) || 0) - (Number(b.dateTimeUtms) || 0)) ||
          (getCollectionActivityUtms(a) - getCollectionActivityUtms(b)) ||
          (Number(a.id) - Number(b.id))
        );
      }
      if (sortBy === 'date_desc') {
        return (
          ((Number(b.dateTimeUtms) || 0) - (Number(a.dateTimeUtms) || 0)) ||
          (getCollectionActivityUtms(b) - getCollectionActivityUtms(a)) ||
          (Number(b.id) - Number(a.id))
        );
      }
      return (
        (getCollectionActivityUtms(b) - getCollectionActivityUtms(a)) ||
        ((Number(b.dateTimeUtms) || 0) - (Number(a.dateTimeUtms) || 0)) ||
        (Number(b.id) - Number(a.id))
      );
    });
  }, [collections, farmers, filterShift, filterStartDate, filterEndDate, searchQuery, sortBy]);

  return (
    <div className="space-y-5">
      {/* ----------------------------------------------------
          0. TOP HEADER: Title & Subtitle
          ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {lang === 'en' ? 'Milk Collection Management' : 'दूध संकलन व्यवस्थापन'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'en'
              ? 'Daily morning & evening milk collection, FAT/SNF automated testing, slips and payments'
              : 'दैनिक बिहानी तथा बेलुकी दूध संकलन, फ्याट/एसएनएफ स्वचालित परीक्षण, रसिद तथा हिसाब मिलान'}
          </p>
        </div>
      </div>

      {/* ----------------------------------------------------
          1. TOP CARD: Inline Milk Collection Entry Form + Overview Card (Image 1 Reference)
          ---------------------------------------------------- */}
      <div ref={formRef} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form Column (col-span-9) */}
          <div className="lg:col-span-9">
            <form onSubmit={handleInlineSubmit} className="space-y-4">
              {/* Row 1: Farmer Code | Farmer | Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Farmer Code' : 'कृषक कोड'}
                  </label>
                  <input
                    type="text"
                    value={farmerCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFarmerCode(val);
                      lookupFarmerInline(val);
                    }}
                    onBlur={() => lookupFarmerInline(farmerCode)}
                    placeholder={lang === 'en' ? 'e.g. JS001 or 1' : 'उदा: JS001 वा १'}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold transition uppercase"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {lang === 'en' ? 'Farmer' : 'कृषक'}
                    </label>
                    {selectedFarmer && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                        #{selectedFarmer.code}
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedFarmer?.id || ''}
                    onChange={(e) => {
                      const fid = e.target.value;
                      if (!fid) {
                        handleResetInlineForm();
                        return;
                      }
                      const matched = farmers.find(f => String(f.id) === String(fid));
                      if (matched) {
                        setFarmerCode(String(matched.code || matched.id));
                        lookupFarmerInline(String(matched.code || matched.id));
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl font-bold truncate outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">
                      {selectedFarmer
                        ? (lang === 'en' ? (selectedFarmer.nameInEnglish || selectedFarmer.nameInNepali) : (selectedFarmer.nameInNepali || selectedFarmer.nameInEnglish))
                        : (lang === 'en' ? '-- Select Farmer --' : '-- कृषक छान्नुहोस् --')}
                    </option>
                    {farmers.map(f => (
                      <option key={f.id} value={f.id}>
                        #{f.code} - {lang === 'en' ? (f.nameInEnglish || f.nameInNepali) : (f.nameInNepali || f.nameInEnglish)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Quantity' : 'परिमाण'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quantity}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setQuantity(sanitizeNonNegative(e.target.value))}
                    placeholder="0"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-extrabold text-blue-700 dark:text-blue-400 transition"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Fat | Total FAT Price | SNF */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Fat' : 'फ्याट'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={fat}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setFat(sanitizeNonNegative(e.target.value))}
                    placeholder=""
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Total FAT Price' : 'फ्याट रकम प्रति लिटर'}
                  </label>
                  <input
                    type="text"
                    value={totalFatPrice}
                    readOnly
                    disabled
                    placeholder=""
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 rounded-xl font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'SNF' : 'एस.एन.एफ.'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={snf}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setSnf(sanitizeNonNegative(e.target.value))}
                    placeholder=""
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold transition"
                  />
                </div>
              </div>

              {/* Row 3: Total SNF Price | Date & Time | Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Total SNF Price' : 'एस.एन.एफ. रकम प्रति लिटर'}
                  </label>
                  <input
                    type="text"
                    value={totalSnfPrice}
                    readOnly
                    disabled
                    placeholder=""
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 rounded-xl font-mono outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {lang === 'en' ? 'Date & Time' : 'मिति र समय'}
                    </label>
                    <button
                      type="button"
                      onClick={handleToggleDateLock}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                        isDateLocked
                          ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-200/70'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title={
                        isDateLocked
                          ? (lang === 'en' ? 'Date is locked. Click to unlock and select a different date.' : 'मिति लक गरिएको छ । मिति परिवर्तन गर्न अनलक गर्नुहोस् ।')
                          : (lang === 'en' ? 'Lock selected date for fixed-date data collection' : 'दैनिक संकलनको लागि छानिएको मिति लक गर्नुहोस्')
                      }
                    >
                      {isDateLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      <span>{isDateLocked ? (lang === 'en' ? 'Locked' : 'लक गरिएको') : (lang === 'en' ? 'Lock Date' : 'मिति लक')}</span>
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={dateTimeLocal}
                    onChange={handleDateTimeChange}
                    disabled={isDateLocked}
                    readOnly={isDateLocked}
                    className={`w-full px-3.5 py-2 text-xs border rounded-xl outline-none transition ${
                      isDateLocked
                        ? 'border-amber-400 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-bold cursor-not-allowed opacity-90'
                        : 'border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500'
                    }`}
                  />
                  {isDateLocked && (
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
                      {lang === 'en'
                        ? 'Date fixed for collection. Click Locked to unlock or change date.'
                        : 'संकलन मिति स्थिर छ । परिवर्तन गर्न अनलक गर्नुहोस् ।'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Shift' : 'शिफ्ट'}
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => {
                      const nextShift = Number(e.target.value);
                      setShift(nextShift);
                      if (selectedFarmer) {
                        const dupMsg = checkInlineDuplicateNotice(selectedFarmer, dateTimeLocal, nextShift);
                        if (dupMsg) {
                          setInlineNoticeType('warning');
                          setInlineNotice(dupMsg);
                        } else if (inlineNoticeType === 'warning') {
                          setInlineNotice('');
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold cursor-pointer transition"
                  >
                    <option value={0}>{lang === 'en' ? 'Morning' : 'बिहानी'}</option>
                    <option value={1}>{lang === 'en' ? 'Evening' : 'बेलुकी'}</option>
                  </select>
                </div>
              </div>

              {/* Notification Banner */}
              {inlineNotice && (
                <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs transition ${
                  inlineNoticeType === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                    : inlineNoticeType === 'info'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300'
                    : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
                }`}>
                  {inlineNoticeType === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : inlineNoticeType === 'info' ? (
                    <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  )}
                  <span className="font-semibold">{inlineNotice}</span>
                </div>
              )}

              {/* Action Buttons: Auto-WhatsApp, Cancel and Save (Matching Image 1) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAutoWhatsApp(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                    autoWhatsApp
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                  title={lang === 'en' ? 'Automatically send milk slip via WhatsApp on save' : 'सुरक्षित भएपछि स्वतः व्हाट्सएपमा दूध रसिद पठाउनुहोस्'}
                >
                  <MessageCircle className={`w-3.5 h-3.5 ${autoWhatsApp ? 'text-[#25D366]' : ''}`} />
                  <span>{lang === 'en' ? `Auto-WhatsApp: ${autoWhatsApp ? 'ON' : 'OFF'}` : `स्वत: व्हाट्सएप: ${autoWhatsApp ? 'चालु' : 'बन्द'}`}</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleResetInlineForm}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>{lang === 'en' ? 'Cancel' : 'रद्द गर्नुहोस्'}</span>
                  </button>
                <button
                  type="submit"
                  disabled={inlineLoading}
                  className="flex items-center gap-1.5 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{inlineLoading ? (lang === 'en' ? 'Saving...' : 'बचत गर्दै...') : (lang === 'en' ? 'Save' : 'सुरक्षित गर्नुहोस्')}</span>
                </button>
                </div>
              </div>
            </form>
          </div>

          {/* Right Overview Card (col-span-3) - Matching Image 1 Reference */}
          <div className="lg:col-span-3">
            <div className="h-full border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-200 dark:border-slate-700">
                  <User className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                    {lang === 'en' ? 'Overview' : 'सारांश'}
                  </h3>
                </div>

                {/* Content Rows */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{lang === 'en' ? 'Farmer Code:' : 'कृषक कोड:'}</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono font-bold">
                      {selectedFarmer?.code || farmerCode || '-'}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{lang === 'en' ? 'Total Quantity:' : 'कुल परिमाण:'}</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-bold">
                      {quantity ? Number(quantity).toFixed(0) : '0'}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">FAT:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-bold">{fat !== '' ? fat : '-'}</strong>
                  </div>

                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">SNF:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-bold">{snf !== '' ? snf : '-'}</strong>
                  </div>

                  <div className="flex items-center justify-between py-1 border-t border-slate-200 dark:border-slate-700 mt-2">
                    <span className="text-slate-700 dark:text-slate-300 font-bold">{lang === 'en' ? 'Total Price(रू):' : 'जम्मा रकम(रू):'}</span>
                    <strong className="text-emerald-700 dark:text-emerald-400 font-black text-sm">
                      {inlineCurrentTotal}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Bottom Actions inside Overview (Image 1 Circular Button + Print) */}
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-200 dark:border-slate-700">
                <div>
                  {inlineEditingId && (
                    <button
                      type="button"
                      onClick={() => onPrintSlip && onPrintSlip({ id: inlineEditingId, quantity, fat, snf, rate: inlineCurrentRate, totalPrice: inlineCurrentTotal, farmer: selectedFarmer })}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                      title="Print Slip"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Print' : 'प्रिन्ट'}</span>
                    </button>
                  )}
                </div>

                {/* Allocated Blue Button with UserCheck Icon (Image 1) */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleApplyLastQuality}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
                    title={lang === 'en' ? 'Allocated: Fill FAT & SNF from previous date' : 'अघिल्लो मितिको फ्याट र एस.एन.एफ. स्वतः भर्नुहोस्'}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{lang === 'en' ? 'Allocated' : 'अघिल्लो दर'}</span>
                  </button>
                  <span className="absolute bottom-full right-0 mb-2 hidden group-hover:block whitespace-nowrap bg-slate-900 text-white text-[11px] font-bold py-1 px-2.5 rounded-lg shadow-lg pointer-events-none z-10">
                    {lang === 'en' ? 'Allocated (Fill FAT & SNF from previous date)' : 'अघिल्लो मितिबाट फ्याट र एस.एन.एफ. भर्नुहोस्'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. MIDDLE SECTION: Three Summary Cards (Today Collection, Morning Collection, Evening Collection) (Image 1 Reference)
          ---------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Today Collection */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
              {lang === 'en' ? 'Today Collection' : 'आजको संकलन'}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-500 dark:text-slate-400 font-medium">{lang === 'en' ? 'Farmer Number:' : 'कृषक संख्या:'}</div>
              <strong className="text-slate-800 dark:text-slate-100 text-sm font-black block mt-0.5">{todayStats.farmerCount}</strong>

              <div className="text-slate-500 dark:text-slate-400 font-medium mt-2">{lang === 'en' ? 'Total Quantity:' : 'कुल परिमाण:'}</div>
              <strong className="text-blue-700 dark:text-blue-400 text-sm font-black block mt-0.5">{todayStats.totalQuantity.toFixed(2)} लि.</strong>

              <div className="text-slate-500 dark:text-slate-400 font-medium mt-2">{lang === 'en' ? 'Total Price(रू):' : 'जम्मा रकम(रू):'}</div>
              <strong className="text-emerald-700 dark:text-emerald-400 text-sm font-black block mt-0.5">{todayStats.totalPrice.toFixed(2)}</strong>
            </div>

            <div>
              <div className="text-slate-500 dark:text-slate-400 font-medium">{lang === 'en' ? 'Average FAT:' : 'औसत फ्याट:'}</div>
              <strong className="text-slate-800 dark:text-slate-100 text-sm font-bold block mt-0.5">{todayStats.avgFat.toFixed(2)} %</strong>

              <div className="text-slate-500 dark:text-slate-400 font-medium mt-2">{lang === 'en' ? 'Average SNF:' : 'औसत एस.एन.एफ.:'}</div>
              <strong className="text-slate-800 dark:text-slate-100 text-sm font-bold block mt-0.5">{todayStats.avgSnf.toFixed(2)} %</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Morning Collection */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
              {lang === 'en' ? 'Morning Collection' : 'बिहानी संकलन'}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-500 dark:text-slate-400 font-medium">{lang === 'en' ? 'Farmer Number:' : 'कृषक संख्या:'}</div>
              <strong className="text-slate-800 dark:text-slate-100 text-sm font-black block mt-0.5">{morningStats.farmerCount}</strong>

              <div className="text-slate-500 dark:text-slate-400 font-medium mt-2">{lang === 'en' ? 'Total Quantity:' : 'कुल परिमाण:'}</div>
              <strong className="text-amber-700 dark:text-amber-500 text-sm font-black block mt-0.5">{morningStats.totalQuantity.toFixed(2)} लि.</strong>

              <div className="text-slate-500 dark:text-slate-400 font-medium mt-2">{lang === 'en' ? 'Total Price(रू):' : 'जम्मा रकम(रू):'}</div>
              <strong className="text-emerald-700 dark:text-emerald-400 text-sm font-black block mt-0.5">{morningStats.totalPrice.toFixed(2)}</strong>
            </div>

            <div>
              <div className="text-slate-500 dark:text-slate-400 font-medium">{lang === 'en' ? 'Average FAT:' : 'औसत फ्याट:'}</div>
              <strong className="text-slate-800 dark:text-slate-100 text-sm font-bold block mt-0.5">{morningStats.avgFat.toFixed(2)} %</strong>

              <div className="text-slate-500 dark:text-slate-400 font-medium mt-2">{lang === 'en' ? 'Average SNF:' : 'औसत एस.एन.एफ.:'}</div>
              <strong className="text-slate-800 dark:text-slate-100 text-sm font-bold block mt-0.5">{morningStats.avgSnf.toFixed(2)} %</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Evening Collection */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="w-5 h-5 text-indigo-500" />
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
              {lang === 'en' ? 'Evening Collection' : 'बेलुकी संकलन'}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-500 dark:text-slate-400 font-medium">{lang === 'en' ? 'Farmer Number:' : 'कृषक संख्या:'}</div>
              <strong className="text-slate-800 dark:text-slate-100 text-sm font-black block mt-0.5">{eveningStats.farmerCount}</strong>

              <div className="text-slate-500 dark:text-slate-400 font-medium mt-2">{lang === 'en' ? 'Total Quantity:' : 'कुल परिमाण:'}</div>
              <strong className="text-indigo-700 dark:text-indigo-500 text-sm font-black block mt-0.5">{eveningStats.totalQuantity.toFixed(2)} लि.</strong>

              <div className="text-slate-500 dark:text-slate-400 font-medium mt-2">{lang === 'en' ? 'Total Price(रू):' : 'जम्मा रकम(रू):'}</div>
              <strong className="text-emerald-700 dark:text-emerald-400 text-sm font-black block mt-0.5">{eveningStats.totalPrice.toFixed(2)}</strong>
            </div>

            <div>
              <div className="text-slate-500 dark:text-slate-400 font-medium">{lang === 'en' ? 'Average FAT:' : 'औसत फ्याट:'}</div>
              <strong className="text-slate-800 dark:text-slate-100 text-sm font-bold block mt-0.5">{eveningStats.avgFat.toFixed(2)} %</strong>

              <div className="text-slate-500 dark:text-slate-400 font-medium mt-2">{lang === 'en' ? 'Average SNF:' : 'औसत एस.एन.एफ.:'}</div>
              <strong className="text-slate-800 dark:text-slate-100 text-sm font-bold block mt-0.5">{eveningStats.avgSnf.toFixed(2)} %</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          3. BOTTOM SECTION: Filter Bar with Distinct Green Search Input (Image 1 Reference)
          ---------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Start Date mm/dd/yyyy */}
          <div className="relative">
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none cursor-pointer"
              placeholder="mm/dd/yyyy"
            />
          </div>

          {/* End Date mm/dd/yyyy */}
          <div className="relative">
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none cursor-pointer"
              placeholder="mm/dd/yyyy"
            />
          </div>

          {/* Shift Dropdown */}
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl outline-none cursor-pointer"
          >
            <option value="">{lang === 'en' ? 'All Shifts' : 'सबै शिफ्ट'}</option>
            <option value="0">{lang === 'en' ? 'Morning' : 'बिहानी'}</option>
            <option value="1">{lang === 'en' ? 'Evening' : 'बेलुकी'}</option>
          </select>

          {/* Sort Order Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label={lang === 'en' ? 'Sort records' : 'रेकर्ड क्रम'}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl outline-none cursor-pointer"
          >
            <option value="recent">{lang === 'en' ? 'Sort: Recent Activity' : 'क्रम: हालैको गतिविधि'}</option>
            <option value="date_desc">{lang === 'en' ? 'Sort: Date (Newest)' : 'क्रम: मिति (नयाँ पहिले)'}</option>
            <option value="date_asc">{lang === 'en' ? 'Sort: Date (Oldest)' : 'क्रम: मिति (पुरानो पहिले)'}</option>
          </select>

          {/* Reset Filters (if active) */}
          {(filterStartDate || filterEndDate || filterShift || sortBy !== 'recent') && (
            <button
              onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterShift(''); setSortBy('recent'); }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Reset' : 'रिसेट'}</span>
            </button>
          )}

          {/* Optional: "+ Record Milk Intake (Modal)" Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold transition cursor-pointer ml-auto sm:ml-0"
            title="Open Record Milk Intake Modal"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Intake Modal' : 'दर्ता विन्डो'}</span>
          </button>
        </div>

        {/* Right Search Input with Distinct Green Border (Matching Image 1) */}
        <div className="relative w-full sm:w-64">
          <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-emerald-500 rounded-2xl bg-white dark:bg-slate-800 shadow-2xs">
            <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="1"
              className="w-full text-xs font-semibold outline-none bg-transparent text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          4. Milk Collection Records Table
          ---------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th className="py-3 px-4">{lang === 'en' ? 'Farmer Code' : 'कृषक कोड'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Farmer' : 'कृषक'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Quantity' : 'मात्रा'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Rate' : 'दर'}</th>
                <th className="py-3 px-4">FAT</th>
                <th className="py-3 px-4">SNF</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Total Price' : 'जम्मा रकम'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Shift' : 'शिफ्ट'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Date' : 'मिति'}</th>
                <th className="py-3 px-4 text-center">{lang === 'en' ? 'Action' : 'कार्य'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCollections.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                    {lang === 'en' ? 'No milk collection records found.' : 'कुनै दूध संकलन रेकर्ड भेटिएन ।'}
                  </td>
                </tr>
              ) : (
                filteredCollections.map((col) => {
                  const farmer = col.farmer || farmers.find(f => f.id === (col.customerId || col.farmerId));
                  const fName = lang === 'en'
                    ? (farmer?.nameInEnglish || farmer?.nameInNepali || 'Unknown Farmer')
                    : (farmer?.nameInNepali || farmer?.nameInEnglish || 'अज्ञात कृषक');
                  const fCode = farmer?.code || col.farmerId || '-';
                  const dateObj = col.dateTimeUtms ? new Date(col.dateTimeUtms) : new Date();
                  const dateFormatted = dateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                  const timeFormatted = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                  const isMorning = Number(col.shift) === 0;
                  const totalAmt = Number(col.totalPrice || col.totalAmount || (Number(col.quantity) * Number(col.rate))).toFixed(2);

                  return (
                    <tr
                      key={col.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Farmer Code */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        <button
                          type="button"
                          onClick={() => onInspectFarmer && (farmer || col.farmerId) && onInspectFarmer(farmer || { id: col.farmerId, code: fCode, nameInNepali: fName }, 'all')}
                          className={`font-mono font-bold transition ${onInspectFarmer ? 'hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer' : ''}`}
                          title={lang === 'en' ? 'Click to view complete farmer profile & activity history' : 'कृषक प्रोफाइल तथा कारोबार इतिहास हेर्नुहोस्'}
                        >
                          #{fCode}
                        </button>
                      </td>

                      {/* Farmer Name */}
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <button
                          type="button"
                          onClick={() => onInspectFarmer && (farmer || col.farmerId) && onInspectFarmer(farmer || { id: col.farmerId, code: fCode, nameInNepali: fName }, 'all')}
                          className={`text-left font-bold transition ${onInspectFarmer ? 'hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer' : ''}`}
                          title={lang === 'en' ? 'Click to view complete farmer profile & activity history' : 'कृषक प्रोफाइल तथा कारोबार इतिहास हेर्नुहोस्'}
                        >
                          {fName}
                        </button>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-4 font-black text-blue-600 dark:text-blue-400">
                        {Number(col.quantity || 0).toFixed(2)} लि.
                      </td>

                      {/* Rate */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        रू {Number(col.rate || 0).toFixed(2)}
                      </td>

                      {/* FAT */}
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {Number(col.fat || 0).toFixed(1)}%
                      </td>

                      {/* SNF */}
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {Number(col.snf || 0).toFixed(1)}%
                      </td>

                      {/* Total Price */}
                      <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">
                        रू {Number(totalAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Shift */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isMorning
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'
                          }`}
                        >
                          {isMorning
                            ? (lang === 'en' ? 'Morning' : 'बिहानी')
                            : (lang === 'en' ? 'Evening' : 'बेलुकी')}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {dateFormatted} {timeFormatted}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* WhatsApp Slip Share */}
                          <button
                            type="button"
                            onClick={() => openWhatsAppBill({
                              slipType: 'milk-collection',
                              data: { ...col, farmer, totalPrice: Number(totalAmt) },
                              tenant,
                              customers: farmers,
                              lang,
                              askPhoneIfMissing: true
                            })}
                            className="p-1.5 text-[#16a34a] hover:text-[#15803d] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition cursor-pointer"
                            title={lang === 'en' ? 'Send Milk Slip on WhatsApp' : 'व्हाट्सएपमा रसिद पठाउनुहोस्'}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          {/* Print Slip */}
                          <button
                            type="button"
                            onClick={() => onPrintSlip && onPrintSlip({ ...col, farmer, totalPrice: Number(totalAmt) })}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition cursor-pointer"
                            title={lang === 'en' ? 'Print Slip' : 'रसिद प्रिन्ट गर्नुहोस्'}
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Edit (Opens Modal Image 2) */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(col)}
                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer"
                            title={lang === 'en' ? 'Edit Record' : 'सम्पादन गर्नुहोस्'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(col.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                            title={lang === 'en' ? 'Delete Record' : 'मेटाउनुहोस्'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------------------------------------
          5. RECORD MILK INTAKE MODAL (Image 2 Reference 1:1)
          ---------------------------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Green Header Bar with Milk Icon & Close (Matching Image 2) */}
            <div className="bg-emerald-600 dark:bg-emerald-700 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Milk className="w-5 h-5 text-emerald-100" />
                <h3 className="font-bold text-base">
                  {lang === 'en'
                    ? (modalEditingId ? 'Edit Milk Intake' : 'Record Milk Intake')
                    : (modalEditingId ? 'दूध संकलन सम्पादन' : 'दूध संकलन दर्ता')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveModal} className="p-5 sm:p-6 space-y-4">
              {/* Row 1: Farmer Code & Select Farmer */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Farmer Code */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Farmer Code' : 'कृषक कोड'}
                  </label>
                  <input
                    type="text"
                    value={modalFarmerCode}
                    onChange={(e) => handleModalFarmerCodeChange(e.target.value)}
                    placeholder={lang === 'en' ? 'e.g. JS001 or 1' : 'उदा: JS001 वा १'}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold uppercase"
                    required
                  />
                </div>

                {/* Select Farmer */}
                <div className="sm:col-span-8">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Select Farmer' : 'कृषक छनौट'}
                  </label>
                  <select
                    value={modalSelectedFarmerId}
                    onChange={(e) => handleModalFarmerSelectChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-semibold truncate cursor-pointer"
                    required
                  >
                    <option value="">{lang === 'en' ? '-- Select Farmer --' : '-- कृषक छान्नुहोस् --'}</option>
                    {farmers.map(f => (
                      <option key={f.id} value={f.id}>
                        #{f.code} - {lang === 'en' ? (f.nameInEnglish || f.nameInNepali) : (f.nameInNepali || f.nameInEnglish)} {f.phone ? `(${f.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Shift Segmented Toggle & Date Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Shift Segmented Toggle Buttons */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Shift' : 'शिफ्ट'}
                  </label>
                  <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setModalShift(0)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        modalShift === 0
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'en' ? 'Morning' : 'बिहानी'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalShift(1)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        modalShift === 1
                          ? 'bg-[#5b50d6] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'en' ? 'Evening' : 'बेलुकी'}
                    </button>
                  </div>
                </div>

                {/* Date Picker */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {lang === 'en' ? 'Date' : 'मिति'}
                    </label>
                    {!modalEditingId && isDateLocked && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        <Lock className="w-2.5 h-2.5" />
                        <span>{lang === 'en' ? 'Locked' : 'लक'}</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => {
                      if (isDateLocked && !modalEditingId) return;
                      setModalDate(e.target.value);
                    }}
                    disabled={isDateLocked && !modalEditingId}
                    className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-xl outline-none font-semibold ${
                      isDateLocked && !modalEditingId
                        ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 cursor-not-allowed'
                        : 'border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 cursor-pointer'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Row 3 Header with Allocated Button */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {lang === 'en' ? 'Quantity & Quality' : 'मात्रा र गुणस्तर'}
                </span>
                <button
                  type="button"
                  onClick={handleModalApplyPreviousQuality}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-2xs transition cursor-pointer"
                  title={lang === 'en' ? 'Fill FAT & SNF from previous date' : 'अघिल्लो मितिको फ्याट र एस.एन.एफ. भर्नुहोस्'}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Allocated' : 'अघिल्लो दर'}</span>
                </button>
              </div>

              {/* Row 3: Quantity with Active Green Border, FAT %, SNF % (Image 2) */}
              <div className="grid grid-cols-3 gap-3">
                {/* Quantity (Active Green Border from Image 2) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Quantity' : 'मात्रा'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={modalQuantity}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setModalQuantity(sanitizeNonNegative(e.target.value))}
                    placeholder="0.0"
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-emerald-500 dark:border-emerald-500 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none font-black text-slate-800 dark:text-slate-100"
                    required
                    autoFocus
                  />
                </div>

                {/* FAT % */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'FAT %' : 'फ्याट %'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={modalFat}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setModalFat(sanitizeNonNegative(e.target.value))}
                    placeholder="4.5"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                    required
                  />
                </div>

                {/* SNF % */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'SNF %' : 'एस.एन.एफ. %'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={modalSnf}
                    onKeyDown={preventNegativeKey}
                    onChange={(e) => setModalSnf(sanitizeNonNegative(e.target.value))}
                    placeholder="8.2"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                    required
                  />
                </div>
              </div>

              {modalNotice && (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-800 dark:text-blue-300">
                  {modalNotice}
                </div>
              )}

              {/* Row 4: Calculation Banner (Matching Light Green Box in Image 2) */}
              <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {lang === 'en' ? 'Calculated Rate per Liter' : 'प्रति लिटर दर'}
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
                    रु {modalCalculatedRate.toFixed(2)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    {lang === 'en' ? 'TOTAL AMOUNT' : 'जम्मा रकम'}
                  </div>
                  <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    रु {modalCalculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions: Cancel and Save & Print Slip (Matching Image 2) */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : 'रद्द गर्नुहोस्'}
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {modalLoading
                      ? (lang === 'en' ? 'Saving...' : 'बचत गर्दै...')
                      : (lang === 'en' ? 'Save & Print Slip' : 'सुरक्षित तथा रसिद प्रिन्ट')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
