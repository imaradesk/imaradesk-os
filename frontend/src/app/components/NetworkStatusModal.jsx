import React, { useState, useEffect } from 'react'
import { Wifi, Loader2, CheckCircle2, WifiOff } from 'lucide-react'

export default function NetworkStatusModal() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showModal, setShowModal] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setIsReconnecting(false)
      setShowSuccess(true)
      
      // Hide success message and modal after 2 seconds
      setTimeout(() => {
        setShowSuccess(false)
        setShowModal(false)
      }, 2000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowModal(true)
      setIsReconnecting(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial state
    if (!navigator.onLine) {
      setShowModal(true)
      setIsReconnecting(true)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showModal) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop - no click handler to prevent closing */}
      <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-fadeIn">
        {showSuccess ? (
          // Success state
          <>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-24 h-24 text-green-500" />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Wifi className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-600">
                  Reconnected!
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Your internet connection has been restored.
              </p>
            </div>
          </>
        ) : (
          // Offline/Reconnecting state
          <>
            <div className="flex justify-center mb-4">
              <WifiOff className="w-24 h-24 text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Internet Connection
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Please check your network connection and try again.
              </p>
              
              {isReconnecting && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reconnecting...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
