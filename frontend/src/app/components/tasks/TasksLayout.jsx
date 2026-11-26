import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import { Menu } from 'lucide-react'
import AppShell from '../AppShell'
import Drawer from '../Drawer'
import TasksSidebar from './TasksSidebar'
import ProjectFormModal from './ProjectFormModal'

const TasksLayoutContext = createContext({
  openNav: () => {},
  openNewProject: () => {},
})

export const useTasksLayout = () => useContext(TasksLayoutContext)

/**
 * Tasks workspace frame: global AppShell + nested workspace sidebar.
 * Desktop shows a persistent sidebar; mobile/tablet uses a left drawer.
 *
 * newTaskDefaults / lockProject let a page (e.g. a project) pre-fill the
 * sidebar's "New task" popover. Keyboard: "c" new task, "p" new project.
 */
export default function TasksLayout({ workspace, currentView = null, newTaskDefaults = {}, lockProject = false, children }) {
  const [navOpen, setNavOpen] = useState(false)
  const newTaskRef = useRef(null)
  const [projectOpen, setProjectOpen] = useState(false)

  const openNewProject = useCallback(() => {
    setProjectOpen(true)
    setNavOpen(false)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target.tagName || '').toLowerCase()
      if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return
      if (document.querySelector('[role="dialog"], .fixed.inset-0')) return
      // Opens the sidebar popover (desktop only, the aside is hidden on mobile)
      if (e.key === 'c' && newTaskRef.current?.offsetParent) { e.preventDefault(); newTaskRef.current.click() }
      if (e.key === 'p') { e.preventDefault(); openNewProject() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openNewProject])

  const ctx = { openNav: () => setNavOpen(true), openNewProject }

  const sidebarProps = {
    workspace,
    currentView,
    newTask: { defaultProject: newTaskDefaults.project || '', lockProject: lockProject && !!newTaskDefaults.project },
    onNewProject: openNewProject,
    onNavigate: () => setNavOpen(false),
  }

  return (
    <AppShell active="tasks" fixedHeight>
      <TasksLayoutContext.Provider value={ctx}>
        <div className="flex flex-1 min-h-0">
          <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 border-r border-gray-200 bg-gray-50 min-h-0">
            <TasksSidebar {...sidebarProps} newTaskRef={newTaskRef} newTaskPlacement="right" />
          </aside>
          <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-white overflow-y-auto">
            {typeof children === 'function' ? children(ctx) : children}
          </div>
        </div>

        <Drawer isOpen={navOpen} onClose={() => setNavOpen(false)} position="left" width="max-w-[18rem]" title="Tasks">
          <div className="flex-1 overflow-hidden bg-gray-50"><TasksSidebar {...sidebarProps} /></div>
        </Drawer>

        <ProjectFormModal
          isOpen={projectOpen}
          onClose={() => setProjectOpen(false)}
          onSaved={(project) => router.visit(`/tasks/projects/${project.uuid}/`)}
        />
      </TasksLayoutContext.Provider>
    </AppShell>
  )
}

/** Compact page header with the mobile navigation trigger. */
export function PageHeader({ title, subtitle, icon, actions, children }) {
  const { openNav } = useTasksLayout()
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 min-h-[56px]">
        <button
          onClick={openNav}
          className="lg:hidden -ml-1 p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
          aria-label="Open tasks navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {icon}
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900 truncate">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {children}
    </header>
  )
}
