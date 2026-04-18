"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { es } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={es}
      className={cn("p-1", className)}
      classNames={{
        months: "relative",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]",
        nav: "flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 border-slate-100 rounded-md absolute left-0 z-10"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 border-slate-100 rounded-md absolute right-0 z-10"
        ),
        month_grid: "w-full",
        weekdays: "grid grid-cols-7 mb-2",
        weekday: "text-slate-400 font-black text-[9px] uppercase tracking-tighter text-center",
        week: "grid grid-cols-7 w-full mt-0.5",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-full p-0 font-medium transition-all hover:bg-slate-100 hover:text-slate-900 text-[11px] text-slate-900 rounded-lg"
        ),
        selected:
          "bg-slate-900 text-white hover:bg-slate-900 hover:text-white focus:bg-slate-900 focus:text-white shadow-md !opacity-100",
        today: "bg-slate-100 text-slate-900 font-black",
        outside: "text-slate-300 opacity-40",
        disabled: "text-slate-300 opacity-10",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) => {
          if (props.orientation === 'left') return <ChevronLeftIcon className="h-3 w-3 stroke-[3]" />
          return <ChevronRightIcon className="h-3 w-3 stroke-[3]" />
        }
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
