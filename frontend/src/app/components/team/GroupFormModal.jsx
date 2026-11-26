import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Users } from 'lucide-react'
import api from '../../../utils/axios'
import Modal, { ModalBody, ModalButton } from '../Modal'
import { useUnsavedChanges } from '../../context/UnsavedChangesContext'

const NAME_MAX = 128
const FIELD = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]'

/** Create a group, or edit one when `group` is passed. Calls onSaved(group) after the server accepts it. */
export default function GroupFormModal({ isOpen, onClose, group = null, onSaved }) {
  const editing = !!group
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const dirty = isOpen && (name !== (group?.name || '') || description !== (group?.description || ''))
  const { guard } = useUnsavedChanges(dirty)
  const close = () => { if (!saving) guard(onClose) }

  useEffect(() => {
    if (!isOpen) return
    setName(group?.name || '')
    setDescription(group?.description || '')
    setErrors({})
    setSaving(false)
  }, [isOpen, group])

  const submit = async (e) => {
    e?.preventDefault()
    if (saving) return
    if (!name.trim()) {
      setErrors({ name: 'Group name is required' })
      return
    }
    setSaving(true)
    setErrors({})
    try {
      const url = editing ? `/administration/team/groups/${group.id}/edit/` : '/administration/team/groups/add/'
      const res = await api.post(url, { name: name.trim(), description: description.trim() })
      toast.success(editing ? 'Group updated' : 'Group created')
      onSaved?.(res.data.group)
      onClose()
    } catch (err) {
      const serverErrors = err.response?.data?.errors
      if (serverErrors) setErrors(serverErrors)
      else toast.error(editing ? 'Failed to update group' : 'Failed to create group')
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={editing ? 'Edit group' : 'New group'}
      description={editing ? 'Change the name or description of this group.' : 'Groups organise agents for ticket assignment and chat transfers.'}
      icon={Users}
      size="md"
      dismissible={!saving}
      footer={
        <>
          <ModalButton onClick={close} disabled={saving}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={submit} loading={saving}>
            {editing ? 'Save changes' : 'Create group'}
          </ModalButton>
        </>
      }
    >
      <ModalBody>
        <form onSubmit={submit} className="space-y-4">
          {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}
          <div>
            <label htmlFor="group-name" className="block text-xs font-medium text-gray-600 mb-1.5">Name</label>
            <input
              id="group-name"
              data-autofocus
              type="text"
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({ ...errors, name: undefined }) }}
              placeholder="e.g. Billing support"
              className={`${FIELD} ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="group-description" className="block text-xs font-medium text-gray-600 mb-1.5">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="group-description"
              value={description}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this group handles"
              className={`${FIELD} border-gray-300 resize-none`}
            />
          </div>
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </ModalBody>
    </Modal>
  )
}
