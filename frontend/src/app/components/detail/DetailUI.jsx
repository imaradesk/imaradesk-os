import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import FieldPopover from './FieldPopover'
import { MiniAvatar } from '../tasks/ui'

// Shared building blocks for record detail pages (tasks, tickets).

/** Server timestamps like "2026-10-20 14:05" are UTC; parse them as such. */
export function parseServerDate(value) {
  if (!value) return null
  const iso = value.replace(' ', 'T')
  const date = new Date(/T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(iso) ? `${iso}Z` : iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "2026-10-20 14:05" (UTC) -> "3 hours ago" */
export function timeAgo(value) {
  if (!value) return ''
  const date = parseServerDate(value)
  if (!date) return value
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(-Math.round(seconds / size), unit)
  }
  return 'just now'
}

export function IconButton({ label, onClick, active = false, disabled = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      className={`h-8 min-w-[2rem] px-2 inline-flex items-center justify-center gap-1 rounded-md transition-colors disabled:opacity-50 ${
        active ? 'bg-[#0B3D26]/10 text-[#0B3D26]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

export function ChipButton({ icon: Icon, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 transition-colors"
    >
      <Icon className="w-4 h-4 text-gray-500" />
      {children}
    </button>
  )
}

export function SmallAction({ icon: Icon, onClick, children }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 px-1.5 py-1 rounded hover:bg-gray-100 transition-colors">
      <Icon className="w-3.5 h-3.5" /> {children}
    </button>
  )
}

export function Section({ id, icon: Icon, title, count, action, children }) {
  return (
    <section id={id} className="scroll-mt-16">
      <div className="flex items-center justify-between mb-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Icon className="w-4 h-4 text-gray-400" />
          {title}
          {count > 0 && <span className="px-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-500 tabular-nums">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function DetailRow({ icon: Icon, label, children, stacked = false, action = null }) {
  // Stacked: label on its own line with the value beneath, for narrow side panels
  if (stacked) {
    return (
      <div className="py-1.5">
        <dt className="flex items-center gap-1.5 px-2 pb-0.5 text-xs font-medium text-gray-500">
          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 min-w-0 truncate">{label}</span>
          {action}
        </dt>
        <dd className="min-w-0">{children}</dd>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] items-start gap-2 py-0.5">
      <dt className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-gray-500">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" /> {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

export function TagsField({ tags, onSave, readOnly = false }) {
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)

  const add = () => {
    const tag = input.trim()
    setInput('')
    if (!tag || tags.includes(tag)) { setAdding(false); return }
    onSave([...tags, tag])
  }

  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1">
      {tags.map((tag) => (
        <span key={tag} className="group inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-gray-100 text-xs text-gray-700">
          {tag}
          {!readOnly && (
            <button onClick={() => onSave(tags.filter((t) => t !== tag))} className="rounded text-gray-400 hover:text-gray-700" aria-label={`Remove tag ${tag}`}>
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}
      {readOnly ? (
        tags.length === 0 && <span className="text-sm text-gray-400">None</span>
      ) : adding ? (
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={add}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add() }
            if (e.key === 'Escape') { setInput(''); setAdding(false) }
          }}
          placeholder="Tag name"
          className="w-24 px-1.5 py-0.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20"
        />
      ) : (
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100">
          <Plus className="w-3 h-3" /> {tags.length ? 'Add' : 'Add tag'}
        </button>
      )}
    </div>
  )
}

export function WatchersField({ watchers, users, onSave, readOnly = false }) {
  const ids = watchers.map((w) => w.id)
  const candidates = users.filter((u) => !ids.includes(u.id))
  return (
    <div className="px-2 py-1 space-y-1.5">
      {watchers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {watchers.map((w) => (
            <span key={w.id} className="inline-flex items-center gap-1.5 pl-0.5 pr-1 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700">
              <MiniAvatar user={w} />
              <span className="max-w-[7rem] truncate">{w.name}</span>
              {!readOnly && (
                <button onClick={() => onSave(ids.filter((id) => id !== w.id))} className="text-gray-400 hover:text-gray-700" aria-label={`Remove ${w.name}`}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {readOnly ? (
        watchers.length === 0 && <span className="block py-0.5 text-sm text-gray-400">None</span>
      ) : candidates.length > 0 && (
        <FieldPopover
          label="Watchers"
          description="People notified about updates"
          value={null}
          options={candidates}
          optionIcon={(u) => <MiniAvatar user={u} />}
          searchable
          triggerClassName="px-1.5 py-1 -mx-1.5"
          onPick={(id) => onSave([...ids, id])}
        >
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Plus className="w-3 h-3" /> Add watcher
          </span>
        </FieldPopover>
      )}
    </div>
  )
}

