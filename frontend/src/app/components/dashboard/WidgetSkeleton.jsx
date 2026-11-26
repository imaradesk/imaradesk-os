import React from 'react'

const bar = 'rounded bg-gray-200'

/** The one loading placeholder for every card's contents; the card border itself stays real. */
export default function WidgetSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse flex flex-col gap-4 h-full min-h-[112px]">
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 ${bar}`} />
        <div className={`h-3 w-1/3 ${bar}`} />
      </div>
      <div className={`h-6 w-1/4 ${bar}`} />
      <div className="mt-auto space-y-2.5">
        <div className={`h-2.5 w-full ${bar}`} />
        <div className={`h-2.5 w-5/6 ${bar}`} />
        <div className={`h-2.5 w-2/3 ${bar}`} />
      </div>
    </div>
  )
}
