"use client"

import * as React from "react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"
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
      className={cn("p-4 bg-white", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-6 sm:space-x-6 sm:space-y-0",
        month: "space-y-6",
        caption: "flex justify-center pt-2 relative items-center mb-4",
        caption_label: "text-sm font-black text-slate-800 uppercase tracking-[0.2em]",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-60 hover:opacity-100 border-slate-100 rounded-xl transition-all"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full mb-2",
        head_cell: "text-slate-400 rounded-md w-10 font-black text-[10px] uppercase tracking-tighter flex-1 text-center",
        row: "flex w-full mt-1",
        cell: cn(
          "relative h-10 w-10 p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-bold aria-selected:opacity-100 rounded-2xl transition-all hover:bg-slate-100 hover:text-slate-900 mx-auto"
        ),
        day_selected:
          "bg-slate-900 text-white hover:bg-slate-900 hover:text-white focus:bg-slate-900 focus:text-white shadow-xl shadow-slate-200 ring-4 ring-white",
        day_today: "bg-slate-100 text-slate-900 font-black",
        day_outside: "text-slate-200 opacity-30",
        day_disabled: "text-slate-200 opacity-30",
        day_range_middle:
          "aria-selected:bg-slate-50 aria-selected:text-slate-900",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeftIcon className="h-4 w-4 stroke-[3]" />,
        IconRight: ({ ...props }) => <ChevronRightIcon className="h-4 w-4 stroke-[3]" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
