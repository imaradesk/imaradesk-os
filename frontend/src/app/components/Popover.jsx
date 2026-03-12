import React, { useState, useEffect, useRef } from 'react'

export default function Popover({ 
  trigger, 
  children, 
  position = 'bottom-left',
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const positionClasses = {
    'bottom-left': 'top-full left-0 mt-2',
    'bottom-right': 'top-full right-0 mt-2',
    'top-left': 'bottom-full left-0 mb-2',
    'top-right': 'bottom-full right-0 mb-2',
  }

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-50 ${positionClasses[position]} ${className}`}
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
            {typeof children === 'function' 
              ? children({ close: () => setIsOpen(false) })
              : children
            }
          </div>
        </div>
      )}
    </div>
  )
}
