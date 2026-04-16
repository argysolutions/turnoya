import { useState, useRef, useEffect, useCallback } from 'react';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const VISIBLE_DAYS = 7;
const DAY_WIDTH = 54; // px per day cell
const DAY_GAP = 8;    // px gap between cells

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
  const containerRef = useRef(null);

  const canGoLeft = offset > 0;
  const canGoRight = offset < days.length - VISIBLE_DAYS;

  const goLeft = useCallback(() => {
    setOffset(prev => Math.max(0, prev - 1));
  }, []);

  const goRight = useCallback(() => {
    setOffset(prev => Math.min(days.length - VISIBLE_DAYS, prev + 1));
  }, [days.length]);

  // Swipe/Drag handling
  const handleDragEnd = (_, info) => {
    const daySize = DAY_WIDTH + DAY_GAP;
    // Calculate how many days to move based on momentum and current position
    const dragDistance = info.offset.x;
    const velocity = info.velocity.x;
    
    // Sensitivity: how much velocity helps move extra days
    const velocityFactor = velocity * 0.1;
    const combinedDiff = dragDistance + velocityFactor;
    
    // Number of days to skip
    const daysToSkip = Math.round(-combinedDiff / daySize);
    
    if (Math.abs(daysToSkip) > 0) {
      setOffset(prev => {
        const next = prev + daysToSkip;
        return Math.max(0, Math.min(days.length - VISIBLE_DAYS, next));
      });
    }
  };

  // Scroll selected day into view when tapped from outside
  useEffect(() => {
    const idx = days.findIndex(d => isSameDay(d, selectedDate));
    if (idx >= 0 && (idx < offset || idx >= offset + VISIBLE_DAYS)) {
      setOffset(Math.max(0, Math.min(idx - Math.floor(VISIBLE_DAYS / 2), days.length - VISIBLE_DAYS)));
    }
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate center shift
  const xOffset = -offset * (DAY_WIDTH + DAY_GAP);

  return (
    <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 -mx-4 px-4 py-4 mb-6 select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Turnos del</span>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
            {format(selectedDate, 'eeee d \'de\' MMMM', { locale: es })}
          </h2>
        </div>
        <button 
          onClick={onExpand}
          className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-widest active:scale-95 transition-all outline-none shadow-lg shadow-slate-200"
        >
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          Calendario
        </button>
      </div>

      {/* Day strip with arrows */}
      <div className="flex items-center gap-1 py-1">
        {/* Left arrow */}
        <button
          onClick={goLeft}
          disabled={!canGoLeft}
          className={`w-7 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
            canGoLeft
              ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100 active:scale-90'
              : 'text-slate-200 cursor-default opacity-0'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Days container */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative h-[84px]"
        >
          <motion.div
            drag="x"
            dragConstraints={{ left: -((days.length - VISIBLE_DAYS) * (DAY_WIDTH + DAY_GAP)), right: 0 }}
            dragElastic={0.2}
            dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
            onDragEnd={handleDragEnd}
            className="flex absolute left-0 top-0 h-full cursor-grab active:cursor-grabbing"
            style={{ gap: `${DAY_GAP}px` }}
            animate={{ x: xOffset }}
            transition={{ type: 'spring', stiffness: 450, damping: 35, mass: 0.8 }}
          >
            {days.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, now);
              const isCurrentMonth = day.getMonth() === now.getMonth();

              return (
                <button
                  key={day.toString()}
                  onClick={() => onSelect(day)}
                  style={{ width: `${DAY_WIDTH}px` }}
                  className={`flex flex-col items-center justify-center shrink-0 h-[78px] rounded-xl transition-colors relative group ${
                    isSelected
                      ? 'text-white z-10'
                      : isToday
                        ? 'text-slate-900'
                        : isCurrentMonth
                          ? 'text-slate-600 hover:bg-slate-50'
                          : 'text-slate-300'
                  }`}
                >
                  {/* Background selection synchronized */}
                  {isSelected && (
                    <motion.div
                      layoutId="strip-active"
                      className="absolute inset-0 bg-slate-900 rounded-xl shadow-lg shadow-slate-200 z-0"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}

                  {!isSelected && isToday && (
                    <div className="absolute inset-0 border border-slate-200 rounded-xl z-0 bg-slate-50/50" />
                  )}

                  <span className={`text-xs uppercase font-black mb-1 relative z-10 ${isSelected ? 'opacity-70' : 'opacity-40'}`}>
                    {format(day, 'eee', { locale: es })}
                  </span>
                  <span className="text-xl font-black tabular-nums leading-none relative z-10">
                    {format(day, 'd')}
                  </span>

                  {isToday && !isSelected && (
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-slate-900 rounded-full z-10" />
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
          className={`w-7 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
            canGoRight
              ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100 active:scale-90'
              : 'text-slate-200 cursor-default opacity-0'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
