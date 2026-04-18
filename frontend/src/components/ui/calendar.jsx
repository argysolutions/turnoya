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
        month_caption: "flex justify-center pt-2 relative items-center mb-6",
        caption_label: "text-sm font-black text-slate-900 uppercase tracking-[0.25em]",
        nav: "flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 border-slate-200 rounded-xl absolute left-2 z-10"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 border-slate-200 rounded-xl absolute right-2 z-10"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "grid grid-cols-7 mb-4",
        weekday: "text-slate-400 font-bold text-[10px] uppercase tracking-widest text-center flex items-center justify-center h-10",
        weeks: "w-full",
        week: "grid grid-cols-7 w-full mt-1.5",
        day: "h-12 flex items-center justify-center p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-12 w-12 p-0 text-base font-bold transition-all cursor-pointer rounded-xl flex items-center justify-center aria-selected:bg-slate-900 aria-selected:text-white aria-selected:opacity-100 aria-selected:hover:bg-slate-800 aria-selected:hover:text-white hover:bg-slate-100 hover:text-slate-900"
        ),
        selected: "", 
        today: "[&_button]:border-2 [&_button]:border-slate-100 [&_button]:text-slate-900 [&_button]:font-black",
        outside: "day-outside text-slate-300 opacity-30 aria-selected:bg-slate-900/50",
        disabled: "text-slate-300 opacity-20",
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
