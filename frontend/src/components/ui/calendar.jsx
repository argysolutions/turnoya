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
        month_grid: "block w-full border-collapse",
        weekdays: "grid grid-cols-7 w-full mb-1",
        weekday: "text-slate-400 font-black text-[9px] uppercase tracking-tighter text-center flex items-center justify-center h-8",
        weeks: "block w-full",
        week: "grid grid-cols-7 w-full mt-1",
        day: "h-9 w-full flex items-center justify-center p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-medium transition-all hover:bg-slate-100 hover:text-slate-900 rounded-lg flex items-center justify-center aria-selected:bg-slate-900 aria-selected:text-white aria-selected:opacity-100 aria-selected:hover:bg-slate-900 aria-selected:hover:text-white"
        ),
        selected: "", 
        today: "[&_button]:bg-slate-100 [&_button]:text-slate-900 [&_button]:font-black",
        outside: "day-outside text-slate-300 opacity-40",
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
