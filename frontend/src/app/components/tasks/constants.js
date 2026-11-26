// Task statuses and priorities mirror modules/tasks/models.py (Task.Status / Task.Priority).
export const TASK_STATUSES = [
  { id: 'todo', name: 'To Do', dot: 'bg-gray-400', text: 'text-gray-600' },
  { id: 'in_progress', name: 'In Progress', dot: 'bg-blue-500', text: 'text-blue-600' },
  { id: 'review', name: 'In Review', dot: 'bg-purple-500', text: 'text-purple-600' },
  { id: 'done', name: 'Done', dot: 'bg-green-500', text: 'text-green-600' },
  { id: 'cancelled', name: 'Cancelled', dot: 'bg-red-400', text: 'text-red-600' },
]

export const TASK_STATUS_MAP = Object.fromEntries(TASK_STATUSES.map((s) => [s.id, s]))

export const PRIORITIES = [
  { id: 'urgent', name: 'Urgent', bars: 4, text: 'text-red-600' },
  { id: 'high', name: 'High', bars: 3, text: 'text-orange-600' },
  { id: 'normal', name: 'Normal', bars: 2, text: 'text-gray-600' },
  { id: 'low', name: 'Low', bars: 1, text: 'text-gray-400' },
]

export const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map((p) => [p.id, p]))

// Project statuses mirror Project.Status.
export const PROJECT_STATUSES = [
  { id: 'planned', name: 'Planned', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700' },
  { id: 'active', name: 'Active', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700' },
  { id: 'on_hold', name: 'On Hold', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
  { id: 'completed', name: 'Completed', dot: 'bg-green-500', badge: 'bg-green-50 text-green-700' },
  { id: 'canceled', name: 'Canceled', dot: 'bg-red-400', badge: 'bg-red-50 text-red-700' },
]

export const PROJECT_STATUS_MAP = Object.fromEntries(PROJECT_STATUSES.map((s) => [s.id, s]))

export const DUE_FILTERS = [
  { id: 'overdue', name: 'Overdue' },
  { id: 'due_soon', name: 'Due in 7 days' },
  { id: 'no_date', name: 'No due date' },
]

export const TASK_SORTS = [
  { id: 'created', name: 'Newest' },
  { id: 'updated', name: 'Recently updated' },
  { id: 'due_date', name: 'Due date' },
  { id: 'priority', name: 'Priority' },
  { id: 'status', name: 'Status' },
  { id: 'title', name: 'Title' },
]

export const PROJECT_SORTS = [
  { id: 'updated', name: 'Recently updated' },
  { id: 'name', name: 'Name' },
  { id: 'target_date', name: 'Target date' },
  { id: 'progress', name: 'Progress' },
  { id: 'created', name: 'Newest' },
]

// Shared compact control styles (follow existing form conventions).
export const CONTROL =
  'h-8 px-2.5 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]'
export const INPUT =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]'
