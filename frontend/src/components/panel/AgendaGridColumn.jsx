import React from 'react';
import AppointmentRow from '../Agenda/AppointmentRow';

export default function AgendaGridColumn({ title, count, dotColor, items, onCardClick }) {
  return (
    <div className="flex flex-col w-full">
      {/* HEADER: Texto estrictamente GRIS OSCURO (text-slate-800) y fuente normal (font-sans) */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></div>
          <span className="!font-sans !text-base !font-bold !text-slate-800 !tracking-tight m-0">
            {title}
          </span>
        </div>
        <span className="!font-sans !text-xs !font-bold bg-slate-100 !text-slate-600 py-1.5 px-3 rounded-full">
          {count}
        </span>
      </div>

      {/* CONTENEDOR DE TARJETAS: Usamos flex-col y gap-4 para separarlas. NINGÚN bg-white en este contenedor padre. */}
      {items.length > 0 ? (
        <div className="flex flex-col gap-4">
          {items.map(turno => (
            /* CADA TARJETA va en su propio contenedor blanco con borde y sombra para que no se peguen */
            <div key={turno.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full">
              <AppointmentRow 
                appointment={turno} 
                onClick={onCardClick} 
                isCompact={true} 
              />
            </div>
          ))}
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="w-full flex items-center justify-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <span className="!font-sans !text-xs !font-semibold !text-slate-400 uppercase !tracking-wider">
            Sin turnos
          </span>
        </div>
      )}
    </div>
  );
}
