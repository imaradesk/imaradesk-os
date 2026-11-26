import React, { useEffect, useRef, useState } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { Popover } from '../../../components/Popover'
import { useTaskTypes } from './taskTypes'
import { TASK_STATUSES, PRIORITIES, DUE_FILTERS, TASK_SORTS, CONTROL } from './constants'
import SimpleSelect from '../SimpleSelect'

/**
 * Server-driven filters for task lists. Every change calls onChange with the
 * full next param set; the page turns that into an Inertia visit so the URL
 * and the results always agree.
 */
export default function TaskFilterBar({
  filters = {},
  sort = 'created',
  onChange,
  users = [],
  projects = null,
  showStatus = true,
  extra = null,
}) {
  const taskTypes = useTaskTypes() || []
  const [search, setSearch] = useState(filters.search || '')
  const timer = useRef(null)
  const first = useRef(true)

  useEffect(() => { setSearch(filters.search || '') }, [filters.search])

  useEffect(() => {
    if (first.current) { first.current = false; return }
    if ((filters.search || '') === search) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange({ ...filters, search, sort }), 350)
    return () => clearTimeout(timer.current)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key) => (value) => onChange({ ...filters, search, sort, [key]: value })
  const filterCount = ['status', 'type', 'priority', 'assignee', 'project', 'due'].filter((k) => k !== 'status' || showStatus).filter((k) => filters[k]).length
  const active = ['status', 'type', 'priority', 'assignee', 'project', 'due', 'search'].filter((k) => filters[k])

  return (
    <div className="px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2 border-t border-gray-100">
      <div className="relative flex-1 min-w-0 sm:flex-none sm:w-56">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { clearTimeout(timer.current); onChange({ ...filters, search, sort }) } }}
          placeholder="Search title or #id"
          aria-label="Search tasks"
          className={`${CONTROL} w-full pl-8`}
        />
      </div>

      <Popover
        width={280}
        maxHeight={420}
        strategy="fixed"
        showArrow={true}
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={toggle}
            title="Filters"
            aria-label="Filters"
            className={`h-8 px-2.5 inline-flex items-center gap-1.5 text-xs rounded-md border transition-colors ${
              filterCount > 0
                ? 'border-[#0B3D26] bg-[#0B3D26]/5 text-[#0B3D26]'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {filterCount > 0 && <span className="font-medium">{filterCount}</span>}
          </button>
        )}
      >
        {() => (
          <div className="p-4 space-y-3">
            <div className="text-sm font-medium text-gray-900">Filters</div>
            {showStatus && (
              <Field label="Status"><SimpleSelect compact className="w-full" value={filters.status} onChange={update('status')} options={TASK_STATUSES} emptyLabel="Any status" ariaLabel="Filter by status" /></Field>
            )}
            <Field label="Type"><SimpleSelect compact className="w-full" value={filters.type} onChange={update('type')} options={taskTypes} emptyLabel="Any type" ariaLabel="Filter by type" /></Field>
            <Field label="Priority"><SimpleSelect compact className="w-full" value={filters.priority} onChange={update('priority')} options={PRIORITIES} emptyLabel="Any priority" ariaLabel="Filter by priority" /></Field>
            <Field label="Assignee">
              <SimpleSelect compact className="w-full"
                value={filters.assignee} onChange={update('assignee')} emptyLabel="Any assignee" ariaLabel="Filter by assignee"
                options={[{ id: 'me', name: 'Assigned to me' }, { id: 'unassigned', name: 'Unassigned' }, ...users]}
              />
            </Field>
            {projects && (
              <Field label="Project">
                <SimpleSelect compact className="w-full"
                  value={filters.project} onChange={update('project')} emptyLabel="Any project" ariaLabel="Filter by project"
                  options={[{ id: 'none', name: 'No project' }, ...projects.map((p) => ({ id: p.uuid, name: p.name }))]}
                />
              </Field>
            )}
            <Field label="Due date"><SimpleSelect compact className="w-full" value={filters.due} onChange={update('due')} options={DUE_FILTERS} emptyLabel="Any due date" ariaLabel="Filter by due date" /></Field>
            <Field label="Sort by"><SimpleSelect compact className="w-full" value={sort} onChange={(value) => onChange({ ...filters, search, sort: value })} options={TASK_SORTS} ariaLabel="Sort tasks" /></Field>
          </div>
        )}
      </Popover>

      {active.length > 0 && (
        <button
          onClick={() => { setSearch(''); onChange({ sort }) }}
          className="h-8 px-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
        >
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        {extra}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </div>
  )
}

/** Drop empty values so URLs stay clean. */
export function cleanParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null && v !== false))
}
