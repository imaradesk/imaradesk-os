import React, { useEffect, useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import { Files, ClipboardCheck, FolderTree, ChevronRight, SquarePen, Plus, FolderOpen } from 'lucide-react'
import LucideIcon from '../LucideIcon'
import { VIEW_ICONS } from './constants'
import { useKBLayout } from './KBLayout'
import CategoryCreatePopover from './CategoryCreatePopover'

const STORAGE_KEY = 'imaradesk-kb-sidebar-sections'

function readSections() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch (e) {
    return {}
  }
}

function parseUrl(url) {
  const [path, query = ''] = url.split('?')
  return { path: path.endsWith('/') ? path : `${path}/`, params: new URLSearchParams(query) }
}

/**
 * Nested navigation for the Knowledge base workspace, next to the global icon rail.
 * Mirrors TasksSidebar so the workspaces feel the same.
 */
export default function KBSidebar({ sidebar = {}, pendingCount = 0, onNavigate }) {
  const { url } = usePage()
  const { path, params } = parseUrl(url)
  const [collapsed, setCollapsed] = useState(readSections)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed)) } catch (e) { /* storage unavailable */ }
  }, [collapsed])

  const { openArticleForm } = useKBLayout()
  const toggle = (key) => setCollapsed((s) => ({ ...s, [key]: !s[key] }))
  const onList = path === '/knowledgebase/articles/'
  const view = params.get('view') || 'all'
  const category = params.get('category')
  // The category page (/knowledgebase/categories/<id>/...) and its tabs
  const categoryId = path.match(/^\/knowledgebase\/categories\/(\d+)\//)?.[1] || (onList ? category : null)
  const views = (sidebar.views || []).filter((v) => v.id !== 'all')
  const categories = sidebar.categories || []
  const allCount = sidebar.counts?.all ?? (sidebar.views || []).find((v) => v.id === 'all')?.count
  const pending = pendingCount || sidebar.counts?.pending || 0

  return (
    <nav aria-label="Knowledge base workspace" className="flex flex-col h-full text-sm">
      <div className="px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={() => { onNavigate?.(); openArticleForm() }}
          className="w-full h-8 inline-flex items-center gap-2 px-2.5 rounded-lg bg-[#0B3D26] text-white hover:bg-[#14502F] font-medium shadow-sm transition-colors"
        >
          <SquarePen className="w-4 h-4" />
          New article
          <kbd className="ml-auto text-[10px] px-1 rounded border border-white/25 text-white/70 font-sans">C</kbd>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 no-scrollbar">
        <Section id="workspace" title="Workspace" collapsed={collapsed} onToggle={toggle}>
          <NavItem href="/knowledgebase/articles/" icon={Files} label="All articles" count={allCount} active={onList && view === 'all' && !category} onNavigate={onNavigate} />
          <NavItem
            href="/knowledgebase/approvals/"
            icon={ClipboardCheck}
            label="Approvals"
            active={path === '/knowledgebase/approvals/'}
            onNavigate={onNavigate}
            badge={pending}
          />
        </Section>

        {views.length > 0 && (
          <Section id="views" title="Views" collapsed={collapsed} onToggle={toggle}>
            {views.map((v) => (
              <NavItem
                key={v.id}
                href={`/knowledgebase/articles/?view=${v.id}`}
                icon={VIEW_ICONS[v.id] || Files}
                label={v.label}
                count={v.count}
                active={onList && !category && view === v.id}
                onNavigate={onNavigate}
              />
            ))}
          </Section>
        )}

        <Section
          id="categories"
          title="Categories"
          collapsed={collapsed}
          onToggle={toggle}
          action={(
            <CategoryCreatePopover
              placement="right"
              trigger={({ open, toggle }) => (
                <button type="button" onClick={toggle} aria-expanded={open} className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200/70" aria-label="New category" title="New category">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            />
          )}
        >
          {categories.map((c) => (
            <NavItem
              key={c.id}
              href={`/knowledgebase/categories/${c.id}/`}
              iconNode={<LucideIcon name={c.icon} className={`w-4 h-4 flex-shrink-0 ${categoryId === String(c.id) ? '' : 'text-gray-400'}`} />}
              label={c.name}
              count={c.count}
              active={categoryId === String(c.id)}
              onNavigate={onNavigate}
              muted
            />
          ))}
          {categories.length === 0 && (
            // Empty: just an empty-folder hint; the "+" in the section header creates one
            <div className="flex flex-col items-center gap-1 py-3 text-gray-300" title="No categories yet">
              <FolderOpen className="w-6 h-6" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-[11px] text-gray-400">No categories</span>
            </div>
          )}
        </Section>

        <Section id="more" title="More" collapsed={collapsed} onToggle={toggle}>
          <NavItem href="/knowledgebase/categories/" icon={FolderTree} label="Manage categories" active={path === '/knowledgebase/categories/'} onNavigate={onNavigate} />
        </Section>
      </div>

      {pending > 0 && path !== '/knowledgebase/approvals/' && (
        <Link href="/knowledgebase/approvals/" onClick={onNavigate} className="m-3 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800 hover:bg-amber-100 transition-colors">
          <span className="font-medium">{pending} article{pending === 1 ? '' : 's'} waiting for review.</span> Approve them to publish to the portal.
        </Link>
      )}
    </nav>
  )
}

function Section({ id, title, children, collapsed, onToggle, action }) {
  const isCollapsed = !!collapsed[id]
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-2 mb-0.5">
        <button
          onClick={() => onToggle(id)}
          aria-expanded={!isCollapsed}
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600"
        >
          <ChevronRight className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
          {title}
        </button>
        {action}
      </div>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
        <div className="overflow-hidden space-y-px">{children}</div>
      </div>
    </div>
  )
}

function NavItem({ href, icon: Icon, iconNode, label, count, badge, active, onNavigate, muted = false }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      preserveScroll={false}
      aria-current={active ? 'page' : undefined}
      className={`group flex items-center gap-2 h-8 px-2 rounded-md transition-colors ${
        active
          ? 'bg-[#0B3D26]/10 text-[#0B3D26] font-medium'
          : `${muted ? 'text-gray-600' : 'text-gray-700'} hover:bg-gray-100`
      }`}
    >
      {iconNode || (Icon && <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${active ? '' : 'text-gray-400 group-hover:text-gray-600'}`} />)}
      <span className="truncate flex-1">{label}</span>
      {badge > 0 ? (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold tabular-nums inline-flex items-center justify-center">{badge}</span>
      ) : (
        count != null && count > 0 && <span className="text-xs tabular-nums text-gray-400">{count}</span>
      )}
    </Link>
  )
}
