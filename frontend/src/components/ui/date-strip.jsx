import { useState, useRef, useEffect, useCallback } from 'react';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const VISIBLE_DAYS = 7;
const DAY_WIDTH = 46; // px per day cell
const DAY_GAP = 6;    // px gap between cells

export default function DateStrip({ selectedDate, onSelect, onExpand }) {
  // Generate all days of the current month + padding
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const totalMonthDays = differenceInDays(monthEnd, monthStart) + 1;

  // Start from monday of the week that contains the 1st of month
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  // End on sunday of the week that contains the last day of month
  const calEnd = addDays(startOfWeek(monthEnd, { weekStartsOn: 1 }), 6);
  const totalDays = differenceInDays(calEnd, calStart) + 1;
  const days = Array.from({ length: totalDays }, (_, i) => addDays(calStart, i));

  // Find today's index to center the initial view
  const todayIndex = days.findIndex(d => isSameDay(d, now));
  const initialOffset = Math.max(0, Math.min(todayIndex - Math.floor(VISIBLE_DAYS / 2), days.length - VISIBLE_DAYS));

  const [offset, setOffset] = useState(initialOffset);
  const touchStartRef = useRef(null);
  const containerRef = useRef(null);

  const canGoLeft = offset > 0;
  const canGoRight = offset < days.length - VISIBLE_DAYS;

  const goLeft = useCallback(() => {
    setOffset(prev => Math.max(0, prev - 1));
  }, []);

  const goRight = useCallback(() => {
    setOffset(prev => Math.min(days.length - VISIBLE_DAYS, prev + 1));
  }, [days.length]);

  // Swipe handling
  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartRef.current === null) return;
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 30) {
      if (diff > 0) goRight(); // swipe left → next days
      else goLeft(); // swipe right → prev days
    }
    touchStartRef.current = null;
  };

  // Scroll selected day into view when tapped from outside
  useEffect(() => {
    const idx = days.findIndex(d => isSameDay(d, selectedDate));
    if (idx >= 0 && (idx < offset || idx >= offset + VISIBLE_DAYS)) {
      setOffset(Math.max(0, Math.min(idx - Math.floor(VISIBLE_DAYS / 2), days.length - VISIBLE_DAYS)));
    }
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleDays = days.slice(offset, offset + VISIBLE_DAYS);

  return (
    <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 -mx-4 px-4 py-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Turnos del</span>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight leading-tight">
            {format(selectedDate, 'eeee d \'de\' MMMM', { locale: es })}
          </h2>
        </div>
        <button 
          onClick={onExpand}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all outline-none"
        >
          <CalendarIcon className="w-3 h-3" />
          Cambiar Fecha
        </button>
      </div>

      {/* Day strip with arrows */}
      <div className="flex items-center gap-1 py-1">
        {/* Left arrow */}
        <button
          onClick={goLeft}
          disabled={!canGoLeft}
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
            canGoLeft
              ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90'
              : 'text-slate-200 cursor-default'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Days container */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <motion.div
            className="flex justify-center"
            style={{ gap: `${DAY_GAP}px` }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {visibleDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, now);
              const isCurrentMonth = day.getMonth() === now.getMonth();

              return (
                <button
                  key={day.toString()}
                  onClick={() => onSelect(day)}
                  className={`flex flex-col items-center justify-center flex-1 min-w-0 h-[60px] rounded-xl transition-all relative ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 z-10'
                      : isToday
                        ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                        : isCurrentMonth
                          ? 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          : 'bg-slate-50/50 text-slate-300'
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold mb-0.5 opacity-60">
                    {format(day, 'eee', { locale: es })}
                  </span>
                  <span className="text-sm font-bold tabular-nums leading-none">
                    {format(day, 'd')}
                  </span>

                  {isToday && !isSelected && (
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                  )}

                  {isSelected && (
                    <motion.div
                      layoutId="strip-active"
                      className="absolute inset-0 border-2 border-slate-900 rounded-xl"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </motion.div>
        </div>

        {/* Right arrow */}
        <button
          onClick={goRight}
          disabled={!canGoRight}
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
            canGoRight
              ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90'
              : 'text-slate-200 cursor-default'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
