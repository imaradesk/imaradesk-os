import React, { useEffect, useRef, useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { FolderKanban, Plus, Search, X, LayoutList, LayoutGrid, Archive, SlidersHorizontal } from 'lucide-react'
import TasksLayout, { PageHeader, useTasksLayout } from '../components/tasks/TasksLayout'
import { cleanParams } from '../components/tasks/TaskFilterBar'
import { PROJECT_SORTS, PROJECT_STATUS_MAP, CONTROL } from '../components/tasks/constants'
import { ProjectStatusBadge, ProgressBar, MiniAvatar, formatDate, EmptyState, Pager } from '../components/tasks/ui'
import SimpleSelect from '../components/SimpleSelect'
import { Popover } from '../../components/Popover'

const LAYOUT_KEY = 'imaradesk-projects-layout'

export default function Projects(props) {
  const { filters = {} } = props
  const title = filters.archived
    ? 'Archived projects'
    : filters.status ? `${PROJECT_STATUS_MAP[filters.status]?.name || ''} projects` : 'Projects'
  return (
    <>
      <Head title={title} />
      <TasksLayout workspace={props.workspace}>
        <ProjectsContent {...props} title={title} />
      </TasksLayout>
    </>
  )
}

function ProjectsContent({ projects = [], pagination, filters = {}, sort = 'updated', members = [], statuses = [], canCreate, title }) {
  const { openNewProject } = useTasksLayout()
  const [layout, setLayout] = useState(() => {
    try { return localStorage.getItem(LAYOUT_KEY) || 'list' } catch (e) { return 'list' }
  })
  const [search, setSearch] = useState(filters.search || '')
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    try { localStorage.setItem(LAYOUT_KEY, layout) } catch (e) { /* storage unavailable */ }
  }, [layout])

  useEffect(() => router.on('start', () => setLoading(true)), [])
  useEffect(() => router.on('finish', () => setLoading(false)), [])

  const visit = (next) => {
    const params = cleanParams({
      search: filters.search, status: filters.status, owner: filters.owner,
      archived: filters.archived ? '1' : '', sort, ...next,
    })
    router.get('/tasks/projects/', params, { preserveState: true, preserveScroll: true, replace: true })
  }

  const onSearch = (value) => {
    setSearch(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => visit({ search: value, page: undefined }), 350)
  }

  const hasFilters = !!(filters.search || filters.status || filters.owner)
  const filterCount = (filters.status ? 1 : 0) + (filters.owner ? 1 : 0)

  return (
    <>
      <PageHeader
        title={title}
        subtitle={filters.archived ? 'Archived projects are read-only and hidden from pickers.' : 'Group related tasks and track progress toward a target date.'}
        icon={<FolderKanban className="w-5 h-5 text-gray-400 flex-shrink-0" />}
        actions={canCreate && !filters.archived && (
          <button onClick={openNewProject} className="h-8 px-3 inline-flex items-center gap-1.5 text-sm font-medium rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white">
            <Plus className="w-4 h-4" /> New project
          </button>
        )}
      >
        <div className="px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2 border-t border-gray-100">
          <div className="relative flex-1 min-w-0 sm:flex-none sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search projects"
              aria-label="Search projects"
              className={`${CONTROL} w-full pl-8`}
            />
          </div>
          <Popover
            width={280}
            maxHeight={380}
            strategy="fixed"
            showArrow={true}
            trigger={({ toggle }) => (
              <button
                type="button"
                onClick={toggle}
                title="Filters"
                aria-label="Filters"
                className={`h-8 px-2.5 inline-flex items-center gap-1.5 text-xs rounded-md border transition-colors ${
                  filterCount > 0
                    ? 'border-[#0B3D26] bg-[#0B3D26]/5 text-[#0B3D26]'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {filterCount > 0 && <span className="font-medium">{filterCount}</span>}
              </button>
            )}
          >
            {() => (
              <div className="p-4 space-y-3">
                <div className="text-sm font-medium text-gray-900">Filters</div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <SimpleSelect compact className="w-full" value={filters.status} onChange={(value) => visit({ status: value, page: undefined })} options={statuses} emptyLabel="Any status" ariaLabel="Filter by status" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Owner</div>
                  <SimpleSelect compact className="w-full"
                    value={filters.owner} onChange={(value) => visit({ owner: value, page: undefined })} emptyLabel="Any owner" ariaLabel="Filter by owner"
                    options={[{ id: 'me', name: 'Owned by me' }, { id: 'none', name: 'No owner' }, ...members]}
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Sort by</div>
                  <SimpleSelect compact className="w-full" value={sort} onChange={(value) => visit({ sort: value })} options={PROJECT_SORTS} ariaLabel="Sort projects" />
                </div>
              </div>
            )}
          </Popover>
          {hasFilters && (
            <button onClick={() => { setSearch(''); visit({ search: '', status: '', owner: '' }) }} className="h-8 px-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center rounded-md border border-gray-300 p-0.5" role="group" aria-label="Layout">
              {[['list', LayoutList], ['grid', LayoutGrid]].map(([id, Icon]) => (
                <button
                  key={id}
                  onClick={() => setLayout(id)}
                  aria-pressed={layout === id}
                  title={`${id === 'list' ? 'List' : 'Grid'} view`}
                  className={`p-1 rounded ${layout === id ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </PageHeader>

      <div className={`flex-1 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        {projects.length === 0 ? (
          hasFilters ? (
            <EmptyState icon={Search} title="No matching projects" description="Try a different search or clear the filters." />
          ) : filters.archived ? (
            <EmptyState icon={Archive} title="No archived projects" description="Projects you archive will appear here." />
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Projects group related tasks so you can track progress toward a goal."
              action={canCreate && (
                <button onClick={openNewProject} className="h-8 px-3 inline-flex items-center gap-1.5 text-sm font-medium rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white">
                  <Plus className="w-4 h-4" /> Create a project
                </button>
              )}
            />
          )
        ) : layout === 'grid' ? (
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {projects.map((p) => <ProjectTile key={p.uuid} project={p} />)}
          </div>
        ) : (
          <div role="table" aria-label="Projects" className="divide-y divide-gray-100">
            <div role="row" className="hidden md:grid grid-cols-[1fr_7.5rem_9rem_6rem_10rem] gap-4 items-center px-4 sm:px-6 h-8 text-[11px] font-medium uppercase tracking-wider text-gray-400 bg-gray-50">
              <span>Name</span><span>Status</span><span>Owner</span><span>Target</span><span>Progress</span>
            </div>
            {projects.map((p) => <ProjectRow key={p.uuid} project={p} />)}
          </div>
        )}
        <Pager pagination={pagination} onPage={(page) => visit({ page })} />
      </div>
    </>
  )
}

function ProjectRow({ project }) {
  return (
    <Link
      href={`/tasks/projects/${project.uuid}/`}
      role="row"
      className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_7.5rem_9rem_6rem_10rem] gap-x-4 gap-y-1.5 items-center px-4 sm:px-6 py-2.5 md:py-0 md:h-12 hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{project.name}</div>
        <div className="text-xs text-gray-500">
          {project.counts.total} task{project.counts.total === 1 ? '' : 's'}
          {project.counts.overdue > 0 && <span className="text-red-600"> · {project.counts.overdue} overdue</span>}
        </div>
      </div>
      <div><ProjectStatusBadge status={project.status} label={project.status_display} /></div>
      <div className="hidden md:flex items-center gap-2 min-w-0 text-sm text-gray-700">
        <MiniAvatar user={project.owner} />
        <span className="truncate">{project.owner?.name || <span className="text-gray-400">No owner</span>}</span>
      </div>
      <div className={`hidden md:block text-xs ${project.is_late ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
        {project.target_date ? formatDate(project.target_date) : '—'}
      </div>
      <ProgressBar value={project.progress} className="col-span-2 md:col-span-1" />
    </Link>
  )
}

function ProjectTile({ project }) {
  return (
    <Link href={`/tasks/projects/${project.uuid}/`} className="block border border-gray-200 rounded-lg p-3.5 hover:border-gray-300 hover:shadow-card transition bg-white">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{project.name}</h3>
        <ProjectStatusBadge status={project.status} label={project.status_display} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5"><MiniAvatar user={project.owner} />{project.owner?.name || 'No owner'}</span>
        <span className={project.is_late ? 'text-red-600 font-medium' : ''}>{project.target_date ? formatDate(project.target_date) : 'No target'}</span>
      </div>
      <ProgressBar value={project.progress} className="mt-3" />
      <div className="mt-1.5 text-xs text-gray-500">
        {project.counts.done}/{project.counts.total} done
        {project.counts.overdue > 0 && <span className="text-red-600"> · {project.counts.overdue} overdue</span>}
      </div>
    </Link>
  )
}
