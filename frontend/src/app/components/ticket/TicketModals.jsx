import React, { useRef, useState } from 'react'
import { ListChecks, CheckCircle2, PauseCircle, Paperclip, FileText, X, UploadCloud, Lock, PlayCircle } from 'lucide-react'
import Modal, { ModalBody, ModalButton } from '../Modal'
import Select from '../SearchableSelect'
import DatePicker from '../pickers/DatePicker'
import ConfirmDialog from '../ConfirmDialog'
import { PRIORITIES, INPUT } from '../tasks/constants'
import { priorityOptionIcon } from '../tasks/ui'
import { useUnsavedChanges } from '../../context/UnsavedChangesContext'

const LABEL = 'block text-sm font-medium text-gray-700 mb-1'

const WORK_ITEM_STATUSES = [
  { id: 'todo', name: 'To Do' },
  { id: 'in_progress', name: 'In Progress' },
  { id: 'done', name: 'Done' },
  { id: 'cancelled', name: 'Cancelled' },
]

// Work Item Modal
export function WorkItemModal({
  isOpen,
  onClose,
  workItemForm,
  setWorkItemForm,
  editingWorkItem,
  users = [],
  onSubmit,
}) {
  const set = (patch) => setWorkItemForm({ ...workItemForm, ...patch })
  const initial = editingWorkItem
    ? { title: editingWorkItem.title || '', description: editingWorkItem.description || '', priority: editingWorkItem.priority || 'normal', assignee: editingWorkItem.assignee?.id || null, due_date: editingWorkItem.due_date || '', status: editingWorkItem.status || 'todo', work_notes: editingWorkItem.work_notes || '' }
    : { title: '', description: '', priority: 'normal', assignee: null, due_date: '', work_notes: '' }
  const dirty = JSON.stringify(workItemForm) !== JSON.stringify(initial)
  const { guard } = useUnsavedChanges(isOpen && dirty)
  const close = () => guard(onClose)
  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      icon={ListChecks}
      title={editingWorkItem ? 'Edit work item' : 'Add work item'}
      description="Track a piece of work needed to resolve this ticket."
      size="lg"
      footer={(
        <>
          <ModalButton variant="secondary" onClick={close}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={onSubmit} disabled={!workItemForm.title?.trim()}>
            {editingWorkItem ? 'Save changes' : 'Add work item'}
          </ModalButton>
        </>
      )}
    >
      <ModalBody>
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); if (workItemForm.title?.trim()) onSubmit() }}
        >
          <div>
            <label htmlFor="work-item-title" className={LABEL}>Title <span className="text-red-500">*</span></label>
            <input
              id="work-item-title"
              type="text"
              autoFocus
              value={workItemForm.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="What needs to be done?"
              className={INPUT}
            />
          </div>

          <div>
            <label htmlFor="work-item-description" className={LABEL}>Description</label>
            <textarea
              id="work-item-description"
              value={workItemForm.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={3}
              placeholder="Describe the work required…"
              className={`${INPUT} resize-none`}
            />
          </div>

          {editingWorkItem && (
            <div>
              <label className={LABEL}>Status</label>
              <Select
                value={workItemForm.status || 'todo'}
                onChange={(value) => set({ status: value })}
                options={WORK_ITEM_STATUSES}
                allowClear={false}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Priority</label>
              <Select
                value={workItemForm.priority}
                onChange={(value) => set({ priority: value })}
                options={PRIORITIES}
                optionIcon={priorityOptionIcon}
                allowClear={false}
              />
            </div>
            <div>
              <label className={LABEL}>Assignee</label>
              <Select
                value={workItemForm.assignee || ''}
                onChange={(value) => set({ assignee: value || null })}
                options={users}
                placeholder="Unassigned"
                searchable
              />
            </div>
          </div>

          <div>
            <label htmlFor="work-item-due" className={LABEL}>Due date</label>
            <DatePicker
              id="work-item-due"
              value={workItemForm.due_date}
              onChange={(v) => set({ due_date: v })}
              allowClear
            />
          </div>

          {editingWorkItem && workItemForm.status === 'done' && (
            <div>
              <label htmlFor="work-item-notes" className={LABEL}>Completion notes</label>
              <textarea
                id="work-item-notes"
                value={workItemForm.work_notes}
                onChange={(e) => set({ work_notes: e.target.value })}
                rows={3}
                placeholder="Add notes about the completed work…"
                className={`${INPUT} resize-none`}
              />
            </div>
          )}
          {/* Lets Enter in a text field submit the form */}
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </ModalBody>
    </Modal>
  )
}

// Complete Work Item Modal
export function CompleteWorkItemModal({
  isOpen,
  onClose,
  workItem,
  completionNotes,
  setCompletionNotes,
  onSubmit,
}) {
  const { guard } = useUnsavedChanges(isOpen && Boolean(completionNotes.trim()))
  const close = () => guard(onClose)
  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      icon={CheckCircle2}
      tone="success"
      title="Mark work item complete"
      description={workItem?.title}
      size="lg"
      footer={(
        <>
          <ModalButton variant="secondary" onClick={close}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={onSubmit}>
            <CheckCircle2 className="w-4 h-4" /> Mark as complete
          </ModalButton>
        </>
      )}
    >
      <ModalBody>
        {workItem?.description && (
          <p className="mb-4 text-sm text-gray-600 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">{workItem.description}</p>
        )}
        <label htmlFor="completion-notes" className={LABEL}>Work notes <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea
          id="completion-notes"
          value={completionNotes}
          onChange={(e) => setCompletionNotes(e.target.value)}
          rows={4}
          placeholder="What was done to complete this work item?"
          className={`${INPUT} resize-none`}
          autoFocus
        />
      </ModalBody>
    </Modal>
  )
}

// Hold SLA Modal
export function HoldSLAModal({
  isOpen,
  onClose,
  holdReason,
  setHoldReason,
  onSubmit,
}) {
  const { guard } = useUnsavedChanges(isOpen && Boolean(holdReason?.trim()))
  const close = () => guard(onClose)
  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      icon={PauseCircle}
      tone="warning"
      title="Put ticket on hold"
      description="The SLA timer pauses while the ticket is on hold."
      size="lg"
      footer={(
        <>
          <ModalButton variant="secondary" onClick={close}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={onSubmit} disabled={!holdReason?.trim()}>Put on hold</ModalButton>
        </>
      )}
    >
      <ModalBody>
        <label htmlFor="hold-reason" className={LABEL}>Reason <span className="text-red-500">*</span></label>
        <textarea
          id="hold-reason"
          value={holdReason}
          onChange={(e) => setHoldReason(e.target.value)}
          rows={4}
          placeholder="Why is this ticket on hold?"
          className={`${INPUT} resize-none`}
          autoFocus
        />
      </ModalBody>
    </Modal>
  )
}

