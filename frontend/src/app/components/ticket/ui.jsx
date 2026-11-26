import React from 'react'
import { AlertTriangle, Clock, PauseCircle } from 'lucide-react'
import {
  GlobalOutlined,
  MailOutlined,
  MessageOutlined,
  SendOutlined,
  SlackOutlined,
  WindowsOutlined,
  ApiOutlined,
} from '@ant-design/icons'

// Shared ticket visuals for the list, the split view and the detail page.

// Mirrors Ticket.computed_status (modules/ticket/models.py); "pending" is shown as On Hold.
export const TICKET_STATUSES = [
  { id: 'new', name: 'New', lozenge: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
  { id: 'open', name: 'Open', lozenge: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { id: 'in_progress', name: 'In Progress', lozenge: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { id: 'pending', name: 'On Hold', lozenge: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  { id: 'resolved', name: 'Resolved', lozenge: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { id: 'closed', name: 'Closed', lozenge: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
]

export const TICKET_STATUS_MAP = Object.fromEntries(TICKET_STATUSES.map((s) => [s.id, s]))

export const TICKET_TYPES = [
  { id: 'question', name: 'Question' },
  { id: 'incident', name: 'Incident' },
  { id: 'problem', name: 'Problem' },
  { id: 'task', name: 'Task' },
]

export const statusLabel = (status) => TICKET_STATUS_MAP[status]?.name || status || 'Unknown'

/** The list API sends display names ("Urgent"), the detail page sends ids ("urgent"). */
export const priorityId = (priority) => (priority || 'normal').toLowerCase()

export const isClosedStatus = (status) => status === 'resolved' || status === 'closed'

/** Small round status glyph (Linear-style). */
export function TicketStatusIcon({ status, className = '' }) {
  const size = `w-3.5 h-3.5 flex-shrink-0 ${className}`
  switch (status) {
    case 'resolved':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-green-600`} aria-hidden="true">
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path d="M4.2 7.2l1.9 1.8 3.7-3.9" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'closed':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-gray-400`} aria-hidden="true">
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path d="M4.2 7.2l1.9 1.8 3.7-3.9" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'pending':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-amber-500`} aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.6 4.8v4.4M8.4 4.8v4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )
    case 'in_progress':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-blue-600`} aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 7 L7 2.5 A4.5 4.5 0 0 1 7 11.5 Z" fill="currentColor" />
        </svg>
      )
    case 'open':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-blue-500`} aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="7" cy="7" r="2" fill="currentColor" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-purple-500`} aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 1.6" />
        </svg>
      )
  }
}

/** `optionIcon` for the shared Select when its options are ticket statuses. */
export const statusOptionIcon = (option) => <TicketStatusIcon status={option.id} />

export function TicketStatusBadge({ status, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${(TICKET_STATUS_MAP[status]?.lozenge || 'bg-gray-100 text-gray-700').replace(/hover:\S+/g, '')}`}>
      <TicketStatusIcon status={status} className="!w-3 !h-3" />
      {label || statusLabel(status)}
    </span>
  )
}

// Map icon name strings (from DB) to actual components
const CHANNEL_ICON_MAP = {
  GlobalOutlined,
  MailOutlined,
  MessageOutlined,
  SendOutlined,
  SlackOutlined,
  WindowsOutlined,
  ApiOutlined,
}

export function ChannelIcon({ channel, className = '', style = {} }) {
  const IconComponent = (channel && CHANNEL_ICON_MAP[channel.icon]) || GlobalOutlined
  return <IconComponent className={className} style={style} />
}

/** Channel glyph + name; falls back to the raw ticket source. */
export function ChannelLabel({ channel, source, showName = true }) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0 text-xs text-gray-500">
      <span
        className="w-5 h-5 flex items-center justify-center rounded-md text-[11px] flex-shrink-0 bg-gray-100 text-gray-500"
        style={channel ? { backgroundColor: channel.icon_bg || undefined, color: channel.icon_color || undefined } : undefined}
      >
        <ChannelIcon channel={channel} />
      </span>
      {showName && <span className="truncate capitalize">{channel?.name || (source || 'web').replace('_', ' ')}</span>}
    </span>
  )
}

export function formatSlaTime(hours) {
  if (hours === null || hours === undefined) return null
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`
  if (hours < 24) {
    const h = Math.floor(hours)
    const m = Math.round((hours % 1) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  const days = Math.floor(hours / 24)
  const rest = Math.round(hours % 24)
  return rest > 0 ? `${days}d ${rest}h` : `${days}d`
}

/** Overall SLA state of a ticket: 'breached' | 'at_risk' | 'on_hold' | 'on_track' | null. */
export function slaState(slaInfo) {
  if (!slaInfo) return null
  if (slaInfo.is_on_hold) return 'on_hold'
  // Response times stay "past due" after a reply, so only resolution decides a breach (as overall_status does).
  if (slaInfo.overall_status === 'breached') return 'breached'
  if (slaInfo.overall_status === 'at_risk') return 'at_risk'
  return 'on_track'
}

/** Compact SLA chip: time left, overdue or on hold. */
export function SlaBadge({ slaInfo, className = '' }) {
  const state = slaState(slaInfo)
  if (!state) return null
  const base = `inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap tabular-nums ${className}`

  if (state === 'on_hold') {
    return <span className={`${base} bg-gray-100 text-gray-600`} title="SLA on hold"><PauseCircle className="w-3 h-3" />Hold</span>
  }
  if (state === 'breached') {
    const overdue = slaInfo.resolution?.hours_overdue
    return (
      <span className={`${base} bg-red-100 text-red-700`} title={overdue ? `SLA overdue by ${formatSlaTime(overdue)}` : 'SLA breached'}>
        <AlertTriangle className="w-3 h-3" />{overdue ? formatSlaTime(overdue) : 'Breached'}
      </span>
    )
  }
  const left = slaInfo.resolution?.hours_remaining ?? slaInfo.response?.hours_remaining
  if (left === null || left === undefined) return null
  return (
    <span className={`${base} ${state === 'at_risk' ? 'bg-amber-100 text-amber-700' : 'bg-green-50 text-green-700'}`} title={`${formatSlaTime(left)} left on SLA`}>
      <Clock className="w-3 h-3" />{formatSlaTime(left)}
    </span>
  )
}

/** Left accent colour for rows whose SLA needs attention. */
export function slaAccent(slaInfo) {
  const state = slaState(slaInfo)
  if (state === 'breached') return 'border-l-red-500'
  if (state === 'at_risk') return 'border-l-amber-500'
  return 'border-l-transparent'
}

// Lifecycle shown on the status stepper (same order as the original arrow stepper).
const STAGES = ['new', 'open', 'in_progress', 'pending', 'resolved', 'closed']

// Chevron segment: notched on the left, pointed on the right (first/last keep a flat, rounded edge).
const ARROW = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)'
const ARROW_FIRST = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
const ARROW_LAST = 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)'

/** Arrow-style status stepper: where the ticket is in its lifecycle. */
export function StatusTrack({ status, compact = false }) {
  const current = Math.max(0, STAGES.indexOf(status))
  return (
    <ol className="flex w-full" aria-label="Ticket status">
      {STAGES.map((stage, i) => {
        const isActive = i === current
        const isPast = i < current
        const isFirst = i === 0
        const isLast = i === STAGES.length - 1
        return (
          <li
            key={stage}
            aria-current={isActive ? 'step' : undefined}
            className={`flex-1 min-w-0 flex items-center justify-center font-medium whitespace-nowrap transition-colors ${
              compact ? 'h-7 text-[11px] px-3' : 'h-9 text-xs sm:text-sm px-4'
            } ${
              isActive
                ? 'bg-[#0B3D26] text-white relative z-10'
                : isPast
                  ? 'bg-gray-200 text-gray-600'
                  : 'bg-gray-100 text-gray-500'
            } ${isFirst ? 'rounded-l-md' : ''} ${isLast ? 'rounded-r-md' : ''}`}
            style={{
              clipPath: isFirst ? ARROW_FIRST : isLast ? ARROW_LAST : ARROW,
              marginLeft: isFirst ? 0 : -8,
            }}
          >
            <span className="truncate">{statusLabel(stage)}</span>
          </li>
        )
      })}
    </ol>
  )
}
