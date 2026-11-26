import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../../utils/axios'
import Modal, { ModalBody, ModalFooter } from '../Modal'
import Select from '../SearchableSelect'
import DatePicker from '../pickers/DatePicker'
import { usePage } from '@inertiajs/react'
import { PROJECT_STATUSES, INPUT } from './constants'
import { FieldError, Spinner, apiError } from './ui'
import { useUnsavedChanges } from '../../context/UnsavedChangesContext'

const emptyForm = (userId) => ({
  name: '',
  description: '',
  status: 'planned',
  owner: userId || '',
  start_date: '',
  target_date: '',
})

/**
 * Create or edit a project. Persists through the project JSON endpoints and
 * shows server-side validation errors next to each field.
 */
export default function ProjectFormModal({ isOpen, onClose, project = null, members, onSaved }) {
  const [saving, setSaving] = useState(false)
  return (
    <Modal isOpen={isOpen} onClose={saving ? () => {} : onClose} title={project ? 'Edit project' : 'New project'} maxWidth="max-w-lg">
      {isOpen && (
        <ProjectForm project={project} members={members} onSaved={onSaved} onCancel={onClose} onSavingChange={setSaving} variant="modal" />
      )}
    </Modal>
  )
}

/** Shared project form (dialog and project Settings tab). */
export function ProjectForm({ project = null, members: membersProp, onSaved, onCancel, onSavingChange, variant = 'page' }) {
  const { props } = usePage()
  const currentUserId = props.auth?.user?.id
  const [form, setForm] = useState(() => (project ? {
    name: project.name || '',
    description: project.description || '',
    status: project.status || 'planned',
    owner: project.owner?.id || '',
    start_date: project.start_date || '',
    target_date: project.target_date || '',
  } : emptyForm(currentUserId)))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState(membersProp || [])
  const [initialForm] = useState(form)
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm)
  const { guard, allowNextNavigation } = useUnsavedChanges(dirty)

  // The sidebar can open this form on pages that don't ship the member list.
  useEffect(() => {
    if (membersProp?.length) return
    api.get('/api/tasks/form-data/')
      .then((res) => setMembers(res.data.users || []))
      .catch(() => toast.error('Could not load workspace members'))
  }, [membersProp])

  useEffect(() => { onSavingChange?.(saving) }, [saving]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const clientErrors = {}
    if (!form.name.trim()) clientErrors.name = 'Project name is required.'
    if (form.start_date && form.target_date && form.target_date < form.start_date) {
      clientErrors.target_date = 'Target date cannot be before the start date.'
    }
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors)
      return
    }

    setSaving(true)
    try {
      const payload = { ...form, owner: form.owner || null, start_date: form.start_date || null, target_date: form.target_date || null }
      const url = project ? `/tasks/projects/${project.uuid}/update/` : '/tasks/projects/new/'
      const res = await api.post(url, payload)
      toast.success(project ? 'Project updated' : 'Project created')
      setSaving(false)
      allowNextNavigation()
      onSaved?.(res.data.project)
      if (variant === 'modal') onCancel?.()
    } catch (error) {
      setErrors(error?.response?.data?.errors || {})
      toast.error(apiError(error, 'Failed to save project'))
      setSaving(false)
    }
  }

  const fields = (
    <>
      <div>
        <label htmlFor="project-name" className="block text-xs font-medium text-gray-600 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="project-name"
          autoFocus={variant === 'modal'}
          value={form.name}
          onChange={(e) => set('name')(e.target.value)}
          className={`${INPUT} ${errors.name ? 'border-red-400' : ''}`}
          placeholder="e.g. Customer onboarding revamp"
          maxLength={200}
        />
        <FieldError error={errors.name} />
      </div>

      <div>
        <label htmlFor="project-description" className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <textarea
          id="project-description"
          value={form.description}
          onChange={(e) => set('description')(e.target.value)}
          rows={variant === 'modal' ? 3 : 5}
          className={`${INPUT} resize-y`}
          placeholder="What is this project about?"
        />
        <FieldError error={errors.description} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <Select value={form.status} onChange={set('status')} options={PROJECT_STATUSES} allowClear={false} />
          <FieldError error={errors.status} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Owner</label>
          <Select value={form.owner} onChange={set('owner')} options={members} placeholder="No owner" searchable />
          <FieldError error={errors.owner} />
        </div>
        <div>
          <label htmlFor="project-start" className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
          <DatePicker id="project-start" value={form.start_date} onChange={set('start_date')} max={form.target_date || undefined} allowClear />
          <FieldError error={errors.start_date} />
        </div>
        <div>
          <label htmlFor="project-target" className="block text-xs font-medium text-gray-600 mb-1">Target date</label>
          <DatePicker
            id="project-target"
            value={form.target_date}
            min={form.start_date || undefined}
            onChange={set('target_date')}
            allowClear
          />
          <FieldError error={errors.target_date} />
        </div>
      </div>
    </>
  )

  const buttons = (
    <>
      {onCancel && (
        <button type="button" onClick={() => guard(onCancel)} disabled={saving} className="h-8 px-3 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
      )}
      <button type="submit" disabled={saving} className="h-8 px-3 text-sm font-medium rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white disabled:opacity-60 inline-flex items-center gap-2">
        {saving && <Spinner className="w-3.5 h-3.5" />}
        {project ? 'Save changes' : 'Create project'}
      </button>
    </>
  )

  if (variant === 'modal') {
    return (
      <form onSubmit={submit} noValidate>
        <ModalBody className="space-y-4">{fields}</ModalBody>
        <ModalFooter className="justify-end">{buttons}</ModalFooter>
      </form>
    )
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {fields}
      <div className="flex items-center justify-end gap-2 pt-2">{buttons}</div>
    </form>
  )
}