// Attachment Modal
export function AttachmentModal({
  isOpen,
  onClose,
  selectedFile,
  setSelectedFile,
  isInternal,
  setIsInternal,
  uploading,
  onUpload,
}) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const clearFile = () => {
    setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const close = () => {
    if (uploading) return
    onClose()
    clearFile()
    setIsInternal(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      icon={Paperclip}
      title="Add attachment"
      description="Attach a file to this ticket."
      size="lg"
      footer={(
        <>
          <ModalButton variant="secondary" onClick={close} disabled={uploading}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={onUpload} disabled={!selectedFile} loading={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </ModalButton>
        </>
      )}
    >
      <ModalBody className="space-y-4">
        <input
          type="file"
          ref={inputRef}
          onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-[#0B3D26]/30 bg-[#0B3D26]/5">
            <span className="w-10 h-10 rounded-md bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-[#0B3D26]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-gray-900 truncate">{selectedFile.name}</span>
              <span className="block text-xs text-gray-500">{Math.max(1, Math.round(selectedFile.size / 1024))} KB</span>
            </span>
            <button
              type="button"
              onClick={clearFile}
              disabled={uploading}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0])
            }}
            className={`w-full flex flex-col items-center gap-1 px-4 py-8 rounded-lg border-2 border-dashed transition-colors ${
              dragOver ? 'border-[#0B3D26] bg-[#0B3D26]/5' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <UploadCloud className="w-8 h-8 text-gray-400" />
            <span className="text-sm text-gray-600"><span className="font-medium text-[#0B3D26]">Choose a file</span> or drag it here</span>
          </button>
        )}

        <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
          <span className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-gray-500" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-gray-900">Internal only</span>
            <span className="block text-xs text-gray-500">Only agents can see internal attachments</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isInternal}
            onClick={() => setIsInternal(!isInternal)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${isInternal ? 'bg-[#0B3D26]' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${isInternal ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </label>
      </ModalBody>
    </Modal>
  )
}

// Resume Ticket Confirm Dialog
export function ResumeTicketConfirm({ isOpen, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Resume ticket"
      message="The ticket moves back to In Progress and its SLA timer resumes, if one applies."
      confirmText="Resume"
      cancelText="Cancel"
      confirmStyle="primary"
      icon={PlayCircle}
    />
  )
}
