import React, { useState, useEffect, useRef } from 'react'
import { Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import Avatar from '../../../components/Avatar'
import TicketStatusStepper from '../TicketStatusStepper'
import Select from '../SearchableSelect'
import { COLORS } from '../../constants/theme'
import AttachmentsTab from './AttachmentsTab'
import ConversationTab from './ConversationTab'
import NotesTab from './NotesTab'
import ActivityTimeline from '../../../components/ActivityTimeline'
import { AttachmentDrawer } from './TicketModals'
import api from '../../../utils/axios'
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
  const [activeTab, setActiveTab] = useState('conversation')
  const [newComment, setNewComment] = useState('')
  const [commentInternal, setCommentInternal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const textareaRef = useRef(null)
  const [showSendDropdown, setShowSendDropdown] = useState(false)
  const sendDropdownRef = useRef(null)
  const [editingField, setEditingField] = useState(null)

  // Read-only when ticket is closed, resolved, or merged
  const computedStatus = ticket?.computed_status || ticket?.status
  const isReadOnly = computedStatus === 'closed' || computedStatus === 'resolved' || ticket?.is_merged

  const handleEditClick = (field) => {
    if (isReadOnly) return
    setEditingField(field)
  }
  
  // File attachment state
  const [commentFiles, setCommentFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  
  // Attachment drawer state
  const [showAttachmentDrawer, setShowAttachmentDrawer] = useState(false)
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState(null)
  const [isAttachmentInternal, setIsAttachmentInternal] = useState(false)
  const [attachmentUploading, setAttachmentUploading] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sendDropdownRef.current && !sendDropdownRef.current.contains(event.target)) {
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
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch ticket details:', err)
        toast.error('Failed to load ticket details')
        setLoading(false)
      })
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
      setShowAttachmentDrawer(false)
      setSelectedAttachmentFile(null)
      setIsAttachmentInternal(false)
      
      // Refresh attachments
      const response = await api.get(`/tickets/${ticketUuid}/detail/`)
      setAttachments(response.data.attachments || [])
    } catch (error) {
      toast.error(error.message || 'Failed to upload attachment')
    } finally {
      setAttachmentUploading(false)
    }
  }

  // Submit comment
  const handleSubmitComment = async () => {
    if (!newComment.trim() && commentFiles.length === 0) {
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
        message: newComment,
        is_internal: commentInternal,
        attachments: uploadedAttachments
      })

      toast.success('Reply sent')
      setNewComment('')
      setCommentInternal(false)
      setCommentFiles([])
      
      // Refresh ticket data
      const refreshRes = await api.get(`/tickets/${ticketUuid}/detail-api/`)
      setComments(refreshRes.data.comments || [])
      setAttachments(refreshRes.data.attachments || [])
    } catch (error) {
      toast.error('Failed to send reply')
    } finally {
      setProcessing(false)
    }
  }

  // Update ticket field
  const updateField = (field, value) => {
    api.post(`/tickets/${ticketUuid}/update/`, { [field]: value })
      .then(() => {
        toast.success('Ticket updated')
        setEditingField(null)
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
  const updateStatus = (newStatus) => {
    const formData = new URLSearchParams()
    formData.append('status', newStatus)
    
    api.post(`/tickets/${ticketUuid}/status/`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
      .then(() => {
        toast.success('Status updated')
        setEditingField(null)
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

  // Tab styling
  const getTabClass = (tabName) => {
    const isActive = activeTab === tabName
    const base = 'px-3 py-2 text-xs font-medium border-b-2'
    return `${base} ${
      isActive
        ? 'border-[#4a154b] text-[#4a154b]'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
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

        {/* Details Skeleton */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-3 w-14 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

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

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[#4a154b]">#{ticket.ticket_number}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                ticket.computed_status === 'new' ? 'bg-purple-100 text-purple-700' :
                ticket.computed_status === 'open' ? 'bg-blue-100 text-blue-700' :
                ticket.computed_status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                ticket.computed_status === 'pending' ? 'bg-orange-100 text-orange-700' :
                ticket.computed_status === 'resolved' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {ticket.computed_status?.replace('_', ' ')}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                ticket.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                ticket.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {ticket.priority}
              </span>
            </div>
            <h2 className="text-base font-semibold text-gray-900 truncate">{ticket.title}</h2>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-6 h-6 rounded-full bg-[#4a154b]/10 flex items-center justify-center text-[#4a154b] font-medium text-xs">
                {ticket.assignee?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="hidden sm:inline">{ticket.assignee?.name || 'Unassigned'}</span>
            </div>
            <Link
              href={`/tickets/${ticket.uuid}/`}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#4a154b] rounded-md hover:bg-[#3a1039] transition-colors"
            >
              Open Full View
            </Link>
          </div>
        </div>
      </div>

      {/* Status Stepper */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-xs text-gray-500">Status:</span>
          {editingField === 'status' ? (
            <div className="w-40">
              <Select
                value={ticket.computed_status || ticket.status || 'new'}
                onChange={(value) => {
                  updateStatus(value)
                  setEditingField(null)
                }}
                options={[
                  { id: 'new', name: 'New' },
                  { id: 'open', name: 'Open' },
                  { id: 'in_progress', name: 'In Progress' },
                  { id: 'pending', name: 'On Hold' },
                  { id: 'resolved', name: 'Resolved' },
                ]}
                placeholder="Select status"
                allowClear={false}
                className="text-sm"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                ticket.computed_status === 'new' ? 'bg-purple-100 text-purple-700' :
                ticket.computed_status === 'open' ? 'bg-blue-100 text-blue-700' :
                ticket.computed_status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                ticket.computed_status === 'pending' ? 'bg-orange-100 text-orange-700' :
                ticket.computed_status === 'resolved' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {ticket.computed_status?.replace('_', ' ') || ticket.status?.replace('_', ' ')}
              </span>
              {!isReadOnly && (
                <button
                  onClick={() => handleEditClick('status')}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#4a154b] transition-opacity"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
        <TicketStatusStepper currentStatus={ticket.computed_status || ticket.status} />
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

      {/* Ticket Details */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Priority:</span>
            {editingField === 'priority' ? (
              <div className="w-32">
                <Select
                  value={ticket.priority || 'normal'}
                  onChange={(value) => {
                    updateField('priority', value)
                    setEditingField(null)
                  }}
                  options={[
                    { id: 'low', name: 'Low' },
                    { id: 'normal', name: 'Normal' },
                    { id: 'high', name: 'High' },
                    { id: 'urgent', name: 'Urgent' },
                  ]}
                  placeholder="Select priority"
                  allowClear={false}
                  className="text-sm"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1 group">
                <span className={`font-medium ${
                  ticket.priority === 'urgent' ? 'text-red-600' :
                  ticket.priority === 'high' ? 'text-orange-600' :
                  ticket.priority === 'normal' ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {ticket.priority_display || ticket.priority}
                </span>
                {!isReadOnly && (
                  <button
                    onClick={() => handleEditClick('priority')}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#4a154b] transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Assignee:</span>
            {editingField === 'assignee' ? (
              <div className="w-40">
                <Select
                  value={ticket.assignee?.id || ''}
                  onChange={(value) => {
                    updateField('assignee', value || null)
                    setEditingField(null)
                  }}
                  options={users}
                  placeholder="Unassigned"
                  searchable={true}
                  className="text-sm"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1 group">
                <span className="font-medium text-gray-900 truncate max-w-[100px]">
                  {ticket.assignee?.name || 'Unassigned'}
                </span>
                {!isReadOnly && (
                  <button
                    onClick={() => handleEditClick('assignee')}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#4a154b] transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Group */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Group:</span>
            {editingField === 'group' ? (
              <div className="w-40">
                <Select
                  value={ticket.group?.id || ''}
                  onChange={(value) => {
                    updateField('group', value || null)
                    setEditingField(null)
                  }}
                  options={groups}
                  placeholder="None"
                  searchable={true}
                  className="text-sm"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1 group">
                <span className="font-medium text-gray-900 truncate max-w-[100px]">
                  {ticket.group?.name || 'None'}
                </span>
                {!isReadOnly && (
                  <button
                    onClick={() => handleEditClick('group')}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#4a154b] transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Type */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Type:</span>
            {editingField === 'type' ? (
              <div className="w-32">
                <Select
                  value={ticket.type || 'question'}
                  onChange={(value) => {
                    updateField('type', value)
                    setEditingField(null)
                  }}
                  options={[
                    { id: 'question', name: 'Question' },
                    { id: 'incident', name: 'Incident' },
                    { id: 'problem', name: 'Problem' },
                    { id: 'task', name: 'Task' },
                  ]}
                  placeholder="Select type"
                  allowClear={false}
                  className="text-sm"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1 group">
                <span className="font-medium text-gray-900">
                  {ticket.type_display || ticket.type || 'Question'}
                </span>
                {!isReadOnly && (
                  <button
                    onClick={() => handleEditClick('type')}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#4a154b] transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Watchers */}
          <div className="flex items-center gap-2 relative">
            <span className="text-gray-500">Watchers:</span>
            {editingField === 'watchers' ? (
              <div className="absolute left-0 top-full z-50 mt-1 bg-white border border-gray-200 rounded shadow-lg p-2 max-h-40 overflow-y-auto min-w-[180px]">
                {users.map(user => (
                  <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded text-xs">
                    <input
                      type="checkbox"
                      checked={ticket.watchers?.some(w => w.id === user.id)}
                      onChange={(e) => {
                        const currentWatchers = ticket.watchers?.map(w => w.id) || []
                        let newWatchers
                        if (e.target.checked) {
                          newWatchers = [...currentWatchers, user.id]
                        } else {
                          newWatchers = currentWatchers.filter(id => id !== user.id)
                        }
                        updateField('watchers', newWatchers)
                      }}
                      className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                    />
                    <span className="text-gray-900">{user.name}</span>
                  </label>
                ))}
                <button
                  onClick={() => setEditingField(null)}
                  className="mt-2 w-full text-xs text-[#4a154b] hover:underline"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group">
                {ticket.watchers && ticket.watchers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {ticket.watchers.slice(0, 2).map((w, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        {w.name?.split(' ')[0]}
                      </span>
                    ))}
                    {ticket.watchers.length > 2 && (
                      <span className="text-xs text-gray-500">+{ticket.watchers.length - 2}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs">None</span>
                )}
                {!isReadOnly && (
                  <button
                    onClick={() => handleEditClick('watchers')}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#4a154b] transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Tags:</span>
            {editingField === 'tags' ? (
              <input
                type="text"
                autoFocus
                defaultValue={ticket.tags?.join(', ') || ''}
                onBlur={(e) => {
                  const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  updateField('tags', tags)
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.target.blur()
                  }
                }}
                placeholder="Tags, comma separated"
                className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4a154b] max-w-[150px]"
              />
            ) : (
              <div className="flex items-center gap-1 group">
                {ticket.tags && ticket.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {ticket.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    {ticket.tags.length > 2 && (
                      <span className="text-xs text-gray-500">+{ticket.tags.length - 2}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs">None</span>
                )}
                {!isReadOnly && (
                  <button
                    onClick={() => handleEditClick('tags')}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#4a154b] transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Channel/Source */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Channel:</span>
            <div className="flex items-center gap-1.5">
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
                  <span className="font-medium text-gray-900">{ticket.channel.name}</span>
                </>
              ) : (
                <>
                  <span className="w-5 h-5 flex items-center justify-center rounded bg-blue-100 text-blue-600 text-xs">🌐</span>
                  <span className="font-medium text-gray-900">{ticket.source || 'Web'}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          <button onClick={() => setActiveTab('conversation')} className={getTabClass('conversation')}>
            Conversation ({comments.filter(c => !c.is_internal).length})
          </button>
          <button onClick={() => setActiveTab('notes')} className={getTabClass('notes')}>
            Notes ({comments.filter(c => c.is_internal).length})
          </button>
          <button onClick={() => setActiveTab('attachments')} className={getTabClass('attachments')}>
            Attachments ({attachments.length})
          </button>
          <button onClick={() => setActiveTab('activity')} className={getTabClass('activity')}>
            Activity ({activities.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'conversation' && (
          <ConversationTab
            ticket={ticket}
            comments={comments}
            hideForm
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            comments={comments}
            hideForm
          />
        )}

        {activeTab === 'attachments' && (
          <AttachmentsTab 
            attachments={attachments} 
            onAddAttachment={() => setShowAttachmentDrawer(true)}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityTimeline activities={activities} />
        )}
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
          className={`border rounded-lg overflow-visible relative transition-colors ${
            isDragging ? 'border-[#4a154b] bg-purple-50' : 'border-gray-200'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-purple-50/90 flex items-center justify-center z-10 rounded-lg">
              <div className="text-center">
                <svg className="w-8 h-8 text-[#4a154b] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium text-[#4a154b]">Drop files here</p>
              </div>
            </div>
          )}
          
          {/* Input area */}
          <div className="p-3">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onPaste={handlePaste}
              placeholder="Write a reply here (paste or drop files)"
              className="w-full resize-none border-0 focus:ring-0 focus:outline-none text-sm placeholder-gray-400 bg-transparent"
              rows="2"
            />
          </div>
          
          {/* Attached files preview */}
          {commentFiles.length > 0 && (
            <div className="px-3 pb-2">
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
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-white rounded-b-lg">
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
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg flex items-center gap-2 ${
                      !commentInternal ? 'text-[#4a154b] font-medium' : 'text-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Comment
                    {!commentInternal && (
                      <svg className="w-4 h-4 ml-auto text-[#4a154b]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCommentInternal(true)
                      setShowSendDropdown(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-b-lg flex items-center gap-2 ${
                      commentInternal ? 'text-[#4a154b] font-medium' : 'text-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Internal Note
                    {commentInternal && (
                      <svg className="w-4 h-4 ml-auto text-[#4a154b]" fill="currentColor" viewBox="0 0 20 20">
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
                  disabled={processing || (!newComment.trim() && commentFiles.length === 0)}
                  className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-[#4a154b] rounded-l-md hover:bg-[#5a235c] transition-colors disabled:opacity-50"
                >
                  {processing ? 'Sending...' : (commentInternal ? 'Note' : 'Comment')}
                </button>
                {/* Dropdown toggle */}
                <button
                  type="button"
                  onClick={() => setShowSendDropdown(!showSendDropdown)}
                  className="px-2 py-1.5 text-white bg-[#4a154b] border-l border-[#5a235c] rounded-r-md hover:bg-[#5a235c] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attachment Drawer */}
      <AttachmentDrawer
        isOpen={showAttachmentDrawer}
        onClose={() => setShowAttachmentDrawer(false)}
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
