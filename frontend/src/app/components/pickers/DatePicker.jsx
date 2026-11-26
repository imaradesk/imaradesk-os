import React, { useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useFloatingPanel, FloatingPanel, PickerTrigger, HiddenFormValue } from './FloatingPanel'

const pad = (n) => String(n).padStart(2, '0')
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/** "2026-10-28" -> local Date, or null */
export function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '')
  if (!match) return null
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

/** Local Date -> "2026-10-28" */
export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = parseDate(value)
  return d ? d.toLocaleDateString('en-US', options) : ''
}

/** 6x7 grid of dates for the month, starting on Monday */
function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, i - offset + 1))
}

/**
 * Calendar date picker. `value` and `onChange` use "YYYY-MM-DD" strings,
 * like a native date input. `min` / `max` take the same format.
 */
export default function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Select date',
  disabled = false,
  allowClear = false,
  error,
  id,
  name,
  required = false,
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
}) {
  const panel = useFloatingPanel({ disabled, panelWidth: 288, panelHeight: 360 })
  const selected = parseDate(value)
  const today = new Date()
  const todayISO = toISODate(today)

  const [view, setView] = useState(() => {
    const base = selected || today
    return { year: base.getFullYear(), month: base.getMonth() }
  })
  const [picking, setPicking] = useState('days') // 'days' | 'months'

  // Jump back to the selected month each time the calendar opens
  useEffect(() => {
    if (!panel.isOpen) return
    const base = parseDate(value) || new Date()
    setView({ year: base.getFullYear(), month: base.getMonth() })
    setPicking('days')
  }, [panel.isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const isDisabledDate = (iso) => (min && iso < min) || (max && iso > max)

  const shiftMonth = (delta) => setView(({ year, month }) => {
    const d = new Date(year, month + delta, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const pick = (iso) => {
    if (isDisabledDate(iso)) return
    onChange?.(iso)
    panel.close()
  }

  // Arrow-key navigation across days, moving focus with the selection
  const handleGridKey = (e, date) => {
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (!(e.key in steps)) return
    e.preventDefault()
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + steps[e.key])
    if (next.getMonth() !== view.month) setView({ year: next.getFullYear(), month: next.getMonth() })
    requestAnimationFrame(() => {
      panel.panelRef.current?.querySelector(`[data-date="${toISODate(next)}"]`)?.focus()
    })
  }

  const days = monthGrid(view.year, view.month)
  // One tabbable day: the selection, else today, else the 1st of the shown month
  const inView = (d) => d && d.getFullYear() === view.year && d.getMonth() === view.month
  const focusISO = inView(selected) ? value : inView(today) ? todayISO : toISODate(new Date(view.year, view.month, 1))
  const heading = new Date(view.year, view.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div ref={panel.anchorRef} className={`relative min-w-0 ${className}`}>
      <PickerTrigger
        icon={CalendarDays}
        label={formatDate(value)}
        placeholder={placeholder}
        isOpen={panel.isOpen}
        disabled={disabled}
        error={error}
        onClick={panel.toggle}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); panel.open() } }}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        id={id}
        size={size}
      />
      <HiddenFormValue name={name} value={value} required={required} />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

      <FloatingPanel panel={panel}>
        <div role="dialog" aria-label={ariaLabel || 'Choose date'} className="p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setPicking(picking === 'days' ? 'months' : 'days')}
              className="h-8 px-2 -ml-1 rounded-md text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Choose month"
            >
              {picking === 'days' ? heading : view.year}
            </button>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => (picking === 'days' ? shiftMonth(-1) : setView((v) => ({ ...v, year: v.year - 1 })))}
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label={picking === 'days' ? 'Previous month' : 'Previous year'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => (picking === 'days' ? shiftMonth(1) : setView((v) => ({ ...v, year: v.year + 1 })))}
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label={picking === 'days' ? 'Next month' : 'Next year'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {picking === 'months' ? (
            <div className="grid grid-cols-3 gap-1.5 py-1">
              {Array.from({ length: 12 }, (_, m) => {
                const isCurrent = selected && selected.getFullYear() === view.year && selected.getMonth() === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setView((v) => ({ ...v, month: m })); setPicking('days') }}
                    className={`h-11 rounded-lg text-sm transition-colors ${
                      isCurrent ? 'bg-[#0B3D26] text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {new Date(view.year, m, 1).toLocaleDateString('en-US', { month: 'short' })}
                  </button>
                )
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d) => (
                  <span key={d} className="h-7 inline-flex items-center justify-center text-[11px] font-medium text-gray-400">{d}</span>
                ))}
              </div>
              <div role="grid" className="grid grid-cols-7 gap-y-0.5">
                {days.map((date) => {
                  const iso = toISODate(date)
                  const inMonth = date.getMonth() === view.month
                  const isSelected = value === iso
                  const isToday = iso === todayISO
                  const isOff = isDisabledDate(iso)
                  const isFocusTarget = iso === focusISO
                  return (
                    <button
                      key={iso}
                      type="button"
                      data-date={iso}
                      tabIndex={isFocusTarget ? 0 : -1}
                      disabled={isOff}
                      onClick={() => pick(iso)}
                      onKeyDown={(e) => handleGridKey(e, date)}
                      aria-selected={isSelected}
                      aria-label={date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      className={`relative mx-auto w-9 h-9 rounded-lg text-sm tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B3D26]/30 ${
                        isSelected
                          ? 'bg-[#0B3D26] text-white font-semibold shadow-sm'
                          : isOff
                            ? 'text-gray-300 cursor-not-allowed'
                            : inMonth
                              ? 'text-gray-800 hover:bg-gray-100'
                              : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {date.getDate()}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0B3D26]" aria-hidden="true" />
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => pick(todayISO)}
              disabled={isDisabledDate(todayISO)}
              className="h-7 px-2.5 rounded-md text-xs font-semibold text-[#0B3D26] hover:bg-[#0B3D26]/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Today
            </button>
            {allowClear && value && (
              <button
                type="button"
                onClick={() => { onChange?.(''); panel.close() }}
                className="h-7 px-2.5 rounded-md text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </FloatingPanel>
    </div>
  )
}
