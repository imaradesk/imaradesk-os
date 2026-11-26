import React, { useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import { ListTodo, FileText, Plus } from 'lucide-react'
import DatePicker from '../pickers/DatePicker'
import SimpleSelect from '../SimpleSelect'
import TaskCreatePopover from './TaskCreatePopover'
import { TaskStatusIcon, taskStatusLabel, PriorityIcon, TaskTypeIcon, MiniAvatar, EmptyState, formatDate } from './ui'
import { TASK_STATUSES, PRIORITIES, DUE_FILTERS, TASK_SORTS } from './constants'
import {
  MobileListPage, MobileListHeader, MobileListBody, MobileListRow, MobileFilterSheet, MobileFilterField, stripHtml,
} from '../mobile/MobileList'

const FILTER_LABELS = {
  search: 'Search', taskNumber: 'Task ID', project: 'Project', due: 'Due', status: 'Status',
  priority: 'Priority', assignee: 'Assignee', dateFrom: 'From', dateTo: 'To',
}

const nameFrom = (options, id) => options.find((o) => String(o.id) === String(id))?.name

const isOverdue = (task) => task.is_overdue && !['done', 'cancelled'].includes(task.status)

function TaskStatusPill({ status, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 text-xs font-medium text-gray-700 whitespace-nowrap">
      <TaskStatusIcon status={status} className="!w-3 !h-3" />
      {label || taskStatusLabel(status)}
    </span>
  )
}

/**
 * Phone layout for the tasks page (below `md`), matching MobileTickets: view
 * chips, an inbox-style list that loads further pages on scroll, a filter
 * sheet and a quick-create button in the header. Rows open the full task page; no board/list
 * modes or bulk selection here.
 */
export default function MobileTasks({
  views,
  draftsCount,
  currentView,
  onSelectView,
  onOpenNav,
  pageTitle,
  tasks,
  pagination,
  filters,
  setFilters,
  appliedFilters,
  applyFilters,
  clearFilters,
  sort,
  projects,
  users,
  createStatus,
  createProject,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [items, setItems] = useState(tasks)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [sheetSort, setSheetSort] = useState(sort)
  const appendingRef = useRef(false)

  // New page props either extend the list (load more) or replace it (view/filter change)
  useEffect(() => {
    if (appendingRef.current) {
      appendingRef.current = false
      setItems((prev) => {
        const seen = new Set(prev.map((t) => t.uuid))
        return [...prev, ...tasks.filter((t) => !seen.has(t.uuid))]
      })
    } else {
      setItems(tasks)
    }
  }, [tasks])

  useEffect(() => { setSheetSort(sort) }, [sort])

  const hasMore = Boolean(pagination?.has_next)

  const loadMore = () => {
    if (isLoadingMore || !hasMore) return
    appendingRef.current = true
    setIsLoadingMore(true)
    router.reload({
      data: { page: pagination.current_page + 1 },
      only: ['tasks', 'pagination'],
      preserveScroll: true,
      onError: () => { appendingRef.current = false },
      onFinish: () => setIsLoadingMore(false),
    })
  }

  const onScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollTop + clientHeight >= scrollHeight * 0.8) loadMore()
  }

  const projectOptions = [{ id: 'none', name: 'No project' }, ...projects.map((p) => ({ id: p.uuid, name: p.name }))]
  const assigneeOptions = [{ id: 'unassigned', name: 'Unassigned' }, { id: 'me', name: 'Assigned to me' }, ...users]

  const valueLabel = (key, value) => ({
    project: () => nameFrom(projectOptions, value),
    due: () => nameFrom(DUE_FILTERS, value),
    status: () => nameFrom(TASK_STATUSES, value),
    priority: () => nameFrom(PRIORITIES, value),
    assignee: () => nameFrom(assigneeOptions, value),
  }[key]?.() || value)

  const activeKeys = Object.keys(FILTER_LABELS).filter((k) => appliedFilters[k])
  const removeFilter = (key) => applyFilters({ ...appliedFilters, [key]: '' })

  const chips = [
    ...views.map((v) => ({ id: v.id, label: v.label, count: v.count })),
    { id: 'drafts', label: 'Drafts', count: draftsCount, icon: FileText },
  ]

  const field = (key, options, emptyLabel) => (
    <MobileFilterField label={FILTER_LABELS[key]}>
      <SimpleSelect
        value={filters[key]}
        onChange={(value) => setFilters({ ...filters, [key]: value })}
        ariaLabel={FILTER_LABELS[key]}
        emptyLabel={emptyLabel}
        options={options}
      />
    </MobileFilterField>
  )

  return (
    <MobileListPage>
      <MobileListHeader
        title={pageTitle}
        count={pagination?.total_count ?? items.length}
        onOpenNav={onOpenNav}
        action={(
          <TaskCreatePopover
            status={createStatus}
            defaultProject={createProject}
            trigger={({ toggle, open }) => (
              <button
                onClick={toggle}
                aria-label="New task"
                title="New task"
                aria-expanded={open}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors active:scale-95 ${
                  open ? 'bg-[#0B3D26]/10 text-[#0B3D26]' : 'text-gray-600 active:bg-gray-100'
                }`}
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          />
        )}
        search={{
          value: filters.search,
          onChange: (search) => setFilters({ ...filters, search }),
          onSubmit: () => applyFilters(filters),
          onClear: () => (appliedFilters.search ? removeFilter('search') : setFilters({ ...filters, search: '' })),
          placeholder: 'Title or #id',
          defaultOpen: Boolean(appliedFilters.search),
        }}
        filterCount={activeKeys.filter((k) => k !== 'search').length}
        onOpenFilters={() => setFiltersOpen(true)}
        chips={chips}
        activeChip={currentView}
        onSelectChip={onSelectView}
        appliedFilters={activeKeys.map((key) => ({ key, label: FILTER_LABELS[key], value: valueLabel(key, appliedFilters[key]) }))}
        onRemoveFilter={removeFilter}
        onClearFilters={clearFilters}
      />

      <MobileListBody
        onScroll={onScroll}
        isEmpty={items.length === 0}
        empty={(
          <EmptyState
            icon={ListTodo}
            title={activeKeys.length ? 'No tasks match these filters' : 'No tasks here'}
            description={activeKeys.length ? 'Try removing a filter or switching views.' : 'Tasks in this view will show up here.'}
            action={activeKeys.length > 0 && (
              <button onClick={clearFilters} className="h-9 px-4 text-sm rounded-full border border-gray-300 text-gray-700">Clear filters</button>
            )}
          />
        )}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
      >
        {items.map((task) => {
          const overdue = isOverdue(task)
          return (
            <MobileListRow
              key={task.uuid}
              href={`/tasks/${task.uuid}/`}
              accent={overdue ? 'border-l-red-500' : 'border-l-transparent'}
              leading={<MiniAvatar user={task.assignee} size="w-10 h-10 text-sm" />}
              title={task.title || 'Untitled task'}
              aside={task.due_date ? `${overdue ? 'Overdue · ' : ''}${formatDate(task.due_date)}` : null}
              asideClassName={overdue ? 'text-red-600 font-medium' : 'text-gray-400'}
              subtitle={task.project?.name}
              preview={stripHtml(task.description)}
              meta={(
                <>
                  <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">#{task.id}</span>
                  <TaskStatusPill status={task.status} label={task.status_display} />
                </>
              )}
              trailing={(
                <>
                  <TaskTypeIcon type={task.task_type} />
                  <PriorityIcon priority={task.priority} />
                </>
              )}
            />
          )
        })}
      </MobileListBody>

      <MobileFilterSheet
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={() => applyFilters(filters, sheetSort)}
        onClear={clearFilters}
        canClear={activeKeys.length > 0}
      >
        <MobileFilterField label="Sort by">
          <SimpleSelect value={sheetSort} onChange={setSheetSort} ariaLabel="Sort tasks" options={TASK_SORTS} />
        </MobileFilterField>
        {field('status', TASK_STATUSES.map(({ id, name }) => ({ id, name })), 'Any status')}
        {field('priority', PRIORITIES.map(({ id, name }) => ({ id, name })), 'Any priority')}
        {field('assignee', assigneeOptions, 'Anyone')}
        {field('project', projectOptions, 'All projects')}
        {field('due', DUE_FILTERS, 'Any due date')}
        <div className="grid grid-cols-2 gap-3">
          <MobileFilterField label="From">
            <DatePicker value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(dateFrom) => setFilters({ ...filters, dateFrom })} allowClear placeholder="Any date" aria-label="From date" className="w-full" />
          </MobileFilterField>
          <MobileFilterField label="To">
            <DatePicker value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(dateTo) => setFilters({ ...filters, dateTo })} allowClear placeholder="Any date" aria-label="To date" className="w-full" />
          </MobileFilterField>
        </div>
      </MobileFilterSheet>
    </MobileListPage>
  )
}
