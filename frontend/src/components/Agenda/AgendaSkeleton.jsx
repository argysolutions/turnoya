import React from 'react'

export const AgendaSkeleton = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center space-x-4 border rounded-xl p-4 bg-muted/20">
          <div className="w-16 h-12 bg-muted rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
          <div className="w-24 h-8 bg-muted rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default AgendaSkeleton
