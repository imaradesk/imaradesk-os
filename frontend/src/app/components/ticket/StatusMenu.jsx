import React from 'react'
import { ChevronDown, PlayCircle, RotateCcw } from 'lucide-react'
import DropdownMenu from '../DropdownMenu'
import { TICKET_STATUSES, TICKET_STATUS_MAP, TicketStatusIcon, statusLabel, isClosedStatus } from './ui'

/** Statuses a ticket can move to from `status`; "resume" and reopen entries carry their own icon. */
export function statusMenuOptions(status) {
  if (status === 'pending' || status === 'hold') return [{ id: 'resume', name: 'Resume', icon: PlayCircle }]
  if (isClosedStatus(status)) {
    return [
      { id: 'in_progress', name: 'Reopen as In Progress', icon: RotateCcw },
      { id: 'open', name: 'Reopen as Open', icon: RotateCcw },
    ]
  }
  return TICKET_STATUSES.filter((s) => s.id !== 'closed' && s.id !== status)
}

/** Status lozenge that opens a "Move to" menu with a status icon on every option. */
export default function StatusMenu({ status, onPick, options = statusMenuOptions(status), compact = false, disabled = false }) {
  const lozenge = TICKET_STATUS_MAP[status]?.lozenge || TICKET_STATUS_MAP.new.lozenge
  return (
    <DropdownMenu
      align="left"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-expanded={open}
          title={disabled ? undefined : 'Change status'}
          className={`inline-flex items-center rounded-md font-semibold uppercase tracking-wide transition-colors disabled:cursor-default ${lozenge} ${
            compact ? 'h-7 px-2.5 gap-1.5 text-xs' : 'h-9 px-3 gap-2 text-sm'
          }`}
        >
          <TicketStatusIcon status={status} />
          {statusLabel(status)}
          {!disabled && <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />}
        </button>
      )}
      items={[
        { type: 'header', label: 'Move to' },
        ...options.map((o) => ({
          label: o.name,
          icon: o.icon || ((iconProps) => <TicketStatusIcon status={o.id} {...iconProps} />),
          onClick: () => onPick(o.id),
        })),
      ]}
    />
  )
}
