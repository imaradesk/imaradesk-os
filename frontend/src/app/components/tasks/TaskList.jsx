import React from 'react'
import { Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import api from '../../../utils/axios'
import DropdownMenu from '../DropdownMenu'
import { TASK_STATUSES } from './constants'
import { TaskStatusIcon, TaskTypeIcon, PriorityIcon, DueDate, MiniAvatar, ProjectStatusDot, taskStatusLabel, apiError } from './ui'

/** Persist a status change; resolves to the updated task row or throws. */
export async function updateTaskStatus(task, status) {
  try {
    const res = await api.post(`/tasks/${task.uuid}/update/`, { status })
    return res.data.task
  } catch (error) {
    toast.error(apiError(error, 'Failed to update status'))
    throw error
  }
}

/**
 * Dense, Linear-style task list. Rows link to the existing task detail page;
 * the status glyph opens an inline status menu.
 */
export default function TaskList({ tasks = [], showProject = true, onStatusChange, empty = null, selectable = false, selected = [], onToggle }) {
  if (tasks.length === 0) return empty

  return (
    <div role="table" aria-label="Tasks" className="divide-y divide-gray-100">
      <div role="row" className="hidden md:grid grid-cols-[1fr_9rem_6rem_5.5rem_2rem] gap-3 items-center px-4 sm:px-6 h-8 text-[11px] font-medium uppercase tracking-wider text-gray-400 bg-gray-50">
        <span role="columnheader">Task</span>
        <span role="columnheader">{showProject ? 'Project' : ''}</span>
        <span role="columnheader">Priority</span>
        <span role="columnheader">Due</span>
        <span role="columnheader" className="sr-only">Assignee</span>
      </div>
      {tasks.map((task) => (
        <TaskRow
          key={task.uuid}
          task={task}
          showProject={showProject}
          onStatusChange={onStatusChange}
          selectable={selectable}
          isSelected={selected.includes(task.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

export function TaskRow({ task, showProject, onStatusChange, selectable, isSelected, onToggle }) {
  return (
    <div
      role="row"
      className={`group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_9rem_6rem_5.5rem_2rem] gap-x-3 gap-y-1 items-center px-4 sm:px-6 py-2 md:py-0 md:h-10 hover:bg-gray-50 ${isSelected ? 'bg-[#0B3D26]/5' : ''}`}
    >
      <div role="cell" className="flex items-center gap-2.5 min-w-0">
        {selectable && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle(task.id)}
            aria-label={`Select task ${task.id}`}
            className="rounded border-gray-300 text-[#0B3D26] focus:ring-[#0B3D26]/20"
          />
        )}
        <StatusMenu task={task} onStatusChange={onStatusChange} />
        <TaskTypeIcon type={task.task_type} />
        <span className="text-xs text-gray-400 tabular-nums flex-shrink-0 w-10">#{task.id}</span>
        <Link href={`/tasks/${task.uuid}/`} className="truncate text-sm text-gray-900 hover:text-[#0B3D26] focus:outline-none focus-visible:underline">
          {task.title}
        </Link>
        {task.is_overdue && <span className="flex-shrink-0 px-1.5 py-px rounded text-[10px] font-medium bg-red-50 text-red-700">Overdue</span>}
      </div>
      <div role="cell" className="hidden md:flex items-center gap-1.5 min-w-0 text-xs text-gray-600">
        {showProject && task.project && (
          <Link href={`/tasks/projects/${task.project.uuid}/`} className="inline-flex items-center gap-1.5 min-w-0 hover:text-gray-900">
            <ProjectStatusDot status={task.project.status} />
            <span className="truncate">{task.project.name}</span>
          </Link>
        )}
      </div>
      <div role="cell" className="hidden md:block"><PriorityIcon priority={task.priority} showLabel /></div>
      <div role="cell" className="hidden md:block"><DueDate date={task.due_date} overdue={task.is_overdue} /></div>
      <div role="cell" className="flex justify-end"><MiniAvatar user={task.assignee} /></div>
      {/* Mobile meta line */}
      <div className="md:hidden col-span-2 flex items-center gap-3 pl-6 text-xs text-gray-500">
        <PriorityIcon priority={task.priority} />
        {task.due_date && <DueDate date={task.due_date} overdue={task.is_overdue} />}
        {showProject && task.project && <span className="truncate">{task.project.name}</span>}
      </div>
    </div>
  )
}

export function StatusMenu({ task, onStatusChange }) {
  if (!onStatusChange) {
    return <span title={taskStatusLabel(task.status)}><TaskStatusIcon status={task.status} /></span>
  }
  return (
    <DropdownMenu
      align="left"
      width={180}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          title={`Status: ${taskStatusLabel(task.status)}`}
          className="p-0.5 -m-0.5 rounded hover:bg-gray-200"
        >
          <TaskStatusIcon status={task.status} />
        </button>
      )}
      items={[
        { type: 'header', label: 'Change status' },
        ...TASK_STATUSES.map((s) => ({
          label: s.name,
          icon: (props) => <TaskStatusIcon status={s.id} {...props} />,
          disabled: s.id === task.status,
          onClick: () => onStatusChange(task, s.id),
        })),
      ]}
    />
  )
}
