import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import WheelTimePicker from "./wheel-time-picker";

export default function TimePickerModal({ value, onChange, label }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full h-11 justify-between bg-white border-slate-200 text-slate-900 font-bold px-4 rounded-xl shadow-sm active:scale-[0.98] transition-all"
        >
          <div className="flex flex-col items-start px-1">
             <span className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">{label}</span>
             <span className="text-sm">{value} hs</span>
          </div>
          <Clock className="h-4 w-4 text-slate-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] !rounded-t-3xl !rounded-b-none border-none sm:!rounded-3xl p-6 pb-12 fixed bottom-0 sm:bottom-auto top-auto sm:top-1/2 translate-y-0 sm:-translate-y-1/2 transition-transform duration-300">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-center text-slate-900 font-bold">Seleccionar Hora</DialogTitle>
          <p className="text-center text-xs text-slate-500">{label === 'Abre' ? 'Hora de apertura' : 'Hora de cierre'}</p>
        </DialogHeader>
        
        <div className="py-4">
          <WheelTimePicker value={value} onChange={onChange} />
        </div>

        <div className="mt-6">
          <Button 
            className="w-full h-12 bg-slate-900 text-white font-bold rounded-xl" 
            onClick={() => setOpen(false)}
          >
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
