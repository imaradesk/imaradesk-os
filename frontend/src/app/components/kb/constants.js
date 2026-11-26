import { KB_VIEW_ICONS, viewIcon, ViewType } from '../viewIcons'

// Article statuses mirror KBArticle.status (modules/kb/models.py); rejected/archived are legacy values still counted by the views.
export const ARTICLE_STATUSES = [
  { id: 'published', name: 'Published', badge: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-600' },
  { id: 'pending', name: 'In review', badge: 'bg-amber-50 text-amber-700', text: 'text-amber-600' },
  { id: 'draft', name: 'Draft', badge: 'bg-gray-100 text-gray-600', text: 'text-gray-500' },
  { id: 'rejected', name: 'Rejected', badge: 'bg-red-50 text-red-700', text: 'text-red-600' },
  { id: 'archived', name: 'Archived', badge: 'bg-slate-100 text-slate-600', text: 'text-slate-500' },
]

export const ARTICLE_STATUS_MAP = Object.fromEntries(ARTICLE_STATUSES.map((s) => [s.id, s]))

// Icons for the saved views configured in SettingsView (type='KB'); the enum lives in ../viewIcons.
export const VIEW_ICONS = Object.fromEntries(Object.entries(KB_VIEW_ICONS).map(([id, { icon }]) => [id, icon]))
export const kbViewIcon = (viewId) => viewIcon(ViewType.KB, viewId)

export const ARTICLE_SORTS = [
  { id: 'newest', name: 'Newest' },
  { id: 'views', name: 'Most viewed' },
  { id: 'title', name: 'Title' },
]

export { CONTROL, INPUT } from '../tasks/constants'
