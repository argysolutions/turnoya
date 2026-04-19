import React, { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'
import WheelTimePicker from '@/components/ui/wheel-time-picker'
import { Label } from '@/components/ui/label'

export const VisualTimePicker = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(max-width: 768px)").matches)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const Trigger = (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="flex items-center justify-between w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm active:scale-[0.98] outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
    >
      <span>{value} hs</span>
      <Clock className="w-4 h-4 text-slate-400" />
    </button>
  )

  const Content = (
    <div className="space-y-4">
      <div className="py-2">
        <WheelTimePicker value={value} onChange={onChange} />
      </div>
      <Button 
        className="w-full h-11 bg-slate-900 text-white font-bold rounded-xl" 
        onClick={() => setIsOpen(false)}
      >
        Confirmar
      </Button>
    </div>
  )

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {Trigger}
        <DialogContent className="sm:max-w-[425px] !rounded-t-3xl !rounded-b-none border-none sm:!rounded-3xl p-6 pb-12 fixed bottom-0 sm:bottom-auto top-auto sm:top-1/2 translate-y-0 sm:-translate-y-1/2 transition-transform duration-300">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-center text-slate-900 font-bold">Seleccionar {label}</DialogTitle>
          </DialogHeader>
          {Content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {Trigger}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-[240px] p-4 bg-white rounded-2xl shadow-xl border-slate-100 animate-in fade-in zoom-in-95 duration-200 z-[100]">
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-tight">Seleccionar {label}</p>
        </div>
        {Content}
      </PopoverContent>
    </Popover>
  )
}
