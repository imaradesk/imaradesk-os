import React from 'react'

export default function Skeleton() {
  return (
    <div className="w-full px-3 py-2 rounded-md animate-pulse mb-2 space-y-2">
      <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
      <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
      <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
      <div className="h-4 w-full bg-gray-200 rounded"></div>
      <div className="h-4 w-full bg-gray-200 rounded"></div>
    </div>
  )
}
