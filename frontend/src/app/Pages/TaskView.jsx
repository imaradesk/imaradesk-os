import React, { useState, useEffect } from 'react'
import { Head, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import Select from '../components/SearchableSelect'
import Button from '../../components/Button'
import Avatar from '../../components/Avatar'
import ActivityTimeline from '../../components/ActivityTimeline'
import ConversationTab from '../components/ticket/ConversationTab'
import AttachmentsTab from '../components/ticket/AttachmentsTab'

export default function TaskView({ task, users = [], groups = [], comments = [], attachments = [], activities = [] }) {
  const [editingField, setEditingField] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('conversation')
  const [newComment, setNewComment] = useState('')
  const [commentInternal, setCommentInternal] = useState(false)
  const [commentMentions, setCommentMentions] = useState([])
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

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

    api.post(`/tasks/${task.uuid}/comment/`, {
      ...payload,
      attachments: JSON.stringify(payload.attachments || [])
    }).then(() => {
      toast.success('Comment added successfully')
      setNewComment('')
      setCommentInternal(false)
      setCommentMentions([])
      setProcessing(false)
      router.reload({ preserveScroll: true })
    }).catch(() => {
      toast.error('Failed to add comment')
      setProcessing(false)
    })
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // First upload the file to get a URL
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      toast.loading('Uploading file...', { id: 'file-upload' })

      const uploadResponse = await api.post('/upload/', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const uploadData = uploadResponse.data

      // Then create the attachment with the file URL
      const attachFormData = new FormData()
      attachFormData.append('file_url', uploadData.file_url)
      attachFormData.append('file_name', uploadData.file_name)
      attachFormData.append('file_size', uploadData.file_size)
      attachFormData.append('file_type', uploadData.file_type)

      await api.post(`/tasks/${task.uuid}/attachment/`, attachFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast.success('File uploaded successfully', { id: 'file-upload' })
      router.reload({ preserveScroll: true })
    } catch {
      toast.error('Failed to upload file', { id: 'file-upload' })
    }
  }

  const updateField = (field, value) => {
    const payload = { [field]: value }

    api.post(`/tasks/${task.uuid}/update/`, payload)
      .then(() => {
        toast.success('Task updated')
        setEditingField(null)
        router.reload({ preserveScroll: true })
      }).catch(() => {
        toast.error('Failed to update task')
      })
  }

  const updateStatus = (newStatus) => {
    updateField('status', newStatus)
  }

  const statusColors = {
    todo: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-purple-100 text-purple-700',
    done: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const priorityColors = {
    low: 'text-gray-600',
    normal: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600',
  }

  // Skeleton component
  const TaskSkeleton = () => (
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
      <div className="flex gap-6 p-6">
        <div className="w-80 space-y-4">
          <div className="bg-white -sm p-6">
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
        <div className="flex-1 space-y-6">
          <div className="bg-white -sm p-6">
            <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </main>
  )

  if (loading) {
    return (
      <>
        <Head title="Loading..." />
        <AppShell active="tasks">
          <TaskSkeleton />
        </AppShell>
      </>
    )
  }

  return (
    <>
      <Head title={task?.title || 'Task'} />
      <AppShell active="tasks">
        <main className="flex-1 bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.visit('/tasks')}
                className="inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Tasks
              </Button>
            </div>
            
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-gray-500 font-medium text-lg">Task #{task?.id}</span>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[task?.status] || 'bg-gray-100 text-gray-700'}`}>
                    {task?.status_display || 'To Do'}
                  </span>
                  <span className={`text-sm font-semibold ${priorityColors[task?.priority] || ''}`}>
                    {task?.priority_display} Priority
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{task?.title}</h1>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar name={task?.created_by?.name} size="sm" />
                    <div>
                      <p className="text-xs text-gray-500">Created by</p>
                      <p className="font-medium text-gray-900">{task?.created_by?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  {task?.assignee && (
                    <div className="flex items-center gap-2">
                      <Avatar name={task.assignee.name} size="sm" />
                      <div>
                        <p className="text-xs text-gray-500">Assignee</p>
                        <p className="font-medium text-gray-900">{task.assignee.name}</p>
                      </div>
                    </div>
                  )}
                  {task?.due_date && (
                    <div>
                      <p className="text-xs text-gray-500">Due Date</p>
                      <p className="font-medium text-gray-900">{task.due_date}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={task?.status || 'todo'}
                  onChange={(value) => updateStatus(value)}
                  options={[
                    { id: 'todo', name: 'To Do' },
                    { id: 'in_progress', name: 'In Progress' },
                    { id: 'review', name: 'In Review' },
                    { id: 'done', name: 'Done' },
                    { id: 'cancelled', name: 'Cancelled' },
                  ]}
                  placeholder="Select status"
                  displayKey="name"
                  valueKey="id"
                  className="min-w-[160px]"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex gap-6 p-6">
            {/* Sidebar */}
            <aside className="w-80 space-y-4">
              <div className="bg-white -sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-600 mb-1">Created:</dt>
                    <dd className="text-gray-900 font-medium">{task?.created_at}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600 mb-1">Updated:</dt>
                    <dd className="text-gray-900 font-medium">{task?.updated_at}</dd>
                  </div>
                  {task?.completed_at && (
                    <div>
                      <dt className="text-gray-600 mb-1">Completed:</dt>
                      <dd className="text-gray-900 font-medium">{task.completed_at}</dd>
                    </div>
                  )}

                  {/* Assignee */}
                  <div>
                    <dt className="text-gray-600 mb-1">Assignee:</dt>
                    {editingField === 'assignee' ? (
                      <Select
                        value={task?.assignee?.id || ''}
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
                        {task?.assignee?.name || 'Unassigned'}
                      </dd>
                    )}
                  </div>

                  {/* Group */}
                  <div>
                    <dt className="text-gray-600 mb-1">Group:</dt>
                    {editingField === 'group' ? (
                      <Select
                        value={task?.group?.id || ''}
                        onChange={(value) => {
                          updateField('group', value || null)
                          setEditingField(null)
                        }}
                        options={groups}
                        placeholder="No Group"
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
                        {task?.group?.name || 'No Group'}
                      </dd>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <dt className="text-gray-600 mb-1">Priority:</dt>
                    {editingField === 'priority' ? (
                      <Select
                        value={task?.priority || 'normal'}
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
                        className={`font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded ${priorityColors[task?.priority] || ''}`}
                      >
                        {task?.priority_display || 'Normal'}
                      </dd>
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <dt className="text-gray-600 mb-1">Due Date:</dt>
                    {editingField === 'due_date' ? (
                      <input
                        type="date"
                        autoFocus
                        defaultValue={task?.due_date || ''}
                        onBlur={(e) => {
                          updateField('due_date', e.target.value)
                          setEditingField(null)
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.target.blur()
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#4a154b]"
                      />
                    ) : (
                      <dd
                        onClick={() => setEditingField('due_date')}
                        className="text-gray-900 font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                      >
                        {task?.due_date || 'No due date'}
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
                        defaultValue={task?.tags?.join(', ') || ''}
                        onBlur={(e) => {
                          const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                          updateField('tags', tags)
                          setEditingField(null)
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
                        {task?.tags && task.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {task.tags.map((tag, i) => (
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

                  {/* Watchers */}
                  <div>
                    <dt className="text-gray-600 mb-1">Watchers:</dt>
                    {editingField === 'watchers' ? (
                      <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                        {users.map(user => (
                          <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                            <input
                              type="checkbox"
                              defaultChecked={task?.watchers?.some(w => w.id === user.id)}
                              onChange={(e) => {
                                const currentWatchers = task?.watchers?.map(w => w.id) || []
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
                        {task?.watchers && task.watchers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {task.watchers.map((w, i) => (
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
                </dl>
              </div>

              {/* Attachments Summary */}
              {attachments.length > 0 && (
                <div className="bg-white -sm border border-gray-200 p-4">
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
            <div className="flex-1">
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
                </div>
              </div>

              {/* Tab Content */}
              <div className="bg-gray-50 rounded-b-lg border border-gray-200 border-t-0 p-6 h-[600px] overflow-hidden">
                {activeTab === 'conversation' && (
                  <ConversationTab
                    task={task}
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
                  />
                )}

                {activeTab === 'attachments' && (
                  <AttachmentsTab
                    attachments={attachments}
                    onAddAttachment={() => {
                      // Trigger file input click
                      const fileInput = document.createElement('input')
                      fileInput.type = 'file'
                      fileInput.onchange = handleFileUpload
                      fileInput.click()
                    }}
                  />
                )}

                {activeTab === 'activity' && (
                  <div className="h-full overflow-y-auto">
                    <ActivityTimeline activities={activities} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    </>
  )
}
