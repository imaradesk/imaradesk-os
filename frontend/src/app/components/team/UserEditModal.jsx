import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Lock, Pencil } from 'lucide-react'
import Modal, { ModalButton } from '../Modal'
import { useUnsavedChanges } from '../../context/UnsavedChangesContext'

const inputClass =
  'w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-[#0B3D26]/10 focus:border-[#0B3D26] transition-shadow'

export default function UserEditModal({ isOpen, user, onClose, onSaved }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dirty = isOpen && (fullName !== (user?.full_name || user?.name || '') || email !== (user?.email || ''))
  const { guard } = useUnsavedChanges(dirty)
  const close = () => { if (!saving) guard(onClose) }

  useEffect(() => {
    if (!isOpen) return
    setFullName(user?.full_name || user?.name || '')
    setEmail(user?.email || '')
    setError('')
    setSaving(false)
  }, [isOpen, user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user || saving) return

    const name = fullName.trim()
    const address = email.trim()
    if (!name) { setError('Name is required'); return }
    if (!address) { setError('Email is required'); return }

    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/administration/team/users/${user.id}/update/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.csrfToken },
        body: JSON.stringify({ full_name: name, email: address }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not update this user. Please try again.')
        return
      }

      toast.success('User updated successfully!')
      onSaved?.()
      onClose()
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const groupNames = (user?.groups || []).map((group) => group.name)
  const role = user?.role || 'No role'

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Edit user"
      description="Update their name and email. Role and group access stay the same."
      icon={Pencil}
      size="md"
      footer={
        <>
          <ModalButton variant="ghost" onClick={close} disabled={saving}>Cancel</ModalButton>
          <ModalButton variant="primary" type="submit" form="edit-user-form" loading={saving}>
            Save changes
          </ModalButton>
        </>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <label htmlFor="edit-user-name" className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
          <input
            id="edit-user-name"
            type="text"
            autoFocus
            autoComplete="name"
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); if (error) setError('') }}
            placeholder="Jane Doe"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="edit-user-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            id="edit-user-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
            placeholder="jane@company.com"
            className={inputClass}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Lock className="w-3.5 h-3.5" /> Not editable here
          </div>
          <div className="grid gap-1 text-sm">
            <p className="text-gray-600">
              <span className="font-medium text-gray-700">Role:</span> {role}
            </p>
            <p className="text-gray-600">
              <span className="font-medium text-gray-700">Groups:</span>{' '}
              {groupNames.length ? groupNames.join(', ') : 'No groups'}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 animate-fadeIn" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}
