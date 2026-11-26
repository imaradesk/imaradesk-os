import React from 'react'
import { useTimezone } from '../../../context/TimezoneContext'

// Device type icons
const DeviceIcon = ({ type, isCurrent }) => {
  const iconClass = `w-5 h-5 ${isCurrent ? 'text-white' : 'text-gray-500'}`
  
  if (type === 'mobile') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconClass}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    )
  }
  
  if (type === 'tablet') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconClass}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
      </svg>
    )
  }
  
  // Default: desktop
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconClass}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  )
}

// Skeleton for loading state
function DeviceSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-gray-200" />
        <div>
          <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-48 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="text-right">
        <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

// Pagination component
function Pagination({ page, totalPages, hasNext, hasPrevious, onPageChange }) {
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious}
          className={`px-3 py-1.5 text-sm rounded-md border ${
            hasPrevious 
              ? 'border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer' 
              : 'border-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className={`px-3 py-1.5 text-sm rounded-md border ${
            hasNext 
              ? 'border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer' 
              : 'border-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default function SecurityTab({ 
  devices = [], 
  loading = false,
  pagination = null,
  onPageChange,
  onRevokeDevice,
  onSignOutAll 
}) {
  const { formatDate } = useTimezone()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
        <button 
          onClick={onSignOutAll}
          className="text-sm text-red-600 hover:underline"
        >
          Sign out all devices
        </button>
      </div>
      <div className="space-y-4">
        {loading ? (
          <>
            <DeviceSkeleton />
            <DeviceSkeleton />
            <DeviceSkeleton />
          </>
        ) : devices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No active sessions found
          </div>
        ) : (
          devices.map((device) => (
            <div 
              key={device.id} 
              className={`flex items-center justify-between p-4 rounded-lg border ${
                device.isCurrent ? 'border-[#0B3D26] bg-purple-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  device.isCurrent ? 'bg-[#0B3D26]' : 'bg-gray-100'
                }`}>
                  <DeviceIcon type={device.deviceType} isCurrent={device.isCurrent} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {device.deviceName || `${device.os} ${device.osVersion}`}
                    </p>
                    {device.isCurrent && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-[#0B3D26] text-white rounded">Current</span>
                    )}
                    {device.isTrusted && !device.isCurrent && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">Trusted</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {device.browser} {device.browserVersion} • {device.location || device.ipAddress || 'Unknown location'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Last active</p>
                  <p className="text-sm text-gray-700">
                    {device.lastActive ? formatDate(device.lastActive) : '-'}
                  </p>
                </div>
                {!device.isCurrent && onRevokeDevice && (
                  <button
                    onClick={() => onRevokeDevice(device.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {pagination && pagination.totalPages > 1 && !loading && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          hasNext={pagination.hasNext}
          hasPrevious={pagination.hasPrevious}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}
