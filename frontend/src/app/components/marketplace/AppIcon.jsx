import React from 'react'
import {
  BookOpenText, ClipboardList, Globe, ListChecks, Puzzle, Workflow,
} from 'lucide-react'

// Marketplace apps store an emoji icon server-side; the UI maps known slugs to
// lucide icons with a tint so modules read as one consistent icon set.
const APP_ICONS = {
  'tasks-projects': { icon: ListChecks, color: '#6366f1' },
  'customer-portal': { icon: Globe, color: '#14b8a6' },
  'knowledge-base': { icon: BookOpenText, color: '#f59e0b' },
}

const CATEGORY_ICONS = {
  productivity: { icon: ClipboardList, color: '#6366f1' },
  automation: { icon: Workflow, color: '#a855f7' },
}

const FALLBACK = { icon: Puzzle, color: '#64748b' }

export const appVisual = (app) => APP_ICONS[app.slug] || CATEGORY_ICONS[app.category] || FALLBACK

const SIZES = {
  md: { box: 'w-11 h-11 rounded-xl', icon: 'w-5 h-5' },
  lg: { box: 'w-16 h-16 rounded-2xl', icon: 'w-8 h-8' },
}

export default function AppIcon({ app, size = 'md', className = '' }) {
  const { icon: Icon, color } = appVisual(app)
  const s = SIZES[size]
  return (
    <span
      className={`${s.box} flex-shrink-0 inline-flex items-center justify-center ring-1 ring-inset ${className}`}
      style={{
        color,
        backgroundImage: `linear-gradient(135deg, ${color}26, ${color}0d)`,
        '--tw-ring-color': `${color}33`,
      }}
    >
      <Icon className={s.icon} strokeWidth={1.75} />
    </span>
  )
}
