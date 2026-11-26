import React, { useEffect, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Pencil, Plus, Search } from 'lucide-react'
import Popover from '../../../components/Popover'

function OptionList({ open, options, selected, onPick, searchable, optionIcon, emptyLabel, multiple, close, footerAction }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  // The popover stays mounted while closed, so reset and focus the search each time it opens
  useEffect(() => {
    if (!open) return
    setQuery('')
    if (searchable) inputRef.current?.focus()
  }, [open, searchable])

  const all = emptyLabel ? [{ id: '', name: emptyLabel }, ...options] : options
  const q = query.trim().toLowerCase()
  const shown = q ? all.filter((o) => (o.name || '').toLowerCase().includes(q)) : all
  const isSelected = (id) => (multiple ? selected.includes(id) : selected === id)

  return (
    <div>
      {searchable && (
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search options"
              className="w-full h-8 pl-8 pr-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#0B3D26]"
            />
          </div>
        </div>
      )}

      <div className="py-1 max-h-64 overflow-y-auto">
        {shown.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-500">No matches</p>
        ) : shown.map((o) => (
          <button
            key={o.id || 'none'}
            type="button"
            role="option"
            aria-selected={isSelected(o.id)}
            onClick={() => onPick(o.id)}
            className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 transition-colors"
          >
            {optionIcon && (
              <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                {o.id === '' ? null : optionIcon(o)}
              </span>
            )}
            <span className={`flex-1 min-w-0 text-sm truncate ${isSelected(o.id) ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
              {o.name}
            </span>
            {isSelected(o.id) && <Check className="w-4 h-4 flex-shrink-0 text-[#0B3D26]" />}
          </button>
        ))}
      </div>

      {footerAction && (
        <div className="border-t border-gray-200 py-1">
          <button
            type="button"
            onClick={() => { close(); footerAction.onClick() }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-[#0B3D26] hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> {footerAction.label}
          </button>
        </div>
      )}

      {multiple && (
        <div className="border-t border-gray-200 py-1">
          <button
            type="button"
            onClick={close}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-[#0B3D26] hover:bg-gray-100 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Click-to-edit field styled like the sidebar popovers: arrow, header, icon rows, footer.
 * Single mode closes on pick; `multiple` keeps it open and `value` is an array of ids.
 * `emptyLabel` adds a leading "clear" option whose id is ''.
 */
export default function FieldPopover({
  children, label, description, value, options = [], onPick, searchable = false, optionIcon = null,
  emptyLabel = null, multiple = false, disabled = false, width = 300, triggerClassName = '-mx-1 px-1',
  footerAction = null, // { label, onClick }: pinned action under the options, e.g. "Add type"
  variant = 'plain', // "plain": inline edit affordance | "field": full-width bordered select-style trigger
  wrapperClassName = null, // overrides the popover wrapper classes (useful inside flex rows)
}) {
  const isField = variant === 'field'

  if (disabled) {
    return (
      <div className={`flex items-center gap-1.5 min-w-0 ${isField ? 'w-full mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2' : ''}`}>
        {children}
      </div>
    )
  }

  return (
    <Popover
      strategy="fixed"
      showArrow
      width={width}
      maxHeight={360}
      className={wrapperClassName ?? (isField ? 'w-full mt-1' : '')}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          title="Edit"
          className={`group flex items-center gap-1.5 min-w-0 transition-colors ${
            isField
              ? 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left hover:border-gray-400 focus:outline-none focus-visible:border-[#0B3D26] focus-visible:ring-2 focus-visible:ring-[#0B3D26]/20'
              : 'rounded hover:bg-gray-100'
          } ${triggerClassName}`}
        >
          <span className="flex items-center gap-1.5 min-w-0 flex-1 text-left">{children}</span>
          {isField ? (
            <ChevronsUpDown className={`w-4 h-4 flex-shrink-0 ${open ? 'text-gray-600' : 'text-gray-400'}`} />
          ) : (
            <Pencil className={`w-3 h-3 flex-shrink-0 transition-opacity ${open ? 'opacity-100 text-[#0B3D26]' : 'opacity-0 group-hover:opacity-100 text-gray-400'}`} />
          )}
        </button>
      )}
    >
      {({ close, open }) => (
        <>
          {label && (
            <div className="px-4 py-2 border-b border-gray-200">
              <div className="text-sm font-medium text-gray-900">{label}</div>
              {description && <div className="text-xs text-gray-500">{description}</div>}
            </div>
          )}
          <OptionList
            open={open}
            options={options}
            selected={value}
            searchable={searchable}
            optionIcon={optionIcon}
            emptyLabel={emptyLabel}
            multiple={multiple}
            close={close}
            footerAction={footerAction}
            onPick={(id) => {
              if (!multiple) close()
              onPick(id)
            }}
          />
        </>
      )}
    </Popover>
  )
}
