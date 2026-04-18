import React from 'react'

export const AgendaSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2].map((group) => (
        <div key={group} className="space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-3 h-3 rounded-full bg-slate-200" />
            <div className="h-4 bg-slate-200 rounded w-24" />
            <div className="h-4 bg-slate-100 rounded w-8" />
          </div>
          <div className="bg-white border rounded-2xl overflow-hidden divide-y divide-slate-50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-6">
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-10" />
                    <div className="h-2 bg-slate-100 rounded w-8" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-32" />
                    <div className="h-3 bg-slate-100 rounded w-24" />
                  </div>
                </div>
                <div className="w-16 h-6 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AgendaSkeleton
