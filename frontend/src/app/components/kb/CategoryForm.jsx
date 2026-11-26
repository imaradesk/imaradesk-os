import React, { useEffect, useState } from 'react'
import { router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import { X, Check } from 'lucide-react'
import LucideIcon, { CATEGORY_ICONS } from '../LucideIcon'
import { INPUT } from './constants'
import { CategoryIcon, Spinner, PRIMARY_BTN, SECONDARY_BTN } from './ui'
import { useUnsavedChanges } from '../../context/UnsavedChangesContext'

const EMPTY = { name: '', description: '', icon: 'Folder' }

/**
 * Category fields + save. Used inside CategoryCreatePopover (create) and the
 * categories page drawer (edit, pass `category`). The endpoints redirect back to
 * the current page, so saving refreshes it in place.
 * `formId` lets an outside footer submit the form; without it the form renders its own actions.
 */
export default function CategoryForm({ category = null, initial = null, onDone, onCancel, onDirtyChange, formId, onSavingChange, compact = false }) {
  const isEdit = !!category?.id
  const [initialData] = useState(() => ({ ...EMPTY, ...(category || initial || {}) }))
  const [data, setData] = useState(initialData)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (field) => (value) => setData((d) => ({ ...d, [field]: value }))

  const dirty = data.name !== initialData.name || data.description !== initialData.description || data.icon !== initialData.icon
  // Registers the dirty state app-wide; the parent decides how to confirm closing.
  useUnsavedChanges(dirty)

  useEffect(() => { onSavingChange?.(saving) }, [saving]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault()
    // Can render inside another form (the article drawer); don't let the submit reach it
    e.stopPropagation()
    if (!data.name.trim()) { setError('Give the category a name'); return }
    const url = isEdit ? `/knowledgebase/category/${category.id}/update/` : '/knowledgebase/category/add/'
    router.post(url, { name: data.name.trim(), description: data.description, icon: data.icon }, {
      forceFormData: true,
      preserveScroll: true,
      // Keep page state (e.g. an open article drawer) while the new category arrives in the props
      preserveState: true,
      onStart: () => setSaving(true),
      onFinish: () => setSaving(false),
      onSuccess: () => {
        toast.success(isEdit ? 'Category saved' : `“${data.name.trim()}” created`)
        onDone?.()
      },
      onError: () => toast.error('Could not save the category'),
    })
  }

  return (
    <form id={formId} onSubmit={submit} className={compact ? 'space-y-3.5' : 'space-y-5'}>
      <div className="flex items-start gap-3">
        <CategoryIcon icon={data.icon} size={compact ? 'w-9 h-9' : 'w-10 h-10'} iconSize={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <label htmlFor={`${formId || 'kb-cat'}-name`} className="sr-only">Name</label>
            <input
              id={`${formId || 'kb-cat'}-name`}
              type="text"
              autoFocus
              value={data.name}
              onChange={(e) => { set('name')(e.target.value); setError(null) }}
              className={`${INPUT} !font-medium ${error ? '!border-red-400' : ''}`}
              placeholder="Category name, e.g. Getting started"
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
          <div>
            <label htmlFor={`${formId || 'kb-cat'}-desc`} className="sr-only">Description</label>
            <textarea
              id={`${formId || 'kb-cat'}-desc`}
              value={data.description}
              onChange={(e) => set('description')(e.target.value)}
              rows={2}
              className={`${INPUT} resize-none`}
              placeholder="What kind of articles belong here? (optional)"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">Icon</p>
        <div
          role="radiogroup"
          aria-label="Category icon"
          className={`grid ${compact ? 'grid-cols-10 max-h-[7.5rem]' : 'grid-cols-8 sm:grid-cols-10 max-h-56'} gap-1 p-1.5 rounded-lg border border-gray-200 overflow-y-auto`}
        >
          {CATEGORY_ICONS.map((name) => {
            const on = data.icon === name
            return (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={name}
                title={name}
                onClick={() => set('icon')(name)}
                className={`aspect-square rounded-md inline-flex items-center justify-center transition-colors ${
                  on ? 'bg-[#0B3D26] text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                <LucideIcon name={name} className="w-4 h-4" />
              </button>
            )
          })}
        </div>
      </div>

      {!formId && (
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className={SECONDARY_BTN}>Cancel</button>
          <button type="submit" disabled={saving} className={PRIMARY_BTN}>
            {saving ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />} {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      )}
    </form>
  )
}

/** Popover header used by CategoryCreatePopover. */
export function CategoryFormHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      <button type="button" onClick={onClose} className="-mr-1.5 w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100" aria-label="Close">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
