import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Shapes } from 'lucide-react'
import Modal, { ModalBody, ModalButton } from '../Modal'
import { TYPE_ICONS, createTaskType } from './taskTypes'
import { INPUT } from './constants'

/**
 * "Add type" dialog opened from the type dropdown. Creates the type on the server,
 * then hands it to onCreated so the caller can select it right away.
 */
export default function AddTaskTypeModal({ isOpen, onClose, onCreated, initialName = '' }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('check-square')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setName(initialName)
    setIcon('check-square')
    setDescription('')
    setError('')
  }, [isOpen, initialName])

  const submit = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const created = await createTaskType({ name: name.trim(), icon, description: description.trim() })
      toast.success(`Type “${created.name}” added`)
      onCreated?.(created)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add the type')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} size="md" icon={Shapes} zIndex="z-[10100]"
      title="Add task type" description="Types describe the kind of work, so you can filter and report by them."
      footer={(
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={submit} disabled={!name.trim()} loading={saving}>Add type</ModalButton>
        </>
      )}
    >
      <ModalBody>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
          <div>
            <label htmlFor="task-type-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="task-type-name" type="text" value={name} maxLength={60} autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Site visit, Campaign, Bug"
              className={INPUT}
            />
            {error && <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>}
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Icon</span>
            <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Icon">
              {Object.entries(TYPE_ICONS).map(([key, Icon]) => (
                <button
                  key={key} type="button" role="radio" aria-checked={icon === key} aria-label={key.replace(/-/g, ' ')}
                  title={key.replace(/-/g, ' ')} onClick={() => setIcon(key)}
                  className={`h-9 rounded-lg border flex items-center justify-center transition-colors ${
                    icon === key
                      ? 'border-[#0B3D26] bg-[#0B3D26]/10 text-[#0B3D26] ring-1 ring-[#0B3D26]'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="task-type-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="task-type-description" rows={3} value={description} maxLength={255}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When should this type be used?"
              className={`${INPUT} resize-none`}
            />
          </div>
        </form>
      </ModalBody>
    </Modal>
  )
}
