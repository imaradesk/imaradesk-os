import React from 'react'

export default function Drawer({ 
  isOpen, 
  onClose, 
  title,
  children,
  width = 'max-w-md',
  position = 'right',
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

  const positionClasses = position === 'right' 
    ? 'right-0 animate-slideInRight' 
    : 'left-0 animate-slideInLeft'

  return (
    <div className="fixed inset-0 z-[60] flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn"
        onClick={handleBackdropClick}
      />
      
      {/* Drawer */}
      <div 
        className={`absolute top-0 bottom-0 ${positionClasses} bg-white shadow-xl ${width} w-full flex flex-col`}
      >
        {/* Header */}
        {title && (
          <div className={`${headerColor} px-6 py-4 flex items-center justify-between flex-shrink-0`}>
            <h2 className={`text-lg font-semibold ${headerTextColor}`}>{title}</h2>
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
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

// Convenience components for drawer sections
export function DrawerBody({ children, className = '', noPadding = false }) {
  return (
    <div className={`flex-1 overflow-y-auto ${noPadding ? className : `p-6 ${className}`}`}>
      {children}
    </div>
  )
}

export function DrawerFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3 flex-shrink-0 ${className}`}>
      {children}
    </div>
  )
}
