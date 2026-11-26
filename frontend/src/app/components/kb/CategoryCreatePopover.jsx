import React, { useEffect, useState } from 'react'
import { Popover } from '../../../components/Popover'
import CategoryForm, { CategoryFormHeader } from './CategoryForm'
import { useUnsavedChanges } from '../../context/UnsavedChangesContext'

/**
 * Category form in the shared Popover, like TaskCreatePopover. Creates a category,
 * or edits one when `category` is passed.
 * `trigger` receives the Popover's { open, toggle, close }; `prefill` seeds a new
 * category (e.g. a suggestion). The form mounts only while open, so every
 * opening starts fresh.
 */
export default function CategoryCreatePopover({ trigger, category = null, prefill = null, placement = 'auto', className = '', width: requestedWidth = 400 }) {
  const [dirty, setDirty] = useState(false)
  const { guard } = useUnsavedChanges(dirty)
  // The guard is app-wide: only ask before closing when *this* form has unsaved
  // input, otherwise closing a clean popover would prompt because some other
  // form (e.g. the article drawer behind it) is dirty.
  const requestClose = (close) => (dirty ? guard(close) : close())
  const width = typeof window !== 'undefined' ? Math.min(requestedWidth, window.innerWidth - 16) : requestedWidth

  return (
    <Popover
      width={width}
      maxHeight={440}
      placement={placement}
      strategy="fixed"
      className={className}
      trigger={trigger}
      onBeforeClose={requestClose}
    >
      {({ close, open }) => open && (
        <PopoverBody
          category={category}
          prefill={prefill}
          close={close}
          requestClose={() => requestClose(close)}
          onDirtyChange={setDirty}
        />
      )}
    </Popover>
  )
}

function PopoverBody({ category, prefill, close, requestClose, onDirtyChange }) {
  // The shared Popover closes on outside click; add Escape here. Capture phase so a
  // surrounding Drawer/Modal doesn't also close.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); requestClose() } }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [requestClose])
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  return (
    <div>
      <CategoryFormHeader title={category ? 'Edit category' : prefill ? `Add “${prefill.name}”` : 'New category'} onClose={requestClose} />
      <div className="p-4">
        <CategoryForm category={category} initial={prefill} onDone={close} onCancel={requestClose} onDirtyChange={onDirtyChange} compact />
      </div>
    </div>
  )
}
