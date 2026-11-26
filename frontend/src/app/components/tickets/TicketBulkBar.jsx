import React, { useEffect, useMemo, useState } from 'react'
import { router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import {
  X, UserPlus, Users, Tag, Flag, Shapes, MoreHorizontal, FileText, CheckCircle2, Eye, Copy, Merge, Trash2,
  Search, Check, ChevronLeft, ChevronRight, AlertTriangle, HelpCircle, AlertOctagon, Wrench, ClipboardList,
} from 'lucide-react'
import { Popover } from '../../../components/Popover'
import api from '../../../utils/axios'
import { TicketStatusIcon } from '../ticket/ui'
import { PriorityIcon, MiniAvatar, Spinner, apiError } from '../tasks/ui'

// Bulk endpoints accept these statuses (closing happens per ticket).
const STATUS_OPTIONS = ['new', 'open', 'in_progress', 'pending', 'resolved'].map((id) => ({
  id,
  label: { new: 'New', open: 'Open', in_progress: 'In Progress', pending: 'On Hold', resolved: 'Resolved' }[id],
  icon: (props) => <TicketStatusIcon status={id} {...props} />,
}))

const PRIORITY_OPTIONS = [
  { id: 'urgent', label: 'Urgent', description: 'Needs immediate attention' },
  { id: 'high', label: 'High', description: 'Important issues' },
  { id: 'normal', label: 'Normal', description: 'Standard priority' },
  { id: 'low', label: 'Low', description: 'Non-urgent issues' },
].map((p) => ({ ...p, icon: () => <PriorityIcon priority={p.id} /> }))

const TYPE_OPTIONS = [
  { id: 'question', label: 'Question', icon: HelpCircle, description: 'General inquiry' },
  { id: 'incident', label: 'Incident', icon: AlertOctagon, description: 'Something is broken' },
  { id: 'problem', label: 'Problem', icon: Wrench, description: 'Root cause of incidents' },
  { id: 'task', label: 'Task', icon: ClipboardList, description: 'Work to be done' },
]

const POPOVER_WIDTH = 280
const plural = (n) => `${n} ticket${n === 1 ? '' : 's'}`

/**
 * Floating action bar for selected tickets. Every action opens in the shared
 * Popover above its button and applies on pick.
 */
export default function TicketBulkBar({ selectedTickets, tickets, currentView, onClear }) {
  const count = selectedTickets.length
  const selected = useMemo(
    () => selectedTickets.map((uuid) => tickets.find((t) => t.uuid === uuid) || { uuid, ticket_number: uuid.slice(0, 8), subject: '' }),
    [selectedTickets, tickets],
  )
  // Field edits are not allowed on resolved/closed tickets
  const hasClosed = selected.some((t) => t.computed_status === 'closed' || t.computed_status === 'resolved')
  const lockedTitle = hasClosed ? 'Not available for resolved or closed tickets' : undefined

  const done = (message) => {
    toast.success(message)
    onClear()
    router.reload({ preserveScroll: true })
  }

  /** POST a bulk endpoint for the selection; returns true when it worked. */
  const run = async (endpoint, payload, message) => {
    try {
      const res = await api.post(endpoint, { ticket_ids: selectedTickets, ...payload })
      done(res.data?.message || message)
      return true
    } catch (error) {
      toast.error(apiError(error, 'Something went wrong'))
      return false
    }
  }

  if (count === 0) return null

  return (
    // No transform on the wrapper: the popovers are position: fixed
    <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 pointer-events-none animate-fadeIn">
      <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-xl border border-gray-200 bg-white shadow-lg max-w-full">
        <span className="pl-2 pr-1 text-sm text-gray-700 whitespace-nowrap">
          <span className="font-semibold tabular-nums">{count}</span> selected
        </span>
        <button onClick={onClear} className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100" aria-label="Clear selection" title="Clear selection">
          <X className="w-4 h-4" />
        </button>
        <span className="w-px h-5 bg-gray-200 mx-1" />

        <BulkPopover icon={UserPlus} label="Assign" disabled={hasClosed} title={lockedTitle}>
          {({ close }) => (
            <RemoteOptions
              heading={`Assign ${plural(count)}`}
              url="/tickets/agents/"
              dataKey="agents"
              placeholder="Search agents…"
              empty="No agents found"
              toOption={(a) => ({ id: a.id, label: a.name, description: a.email, icon: () => <MiniAvatar user={a} size="w-6 h-6 text-[10px]" /> })}
              onPick={(agent) => run('/tickets/bulk/assign-agent/', { agent_id: agent.id }, `Assigned to ${agent.label}`).then((ok) => ok && close())}
            />
          )}
        </BulkPopover>

        <BulkPopover icon={Tag} label="Status" disabled={hasClosed} title={lockedTitle}>
          {({ close }) => (
            <OptionList
              heading={`Set status for ${plural(count)}`}
              options={STATUS_OPTIONS}
              onPick={(s) => run('/tickets/bulk/change-status/', { status: s.id }, `Moved to ${s.label}`).then((ok) => ok && close())}
            />
          )}
        </BulkPopover>

        <BulkPopover icon={Flag} label="Priority" disabled={hasClosed} title={lockedTitle} className="hidden sm:inline-block">
          {({ close }) => (
            <OptionList
              heading={`Set priority for ${plural(count)}`}
              options={PRIORITY_OPTIONS}
              onPick={(p) => run('/tickets/bulk/change-priority/', { priority: p.id }, `Priority set to ${p.label}`).then((ok) => ok && close())}
            />
          )}
        </BulkPopover>

        <BulkPopover icon={MoreHorizontal} label="More">
          {({ close, open }) => (
            <MoreMenu
              open={open}
              close={close}
              count={count}
              selected={selected}
              hasClosed={hasClosed}
              currentView={currentView}
              run={run}
              done={done}
            />
          )}
        </BulkPopover>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Building blocks
// ─────────────────────────────────────────────

function BulkPopover({ icon: Icon, label, disabled = false, title, className = '', children }) {
  return (
    <Popover
      width={POPOVER_WIDTH}
      maxHeight={380}
      strategy="fixed"
      className={className}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          title={title || label}
          aria-expanded={open}
          className={`h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            open ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      )}
    >
      {/* Mount content only while open so pickers reset each time */}
      {({ close, open }) => open && children({ close, open })}
    </Popover>
  )
}

function Heading({ children, onBack }) {
  return (
    <div className="flex items-center gap-1.5 px-3 h-10 border-b border-gray-100">
      {onBack && (
        <button onClick={onBack} className="-ml-1 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100" aria-label="Back">
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 truncate">{children}</p>
    </div>
  )
}

/** Pick-one list; applies immediately and shows a spinner on the picked row. */
function OptionList({ heading, options, onPick, onBack, searchable = false, placeholder = 'Search…', empty = 'Nothing found', loading = false }) {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(null)
  const shown = searchable && query
    ? options.filter((o) => `${o.label} ${o.description || ''}`.toLowerCase().includes(query.toLowerCase()))
    : options

  const pick = async (option) => {
    if (busy) return
    setBusy(option.id)
    await onPick(option)
    setBusy(null)
  }

  return (
    <div>
      <Heading onBack={onBack}>{heading}</Heading>
      {searchable && (
        <div className="p-2 border-b border-gray-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full h-8 pl-8 pr-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
            />
          </div>
        </div>
      )}
      <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
        {loading ? (
          <li className="py-6 flex justify-center"><Spinner className="w-4 h-4 text-gray-400" /></li>
        ) : shown.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-gray-400">{empty}</li>
        ) : shown.map((o) => {
          const Icon = o.icon
          return (
            <li key={o.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => pick(o)}
                disabled={!!busy}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 disabled:cursor-wait transition-colors"
              >
                {Icon && <span className="w-6 flex justify-center flex-shrink-0"><Icon className="w-4 h-4 text-gray-500" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-gray-900 truncate">{o.label}</span>
                  {o.description && <span className="block text-xs text-gray-500 truncate">{o.description}</span>}
                </span>
                {busy === o.id && <Spinner className="w-3.5 h-3.5 text-[#0B3D26]" />}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** OptionList fed from a JSON endpoint (agents, teams). */
function RemoteOptions({ url, dataKey, toOption, ...props }) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    api.get(url)
      .then((res) => alive && setOptions((res.data[dataKey] || []).map(toOption)))
      .catch(() => alive && toast.error('Could not load the list'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [url])

  return <OptionList {...props} options={options} loading={loading} searchable />
}

function MenuItem({ icon: Icon, label, hint, onClick, disabled, danger, chevron, busy }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      title={hint}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {busy ? <Spinner className="w-3.5 h-3.5" /> : chevron && <ChevronRight className="w-4 h-4 text-gray-400" />}
    </button>
  )
}

function MoreMenu({ open, close, count, selected, hasClosed, currentView, run, done }) {
  const [view, setView] = useState('menu')
  const [busy, setBusy] = useState(null)
  useEffect(() => { if (open) setView('menu') }, [open])
  const back = () => setView('menu')
  const lockedHint = hasClosed ? 'Not available for resolved or closed tickets' : undefined

  const simple = async (key, endpoint, message) => {
    setBusy(key)
    const ok = await run(endpoint, {}, message)
    setBusy(null)
    if (ok) close()
  }

  const duplicate = async () => {
    setBusy('duplicate')
    try {
      const res = await api.post(`/tickets/${selected[0].uuid}/duplicate/`)
      close()
      router.visit(`/tickets/${res.data.new_ticket_uuid}/`)
    } catch (error) {
      toast.error(apiError(error, 'Failed to duplicate ticket'))
    } finally {
      setBusy(null)
    }
  }

  if (view === 'team') {
    return (
      <RemoteOptions
        heading={`Assign ${plural(count)} to a team`}
        onBack={back}
        url="/tickets/teams/"
        dataKey="teams"
        placeholder="Search teams…"
        empty="No teams found"
        toOption={(t) => ({ id: t.id, label: t.name, description: t.description, icon: Users })}
        onPick={(team) => run('/tickets/bulk/assign-team/', { team_id: team.id }, `Assigned to ${team.label}`).then((ok) => ok && close())}
      />
    )
  }
  if (view === 'priority') {
    return (
      <OptionList
        heading={`Set priority for ${plural(count)}`}
        onBack={back}
        options={PRIORITY_OPTIONS}
        onPick={(p) => run('/tickets/bulk/change-priority/', { priority: p.id }, `Priority set to ${p.label}`).then((ok) => ok && close())}
      />
    )
  }
  if (view === 'type') {
    return (
      <OptionList
        heading={`Set type for ${plural(count)}`}
        onBack={back}
        options={TYPE_OPTIONS}
        onPick={(t) => run('/tickets/bulk/change-type/', { type: t.id }, `Type set to ${t.label}`).then((ok) => ok && close())}
      />
    )
  }
  if (view === 'merge') return <MergeView selected={selected} onBack={back} close={close} done={done} />
  if (view === 'delete') return <DeleteView count={count} onBack={back} close={close} run={run} />

  return (
    <div className="py-1">
      <MenuItem icon={Users} label="Assign to team" chevron disabled={hasClosed} hint={lockedHint} onClick={() => setView('team')} />
      <div className="sm:hidden"><MenuItem icon={Flag} label="Change priority" chevron disabled={hasClosed} hint={lockedHint} onClick={() => setView('priority')} /></div>
      <MenuItem icon={Shapes} label="Change type" chevron disabled={hasClosed} hint={lockedHint} onClick={() => setView('type')} />
      <MenuItem icon={FileText} label="Mark as draft" busy={busy === 'draft'} onClick={() => simple('draft', '/tickets/bulk/mark-draft/', 'Moved to drafts')} />
      {currentView === 'drafts' && (
        <MenuItem icon={CheckCircle2} label="Remove from drafts" busy={busy === 'undraft'} onClick={() => simple('undraft', '/tickets/bulk/remove-draft/', 'Removed from drafts')} />
      )}
      {count === 1 && (
        <>
          <div className="my-1 border-t border-gray-100" />
          <MenuItem icon={Eye} label="Open ticket" onClick={() => { close(); router.visit(`/tickets/${selected[0].uuid}/`) }} />
          <MenuItem icon={Copy} label="Duplicate ticket" busy={busy === 'duplicate'} onClick={duplicate} />
        </>
      )}
      {count >= 2 && (
        <>
          <div className="my-1 border-t border-gray-100" />
          <MenuItem icon={Merge} label={`Merge ${count} tickets`} chevron onClick={() => setView('merge')} />
        </>
      )}
      <div className="my-1 border-t border-gray-100" />
      <MenuItem icon={Trash2} label={`Delete ${plural(count)}`} danger chevron onClick={() => setView('delete')} />
    </div>
  )
}

function MergeView({ selected, onBack, close, done }) {
  const [primary, setPrimary] = useState(selected[0]?.uuid)
  const [submitting, setSubmitting] = useState(false)
  const target = selected.find((t) => t.uuid === primary)

  const merge = async () => {
    setSubmitting(true)
    try {
      // Merge each other ticket into the primary one
      for (const t of selected.filter((x) => x.uuid !== primary)) {
        await api.post(`/tickets/${t.uuid}/merge/`, { target_ticket_uuid: primary })
      }
      close()
      done(`${selected.length - 1} ticket${selected.length - 1 === 1 ? '' : 's'} merged into ${target?.ticket_number}`)
    } catch (error) {
      toast.error(apiError(error, 'Failed to merge tickets'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Heading onBack={onBack}>Keep which ticket?</Heading>
      <ul className="max-h-56 overflow-y-auto py-1" role="radiogroup" aria-label="Primary ticket">
        {selected.map((t) => (
          <li key={t.uuid}>
            <button
              type="button"
              role="radio"
              aria-checked={primary === t.uuid}
              onClick={() => setPrimary(t.uuid)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${primary === t.uuid ? 'bg-[#0B3D26]/5' : 'hover:bg-gray-50'}`}
            >
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${primary === t.uuid ? 'border-[#0B3D26] bg-[#0B3D26]' : 'border-gray-300'}`}>
                {primary === t.uuid && <Check className="w-3 h-3 text-white" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-gray-500 tabular-nums">{t.ticket_number}</span>
                <span className="block text-sm text-gray-900 truncate">{t.subject || 'No subject'}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="p-3 border-t border-gray-100 space-y-2">
        <p className="text-xs text-gray-500">The others are merged into it; their comments and attachments are copied over.</p>
        <button
          onClick={merge}
          disabled={!primary || submitting}
          className="w-full h-8 inline-flex items-center justify-center gap-1.5 rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-medium disabled:opacity-50"
        >
          {submitting && <Spinner className="w-3.5 h-3.5" />} Merge into {target?.ticket_number}
        </button>
      </div>
    </div>
  )
}

function DeleteView({ count, onBack, close, run }) {
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const ready = confirmText === 'DELETE'

  const remove = async () => {
    if (!ready) return
    setSubmitting(true)
    const ok = await run('/tickets/bulk/delete/', {}, `${plural(count)} deleted`)
    setSubmitting(false)
    if (ok) close()
  }

  return (
    <div>
      <Heading onBack={onBack}>Delete {plural(count)}</Heading>
      <div className="p-3 space-y-3">
        <p className="flex gap-2 text-xs text-red-700 rounded-md bg-red-50 border border-red-200 p-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          This can't be undone. Comments, attachments and history are deleted too.
        </p>
        <div>
          <label htmlFor="bulk-delete-confirm" className="block text-xs text-gray-600 mb-1">
            Type <span className="font-semibold">DELETE</span> to confirm
          </label>
          <input
            id="bulk-delete-confirm"
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && remove()}
            placeholder="DELETE"
            className="w-full h-8 px-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>
        <button
          onClick={remove}
          disabled={!ready || submitting}
          className="w-full h-8 inline-flex items-center justify-center gap-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50"
        >
          {submitting && <Spinner className="w-3.5 h-3.5" />} Delete {plural(count)}
        </button>
      </div>
    </div>
  )
}
