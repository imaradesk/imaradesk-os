import React, { useState, useEffect } from 'react'
import { usePage, Link } from '@inertiajs/react'
import { Popover } from '../../components/Popover'
import SearchModal from './SearchModal'
import NotificationsModal from './NotificationsModal'
import { SquarePlus, Home, ChevronRight, ChevronDown, Search, Sun, Moon, Ticket, CheckSquare, BookOpen } from 'lucide-react'

const LABELS = {
  administration: 'Administration',
  knowledgebase: 'Knowledge Base',
  sla: 'SLA',
  smtp: 'SMTP',
}

// Only these paths are real pages; other path prefixes render as plain text
const LINKABLE = new Set([
  '/administration', '/administration/team/users', '/administration/team/groups',
  '/administration/emails/templates', '/administration/emails/smtp', '/administration/marketplace',
  '/administration/notifications', '/administration/security', '/administration/channels',
  '/administration/views', '/administration/sla',
  '/tickets', '/tasks', '/tasks/projects', '/tasks/overview', '/knowledgebase', '/knowledgebase/articles', '/knowledgebase/categories',
  '/reports', '/dashboard',
])

const GROUP_SEGMENTS = new Set(['team', 'emails'])

const isId = (seg) => /^\d+$/.test(seg) || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(seg)

const toLabel = (seg) =>
  LABELS[seg] || seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function buildCrumbs(url = '') {
  const segs = url.split('?')[0].split('#')[0].split('/').filter(Boolean)
  const crumbs = []
  const isAdmin = segs[0] === 'administration'
  // Every trail starts with a Home icon; settings: Home > Administration > {page}
  // (group segments like team/emails are skipped)
  if (segs.length) crumbs.push({ label: 'Home', href: '/dashboard', home: true })
  segs.forEach((seg, i) => {
    if (isId(seg)) return
    if (isAdmin && i > 0 && GROUP_SEGMENTS.has(seg) && i < segs.length - 1) return
    const path = '/' + segs.slice(0, i + 1).join('/')
    crumbs.push({ label: toLabel(seg), href: LINKABLE.has(path) ? path : null })
  })
  return crumbs
}

/** Breadcrumb trail for the current route; rendered at the top of the content area. */
export function Breadcrumbs({ dark = true }) {
  const { props, url } = usePage()
  const crumbs = buildCrumbs(url)
  const businessName = props.tenant?.name || 'Imaradesk'
  const muted = dark ? 'text-gray-400' : 'text-gray-500'
  const strong = dark ? 'text-white' : 'text-gray-900'
  if (crumbs.length === 0) {
    return (
      <nav aria-label="Breadcrumb" className="px-6 pt-4 pb-2 text-sm">
        <span className={`font-semibold ${strong}`}>{businessName}</span>
      </nav>
    )
  }
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 px-6 pt-4 pb-2 text-sm min-w-0 flex-shrink-0">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-gray-500 flex-shrink-0">/</span>}
            {c.home ? (
              <Link href={c.href} aria-label="Home" title="Home" className={`${muted} hover:text-current flex-shrink-0 inline-flex`}>
                <Home className="w-4 h-4" />
              </Link>
            ) : c.href && !last ? (
              <Link href={c.href} className={`${muted} hover:underline truncate`}>{c.label}</Link>
            ) : (
              <span className={`truncate ${last ? `font-semibold ${strong}` : muted}`} aria-current={last ? 'page' : undefined}>{c.label}</span>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

export default function TopBar({ theme = 'dark', onToggleTheme }) {
  const { props } = usePage()
  const user = props.auth?.user
  const businessName = props.tenant?.name || 'Imaradesk'
  const brands = props.brands || []
  const categories = props.categories || []
  
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  
  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const quickCreateItems = [
    { label: 'New Ticket', href: '/tickets/new', icon: Ticket },
    { label: 'New Task', href: '/tasks/new', icon: CheckSquare },
    { label: 'KB Article', href: '/knowledgebase/article/new/', icon: BookOpen },
  ]

  const dark = theme === 'dark'
  const strong = dark ? 'text-white' : 'text-gray-900'
  const iconBtn = dark
    ? 'text-gray-300 hover:bg-white/10 hover:text-white'
    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
  const btn = `h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
    dark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
  }`

  // "/" or ⌘K / Ctrl+K opens search (ignored while typing in a field)
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault()
        setIsSearchModalOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`h-14 relative flex items-center justify-end px-4 sticky top-0 z-50 flex-shrink-0 ${dark ? 'bg-[#0c0f12] popover-dark' : 'bg-white'}`}>
      {/* Left — GitLab-style search, aligned with where the content starts */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pr-[260px] max-md:pr-4 w-full pointer-events-none">
        <button
          onClick={() => setIsSearchModalOpen(true)}
          title="Search (/ or ⌘K)"
          className={`pointer-events-auto w-full max-w-[480px] h-9 flex items-center gap-2 px-3 rounded-lg border text-sm transition-colors ${
            dark
              ? 'bg-[#15181c] border-white/15 text-gray-400 hover:border-white/30'
              : 'bg-gray-50 border-gray-300 text-gray-500 hover:border-gray-400'
          }`}
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left truncate">Search or go to...</span>
          <kbd className={`h-5 min-w-5 px-1.5 inline-flex items-center justify-center rounded text-xs font-medium ${dark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>/</kbd>
        </button>
      </div>

      {/* Right — new, theme, notifications */}
      <div className="relative flex items-center gap-3">
        <Popover
          width={210}
          maxHeight={300}
          showArrow={true}
          trigger={({ toggle }) => (
            <button onClick={toggle} className={btn} title="Quick Create">
              <SquarePlus className="w-4 h-4" />
              New
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        >
          {({ close }) => (
            <div className="py-1.5">
              <p className={`px-3 pb-1.5 pt-0.5 text-xs font-medium text-gray-400`}>Create</p>
              {quickCreateItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={close}
                    className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                      dark ? 'text-gray-200 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-gray-400" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </Popover>

        <div className={`w-px h-6 ${dark ? 'bg-white/10' : 'bg-gray-200'}`} />

        <button
          onClick={onToggleTheme}
          className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors ${iconBtn}`}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" strokeWidth={1.75} /> : <Moon className="w-5 h-5" strokeWidth={1.75} />}
        </button>

        <NotificationsModal dark={dark} iconBtn={iconBtn} />
      </div>

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        brands={brands}
        categories={categories}
      />
    </div>
  )
}
