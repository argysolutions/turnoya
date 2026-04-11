import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';

export default function WeeklyCalendar({ selectedDate, onSelect, onExpand, actions, modifiers = {}, modifiersClassNames = {} }) {
  const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const getDayStatusClass = (date) => {
    for (const [modifier, dates] of Object.entries(modifiers)) {
      if (Array.isArray(dates) && dates.some(d => isSameDay(d, date))) {
        return modifiersClassNames[modifier] || '';
      }
    }
    return '';
  };

  return (
    <div className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-slate-900 capitalize">
          {format(selectedDate, 'MMMM yyyy', { locale: es })}
        </span>
        <button 
          onClick={onExpand}
          className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
        >
          Ver mes <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const statusClass = getDayStatusClass(day);
          
          return (
            <button
              key={day.toString()}
              onClick={() => onSelect(day)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all relative ${
                isSelected ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50'
              }`}
            >
              <span className={`text-[10px] uppercase font-bold mb-1 ${
                isSelected ? 'text-slate-400' : 'text-slate-400'
              }`}>
                {format(day, 'eee', { locale: es })}
              </span>
              <span className={`text-sm font-bold ${
                isSelected ? 'text-white' : 'text-slate-900'
              }`}>
                {format(day, 'd')}
              </span>
              
              {/* Status Indicator (Dot) */}
              {!isSelected && statusClass && (
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${statusClass}`} />
              )}
            </button>
          );
        })}
      </div>

      {actions}
    </div>
  );
}
