import React, { useEffect, useState } from 'react'
import { Link } from '@inertiajs/react'
import { TaskStatusIcon, TaskTypeIcon, PriorityIcon, DueDate, MiniAvatar, ProjectStatusDot } from './ui'

/**
 * Kanban board grouped by the board columns configured for tasks (which map
 * to existing task statuses). Drag-and-drop is optimistic: the card moves
 * immediately and snaps back if the backend rejects the change.
 */
export default function TaskBoard({ tasks = [], columns = [], onMove, renderColumnAction, showProject = false }) {
  const [items, setItems] = useState(tasks)
  const [dragging, setDragging] = useState(null)
  const [over, setOver] = useState(null)

  useEffect(() => { setItems(tasks) }, [tasks])

  const drop = async (status) => {
    setOver(null)
    const task = dragging
    setDragging(null)
    if (!task || task.status === status) return
    const previous = items
    setItems((list) => list.map((t) => (t.uuid === task.uuid ? { ...t, status } : t)))
    try {
      const updated = await onMove(task, status)
      if (updated) setItems((list) => list.map((t) => (t.uuid === updated.uuid ? updated : t)))
    } catch (e) {
      setItems(previous)
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-x-auto">
      <div className="flex gap-3 p-4 sm:px-6 h-full min-h-[24rem]">
        {columns.map((col) => {
          const colTasks = items.filter((t) => t.status === col.id)
          const overLimit = col.wip_limit && colTasks.length > col.wip_limit
          return (
            <section
              key={col.id}
              aria-label={col.label}
              onDragOver={(e) => { e.preventDefault(); setOver(col.id) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null) }}
              onDrop={(e) => { e.preventDefault(); drop(col.id) }}
              className={`w-72 flex-shrink-0 flex flex-col rounded-lg transition-colors ${over === col.id ? 'bg-[#0B3D26]/5 ring-1 ring-[#0B3D26]/30' : 'bg-gray-50'}`}
            >
              <header className="flex items-center gap-2 px-3 h-10 flex-shrink-0">
                <TaskStatusIcon status={col.id} />
                <h3 className="text-sm font-medium text-gray-800 truncate">{col.label}</h3>
                <span className={`text-xs tabular-nums ${overLimit ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                  {colTasks.length}{col.wip_limit ? `/${col.wip_limit}` : ''}
                </span>
                {renderColumnAction && <div className="ml-auto flex">{renderColumnAction(col)}</div>}
              </header>
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.uuid}
                    task={task}
                    showProject={showProject}
                    dragging={dragging?.uuid === task.uuid}
                    onDragStart={() => setDragging(task)}
                    onDragEnd={() => { setDragging(null); setOver(null) }}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div className="text-center text-xs text-gray-400 py-6 border border-dashed border-gray-200 rounded-md">No tasks</div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export function TaskCard({ task, showProject, dragging, onDragStart, onDragEnd }) {
  return (
    <article
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', task.uuid); onDragStart() }}
      onDragEnd={onDragEnd}
      className={`bg-white border border-gray-200 rounded-md p-2.5 cursor-grab active:cursor-grabbing hover:border-gray-300 hover:shadow-card transition ${dragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
        <TaskTypeIcon type={task.task_type} />
        <span className="tabular-nums">#{task.id}</span>
        {task.is_overdue && <span className="px-1.5 py-px rounded text-[10px] font-medium bg-red-50 text-red-700">Overdue</span>}
        <span className="ml-auto"><MiniAvatar user={task.assignee} /></span>
      </div>
      <Link href={`/tasks/${task.uuid}/`} className="block text-sm text-gray-900 leading-snug line-clamp-2 hover:text-[#0B3D26]">
        {task.title}
      </Link>
      <div className="flex items-center gap-2.5 mt-2">
        <PriorityIcon priority={task.priority} />
        {task.due_date && <DueDate date={task.due_date} overdue={task.is_overdue} />}
        {showProject && task.project && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 min-w-0">
            <ProjectStatusDot status={task.project.status} />
            <span className="truncate">{task.project.name}</span>
          </span>
        )}
      </div>
    </article>
  )
}
