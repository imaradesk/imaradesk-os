import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { LayoutDashboard, Plus, FolderKanban } from 'lucide-react'
import TasksLayout, { PageHeader } from '../components/tasks/TasksLayout'
import TaskCreatePopover from '../components/tasks/TaskCreatePopover'
import { TaskStatusIcon, PriorityIcon, DueDate, ProgressBar, ProjectStatusDot, formatDate } from '../components/tasks/ui'

export default function TasksOverview(props) {
  return (
    <>
      <Head title="Tasks overview" />
      <TasksLayout workspace={props.workspace}>
        <OverviewContent {...props} />
      </TasksLayout>
    </>
  )
}

function OverviewContent({ workspace = {}, overdue = [], dueSoon = [], inProgress = [], activeProjects = [] }) {
  const tc = workspace.task_counts || {}
  const stats = [
    { label: 'Assigned to me', value: tc.my_open ?? 0, href: '/tasks/?view=my_tasks' },
    { label: 'Due in 7 days', value: tc.due_soon ?? 0, href: '/tasks/?view=due_soon' },
    { label: 'Overdue', value: tc.overdue ?? 0, href: '/tasks/?view=overdue', danger: (tc.overdue ?? 0) > 0 },
    { label: 'Active projects', value: workspace.project_counts?.active ?? 0, href: '/tasks/projects/?status=active' },
  ]

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="What needs your attention across tasks and projects."
        icon={<LayoutDashboard className="w-5 h-5 text-gray-400 flex-shrink-0" />}
        actions={
          <TaskCreatePopover
            trigger={({ toggle }) => (
              <button onClick={toggle} className="h-8 px-3 inline-flex items-center gap-1.5 text-sm font-medium rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white">
                <Plus className="w-4 h-4" /> New task
                <kbd className="hidden sm:inline ml-1 text-[10px] px-1 rounded bg-white/20">C</kbd>
              </button>
            )}
          />
        }
      />
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-gray-200 rounded-lg divide-x divide-y lg:divide-y-0 divide-gray-200 overflow-hidden">
          {stats.map((s) => (
            <Link key={s.label} href={s.href} className="px-4 py-3 hover:bg-gray-50">
              <div className={`text-xl font-semibold tabular-nums ${s.danger ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TaskSection title="Overdue" href="/tasks/?view=overdue" tasks={overdue} empty="Nothing overdue. Nice." />
          <TaskSection title="Due soon" href="/tasks/?view=due_soon" tasks={dueSoon} empty="No assigned tasks due in the next 7 days." />
          <TaskSection title="In progress" href="/tasks/?view=my_tasks&status=in_progress" tasks={inProgress} empty="You have no tasks in progress." />

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active projects</h2>
              <Link href="/tasks/projects/?status=active" className="text-xs text-gray-500 hover:text-gray-800">View all</Link>
            </div>
            {activeProjects.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-400 flex items-center gap-2">
                <FolderKanban className="w-4 h-4" /> No active projects.
              </div>
            ) : (
              <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {activeProjects.map((p) => (
                  <li key={p.uuid}>
                    <Link href={`/tasks/projects/${p.uuid}/`} className="flex items-center gap-3 px-3 h-11 hover:bg-gray-50">
                      <ProjectStatusDot status={p.status} />
                      <span className="flex-1 truncate text-sm text-gray-900">{p.name}</span>
                      <span className={`text-xs hidden sm:inline ${p.is_late ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {p.target_date ? formatDate(p.target_date) : ''}
                      </span>
                      <ProgressBar value={p.progress} className="w-28" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

function TaskSection({ title, href, tasks, empty }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h2>
        <Link href={href} className="text-xs text-gray-500 hover:text-gray-800">View all</Link>
      </div>
      {tasks.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-400">{empty}</div>
      ) : (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100">
          {tasks.map((t) => (
            <li key={t.uuid} className="flex items-center gap-3 px-3 h-10">
              <TaskStatusIcon status={t.status} />
              <PriorityIcon priority={t.priority} />
              <Link href={`/tasks/${t.uuid}/`} className="flex-1 truncate text-sm text-gray-900 hover:text-[#0B3D26]">{t.title}</Link>
              {t.project && <span className="hidden sm:inline text-xs text-gray-400 truncate max-w-[8rem]">{t.project.name}</span>}
              <DueDate date={t.due_date} overdue={t.is_overdue} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
