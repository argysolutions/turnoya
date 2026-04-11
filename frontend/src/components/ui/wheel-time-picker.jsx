import { useState, useEffect } from 'react';
import Picker from 'react-mobile-picker';

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
    <div className="picker-container">
      <Picker value={pickerValue} onChange={handlePickerChange} wheelMode="natural">
        <Picker.Column name="hour">
          {hours.map((h) => (
            <Picker.Item key={h} value={h}>
              {({ selected }) => (
                <div className={`text-lg transition-all duration-200 ${selected ? 'text-slate-900 font-bold scale-110' : 'text-slate-400 font-medium scale-90'}`}>
                  {h}
                </div>
              )}
            </Picker.Item>
          ))}
        </Picker.Column>
        <Picker.Column name="minute">
          {minutes.map((m) => (
            <Picker.Item key={m} value={m}>
              {({ selected }) => (
                <div className={`text-lg transition-all duration-200 ${selected ? 'text-slate-900 font-bold scale-110' : 'text-slate-400 font-medium scale-90'}`}>
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
