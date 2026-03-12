import React, { useRef } from 'react'
import Button from '../../../components/Button'
import Select from '../SearchableSelect'
import Drawer, { DrawerBody, DrawerFooter } from '../Drawer'
import ConfirmDialog from '../ConfirmDialog'
import { THEME } from '../../constants/theme'

// Work Item Modal
export function WorkItemModal({ 
  isOpen, 
  onClose, 
  workItemForm, 
  setWorkItemForm, 
  editingWorkItem,
  users = [],
  onSubmit 
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200" style={{ backgroundColor: '#4a154b' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {editingWorkItem ? 'Edit Work Item' : 'Add Work Item'}
            </h2>
            <button
              onClick={onClose}
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
                rows={3}
                placeholder="Describe the work required..."
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
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSubmit}>
            {editingWorkItem ? 'Update Work Item' : 'Add Work Item'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Complete Work Item Modal
export function CompleteWorkItemModal({ 
  isOpen, 
  onClose, 
  workItem, 
  completionNotes, 
  setCompletionNotes, 
  onSubmit 
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200" style={{ backgroundColor: '#4a154b' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Mark Work Item Complete</h2>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {workItem && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-900 mb-1">{workItem.title}</p>
              {workItem.description && (
                <p className="text-sm text-gray-600">{workItem.description}</p>
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
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSubmit}
            className="bg-green-600 hover:bg-green-700"
          >
            Mark as Complete
          </Button>
        </div>
      </div>
    </div>
  )
}

// Hold SLA Modal
export function HoldSLAModal({ 
  isOpen, 
  onClose, 
  holdReason, 
  setHoldReason, 
  onSubmit 
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200" style={{ backgroundColor: '#4a154b' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Put Ticket On Hold</h2>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Putting this ticket on hold will pause the SLA timer. Please provide a reason for placing the ticket on hold.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hold Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              rows={4}
              placeholder="Enter the reason for putting this ticket on hold..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a154b] resize-none"
              autoFocus
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSubmit}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Put On Hold
          </Button>
        </div>
      </div>
    </div>
  )
}

// Attachment Drawer
export function AttachmentDrawer({ 
  isOpen, 
  onClose, 
  selectedFile, 
  setSelectedFile, 
  isInternal, 
  setIsInternal,
  uploading,
  onUpload 
}) {
  const inputRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => {
        onClose()
        setSelectedFile(null)
        setIsInternal(false)
        if (inputRef.current) {
          inputRef.current.value = ''
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
              onClick={() => inputRef.current?.click()}
            >
              <input
                type="file"
                ref={inputRef}
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
                      if (inputRef.current) {
                        inputRef.current.value = ''
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
              onClick={() => setIsInternal(!isInternal)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isInternal ? 'bg-[#4a154b]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isInternal ? 'translate-x-5' : 'translate-x-0'
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
            onClose()
            setSelectedFile(null)
            setIsInternal(false)
            if (inputRef.current) {
              inputRef.current.value = ''
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onUpload}
          disabled={!selectedFile || uploading}
          style={{ backgroundColor: THEME.PRIMARY }}
        >
          {uploading ? (
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
  )
}

// Resume Ticket Confirm Dialog
export function ResumeTicketConfirm({ isOpen, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Resume Ticket"
      message="Are you sure you want to resume this ticket? This will resume the SLA timer if applicable."
      confirmText="Resume"
      cancelText="Cancel"
    />
  )
}
