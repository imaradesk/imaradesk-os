import React from 'react'
import { CalendarDays, AlertCircle } from 'lucide-react'
import { TASK_STATUS_MAP, PRIORITY_MAP, PROJECT_STATUS_MAP } from './constants'
import { TYPE_ICONS, TYPE_COLORS } from './taskTypes'

/** Small round status glyph for tasks (Linear-style), driven by existing statuses. */
export function TaskStatusIcon({ status, className = '' }) {
  const size = `w-3.5 h-3.5 flex-shrink-0 ${className}`
  switch (status) {
    case 'done':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-green-600`} aria-hidden="true">
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path d="M4.2 7.2l1.9 1.8 3.7-3.9" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'cancelled':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-gray-400`} aria-hidden="true">
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path d="M5 5l4 4M9 5l-4 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )
    case 'review':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-purple-600`} aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 7 L7 2.5 A4.5 4.5 0 1 1 2.5 7 Z" fill="currentColor" />
        </svg>
      )
    case 'in_progress':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-blue-600`} aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 7 L7 2.5 A4.5 4.5 0 0 1 7 11.5 Z" fill="currentColor" />
        </svg>
      )
    case 'draft':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-amber-600`} aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-gray-400`} aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
  }
}

export function taskStatusLabel(status) {
  return TASK_STATUS_MAP[status]?.name || (status === 'draft' ? 'Draft' : status)
}

/** Signal-bar priority indicator. */
export function PriorityIcon({ priority, showLabel = false }) {
  const p = PRIORITY_MAP[priority] || PRIORITY_MAP.normal
  if (priority === 'urgent') {
    return (
      <span className="inline-flex items-center gap-1.5" title="Urgent priority">
        <span className="w-3.5 h-3.5 rounded-[3px] bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center">!</span>
        {showLabel && <span className="text-xs text-gray-700">{p.name}</span>}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5" title={`${p.name} priority`}>
      <span className="inline-flex items-end gap-[2px] h-3.5" aria-hidden="true">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={`w-[3px] rounded-sm ${bar <= p.bars ? (priority === 'high' ? 'bg-orange-500' : 'bg-gray-500') : 'bg-gray-200'}`}
            style={{ height: `${bar * 4 + 2}px` }}
          />
        ))}
      </span>
      {showLabel && <span className="text-xs text-gray-700">{p.name}</span>}
    </span>
  )
}

/** Coloured tile with the glyph for a task type ({ name, icon, color } from the server). The one place types are drawn. */
export function TaskTypeIcon({ type, showLabel = false, size = 'sm' }) {
  if (!type) return null
  const Icon = TYPE_ICONS[type.icon] || TYPE_ICONS['check-square']
  const box = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  const glyph = size === 'md' ? 13 : 11
  return (
    <span className="inline-flex items-center gap-1.5 flex-shrink-0" title={type.name}>
      <span className={`${box} rounded-[4px] ${TYPE_COLORS[type.color] || TYPE_COLORS.blue} text-white flex items-center justify-center`} aria-hidden="true">
        <Icon size={glyph} strokeWidth={2.5} />
      </span>
      {showLabel && <span className="text-xs text-gray-700">{type.name}</span>}
    </span>
  )
}

/** `optionIcon` for the shared Select when its options are task types. */
export const taskTypeOptionIcon = (option) => <TaskTypeIcon type={option} />

/** `optionIcon` for the shared Select when its options are priorities. */
export const priorityOptionIcon = (option) => <PriorityIcon priority={option.id} />

export function ProjectStatusBadge({ status, label }) {
  const s = PROJECT_STATUS_MAP[status] || PROJECT_STATUS_MAP.planned
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {label || s.name}
    </span>
  )
}

export function ProjectStatusDot({ status, className = '' }) {
  const s = PROJECT_STATUS_MAP[status] || PROJECT_STATUS_MAP.planned
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot} ${className}`} aria-hidden="true" />
}

/** Progress is always computed server-side from task states. */
export function ProgressBar({ value = 0, className = '', showLabel = true }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-[#0B3D26]'}`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-xs tabular-nums text-gray-500 w-9 text-right">{pct}%</span>}
    </div>
  )
}

const AVATAR_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500']

export function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase()
}

export function MiniAvatar({ user, size = 'w-5 h-5 text-[10px]' }) {
  if (!user) {
    return (
      <span className={`${size} rounded-full border border-dashed border-gray-300 inline-flex items-center justify-center text-gray-400`} title="Unassigned" />
    )
  }
  const color = AVATAR_COLORS[(user.name || '?').charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <span className={`${size} ${color} rounded-full inline-flex items-center justify-center text-white font-semibold flex-shrink-0`} title={user.name}>
      {initials(user.name)}
    </span>
  )
}

export function formatDate(value, opts = { month: 'short', day: 'numeric' }) {
  if (!value) return ''
  // Parse YYYY-MM-DD as a local date, not UTC.
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(undefined, sameYear ? opts : { ...opts, year: 'numeric' })
}

export function DueDate({ date, overdue = false, className = '' }) {
  if (!date) return <span className={`text-xs text-gray-400 ${className}`}>—</span>
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'} ${className}`}>
      {overdue ? <AlertCircle className="w-3.5 h-3.5" /> : <CalendarDays className="w-3.5 h-3.5" />}
      {formatDate(date)}
    </span>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {Icon && (
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function FieldError({ error }) {
  if (!error) return null
  return <p className="mt-1 text-xs text-red-600">{error}</p>
}

export function Spinner({ className = 'w-4 h-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

/** Compact pagination driven by the backend pagination meta. */
export function Pager({ pagination, onPage }) {
  if (!pagination || pagination.total_pages <= 1) return null
  const { current_page: page, total_pages: pages, total_count: total, per_page: perPage } = pagination
  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)
  const btn = 'h-7 px-2.5 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 text-xs text-gray-500">
      <span className="tabular-nums">{from}–{to} of {total}</span>
      <div className="flex items-center gap-1.5">
        <button className={btn} disabled={!pagination.has_previous} onClick={() => onPage(page - 1)}>Previous</button>
        <span className="tabular-nums px-1">{page} / {pages}</span>
        <button className={btn} disabled={!pagination.has_next} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  )
}

/** Read a JSON error from an axios failure. */
export function apiError(error, fallback = 'Something went wrong') {
  return error?.response?.data?.error || error?.message || fallback
}
