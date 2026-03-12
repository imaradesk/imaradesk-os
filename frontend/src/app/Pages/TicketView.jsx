import React, { useState, useEffect, useRef } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import TicketStatusStepper from '../components/TicketStatusStepper'
import { COLORS } from '../constants/theme'
import { csrfFetch } from '../../utils/csrf'
import Drawer, { DrawerBody, DrawerFooter } from '../components/Drawer'
import Button from '../../components/Button'

// Import ticket components
import {
  TicketHeader,
  TicketSidebar,
  ConversationTab,
  AttachmentsTab,
  WorkItemsTab,
  NotesTab,
  SLATab,
  WorkItemModal,
  CompleteWorkItemModal,
  HoldSLAModal,
  AttachmentDrawer,
  ResumeTicketConfirm
} from '../components/ticket'
import ActivityTimeline from '../../components/ActivityTimeline'

export default function TicketView({ ticket, comments = [], attachments = [], activities = [], users = [], groups = [], sla = null }) {
  const { props } = usePage()
  const currentUser = props.auth?.user
  
  // Tab state
  const [activeTab, setActiveTab] = useState('conversation')
  
  // Comment state
  const [newComment, setNewComment] = useState('')
  const [commentInternal, setCommentInternal] = useState(false)
  const [commentMentions, setCommentMentions] = useState([]) // Track mentioned user IDs
  const [processing, setProcessing] = useState(false)
  
  // Work items state
  const [showWorkItemModal, setShowWorkItemModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completingWorkItem, setCompletingWorkItem] = useState(null)
  const [completionNotes, setCompletionNotes] = useState('')
  const [editingWorkItem, setEditingWorkItem] = useState(null)
  const [workItems, setWorkItems] = useState([])
  const [workItemForm, setWorkItemForm] = useState({
    title: '',
    description: '',
    priority: 'normal',
    assignee: null,
    due_date: '',
    work_notes: ''
  })
  
  // SLA state
  const [showHoldModal, setShowHoldModal] = useState(false)
  const [holdReason, setHoldReason] = useState('')
  const [slaData, setSlaData] = useState(sla)
  const [showResumeConfirm, setShowResumeConfirm] = useState(false)
  
  // Attachment state
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [showAttachmentDrawer, setShowAttachmentDrawer] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [attachmentIsInternal, setAttachmentIsInternal] = useState(false)
  
  // Notes tab state
  const [statusNote, setStatusNote] = useState('')
  const [pendingStatusAction, setPendingStatusAction] = useState(null)
  const notesInputRef = useRef(null)
  
  // Loading state
  const [loading, setLoading] = useState(true)
  
  // Merge state
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergeSearchQuery, setMergeSearchQuery] = useState('')
  const [mergeSearchResults, setMergeSearchResults] = useState([])
  const [selectedMergeTarget, setSelectedMergeTarget] = useState(null)
  const [merging, setMerging] = useState(false)
  const [searchingTickets, setSearchingTickets] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Fetch work items
  const fetchWorkItems = () => {
    fetch(`/tickets/${ticket.id}/work-items/`)
      .then(res => res.json())
      .then(data => setWorkItems(data.work_items || []))
      .catch(() => toast.error('Failed to fetch work items'))
  }

  useEffect(() => {
    fetchWorkItems()
  }, [ticket.id])

  // Get CSRF token helper
  const getCsrfToken = () => 
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''

  // Update ticket field
  const updateField = (field, value) => {
    fetch(`/tickets/${ticket.id}/update/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCsrfToken(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [field]: value })
    })
      .then(res => res.json())
      .then(() => {
        toast.success('Ticket updated')
        router.reload({ preserveScroll: true })
      })
      .catch(() => toast.error('Failed to update ticket'))
  }

  // Submit comment
  const handleSubmitComment = (commentData = null) => {
    const payload = commentData || {
      message: newComment,
      is_internal: commentInternal,
      mentions: commentMentions, // Include mentioned user IDs
    }
    
    if (!payload.message.trim()) {
      toast.error('Please enter a comment')
      return
    }

    setProcessing(true)
    fetch(`/tickets/${ticket.id}/comment/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCsrfToken(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed')
        return res.json()
      })
      .then(() => {
        toast.success('Comment added successfully')
        setNewComment('')
        setCommentInternal(false)
        setCommentMentions([]) // Reset mentions
        setProcessing(false)
        router.reload({ preserveScroll: true })
      })
      .catch(() => {
        toast.error('Failed to add comment')
        setProcessing(false)
      })
  }

  // Status change handling
  const updateStatus = (newStatus) => {
    if ((newStatus === 'pending' || newStatus === 'hold') && slaData && !slaData.is_on_hold) {
      setShowHoldModal(true)
      return
    }
    focusNotesForAction('status', newStatus)
  }

  const focusNotesForAction = (actionType, actionValue = null) => {
    setPendingStatusAction({ type: actionType, value: actionValue })
    setActiveTab('notes')
    
    if (statusNote.trim()) {
      executePendingAction(statusNote)
    } else {
      setTimeout(() => notesInputRef.current?.focus(), 100)
    }
  }

  const executePendingAction = async (note = '') => {
    if (!pendingStatusAction) return

    const csrfToken = getCsrfToken()

    try {
      if (note.trim()) {
        await fetch(`/tickets/${ticket.id}/comment/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: note, is_internal: true })
        })
      }

      if (pendingStatusAction.type === 'assign') {
        await fetch(`/tickets/${ticket.id}/update/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assignee: currentUser.id })
        })

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

  const assignToMe = () => {
    if (!currentUser?.id) {
      toast.error('Unable to identify current user')
      return
    }
    focusNotesForAction('assign')
  }

  // Hold SLA
  const handleHoldSLA = () => {
    if (!holdReason.trim()) {
      toast.error('Please enter a hold reason')
      return
    }

    const csrfToken = getCsrfToken()
    fetch(`/sla/api/tickets/${ticket.id}/sla/hold/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: holdReason })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('SLA timer has been put on hold')
          setSlaData(prev => ({ ...prev, ...data.sla }))
          
          const reasonToSave = holdReason
          setShowHoldModal(false)
          setHoldReason('')
          
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
            const formData = new URLSearchParams()
            formData.append('status', 'pending')
            fetch(`/tickets/${ticket.id}/status/`, {
              method: 'POST',
              headers: {
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: formData
            }).then(() => router.reload())
          })
        } else {
          toast.error(data.message || 'Failed to hold SLA')
        }
      })
      .catch(() => toast.error('Failed to hold SLA'))
  }

  // Resume ticket
  const handleResumeTicket = () => setShowResumeConfirm(true)

  const confirmResumeTicket = () => {
    const csrfToken = getCsrfToken()
    
    if (slaData?.is_on_hold) {
      fetch(`/sla/api/tickets/${ticket.id}/sla/resume/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken,
          'Content-Type': 'application/json',
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            toast.success('SLA timer has been resumed')
            setSlaData(prev => ({ ...prev, ...data.sla }))
          }
        })
    }

    const formData = new URLSearchParams()
    formData.append('status', 'in_progress')
    fetch(`/tickets/${ticket.id}/status/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    })
      .then(() => {
        toast.success('Ticket resumed')
        router.reload()
      })
      .catch(() => toast.error('Failed to update ticket status'))
  }

  // Merge ticket functions
  const searchTicketsForMerge = async (query) => {
    if (!query.trim()) {
      setMergeSearchResults([])
      return
    }
    
    setSearchingTickets(true)
    try {
      const res = await fetch(`/tickets/search/?q=${encodeURIComponent(query)}&exclude=${ticket.id}`)
      const data = await res.json()
      setMergeSearchResults(data.tickets || [])
    } catch (err) {
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
      const res = await fetch(`/tickets/${ticket.id}/merge/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCsrfToken(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target_ticket_id: selectedMergeTarget.id })
      })
      
      const data = await res.json()
      if (data.success) {
        toast.success('Ticket merged successfully')
        router.visit(`/tickets/${selectedMergeTarget.id}`)
      } else {
        toast.error(data.error || 'Failed to merge ticket')
      }
    } catch (err) {
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
  const createWorkItem = () => {
    if (!workItemForm.title.trim()) {
      toast.error('Title is required')
      return
    }

    const url = editingWorkItem 
      ? `/tickets/${ticket.id}/work-items/${editingWorkItem.id}/update/`
      : `/tickets/${ticket.id}/work-items/create/`

    fetch(url, {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCsrfToken(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workItemForm)
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed')
        return res.json()
      })
      .then(() => {
        toast.success(editingWorkItem ? 'Work item updated' : 'Work item created')
        setShowWorkItemModal(false)
        setEditingWorkItem(null)
        setWorkItemForm({ title: '', description: '', priority: 'normal', assignee: null, due_date: '', work_notes: '' })
        fetchWorkItems()
        router.reload({ preserveScroll: true })
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

    fetch(`/tickets/${ticket.id}/work-items/${completingWorkItem.id}/update/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCsrfToken(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'done', work_notes: completionNotes })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed')
        return res.json()
      })
      .then(() => {
        toast.success('Work item marked as complete')
        setShowCompleteModal(false)
        setCompletingWorkItem(null)
        setCompletionNotes('')
        fetchWorkItems()
        router.reload({ preserveScroll: true })
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

      const uploadRes = await csrfFetch('/upload/', {
        method: 'POST',
        body: formData,
      })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload')

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

      if (!attachRes.ok) throw new Error('Failed to attach')

      toast.success('File attached successfully')
      setShowAttachmentDrawer(false)
      setSelectedFile(null)
      setAttachmentIsInternal(false)
      router.reload()
    } catch (error) {
      toast.error(error.message || 'Failed to upload attachment')
    } finally {
      setUploadingAttachment(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const csrfToken = getCsrfToken()

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const uploadResponse = await fetch('/upload/', {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken },
        body: uploadFormData,
      })

      if (!uploadResponse.ok) throw new Error('Upload failed')
      const uploadData = await uploadResponse.json()

      const attachFormData = new FormData()
      attachFormData.append('file_url', uploadData.file_url)
      attachFormData.append('file_name', uploadData.file_name)
      attachFormData.append('file_size', uploadData.file_size)
      attachFormData.append('file_type', uploadData.file_type)

      const attachResponse = await fetch(`/tickets/${ticket.id}/attachment/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken },
        body: attachFormData,
      })

      if (!attachResponse.ok) throw new Error('Attachment failed')

      toast.success('File uploaded successfully')
      router.reload({ preserveScroll: true })
    } catch {
      toast.error('Failed to upload file')
    }
  }

  // Tab button styling helper
  const getTabClass = (tabName) => {
    const isActive = activeTab === tabName
    const base = 'px-4 py-3 text-sm font-medium border-b-2'
    return `${base} ${
      isActive
        ? 'border-[#4a154b] text-[#4a154b]'
        : 'border-transparent text-gray-600 hover:text-gray-900'
    }`
  }

  // Skeleton component
  const TicketSkeleton = () => (
    <main className="flex-1 bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mb-4">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-7 w-16 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
            <div className="h-8 w-96 bg-gray-200 rounded animate-pulse mb-2"></div>
          </div>
        </div>
      </div>
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 flex-1 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
      <div className="flex gap-6 p-6">
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 space-y-4">
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
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
          <TicketHeader
            ticket={ticket}
            currentUser={currentUser}
            onAssignToMe={assignToMe}
            onStatusChange={updateStatus}
            onResumeTicket={handleResumeTicket}
            onMergeTicket={() => setShowMergeModal(true)}
          />

          {/* Status Stepper */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <TicketStatusStepper currentStatus={ticket?.status} />
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar */}
              <TicketSidebar
                ticket={ticket}
                users={users}
                groups={groups}
                attachments={attachments}
                onFieldUpdate={updateField}
                onViewAttachments={() => setActiveTab('attachments')}
              />

              {/* Main Content */}
              <div className="lg:col-span-2">
                {/* Tabs */}
                <div className="bg-white rounded-t-lg border border-gray-200 border-b-0">
                  <div className="flex border-b border-gray-200">
                    <button onClick={() => setActiveTab('conversation')} className={getTabClass('conversation')}>
                      Conversation ({comments.filter(c => !c.is_internal).length})
                    </button>
                    <button onClick={() => setActiveTab('attachments')} className={getTabClass('attachments')}>
                      Attachments ({attachments.length})
                    </button>
                    <button onClick={() => setActiveTab('activity')} className={getTabClass('activity')}>
                      Activity ({activities.length})
                    </button>
                    <button onClick={() => setActiveTab('workitems')} className={getTabClass('workitems')}>
                      Work Items ({workItems.length})
                    </button>
                    <button 
                      onClick={() => setActiveTab('notes')} 
                      className={`${getTabClass('notes')} ${pendingStatusAction ? 'animate-pulse bg-amber-50' : ''}`}
                    >
                      Notes ({comments.filter(c => c.is_internal).length})
                      {pendingStatusAction && (
                        <span className="ml-1 inline-block w-2 h-2 bg-amber-500 rounded-full"></span>
                      )}
                    </button>
                    <button
                      onClick={() => slaData && setActiveTab('sla')}
                      disabled={!slaData}
                      className={`${getTabClass('sla')} ${!slaData ? 'cursor-not-allowed opacity-50' : ''}`}
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
                      readOnly={ticket?.is_merged}
                    />
                  )}

                  {activeTab === 'attachments' && (
                    <AttachmentsTab
                      attachments={attachments}
                      onAddAttachment={() => setShowAttachmentDrawer(true)}
                    />
                  )}

                  {activeTab === 'activity' && (
                    <div className="space-y-6">
                      <ActivityTimeline activities={activities} />
                    </div>
                  )}

                  {activeTab === 'workitems' && (
                    <WorkItemsTab
                      workItems={workItems}
                      onAddWorkItem={() => setShowWorkItemModal(true)}
                      onEditWorkItem={handleEditWorkItem}
                      onCompleteWorkItem={handleCompleteWorkItem}
                    />
                  )}

                  {activeTab === 'notes' && (
                    <NotesTab
                      ref={notesInputRef}
                      comments={comments}
                      currentUser={currentUser}
                      statusNote={statusNote}
                      setStatusNote={setStatusNote}
                      pendingStatusAction={pendingStatusAction}
                      setPendingStatusAction={setPendingStatusAction}
                      processing={processing}
                      onExecuteAction={executePendingAction}
                      onSubmitComment={handleSubmitComment}
                    />
                  )}

                  {activeTab === 'sla' && (
                    <SLATab slaData={slaData} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Modals */}
        <WorkItemModal
          isOpen={showWorkItemModal}
          onClose={() => {
            setShowWorkItemModal(false)
            setEditingWorkItem(null)
            setWorkItemForm({ title: '', description: '', priority: 'normal', assignee: null, due_date: '', work_notes: '' })
          }}
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

        <HoldSLAModal
          isOpen={showHoldModal}
          onClose={() => {
            setShowHoldModal(false)
            setHoldReason('')
          }}
          holdReason={holdReason}
          setHoldReason={setHoldReason}
          onSubmit={handleHoldSLA}
        />

        <AttachmentDrawer
          isOpen={showAttachmentDrawer}
          onClose={() => setShowAttachmentDrawer(false)}
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

        {/* Merge Ticket Drawer */}
        <Drawer
          isOpen={showMergeModal}
          onClose={closeMergeModal}
          title="Merge Ticket"
          width="max-w-md"
        >
          <DrawerBody>
            <p className="text-sm text-gray-500 mb-6">
              Merge this ticket into another ticket. Comments and attachments will be copied to the target ticket.
            </p>
            
            {/* Search Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search for target ticket
              </label>
              <input
                type="text"
                value={mergeSearchQuery}
                onChange={(e) => {
                  setMergeSearchQuery(e.target.value)
                  searchTicketsForMerge(e.target.value)
                }}
                placeholder="Search by ticket number, title, description..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
              />
            </div>

            {/* Search Results */}
            <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
              {searchingTickets ? (
                <div className="p-4 text-center text-gray-500">
                  <svg className="animate-spin h-5 w-5 mx-auto mb-2 text-[#4a154b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </div>
              ) : mergeSearchResults.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {mergeSearchResults.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedMergeTarget(t)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedMergeTarget?.id === t.id ? 'bg-[#4a154b]/10 border-l-4 border-[#4a154b]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">#{t.ticket_number}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          t.status === 'open' ? 'bg-green-100 text-green-800' :
                          t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          t.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {t.status_display || t.status?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 truncate">{t.title}</p>
                      {t.requester && (
                        <p className="text-xs text-gray-400 mt-1">Requester: {t.requester.name}</p>
                      )}
                    </button>
                  ))}
                </div>
              ) : mergeSearchQuery ? (
                <div className="p-6 text-center text-gray-500">
                  <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  No tickets found matching your search
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Start typing to search for tickets
                </div>
              )}
            </div>

            {/* Selected Ticket */}
            {selectedMergeTarget && (
              <div className="mt-4 p-3 bg-[#4a154b]/10 rounded-lg border border-[#4a154b]/20">
                <p className="text-sm text-[#4a154b]">
                  <span className="font-medium">Selected:</span> #{selectedMergeTarget.ticket_number} - {selectedMergeTarget.title}
                </p>
              </div>
            )}
          </DrawerBody>
          <DrawerFooter>
            <Button variant="ghost" onClick={closeMergeModal}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleMergeTicket}
              disabled={!selectedMergeTarget || merging}
            >
              {merging ? 'Merging...' : 'Merge Ticket'}
            </Button>
          </DrawerFooter>
        </Drawer>
      </AppShell>
    </>
  )
}
