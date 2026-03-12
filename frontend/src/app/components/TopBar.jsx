import React from 'react'
import { usePage } from '@inertiajs/react'

export default function TopBar({ variant = 'default' }) {
  const { props } = usePage()
  const user = props.auth?.user
  const businessName = props.tenant?.name || 'ImaraDesk'
  
  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const isTransparent = variant === 'transparent'

  return (
    <div className={`h-12 flex items-center justify-between px-6 sticky top-0 z-50 ${
      isTransparent 
        ? 'bg-gradient-to-r from-[#4a154b] via-[#5a2060] to-[#5a2060]' 
        : 'bg-white border-b border-gray-200'
    }`}>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${isTransparent ? 'text-white' : 'text-gray-800'}`}>{businessName}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search"
          className={`h-9 w-56 px-3 rounded-md text-sm focus:outline-none focus:ring-2 ${
            isTransparent 
              ? 'bg-white/10 border border-white/20 text-white placeholder-purple-200 focus:ring-white/30' 
              : 'border border-gray-300 focus:ring-blue-500'
          }`}
        />
        {user && (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isTransparent ? 'text-white' : 'text-gray-700'}`}>{user.name}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              isTransparent ? 'bg-white text-[#4a154b]' : 'bg-[#4a154b] text-white'
            }`}>
              {getInitials(user.name)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
