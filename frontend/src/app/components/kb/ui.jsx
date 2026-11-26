import React from 'react'
import { Link } from '@inertiajs/react'
import { FileText } from 'lucide-react'
import LucideIcon from '../LucideIcon'
import { ARTICLE_STATUS_MAP } from './constants'

export { EmptyState, Spinner, MiniAvatar, apiError } from '../tasks/ui'

/** Compact KPI tile; links when href is given. */
export function StatTile({ label, value, hint, icon: Icon, tone = 'text-gray-900', href }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-gray-300" />}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-gray-500 truncate">{hint}</div>}
    </>
  )
  const cls = 'block px-4 py-3 bg-white transition-colors'
  return href ? <Link href={href} className={`${cls} hover:bg-gray-50`}>{body}</Link> : <div className={cls}>{body}</div>
}

export function StatGrid({ children, cols = 'lg:grid-cols-4' }) {
  return (
    <div className={`grid grid-cols-2 ${cols} gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden`}>
      {children}
    </div>
  )
}

/** Bordered card with an uppercase caption, matching the Tasks overview sections. */
export function Panel({ title, action, children, className = '', bodyClassName = 'p-4' }) {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h2>
          {action}
        </div>
      )}
      <div className={`border border-gray-200 rounded-lg bg-white ${bodyClassName}`}>{children}</div>
    </section>
  )
}

export function Toggle({ checked, onChange, label, disabled = false, size = 'md' }) {
  const dims = size === 'sm' ? ['w-8 h-[18px]', 'w-3.5 h-3.5', 'translate-x-[14px]'] : ['w-10 h-[22px]', 'w-[18px] h-[18px]', 'translate-x-[18px]']
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      className={`${dims[0]} relative inline-flex flex-shrink-0 items-center rounded-full p-[2px] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B3D26]/30 disabled:opacity-50 ${checked ? 'bg-[#0B3D26]' : 'bg-gray-300'}`}
    >
      <span className={`${dims[1]} rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? dims[2] : 'translate-x-0'}`} />
    </button>
  )
}

export const PRIMARY_BTN = 'h-8 px-3 inline-flex items-center gap-1.5 text-sm font-medium rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white transition-colors disabled:opacity-50'
export const SECONDARY_BTN = 'h-8 px-3 inline-flex items-center gap-1.5 text-sm font-medium rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50'

/** Article status glyph, in the same family as TaskStatusIcon. */
export function ArticleStatusIcon({ status, className = '' }) {
  const size = `w-3.5 h-3.5 flex-shrink-0 ${className}`
  switch (status) {
    case 'published':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-emerald-600`} aria-hidden="true">
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path d="M4.2 7.2l1.9 1.8 3.7-3.9" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'pending':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-amber-500`} aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 7 L7 2.5 A4.5 4.5 0 0 1 7 11.5 Z" fill="currentColor" />
        </svg>
      )
    case 'rejected':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-red-500`} aria-hidden="true">
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path d="M5 5l4 4M9 5l-4 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )
    case 'archived':
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-slate-400`} aria-hidden="true">
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path d="M4.5 7h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 14 14" className={`${size} text-gray-400`} aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      )
  }
}

export function ArticleStatusBadge({ status }) {
  const s = ARTICLE_STATUS_MAP[status] || ARTICLE_STATUS_MAP.draft
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${s.badge}`}>
      <ArticleStatusIcon status={status} className="!w-3 !h-3" />
      {s.name}
    </span>
  )
}

/** Rounded icon tile for a category (icon names are lucide component names). */
export function CategoryIcon({ icon, size = 'w-8 h-8', iconSize = 'w-4 h-4', className = 'bg-[#0B3D26]/10 text-[#0B3D26]' }) {
  return (
    <span className={`${size} ${className} rounded-lg inline-flex items-center justify-center flex-shrink-0`}>
      <LucideIcon name={icon} className={iconSize} />
    </span>
  )
}

/** Small leading tile for an article row: its display image, or a document glyph. */
export function ArticleThumb({ article, size = 'w-8 h-8' }) {
  if (article.display_image) {
    return <img src={article.display_image} alt="" loading="lazy" className={`${size} rounded-lg object-cover flex-shrink-0 border border-gray-200`} />
  }
  return (
    <span className={`${size} rounded-lg bg-gray-100 text-gray-400 inline-flex items-center justify-center flex-shrink-0`}>
      <FileText className="w-4 h-4" />
    </span>
  )
}

/** Styles for article HTML from the rich editor (no typography plugin in this project). */
export const ARTICLE_PROSE = [
  'text-[15px] text-gray-700 leading-7 break-words',
  '[&_p]:mb-4 [&_p:last-child]:mb-0',
  '[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-gray-900 [&_h1]:mt-8 [&_h1]:mb-3',
  '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-3',
  '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-2',
  '[&>*:first-child]:mt-0',
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1.5',
  '[&_a]:text-[#0B3D26] [&_a]:underline [&_a]:underline-offset-2',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-[#0B3D26]/30 [&_blockquote]:pl-4 [&_blockquote]:text-gray-600 [&_blockquote]:my-4',
  '[&_pre]:bg-gray-50 [&_pre]:border [&_pre]:border-gray-200 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:text-sm [&_pre]:overflow-x-auto [&_pre]:mb-4',
  '[&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[13px]',
  '[&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4',
  '[&_table]:w-full [&_table]:text-sm [&_table]:mb-4 [&_th]:text-left [&_th]:font-medium [&_th]:border-b [&_th]:border-gray-200 [&_th]:py-2 [&_td]:border-b [&_td]:border-gray-100 [&_td]:py-2',
  '[&_hr]:my-6 [&_hr]:border-gray-200',
].join(' ')

/** "3m ago", "2d ago", then a short date. Accepts ISO strings. */
export function timeAgo(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const secs = Math.round((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 7 * 86400) return `${Math.floor(secs / 86400)}d ago`
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatLongDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Rough reading time from article HTML (~220 words per minute). */
export function readingTime(html = '') {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

export function formatCount(n = 0) {
  return Number(n || 0).toLocaleString()
}
