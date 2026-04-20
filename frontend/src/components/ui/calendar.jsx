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
        month_caption: "flex justify-center relative items-center h-10 w-full mb-6",
        caption_label: "text-sm font-medium text-slate-900",
        nav: "flex items-center",
        button_previous: "h-8 w-8 bg-slate-900 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center justify-center p-0 absolute left-2 top-5 -translate-y-1/2 z-10",
        button_next: "h-8 w-8 bg-slate-900 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center justify-center p-0 absolute right-2 top-5 -translate-y-1/2 z-10",
        month_grid: "w-full border-collapse",
        weekdays: "grid grid-cols-7 mb-4",
        weekday: "text-slate-500 font-medium text-xs uppercase tracking-tight text-center flex items-center justify-center h-10",
        weeks: "w-full",
        week: "grid grid-cols-7 w-full mt-1.5",
        day: "h-12 w-full flex items-center justify-center p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-12 w-12 p-0 text-base font-normal transition-all cursor-pointer rounded-xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-700"
        ),
        selected: "[&_button]:bg-slate-900 [&_button]:text-white [&_button]:font-semibold [&_button]:opacity-100 [&_button]:hover:bg-blue-600 [&_button]:hover:text-white [&_button]:transition-colors", 
        today: "[&_button]:border-2 [&_button]:border-slate-100 [&_button]:text-slate-900 [&_button]:font-bold",
        outside: "day-outside text-slate-300 opacity-30",
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
