import React, { useEffect, useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import {
  LayoutDashboard, CircleUser, ListTodo, FolderKanban, Archive, PenLine, Eye,
  CalendarClock, AlertTriangle, ChevronRight, Plus, SquarePen, Settings,
} from 'lucide-react'
import { viewIcon, ViewType } from '../viewIcons'
import { ProjectStatusDot } from './ui'
import TaskCreatePopover from './TaskCreatePopover'

const STORAGE_KEY = 'imaradesk-tasks-sidebar-sections'

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
 * Nested navigation for the Tasks workspace. It sits next to the global icon
 * rail (AppShell) rather than replacing it.
 */
export default function TasksSidebar({ workspace = {}, currentView = null, newTask = {}, newTaskRef, newTaskPlacement = 'auto', onNewProject, onNavigate }) {
  const { url } = usePage()
  const { path, params } = parseUrl(url)
  const [collapsed, setCollapsed] = useState(readSections)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed)) } catch (e) { /* storage unavailable */ }
  }, [collapsed])

  const tc = workspace.task_counts || {}
  const pc = workspace.project_counts || {}
  const view = params.get('view') || currentView
  const onTasks = path === '/tasks/'
  const onProjects = path === '/tasks/projects/'
  const projectStatus = params.get('status') || ''
  const archived = params.get('archived') === '1'

  const isActive = {
    overview: path === '/tasks/overview/',
    my: onTasks && view === 'my_tasks',
    all: onTasks && (view === 'all' || !view),
    created: onTasks && view === 'created_by_me',
    watching: onTasks && view === 'watching',
    dueSoon: onTasks && view === 'due_soon',
    overdue: onTasks && view === 'overdue',
    drafts: onTasks && view === 'drafts',
    projects: onProjects && !projectStatus && !archived,
    active: onProjects && projectStatus === 'active' && !archived,
    planned: onProjects && projectStatus === 'planned' && !archived,
    completed: onProjects && projectStatus === 'completed' && !archived,
    archived: onProjects && archived,
  }

  const savedViews = (workspace.saved_views || []).filter(
    (v) => !['all', 'my_tasks', 'created_by_me', 'watching', 'overdue', 'due_soon'].includes(v.id)
  )

  const toggle = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }))

  return (
    <nav aria-label="Tasks workspace" className="flex flex-col h-full text-sm">
      {/* Primary actions */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-1.5">
        <TaskCreatePopover
          className="flex-1 min-w-0"
          placement={newTaskPlacement}
          // In the mobile drawer the panel stays inside the drawer's width
          strategy={newTaskPlacement === 'right' ? 'fixed' : 'absolute'}
          width={newTaskPlacement === 'right' ? 500 : 264}
          defaultProject={newTask.defaultProject}
          lockProject={newTask.lockProject}
          trigger={({ toggle, open }) => (
            <button
              ref={newTaskRef}
              onClick={toggle}
              aria-expanded={open}
              className={`w-full h-8 inline-flex items-center gap-2 px-2.5 rounded-md border bg-white text-gray-800 hover:bg-gray-50 font-medium ${open ? 'border-[#0B3D26]/40' : 'border-gray-200'}`}
            >
              <SquarePen className="w-4 h-4 text-gray-500" />
              New task
            </button>
          )}
        />
        <button
          onClick={onNewProject}
          title="New project"
          aria-label="New project"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        >
          <FolderKanban className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 no-scrollbar">
        <Section id="workspace" title="Workspace" collapsed={collapsed} onToggle={toggle}>
          <NavItem href="/tasks/overview/" icon={LayoutDashboard} label="Overview" active={isActive.overview} onNavigate={onNavigate} />
          <NavItem href="/tasks/?view=my_tasks" icon={CircleUser} label="My Tasks" count={tc.my_tasks} active={isActive.my} onNavigate={onNavigate} />
          <NavItem href="/tasks/?view=all" icon={ListTodo} label="All Tasks" count={tc.all} active={isActive.all} onNavigate={onNavigate} />
        </Section>

        <Section
          id="projects"
          title="Projects"
          collapsed={collapsed}
          onToggle={toggle}
          action={
            <button onClick={onNewProject} className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="New project" aria-label="New project">
              <Plus className="w-3.5 h-3.5" />
            </button>
          }
        >
          <NavItem href="/tasks/projects/" icon={FolderKanban} label="All projects" count={pc.all} active={isActive.projects} onNavigate={onNavigate} />
          <NavItem href="/tasks/projects/?status=active" dot="active" label="Active" count={pc.active} active={isActive.active} onNavigate={onNavigate} />
          <NavItem href="/tasks/projects/?status=planned" dot="planned" label="Planned" count={pc.planned} active={isActive.planned} onNavigate={onNavigate} />
          <NavItem href="/tasks/projects/?status=completed" dot="completed" label="Completed" count={pc.completed} active={isActive.completed} onNavigate={onNavigate} />
          {(workspace.recent_projects || []).length > 0 && (
            <div className="mt-1 pt-1 border-t border-gray-100">
              {workspace.recent_projects.map((p) => (
                <NavItem
                  key={p.uuid}
                  href={`/tasks/projects/${p.uuid}/`}
                  dot={p.status}
                  label={p.name}
                  active={path.startsWith(`/tasks/projects/${p.uuid}/`)}
                  onNavigate={onNavigate}
                  muted
                />
              ))}
            </div>
          )}
        </Section>

        <Section id="personal" title="Personal views" collapsed={collapsed} onToggle={toggle}>
          <NavItem href="/tasks/?view=created_by_me" icon={PenLine} label="Created by me" count={tc.created_by_me} active={isActive.created} onNavigate={onNavigate} />
          <NavItem href="/tasks/?view=watching" icon={Eye} label="Watching" count={tc.watching} active={isActive.watching} onNavigate={onNavigate} />
          <NavItem href="/tasks/?view=due_soon" icon={CalendarClock} label="Due soon" count={tc.due_soon} active={isActive.dueSoon} onNavigate={onNavigate} />
          <NavItem href="/tasks/?view=overdue" icon={AlertTriangle} label="Overdue" count={tc.overdue} active={isActive.overdue} onNavigate={onNavigate} danger={tc.overdue > 0} />
        </Section>

        {savedViews.length > 0 && (
          <Section id="saved" title="Saved views" collapsed={collapsed} onToggle={toggle}>
            {savedViews.map((v) => (
              <NavItem
                key={v.id}
                href={`/tasks/?view=${v.id}`}
                icon={viewIcon(ViewType.TASK, v.id)}
                label={v.label}
                count={v.count}
                active={onTasks && view === v.id}
                onNavigate={onNavigate}
              />
            ))}
          </Section>
        )}

        <Section id="more" title="More" collapsed={collapsed} onToggle={toggle}>
          <NavItem href="/tasks/?view=drafts" icon={PenLine} label="Drafts" count={tc.drafts} active={isActive.drafts} onNavigate={onNavigate} />
          <NavItem href="/tasks/projects/?archived=1" icon={Archive} label="Archived projects" count={pc.archived} active={isActive.archived} onNavigate={onNavigate} />
          {workspace.can_manage_projects && (
            <NavItem href="/administration/views/" icon={Settings} label="Task views settings" onNavigate={onNavigate} />
          )}
        </Section>
      </div>
    </nav>
  )
}

function Section({ id, title, children, collapsed, onToggle, action }) {
  const isCollapsed = !!collapsed[id]
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-2 mb-0.5 group">
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
      {!isCollapsed && <div className="space-y-px">{children}</div>}
    </div>
  )
}

function NavItem({ href, icon: Icon, dot, label, count, active, onNavigate, danger = false, muted = false }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      preserveScroll={false}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2 h-7 px-2 rounded-md transition-colors ${
        active
          ? 'bg-[#0B3D26]/10 text-[#0B3D26] font-medium'
          : `${muted ? 'text-gray-600' : 'text-gray-700'} hover:bg-gray-100`
      }`}
    >
      {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${active ? '' : 'text-gray-400'}`} />}
      {dot && <span className="w-4 flex justify-center"><ProjectStatusDot status={dot} /></span>}
      <span className="truncate flex-1">{label}</span>
      {count != null && count > 0 && (
        <span className={`text-xs tabular-nums ${danger ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{count}</span>
      )}
    </Link>
  )
}
