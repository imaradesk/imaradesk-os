import React, { useState, useEffect, useRef } from 'react'
import { Head, useForm, router, usePage } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import Select from '../components/SearchableSelect'
import TicketStatusStepper from '../components/TicketStatusStepper'
import Button from '../../components/Button'
import Textarea from '../../components/Textarea'
import Avatar from '../../components/Avatar'
import CommentBubble from '../../components/CommentBubble'
import ActivityTimeline from '../../components/ActivityTimeline'
import ConfirmDialog from '../components/ConfirmDialog'
import Drawer, { DrawerBody, DrawerFooter } from '../components/Drawer'
import { THEME, COLORS } from '../constants/theme'
import { csrfFetch } from '../../utils/csrf'

export default function TicketView({ ticket, comments = [], attachments = [], activities = [], users = [], groups = [], sla = null }) {
  const { props } = usePage()
  const currentUser = props.auth?.user
  const [activeTab, setActiveTab] = useState('conversation')
  const [editingField, setEditingField] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [commentInternal, setCommentInternal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showWorkItemModal, setShowWorkItemModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completingWorkItem, setCompletingWorkItem] = useState(null)
  const [completionNotes, setCompletionNotes] = useState('')
  const [editingWorkItem, setEditingWorkItem] = useState(null)
  const [workItems, setWorkItems] = useState([])
  const [showHoldModal, setShowHoldModal] = useState(false)
  const [holdReason, setHoldReason] = useState('')
  const [slaData, setSlaData] = useState(sla)
  const [showResumeConfirm, setShowResumeConfirm] = useState(false)
  const [workItemForm, setWorkItemForm] = useState({
    title: '',
    description: '',
    priority: 'normal',
    assignee: null,
    due_date: '',
    work_notes: ''
  })
  const [loading, setLoading] = useState(true)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [showAttachmentDrawer, setShowAttachmentDrawer] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [attachmentIsInternal, setAttachmentIsInternal] = useState(false)
  const attachmentInputRef = useRef(null)
  
  // Notes tab state
  const [statusNote, setStatusNote] = useState('')
  const [pendingStatusAction, setPendingStatusAction] = useState(null) // { type: 'assign' | 'status', value?: string }
  const notesInputRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const fetchWorkItems = () => {
    fetch(`/tickets/${ticket.id}/work-items/`)
      .then(res => res.json())
      .then(data => setWorkItems(data.work_items || []))
      .catch(() => toast.error('Failed to fetch work items'))
  }

  useEffect(() => {
    fetchWorkItems()
  }, [ticket.id])

  const handleAttachmentUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    setUploadingAttachment(true)
    try {
      // First upload the file
      const formData = new FormData()
      formData.append('file', selectedFile)

      const uploadRes = await csrfFetch('/upload/', {
        method: 'POST',
        body: formData,
      })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload file')
      }

      // Then attach to ticket
      const attachRes = await csrfFetch(`/tickets/${ticket.id}/attachment/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: uploadData.url,
          file_name: uploadData.name,
          file_size: uploadData.size,
          file_type: uploadData.content_type,
          is_internal: attachmentIsInternal,
        }),
      })

      if (!attachRes.ok) {
        throw new Error('Failed to attach file to ticket')
      }

      toast.success('File attached successfully')
      setShowAttachmentDrawer(false)
      setSelectedFile(null)
      setAttachmentIsInternal(false)
      router.reload()
    } catch (error) {
      toast.error(error.message || 'Failed to upload attachment')
    } finally {
      setUploadingAttachment(false)
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = ''
      }
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const createWorkItem = () => {
    if (!workItemForm.title.trim()) {
      toast.error('Title is required')
      return
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    const url = editingWorkItem 
      ? `/tickets/${ticket.id}/work-items/${editingWorkItem.id}/update/`
      : `/tickets/${ticket.id}/work-items/create/`

    fetch(url, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workItemForm)
    }).then(res => {
      if (!res.ok) throw new Error('Failed to save work item')
      return res.json()
    }).then(() => {
      toast.success(editingWorkItem ? 'Work item updated successfully' : 'Work item created successfully')
      setShowWorkItemModal(false)
      setEditingWorkItem(null)
      setWorkItemForm({ title: '', description: '', priority: 'normal', assignee: null, due_date: '', work_notes: '' })
      fetchWorkItems()
      router.reload({ preserveScroll: true })
    }).catch(() => {
      toast.error('Failed to save work item')
    })
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
      work_notes: item.work_notes || ''
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

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    fetch(`/tickets/${ticket.id}/work-items/${completingWorkItem.id}/update/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'done', work_notes: completionNotes })
    }).then(res => {
      if (!res.ok) throw new Error('Failed to complete work item')
      return res.json()
    }).then(() => {
      toast.success('Work item marked as complete')
      setShowCompleteModal(false)
      setCompletingWorkItem(null)
      setCompletionNotes('')
      fetchWorkItems()
      router.reload({ preserveScroll: true })
    }).catch(() => {
      toast.error('Failed to update work item')
    })
  }

  const updateField = (field, value) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    const payload = { [field]: value }

    fetch(`/tickets/${ticket.id}/update/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    }).then(res => res.json()).then(() => {
      toast.success('Ticket updated')
      setEditingField(null)
      router.reload({ preserveScroll: true })
    }).catch(() => {
      toast.error('Failed to update ticket')
    })
  }

  const handleSubmitComment = (commentData = null) => {
    const payload = commentData || {
      message: newComment,
      is_internal: commentInternal,
    }
    
    if (!payload.message.trim()) {
      toast.error('Please enter a comment')
      return
    }

    setProcessing(true)
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''

    fetch(`/tickets/${ticket.id}/comment/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    }).then(res => {
      if (!res.ok) throw new Error('Failed to add comment')
      return res.json()
    }).then(() => {
      toast.success('Comment added successfully')
      setNewComment('')
      setCommentInternal(false)
      setProcessing(false)
      router.reload({ preserveScroll: true })
    }).catch(() => {
      toast.error('Failed to add comment')
      setProcessing(false)
    })
  }

  const handleHoldSLA = () => {
    if (!holdReason.trim()) {
      toast.error('Please enter a hold reason')
      return
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    fetch(`/sla/api/tickets/${ticket.id}/sla/hold/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: holdReason })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        toast.success('SLA timer has been put on hold')
        setSlaData(prev => ({ ...prev, ...data.sla }))
        
        const reasonToSave = holdReason
        setShowHoldModal(false)
        setHoldReason('')
        
        // Add hold reason as a comment
        fetch(`/tickets/${ticket.id}/comment/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Ticket placed on hold. Reason: ${reasonToSave}`,
            is_internal: true
          })
        }).then(() => {
          // Update ticket status to pending
          const formData = new URLSearchParams()
          formData.append('status', 'pending')
          
          fetch(`/tickets/${ticket.id}/status/`, {
            method: 'POST',
            headers: {
              'X-CSRFToken': csrfToken,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
          }).then(() => {
            router.reload()
          }).catch(() => {
            toast.error('Failed to update ticket status')
          })
        }).catch(() => {
          toast.error('Failed to add hold comment')
          router.reload()
        })
      } else {
        toast.error(data.message || 'Failed to hold SLA')
      }
    }).catch(() => {
      toast.error('Failed to hold SLA')
    })
  }

  const handleResumeSLA = () => {
    if (!confirm('Are you sure you want to resume the SLA timer?')) return

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    fetch(`/sla/api/tickets/${ticket.id}/sla/resume/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
        'Content-Type': 'application/json',
      },
    }).then(res => res.json()).then(data => {
      if (data.success) {
        toast.success('SLA timer has been resumed')
        setSlaData(prev => ({ ...prev, ...data.sla }))
      } else {
        toast.error(data.message || 'Failed to resume SLA')
      }
    }).catch(() => {
      toast.error('Failed to resume SLA')
    })
  }

  const handleResumeTicket = () => {
    setShowResumeConfirm(true)
  }

  const confirmResumeTicket = () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    
    // First resume SLA if exists
    if (slaData && slaData.is_on_hold) {
      fetch(`/sla/api/tickets/${ticket.id}/sla/resume/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken,
          'Content-Type': 'application/json',
        },
      }).then(res => res.json()).then(data => {
        if (data.success) {
          toast.success('SLA timer has been resumed')
          setSlaData(prev => ({ ...prev, ...data.sla }))
        }
      }).catch(() => {
        toast.error('Failed to resume SLA')
      })
    }

    // Update ticket status to in_progress
    const formData = new URLSearchParams()
    formData.append('status', 'in_progress')
    
    fetch(`/tickets/${ticket.id}/status/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    }).then(() => {
      toast.success('Ticket resumed')
      router.reload()
    }).catch(() => {
      toast.error('Failed to update ticket status')
    })
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''

    try {
      // First upload the file to get its URL
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const uploadResponse = await fetch('/upload/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        body: uploadFormData,
      })

      if (!uploadResponse.ok) throw new Error('Upload failed')
      
      const uploadData = await uploadResponse.json()

      // Then attach it to the ticket
      const attachFormData = new FormData()
      attachFormData.append('file_url', uploadData.file_url)
      attachFormData.append('file_name', uploadData.file_name)
      attachFormData.append('file_size', uploadData.file_size)
      attachFormData.append('file_type', uploadData.file_type)

      const attachResponse = await fetch(`/tickets/${ticket.id}/attachment/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        body: attachFormData,
      })

      if (!attachResponse.ok) throw new Error('Attachment failed')

      toast.success('File uploaded successfully')
      router.reload({ preserveScroll: true })
    } catch (error) {
      toast.error('Failed to upload file')
    }
  }

  const updateStatus = (newStatus) => {
    // If status is changing to pending/hold and ticket has SLA, show hold modal first
    if ((newStatus === 'pending' || newStatus === 'hold') && slaData && !slaData.is_on_hold) {
      setShowHoldModal(true)
      return
    }

    // Focus on notes tab for status change
    focusNotesForAction('status', newStatus)
  }

  // Execute pending status action after adding note
  const executePendingAction = async (note = '') => {
    if (!pendingStatusAction) return

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''

    try {
      // Add note as internal comment if provided
      if (note.trim()) {
        await fetch(`/tickets/${ticket.id}/comment/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: note,
            is_internal: true
          })
        })
      }

      if (pendingStatusAction.type === 'assign') {
        // Assign to current user
        const assignResponse = await fetch(`/tickets/${ticket.id}/update/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assignee: currentUser.id
          })
        })

        if (!assignResponse.ok) {
          throw new Error('Failed to assign ticket')
        }

        // Then, update status to in_progress
        const statusFormData = new URLSearchParams()
        statusFormData.append('status', 'in_progress')

        await fetch(`/tickets/${ticket.id}/status/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: statusFormData
        })

        toast.success('Ticket assigned to you and marked as In Progress')
      } else if (pendingStatusAction.type === 'status') {
        const formData = new URLSearchParams()
        formData.append('status', pendingStatusAction.value)

        await fetch(`/tickets/${ticket.id}/status/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData
        })

        toast.success('Status updated')
      }

      setPendingStatusAction(null)
      setStatusNote('')
      router.reload({ preserveScroll: true })
    } catch (error) {
      toast.error('Failed to complete action')
    }
  }

  // Focus on notes tab and input
  const focusNotesForAction = (actionType, actionValue = null) => {
    setPendingStatusAction({ type: actionType, value: actionValue })
    setActiveTab('notes')
    
    // If notes already has content, submit immediately
    if (statusNote.trim()) {
      executePendingAction(statusNote)
    } else {
      // Focus on notes input after tab switch
      setTimeout(() => {
        notesInputRef.current?.focus()
      }, 100)
    }
  }

  const assignToMe = async () => {
    if (!currentUser || !currentUser.id) {
      toast.error('Unable to identify current user')
      return
    }

    // Focus on notes tab for the action
    focusNotesForAction('assign')
  }

  const statusColors = {
    new: 'bg-blue-100 text-blue-700',
    open: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-purple-100 text-purple-700',
    pending: 'bg-orange-100 text-orange-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-700',
  }

  const priorityColors = {
    low: 'text-gray-600',
    normal: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600',
  }

  const statusColor = ticket.status === 'Open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'

  // Skeleton component
  const TicketSkeleton = () => (
    <main className="flex-1 bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mb-4">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-7 w-16 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-8 w-96 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Status Stepper Skeleton */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 flex-1 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex gap-6 p-6">
        {/* Left Content */}
        <div className="flex-1 space-y-6">
          {/* Tabs Skeleton */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b border-gray-200 px-6">
              <div className="flex gap-6 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
            
            {/* Content Area Skeleton */}
            <div className="p-6 space-y-4">
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="w-80 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i}>
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )

  if (loading) {
    return (
      <>
        <Head title="Loading..." />
        <AppShell active="tickets">
          <TicketSkeleton />
        </AppShell>
      </>
    )
  }

  return (
    <>
      <Head title={ticket?.title || 'Ticket'} />
      <AppShell active="tickets">
        <main className="flex-1 bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.visit('/tickets')}
                className="inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Tickets
              </Button>
            </div>
            
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-gray-500 font-medium text-lg">{ticket?.ticket_number}</span>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[ticket?.status] || 'bg-gray-100 text-gray-700'}`}>
                    {ticket?.status_display || 'Open'}
                  </span>
                  <span className={`text-sm font-semibold ${priorityColors[ticket?.priority] || ''}`}>
                    {ticket?.priority_display} Priority
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{ticket?.title}</h1>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar 
                      name={ticket?.is_guest_ticket ? ticket?.guest_name : ticket?.requester?.name} 
                      size="sm" 
                    />
                    <div>
                      <p className="text-xs text-gray-500">Requester</p>
                      <p className="font-medium text-gray-900">
                        {ticket?.is_guest_ticket 
                          ? ticket?.guest_name || 'Guest' 
                          : ticket?.requester?.name || 'Unknown'}
                      </p>
                      {ticket?.is_guest_ticket && ticket?.guest_email && (
                        <p className="text-xs text-gray-500">{ticket.guest_email}</p>
                      )}
                    </div>
                  </div>
                  {ticket?.assignee && (
                    <div className="flex items-center gap-2">
                      <Avatar name={ticket.assignee.name} size="sm" />
                      <div>
                        <p className="text-xs text-gray-500">Assignee</p>
                        <p className="font-medium text-gray-900">{ticket.assignee.name}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="font-medium text-gray-900">{ticket?.type_display}</p>
                  </div>
                  {ticket?.department && (
                    <div>
                      <p className="text-xs text-gray-500">Department</p>
                      <p className="font-medium text-gray-900">{ticket.department}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(!ticket?.assignee || ticket?.assignee?.id !== currentUser?.id) && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={assignToMe}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Assign to me
                  </Button>
                )}
                <div className="w-48">
                  <Select
                    value={ticket?.status || 'open'}
                    onChange={(value) => {
                      if (value === 'resume') {
                        handleResumeTicket()
                      } else {
                        updateStatus(value)
                      }
                    }}
                    options={
                      (ticket?.status === 'pending' || ticket?.status === 'hold')
                        ? [{ id: 'resume', name: 'Resume' }]
                        : [
                            { id: 'new', name: 'New' },
                            { id: 'open', name: 'Open' },
                            { id: 'in_progress', name: 'In Progress' },
                            { id: 'pending', name: 'On Hold' },
                            { id: 'resolved', name: 'Resolved' },
                            { id: 'closed', name: 'Closed' },
                          ]
                    }
                    placeholder="Select status"
                    displayKey="name"
                    valueKey="id"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status Stepper */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <TicketStatusStepper currentStatus={ticket?.status} />
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar */}
              <aside className="lg:col-span-1 space-y-4">
                {/* Description */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket?.description}</p>
                </div>

                {/* Details */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Created:</dt>
                      <dd className="text-gray-900 font-medium">{ticket?.created_at}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Updated:</dt>
                      <dd className="text-gray-900 font-medium">{ticket?.updated_at}</dd>
                    </div>

                    {/* Status */}
                    <div>
                      <dt className="text-gray-600 mb-1">Status:</dt>
                      {editingField === 'status' ? (
                        <Select
                          value={ticket?.status || 'new'}
                          onChange={(value) => {
                            setEditingField(null)
                            if (value === 'resume') {
                              handleResumeTicket()
                            } else {
                              updateStatus(value)
                            }
                          }}
                          options={
                            (ticket?.status === 'pending' || ticket?.status === 'hold')
                              ? [{ id: 'resume', name: 'Resume' }]
                              : [
                                  { id: 'new', name: 'New' },
                                  { id: 'open', name: 'Open' },
                                  { id: 'in_progress', name: 'In Progress' },
                                  { id: 'pending', name: 'On Hold' },
                                  { id: 'resolved', name: 'Resolved' },
                                  { id: 'closed', name: 'Closed' },
                                ]
                          }
                          placeholder="Select status"
                          displayKey="name"
                          valueKey="id"
                          className="text-sm"
                        />
                      ) : (
                        <dd
                          onClick={() => setEditingField('status')}
                          className="text-gray-900 font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          {ticket?.status_display || ticket?.status || 'New'}
                        </dd>
                      )}
                    </div>
                    
                    {/* Assignee */}
                    <div>
                      <dt className="text-gray-600 mb-1">Assignee:</dt>
                      {editingField === 'assignee' ? (
                        <Select
                          value={ticket?.assignee?.id || ''}
                          onChange={(value) => {
                            updateField('assignee', value || null)
                            setEditingField(null)
                          }}
                          options={users}
                          placeholder="Unassigned"
                          displayKey="name"
                          valueKey="id"
                          searchable={true}
                          className="text-sm"
                        />
                      ) : (
                        <dd
                          onClick={() => setEditingField('assignee')}
                          className="text-gray-900 font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          {ticket?.assignee?.name || 'Unassigned'}
                        </dd>
                      )}
                    </div>

                    {/* Assignment Group */}
                    <div>
                      <dt className="text-gray-600 mb-1">Assignment Group:</dt>
                      {editingField === 'group' ? (
                        <Select
                          value={ticket?.group?.id || ''}
                          onChange={(value) => {
                            updateField('group', value || null)
                            setEditingField(null)
                          }}
                          options={groups.map(g => ({ ...g, name: `👥 ${g.name}` }))}
                          placeholder="None"
                          displayKey="name"
                          valueKey="id"
                          searchable={true}
                          className="text-sm"
                        />
                      ) : (
                        <dd
                          onClick={() => setEditingField('group')}
                          className="text-gray-900 font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          {ticket?.group ? `👥 ${ticket.group.name}` : 'None'}
                        </dd>
                      )}
                    </div>

                    {/* Type */}
                    <div>
                      <dt className="text-gray-600 mb-1">Type:</dt>
                      {editingField === 'type' ? (
                        <Select
                          value={ticket?.type || 'question'}
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
                          displayKey="name"
                          valueKey="id"
                          className="text-sm"
                        />
                      ) : (
                        <dd
                          onClick={() => setEditingField('type')}
                          className="text-gray-900 font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          {ticket?.type_display || 'Question'}
                        </dd>
                      )}
                    </div>

                    {/* Priority */}
                    <div>
                      <dt className="text-gray-600 mb-1">Priority:</dt>
                      {editingField === 'priority' ? (
                        <Select
                          value={ticket?.priority || 'normal'}
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
                          displayKey="name"
                          valueKey="id"
                          className="text-sm"
                        />
                      ) : (
                        <dd
                          onClick={() => setEditingField('priority')}
                          className={`font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded ${priorityColors[ticket?.priority] || ''}`}
                        >
                          {ticket?.priority_display || 'Normal'}
                        </dd>
                      )}
                    </div>

                    {/* Watchers */}
                    <div>
                      <dt className="text-gray-600 mb-1">Watchers:</dt>
                      {editingField === 'watchers' ? (
                        <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                          {users.map(user => (
                            <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                              <input
                                type="checkbox"
                                defaultChecked={ticket?.watchers?.some(w => w.id === user.id)}
                                onChange={(e) => {
                                  const currentWatchers = ticket?.watchers?.map(w => w.id) || []
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
                              <span className="text-sm text-gray-900">{user.name}</span>
                            </label>
                          ))}
                          <button
                            onClick={() => setEditingField(null)}
                            className="mt-2 text-xs text-gray-600 hover:text-gray-900 w-full text-left"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <dd
                          onClick={() => setEditingField('watchers')}
                          className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          {ticket?.watchers && ticket.watchers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {ticket.watchers.map((w, i) => (
                                <span key={i} className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                  {w.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Click to add watchers</span>
                          )}
                        </dd>
                      )}
                    </div>

                    {/* Tags */}
                    <div>
                      <dt className="text-gray-600 mb-1">Tags:</dt>
                      {editingField === 'tags' ? (
                        <input
                          type="text"
                          autoFocus
                          defaultValue={ticket?.tags?.join(', ') || ''}
                          onBlur={(e) => {
                            const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                            updateField('tags', tags)
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur()
                            }
                          }}
                          placeholder="Enter tags, separated by commas"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#4a154b]"
                        />
                      ) : (
                        <dd
                          onClick={() => setEditingField('tags')}
                          className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          {ticket?.tags && ticket.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {ticket.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Click to add tags</span>
                          )}
                        </dd>
                      )}
                    </div>
                  </dl>
                </div>

                {/* Attachments Summary */}
                {attachments.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Attachments ({attachments.length})</h3>
                    <div className="space-y-2">
                      {attachments.slice(0, 3).map(att => (
                        <a
                          key={att.id}
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-sm"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="flex-1 truncate text-gray-700">{att.file_name}</span>
                        </a>
                      ))}
                      {attachments.length > 3 && (
                        <button
                          onClick={() => setActiveTab('attachments')}
                          className="text-sm text-[#4a154b] hover:underline"
                        >
                          View all {attachments.length} attachments
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </aside>

              {/* Main Content */}
              <div className="lg:col-span-2">
                {/* Tabs */}
                <div className="bg-white rounded-t-lg border border-gray-200 border-b-0">
                  <div className="flex border-b border-gray-200">
                    <button
                      onClick={() => setActiveTab('conversation')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'conversation'
                          ? 'border-[#4a154b] text-[#4a154b]'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Conversation ({comments.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('attachments')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'attachments'
                          ? 'border-[#4a154b] text-[#4a154b]'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Attachments ({attachments.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('activity')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'activity'
                          ? 'border-[#4a154b] text-[#4a154b]'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Activity ({activities.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('workitems')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'workitems'
                          ? 'border-[#4a154b] text-[#4a154b]'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Work Items ({workItems.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('notes')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'notes'
                          ? 'border-[#4a154b] text-[#4a154b]'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      } ${pendingStatusAction ? 'animate-pulse bg-amber-50' : ''}`}
                    >
                      Notes ({comments.filter(c => c.is_internal).length})
                      {pendingStatusAction && (
                        <span className="ml-1 inline-block w-2 h-2 bg-amber-500 rounded-full"></span>
                      )}
                    </button>
                    <button
                      onClick={() => slaData && setActiveTab('sla')}
                      disabled={!slaData}
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'sla'
                          ? 'border-[#4a154b] text-[#4a154b]'
                          : slaData
                          ? 'border-transparent text-gray-600 hover:text-gray-900'
                          : 'border-transparent text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      SLA
                      {!slaData && (
                        <svg className="inline-block ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="bg-gray-50 rounded-b-lg border border-gray-200 border-t-0 p-6 h-[600px] overflow-y-auto">
                  {activeTab === 'conversation' && (
                    <div className="space-y-6">
                      {/* Stepper Timeline for Conversations */}
                      <div className="relative">
                        {/* Vertical timeline line */}
                        <div 
                          className="absolute left-5 top-0 bottom-0 w-0.5" 
                          style={{ backgroundColor: COLORS.primaryLight }}
                        />
                        
                        <div className="space-y-6">
                          {/* Initial Ticket Description */}
                          <div className="relative flex items-start gap-4">
                            {/* Timeline dot */}
                            <div 
                              className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                              style={{ backgroundColor: COLORS.primary }}
                            >
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                            </div>
                            
                            {/* Chat bubble with pointing edge */}
                            <div className="max-w-[85%] flex-1">
                              <div 
                                className="relative rounded-2xl rounded-tl-sm p-4 shadow-sm"
                                style={{ 
                                  backgroundColor: `${COLORS.primary}08`,
                                  borderLeft: `3px solid ${COLORS.primary}`
                                }}
                              >
                                {/* Pointing edge */}
                                <div 
                                  className="absolute -left-[10px] top-4 w-0 h-0"
                                  style={{
                                    borderTop: '8px solid transparent',
                                    borderBottom: '8px solid transparent',
                                    borderRight: `10px solid ${COLORS.secondary}`
                                  }}
                                />
                                
                                <div className="flex items-center gap-3 mb-3">
                                  <Avatar 
                                    name={ticket?.is_guest_ticket ? ticket?.guest_name : ticket?.requester?.name} 
                                    size="md" 
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">
                                      {ticket?.is_guest_ticket 
                                        ? ticket?.guest_name || 'Guest User' 
                                        : ticket?.requester?.name || 'Unknown User'}
                                    </h4>
                                    <p className="text-xs text-gray-500">
                                      {ticket?.is_guest_ticket && ticket?.guest_email && (
                                        <span className="mr-2">{ticket.guest_email}</span>
                                      )}
                                      {ticket?.is_guest_ticket && ticket?.guest_phone && (
                                        <span>{ticket.guest_phone}</span>
                                      )}
                                      {!ticket?.is_guest_ticket && 'Created this ticket'}
                                    </p>
                                  </div>
                                  <span className="text-xs text-gray-500">{ticket?.created_at}</span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                                  {ticket?.description}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Filtered Comments (non-internal only) */}
                          {comments.filter(c => !c.is_internal).map((comment, index) => (
                            <div key={comment.id} className="relative flex items-start gap-4">
                              {/* Timeline dot */}
                              <div 
                                className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                                style={{ backgroundColor: COLORS.primaryLight }}
                              >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                              </div>
                              
                              {/* Chat bubble with pointing edge */}
                              <div className="max-w-[85%] flex-1">
                                <div 
                                  className="relative rounded-2xl rounded-tl-sm p-4 shadow-sm"
                                  style={{ 
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderLeft: `3px solid ${COLORS.primaryLight}`
                                  }}
                                >
                                  {/* Pointing edge */}
                                  <div 
                                    className="absolute -left-[10px] top-4 w-0 h-0"
                                    style={{
                                      borderTop: '8px solid transparent',
                                      borderBottom: '8px solid transparent',
                                      borderRight: `10px solid ${COLORS.secondary}`
                                    }}
                                  />
                                  
                                  <div className="flex items-center gap-3 mb-2">
                                    <Avatar name={comment.author?.name} size="sm" />
                                    <span className="font-semibold text-gray-900 text-sm">{comment.author?.name || 'Unknown User'}</span>
                                    <span className="text-xs text-gray-500">{comment.created_at}</span>
                                  </div>
                                  <p className="text-gray-700 whitespace-pre-wrap text-sm">{comment.message}</p>
                                  
                                  {comment.attachments && comment.attachments.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {comment.attachments.map((att, i) => (
                                        <a
                                          key={i}
                                          href={att.url}
                                          className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700 transition-colors"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                          </svg>
                                          {att.name}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {comments.filter(c => !c.is_internal).length === 0 && !ticket?.description && (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <p className="text-gray-500 text-lg">No conversations yet</p>
                          <p className="text-gray-400 text-sm mt-1">Start a conversation on this ticket</p>
                        </div>
                      )}

                      {/* Comment Form */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky bottom-6">
                        <div className="flex gap-4">
                          <Avatar name="Current User" size="md" />
                          <div className="flex-1">
                            <Textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              rows={4}
                              placeholder="Write your comment..."
                              className="mb-3"
                            />
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={commentInternal}
                                  onChange={(e) => setCommentInternal(e.target.checked)}
                                  className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                                />
                                <span className="text-sm text-gray-700">Internal note</span>
                              </label>
                              <div className="flex gap-2">
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                  />
                                  <Button variant="ghost" size="sm" as="span">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    Attach
                                  </Button>
                                </label>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleSubmitComment()}
                                  disabled={processing || !newComment.trim()}
                                >
                                  {processing ? 'Posting...' : 'Post Comment'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'attachments' && (
                    <div className="space-y-3">
                      <div className="flex justify-end mb-4">
                        <Button
                          onClick={() => setShowAttachmentDrawer(true)}
                          style={{ backgroundColor: THEME.PRIMARY }}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Attachment
                        </Button>
                      </div>
                      {attachments.map(att => (
                        <div key={att.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                          <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <a
                                href={att.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-gray-900 hover:text-[#4a154b] truncate"
                              >
                                {att.file_name}
                              </a>
                              {att.is_internal && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                  Internal
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                              <span>{att.file_type}</span>
                              <span>•</span>
                              <span>{Math.round(att.file_size / 1024)}KB</span>
                              <span>•</span>
                              <span>Uploaded by {att.uploaded_by?.name}</span>
                              <span>•</span>
                              <span>{att.uploaded_at}</span>
                            </div>
                          </div>
                          <a
                            href={att.file_url}
                            download
                            className="flex-shrink-0"
                          >
                            <Button variant="outline" size="sm">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </Button>
                          </a>
                        </div>
                      ))}
                      {attachments.length === 0 && (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <p className="text-gray-500 text-lg">No attachments</p>
                          <p className="text-gray-400 text-sm mt-1">Files attached to this ticket will appear here</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'activity' && (
                    <ActivityTimeline activities={activities} />
                  )}

                  {activeTab === 'workitems' && (
                    <div className="space-y-4">
                      {workItems.length === 0 ? (
                        <div className="text-center py-12">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-500 mb-5">No work items yet</p>
                          <Button
                            variant="primary"
                            size="md"
                            onClick={() => setShowWorkItemModal(true)}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add your first work item
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {workItems.map((item) => (
                            <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                      item.status === 'done' ? 'bg-green-100 text-green-700' :
                                      item.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                      item.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {item.status_display || item.status}
                                    </span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                      item.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                      item.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                      item.priority === 'low' ? 'bg-gray-100 text-gray-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {item.priority_display || item.priority}
                                    </span>
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                                  )}
                                  {item.work_notes && (
                                    <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded">
                                      <p className="text-xs font-medium text-green-800 mb-1">Completion Notes:</p>
                                      <p className="text-sm text-green-700">{item.work_notes}</p>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    {item.assignee && (
                                      <div className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span>{item.assignee.name}</span>
                                      </div>
                                    )}
                                    {item.due_date && (
                                      <div className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>Due: {item.due_date}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span>Created: {item.created_at}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 ml-4">
                                  {item.status !== 'done' && (
                                    <button
                                      onClick={() => handleCompleteWorkItem(item)}
                                      className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                                    >
                                      Mark Complete
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleEditWorkItem(item)}
                                    className="text-sm text-[#4a154b] hover:text-[#0a2d31] font-medium"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes Tab */}
                  {activeTab === 'notes' && (
                    <div className="space-y-6">
                      {/* Pending Action Banner */}
                      {pendingStatusAction && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                              <p className="font-medium text-amber-800">
                                {pendingStatusAction.type === 'assign' 
                                  ? 'Assigning ticket to yourself' 
                                  : `Changing status to ${pendingStatusAction.value?.replace('_', ' ')}`}
                              </p>
                              <p className="text-sm text-amber-700 mt-1">Add a note (optional) and confirm the action</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notes Input */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">
                          {pendingStatusAction ? 'Add Note for Status Change' : 'Add Internal Note'}
                        </h3>
                        <div className="flex gap-4">
                          <Avatar name={currentUser?.name || 'You'} size="md" />
                          <div className="flex-1">
                            <Textarea
                              ref={notesInputRef}
                              value={statusNote}
                              onChange={(e) => setStatusNote(e.target.value)}
                              rows={4}
                              placeholder={pendingStatusAction 
                                ? "Add a note explaining this status change (optional)..." 
                                : "Write an internal note..."}
                              className="mb-3"
                            />
                            <div className="flex items-center justify-end gap-3">
                              {pendingStatusAction && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setPendingStatusAction(null)
                                    setStatusNote('')
                                  }}
                                >
                                  Cancel
                                </Button>
                              )}
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  if (pendingStatusAction) {
                                    executePendingAction(statusNote)
                                  } else if (statusNote.trim()) {
                                    // Just add as internal note
                                    handleSubmitComment({
                                      message: statusNote,
                                      is_internal: true
                                    })
                                    setStatusNote('')
                                  } else {
                                    toast.error('Please enter a note')
                                  }
                                }}
                                disabled={processing}
                              >
                                {pendingStatusAction 
                                  ? (pendingStatusAction.type === 'assign' ? 'Assign & Save' : 'Update Status') 
                                  : 'Add Note'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes Log */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900">Notes History</h3>
                        {comments.filter(c => c.is_internal).length === 0 ? (
                          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <p className="text-gray-500 text-lg">No internal notes yet</p>
                            <p className="text-gray-400 text-sm mt-1">Notes added during status changes will appear here</p>
                          </div>
                        ) : (
                          <div className="relative">
                            {/* Vertical timeline line */}
                            <div 
                              className="absolute left-5 top-0 bottom-0 w-0.5" 
                              style={{ backgroundColor: COLORS.primaryLight }}
                            />
                            
                            <div className="space-y-6">
                              {comments.filter(c => c.is_internal).map((note, index, filteredNotes) => (
                                <div key={note.id} className="relative flex items-start gap-4">
                                  {/* Timeline dot */}
                                  <div 
                                    className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                                    style={{ backgroundColor: COLORS.primary }}
                                  >
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </div>
                                  
                                  {/* Chat bubble */}
                                  <div className="max-w-[80%]">
                                    <div 
                                      className="relative rounded-2xl rounded-tl-sm p-4 shadow-sm"
                                      style={{ 
                                        backgroundColor: `${COLORS.primary}10`,
                                        borderLeft: `3px solid ${COLORS.primary}`
                                      }}
                                    >
                                      {/* Pointing edge */}
                                      <div 
                                        className="absolute -left-[10px] top-4 w-0 h-0"
                                        style={{
                                          borderTop: '8px solid transparent',
                                          borderBottom: '8px solid transparent',
                                          borderRight: `10px solid ${COLORS.secondary}`
                                        }}
                                      />
                                      
                                      <div className="flex items-center gap-2 mb-2">
                                        <Avatar name={note.author?.name || 'System'} size="sm" />
                                        <span className="font-semibold text-gray-900 text-sm">{note.author?.name || 'System'}</span>
                                        <span 
                                          className="px-2 py-0.5 text-xs rounded-full text-white"
                                          style={{ backgroundColor: COLORS.primary }}
                                        >
                                          Internal Note
                                        </span>
                                      </div>
                                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.message}</p>
                                      <div className="mt-2 text-xs text-gray-500">{note.created_at}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SLA Tab */}
                  {activeTab === 'sla' && slaData && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">SLA Information</h3>
                          {/* {slaData.is_on_hold ? (
                            <button
                              onClick={handleResumeSLA}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Resume SLA
                            </button>
                          ) : (
                            <button
                              onClick={() => setShowHoldModal(true)}
                              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Hold SLA
                            </button>
                          )} */}
                        </div>

                        {/* SLA Status */}
                        {slaData.is_on_hold && (
                          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start gap-3">
                              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                              </svg>
                              <div className="flex-1">
                                <p className="font-medium text-yellow-800">SLA Timer is On Hold</p>
                                <p className="text-sm text-yellow-700 mt-1"><strong>Reason:</strong> {slaData.hold_reason}</p>
                                {slaData.hold_started_at && (
                                  <p className="text-xs text-yellow-600 mt-1">Hold started: {new Date(slaData.hold_started_at).toLocaleString()}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Policy Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-500">Policy Name</label>
                              <p className="text-gray-900 font-medium">{slaData.policy.name}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Priority</label>
                              <p className="text-gray-900">
                                <span className={`px-2 py-1 text-sm rounded-full ${
                                  slaData.policy.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                  slaData.policy.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                  slaData.policy.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {slaData.policy.priority}
                                </span>
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Total Hold Time</label>
                              <p className="text-gray-900">{slaData.total_hold_time} minutes</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-500">First Response Target</label>
                              <p className="text-gray-900">{slaData.policy.first_response_time} minutes</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Resolution Target</label>
                              <p className="text-gray-900">{slaData.policy.resolution_time} minutes</p>
                            </div>
                          </div>
                        </div>

                        {/* Due Dates */}
                        <div className="border-t border-gray-200 pt-6">
                          <h4 className="text-md font-semibold text-gray-900 mb-4">Due Dates</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-lg border-2 ${slaData.response_breached ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">First Response Due</label>
                                {slaData.response_breached && (
                                  <span className="px-2 py-1 text-xs bg-red-600 text-white rounded-full">Breached</span>
                                )}
                              </div>
                              <p className="text-lg font-semibold text-gray-900">
                                {slaData.response_due_at ? new Date(slaData.response_due_at).toLocaleString() : 'Not set'}
                              </p>
                            </div>

                            <div className={`p-4 rounded-lg border-2 ${slaData.resolution_breached ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">Resolution Due</label>
                                {slaData.resolution_breached && (
                                  <span className="px-2 py-1 text-xs bg-red-600 text-white rounded-full">Breached</span>
                                )}
                              </div>
                              <p className="text-lg font-semibold text-gray-900">
                                {slaData.resolution_due_at ? new Date(slaData.resolution_due_at).toLocaleString() : 'Not set'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Hold SLA Modal */}
        {showHoldModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200" style={{ backgroundColor: '#4a154b' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Hold SLA Timer</h2>
                  <button onClick={() => setShowHoldModal(false)} className="text-white hover:text-gray-200">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hold Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a154b]"
                    placeholder="Enter the reason for holding the SLA timer..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Explain why the SLA timer needs to be paused</p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowHoldModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleHoldSLA}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Hold SLA
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resume Ticket Confirmation */}
        <ConfirmDialog
          isOpen={showResumeConfirm}
          onClose={() => setShowResumeConfirm(false)}
          onConfirm={confirmResumeTicket}
          title="Resume Ticket"
          message="Are you sure you want to resume this ticket? This will resume the SLA timer and change the status to In Progress."
          confirmText="Resume"
          cancelText="Cancel"
          confirmStyle="primary"
        />

        {/* Add Work Item Modal */}
        {showWorkItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200" style={{ backgroundColor: '#4a154b' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">{editingWorkItem ? 'Edit Work Item' : 'Add Work Item'}</h2>
                  <button
                    onClick={() => {
                      setShowWorkItemModal(false)
                      setEditingWorkItem(null)
                    }}
                    className="text-white hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={workItemForm.title}
                      onChange={(e) => setWorkItemForm({...workItemForm, title: e.target.value})}
                      placeholder="Enter work item title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a154b]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={workItemForm.description}
                      onChange={(e) => setWorkItemForm({...workItemForm, description: e.target.value})}
                      rows={4}
                      placeholder="Enter description (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a154b] resize-none"
                    />
                  </div>

                  {editingWorkItem && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <Select
                        value={workItemForm.status || 'todo'}
                        onChange={(value) => setWorkItemForm({...workItemForm, status: value})}
                        options={[
                          { id: 'todo', name: 'To Do' },
                          { id: 'in_progress', name: 'In Progress' },
                          { id: 'done', name: 'Done' },
                          { id: 'cancelled', name: 'Cancelled' },
                        ]}
                        placeholder="Select status"
                        displayKey="name"
                        valueKey="id"
                        className="text-sm"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <Select
                        value={workItemForm.priority}
                        onChange={(value) => setWorkItemForm({...workItemForm, priority: value})}
                        options={[
                          { id: 'low', name: 'Low' },
                          { id: 'normal', name: 'Normal' },
                          { id: 'high', name: 'High' },
                          { id: 'urgent', name: 'Urgent' },
                        ]}
                        placeholder="Select priority"
                        displayKey="name"
                        valueKey="id"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assignee
                      </label>
                      <Select
                        value={workItemForm.assignee || ''}
                        onChange={(value) => setWorkItemForm({...workItemForm, assignee: value || null})}
                        options={[
                          { id: '', name: 'Unassigned' },
                          ...users.map(user => ({ id: user.id, name: user.name }))
                        ]}
                        placeholder="Select assignee"
                        displayKey="name"
                        valueKey="id"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {editingWorkItem && workItemForm.status === 'done' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Work Notes (Completion Notes)
                      </label>
                      <textarea
                        value={workItemForm.work_notes}
                        onChange={(e) => setWorkItemForm({...workItemForm, work_notes: e.target.value})}
                        rows={3}
                        placeholder="Add notes about the completed work..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a154b] resize-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={workItemForm.due_date}
                      onChange={(e) => setWorkItemForm({...workItemForm, due_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a154b]"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowWorkItemModal(false)
                    setEditingWorkItem(null)
                    setWorkItemForm({ title: '', description: '', priority: 'normal', assignee: null, due_date: '', work_notes: '' })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={createWorkItem}
                >
                  {editingWorkItem ? 'Update Work Item' : 'Add Work Item'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Work Item Modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6 border-b border-gray-200" style={{ backgroundColor: '#4a154b' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Mark Work Item Complete</h2>
                  <button
                    onClick={() => {
                      setShowCompleteModal(false)
                      setCompletingWorkItem(null)
                      setCompletionNotes('')
                    }}
                    className="text-white hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {completingWorkItem && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-900 mb-1">{completingWorkItem.title}</p>
                    {completingWorkItem.description && (
                      <p className="text-sm text-gray-600">{completingWorkItem.description}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Work Notes (Optional)
                  </label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    rows={4}
                    placeholder="Add notes about the work completed..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a154b] resize-none"
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Document what was done to complete this work item
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCompleteModal(false)
                    setCompletingWorkItem(null)
                    setCompletionNotes('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={submitCompleteWorkItem}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Mark as Complete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Attachment Drawer */}
        <Drawer
          isOpen={showAttachmentDrawer}
          onClose={() => {
            setShowAttachmentDrawer(false)
            setSelectedFile(null)
            setAttachmentIsInternal(false)
            if (attachmentInputRef.current) {
              attachmentInputRef.current.value = ''
            }
          }}
          title="Add Attachment"
        >
          <DrawerBody>
            <div className="space-y-6">
              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    selectedFile ? 'border-[#4a154b] bg-purple-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={attachmentInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <svg className="w-8 h-8 text-[#4a154b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">{Math.round(selectedFile.size / 1024)} KB</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFile(null)
                          if (attachmentInputRef.current) {
                            attachmentInputRef.current.value = ''
                          }
                        }}
                        className="ml-2 text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-600">Click to select a file</p>
                      <p className="text-sm text-gray-400 mt-1">or drag and drop</p>
                    </>
                  )}
                </div>
              </div>

              {/* Mark as Internal Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Mark as Internal</p>
                  <p className="text-sm text-gray-500">Internal attachments are only visible to agents</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachmentIsInternal(!attachmentIsInternal)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    attachmentIsInternal ? 'bg-[#4a154b]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      attachmentIsInternal ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </DrawerBody>

          <DrawerFooter className="justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAttachmentDrawer(false)
                setSelectedFile(null)
                setAttachmentIsInternal(false)
                if (attachmentInputRef.current) {
                  attachmentInputRef.current.value = ''
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAttachmentUpload}
              disabled={!selectedFile || uploadingAttachment}
              style={{ backgroundColor: THEME.PRIMARY }}
            >
              {uploadingAttachment ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DrawerFooter>
        </Drawer>
      </AppShell>
    </>
  )
}
