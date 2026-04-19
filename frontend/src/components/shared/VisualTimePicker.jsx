import React, { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'
import WheelTimePicker from '@/components/ui/wheel-time-picker'

export const VisualTimePicker = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-between w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm active:scale-[0.98] outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
      >
        <span>{value} hs</span>
        <Clock className="w-4 h-4 text-slate-400" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[320px] !rounded-t-3xl !rounded-b-none border-none sm:!rounded-3xl p-6 pb-12 fixed bottom-0 sm:bottom-auto top-auto sm:top-1/2 translate-y-0 sm:-translate-y-1/2 transition-transform duration-300">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-center text-slate-900 font-bold">Seleccionar {label}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <WheelTimePicker value={value} onChange={onChange} />
          </div>
          <Button 
            className="w-full h-11 bg-slate-900 text-white font-bold rounded-xl mt-4" 
            onClick={() => setIsOpen(false)}
          >
            Confirmar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
