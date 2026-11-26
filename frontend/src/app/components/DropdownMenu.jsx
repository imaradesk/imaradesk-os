import React, { useState, useRef, useEffect } from 'react'
import { Link } from '@inertiajs/react'
import { isInFloatingLayer } from '../../utils/floatingLayer'

const PALETTES = {
  // 'inherit' uses plain gray classes so the surrounding .app-dark / .app-light scope themes it
  inherit: {
    panel: 'bg-white border-gray-200',
    header: 'text-gray-400',
    divider: 'border-gray-100',
    item: 'text-gray-700 hover:bg-gray-50',
    disabled: 'text-gray-300 cursor-not-allowed',
    danger: 'text-red-600 hover:bg-red-50',
  },
  // For use outside the themed content area (e.g. the dark top bar)
  dark: {
    panel: 'bg-[#1b1f24] border-white/10',
    header: 'text-gray-500',
    divider: 'border-white/10',
    item: 'text-gray-200 hover:bg-white/10',
    disabled: 'text-gray-600 cursor-not-allowed',
    danger: 'text-red-400 hover:bg-red-500/10',
  },
}

/**
 * Shared dropdown menu.
 *
 * trigger: ({ open, toggle }) => node
 * items:   array of
 *   { type: 'header', label }
 *   { type: 'divider' }
 *   { label, icon, onClick, href, disabled, danger }   (falsy entries are skipped)
 * direction: 'down' (default) or 'up' for triggers near the bottom of the screen.
 * The menu closes on item click, outside click and Escape.
 */
export default function DropdownMenu({ trigger, items = [], align = 'right', width = 224, palette = 'inherit', direction = 'down', className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const p = PALETTES[palette] || PALETTES.inherit

  useEffect(() => {
    if (!open) return
    const onClick = (e) => !isInFloatingLayer(e.target) && ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => setOpen((o) => !o)

  return (
    <div ref={ref} className={`relative ${className}`}>
      {trigger({ open, toggle })}
      {open && (
        <div
          className={`absolute ${direction === 'up' ? 'bottom-full mb-1' : 'mt-1'} py-1 z-50 border rounded-lg shadow-lg ${align === 'left' ? 'left-0' : 'right-0'} ${p.panel}`}
          style={{ width }}
          role="menu"
        >
          {items.filter(Boolean).map((item, i) => {
            if (item.type === 'divider') return <div key={i} className={`border-t my-1 ${p.divider}`} />
            if (item.type === 'header') {
              return (
                <div key={i} className={`px-3 py-1 text-xs font-medium uppercase tracking-wide ${p.header}`}>
                  {item.label}
                </div>
              )
            }
            const Icon = item.icon
            const cls = `w-full px-4 py-2 text-sm text-left flex items-center gap-3 transition-colors ${
              item.disabled ? p.disabled : item.danger ? p.danger : p.item
            }`
            const content = (
              <>
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                {item.label}
              </>
            )
            if (item.href && !item.disabled) {
              return (
                <Link key={i} href={item.href} onClick={() => setOpen(false)} className={cls} role="menuitem">
                  {content}
                </Link>
              )
            }
            return (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cls}
                onClick={() => {
                  setOpen(false)
                  item.onClick && item.onClick()
                }}
              >
                {content}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
