import React, { useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import api from '../../../utils/axios'
import Modal, { ModalBody, ModalFooter, ModalButton } from '../Modal'
import Select from '../SearchableSelect'
import RichEditor from '../RichEditor'
import DatePicker from '../pickers/DatePicker'
import { PRIORITIES, INPUT } from './constants'
import { FieldError, apiError } from './ui'

const TICKET_TYPES = [
  { id: 'task', name: 'Task' },
  { id: 'question', name: 'Question' },
  { id: 'incident', name: 'Incident' },
  { id: 'problem', name: 'Problem' },
]
const TICKET_STATUSES = [
  { id: 'new', name: 'New' },
  { id: 'open', name: 'Open' },
  { id: 'in_progress', name: 'In progress' },
  { id: 'pending', name: 'Pending' },
]
const WORK_ITEM_STATUSES = [
  { id: 'todo', name: 'To do' },
  { id: 'in_progress', name: 'In progress' },
  { id: 'done', name: 'Done' },
  { id: 'cancelled', name: 'Cancelled' },
]
const WORK_ITEM_STATUS_FOR_TASK = {
  in_progress: 'in_progress', review: 'in_progress', done: 'done', cancelled: 'cancelled',
}

const Label = ({ children, required }) => (
  <label className="block text-xs font-medium text-gray-600 mb-1">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
)

/**
 * Convert a task into a new ticket, or into a work item on a ticket.
 * The task is kept and linked to whatever it was converted to.
 */
export default function ConvertTaskModal({ isOpen, onClose, task, users = [], groups = [], initialMode = 'ticket' }) {
  const linkedTicket = task.related_ticket || task.converted_from_ticket || task.converted_to_ticket || null
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({})
  const [ticketChoice, setTicketChoice] = useState(null)
  const [ticketOptions, setTicketOptions] = useState([])
  const [ticketQuery, setTicketQuery] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const searchSeq = useRef(0)

  useEffect(() => {
    if (!isOpen) return
    setMode(initialMode)
    setErrors({})
    setTicketChoice(linkedTicket ? { id: linkedTicket.uuid, name: `${linkedTicket.ticket_number} · ${linkedTicket.title}` } : null)
    setTicketOptions([])
    setTicketQuery('')
    setForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'normal',
      assignee: task.assignee?.id || '',
      requester: task.created_by?.id || '',
      group: task.group?.id || '',
      type: 'task',
      ticketStatus: 'new',
      workItemStatus: WORK_ITEM_STATUS_FOR_TASK[task.status] || 'todo',
      due_date: task.due_date || '',
      complete_task: false,
    })
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const searchTickets = async (query) => {
    if (!query || query.trim().length < 2) {
      setTicketOptions([])
      return
    }
    const seq = ++searchSeq.current
    try {
      const res = await api.get('/tickets/search/', { params: { q: query.trim() } })
      if (seq !== searchSeq.current) return
      setTicketOptions((res.data.tickets || []).map((t) => ({ id: t.uuid, name: `${t.ticket_number} · ${t.title}` })))
    } catch {
      // keep the previous results; the field stays usable
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    const clientErrors = {}
    if (!form.title.trim()) clientErrors.title = 'Title is required.'
    if (mode === 'work_item' && !ticketChoice) clientErrors.ticket_uuid = 'Choose a ticket.'
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors)
      return
    }

    const base = {
      title: form.title.trim(),
      description: form.description,
      priority: form.priority,
      assignee: form.assignee || null,
      complete_task: form.complete_task,
    }
    const payload = mode === 'ticket'
      ? { ...base, requester: form.requester || null, group: form.group || null, type: form.type, status: form.ticketStatus }
      : { ...base, ticket_uuid: ticketChoice.id, status: form.workItemStatus, due_date: form.due_date || null }

    setSaving(true)
    try {
      const path = mode === 'ticket' ? 'convert-to-ticket' : 'convert-to-work-item'
      await api.post(`/tasks/${task.uuid}/${path}/`, payload)
      toast.success(mode === 'ticket' ? 'Task converted to a ticket' : 'Task converted to a work item')
      onClose()
      router.reload({ preserveScroll: true })
    } catch (error) {
      const fieldErrors = error?.response?.data?.errors || {}
      setErrors(fieldErrors)
      toast.error(fieldErrors.task || apiError(error, 'Failed to convert task'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={saving ? () => {} : onClose} title="Convert task" maxWidth="max-w-2xl">
      {isOpen && (
        <form onSubmit={submit}>
          <ModalBody>
            <div className="space-y-4">
              <div className="inline-flex p-0.5 rounded-lg bg-gray-100 text-sm" role="tablist" aria-label="Convert to">
                {[['ticket', 'New ticket'], ['work_item', 'Work item on a ticket']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={mode === id}
                    onClick={() => { setMode(id); setErrors({}) }}
                    className={`px-3 h-8 rounded-md font-medium transition-colors ${mode === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {errors.task && <p className="text-sm text-red-600">{errors.task}</p>}

              {mode === 'work_item' && (
                <div>
                  <Label required>Ticket</Label>
                  {ticketChoice && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-lg border border-gray-200 bg-gray-50 text-sm">
                      <span className="truncate text-gray-900">{ticketChoice.name}</span>
                      <button type="button" onClick={() => setTicketChoice(null)} className="text-xs text-gray-500 hover:text-gray-900">Change</button>
                    </div>
                  )}
                  {!ticketChoice && (
                    <>
                      <input
                        value={ticketQuery}
                        onChange={(e) => { setTicketQuery(e.target.value); searchTickets(e.target.value) }}
                        placeholder="Search tickets by number or title…"
                        className={`${INPUT} ${errors.ticket_uuid ? 'border-red-400' : ''}`}
                      />
                      {ticketOptions.length > 0 && (
                        <ul className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                          {ticketOptions.map((o) => (
                            <li key={o.id}>
                              <button
                                type="button"
                                onClick={() => { setTicketChoice(o); setErrors((er) => ({ ...er, ticket_uuid: undefined })) }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 truncate"
                              >
                                {o.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                  <FieldError error={errors.ticket_uuid} />
                </div>
              )}

              <div>
                <Label required>Title</Label>
                <input
                  value={form.title || ''}
                  onChange={(e) => set('title')(e.target.value)}
                  maxLength={255}
                  className={`${INPUT} ${errors.title ? 'border-red-400' : ''}`}
                />
                <FieldError error={errors.title} />
              </div>

              <div>
                <Label>Description</Label>
                <RichEditor value={form.description || ''} onChange={set('description')} placeholder="Describe the work…" />
                <FieldError error={errors.description} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onChange={set('priority')} options={PRIORITIES} allowClear={false} />
                  <FieldError error={errors.priority} />
                </div>
                <div>
                  <Label>Assignee</Label>
                  <Select value={form.assignee} onChange={set('assignee')} options={users} placeholder="Unassigned" searchable />
                  <FieldError error={errors.assignee} />
                </div>

                {mode === 'ticket' ? (
                  <>
                    <div>
                      <Label>Requester</Label>
                      <Select value={form.requester} onChange={set('requester')} options={users} placeholder="No requester" searchable />
                      <FieldError error={errors.requester} />
                    </div>
                    <div>
                      <Label>Group</Label>
                      <Select value={form.group} onChange={set('group')} options={groups} placeholder="No group" searchable />
                      <FieldError error={errors.group} />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={form.type} onChange={set('type')} options={TICKET_TYPES} allowClear={false} />
                      <FieldError error={errors.type} />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={form.ticketStatus} onChange={set('ticketStatus')} options={TICKET_STATUSES} allowClear={false} />
                      <FieldError error={errors.status} />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Status</Label>
                      <Select value={form.workItemStatus} onChange={set('workItemStatus')} options={WORK_ITEM_STATUSES} allowClear={false} />
                      <FieldError error={errors.status} />
                    </div>
                    <div>
                      <Label>Due date</Label>
                      <DatePicker value={form.due_date} onChange={set('due_date')} allowClear className="w-full" />
                      <FieldError error={errors.due_date} />
                    </div>
                  </>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!form.complete_task}
                  onChange={(e) => set('complete_task')(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Mark this task as done after converting
              </label>
              <p className="text-xs text-gray-500">The task is kept and linked to the {mode === 'ticket' ? 'new ticket' : 'work item'}.</p>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalButton type="button" onClick={onClose} disabled={saving}>Cancel</ModalButton>
            <ModalButton type="submit" variant="primary" loading={saving}>
              {mode === 'ticket' ? 'Create ticket' : 'Create work item'}
            </ModalButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  )
}
