import React, { useEffect, useRef, useState } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import toast from 'react-hot-toast'
import {
  Inbox, ChevronRight, Link2, Eye, EyeOff, MoreHorizontal, Paperclip, Merge, Hash, ListChecks,
  MessageSquare, StickyNote, History, Timer, FileText, UserCircle2, Users, CircleDot, Tag, Shapes, Building2,
  Mail, Clock, Pencil, ArrowUpRight, GitBranch, Reply, UserPlus, Lock, AlertTriangle,
  CheckCircle2, PauseCircle, Search,
} from 'lucide-react'
import api from '../../utils/axios'
import useMediaQuery from '../../utils/useMediaQuery'
import { Popover } from '../../components/Popover'
import AppShell from '../components/AppShell'
import DropdownMenu from '../components/DropdownMenu'
import Modal, { ModalBody, ModalButton } from '../components/Modal'
import ActivityTimeline from '../../components/ActivityTimeline'
import {
  ConversationTab,
  AttachmentsTab,
  WorkItemsTab,
  SLATab,
  WorkItemModal,
  CompleteWorkItemModal,
  AttachmentModal,
  ResumeTicketConfirm,
} from '../components/ticket'
import Tabs from '../components/Tabs'
import StatusMenu from '../components/ticket/StatusMenu'
import MentionHtml from '../components/ticket/MentionHtml'
import {
  TICKET_TYPES, TicketStatusIcon, TicketStatusBadge, ChannelLabel,
  slaState, formatSlaTime, statusLabel, isClosedStatus, StatusTrack,
} from '../components/ticket/ui'
import { PRIORITIES } from '../components/tasks/constants'
import FieldPopover from '../components/detail/FieldPopover'
import { PriorityIcon, priorityOptionIcon, MiniAvatar, TaskStatusIcon, apiError, Spinner } from '../components/tasks/ui'
import {
  IconButton, ChipButton, Section, DetailRow, TagsField, WatchersField, timeAgo,
} from '../components/detail/DetailUI'

const EMPTY_WORK_ITEM = { title: '', description: '', priority: 'normal', assignee: null, due_date: '', work_notes: '' }

const RICH_TEXT = 'text-sm text-gray-800 leading-relaxed break-words [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_a]:text-[#0B3D26] [&_a]:underline [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:whitespace-pre-wrap [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_img]:max-w-full [&_img]:rounded-md'

