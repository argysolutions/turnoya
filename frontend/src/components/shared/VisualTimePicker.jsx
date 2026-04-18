import React, { useState, useRef, useEffect } from 'react'
import { Clock, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const VisualTimePicker = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Split "HH:mm" into hours and minutes
  const [currentHour, currentMinute] = value.split(':')

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const minutes = ['00', '15', '30', '45']

  const handleHourSelect = (hour) => {
    onChange(`${hour}:${currentMinute}`)
  }

  const handleMinuteSelect = (minute) => {
    onChange(`${currentHour}:${minute}`)
    setIsOpen(false) // Auto-close as requested
  }

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      
      {/* Trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full h-11 px-4 rounded-xl border bg-white cursor-pointer transition-all",
          "border-slate-200 hover:border-slate-300 shadow-sm",
          isOpen ? "ring-2 ring-slate-900 border-transparent" : ""
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-900">{value}</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </div>

      {/* Popover */}
      {isOpen && (
        <div className="absolute z-[60] mt-2 left-0 right-0 sm:right-auto sm:min-w-[280px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="space-y-4">
            {/* Hours Grid */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Hora</p>
              <div className="grid grid-cols-6 gap-1">
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleHourSelect(h)}
                    className={cn(
                      "h-8 text-xs font-medium rounded-lg transition-colors",
                      currentHour === h 
                        ? "bg-slate-900 text-white shadow-md" 
                        : "text-slate-600 hover:bg-blue-600 hover:text-white"
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Grid */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Minutos</p>
              <div className="grid grid-cols-4 gap-2">
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinuteSelect(m)}
                    className={cn(
                      "h-9 text-xs font-bold rounded-xl transition-colors border",
                      currentMinute === m 
                        ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                        : "border-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
