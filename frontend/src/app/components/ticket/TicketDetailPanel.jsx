import React, { useState, useEffect, useRef } from 'react'
import { Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import Avatar from '../../../components/Avatar'
import {
  ArrowUpRight, MessagesSquare, Paperclip, Activity, Timer, Lock, UserCircle2, Users, CircleDot, Shapes, Mail, Tag, Eye, Building2,
  PanelRightClose, PanelRightOpen,
} from 'lucide-react'
import { StatusTrack, TICKET_TYPES } from './ui'
import StatusMenu from './StatusMenu'
import { PriorityIcon, priorityOptionIcon, MiniAvatar } from '../tasks/ui'
import FieldPopover from '../detail/FieldPopover'
import { DetailRow, TagsField, WatchersField } from '../detail/DetailUI'
import { PRIORITIES } from '../tasks/constants'
import { COLORS } from '../../constants/theme'
import AttachmentsTab from './AttachmentsTab'
import ConversationTab from './ConversationTab'
import SLATab from './SLATab'
import Tabs from '../Tabs'
import RichEditor, { isRichTextEmpty } from '../RichEditor'
import ActivityTimeline from '../../../components/ActivityTimeline'
import { AttachmentModal } from './TicketModals'
import api from '../../../utils/axios'
import { useUnsavedChanges } from '../../context/UnsavedChangesContext'
import { isInFloatingLayer } from '../../../utils/floatingLayer'
import {
  GlobalOutlined,
  MailOutlined,
  MessageOutlined,
  SendOutlined,
  SlackOutlined,
  WindowsOutlined,
  ApiOutlined,
} from '@ant-design/icons'

const CHANNEL_ICON_MAP = {
  GlobalOutlined,
  MailOutlined,
  MessageOutlined,
  SendOutlined,
  SlackOutlined,
  WindowsOutlined,
  ApiOutlined,
}

/**
 * TicketDetailPanel - A component to display ticket details in the detailed view mode
 * without navigating to the full ticket page.
 */
export default function TicketDetailPanel({ ticketUuid, onClose, onTicketUpdate }) {
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState(null)
  const [comments, setComments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [activities, setActivities] = useState([])
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [slaData, setSlaData] = useState(null)
  const [activeTab, setActiveTab] = useState('conversation')
  const [detailsOpen, setDetailsOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('ticketDetailsPaneOpen')
      if (saved != null) return saved === '1'
    } catch { /* storage unavailable */ }
    return typeof window === 'undefined' || window.innerWidth >= 1280
  })
  const [newComment, setNewComment] = useState('')
  const [commentInternal, setCommentInternal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [commentMentions, setCommentMentions] = useState([])
  const [showSendDropdown, setShowSendDropdown] = useState(false)
  const sendDropdownRef = useRef(null)
  // Composer stays a bare placeholder until focused, like the description field
  const [composerFocused, setComposerFocused] = useState(false)
  const composerEditorRef = useRef(null)
  const composerBlurTimer = useRef(null)

  useEffect(() => () => clearTimeout(composerBlurTimer.current), [])

  useEffect(() => {
    try { localStorage.setItem('ticketDetailsPaneOpen', detailsOpen ? '1' : '0') } catch { /* storage unavailable */ }
  }, [detailsOpen])

  // Read-only when ticket is closed, resolved, or merged
  const computedStatus = ticket?.computed_status || ticket?.status
  const isReadOnly = computedStatus === 'closed' || computedStatus === 'resolved' || ticket?.is_merged

  const isMerged = !!ticket?.is_merged

  // File attachment state
  const [commentFiles, setCommentFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  
  // Attachment drawer state
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState(null)
  const [isAttachmentInternal, setIsAttachmentInternal] = useState(false)
  const [attachmentUploading, setAttachmentUploading] = useState(false)

  const composerEmpty = isRichTextEmpty(newComment)
  useUnsavedChanges(!composerEmpty || commentFiles.length > 0)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isInFloatingLayer(event.target) && sendDropdownRef.current && !sendDropdownRef.current.contains(event.target)) {
        setShowSendDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch ticket details
  useEffect(() => {
    if (!ticketUuid) return

    setLoading(true)
    api.get(`/tickets/${ticketUuid}/detail-api/`)
      .then(res => {
        setTicket(res.data.ticket)
        setComments(res.data.comments || [])
        setAttachments(res.data.attachments || [])
        setActivities(res.data.activities || [])
        setUsers(res.data.users || [])
        setGroups(res.data.groups || [])
        setSlaData(res.data.sla || null)
        if (!res.data.sla) setActiveTab((tab) => (tab === 'sla' ? 'conversation' : tab))
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch ticket details:', err)
        toast.error('Failed to load ticket details')
        setLoading(false)
      })
  }, [ticketUuid])

  // Start with a fresh reply when switching tickets
  useEffect(() => {
    setNewComment('')
    setCommentMentions([])
    setCommentFiles([])
    setCommentInternal(false)
    setComposerFocused(false)
  }, [ticketUuid])

  // Get CSRF token
  const getCsrfToken = () => 
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''

  // File handling functions
  const addFiles = (files) => {
    const fileList = Array.from(files)
    const newFiles = fileList.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }))
    setCommentFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (fileId) => {
    setCommentFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleFileSelect = (e) => {
    if (e.target.files?.length) {
      addFiles(e.target.files)
    }
    e.target.value = '' // Reset input
  }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files = []
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      e.stopPropagation()
      addFiles(files)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer?.files
    if (files?.length) {
      addFiles(files)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Upload a single file
  const uploadFile = async (fileObj) => {
    const formData = new FormData()
    formData.append('file', fileObj.file)

    const response = await api.post('/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    return response.data
  }

  // Handle attachment upload from drawer
  const handleAttachmentUpload = async () => {
    if (!selectedAttachmentFile) {
      toast.error('Please select a file')
      return
    }

    setAttachmentUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedAttachmentFile)

      const uploadRes = await api.post('/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const uploadData = uploadRes.data

      await api.post(`/tickets/${ticket.uuid}/attachment/`, {
        file_url: uploadData.file_url,
        file_name: uploadData.file_name,
        file_size: uploadData.file_size,
        file_type: uploadData.file_type,
        is_internal: isAttachmentInternal,
      })

      toast.success('File attached successfully')
      setShowAttachmentModal(false)
      setSelectedAttachmentFile(null)
      setIsAttachmentInternal(false)
      
      // Refresh attachments
      const response = await api.get(`/tickets/${ticketUuid}/detail-api/`)
      setAttachments(response.data.attachments || [])
    } catch (error) {
      toast.error(error.message || 'Failed to upload attachment')
    } finally {
      setAttachmentUploading(false)
    }
  }

  // Reload the conversation without leaving the split view
  const refreshConversation = async () => {
    try {
      const res = await api.get(`/tickets/${ticketUuid}/detail-api/`)
      setComments(res.data.comments || [])
      setAttachments(res.data.attachments || [])
      setActivities(res.data.activities || [])
    } catch {
      toast.error('Failed to refresh conversation')
    }
  }

  // Submit comment
  const handleSubmitComment = async () => {
    const commentEmpty = isRichTextEmpty(newComment)
    if (commentEmpty && commentFiles.length === 0) {
      toast.error('Please enter a comment or attach files')
      return
    }

    setProcessing(true)
    try {
      // Upload files first
      const uploadedAttachments = []
      for (const fileObj of commentFiles) {
        const uploadData = await uploadFile(fileObj)
        uploadedAttachments.push({
          file_url: uploadData.file_url,
          file_name: uploadData.file_name,
          file_size: uploadData.file_size,
          file_type: uploadData.file_type
        })
      }

      // Submit comment with attachments
      await api.post(`/tickets/${ticketUuid}/comment/`, {
        message: commentEmpty ? '' : newComment,
        is_internal: commentInternal,
        mentions: commentMentions,
        attachments: uploadedAttachments
      })

      toast.success('Reply sent')
      setNewComment('')
      setCommentInternal(false)
      setCommentFiles([])
      setCommentMentions([])
      
      await refreshConversation()
    } catch (error) {
      toast.error('Failed to send reply')
    } finally {
      setProcessing(false)
    }
  }

  // Collapsed until focused, or while it holds content / attachments
  const composerExpanded = composerFocused || !isRichTextEmpty(newComment) || commentFiles.length > 0 || processing
  const focusComposer = () => {
    clearTimeout(composerBlurTimer.current)
    setComposerFocused(true)
  }
  const blurComposer = () => {
    clearTimeout(composerBlurTimer.current)
    // Let toolbar clicks land before collapsing
    composerBlurTimer.current = setTimeout(() => setComposerFocused(false), 150)
  }

  // Update ticket field
  const updateField = (field, value) => {
    api.post(`/tickets/${ticketUuid}/update/`, { [field]: value })
      .then(() => {
        toast.success('Ticket updated')
        // Refresh ticket data
        return api.get(`/tickets/${ticketUuid}/detail-api/`)
      })
      .then(res => {
        setTicket(res.data.ticket)
        // Notify parent to refresh tickets list
        if (onTicketUpdate) onTicketUpdate()
      })
      .catch(() => toast.error('Failed to update ticket'))
  }

  // Update ticket status
  const updateStatus = async (picked) => {
    // "resume" moves an on-hold ticket back to In Progress and restarts its SLA clock
    const newStatus = picked === 'resume' ? 'in_progress' : picked
    const isReopening = isReadOnly && !ticket?.is_merged
    const formData = new URLSearchParams()
    formData.append('status', newStatus)

    try {
      if (picked === 'resume' && ticket?.sla_info?.is_on_hold) {
        await api.post(`/sla/api/tickets/${ticketUuid}/sla/resume/`)
      } else if (newStatus === 'pending' && ticket?.sla_info && !ticket.sla_info.is_on_hold) {
        await api.post(`/sla/api/tickets/${ticketUuid}/sla/hold/`, { reason: 'Ticket placed on hold' })
      }
    } catch {
      toast.error('Failed to update the SLA timer')
      return
    }

    api.post(`/tickets/${ticketUuid}/status/`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
      .then(() => {
        toast.success(picked === 'resume' ? 'Ticket resumed' : isReopening ? 'Ticket reopened' : 'Status updated')
        // Refresh ticket data
        return api.get(`/tickets/${ticketUuid}/detail-api/`)
      })
      .then(res => {
        setTicket(res.data.ticket)
        // Notify parent to refresh tickets list
        if (onTicketUpdate) onTicketUpdate()
      })
      .catch(() => toast.error('Failed to update status'))
  }

  // Live SLA countdown
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!ticket?.sla_info || ticket.sla_info.is_on_hold) return
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [ticket?.sla_info?.is_on_hold])

  const getLiveSlaTime = (dueAt) => {
    if (!dueAt) return null
    const diff = Math.floor((new Date(dueAt).getTime() - Date.now()) / 1000)
    const abs = Math.abs(diff)
    const days = Math.floor(abs / 86400)
    const hours = Math.floor((abs % 86400) / 3600)
    const minutes = Math.floor((abs % 3600) / 60)
    const seconds = abs % 60
    let text = ''
    if (days > 0) text += `${days}d `
    if (hours > 0 || days > 0) text += `${hours}h `
    text += `${minutes}m ${String(seconds).padStart(2, '0')}s`
    return { text: text.trim(), isOverdue: diff < 0 }
  }

  // Format SLA time display (fallback for static values)
  const formatSlaTime = (hours) => {
    if (hours === null || hours === undefined) return null
    if (hours < 1) {
      const minutes = Math.round(hours * 60)
      return `${minutes}m`
    } else if (hours < 24) {
      const h = Math.floor(hours)
      const m = Math.round((hours % 1) * 60)
      return m > 0 ? `${h}h ${m}m` : `${h}h`
    } else {
      const days = Math.floor(hours / 24)
      const remainingHours = Math.round(hours % 24)
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
    }
  }

  if (loading) {
    return (
      <div className="flex-1 min-w-0 flex flex-col bg-gray-50">
        {/* Header Skeleton */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 w-14 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 w-14 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-5 w-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse hidden sm:block"></div>
              <div className="h-8 w-24 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Status Stepper Skeleton */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="h-3 flex-1 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs + Details Skeleton */}
        <div className="flex flex-1 min-h-0">
          {/* Left column */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Tabs Skeleton */}
            <div className="bg-white border-b border-gray-200">
              <div className="flex gap-4 px-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-8 w-24 bg-gray-200 rounded animate-pulse my-2"></div>
                ))}
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Box Skeleton */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="h-16 bg-gray-100 rounded animate-pulse mb-3"></div>
                <div className="flex justify-between items-center">
                  <div className="flex gap-3">
                    <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="h-8 w-24 bg-gray-200 rounded-md animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Details pane skeleton */}
          <aside className="flex w-64 2xl:w-72 flex-shrink-0 flex-col border-l border-gray-200 bg-white">
            <div className="h-11 px-3 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-6 h-6 rounded bg-gray-200 animate-pulse"></div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-1.5">
              <div className="divide-y divide-gray-100">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse flex-shrink-0"></div>
                    <div className="h-5 flex-1 bg-gray-100 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-16 h-16 mx-auto text-gray-300 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm">Failed to load ticket details</p>
          </div>
        </div>
      </div>
    )
  }

  const detailRows = [
    {
      key: 'assignee',
      node: (
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
            onPick={(value) => updateField('assignee', value || null)}
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
      ),
    },
    {
      key: 'group',
      node: (
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
            onPick={(value) => updateField('group', value || null)}
          >
            <span className={`text-sm truncate ${ticket.group?.name ? 'text-gray-900' : 'text-gray-400'}`}>
              {ticket.group?.name || 'None'}
            </span>
          </FieldPopover>
        </DetailRow>
      ),
    },
    {
      key: 'priority',
      node: (
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
            onPick={(value) => updateField('priority', value)}
          >
            <PriorityIcon priority={ticket.priority} />
            <span className="text-sm text-gray-900 truncate">{ticket.priority_display || ticket.priority}</span>
          </FieldPopover>
        </DetailRow>
      ),
    },
    {
      key: 'type',
      node: (
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
            onPick={(value) => updateField('type', value)}
          >
            <span className="text-sm text-gray-900 truncate">{ticket.type_display || ticket.type || 'Question'}</span>
          </FieldPopover>
        </DetailRow>
      ),
    },
    {
      key: 'requester',
      node: (
        <DetailRow stacked icon={Mail} label="Requester">
          <div className="px-2 py-1.5 min-w-0">
            <div className="flex items-center gap-2 text-sm text-gray-900">
              <MiniAvatar user={ticket.requester} size="w-6 h-6 text-[10px]" />
              <span className="truncate">{ticket.requester?.name || 'Unknown'}</span>
              {ticket.is_guest_ticket && <span className="px-1.5 rounded bg-gray-100 text-[10px] font-medium text-gray-500">Guest</span>}
            </div>
            {ticket.requester?.email && (
              <a href={`mailto:${ticket.requester.email}`} className="mt-0.5 block text-xs text-gray-500 hover:text-[#0B3D26] truncate">{ticket.requester.email}</a>
            )}
          </div>
        </DetailRow>
      ),
    },
    ...(ticket.department ? [{
      key: 'department',
      node: (
        <DetailRow stacked icon={Building2} label="Department">
          <span className="block px-2 py-1.5 text-sm text-gray-900 truncate">{ticket.department}</span>
        </DetailRow>
      ),
    }] : []),
    {
      key: 'channel',
      node: (
        <DetailRow stacked icon={GlobalOutlined} label="Channel">
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            {ticket.channel ? (
              <>
                <span
                  className="w-5 h-5 flex items-center justify-center rounded text-xs"
                  style={{ backgroundColor: ticket.channel.icon_bg || '#f3f4f6', color: ticket.channel.icon_color || '#6b7280' }}
                >
                  {(() => {
                    const IconComp = CHANNEL_ICON_MAP[ticket.channel.icon]
                    return IconComp ? <IconComp /> : <GlobalOutlined />
                  })()}
                </span>
                <span className="text-sm text-gray-900">{ticket.channel.name}</span>
              </>
            ) : (
              <>
                <span className="w-5 h-5 flex items-center justify-center rounded bg-blue-100 text-blue-600 text-xs">🌐</span>
                <span className="text-sm text-gray-900">{ticket.source || 'Web'}</span>
              </>
            )}
          </div>
        </DetailRow>
      ),
    },
    {
      key: 'tags',
      node: (
        <DetailRow stacked icon={Tag} label="Tags">
          <TagsField
            tags={ticket.tags || []}
            readOnly={isReadOnly}
            onSave={(tags) => updateField('tags', tags)}
          />
        </DetailRow>
      ),
    },
    {
      key: 'watchers',
      node: (
        <DetailRow stacked icon={Eye} label="Watchers">
          <WatchersField
            watchers={ticket.watchers || []}
            users={users}
            readOnly={isMerged}
            onSave={(ids) => updateField('watchers', ids)}
          />
        </DetailRow>
      ),
    },
  ]

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3.5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="tabular-nums">{ticket.ticket_number}</span>
              <span className="text-gray-300">·</span>
              <PriorityIcon priority={ticket.priority} showLabel />
            </div>
            <h2 className="mt-1 text-base font-semibold text-gray-900 leading-snug line-clamp-2">{ticket.title}</h2>
          </div>
          <Link
            href={`/tickets/${ticket.uuid}/`}
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors flex-shrink-0"
          >
            Open <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <StatusMenu
            compact
            status={computedStatus || 'new'}
            onPick={updateStatus}
            disabled={!!ticket.is_merged}
          />
          <div className="flex-1" />
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
            <MiniAvatar user={ticket.assignee} />
            <span className="hidden sm:inline truncate max-w-[8rem]">{ticket.assignee?.name || 'Unassigned'}</span>
          </span>
        </div>
        <div className="mt-3">
          <StatusTrack status={ticket.computed_status || ticket.status} compact />
        </div>
      </div>

      {/* SLA Info */}
      {ticket.sla_info && (
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500">SLA:</span>
            {ticket.sla_info.policy_name && (
              <span className="font-medium text-gray-700">{ticket.sla_info.policy_name}</span>
            )}
            {ticket.sla_info.is_on_hold ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                On Hold
              </span>
            ) : ticket.sla_info.resolution?.breached ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Breached
              </span>
            ) : ticket.sla_info.overall_status === 'at_risk' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                At Risk
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                On Track
              </span>
            )}
            {ticket.sla_info.resolution?.due_at && !ticket.sla_info.resolution?.breached && !ticket.sla_info.is_on_hold && (() => {
              const live = getLiveSlaTime(ticket.sla_info.resolution.due_at)
              if (!live) return null
              if (live.isOverdue) return (
                <span className="text-red-600 font-medium font-mono tabular-nums">
                  −{live.text} overdue
                </span>
              )
              return (
                <span className={`font-mono tabular-nums ${live.text.includes('0h') || (!live.text.includes('d') && !live.text.includes('h')) ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {live.text} remaining
                </span>
              )
            })()}
            {ticket.sla_info.resolution?.due_at && ticket.sla_info.resolution?.breached && (() => {
              const live = getLiveSlaTime(ticket.sla_info.resolution.due_at)
              if (!live) return null
              return (
                <span className="text-red-600 font-medium font-mono tabular-nums">
                  −{live.text} overdue
                </span>
              )
            })()}
          </div>
        </div>
      )}

      {/* Tabs + Details */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-3 py-2">
            <Tabs
              label="Ticket sections"
              compact
              active={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: 'conversation', icon: MessagesSquare, label: 'Conversation', count: comments.length },
                { id: 'attachments', icon: Paperclip, label: 'Attachments', count: attachments.length },
                { id: 'activity', icon: Activity, label: 'Activity', count: activities.length },
                ...(slaData ? [{ id: 'sla', icon: Timer, label: 'SLA' }] : []),
              ]}
            />
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'conversation' && (
              <ConversationTab
                ticket={ticket}
                comments={comments}
                hideForm
                onRefresh={refreshConversation}
              />
            )}

            {activeTab === 'attachments' && (
              <AttachmentsTab
                attachments={attachments}
                onAddAttachment={() => setShowAttachmentModal(true)}
              />
            )}

            {activeTab === 'activity' && (
              <ActivityTimeline activities={activities} />
            )}

            {activeTab === 'sla' && slaData && <SLATab slaData={slaData} />}
          </div>

          {/* Reply Box */}
          <div className="bg-white border-t border-gray-200 p-4">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />
        
            <div 
              className={`conversation-composer rounded-xl overflow-visible relative transition-colors ${
                composerExpanded ? 'is-expanded' : ''
              } ${isDragging ? 'ring-2 ring-[#0B3D26]/40' : ''}`}
              onClick={() => { if (!composerExpanded) composerEditorRef.current?.focus?.() }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onPasteCapture={handlePaste}
            >
              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 bg-purple-50/90 flex items-center justify-center z-10 rounded-xl">
                  <div className="text-center">
                    <svg className="w-8 h-8 text-[#0B3D26] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-[#0B3D26]">Drop files here</p>
                  </div>
                </div>
              )}
          
              {/* Input area */}
              <RichEditor
                key={ticketUuid}
                compact
                mentions
                internal={commentInternal}
                editorRef={(ref) => { composerEditorRef.current = ref }}
                value={newComment}
                onChange={setNewComment}
                onMentionsChange={setCommentMentions}
                onFocus={focusComposer}
                onBlur={blurComposer}
                placeholder="Write a reply… (use @ to mention, paste or drop files)"
              />
          
              {/* Attached files preview */}
              {commentFiles.length > 0 && (
                <div className="pt-2">
                  <div className="flex flex-wrap gap-2">
                    {commentFiles.map(file => (
                      <div 
                        key={file.id} 
                        className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded text-xs"
                      >
                        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-gray-700 truncate max-w-[120px]">{file.name}</span>
                        <span className="text-gray-400">({formatFileSize(file.size)})</span>
                        <button 
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-500 ml-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          
              {/* Bottom bar with icons and send button */}
              {composerExpanded && (
              <div className="flex items-center justify-between pt-2">
                {/* Left side - attachment and emoji icons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Attach file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Add emoji"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
            
                {/* Right side - Send button with dropdown */}
                <div className="relative" ref={sendDropdownRef}>
                  {/* Dropdown menu - appears above button */}
                  {showSendDropdown && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-gray-200 -lg z-20">
                      <button
                        type="button"
                        onClick={() => {
                          setCommentInternal(false)
                          setShowSendDropdown(false)
                          focusComposer()
                          composerEditorRef.current?.focus?.()
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg flex items-center gap-2 ${
                          !commentInternal ? 'text-[#0B3D26] font-medium' : 'text-gray-700'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Comment
                        {!commentInternal && (
                          <svg className="w-4 h-4 ml-auto text-[#0B3D26]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCommentInternal(true)
                          setShowSendDropdown(false)
                          focusComposer()
                          composerEditorRef.current?.focus?.()
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-b-lg flex items-center gap-2 ${
                          commentInternal ? 'text-[#0B3D26] font-medium' : 'text-gray-700'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Internal Note
                        {commentInternal && (
                          <svg className="w-4 h-4 ml-auto text-[#0B3D26]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
              
                  <div className="flex">
                    {/* Main send button */}
                    <button
                      onClick={handleSubmitComment}
                      disabled={processing || (isRichTextEmpty(newComment) && commentFiles.length === 0)}
                      className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-[#0B3D26] rounded-l-md hover:bg-[#14502F] transition-colors disabled:opacity-50"
                    >
                      {processing ? 'Sending...' : (commentInternal ? 'Note' : 'Comment')}
                    </button>
                    {/* Dropdown toggle */}
                    <button
                      type="button"
                      onClick={() => setShowSendDropdown(!showSendDropdown)}
                      className="px-2 py-1.5 text-white bg-[#0B3D26] border-l border-[#14502F] rounded-r-md hover:bg-[#14502F] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>

        {/* Details pane */}
        {detailsOpen ? (
          <aside className="flex w-64 2xl:w-72 flex-shrink-0 flex-col border-l border-gray-200 bg-white">
            <div className="h-11 px-3 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Details</h2>
              <div className="flex items-center gap-1.5">
                {isReadOnly && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-400" title="Reopen the ticket to edit it">
                    <Lock className="w-3 h-3" /> Read-only
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                  title="Hide details"
                  aria-label="Hide details"
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <PanelRightClose className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <dl className="px-2 py-1.5 divide-y divide-gray-100">
                {detailRows.map((row) => (
                  <React.Fragment key={row.key}>{row.node}</React.Fragment>
                ))}
              </dl>
            </div>
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            title="Show details"
            aria-label="Show details"
            className="w-9 flex-shrink-0 flex flex-col items-center gap-2 border-l border-gray-200 bg-white pt-3 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <PanelRightOpen className="w-4 h-4" />
            <span className="text-[10px] font-medium uppercase tracking-wide [writing-mode:vertical-rl]">Details</span>
          </button>
        )}
      </div>

      {/* Attachment Drawer */}
      <AttachmentModal
        isOpen={showAttachmentModal}
        onClose={() => setShowAttachmentModal(false)}
        selectedFile={selectedAttachmentFile}
        setSelectedFile={setSelectedAttachmentFile}
        isInternal={isAttachmentInternal}
        setIsInternal={setIsAttachmentInternal}
        uploading={attachmentUploading}
        onUpload={handleAttachmentUpload}
      />
    </div>
  )
}
