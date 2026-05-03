import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { Search, X, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * MobilePicker: A "Native Feel" bottom sheet selector.
 * Includes search, swipe-to-close handle, and large touch targets.
 */
export const MobilePicker = ({ 
  isOpen, 
  onClose, 
  title, 
  options = [], 
  value, 
  onSelect,
  placeholder = "Seleccionar opción...",
  searchPlaceholder = "Buscar...",
  renderOption
}) => {
  const dragControls = useDragControls()
  const [search, setSearch] = useState('')

  const filteredOptions = useMemo(() => {
    return options.filter(opt => {
      const label = (opt.label || opt.name || opt.text || '').toLowerCase()
      const subtext = (opt.subtext || '').toLowerCase()
      const term = search.toLowerCase()
      return label.includes(term) || subtext.includes(term)
    })
  }, [options, search])

  // Reset search when opening/closing
  React.useEffect(() => {
    if (!isOpen) setSearch('')
  }, [isOpen])

  const selectedOption = useMemo(() => {
    return options.find(opt => opt.id === value || opt.value === value)
  }, [options, value])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm lg:hidden"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 500 }}
            dragElastic={{ top: 0, bottom: 0.1 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 300) {
                onClose()
              }
            }}
            className="fixed inset-x-0 bottom-0 z-[160] flex flex-col bg-white rounded-t-[32px] lg:hidden shadow-[0_-8px_30px_rgb(0,0,0,0.12)] h-[85vh]"
          >
            {/* Handle bar area with drag listener */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: 'none' }}
              className="w-full py-4 cursor-grab active:cursor-grabbing shrink-0"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />
            </div>

            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50 shrink-0">
              <h3 className="text-xl font-black text-black">{title}</h3>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            {(options.length > 8 || searchPlaceholder) && (
              <div className="px-6 py-4 shrink-0">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={searchPlaceholder || "Buscar..."}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-transparent rounded-2xl text-base focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="flex-1 overflow-y-auto px-4 pb-12 custom-scrollbar">
              <div className="flex flex-col gap-1.5 mt-2">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => {
                    const isSelected = opt.id === value || opt.value === value
                    const label = opt.label || opt.name || opt.text || ''
                    
                    return (
                      <button
                        key={opt.id || opt.value}
                        onClick={() => {
                          onSelect(opt)
                          onClose()
                        }}
                        className={cn(
                          "flex items-center justify-between w-full px-5 py-4 rounded-2xl text-left transition-all active:scale-[0.98]",
                          isSelected 
                            ? "bg-blue-50 text-blue-900 ring-1 ring-blue-100" 
                            : "bg-white text-slate-700 hover:bg-slate-50 border border-transparent"
                        )}
                      >
                        <div className="flex flex-col">
                          {renderOption ? renderOption(opt) : (
                            <span className={cn("text-[15px] font-bold", isSelected ? "text-blue-900" : "text-slate-800")}>
                              {label}
                            </span>
                          )}
                          {opt.subtext && <span className="text-xs text-slate-400 mt-0.5">{opt.subtext}</span>}
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                      </button>
                    )
                  })
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <Search className="w-6 h-6 text-slate-200" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin resultados</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * PickerButton: The trigger component for the MobilePicker.
 */
export const PickerButton = ({ label, value, placeholder, onClick, className, icon: Icon, iconClassName }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex items-center justify-between w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-base font-medium transition-all active:scale-[0.99] hover:border-slate-300",
      !value && "text-slate-400",
      className
    )}
  >
    <div className="flex items-center gap-3 truncate">
      {Icon && (
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          iconClassName || "text-blue-600"
        )}>
          <Icon className={cn("w-5 h-5", iconClassName?.includes('bg-') ? "text-white" : "")} />
        </div>
      )}
      <span className="truncate">{value || placeholder}</span>
    </div>
    <ChevronDown className="w-5 h-5 text-slate-300 shrink-0 ml-2" />
  </button>
)
