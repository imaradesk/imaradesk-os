import React, { useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'
import { useFloatingPanel, FloatingPanel, PickerTrigger, HiddenFormValue } from './FloatingPanel'

const pad = (n) => String(n).padStart(2, '0')

/** "13:05" -> { h: 13, m: 5 }, or null for anything unparsable */
export function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value || '')
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  return h < 24 && m < 60 ? { h, m } : null
}

/** "13:05" -> "1:05 PM" (or "13:05" in 24-hour mode) */
export function formatTime(value, use24h = false) {
  const t = parseTime(value)
  if (!t) return ''
  if (use24h) return `${pad(t.h)}:${pad(t.m)}`
  return `${t.h % 12 || 12}:${pad(t.m)} ${t.h < 12 ? 'AM' : 'PM'}`
}

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i)
const PRESETS = ['08:00', '09:00', '12:00', '17:00', '18:00']

function Column({ label, items, selected, onSelect, render = (v) => pad(v) }) {
  const ref = useRef(null)

  // Keep the current value in view when the panel opens or the value changes
  useEffect(() => {
    const el = ref.current?.querySelector('[aria-selected="true"]')
    if (el) ref.current.scrollTop = el.offsetTop - ref.current.clientHeight / 2 + el.clientHeight / 2
  }, [selected])

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center">{label}</div>
      <div ref={ref} role="listbox" aria-label={label} className="relative h-48 overflow-y-auto overscroll-contain scroll-smooth space-y-0.5 pr-0.5 [scrollbar-width:thin]">
        {items.map((item) => {
          const isSelected = item === selected
          return (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(item)}
              className={`w-full h-8 rounded-md text-sm tabular-nums transition-colors ${
                isSelected
                  ? 'bg-[#0B3D26] text-white font-semibold shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {render(item)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Time picker with hour / minute (/ AM-PM) columns.
 * `value` and `onChange` use 24-hour "HH:MM" strings, like a native time input.
 */
export default function TimePicker({
  value,
  onChange,
  step = 5,
  use24h = false,
  placeholder = 'Select time',
  disabled = false,
  error,
  id,
  name,
  required = false,
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
}) {
  const panel = useFloatingPanel({ disabled, panelWidth: use24h ? 200 : 248, panelHeight: 300 })
  const time = parseTime(value)

  const minutes = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step)
  // Keep an off-step saved value (e.g. 08:07) selectable
  if (time && !minutes.includes(time.m)) {
    minutes.push(time.m)
    minutes.sort((a, b) => a - b)
  }

  const current = time || { h: 9, m: 0 }
  const isPM = current.h >= 12
  const emit = (h, m) => onChange?.(`${pad(h)}:${pad(m)}`)

  const selectHour = (hour) => {
    if (use24h) return emit(hour, current.m)
    const h24 = (hour % 12) + (isPM ? 12 : 0)
    emit(h24, current.m)
  }
  const selectPeriod = (period) => {
    if ((period === 'PM') === isPM) return
    emit((current.h + 12) % 24, current.m)
  }

  return (
    <div ref={panel.anchorRef} className={`relative min-w-0 ${className}`}>
      <PickerTrigger
        icon={Clock}
        label={formatTime(value, use24h)}
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
        <div role="dialog" aria-label={ariaLabel || 'Choose time'}>
          <div className="flex items-baseline justify-between px-3.5 pt-3 pb-2">
            <span className="text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">
              {formatTime(`${pad(current.h)}:${pad(current.m)}`, use24h)}
            </span>
            {!time && <span className="text-[11px] text-gray-400">Not set</span>}
          </div>

          <div className="flex gap-1.5 px-2.5 pb-2.5">
            <Column
              label="Hour"
              items={use24h ? HOURS_24 : HOURS_12}
              selected={time ? (use24h ? current.h : current.h % 12 || 12) : null}
              onSelect={selectHour}
              render={use24h ? (v) => pad(v) : (v) => String(v)}
            />
            <Column label="Min" items={minutes} selected={time ? current.m : null} onSelect={(m) => emit(current.h, m)} />
            {!use24h && (
              <Column
                label="Period"
                items={['AM', 'PM']}
                selected={time ? (isPM ? 'PM' : 'AM') : null}
                onSelect={selectPeriod}
                render={(v) => v}
              />
            )}
          </div>

          <div className="flex items-center gap-1 px-2.5 py-2 border-t border-gray-100">
            <div className="flex-1 min-w-0 flex gap-1 overflow-x-auto [scrollbar-width:none]">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => { onChange?.(preset); panel.close() }}
                  className={`flex-shrink-0 h-7 px-2 rounded-md text-xs tabular-nums transition-colors ${
                    value === preset ? 'bg-[#0B3D26]/10 text-[#0B3D26] font-medium' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {formatTime(preset, use24h)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={panel.close}
              className="flex-shrink-0 h-7 px-2.5 rounded-md text-xs font-semibold text-[#0B3D26] hover:bg-[#0B3D26]/5 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </FloatingPanel>
    </div>
  )
}
