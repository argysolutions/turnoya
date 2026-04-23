import { useState, useEffect } from 'react';
import Picker from 'react-mobile-picker';
import { cn } from '@/lib/utils';

/**
 * WheelTimePicker
 * @param {string} value - Format "HH:mm"
 * @param {function} onChange - Returns "HH:mm"
 */
export default function WheelTimePicker({ value, onChange }) {
  const [pickerValue, setPickerValue] = useState({
    hour: value?.split(':')[0] || '09',
    minute: value?.split(':')[1] || '00',
  });

  // Hour options (24h)
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  // Minute options (intervals of 5 or 1, user might prefer 1 for precision)
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setPickerValue({ hour: h, minute: m });
    }
  }, [value]);

  const handlePickerChange = (newValue) => {
    setPickerValue(newValue);
    onChange(`${newValue.hour}:${newValue.minute}`);
  };

  return (
    <div className="picker-container flex justify-center w-full max-w-[320px] mx-auto relative px-2 py-4 h-[280px]">
      <Picker 
        value={pickerValue} 
        onChange={handlePickerChange} 
        wheelMode="natural" 
        height={250}
        itemHeight={50}
        className="w-full h-full"
      >
        <Picker.Column name="hour">
          {hours.map((h) => (
            <Picker.Item key={h} value={h}>
              {({ selected }) => (
                <div className={cn(
                  "transition-all duration-200 flex items-center justify-center h-full w-full",
                  selected 
                    ? "text-4xl font-black text-slate-900" 
                    : "text-2xl font-bold text-slate-300 opacity-50"
                )}>
                  {h}
                </div>
              )}
            </Picker.Item>
          ))}
        </Picker.Column>
        
        {/* Separador Central */}
        <div className="flex items-center justify-center px-4">
          <div className="text-3xl font-black text-slate-300">:</div>
        </div>

        <Picker.Column name="minute">
          {minutes.map((m) => (
            <Picker.Item key={m} value={m}>
              {({ selected }) => (
                <div className={cn(
                  "transition-all duration-200 flex items-center justify-center h-full w-full",
                  selected 
                    ? "text-4xl font-black text-slate-900" 
                    : "text-2xl font-bold text-slate-300 opacity-50"
                )}>
                  {m}
                </div>
              )}
            </Picker.Item>
          ))}
        </Picker.Column>
      </Picker>
      <div className="picker-highlight" />
    </div>
  );
}
