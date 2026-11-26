import Modal from './Modal'
import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import okImg from '../assets/ok.jpg'

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

  // Not dismissible: it closes itself once the connection is back
  return (
    <Modal isOpen={showModal} dismissible={false} zIndex="z-[200]" size="md">
      <div className="px-6 py-8 text-center">
        {showSuccess ? (
          <>
            <img src={okImg} alt="" className="w-28 h-28 mx-auto object-contain mb-4" />
            <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-green-600">
              <Wifi className="w-5 h-5" /> Reconnected
            </h3>
            <p className="mt-1 text-sm text-gray-600">Your internet connection has been restored.</p>
          </>
        ) : (
          <>
            <span className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <WifiOff className="w-6 h-6" />
            </span>
            <h3 className="text-lg font-semibold text-gray-900">No internet connection</h3>
            <p className="mt-1 text-sm text-gray-600">Check your network connection. We'll reconnect automatically.</p>
            {isReconnecting && (
              <p className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500" role="status">
                <Loader2 className="w-4 h-4 animate-spin" /> Reconnecting…
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
