import React, { useState, useMemo } from 'react';
import NepaliDate from 'nepali-date-converter';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { NEPALI_MONTHS, NEPALI_DAYS, toNepaliDigits, getTodayBS } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';

export function getDaysInBSMonth(year, month) {
  for (let d = 32; d >= 29; d--) {
    try {
      const nd = new NepaliDate(year, month, d);
      if (nd.getMonth() === month && nd.getDate() === d) return d;
    } catch (e) {}
  }
  return 30;
}

export default function NepaliCalendarModal({ isOpen, onClose, onSelectDate }) {
  const { lang, t } = useLanguage();
  const todayBS = useMemo(() => getTodayBS(), []);
  const [selectedYear, setSelectedYear] = useState(todayBS.year || 2083);
  const [selectedMonth, setSelectedMonth] = useState(todayBS.month !== undefined ? todayBS.month : 7);
  const [selectedDay, setSelectedDay] = useState(todayBS.date || 24);

  if (!isOpen) return null;

  const daysInMonth = getDaysInBSMonth(selectedYear, selectedMonth);

  // First day of month day-of-week
  let firstDayOfWeek = 0;
  try {
    const firstNd = new NepaliDate(selectedYear, selectedMonth, 1);
    firstDayOfWeek = firstNd.getDay();
  } catch (e) {
    firstDayOfWeek = 0;
  }

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedYear(y => y - 1);
      setSelectedMonth(11);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedYear(y => y + 1);
      setSelectedMonth(0);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleSelectDay = (day) => {
    setSelectedDay(day);
    if (onSelectDate) {
      try {
        const nd = new NepaliDate(selectedYear, selectedMonth, day);
        onSelectDate({
          bsDate: `${selectedYear}/${String(selectedMonth + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`,
          adDate: nd.toJsDate(),
          year: selectedYear,
          month: selectedMonth,
          date: day,
          formatted: `${toNepaliDigits(day)} ${NEPALI_MONTHS[selectedMonth]?.bs} ${toNepaliDigits(selectedYear)}`
        });
      } catch (e) {}
    }
  };

  const monthObj = NEPALI_MONTHS[selectedMonth] || NEPALI_MONTHS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {lang === 'en' ? 'Bikram Sambat Calendar' : 'नेपाली पात्रो'}
              </h3>
              <p className="text-xs text-emerald-100">
                {lang === 'en' ? 'Official Bikram Sambat calendar' : 'आधिकारिक नेपाली मिति तथा पात्रो'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month & Year Navigator */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-white hover:shadow-sm text-slate-700 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <div className="text-lg font-bold text-slate-800">
              {lang === 'en' ? (
                <><span>{monthObj.en}</span> <span className="text-emerald-700">{selectedYear}</span></>
              ) : (
                <><span>{monthObj.bs}</span> <span className="text-emerald-700">{toNepaliDigits(selectedYear)}</span></>
              )}
            </div>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-white hover:shadow-sm text-slate-700 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 px-4 pt-3 pb-1 text-center border-b border-slate-100">
          {NEPALI_DAYS.map((d, i) => (
            <div
              key={i}
              className={`text-xs font-bold py-1 ${d.isHoliday ? 'text-rose-600' : 'text-slate-600'}`}
            >
              {lang === 'en' ? (d.en || d.bs) : d.bs}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 p-4 text-center">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-9" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isToday = selectedYear === todayBS.year && selectedMonth === todayBS.month && dayNum === todayBS.date;
            const isSelected = dayNum === selectedDay;
            const colIndex = (firstDayOfWeek + i) % 7;
            const isSaturday = colIndex === 6;

            return (
              <button
                key={`day-${dayNum}`}
                onClick={() => handleSelectDay(dayNum)}
                className={`h-9 w-9 mx-auto flex items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold scale-105'
                    : isToday
                    ? 'border-2 border-emerald-500 text-emerald-800 bg-emerald-50 font-bold'
                    : isSaturday
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {lang === 'en' ? dayNum : toNepaliDigits(dayNum)}
              </button>
            );
          })}
        </div>

        {/* Footer info & Reset Today */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'en' ? 'Today: ' : 'आज: '}<strong>{todayBS.formattedBs}</strong></span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedYear(todayBS.year);
                setSelectedMonth(todayBS.month);
                handleSelectDay(todayBS.date);
              }}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition"
            >
              {lang === 'en' ? 'Today' : 'आजको मिति'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition"
            >
              {lang === 'en' ? 'Close' : 'बन्द गर्नुहोस्'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
