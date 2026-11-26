import React from 'react'
import { Link } from '@inertiajs/react'
import { GitBranch, Plus, ClipboardList, CalendarDays, Clock, Check, CheckCircle2, Pencil, User } from 'lucide-react'
import Button from '../../../components/Button'

const STATUS = {
  todo: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
  in_progress: { dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
  done: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  cancelled: { dot: 'bg-gray-400', pill: 'bg-gray-100 text-gray-600 ring-gray-200' },
}

// Left accent bar + priority chip
const PRIORITY = {
  urgent: { bar: 'bg-red-500', pill: 'bg-red-50 text-red-700 ring-red-200' },
  high: { bar: 'bg-orange-500', pill: 'bg-orange-50 text-orange-700 ring-orange-200' },
  normal: { bar: 'bg-[#0B3D26]/60', pill: 'bg-gray-50 text-gray-600 ring-gray-200' },
  low: { bar: 'bg-gray-300', pill: 'bg-gray-50 text-gray-500 ring-gray-200' },
}

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

function isOverdue(item) {
  if (!item.due_date || item.status === 'done' || item.status === 'cancelled') return false
  const d = new Date(item.due_date)
  return !Number.isNaN(d.getTime()) && d < new Date(new Date().toDateString())
}

function Meta({ icon: Icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${className || 'text-gray-500'}`}>
      <Icon size={13} className="shrink-0" /> {children}
    </span>
  )
}

function WorkItemCard({ item, onEdit, onComplete }) {
  const status = STATUS[item.status] || STATUS.todo
  const priority = PRIORITY[item.priority] || PRIORITY.normal
  const done = item.status === 'done'
  const overdue = isOverdue(item)

  return (
    <article className="group relative flex bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition-all">
      <span className={`w-1 shrink-0 ${priority.bar}`} aria-hidden="true" />

      <div className="flex-1 min-w-0 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full ring-1 ring-inset ${status.pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {item.status_display || item.status}
              </span>
              <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ring-1 ring-inset capitalize ${priority.pill}`}>
                {item.priority_display || item.priority}
              </span>
            </div>
            <h4 className={`text-sm font-semibold leading-snug ${done ? 'text-gray-500 line-through decoration-gray-300' : 'text-gray-900'}`}>
              {item.title}
            </h4>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button" onClick={() => onEdit(item)} title="Edit work item" aria-label="Edit work item"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Pencil size={14} />
            </button>
            {!done && (
              <button
                type="button" onClick={() => onComplete(item)}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#0B3D26] text-white hover:bg-[#0a2d31] transition-colors"
              >
                <Check size={13} /> Complete
              </button>
            )}
          </div>
        </div>

        {item.description && (
          <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">{item.description}</p>
        )}

        {item.work_notes && (
          <div className="mt-3 flex gap-2 rounded-lg bg-emerald-50/70 border border-emerald-100 px-3 py-2">
            <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Completion notes</p>
              <p className="text-sm text-emerald-900/80 whitespace-pre-wrap">{item.work_notes}</p>
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-2">
          {item.assignee ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
              <span className="w-5 h-5 rounded-full bg-[#0B3D26]/10 text-[#0B3D26] text-[9px] font-semibold flex items-center justify-center">
                {initials(item.assignee.name)}
              </span>
              {item.assignee.name}
            </span>
          ) : (
            <Meta icon={User} className="text-gray-400 italic">Unassigned</Meta>
          )}
          {item.due_date && (
            <Meta icon={CalendarDays} className={overdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
              {overdue ? 'Overdue · ' : 'Due '}{item.due_date}
            </Meta>
          )}
          {item.created_at && <Meta icon={Clock}>Created {item.created_at}</Meta>}
          {item.source_task && (
            <Link href={`/tasks/${item.source_task.uuid}/`} title={item.source_task.title} className="inline-flex items-center gap-1.5 text-xs text-[#0B3D26] hover:underline">
              <GitBranch size={13} className="shrink-0" /> From TASK-{item.source_task.id}
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

export default function WorkItemsTab({
  workItems = [],
  onAddWorkItem,
  onEditWorkItem,
  onCompleteWorkItem
}) {
  if (workItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-10">
        <div className="w-14 h-14 rounded-2xl bg-[#0B3D26]/5 text-[#0B3D26] flex items-center justify-center mb-3">
          <ClipboardList size={26} />
        </div>
        <p className="text-sm font-medium text-gray-800">No work items yet</p>
        <p className="text-xs text-gray-500 mt-1 mb-5 max-w-xs">Break this ticket into smaller tasks and assign them to your team.</p>
        <Button variant="primary" size="md" onClick={onAddWorkItem}>
          <Plus size={16} className="mr-1" />
          Add your first work item
        </Button>
      </div>
    )
  }

  const doneCount = workItems.filter(i => i.status === 'done').length
  const pct = Math.round((doneCount / workItems.length) * 100)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 max-w-xs">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-gray-700">{doneCount} of {workItems.length} complete</span>
            <span className="text-gray-400">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-[#0B3D26] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={onAddWorkItem}>
          <Plus size={14} className="mr-1" />
          Add Work Item
        </Button>
      </div>

      <div className="space-y-3">
        {workItems.map((item) => (
          <WorkItemCard key={item.id} item={item} onEdit={onEditWorkItem} onComplete={onCompleteWorkItem} />
        ))}
      </div>
    </div>
  )
}