export default function TicketView({
  ticket: serverTicket, comments = [], attachments = [], activities = [], users = [], groups = [], sla = null,
  requester_tickets: requesterTickets = [], linked_tasks: linkedTasks = [],
}) {
  const isLarge = useMediaQuery('(min-width: 1024px)')
  const { props } = usePage()
  const currentUser = props.auth?.user

  // Optimistic overrides so field edits feel instant; cleared when fresh props arrive
  const [overrides, setOverrides] = useState({})
  const ticket = { ...serverTicket, ...overrides }
  const [saving, setSaving] = useState(null)
  useEffect(() => { setOverrides({}) }, [serverTicket])

  const [activeTab, setActiveTab] = useState('conversation')
  const activityRef = useRef(null)

  // Comment state
  const [newComment, setNewComment] = useState('')
  const [commentInternal, setCommentInternal] = useState(false)
  const [commentMentions, setCommentMentions] = useState([])
  const [processing, setProcessing] = useState(false)

  // Work items state
  const [showWorkItemModal, setShowWorkItemModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completingWorkItem, setCompletingWorkItem] = useState(null)
  const [completionNotes, setCompletionNotes] = useState('')
  const [editingWorkItem, setEditingWorkItem] = useState(null)
  const [workItems, setWorkItems] = useState([])
  const [workItemForm, setWorkItemForm] = useState(EMPTY_WORK_ITEM)

  // SLA state
  const [slaData, setSlaData] = useState(sla)
  const [showResumeConfirm, setShowResumeConfirm] = useState(false)
  useEffect(() => { setSlaData(sla) }, [sla])

  // Attachment state
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [attachmentIsInternal, setAttachmentIsInternal] = useState(false)

  // Status changes and "assign to me" are confirmed from the conversation composer, with an optional internal note
  const [pendingStatusAction, setPendingStatusAction] = useState(null)
  const [composerFocus, setComposerFocus] = useState(0)

  // Merge state
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergeSearchQuery, setMergeSearchQuery] = useState('')
  const [mergeSearchResults, setMergeSearchResults] = useState([])
  const [selectedMergeTarget, setSelectedMergeTarget] = useState(null)
  const [merging, setMerging] = useState(false)
  const [searchingTickets, setSearchingTickets] = useState(false)

  const computedStatus = ticket?.computed_status || ticket?.status
  const isMerged = !!ticket?.is_merged
  // Closed, resolved and merged tickets are read-only
  const isReadOnly = isClosedStatus(computedStatus) || isMerged
  const isOnHold = computedStatus === 'pending' || computedStatus === 'hold'
  const canAssign = !isReadOnly && (!ticket?.assignee || ticket?.assignee?.id !== currentUser?.id)
  const canMerge = !isReadOnly && computedStatus !== 'closed'
  const publicComments = comments.filter((c) => !c.is_internal)
  const internalNotes = comments.filter((c) => c.is_internal)
  const requesterName = ticket?.is_guest_ticket ? (ticket?.guest_name || 'Guest') : (ticket?.requester?.name || 'Unknown')
  const requesterEmail = ticket?.is_guest_ticket ? ticket?.guest_email : ticket?.requester?.email

  const refresh = () => router.reload({
    only: ['ticket', 'comments', 'attachments', 'activities', 'sla', 'requester_tickets', 'linked_tasks'],
    preserveScroll: true,
    preserveState: true,
  })

  // Fetch work items
  const fetchWorkItems = () => {
    api.get(`/tickets/${ticket.uuid}/work-items/`)
      .then((res) => setWorkItems(res.data.work_items || []))
      .catch(() => toast.error('Failed to fetch work items'))
  }

  useEffect(() => {
    fetchWorkItems()
  }, [ticket.uuid])

  /** Update one ticket field; `optimistic` is merged into the view right away. */
  const updateField = async (field, value, optimistic = {}, message = 'Ticket updated') => {
    setOverrides((o) => ({ ...o, ...optimistic }))
    setSaving(field)
    try {
      await api.post(`/tickets/${ticket.uuid}/update/`, { [field]: value })
      if (message) toast.success(message)
      refresh()
    } catch (error) {
      setOverrides((o) => {
        const next = { ...o }
        Object.keys(optimistic).forEach((k) => delete next[k])
        return next
      })
      toast.error(apiError(error, 'Failed to update ticket'))
    } finally {
      setSaving(null)
    }
  }

  // Submit comment
  const handleSubmitComment = (commentData = null) => {
    const payload = commentData || {
      message: newComment,
      is_internal: commentInternal,
      mentions: commentMentions,
      attachments: [],
    }

    // Allow comments with just attachments or just text
    if (!payload.message?.trim() && (!payload.attachments || payload.attachments.length === 0)) {
      toast.error('Please enter a comment or attach a file')
      return
    }

    setProcessing(true)
    api.post(`/tickets/${ticket.uuid}/comment/`, {
      ...payload,
      attachments: JSON.stringify(payload.attachments || []),
    })
      .then(() => {
        toast.success('Comment added successfully')
        setNewComment('')
        setCommentInternal(false)
        setCommentMentions([])
        refresh()
      })
      .catch(() => toast.error('Failed to add comment'))
      .finally(() => setProcessing(false))
  }

  // Status change handling
  const focusNotesForAction = (actionType, actionValue = null) => {
    setPendingStatusAction({ type: actionType, value: actionValue })
    openTab('conversation')
    setComposerFocus((n) => n + 1)
  }

  const startNote = () => {
    setCommentInternal(true)
    openTab('conversation')
    setComposerFocus((n) => n + 1)
  }

  const cancelPendingAction = () => setPendingStatusAction(null)

  const updateStatus = (newStatus) => focusNotesForAction('status', newStatus)

  const executePendingAction = async ({ message: note = '', mentions = [], attachments = [] } = {}) => {
    if (!pendingStatusAction) return

    setProcessing(true)
    try {
      if (note.trim() || attachments.length > 0) {
        await api.post(`/tickets/${ticket.uuid}/comment/`, {
          message: note,
          is_internal: true,
          mentions,
          attachments: JSON.stringify(attachments),
        })
      }

      if (pendingStatusAction.type === 'assign') {
        await api.post(`/tickets/${ticket.uuid}/update/`, { assignee: currentUser.id })

        const statusFormData = new URLSearchParams()
        statusFormData.append('status', 'open')
        await api.post(`/tickets/${ticket.uuid}/status/`, statusFormData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        toast.success('Ticket assigned to you')
      } else if (pendingStatusAction.type === 'status') {
        // Reopening = moving from resolved/closed back to an active status
        const isReopening = (ticket?.status === 'resolved' || ticket?.status === 'closed') &&
          ['new', 'open', 'in_progress', 'pending'].includes(pendingStatusAction.value)

        // Putting the ticket on hold also pauses its SLA
        if ((pendingStatusAction.value === 'pending' || pendingStatusAction.value === 'hold') && slaData && !slaData.is_on_hold) {
          await api.post(`/sla/api/tickets/${ticket.uuid}/sla/hold/`, { reason: note || 'Ticket placed on hold' })
        }

        const formData = new URLSearchParams()
        formData.append('status', pendingStatusAction.value)
        await api.post(`/tickets/${ticket.uuid}/status/`, formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })

        toast.success(isReopening ? 'Ticket reopened' : 'Status updated')
      }

      setPendingStatusAction(null)
      setNewComment('')
      setCommentMentions([])
      setCommentInternal(false)
      refresh()
    } catch {
      toast.error('Failed to complete action')
    } finally {
      setProcessing(false)
    }
  }

  const assignToMe = () => {
    if (!currentUser?.id) {
      toast.error('Unable to identify current user')
      return
    }
    focusNotesForAction('assign')
  }

  const confirmResumeTicket = () => {
    if (slaData?.is_on_hold) {
      api.post(`/sla/api/tickets/${ticket.uuid}/sla/resume/`)
        .then((res) => {
          if (res.data.success) {
            toast.success('SLA timer has been resumed')
            setSlaData((prev) => ({ ...prev, ...res.data.sla }))
          }
        })
    }

    const formData = new URLSearchParams()
    formData.append('status', 'in_progress')
    api.post(`/tickets/${ticket.uuid}/status/`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
      .then(() => {
        toast.success('Ticket resumed')
        refresh()
      })
      .catch(() => toast.error('Failed to update ticket status'))
  }

  // Merge
  const searchTicketsForMerge = async (query) => {
    if (!query.trim()) {
      setMergeSearchResults([])
      return
    }
    setSearchingTickets(true)
    try {
      const res = await api.get(`/tickets/search/?q=${encodeURIComponent(query)}&exclude=${ticket.uuid}`)
      setMergeSearchResults(res.data.tickets || [])
    } catch {
      toast.error('Failed to search tickets')
    } finally {
      setSearchingTickets(false)
    }
  }

  const handleMergeTicket = async () => {
    if (!selectedMergeTarget) {
      toast.error('Please select a ticket to merge into')
      return
    }
    setMerging(true)
    try {
      const res = await api.post(`/tickets/${ticket.uuid}/merge/`, { target_ticket_uuid: selectedMergeTarget.uuid })
      if (res.data.success) {
        toast.success('Ticket merged successfully')
        router.visit(`/tickets/${selectedMergeTarget.uuid}`)
      } else {
        toast.error(res.data.error || 'Failed to merge ticket')
      }
    } catch {
      toast.error('Failed to merge ticket')
    } finally {
      setMerging(false)
    }
  }

  const closeMergeModal = () => {
    setShowMergeModal(false)
    setMergeSearchQuery('')
    setMergeSearchResults([])
    setSelectedMergeTarget(null)
  }

  // Work items
  const closeWorkItemModal = () => {
    setShowWorkItemModal(false)
    setEditingWorkItem(null)
    setWorkItemForm(EMPTY_WORK_ITEM)
  }

  const createWorkItem = () => {
    if (!workItemForm.title.trim()) {
      toast.error('Title is required')
      return
    }
    const url = editingWorkItem
      ? `/tickets/${ticket.uuid}/work-items/${editingWorkItem.id}/update/`
      : `/tickets/${ticket.uuid}/work-items/create/`

    api.post(url, workItemForm)
      .then(() => {
        toast.success(editingWorkItem ? 'Work item updated' : 'Work item created')
        closeWorkItemModal()
        fetchWorkItems()
        refresh()
      })
      .catch(() => toast.error('Failed to save work item'))
  }

  const handleEditWorkItem = (item) => {
    setEditingWorkItem(item)
    setWorkItemForm({
      title: item.title,
      description: item.description || '',
      priority: item.priority,
      assignee: item.assignee?.id || null,
      due_date: item.due_date || '',
      status: item.status,
      work_notes: item.work_notes || '',
    })
    setShowWorkItemModal(true)
  }

  const handleCompleteWorkItem = (item) => {
    setCompletingWorkItem(item)
    setCompletionNotes('')
    setShowCompleteModal(true)
  }

  const submitCompleteWorkItem = () => {
    if (!completingWorkItem) return
    api.post(`/tickets/${ticket.uuid}/work-items/${completingWorkItem.id}/update/`, { status: 'done', work_notes: completionNotes })
      .then(() => {
        toast.success('Work item marked as complete')
        setShowCompleteModal(false)
        setCompletingWorkItem(null)
        setCompletionNotes('')
        fetchWorkItems()
        refresh()
      })
      .catch(() => toast.error('Failed to update work item'))
  }

  // Attachments
  const handleAttachmentUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }
    setUploadingAttachment(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      const uploadRes = await api.post('/upload/', formData)
      const uploadData = uploadRes.data

      await api.post(`/tickets/${ticket.uuid}/attachment/`, {
        file_url: uploadData.file_url,
        file_name: uploadData.file_name,
        file_size: uploadData.file_size,
        file_type: uploadData.file_type,
        is_internal: attachmentIsInternal,
      })

      toast.success('File attached successfully')
      setShowAttachmentModal(false)
      setSelectedFile(null)
      setAttachmentIsInternal(false)
      refresh()
    } catch (error) {
      toast.error(error.message || 'Failed to upload attachment')
    } finally {
      setUploadingAttachment(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      const uploadResponse = await api.post('/upload/', uploadFormData)
      const uploadData = uploadResponse.data

      const attachFormData = new FormData()
      attachFormData.append('file_url', uploadData.file_url)
      attachFormData.append('file_name', uploadData.file_name)
      attachFormData.append('file_size', uploadData.file_size)
      attachFormData.append('file_type', uploadData.file_type)
      await api.post(`/tickets/${ticket.uuid}/attachment/`, attachFormData)

      toast.success('File uploaded successfully')
      refresh()
    } catch {
      toast.error('Failed to upload file')
    }
  }

  const openTab = (tab) => {
    setActiveTab(tab)
    activityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const copy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(message)
    } catch {
      toast.error('Could not copy to the clipboard')
    }
  }

  const watcherIds = (ticket.watchers || []).map((w) => w.id)
  const isWatching = !!currentUser && watcherIds.includes(currentUser.id)
  const saveWatchers = (ids, message = 'Watchers updated') => updateField(
    'watchers', ids, { watchers: users.filter((u) => ids.includes(u.id)) }, message,
  )
  const toggleWatch = () => {
    if (!currentUser) return
    const next = isWatching ? watcherIds.filter((id) => id !== currentUser.id) : [...watcherIds, currentUser.id]
    saveWatchers(next, isWatching ? 'Stopped watching' : 'Watching this ticket')
  }

  const onStatusPick = (value) => (value === 'resume' ? setShowResumeConfirm(true) : updateStatus(value))

  const tabs = [
    ['conversation', MessageSquare, 'Conversation', comments.length],
    ['workitems', ListChecks, 'Work items', workItems.length],
    ['attachments', Paperclip, 'Files', attachments.length],
    ['activity', History, 'History', activities.length],
    ['sla', Timer, 'SLA', null],
  ]

  const sidePanel = (
    <div className="space-y-4">
              {!isMerged && (
                <div className="flex flex-wrap items-center gap-2">
                  <StatusMenu status={computedStatus} onPick={onStatusPick} />
                  {canAssign && (
                    <button
                      onClick={assignToMe}
                      className="h-9 px-3 inline-flex items-center gap-1.5 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <UserPlus className="w-4 h-4 text-gray-500" /> Assign to me
                    </button>
                  )}
                </div>
              )}

              {pendingStatusAction && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
                  <p className="font-medium text-amber-800">
                    {pendingStatusAction.type === 'assign' ? 'Assigning to you' : `Moving to ${statusLabel(pendingStatusAction.value)}`}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">Add an optional internal note in the conversation to confirm.</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button onClick={() => { openTab('conversation'); setComposerFocus((n) => n + 1) }} className="text-xs font-medium text-amber-800 hover:underline">Add note</button>
                    <button onClick={cancelPendingAction} className="text-xs text-amber-700 hover:underline">Cancel</button>
                  </div>
                </div>
              )}

              {ticket?.sla_info && <SlaCard info={ticket.sla_info} onOpen={() => openTab('sla')} />}

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">Details</h2>
                  {saving ? <Spinner className="w-3.5 h-3.5 text-gray-400" /> : isReadOnly && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400" title="Reopen the ticket to edit it">
                      <Lock className="w-3 h-3" /> Read-only
                    </span>
                  )}
                </div>
                <dl className="px-2 py-1.5 divide-y divide-gray-100">
                  <DetailRow stacked icon={UserCircle2} label="Assignee">
                    <FieldPopover
                      label="Assignee"
                      description="Who is working on this ticket"
                      value={ticket.assignee?.id || ''}
                      options={users}
                      optionIcon={(o) => <MiniAvatar user={o} size="w-5 h-5 text-[9px]" />}
                      emptyLabel="Unassigned"
                      searchable
                      disabled={isReadOnly}
                      triggerClassName="w-full"
                      variant="field"
                      onPick={(value) => updateField(
                        'assignee', value || null,
                        { assignee: users.find((u) => u.id === value) || null },
                        value ? 'Assignee updated' : 'Unassigned',
                      )}
                    >
                      {ticket.assignee ? (
                        <>
                          <MiniAvatar user={ticket.assignee} size="w-5 h-5 text-[9px]" />
                          <span className="text-sm text-gray-900 truncate">{ticket.assignee.name}</span>
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
                      value={ticket.group?.id || ''}
                      options={groups}
                      emptyLabel="None"
                      searchable
                      disabled={isReadOnly}
                      triggerClassName="w-full"
                      variant="field"
                      onPick={(value) => updateField(
                        'group', value || null,
                        { group: groups.find((g) => g.id === value) || null },
                        'Group updated',
                      )}
                    >
                      <span className={`text-sm truncate ${ticket.group?.name ? 'text-gray-900' : 'text-gray-400'}`}>
                        {ticket.group?.name || 'None'}
                      </span>
                    </FieldPopover>
                  </DetailRow>

                  <DetailRow stacked icon={CircleDot} label="Priority">
                    <FieldPopover
                      label="Priority"
                      description="Change the ticket priority"
                      value={ticket.priority || 'normal'}
                      options={PRIORITIES}
                      optionIcon={priorityOptionIcon}
                      disabled={isReadOnly}
                      triggerClassName="w-full"
                      variant="field"
                      width={240}
                      onPick={(priority) => updateField(
                        'priority', priority,
                        { priority, priority_display: PRIORITIES.find((p) => p.id === priority)?.name },
                        'Priority updated',
                      )}
                    >
                      <PriorityIcon priority={ticket.priority} />
                      <span className="text-sm text-gray-900 truncate">{ticket.priority_display || ticket.priority}</span>
                    </FieldPopover>
                  </DetailRow>

                  <DetailRow stacked icon={Shapes} label="Type">
                    <FieldPopover
                      label="Type"
                      description="What kind of ticket this is"
                      value={ticket.type || 'question'}
                      options={TICKET_TYPES}
                      disabled={isReadOnly}
                      triggerClassName="w-full"
                      variant="field"
                      width={240}
                      onPick={(type) => updateField(
                        'type', type,
                        { type, type_display: TICKET_TYPES.find((t) => t.id === type)?.name },
                        'Type updated',
                      )}
                    >
                      <span className="text-sm text-gray-900 truncate">{ticket.type_display || ticket.type}</span>
                    </FieldPopover>
                  </DetailRow>

                  <DetailRow stacked icon={Mail} label="Requester">
                    <div className="px-2 py-1.5 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <MiniAvatar user={{ name: requesterName }} size="w-6 h-6 text-[10px]" />
                        <span className="truncate">{requesterName}</span>
                        {ticket?.is_guest_ticket && <span className="px-1.5 rounded bg-gray-100 text-[10px] font-medium text-gray-500">Guest</span>}
                      </div>
                      {requesterEmail && (
                        <a href={`mailto:${requesterEmail}`} className="mt-0.5 block text-xs text-gray-500 hover:text-[#0B3D26] truncate">{requesterEmail}</a>
                      )}
                    </div>
                  </DetailRow>

                  {ticket?.department && (
                    <DetailRow stacked icon={Building2} label="Department">
                      <ReadValue text={ticket.department} />
                    </DetailRow>
                  )}

                  <DetailRow stacked icon={Tag} label="Tags">
                    <TagsField
                      tags={ticket.tags || []}
                      readOnly={isReadOnly}
                      onSave={(tags) => updateField('tags', tags, { tags }, 'Tags updated')}
                    />
                  </DetailRow>

                  <DetailRow stacked icon={Eye} label="Watchers">
                    <WatchersField
                      watchers={ticket.watchers || []}
                      users={users}
                      readOnly={isMerged}
                      onSave={(ids) => saveWatchers(ids)}
                    />
                  </DetailRow>
                </dl>
              </div>

              {requesterTickets.length > 0 && (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50/50">
                    <h2 className="text-sm font-semibold text-gray-900">More from {requesterName.split(' ')[0]}</h2>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {requesterTickets.map((t) => (
                      <li key={t.uuid}>
                        <Link href={`/tickets/${t.uuid}/`} className="group flex items-start gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                          <TicketStatusIcon status={t.computed_status} className="mt-0.5" />
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm truncate ${isClosedStatus(t.computed_status) ? 'text-gray-500' : 'text-gray-900 group-hover:text-[#0B3D26]'}`}>
                              {t.title}
                            </span>
                            <span className="block text-xs text-gray-400">
                              {t.ticket_number} · {statusLabel(t.computed_status)} · {timeAgo(t.updated_at)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="px-1 space-y-1 text-xs text-gray-500">
                <p className="flex items-center gap-1.5" title={ticket?.created_at}>
                  <Clock className="w-3.5 h-3.5" /> Created {timeAgo(ticket?.created_at)}
                </p>
                <p className="flex items-center gap-1.5" title={ticket?.updated_at}>
                  <Pencil className="w-3.5 h-3.5" /> Updated {timeAgo(ticket?.updated_at)}
                </p>
              </div>
    </div>
  )

  return (
    <>
      <Head title={`${ticket?.ticket_number || 'Ticket'} ${ticket?.title || ''}`.trim()} />
      <AppShell active="tickets">
        <main className="flex-1 min-w-0 bg-white">
          {/* Top bar: breadcrumbs + actions */}
          <div className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-3">
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
                <Link href="/tickets/" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 flex-shrink-0">
                  <Inbox className="w-4 h-4" /> Tickets
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="inline-flex items-center gap-1.5 text-gray-900 font-medium min-w-0">
                  <TicketStatusIcon status={isMerged ? 'closed' : computedStatus} />
                  <span className="truncate">{ticket?.ticket_number}</span>
                </span>
              </nav>

              <div className="flex items-center gap-1 flex-shrink-0">
                <IconButton
                  label={isWatching ? 'Stop watching' : 'Watch'}
                  onClick={toggleWatch}
                  active={isWatching}
                  disabled={!currentUser || saving === 'watchers'}
                >
                  {isWatching ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {watcherIds.length > 0 && <span className="text-xs tabular-nums">{watcherIds.length}</span>}
                </IconButton>
                <IconButton label="Copy link" onClick={() => copy(window.location.href, 'Link copied')}>
                  <Link2 className="w-4 h-4" />
                </IconButton>
                <DropdownMenu
                  trigger={({ toggle }) => (
                    <IconButton label="More actions" onClick={toggle}>
                      <MoreHorizontal className="w-4 h-4" />
                    </IconButton>
                  )}
                  items={[
                    !isMerged && { label: 'Attach file', icon: Paperclip, onClick: () => setShowAttachmentModal(true) },
                    !isMerged && { label: 'Add work item', icon: ListChecks, onClick: () => setShowWorkItemModal(true) },
                    canMerge && { label: 'Merge into another ticket', icon: Merge, onClick: () => setShowMergeModal(true) },
                    { label: 'Copy ticket number', icon: Hash, onClick: () => copy(ticket.ticket_number, 'Ticket number copied') },
                    { type: 'divider' },
                    { label: 'Back to tickets', icon: Inbox, href: '/tickets/' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8">
            {/* ── Main column ─────────────────────────── */}
            <div className="min-w-0 space-y-8 animate-fadeIn">
              {isMerged && ticket?.merged_into && (
                <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <Merge className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 text-sm">
                    <p className="text-gray-700">
                      This ticket was merged into{' '}
                      <Link href={`/tickets/${ticket.merged_into.uuid}/`} className="font-semibold text-[#0B3D26] hover:underline">
                        {ticket.merged_into.ticket_number}
                      </Link>
                      {' '}· {ticket.merged_into.title}
                    </p>
                    {ticket.merged_at && <p className="text-xs text-gray-500 mt-0.5">Merged {timeAgo(ticket.merged_at)}</p>}
                  </div>
                </div>
              )}

              <div>
                <h1 className="text-2xl font-semibold text-gray-900 leading-snug break-words">{ticket?.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
                  <MiniAvatar user={{ name: requesterName }} size="w-5 h-5 text-[9px]" />
                  <span className="font-medium text-gray-700">{requesterName}</span>
                  <span>opened this</span>
                  <span title={ticket?.created_at}>{timeAgo(ticket?.created_at)}</span>
                  <span className="text-gray-300">·</span>
                  <ChannelLabel channel={ticket?.channel} source={ticket?.source} />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {!isMerged && (
                    <ChipButton icon={Reply} onClick={() => { setCommentInternal(false); openTab('conversation'); setComposerFocus((n) => n + 1) }}>
                      Reply{publicComments.length > 0 && <span className="text-gray-400 tabular-nums">{publicComments.length}</span>}
                    </ChipButton>
                  )}
                  {!isMerged && (
                    <ChipButton icon={StickyNote} onClick={startNote}>
                      Note{internalNotes.length > 0 && <span className="text-gray-400 tabular-nums">{internalNotes.length}</span>}
                    </ChipButton>
                  )}
                  {!isMerged && <ChipButton icon={Paperclip} onClick={() => setShowAttachmentModal(true)}>Attach</ChipButton>}
                  {!isMerged && (
                    <ChipButton icon={ListChecks} onClick={() => setShowWorkItemModal(true)}>
                      Work item{workItems.length > 0 && <span className="text-gray-400 tabular-nums">{workItems.length}</span>}
                    </ChipButton>
                  )}
                  {!isLarge && (
                    <Popover
                      width={340}
                      maxHeight={520}
                      strategy="fixed"
                      showArrow
                      trigger={({ toggle }) => (
                        <ChipButton icon={MoreHorizontal} onClick={toggle}>More</ChipButton>
                      )}
                    >
                      {() => <div className="p-3 max-h-[70vh] overflow-y-auto">{sidePanel}</div>}
                    </Popover>
                  )}
                </div>
              </div>

              {!isMerged && <StatusTrack status={computedStatus} />}

              <Section icon={FileText} title="Description">
                <Description html={ticket?.description} />
              </Section>

              {attachments.length > 0 && (
                <Section icon={Paperclip} title="Attachments" count={attachments.length}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    {attachments.slice(0, 6).map((att) => (
                      <a
                        key={att.id}
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <span className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-gray-500" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-gray-900 truncate">{att.file_name}</span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            {att.is_internal && <Lock className="w-3 h-3" />}
                            {timeAgo(att.uploaded_at)}
                          </span>
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-gray-400" />
                      </a>
                    ))}
                  </div>
                  {attachments.length > 6 && (
                    <button onClick={() => openTab('attachments')} className="mt-2 text-xs text-[#0B3D26] hover:underline">
                      View all {attachments.length} files
                    </button>
                  )}
                </Section>
              )}

              {linkedTasks.length > 0 && (
                <Section icon={GitBranch} title="Linked tasks" count={linkedTasks.length}>
                  <ul className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                    {linkedTasks.map((t) => {
                      const done = t.status === 'done' || t.status === 'cancelled'
                      return (
                        <li key={t.uuid}>
                          <Link href={`/tasks/${t.uuid}/`} className="group flex items-center gap-3 px-3 h-11 hover:bg-gray-50 transition-colors">
                            <TaskStatusIcon status={t.status} />
                            <span className="text-xs text-gray-400 tabular-nums flex-shrink-0 w-16">TASK-{t.id}</span>
                            <span className={`flex-1 min-w-0 truncate text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-900 group-hover:text-[#0B3D26]'}`}>
                              {t.title}
                            </span>
                            {t.converted && <span className="hidden sm:inline text-[11px] text-gray-400 flex-shrink-0">Converted</span>}
                            {t.source && <span className="hidden sm:inline text-[11px] text-gray-400 flex-shrink-0">Source task</span>}
                            <PriorityIcon priority={t.priority} />
                            <span className="hidden sm:inline text-xs text-gray-500 flex-shrink-0 w-20 truncate">{t.status_display}</span>
                            <MiniAvatar user={t.assignee} />
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </Section>
              )}

              {/* Activity */}
              <section ref={activityRef} className="scroll-mt-16">
                <div className="mb-4">
                  <Tabs
                    label="Ticket activity"
                    active={activeTab}
                    onChange={openTab}
                    tabs={tabs.map(([id, icon, label, count]) => ({
                      id,
                      icon,
                      label,
                      count,
                      disabled: id === 'sla' && !slaData,
                      title: id === 'sla' && !slaData ? 'No SLA policy applies to this ticket' : undefined,
                      flag: id === 'conversation' && !!pendingStatusAction && 'Action waiting for a note',
                    }))}
                  />
                </div>

                <div
                  key={activeTab}
                  className={`animate-fadeIn overflow-hidden ${
                    activeTab === 'conversation'
                      ? 'h-[calc(100dvh-9rem)] min-h-[360px] max-h-[720px]'
                      : 'h-[620px]'
                  }`}
                >
                  {activeTab === 'conversation' && (
                    <ConversationTab
                      ticket={ticket}
                      comments={comments}
                      newComment={newComment}
                      setNewComment={setNewComment}
                      commentInternal={commentInternal}
                      setCommentInternal={setCommentInternal}
                      commentMentions={commentMentions}
                      onMentionsChange={setCommentMentions}
                      processing={processing}
                      onSubmitComment={handleSubmitComment}
                      onFileUpload={handleFileUpload}
                      readOnly={isMerged}
                      pendingAction={pendingStatusAction}
                      onConfirmPendingAction={executePendingAction}
                      onCancelPendingAction={cancelPendingAction}
                      focusSignal={composerFocus}
                    />
                  )}
                  {activeTab === 'workitems' && (
                    <div className="h-full overflow-y-auto">
                      <WorkItemsTab
                        workItems={workItems}
                        onAddWorkItem={() => setShowWorkItemModal(true)}
                        onEditWorkItem={handleEditWorkItem}
                        onCompleteWorkItem={handleCompleteWorkItem}
                      />
                    </div>
                  )}
                  {activeTab === 'attachments' && (
                    <AttachmentsTab attachments={attachments} onAddAttachment={() => setShowAttachmentModal(true)} />
                  )}
                  {activeTab === 'activity' && (
                    <div className="h-full overflow-y-auto">
                      {activities.length > 0
                        ? <ActivityTimeline activities={activities} />
                        : <div className="h-full flex items-center justify-center"><p className="text-sm text-gray-400">No history yet.</p></div>}
                    </div>
                  )}
                  {activeTab === 'sla' && <SLATab slaData={slaData} />}
                </div>
              </section>
            </div>

            {/* ── Side panel (large screens) ─────────── */}
            {isLarge && (
              <aside className="lg:sticky lg:top-16 self-start animate-fadeIn">
                {sidePanel}
              </aside>
            )}
          </div>
        </main>

        {/* Modals */}
        <WorkItemModal
          isOpen={showWorkItemModal}
          onClose={closeWorkItemModal}
          workItemForm={workItemForm}
          setWorkItemForm={setWorkItemForm}
          editingWorkItem={editingWorkItem}
          users={users}
          onSubmit={createWorkItem}
        />

        <CompleteWorkItemModal
          isOpen={showCompleteModal}
          onClose={() => {
            setShowCompleteModal(false)
            setCompletingWorkItem(null)
            setCompletionNotes('')
          }}
          workItem={completingWorkItem}
          completionNotes={completionNotes}
          setCompletionNotes={setCompletionNotes}
          onSubmit={submitCompleteWorkItem}
        />

        <AttachmentModal
          isOpen={showAttachmentModal}
          onClose={() => setShowAttachmentModal(false)}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          isInternal={attachmentIsInternal}
          setIsInternal={setAttachmentIsInternal}
          uploading={uploadingAttachment}
          onUpload={handleAttachmentUpload}
        />

        <ResumeTicketConfirm
          isOpen={showResumeConfirm}
          onClose={() => setShowResumeConfirm(false)}
          onConfirm={() => {
            setShowResumeConfirm(false)
            confirmResumeTicket()
          }}
        />

        {/* Merge Ticket Modal */}
        <Modal
          isOpen={showMergeModal}
          onClose={closeMergeModal}
          icon={Merge}
          title="Merge ticket"
          description="Comments and attachments are copied to the ticket you merge into."
          size="lg"
          footer={(
            <>
              <ModalButton variant="secondary" onClick={closeMergeModal}>Cancel</ModalButton>
              <ModalButton variant="primary" onClick={handleMergeTicket} disabled={!selectedMergeTarget} loading={merging}>
                {merging ? 'Merging…' : 'Merge ticket'}
              </ModalButton>
            </>
          )}
        >
          <ModalBody className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={mergeSearchQuery}
                onChange={(e) => {
                  setMergeSearchQuery(e.target.value)
                  searchTicketsForMerge(e.target.value)
                }}
                placeholder="Search by ticket number, title or description…"
                aria-label="Search for the target ticket"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
              />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
              {searchingTickets ? (
                <div className="p-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Spinner className="w-4 h-4 text-[#0B3D26]" /> Searching…
                </div>
              ) : mergeSearchResults.length > 0 ? (
                <ul className="divide-y divide-gray-100" role="listbox" aria-label="Matching tickets">
                  {mergeSearchResults.map((t) => (
                    <li key={t.id}>
                      <button
                        role="option"
                        aria-selected={selectedMergeTarget?.id === t.id}
                        onClick={() => setSelectedMergeTarget(t)}
                        className={`w-full px-3 py-2.5 text-left transition-colors border-l-2 ${
                          selectedMergeTarget?.id === t.id ? 'bg-[#0B3D26]/5 border-[#0B3D26]' : 'border-transparent hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900">{t.ticket_number}</span>
                          <TicketStatusBadge status={t.computed_status} label={t.status_display} />
                        </span>
                        <span className="block text-sm text-gray-600 mt-0.5 truncate">{t.title}</span>
                        {t.requester && <span className="block text-xs text-gray-400 mt-0.5">{t.requester.name}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 text-center text-sm text-gray-500">
                  {mergeSearchQuery ? 'No tickets match your search' : 'Start typing to find the ticket to merge into'}
                </div>
              )}
            </div>

            {selectedMergeTarget && (
              <div className="p-3 rounded-lg bg-[#0B3D26]/5 border border-[#0B3D26]/30 text-sm text-gray-700">
                <span className="font-medium text-[#0B3D26]">Merge into:</span> {selectedMergeTarget.ticket_number} · {selectedMergeTarget.title}
              </div>
            )}
          </ModalBody>
        </Modal>
      </AppShell>
    </>
  )
}

// ─────────────────────────────────────────────
// Building blocks
// ─────────────────────────────────────────────

function Description({ html }) {
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) setOverflowing(ref.current.scrollHeight > 360)
  }, [html])

  const empty = !(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  if (empty) return <p className="text-sm text-gray-400">No description provided.</p>

  return (
    <div>
      <div
        ref={ref}
        className={`relative ${!expanded && overflowing ? 'max-h-[360px] overflow-hidden' : ''}`}
      >
        <MentionHtml className={RICH_TEXT} html={html} />
      </div>
      {overflowing && (
        <button onClick={() => setExpanded((v) => !v)} className="mt-2 text-xs font-medium text-[#0B3D26] hover:underline">
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

function SlaCard({ info, onOpen }) {
  const state = slaState(info)
  const tone = {
    breached: { icon: AlertTriangle, text: 'Breached', cls: 'text-red-700 bg-red-50 border-red-200' },
    at_risk: { icon: Clock, text: 'At risk', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
    on_hold: { icon: PauseCircle, text: 'On hold', cls: 'text-gray-700 bg-gray-50 border-gray-200' },
    on_track: { icon: CheckCircle2, text: 'On track', cls: 'text-green-700 bg-green-50 border-green-200' },
  }[state]
  const Icon = tone.icon

  const line = (label, part) => {
    if (!part) return null
    const value = info.is_on_hold
      ? 'Paused'
      : part.breached
        ? `Overdue ${formatSlaTime(part.hours_overdue)}`
        : part.hours_remaining !== null && part.hours_remaining !== undefined
          ? `${formatSlaTime(part.hours_remaining)} left`
          : '—'
    const color = part.breached ? 'text-red-600' : part.status === 'at_risk' ? 'text-amber-600' : 'text-gray-900'
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{label}</span>
        <span className={`font-medium tabular-nums ${color}`}>{value}</span>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border px-4 py-3 ${tone.cls}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Icon className="w-4 h-4" /> SLA {tone.text.toLowerCase()}
        </span>
        <button onClick={onOpen} className="text-xs hover:underline">Details</button>
      </div>
      {info.policy_name && <p className="text-xs opacity-80 mt-0.5 truncate">{info.policy_name}</p>}
      <div className="mt-2 space-y-1 rounded-lg bg-white/70 px-3 py-2">
        {line('First response', info.response)}
        {line('Resolution', info.resolution)}
      </div>
    </div>
  )
}

function ReadValue({ user, text, empty = '—' }) {
  if (user) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-900">
        <MiniAvatar user={user} size="w-6 h-6 text-[10px]" />
        <span className="truncate">{user.name}</span>
      </div>
    )
  }
  return <p className={`px-2 py-1.5 text-sm truncate ${text ? 'text-gray-900' : 'text-gray-400'}`}>{text || empty}</p>
}
