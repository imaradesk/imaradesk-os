import React, { useEffect, useRef, useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import {
  FolderKanban, Pencil, Archive, ArchiveRestore, MoreHorizontal, Plus, LayoutList, Columns3,
  ListTodo, Search, CalendarClock, Link2,
} from 'lucide-react'
import api from '../../utils/axios'
import TasksLayout, { PageHeader } from '../components/tasks/TasksLayout'
import TaskCreatePopover from '../components/tasks/TaskCreatePopover'
import ProjectFormModal from '../components/tasks/ProjectFormModal'
import TaskFilterBar, { cleanParams } from '../components/tasks/TaskFilterBar'
import TaskList, { updateTaskStatus } from '../components/tasks/TaskList'
import TaskBoard from '../components/tasks/TaskBoard'
import DropdownMenu from '../components/DropdownMenu'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal, { ModalBody } from '../components/Modal'
import {
  ProjectStatusBadge, ProgressBar, MiniAvatar, formatDate, EmptyState, Pager, DueDate,
  TaskStatusIcon, apiError, Spinner,
} from '../components/tasks/ui'
import { PROJECT_STATUSES, CONTROL } from '../components/tasks/constants'
import Tabs from '../components/Tabs'

export default function ProjectView(props) {
  const { project, workspace } = props
  return (
    <>
      <Head title={project.name} />
      <TasksLayout
        workspace={workspace}
        newTaskDefaults={project.permissions.can_add_tasks ? { project: project.uuid } : {}}
        lockProject={project.permissions.can_add_tasks}
      >
        <ProjectContent {...props} />
      </TasksLayout>
    </>
  )
}

function ProjectContent({ project, tab, members, ...rest }) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const perms = project.permissions || {}
  const base = `/tasks/projects/${project.uuid}`

  const setArchived = async (archived) => {
    try {
      await api.post(`${base}/${archived ? 'archive' : 'unarchive'}/`)
      toast.success(archived ? 'Project archived' : 'Project restored')
      router.reload({ preserveScroll: true })
    } catch (error) {
      toast.error(apiError(error, 'Could not update project'))
    }
  }

  const changeStatus = async (status) => {
    try {
      await api.post(`${base}/update/`, { status })
      toast.success('Status updated')
      router.reload({ preserveScroll: true })
    } catch (error) {
      toast.error(apiError(error, 'Could not update status'))
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', href: `${base}/` },
    { id: 'tasks', label: 'Tasks', href: `${base}/tasks/`, count: project.counts.total },
  ]

  return (
    <>
      <PageHeader
        title={project.name}
        icon={<FolderKanban className="w-5 h-5 text-gray-400 flex-shrink-0" />}
        actions={
          <>
            {perms.can_edit ? (
              <DropdownMenu
                width={180}
                trigger={({ toggle, open }) => (
                  <button onClick={toggle} aria-expanded={open} aria-haspopup="menu" className="rounded-md hover:ring-1 hover:ring-gray-300">
                    <ProjectStatusBadge status={project.status} label={project.status_display} />
                  </button>
                )}
                items={[
                  { type: 'header', label: 'Set status' },
                  ...PROJECT_STATUSES.map((s) => ({ label: s.name, disabled: s.id === project.status, onClick: () => changeStatus(s.id) })),
                ]}
              />
            ) : (
              <ProjectStatusBadge status={project.status} label={project.status_display} />
            )}
            {perms.can_edit && (
              <DropdownMenu
                width={200}
                trigger={({ toggle, open }) => (
                  <button onClick={toggle} aria-label="Project actions" aria-expanded={open} className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                )}
                items={[
                  { label: 'Edit project', icon: Pencil, onClick: () => setEditOpen(true) },
                  { type: 'divider' },
                  project.is_archived
                    ? { label: 'Restore project', icon: ArchiveRestore, onClick: () => setArchived(false) }
                    : { label: 'Archive project', icon: Archive, danger: true, onClick: () => setConfirmArchive(true) },
                ]}
              />
            )}
          </>
        }
      >
        <div className="px-4 sm:px-6 pb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <MiniAvatar user={project.owner} />
            {project.owner?.name || 'No owner'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
            {project.start_date ? formatDate(project.start_date) : 'No start'} → {' '}
            <span className={project.is_late ? 'text-red-600 font-medium' : ''}>
              {project.target_date ? formatDate(project.target_date) : 'No target'}
            </span>
          </span>
          <ProgressBar value={project.progress} className="w-40" />
          <span>{project.counts.done}/{project.counts.total} done</span>
        </div>
        {project.is_archived && (
          <div className="px-4 sm:px-6 py-2 bg-amber-50 text-amber-700 text-xs border-t border-amber-100 flex items-center gap-2">
            <Archive className="w-3.5 h-3.5" />
            This project is archived. Its tasks are kept, but new tasks cannot be added.
          </div>
        )}
        <div className="px-4 sm:px-6 py-2 border-t border-gray-100">
          <Tabs label="Project sections" active={tab} tabs={tabs} />
        </div>
      </PageHeader>

      {tab === 'overview' && <OverviewTab project={project} {...rest} />}
      {tab === 'tasks' && <TasksTab project={project} members={members} {...rest} />}

      <ProjectFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        members={members}
        onSaved={() => router.reload({ preserveScroll: true })}
      />
      <ConfirmDialog
        isOpen={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() => setArchived(true)}
        title="Archive project?"
        message="The project becomes read-only and is hidden from project pickers. Its tasks stay linked and keep working. You can restore it later."
        confirmText="Archive"
      />
    </>
  )
}

// ─────────────────────────────────────────────
// Overview
// ─────────────────────────────────────────────

function OverviewTab({ project, upcoming = [], activity = [], statusBreakdown = [] }) {
  const stats = [
    { label: 'Total tasks', value: project.counts.total },
    { label: 'Completed', value: project.counts.done },
    { label: 'Open', value: project.counts.open },
    { label: 'Overdue', value: project.counts.overdue, danger: project.counts.overdue > 0 },
  ]
  const totalForBar = statusBreakdown.reduce((n, s) => n + s.count, 0)
  const barColors = { todo: 'bg-gray-400', in_progress: 'bg-blue-500', review: 'bg-purple-500', done: 'bg-green-500', cancelled: 'bg-red-300' }

  return (
    <div className="p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-[1fr_22rem] gap-6 max-w-6xl">
      <div className="space-y-6 min-w-0">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">About</h2>
          {project.description ? (
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{project.description}</p>
          ) : (
            <p className="text-sm text-gray-400">No description yet.</p>
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Progress</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 border border-gray-200 rounded-lg divide-x divide-gray-200 overflow-hidden">
            {stats.map((s) => (
              <div key={s.label} className="px-4 py-3">
                <div className={`text-xl font-semibold tabular-nums ${s.danger ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
          {totalForBar > 0 && (
            <div className="mt-3">
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-100" aria-hidden="true">
                {statusBreakdown.filter((s) => s.count).map((s) => (
                  <div key={s.status} className={barColors[s.status]} style={{ width: `${(s.count / totalForBar) * 100}%` }} title={`${s.label}: ${s.count}`} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {statusBreakdown.map((s) => (
                  <Link key={s.status} href={`/tasks/projects/${project.uuid}/tasks/?status=${s.status}`} className="inline-flex items-center gap-1.5 hover:text-gray-800">
                    <TaskStatusIcon status={s.status} /> {s.label} <span className="tabular-nums">{s.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Upcoming deadlines</h2>
            <Link href={`/tasks/projects/${project.uuid}/tasks/?sort=due_date`} className="text-xs text-gray-500 hover:text-gray-800">View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-400">No open tasks with due dates.</p>
          ) : (
            <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {upcoming.map((t) => (
                <li key={t.uuid} className="flex items-center gap-3 px-3 h-10">
                  <TaskStatusIcon status={t.status} />
                  <Link href={`/tasks/${t.uuid}/`} className="flex-1 truncate text-sm text-gray-900 hover:text-[#0B3D26]">{t.title}</Link>
                  <DueDate date={t.due_date} overdue={t.is_overdue} />
                  <MiniAvatar user={t.assignee} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="min-w-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-gray-400">No activity yet.</p>
        ) : (
          <ol className="relative border-l border-gray-200 ml-1.5 space-y-3">
            {activity.map((a) => (
              <li key={a.id} className="pl-4 relative">
                <span className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-gray-300 ring-2 ring-white" />
                <p className="text-sm text-gray-700 leading-snug">
                  {a.task && (
                    <Link href={`/tasks/${a.task.uuid}/`} className="font-medium text-gray-900 hover:text-[#0B3D26]">#{a.task.id} </Link>
                  )}
                  {a.description}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {a.actor?.name ? `${a.actor.name} · ` : ''}{new Date(a.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────
// Tasks
// ─────────────────────────────────────────────

function NewTaskButton({ project }) {
  return (
    <TaskCreatePopover
      defaultProject={project.uuid}
      lockProject
      trigger={({ toggle }) => (
        <button onClick={toggle} className="h-8 px-3 inline-flex items-center gap-1.5 text-sm font-medium rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white">
          <Plus className="w-4 h-4" /> New task
        </button>
      )}
    />
  )
}

function TasksTab({ project, members = [], tasks = [], pagination, filters = {}, sort, layout = 'list', boardColumns = [], truncated }) {
  const [addExistingOpen, setAddExistingOpen] = useState(false)
  const canAdd = project.permissions.can_add_tasks
  const base = `/tasks/projects/${project.uuid}/tasks/`

  const visit = (params, opts = {}) => {
    router.get(base, cleanParams({ layout, ...params }), { preserveState: true, preserveScroll: true, replace: true, ...opts })
  }

  const onStatusChange = async (task, status) => {
    const updated = await updateTaskStatus(task, status).catch(() => null)
    if (updated) {
      toast.success(`Moved to ${updated.status_display}`)
      router.reload({ only: ['tasks', 'project', 'workspace'], preserveScroll: true })
    }
    return updated
  }

  const hasFilters = ['search', 'status', 'priority', 'assignee', 'due'].some((k) => filters[k])

  const layoutToggle = (
    <div className="flex items-center rounded-md border border-gray-300 p-0.5" role="group" aria-label="Layout">
      {[['list', LayoutList, 'List'], ['board', Columns3, 'Board']].map(([id, Icon, label]) => (
        <button
          key={id}
          onClick={() => visit({ ...filters, sort, layout: id })}
          aria-pressed={layout === id}
          title={`${label} view`}
          className={`p-1 rounded ${layout === id ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 sm:px-6 pt-3">
        {canAdd && (
          <>
            <NewTaskButton project={project} />
            <button onClick={() => setAddExistingOpen(true)} className="h-8 px-3 inline-flex items-center gap-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
              <Link2 className="w-4 h-4" /> Add existing
            </button>
          </>
        )}
      </div>
      <TaskFilterBar
        filters={filters}
        sort={sort}
        users={members}
        showStatus={layout !== 'board'}
        onChange={(params) => visit(params)}
        extra={layoutToggle}
      />

      {tasks.length === 0 && layout !== 'board' ? (
        <div className="border-t border-gray-100">
          {hasFilters ? (
            <EmptyState icon={Search} title="No matching tasks" description="Try a different search or clear the filters." />
          ) : (
            <EmptyState
              icon={ListTodo}
              title="No tasks in this project"
              description={canAdd ? 'Create a task here or link existing tasks to this project.' : 'This project has no tasks.'}
              action={canAdd && (
                <NewTaskButton project={project} />
              )}
            />
          )}
        </div>
      ) : layout === 'board' ? (
        <>
          {truncated && <p className="px-6 pt-2 text-xs text-amber-700">Showing the first 300 tasks. Use filters to narrow the board.</p>}
          <TaskBoard
            tasks={tasks}
            columns={boardColumns}
            onMove={async (task, status) => {
              const updated = await updateTaskStatus(task, status)
              router.reload({ only: ['project', 'workspace'], preserveScroll: true })
              return updated
            }}
            renderColumnAction={canAdd ? (col) => (
              <TaskCreatePopover
                status={col.id}
                defaultProject={project.uuid}
                lockProject
                trigger={({ toggle }) => (
                  <button
                    onClick={toggle}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200"
                    title={`Add task to ${col.label}`}
                    aria-label={`Add task to ${col.label}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              />
            ) : null}
          />
        </>
      ) : (
        <div className="border-t border-gray-100 mt-1">
          <TaskList tasks={tasks} showProject={false} onStatusChange={onStatusChange} />
          <Pager pagination={pagination} onPage={(page) => visit({ ...filters, sort, page })} />
        </div>
      )}

      <AddExistingTasksModal project={project} isOpen={addExistingOpen} onClose={() => setAddExistingOpen(false)} />
    </div>
  )
}

function AddExistingTasksModal({ project, isOpen, onClose }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (!isOpen) { setSearch(''); setSelected([]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.get(`/api/tasks/projects/${project.uuid}/candidates/`, { params: { search } })
        setResults(res.data.tasks || [])
      } catch (error) {
        toast.error(apiError(error, 'Could not search tasks'))
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer.current)
  }, [isOpen, search, project.uuid])

  const toggle = (uuid) => setSelected((s) => (s.includes(uuid) ? s.filter((u) => u !== uuid) : [...s, uuid]))

  const submit = async () => {
    setSaving(true)
    try {
      const res = await api.post(`/tasks/projects/${project.uuid}/add-tasks/`, { task_uuids: selected })
      toast.success(`${res.data.moved} task${res.data.moved === 1 ? '' : 's'} added`)
      onClose()
      router.reload({ preserveScroll: true })
    } catch (error) {
      toast.error(apiError(error, 'Could not add tasks'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add existing tasks" maxWidth="max-w-lg">
      <ModalBody noPadding>
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks by title or #id" className={`${CONTROL} w-full pl-8`} />
          </div>
        </div>
        <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
          {loading && results.length === 0 && <li className="p-4 text-sm text-gray-400 flex items-center gap-2"><Spinner /> Searching…</li>}
          {!loading && results.length === 0 && <li className="p-4 text-sm text-gray-400">No tasks found.</li>}
          {results.map((t) => (
            <li key={t.uuid}>
              <label className="flex items-center gap-3 px-3 h-10 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(t.uuid)} onChange={() => toggle(t.uuid)} className="rounded border-gray-300 text-[#0B3D26] focus:ring-[#0B3D26]/20" />
                <TaskStatusIcon status={t.status} />
                <span className="text-xs text-gray-400 tabular-nums w-10">#{t.id}</span>
                <span className="flex-1 truncate text-sm text-gray-900">{t.title}</span>
                {t.project && <span className="text-xs text-gray-400 truncate max-w-[8rem]" title="Will be moved from this project">{t.project.name}</span>}
              </label>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500">{selected.length} selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-8 px-3 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={!selected.length || saving} className="h-8 px-3 text-sm font-medium rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white disabled:opacity-50 inline-flex items-center gap-2">
              {saving && <Spinner className="w-3.5 h-3.5" />} Add to project
            </button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  )
}
