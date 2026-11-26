import React, { useState } from 'react'
import Select from '../SearchableSelect'
import AddTaskTypeModal from './AddTaskTypeModal'
import { taskTypeOptionIcon } from './ui'
import { useTaskTypes } from './taskTypes'

/** Searchable task type picker with an "Add type" action. `value` / `onChange` use the type id. */
export default function TaskTypeSelect({ value, onChange, ...rest }) {
  const types = useTaskTypes()
  const [adding, setAdding] = useState(false)

  // Until the user picks one, show the workspace default (the server applies the same default)
  const selected = value || types?.[0]?.id || ''

  return (
    <>
      <Select
        {...rest}
        value={selected}
        onChange={onChange}
        options={types || []}
        optionIcon={taskTypeOptionIcon}
        valueKey="id"
        displayKey="name"
        placeholder={types === null ? 'Loading…' : 'Select type'}
        allowClear={false}
        searchable
        footerAction={{ label: 'Add type', onClick: () => setAdding(true) }}
      />
      <AddTaskTypeModal isOpen={adding} onClose={() => setAdding(false)} onCreated={(created) => onChange(created.id)} />
    </>
  )
}
