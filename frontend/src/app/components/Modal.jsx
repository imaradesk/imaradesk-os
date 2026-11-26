import React, { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTheme } from './ThemeContext'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
}

const TONES = {
  default: 'bg-[#0B3D26]/10 text-[#0B3D26]',
  danger: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
  success: 'bg-green-50 text-green-600',
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

// Open modals and drawers, innermost last: only the top one reacts to Escape, and the page stays scroll-locked until all close.
export const overlayStack = []
const stack = overlayStack

/**
 * Shared modal dialog used across the app.
 *
 *   <Modal isOpen onClose title="Merge ticket" description="…" icon={Merge} size="md"
 *          footer={<><Button …>Cancel</Button><Button …>Merge</Button></>}>
 *     <ModalBody>…</ModalBody>
 *   </Modal>
 *
 * - Closes on Escape, backdrop click and the × button unless `dismissible` is false.
 * - Focus moves into the dialog on open and returns to the trigger on close.
 * - `footer` stays pinned below a scrolling body; ModalFooter can also be placed inside children.
 * - `maxWidth` (a Tailwind class) is still accepted for existing callers; `size` is the shorthand.
 * - `bodyClassName` replaces the scrolling body wrapper for layouts that manage their own scrolling.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  tone = 'default',
  children,
  footer,
  size,
  maxWidth = 'max-w-4xl',
  align = 'center',
  showCloseButton = true,
  closeOnBackdrop = true,
  dismissible = true,
  zIndex = 'z-[100]',
  className = '',
  bodyClassName = 'flex-1 min-h-0 overflow-y-auto',
}) {
  const { isDark } = useTheme()
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const idRef = useRef(Symbol('modal'))
  const titleId = useId()
  const descriptionId = useId()
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return undefined
    const id = idRef.current
    const previouslyFocused = document.activeElement
    stack.push(id)
    if (stack.length === 1) document.body.style.overflow = 'hidden'

    // Prefer an [autofocus] field, then the first focusable control, then the panel itself
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel || panel.contains(document.activeElement)) return
      const target = panel.querySelector('[autofocus], [data-autofocus]') || panel.querySelector(FOCUSABLE) || panel
      target.focus({ preventScroll: true })
    })

    const onKey = (e) => {
      if (stack[stack.length - 1] !== id) return
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation()
        onCloseRef.current?.()
      } else if (e.key === 'Tab' && panelRef.current) {
        // Keep keyboard focus inside the dialog
        const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null)
        if (nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      const index = stack.indexOf(id)
      if (index !== -1) stack.splice(index, 1)
      if (stack.length === 0) document.body.style.overflow = ''
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [isOpen, dismissible])

  if (!isOpen) return null

  const width = (size && SIZES[size]) || maxWidth
  const hasHeader = title || Icon || description

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndex} flex justify-center p-4 ${align === 'top' ? 'items-start pt-[12vh]' : 'items-end sm:items-center'} ${isDark ? 'app-dark' : ''}`}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fadeIn"
        onClick={() => dismissible && closeOnBackdrop && onClose?.()}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative flex flex-col w-full ${width} max-h-[90vh] bg-white rounded-xl shadow-modal border border-gray-200 overflow-hidden animate-scaleIn focus:outline-none ${className}`}
      >
        {hasHeader && (
          <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
            {Icon && (
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${TONES[tone] || TONES.default}`}>
                <Icon className="w-[18px] h-[18px]" />
              </span>
            )}
            <div className="flex-1 min-w-0 self-center">
              {title && <h2 id={titleId} className="text-base font-semibold text-gray-900 leading-snug">{title}</h2>}
              {description && <p id={descriptionId} className="mt-0.5 text-sm text-gray-500">{description}</p>}
            </div>
            {showCloseButton && dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className={bodyClassName}>
          {children}
        </div>

        {footer && <ModalFooter className="flex-shrink-0">{footer}</ModalFooter>}
      </div>
    </div>,
    document.body
  )
}

export function ModalHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-gray-100 ${className}`}>
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
    <div className={`px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-2.5 ${className}`}>
      {children}
    </div>
  )
}

/** Standard footer buttons so every dialog's actions look the same. */
export function ModalButton({ variant = 'secondary', loading = false, className = '', children, ...props }) {
  const styles = {
    primary: 'bg-[#0B3D26] hover:bg-[#14502F] text-white border-transparent',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
    secondary: 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100',
  }
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={`h-9 px-4 inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant] || styles.secondary} ${className}`}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
