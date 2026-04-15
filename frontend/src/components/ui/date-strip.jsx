import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function DateStrip({ selectedDate, onSelect, onExpand }) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i)); // Mon-Sun current week

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

      <div className="flex gap-2 justify-center overflow-x-auto no-scrollbar py-1">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toString()}
              onClick={() => onSelect(day)}
              className={`flex flex-col items-center justify-center min-w-[50px] h-[64px] rounded-xl transition-all relative ${
                isSelected 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 z-10' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span className={`text-[9px] uppercase font-bold mb-0.5 opacity-60`}>
                {format(day, 'eee', { locale: es })}
              </span>
              <span className="text-base font-bold tabular-nums leading-none">
                {format(day, 'd')}
              </span>
              
              {isToday && !isSelected && (
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              )}

              {isSelected && (
                <motion.div 
                  layoutId="strip-active"
                  className="absolute inset-0 border-2 border-slate-900 rounded-2xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
