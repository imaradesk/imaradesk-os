import {
  Inbox, UserRound, UserCheck, UserMinus, UsersRound, AlarmClock, CalendarClock, Eye, History, Clock, Hourglass,
  CircleCheck, CircleDot, Loader, ScanSearch, Flame, ListTodo, CircleUser, PenLine, Files, Globe, FilePen, Archive,
  Send, Sparkles, CircleAlert, TimerOff, ListChecks, Bookmark,
} from 'lucide-react'

/**
 * Icons for the saved views stored in the database (SettingsView, `conf_views`).
 *
 * The database only holds `type` and `view_id`; the icon is hardcoded here and
 * matched on `view_id` when the views load. Keys mirror ViewsRegistry in
 * shared/utilities/enums/views.py, so adding a default view there means adding
 * a line here. Unknown or custom view ids fall back to FALLBACK_ICON.
 */

export const ViewType = Object.freeze({
  TICKET: 'TICKET',
  TASK: 'TASK',
  KB: 'KB',
})

const v = (icon, color) => ({ icon, color })

export const TICKET_VIEW_ICONS = Object.freeze({
  all_tickets: v(Inbox, '#64748b'),
  unsolved: v(UserRound, '#6366f1'),
  response_overdue: v(AlarmClock, '#ef4444'),
  resolution_due_today: v(CalendarClock, '#f59e0b'),
  my_resolution_overdue: v(TimerOff, '#ef4444'),
  requested_by_me: v(Send, '#0ea5e9'),
  watching: v(Eye, '#8b5cf6'),
  unassigned: v(UserMinus, '#f59e0b'),
  all_unsolved: v(CircleDot, '#6366f1'),
  recently_updated: v(History, '#0ea5e9'),
  new_in_groups: v(Sparkles, '#10b981'),
  pending: v(Hourglass, '#0ea5e9'),
  recently_solved: v(CircleCheck, '#10b981'),
  unsolved_in_groups: v(UsersRound, '#6366f1'),
})

export const TASK_VIEW_ICONS = Object.freeze({
  all: v(ListTodo, '#64748b'),
  my_tasks: v(CircleUser, '#6366f1'),
  created_by_me: v(PenLine, '#0ea5e9'),
  watching: v(Eye, '#8b5cf6'),
  todo: v(CircleDot, '#64748b'),
  in_progress: v(Loader, '#0ea5e9'),
  review: v(ScanSearch, '#f59e0b'),
  done: v(CircleCheck, '#10b981'),
  high_priority: v(Flame, '#ef4444'),
  overdue: v(AlarmClock, '#ef4444'),
  due_soon: v(CalendarClock, '#f59e0b'),
  drafts: v(PenLine, '#64748b'),
})

export const KB_VIEW_ICONS = Object.freeze({
  all: v(Files, '#64748b'),
  published: v(Globe, '#10b981'),
  pending: v(Clock, '#f59e0b'),
  draft: v(FilePen, '#64748b'),
  rejected: v(CircleAlert, '#ef4444'),
  my_articles: v(UserCheck, '#6366f1'),
  archived: v(Archive, '#64748b'),
})

export const VIEW_ICONS_BY_TYPE = Object.freeze({
  [ViewType.TICKET]: TICKET_VIEW_ICONS,
  [ViewType.TASK]: TASK_VIEW_ICONS,
  [ViewType.KB]: KB_VIEW_ICONS,
})

export const FALLBACK_ICON = Bookmark
const FALLBACK_COLOR = '#64748b'

/** `{ icon, color }` for a view loaded from the database. */
export function viewVisual(type, viewId) {
  const hit = VIEW_ICONS_BY_TYPE[type]?.[viewId]
  return hit || { icon: FALLBACK_ICON, color: FALLBACK_COLOR }
}

/** Just the icon component. */
export function viewIcon(type, viewId) {
  return viewVisual(type, viewId).icon
}

/** Attach `icon` to every view in a list, e.g. `withViewIcons(views, ViewType.TICKET)`. */
export function withViewIcons(views = [], type) {
  return views.map((view) => ({ ...view, icon: viewIcon(type, view.id ?? view.view_id) }))
}
