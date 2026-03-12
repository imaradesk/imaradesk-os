import React, { useEffect, useState } from 'react'
import { Head, useForm, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import Select from '../components/SearchableSelect'
import TicketStatusStepper from '../components/TicketStatusStepper'
import { csrfFetch } from '../../utils/csrf'
import { THEME } from '../constants/theme'

export default function AddTicket({ users = [], departments = [], groups = [], currentUser = null }) {
  const { data, setData, post, processing, errors } = useForm({
    title: '',
    description: '',
    requester: currentUser?.id || '',
    assignee: '',
    type: 'question',
    priority: 'normal',
    group: '',
    status: 'new',
    tags: '[]',
    watchers: '[]',
    is_guest_ticket: false,
    guest_name: '',
    guest_email: '',
    guest_phone: '',
  })

  const [tagInput, setTagInput] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedWatchers, setSelectedWatchers] = useState([])
  const [attachedFiles, setAttachedFiles] = useState([])
  const [requestOnBehalf, setRequestOnBehalf] = useState(false)
  const [isGuestTicket, setIsGuestTicket] = useState(false)

  // Set requester to current user by default
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

  const addTag = () => {
    if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
      const newTags = [...selectedTags, tagInput.trim()]
      setSelectedTags(newTags)
      setData('tags', JSON.stringify(newTags))
      setTagInput('')
    }
  }

  const removeTag = (tag) => {
    const newTags = selectedTags.filter(t => t !== tag)
    setSelectedTags(newTags)
    setData('tags', JSON.stringify(newTags))
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }))
    setAttachedFiles([...attachedFiles, ...newFiles])
  }

  const removeFile = (fileId) => {
    setAttachedFiles(attachedFiles.filter(f => f.id !== fileId))
  }

  const toggleWatcher = (userId) => {
    const newWatchers = selectedWatchers.includes(userId)
      ? selectedWatchers.filter(id => id !== userId)
      : [...selectedWatchers, userId]
    setSelectedWatchers(newWatchers)
    setData('watchers', JSON.stringify(newWatchers))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
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
        toast.error('Please select a requester')
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
      <Head title="Add Ticket" />
      <AppShell active="tickets">
        <main className="flex-1 bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Ticket</h1>
                <p className="text-sm text-gray-600 mt-1">Fill in the details below to create a support ticket</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/tickets/"
                  className="px-6 py-2.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={processing}
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-[#4a154b] text-white rounded-md hover:bg-[#0a2f33] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </div>
          </div>

          {/* Status Stepper */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <TicketStatusStepper currentStatus="new" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="h-[calc(100vh-180px)]">
            <div className="grid grid-cols-[60%_40%] gap-6 p-6 h-full">
              {/* Left Section - Title & Description */}
              <div className="bg-white  p-6 flex flex-col">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket Information</h2>
                
                <div className="flex-1 flex flex-col gap-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={data.title}
                      onChange={e => setData('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                      placeholder="Brief summary of the issue"
                    />
                    {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
                  </div>

                  {/* Description */}
                  <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={data.description}
                      onChange={e => setData('description', e.target.value)}
                      className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:border-transparent font-mono text-sm resize-none"
                      placeholder="Detailed description of the issue..."
                    />
                    {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                    <p className="text-xs text-gray-500 mt-1">Use Markdown formatting if needed</p>
                  </div>

                  {/* File Attachments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attachments
                    </label>
                    
                    {/* Upload Button */}
                    <label className="inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-[#4a154b] hover:bg-gray-50 transition-colors">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="text-sm text-gray-600">Choose files or drag and drop</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    
                    {/* File List */}
                    {attachedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {attachedFiles.map(file => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-md"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(file.id)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Section - All Other Fields */}
              <div className="bg-white p-6 overflow-y-auto">
                
                <div className="space-y-6">
                  {/* Assignment */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Assignment</h3>
                    
                    {/* Default Requester - Current User (shown when not requesting on behalf) */}
                    {!requestOnBehalf && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Requester
                        </label>
                        <input
                          type="text"
                          value={currentUser?.name || 'You'}
                          disabled
                          className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                    )}

                    {/* Request on Behalf of Toggle */}
                    <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-md">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requestOnBehalf}
                          onChange={(e) => {
                            setRequestOnBehalf(e.target.checked)
                            // Reset fields when toggling
                            if (!e.target.checked) {
                              // Revert to current user
                              setData('requester', currentUser?.id || '')
                              setData('is_guest_ticket', false)
                              setData('guest_name', '')
                              setData('guest_email', '')
                              setData('guest_phone', '')
                              setIsGuestTicket(false)
                            } else {
                              setData('requester', '')
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4a154b]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4a154b]"></div>
                        <span className="ml-3 text-sm font-medium text-gray-700">Request on Behalf of</span>
                      </label>
                    </div>

                    {/* On behalf options - Only show when requesting on behalf */}
                    {requestOnBehalf && (
                      <>
                        {/* Guest Ticket Toggle */}
                        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isGuestTicket}
                              onChange={(e) => {
                                setIsGuestTicket(e.target.checked)
                                setData('is_guest_ticket', e.target.checked)
                                // Clear fields when toggling
                                if (e.target.checked) {
                                  setData('requester', '')
                                } else {
                                  setData('guest_name', '')
                                  setData('guest_email', '')
                                  setData('guest_phone', '')
                                }
                              }}
                              className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4a154b]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4a154b]"></div>
                            <span className="ml-3 text-sm font-medium text-gray-700">Guest Requester</span>
                          </label>
                          <span className="text-xs text-gray-500">(Requester not in system)</span>
                        </div>

                        {isGuestTicket ? (
                          /* Guest Fields */
                          <div className="space-y-4">
                            {/* Guest Name */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Guest Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={data.guest_name}
                                onChange={e => setData('guest_name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                                placeholder="Enter guest name"
                              />
                              {errors.guest_name && <p className="text-sm text-red-600 mt-1">{errors.guest_name}</p>}
                            </div>

                            {/* Guest Email */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Guest Email <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="email"
                                value={data.guest_email}
                                onChange={e => setData('guest_email', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                                placeholder="Enter guest email"
                              />
                              {errors.guest_email && <p className="text-sm text-red-600 mt-1">{errors.guest_email}</p>}
                            </div>

                            {/* Guest Phone (Optional) */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Guest Phone <span className="text-gray-400 text-xs">(optional)</span>
                              </label>
                              <input
                                type="tel"
                                value={data.guest_phone}
                                onChange={e => setData('guest_phone', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                                placeholder="Enter guest phone number"
                              />
                            </div>
                          </div>
                        ) : (
                          /* Select User from System */
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Requester <span className="text-red-500">*</span>
                            </label>
                            <Select
                              value={data.requester}
                              onChange={(value) => setData('requester', value)}
                              options={users}
                              placeholder="Select requester"
                              displayKey="name"
                              valueKey="id"
                              error={errors.requester}
                              required
                              searchable={true}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Assignee - Always shown */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assignee
                      </label>
                      <Select
                        value={data.assignee}
                        onChange={(value) => setData('assignee', value)}
                        options={users}
                        placeholder="Unassigned"
                        displayKey="name"
                        valueKey="id"
                        searchable={true}
                      />
                    </div>
              </div>

              {/* Categorization */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Categorization</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={data.type}
                      onChange={(value) => setData('type', value)}
                      options={[
                        { id: 'question', name: 'Question' },
                        { id: 'incident', name: 'Incident' },
                        { id: 'problem', name: 'Problem' },
                        { id: 'task', name: 'Task' },
                      ]}
                      placeholder="Select type"
                      displayKey="name"
                      valueKey="id"
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={data.priority}
                      onChange={(value) => setData('priority', value)}
                      options={[
                        { id: 'low', name: 'Low' },
                        { id: 'normal', name: 'Normal' },
                        { id: 'high', name: 'High' },
                        { id: 'urgent', name: 'Urgent' },
                      ]}
                      placeholder="Select priority"
                      displayKey="name"
                      valueKey="id"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <Select
                      value={data.status}
                      onChange={(value) => setData('status', value)}
                      options={[
                        { id: 'new', name: 'New' },
                        { id: 'open', name: 'Open' },
                        { id: 'in_progress', name: 'In Progress' },
                        { id: 'pending', name: 'Pending' },
                        { id: 'resolved', name: 'Resolved' },
                      ]}
                      placeholder="Select status"
                      displayKey="name"
                      valueKey="id"
                    />
                  </div>

                  {/* Assignment Group */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assignment Group
                    </label>
                    <Select
                      value={data.group}
                      onChange={(value) => setData('group', value)}
                      options={groups.map(g => ({ ...g, name: `👥 ${g.name}` }))}
                      placeholder="-Select Group-"
                      displayKey="name"
                      valueKey="id"
                      searchable={true}
                    />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Tags</h3>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                    placeholder="Add tags (press Enter)"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-[#4a154b] text-white rounded-md hover:bg-[#0a2f33] transition-colors"
                  >
                    Add
                  </button>
                </div>
                
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Watchers */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Watchers</h3>
                <p className="text-sm text-gray-600 mb-3">Select users to receive notifications</p>
                
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {users.map(user => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedWatchers.includes(user.id)}
                        onChange={() => toggleWatcher(user.id)}
                        className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                      />
                      <span className="text-sm">{user.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
        </main>
      </AppShell>
    </>
  )
}
