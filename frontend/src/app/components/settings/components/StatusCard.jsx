import React from 'react'

// Skeleton loader for status card
export function StatusCardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 rounded-full border border-gray-200 bg-white animate-pulse">
      <div className="h-5 w-16 bg-gray-200 rounded" />
      <div className="w-7 h-7 bg-gray-200 rounded-full" />
    </div>
  )
}

export default function StatusCard({ label, count, bgColor = 'bg-white', textColor = 'text-gray-700', countBg = 'bg-[#0B3D26]', countText = 'text-white' }) {
  return (
    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full border border-gray-200 ${bgColor}`}>
      <span className={`text-sm font-medium ${textColor}`}>{label}</span>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${countBg} ${countText}`}>
        {count}
      </span>
    </div>
  )
}
