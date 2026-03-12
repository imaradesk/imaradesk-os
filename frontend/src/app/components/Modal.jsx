import React from 'react'

export default function Modal({ 
  isOpen, 
  onClose, 
  title,
  children,
  maxWidth = 'max-w-4xl',
  showCloseButton = true,
  closeOnBackdrop = true,
  headerColor = 'bg-[#4a154b]',
  headerTextColor = 'text-white'
}) {
  if (!isOpen) return null

  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />
      
      {/* Modal */}
      <div 
        className={`relative bg-white rounded-lg shadow-xl ${maxWidth} w-full mx-4 animate-fadeIn overflow-hidden`}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        {title && (
          <div className={`${headerColor} px-6 py-4 flex items-center justify-between`}>
            <h2 className={`text-xl font-semibold ${headerTextColor}`}>{title}</h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className={`${headerTextColor} hover:opacity-75 transition-opacity`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: title ? 'calc(90vh - 64px)' : '90vh' }}>
          {children}
        </div>
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

// Convenience components for modal sections
export function ModalHeader({ children, className = '' }) {
  return (
    <div className={`p-6 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  )
}

export function ModalBody({ children, className = '', noPadding = false }) {
  return (
    <div className={noPadding ? className : `p-6 ${className}`}>
      {children}
    </div>
  )
}

export function ModalFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3 ${className}`}>
      {children}
    </div>
  )
}
