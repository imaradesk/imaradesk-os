import React, { useEffect, useState } from 'react'
import { Head, useForm, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import {
  Inbox, ChevronRight, Paperclip, FileText, X, AlertTriangle, UserCircle2, Users, CircleDot, Shapes, Tag, Eye, Radio, Mail,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import FieldPopover from '../components/detail/FieldPopover'
import RichEditor from '../components/RichEditor'
import Select from '../components/SearchableSelect'
import { csrfFetch } from '../../utils/csrf'
import { PRIORITIES, INPUT } from '../components/tasks/constants'
import { PriorityIcon, priorityOptionIcon, MiniAvatar, Spinner } from '../components/tasks/ui'
import {
  TICKET_TYPES, TICKET_STATUSES, TicketStatusIcon, ChannelLabel, statusOptionIcon,
} from '../components/ticket/ui'
import { DetailRow, TagsField, WatchersField } from '../components/detail/DetailUI'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'

const REQUESTER_MODES = [
  ['me', 'Me'],
  ['user', 'A user'],
  ['guest', 'A guest'],
]

// New tickets can't start closed
const CREATE_STATUSES = TICKET_STATUSES.filter((s) => s.id !== 'closed')

// Full-width select-style triggers in the Details panel
const TRIGGER = 'w-full'

// Option ids from the server may be numbers while form values are strings
const findById = (list, id) => (id === '' || id == null ? null : list.find((o) => String(o.id) === String(id)) || null)
const findName = (list, id) => findById(list, id)?.name || id

const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`)

export default function AddTicket({ users = [], departments = [], groups = [], channels = [], currentUser = null, webChannelActive = true }) {
  // Get the default 'web' channel from database
  const defaultChannel = channels.find(c => c.channel_id === 'web') || channels[0]
  
  const { data, setData, post, processing, errors } = useForm({
    title: '',
    description: '',
    requester: currentUser?.id || '',
    assignee: '',
    type: 'question',
    priority: 'normal',
    group: '',
    status: 'new',
    channel: defaultChannel?.channel_id || 'web',
    tags: '[]',
    watchers: '[]',
    is_guest_ticket: false,
    guest_name: '',
    guest_email: '',
    guest_phone: '',
  })

  const [selectedTags, setSelectedTags] = useState([])
  const [selectedWatchers, setSelectedWatchers] = useState([])
  const [attachedFiles, setAttachedFiles] = useState([])
  const [requestOnBehalf, setRequestOnBehalf] = useState(false)
  const [isGuestTicket, setIsGuestTicket] = useState(false)
  const [initialData] = useState(data)

  const dirty = JSON.stringify(data) !== JSON.stringify(initialData) || attachedFiles.length > 0
  useUnsavedChanges(dirty)

  const assignee = findById(users, data.assignee)
  const group = findById(groups, data.group)
  const requester = findById(users, data.requester)


  // Set requester to current user by default when not requesting on behalf
  useEffect(() => {
    if (currentUser && !requestOnBehalf) {
      setData('requester', currentUser.id)
    }
  }, [currentUser])

  useEffect(() => {
    if (errors && Object.keys(errors).length > 0) {
      Object.values(errors).forEach(error => toast.error(error))
    }
  }, [errors])

  const handleFileSelect = (e) => {
    addFiles(e.target.files)
    e.target.value = ''
  }

  const removeFile = (fileId) => {
    setAttachedFiles(attachedFiles.filter(f => f.id !== fileId))
  }

  // "me" | "user" | "guest" — drives requestOnBehalf / isGuestTicket with the same resets as before
  const requesterMode = !requestOnBehalf ? 'me' : isGuestTicket ? 'guest' : 'user'
  const setRequesterMode = (mode) => {
    if (mode === 'me') {
      setRequestOnBehalf(false)
      setIsGuestTicket(false)
      setData((d) => ({ ...d, requester: currentUser?.id || '', is_guest_ticket: false, guest_name: '', guest_email: '', guest_phone: '' }))
    } else if (mode === 'user') {
      setRequestOnBehalf(true)
      setIsGuestTicket(false)
      setData((d) => ({ ...d, requester: '', is_guest_ticket: false, guest_name: '', guest_email: '', guest_phone: '' }))
    } else {
      setRequestOnBehalf(true)
      setIsGuestTicket(true)
      setData((d) => ({ ...d, requester: '', is_guest_ticket: true }))
    }
  }

  const [dragOver, setDragOver] = useState(false)
  const addFiles = (fileList) => {
    const newFiles = Array.from(fileList).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }))
    setAttachedFiles((prev) => [...prev, ...newFiles])
  }

  const setTags = (tags) => {
    setSelectedTags(tags)
    setData('tags', JSON.stringify(tags))
  }

  const setWatchers = (ids) => {
    setSelectedWatchers(ids)
    setData('watchers', JSON.stringify(ids))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Check if web channel is active
    if (!webChannelActive) {
      toast.error('Web channel is inactive. Ticket creation is not allowed.')
      return
    }
    
    // Validate required fields
    if (!data.title || !data.description) {
      toast.error('Please fill in title and description')
      return
    }
    
    // Validate requester or guest info
    if (requestOnBehalf && isGuestTicket) {
      if (!data.guest_name || !data.guest_email) {
        toast.error('Please fill in guest name and email')
        return
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.guest_email)) {
        toast.error('Please enter a valid email address')
        return
      }
    } else if (requestOnBehalf && !isGuestTicket) {
      if (!data.requester) {
        toast.error('Please select a caller')
        return
      }
    }
    // When not requesting on behalf, requester is already set to currentUser.id

    // Upload files first, then create ticket with file URLs
    const uploadFilesAndCreateTicket = async () => {
      const uploadedAttachments = []

      // Upload each file
      for (const fileObj of attachedFiles) {
        const formData = new FormData()
        formData.append('file', fileObj.file)

        try {
          const response = await csrfFetch('/upload/', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) throw new Error('Upload failed')
          
          const result = await response.json()
          uploadedAttachments.push(result)
        } catch (error) {
          throw new Error(`Failed to upload ${fileObj.name}`)
        }
      }

      // Create ticket with uploaded file URLs
      const ticketData = {
        ...data,
        attachments: JSON.stringify(uploadedAttachments),
      }

      return new Promise((resolve, reject) => {
        post('/tickets/new/', ticketData, {
          preserveScroll: true,
          onSuccess: () => resolve(),
          onError: () => reject(new Error('Failed to create ticket')),
        })
      })
    }

    toast.promise(
      uploadFilesAndCreateTicket(),
      {
        loading: attachedFiles.length > 0 ? 'Uploading files and creating ticket...' : 'Creating ticket...',
        success: 'Ticket created successfully!',
        error: (err) => err.message || 'Failed to create ticket',
      }
    )
  }

  return (
    <>
      <Head title="New ticket" />

      <AppShell active="tickets">
        <main className="flex-1 min-w-0 bg-white">
          <form onSubmit={handleSubmit}>
            {/* Top bar */}
            <div className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-3">
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
                  <Link href="/tickets/" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900">
                    <Inbox className="w-4 h-4" /> Tickets
                  </Link>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-900 font-medium">New ticket</span>
                </nav>
                <button
                  type="button"
                  onClick={() => router.visit('/tickets/')}
                  className="h-8 px-3 text-sm rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || !webChannelActive}
                  title={!webChannelActive ? 'Web channel is inactive' : ''}
                  className="h-8 px-3 inline-flex items-center gap-1.5 text-sm font-medium rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing && <Spinner className="w-3.5 h-3.5" />}
                  {processing ? 'Creating…' : 'Create ticket'}
                </button>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
              {!webChannelActive && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">The web channel is inactive</p>
                    <p className="text-amber-700 mt-0.5">
                      Tickets can't be created here until it's turned on.{' '}
                      <Link href="/administration/channels/" className="font-medium underline">Activate it</Link>
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
                {/* ── Main column ─────────────────────────── */}
                <div className="min-w-0 space-y-6 animate-fadeIn">
                  <div>
                    <label htmlFor="ticket-title" className="sr-only">Title</label>
                    <input
                      id="ticket-title"
                      type="text"
                      autoFocus
                      value={data.title}
                      maxLength={255}
                      onChange={e => setData('title', e.target.value)}
                      placeholder="Ticket title"
                      className="w-full text-2xl font-semibold text-gray-900 title-underline-input px-0 py-1 focus:ring-0 placeholder:text-gray-300"
                    />
                    {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <FileText className="w-4 h-4 text-gray-400" /> Description <span className="text-red-500">*</span>
                    </p>
                    <div>
                      <RichEditor
                        value={data.description}
                        onChange={(html) => setData('description', html)}
                        placeholder="Describe the issue, steps to reproduce, what was expected…"
                      />
                    </div>
                    {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                  </div>

                  <div>
                    <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Paperclip className="w-4 h-4 text-gray-400" /> Attachments
                      {attachedFiles.length > 0 && <span className="px-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-500 tabular-nums">{attachedFiles.length}</span>}
                    </p>
                    <label
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
                      className={`flex flex-col items-center justify-center gap-1 px-4 py-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                        dragOver ? 'border-[#0B3D26] bg-[#0B3D26]/5' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <Paperclip className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-600"><span className="font-medium text-[#0B3D26]">Choose files</span> or drag them here</span>
                      <input type="file" multiple onChange={handleFileSelect} className="hidden" />
                    </label>

                    {attachedFiles.length > 0 && (
                      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {attachedFiles.map(file => (
                          <li key={file.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200">
                            <span className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4 text-gray-500" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm text-gray-900 truncate">{file.name}</span>
                              <span className="block text-xs text-gray-400">{formatSize(file.size)}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFile(file.id)}
                              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                              aria-label={`Remove ${file.name}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* ── Side panel ──────────────────────────── */}
                <aside className="lg:sticky lg:top-16 self-start space-y-4 animate-fadeIn">
                  {/* Requester */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50/50">
                      <h2 className="text-sm font-semibold text-gray-900">Caller</h2>
                    </div>
                    <div className="p-3 space-y-3">
                      <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-gray-100" role="radiogroup" aria-label="Caller">
                        {REQUESTER_MODES.map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={requesterMode === id}
                            onClick={() => setRequesterMode(id)}
                            className={`h-7 rounded-md text-xs font-medium transition-colors ${
                              requesterMode === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {requesterMode === 'me' && (
                        <div className="flex items-center gap-2 px-1 text-sm text-gray-900">
                          <MiniAvatar user={{ name: currentUser?.name || 'You' }} size="w-6 h-6 text-[10px]" />
                          {currentUser?.name || 'You'}
                        </div>
                      )}

                      {requesterMode === 'user' && (
                        <div>
                          <Select
                            value={requester?.id ?? ''}
                            onChange={(value) => setData('requester', value)}
                            options={users}
                            placeholder="Select caller"
                            searchable
                            allowClear={false}
                            error={errors.requester}
                            className="w-full"
                          />
                        </div>
                      )}

                      {requesterMode === 'guest' && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">For someone who doesn't have an account.</p>
                          <input
                            type="text"
                            value={data.guest_name}
                            onChange={e => setData('guest_name', e.target.value)}
                            placeholder="Name *"
                            aria-label="Guest name"
                            className={INPUT}
                          />
                          {errors.guest_name && <p className="text-xs text-red-600">{errors.guest_name}</p>}
                          <div className="relative">
                            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="email"
                              value={data.guest_email}
                              onChange={e => setData('guest_email', e.target.value)}
                              placeholder="Email *"
                              aria-label="Guest email"
                              className={`${INPUT} pl-9`}
                            />
                          </div>
                          {errors.guest_email && <p className="text-xs text-red-600">{errors.guest_email}</p>}
                          <input
                            type="tel"
                            value={data.guest_phone}
                            onChange={e => setData('guest_phone', e.target.value)}
                            placeholder="Phone (optional)"
                            aria-label="Guest phone"
                            className={INPUT}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Properties */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50/50">
                      <h2 className="text-sm font-semibold text-gray-900">Details</h2>
                    </div>
                    <dl className="px-2 py-1.5 divide-y divide-gray-100">
                      <DetailRow stacked icon={UserCircle2} label="Assignee">
                        <FieldPopover
                          label="Assignee"
                          description="Who will work on this ticket"
                          value={data.assignee}
                          options={users}
                          optionIcon={(o) => <MiniAvatar user={o} size="w-5 h-5 text-[9px]" />}
                          emptyLabel="Unassigned"
                          searchable
                          triggerClassName={TRIGGER}
                          variant="field"
                          onPick={(value) => setData('assignee', value)}
                        >
                          {assignee ? (
                            <>
                              <MiniAvatar user={assignee} size="w-5 h-5 text-[9px]" />
                              <span className="text-sm text-gray-900 truncate">{assignee.name}</span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">Unassigned</span>
                          )}
                        </FieldPopover>
                      </DetailRow>
                      <DetailRow stacked icon={Users} label="Group">
                        <FieldPopover
                          label="Group"
                          description="Team responsible for this ticket"
                          value={data.group}
                          options={groups}
                          emptyLabel="None"
                          searchable
                          triggerClassName={TRIGGER}
                          variant="field"
                          onPick={(value) => setData('group', value)}
                        >
                          <span className={`text-sm truncate ${group ? 'text-gray-900' : 'text-gray-400'}`}>{group?.name || 'None'}</span>
                        </FieldPopover>
                      </DetailRow>
                      <DetailRow stacked icon={CircleDot} label="Priority">
                        <FieldPopover
                          label="Priority"
                          description="How urgent this ticket is"
                          value={data.priority}
                          options={PRIORITIES}
                          optionIcon={priorityOptionIcon}
                          triggerClassName={TRIGGER}
                          variant="field"
                          width={240}
                          onPick={(value) => setData('priority', value)}
                        >
                          <PriorityIcon priority={data.priority} />
                          <span className="text-sm text-gray-900 truncate">{findName(PRIORITIES, data.priority)}</span>
                        </FieldPopover>
                      </DetailRow>
                      <DetailRow stacked icon={Shapes} label="Type">
                        <FieldPopover
                          label="Type"
                          description="What kind of ticket this is"
                          value={data.type}
                          options={TICKET_TYPES}
                          triggerClassName={TRIGGER}
                          variant="field"
                          width={240}
                          onPick={(value) => setData('type', value)}
                        >
                          <span className="text-sm text-gray-900 truncate">{findName(TICKET_TYPES, data.type)}</span>
                        </FieldPopover>
                      </DetailRow>
                      <DetailRow stacked icon={Radio} label="Status">
                        <FieldPopover
                          label="Status"
                          description="Where the ticket starts"
                          value={data.status}
                          options={CREATE_STATUSES}
                          optionIcon={statusOptionIcon}
                          triggerClassName={TRIGGER}
                          variant="field"
                          width={240}
                          onPick={(value) => setData('status', value)}
                        >
                          <TicketStatusIcon status={data.status} />
                          <span className="text-sm text-gray-900 truncate">{findName(TICKET_STATUSES, data.status)}</span>
                        </FieldPopover>
                      </DetailRow>
                      <DetailRow stacked icon={Inbox} label="Channel">
                        <div className="px-2 py-1.5"><ChannelLabel channel={defaultChannel} source="web" /></div>
                      </DetailRow>
                      <DetailRow stacked icon={Tag} label="Tags">
                        <TagsField tags={selectedTags} onSave={setTags} />
                      </DetailRow>
                      <DetailRow stacked icon={Eye} label="Watchers">
                        <WatchersField
                          watchers={users.filter((u) => selectedWatchers.includes(u.id))}
                          users={users}
                          onSave={setWatchers}
                        />
                      </DetailRow>
                    </dl>
                  </div>
                </aside>
              </div>
            </div>
          </form>
        </main>
      </AppShell>
    </>
  )
}
