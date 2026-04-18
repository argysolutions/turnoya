import React from 'react'
import { motion } from 'framer-motion'

/**
 * AgendaSkeleton
 * Synchronized with the rounded-2xl Design System.
 */
export const AgendaSkeleton = () => {
  return (
    <div className="space-y-4 pt-1">
      {/* Date Header Skeleton */}
      <div className="h-3 bg-slate-100 rounded-md w-32 animate-pulse mb-6 ml-1" />

      {[1, 2, 3].map((group) => (
        <div key={group} className="space-y-3">
          {/* Section Header */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-100 animate-pulse" />
            <div className="h-3 bg-slate-100 rounded-md w-24 animate-pulse" />
            <div className="w-7 h-4 bg-slate-50 rounded-lg animate-pulse ml-auto" />
          </div>

          {/* Cards Group */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-50">
            {[1, 2].map((i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 h-[120px] sm:h-[72px]">
                <div className="flex items-center gap-5 sm:gap-8">
                  {/* Time */}
                  <div className="space-y-1.5 flex flex-col items-center min-w-[45px]">
                    <div className="h-5 bg-slate-100 rounded w-10 animate-pulse" />
                    <div className="h-2 bg-slate-50 rounded w-6 animate-pulse" />
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-40 animate-pulse" />
                    <div className="h-3 bg-slate-50 rounded w-32 animate-pulse" />
                  </div>
                </div>

                {/* Status bubble */}
                <div className="w-20 h-7 bg-slate-50 rounded-xl animate-pulse mt-4 sm:mt-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AgendaSkeleton
