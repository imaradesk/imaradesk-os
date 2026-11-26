import React from 'react'
import Select from './SearchableSelect'

/**
 * Drop-in replacement for a native <select> built on the shared Select.
 * `options` are { id, name }. Ids are compared as strings, like native option values.
 * `emptyLabel` adds a leading choice with value '' ("Any status", "None", ...).
 * `onChange` receives the chosen id as a string ('' when empty).
 * Pass `compact` for filter bars and sort menus. Lists of more than 7 get a search box.
 */
export default function SimpleSelect({ value, onChange, options = [], emptyLabel, compact = false, className, ...rest }) {
  const items = options.map((o) => ({ ...o, id: String(o.id) }))
  if (emptyLabel) items.unshift({ id: '', name: emptyLabel })

  return (
    <Select
      searchable={items.length > 7}
      {...rest}
      compact={compact}
      className={className || (compact ? 'w-40 sm:w-44' : 'w-full')}
      value={value == null ? '' : String(value)}
      onChange={(v) => onChange(v ?? '')}
      options={items}
      allowClear={false}
    />
  )
}
