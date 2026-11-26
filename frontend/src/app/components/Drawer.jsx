import React, { useState, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTheme } from './ThemeContext'
import { overlayStack } from './Modal'

// Panel widths. Phones always get the full width (minus the floating gutter).
const SIZES = {
  sm: 'sm:max-w-lg',
  md: 'sm:max-w-2xl',
  lg: 'sm:w-2/3 sm:max-w-[1100px]',
  xl: 'sm:w-5/6 sm:max-w-[1400px]',
  full: '',
}

const TONES = {
  default: 'bg-[#0B3D26]/10 text-[#0B3D26]',
  danger: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
  success: 'bg-green-50 text-green-600',
}

/**
 * Shared slide-over panel.
 *
 *   <Drawer isOpen onClose title="New widget" description="…" icon={MessageCircle} size="lg" floating
 *           header={<Stepper … />} footer={<><Button …>Cancel</Button><Button …>Save</Button></>}>
 *     <DrawerBody>…</DrawerBody>
 *   </Drawer>
 *
 * - `size`: sm | md | lg | xl | full. `width` (a Tailwind class) still works for existing callers.
 * - `floating` insets the panel with rounded corners; otherwise it is flush with the screen edge.
 * - `header` renders under the title row (tabs, steppers); `footer` is pinned below the scrolling body.
 * - Closes on Escape (shares the Modal stack, so a modal opened inside closes first), backdrop and ×.
 */
export default function Drawer({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  tone = 'default',
  header,
  footer,
  children,
  size,
  width = 'max-w-md',
  position = 'right',
  showCloseButton = true,
  closeOnBackdrop = true,
  floating = false,
  panelClassName = '',
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const { isDark } = useTheme()
  const onCloseRef = useRef(onClose)
  const idRef = useRef(Symbol('drawer'))
  const titleId = useId()
  onCloseRef.current = onClose

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setIsClosing(false)
    } else if (isVisible) {
      setIsClosing(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setIsClosing(false)
      }, 220)
      return () => clearTimeout(timer)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return undefined
    const id = idRef.current
    overlayStack.push(id)
    if (overlayStack.length === 1) document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key !== 'Escape' || overlayStack[overlayStack.length - 1] !== id) return
      e.stopPropagation()
      onCloseRef.current?.()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const index = overlayStack.indexOf(id)
      if (index !== -1) overlayStack.splice(index, 1)
      if (overlayStack.length === 0) document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isVisible) return null

  const handleClose = () => onClose()
  const handleBackdropClick = () => { if (closeOnBackdrop) handleClose() }

  const slideAnim = position === 'right'
    ? (isClosing ? 'animate-slideOutRight' : 'animate-slideInRight')
    : (isClosing ? 'animate-slideOutLeft' : 'animate-slideInLeft')

  const positionClasses = floating
    ? (position === 'right' ? `right-3 ${slideAnim}` : `left-3 ${slideAnim}`)
    : (position === 'right' ? `right-0 ${slideAnim}` : `left-0 ${slideAnim}`)

  const widthClasses = size && size in SIZES
    ? `${floating ? 'w-[calc(100%_-_1.5rem)]' : 'w-full'} ${SIZES[size]}`
    : width

  const panelClasses = floating
    ? `absolute top-3 bottom-3 ${positionClasses} bg-white shadow-modal ${widthClasses} flex flex-col overflow-hidden rounded-2xl border border-gray-200 ${panelClassName}`
    : `absolute top-0 bottom-0 ${positionClasses} bg-white shadow-modal ${widthClasses} w-full flex flex-col ${panelClassName}`

  const hasHeader = title || Icon || description

  return createPortal(
    <div className={`fixed inset-0 z-[60] flex ${isDark ? 'app-dark' : ''}`}>
      <div
        className={`absolute inset-0 bg-black/35 backdrop-blur-[2px] ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
        onClick={handleBackdropClick}
      />

      <div className={panelClasses} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
        {hasHeader && (
          <div className={`px-6 py-4 flex items-start gap-3 flex-shrink-0 ${header ? '' : 'border-b border-gray-100'}`}>
            {Icon && (
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${TONES[tone] || TONES.default}`}>
                <Icon className="w-[18px] h-[18px]" />
              </span>
            )}
            <div className="flex-1 min-w-0 self-center">
              {title && <h2 id={titleId} className="text-base font-semibold text-gray-900 leading-snug truncate">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-gray-500 truncate">{description}</p>}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="-mr-2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        {header && <div className="border-b border-gray-100 flex-shrink-0">{header}</div>}

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </div>

        {footer && <DrawerFooter>{footer}</DrawerFooter>}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slideOutLeft { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        .animate-fadeIn { animation: fadeIn 0.18s ease-out; }
        .animate-fadeOut { animation: fadeOut 0.22s ease-out forwards; }
        .animate-slideInRight { animation: slideInRight 0.25s cubic-bezier(0.4,0,0.2,1); }
        .animate-slideOutRight { animation: slideOutRight 0.22s cubic-bezier(0.4,0,0.2,1) forwards; }
        .animate-slideInLeft { animation: slideInLeft 0.25s cubic-bezier(0.4,0,0.2,1); }
        .animate-slideOutLeft { animation: slideOutLeft 0.22s cubic-bezier(0.4,0,0.2,1) forwards; }
      `}</style>
    </div>,
    document.body
  )
}

export function DrawerBody({ children, className = '', noPadding = false }) {
  return (
    <div className={`flex-1 overflow-y-auto ${noPadding ? className : `p-6 ${className}`}`}>
      {children}
    </div>
  )
}

export function DrawerFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center gap-2.5 flex-shrink-0 ${className}`}>
      {children}
    </div>
  )
}
