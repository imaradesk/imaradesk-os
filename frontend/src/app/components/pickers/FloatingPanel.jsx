import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FLOATING_LAYER_ATTR } from '../../../utils/floatingLayer'

const GAP = 10
const ARROW = 9
const EDGE = 8

/**
 * Open/close state, anchored positioning and outside-click handling shared by
 * the date and time pickers. The panel renders in a portal so it isn't clipped
 * by modals or scroll containers.
 */
export function useFloatingPanel({ disabled = false, panelWidth, panelHeight }) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const [isDarkScope, setIsDarkScope] = useState(false)
  const anchorRef = useRef(null)
  const panelRef = useRef(null)

  const close = useCallback(() => {
    setIsOpen(false)
    setPosition(null)
  }, [])

  const open = useCallback(() => {
    if (disabled) return
    // The portal leaves the themed subtree, so carry the dark scope along
    setIsDarkScope(!!anchorRef.current?.closest('.app-dark'))
    setIsOpen(true)
  }, [disabled])

  const toggle = useCallback(() => (isOpen ? close() : open()), [isOpen, close, open])

  // Place below the field (or above when there is more room there), at the
  // panel's own width: aligned to the field's left edge, or its right edge
  // when that would overflow. The arrow points back at the field.
  const reposition = useCallback(() => {
    if (!anchorRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth
    const width = Math.min(panelWidth, vw - EDGE * 2)
    const spaceBelow = vh - r.bottom - GAP - EDGE
    const placeAbove = spaceBelow < panelHeight && r.top - GAP - EDGE > spaceBelow
    const preferred = r.left + width > vw - EDGE ? r.right - width : r.left
    const left = Math.max(EDGE, Math.min(preferred, vw - width - EDGE))
    // Narrow fields: point at the middle; wide ones: at the leading icon
    const target = r.width <= width ? r.left + r.width / 2 : (preferred === r.left ? r.left + 18 : r.right - 18)
    setPosition({
      left,
      width,
      placeAbove,
      top: placeAbove ? undefined : r.bottom + GAP,
      bottom: placeAbove ? vh - r.top + GAP : undefined,
      arrowLeft: Math.max(12, Math.min(target - left - ARROW, width - ARROW * 2 - 12)),
    })
  }, [panelWidth, panelHeight])

  useLayoutEffect(() => {
    if (!isOpen) return
    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [isOpen, reposition])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event) => {
      if (anchorRef.current?.contains(event.target)) return
      if (panelRef.current?.contains(event.target)) return
      close()
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
        anchorRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey, true)
    }
  }, [isOpen, close])

  return { isOpen, open, close, toggle, position, isDarkScope, anchorRef, panelRef }
}

/** Arrow made of two stacked triangles: border colour behind, panel fill on top */
function Arrow({ placeAbove, left }) {
  const edge = placeAbove ? 'borderTop' : 'borderBottom'
  const offset = placeAbove ? 'bottom' : 'top'
  const base = { position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }
  return (
    <>
      <span
        aria-hidden="true"
        style={{
          ...base,
          left,
          [offset]: -ARROW,
          borderLeft: `${ARROW}px solid transparent`,
          borderRight: `${ARROW}px solid transparent`,
          [edge]: `${ARROW}px solid var(--popover-border, #e5e7eb)`,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          ...base,
          left: left + 1,
          [offset]: -(ARROW - 2),
          borderLeft: `${ARROW - 1}px solid transparent`,
          borderRight: `${ARROW - 1}px solid transparent`,
          [edge]: `${ARROW - 1}px solid var(--popover-bg, #fff)`,
        }}
      />
    </>
  )
}

export function FloatingPanel({ panel, children, className = '' }) {
  if (!panel.isOpen || !panel.position) return null
  const { position, isDarkScope, panelRef } = panel
  return createPortal(
    <div {...{ [FLOATING_LAYER_ATTR]: '' }} className={isDarkScope ? 'app-dark' : ''}>
      <div
        ref={panelRef}
        className={`select-pop fixed z-[10000] ${position.placeAbove ? 'origin-bottom' : 'origin-top'}`}
        style={{ left: position.left, width: position.width, top: position.top, bottom: position.bottom }}
      >
        <div
          className={`popover-panel overflow-hidden ${className}`}
          style={{
            background: 'var(--popover-bg, #fff)',
            border: '1px solid var(--popover-border, #e5e7eb)',
            borderRadius: 12,
            boxShadow: 'var(--popover-shadow, 0 4px 6px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.14))',
          }}
        >
          {children}
        </div>
        <Arrow placeAbove={position.placeAbove} left={position.arrowLeft} />
      </div>
    </div>,
    document.body
  )
}

const SIZES = {
  sm: 'h-8 text-xs',
  md: 'h-9 text-sm',
  lg: 'h-10 text-sm',
}

/**
 * Visually hidden input that carries `name` / `required` so pickers still
 * take part in native form submission and validation.
 */
export function HiddenFormValue({ name, value, required }) {
  if (!name && !required) return null
  return (
    <input
      tabIndex={-1}
      aria-hidden="true"
      name={name}
      value={value || ''}
      required={required}
      onChange={() => {}}
      className="absolute bottom-0 left-1/2 w-px h-px opacity-0 pointer-events-none"
    />
  )
}

/** Trigger button styled like the app's text fields */
export const PickerTrigger = React.forwardRef(function PickerTrigger(
  { icon: Icon, label, placeholder, isOpen, disabled, error, size = 'md', className = '', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      className={`group w-full ${SIZES[size] || SIZES.md} px-2.5 flex items-center gap-2 text-left rounded-lg border transition-[border-color,box-shadow] duration-150 focus:outline-none
        ${error
          ? 'border-red-400 focus-visible:ring-4 focus-visible:ring-red-500/10'
          : `border-gray-200 hover:border-gray-300 focus-visible:border-[#0B3D26] focus-visible:ring-4 focus-visible:ring-[#0B3D26]/10 ${isOpen ? 'border-[#0B3D26] ring-4 ring-[#0B3D26]/10' : ''}`}
        ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white cursor-pointer'}
        ${className}`}
      {...props}
    >
      {Icon && <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isOpen ? 'text-[#0B3D26]' : 'text-gray-400 group-hover:text-gray-500'}`} strokeWidth={1.75} />}
      <span className={`flex-1 min-w-0 truncate tabular-nums ${label ? (disabled ? 'text-gray-400' : 'text-gray-900') : 'text-gray-400'}`}>
        {label || placeholder}
      </span>
    </button>
  )
})
