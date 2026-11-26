import React, { useState, useEffect } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import api from '../../utils/axios'
import TasksLayout from '../components/tasks/TasksLayout'
import TaskCreatePopover from '../components/tasks/TaskCreatePopover'
import { TASK_SORTS, DUE_FILTERS } from '../components/tasks/constants'
import { Popover } from '../../components/Popover'
import DatePicker from '../components/pickers/DatePicker'
import { THEME } from '../constants/theme'
import toast from 'react-hot-toast'
import DataTable from '../../components/DataTable'
import Modal, { ModalBody, ModalButton } from '../components/Modal'
import { Pencil } from 'lucide-react'
import SimpleSelect from '../components/SimpleSelect'
import MobileTasks from '../components/tasks/MobileTasks'
import useMediaQuery, { DESKTOP_QUERY } from '../../utils/useMediaQuery'

export default function Tasks({ sidebar = {}, workspace = {}, tasks = [], counters = {}, currentView = null, pagination = null, draftsCount = 0, projects = [], users = [], sort = 'created' }) {
  const { url } = usePage()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  
  // Parse URL params for initial filter values
  const getInitialFilters = () => {
    const params = new URLSearchParams(url.split('?')[1] || '')
    return {
      search: params.get('search') || '',
      project: params.get('project') || '',
      due: params.get('due') || '',
      taskNumber: params.get('taskNumber') || '',
      status: params.get('status') || '',
      priority: params.get('priority') || '',
      assignee: params.get('assignee') || '',
      dateFrom: params.get('dateFrom') || '',
      dateTo: params.get('dateTo') || '',
    }
  }
  
  const [viewMode, setViewMode] = useState('board') // 'list', 'card', or 'board'
  const [selectedTasks, setSelectedTasks] = useState([])
  const [isMarkingDraft, setIsMarkingDraft] = useState(false)
  const [isRemovingFromDraft, setIsRemovingFromDraft] = useState(false)
  const [draggedTask, setDraggedTask] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState(getInitialFilters)
  

  // Quick Add Task Popover state
  const [showColumnOptionsPopover, setShowColumnOptionsPopover] = useState(null) // column id or null
  const [editingColumn, setEditingColumn] = useState(null) // column being edited
  const [columnForm, setColumnForm] = useState({ label: '', color: '', description: '' })
  const [isSavingColumn, setIsSavingColumn] = useState(false)
  const [showHiddenColumns, setShowHiddenColumns] = useState(false)
  
  // Board columns state (fetched from API)
  const [boardColumns, setBoardColumns] = useState([
    { id: 'todo', label: 'To Do', color: 'bg-gray-500' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
    { id: 'review', label: 'In Review', color: 'bg-purple-500' },
    { id: 'done', label: 'Done', color: 'bg-green-500' },
  ])
  const [hiddenColumns, setHiddenColumns] = useState([])
  


  // Fetch board columns
  useEffect(() => {
    const fetchBoardColumns = async () => {
      try {
        const response = await api.get('/api/tasks/board-columns/?include_hidden=true')
        if (response.data.columns) {
          const visible = response.data.columns.filter(c => c.is_visible !== false)
          const hidden = response.data.columns.filter(c => c.is_visible === false)
          setBoardColumns(visible)
          setHiddenColumns(hidden)
        }
      } catch (error) {
        console.error('Failed to fetch board columns:', error)
      }
    }
    fetchBoardColumns()
  }, [])

  // New tasks default to the project the list is filtered by
  const quickCreateProject = (filters.project && filters.project !== 'none') ? filters.project : ''

  const views = sidebar.views || [
    { id: 'all', label: 'All Tasks', count: counters.all || 0 },
    { id: 'my_tasks', label: 'My Tasks', count: counters.my_tasks || 0 },
    { id: 'created_by_me', label: 'Created by Me', count: counters.created_by_me || 0 },
    { id: 'watching', label: 'Watching', count: counters.watching || 0 },
    { id: 'todo', label: 'To Do', count: counters.todo || 0 },
    { id: 'in_progress', label: 'In Progress', count: counters.in_progress || 0 },
    { id: 'review', label: 'In Review', count: counters.review || 0 },
    { id: 'done', label: 'Done', count: counters.done || 0 },
    { id: 'high_priority', label: 'High Priority', count: counters.high_priority || 0 },
  ]

  // Find default view (is_default: true) or fallback to first view
  const defaultView = views.find(v => v.is_default) || views[0]
  // Use currentView if provided, otherwise use the default view's id
  const activeViewId = currentView || (defaultView ? defaultView.id : 'all')

  // Build URL params for filters
  const buildUrlParams = (f = filters, s = sort) => {
    const params = new URLSearchParams()
    params.set('view', activeViewId)
    if (f.search) params.set('search', f.search)
    if (f.project) params.set('project', f.project)
    if (f.due) params.set('due', f.due)
    if (s && s !== 'created') params.set('sort', s)
    if (f.taskNumber) params.set('taskNumber', f.taskNumber)
    if (f.status) params.set('status', f.status)
    if (f.priority) params.set('priority', f.priority)
    if (f.assignee) params.set('assignee', f.assignee)
    if (f.dateFrom) params.set('dateFrom', f.dateFrom)
    if (f.dateTo) params.set('dateTo', f.dateTo)
    return params.toString()
  }

  const applyFilters = () => {
    router.get(`/tasks/?${buildUrlParams()}`)
  }

  // Mobile applies an explicit filter set (and sort) instead of the panel state
  const applyFiltersWith = (nextFilters, nextSort = sort) => {
    router.get(`/tasks/?${buildUrlParams(nextFilters, nextSort)}`)
  }

  const changeSort = (nextSort) => {
    const params = new URLSearchParams(buildUrlParams())
    if (nextSort && nextSort !== 'created') params.set('sort', nextSort)
    else params.delete('sort')
    router.get(`/tasks/?${params.toString()}`, {}, { preserveState: true, preserveScroll: true })
  }

  const goToPage = (pageNum, perPage) => {
    const params = new URLSearchParams(buildUrlParams())
    params.set('page', pageNum)
    if (perPage) params.set('per_page', perPage)
    router.get(`/tasks/?${params.toString()}`, {}, { preserveState: true, preserveScroll: true })
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      project: '',
      due: '',
      taskNumber: '',
      status: '',
      priority: '',
      assignee: '',
      dateFrom: '',
      dateTo: '',
    })
    // Reload the page without filters
    router.get(`/tasks/?view=${activeViewId}${sort && sort !== 'created' ? `&sort=${sort}` : ''}`)
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  // Show filter panel if there are active filters on load
  useEffect(() => {
    if (hasActiveFilters) {
      setShowFilters(true)
    }
  }, [])

  const loadView = (viewId) => {
    router.visit(`/tasks?view=${viewId}`, {
      preserveState: true,
      preserveScroll: true,
    })
    setSelectedTasks([]) // Clear selections when changing views
  }

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const toggleAllTasks = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(tasks.map(t => t.id))
    }
  }

  // Handle saving column settings
  const handleSaveColumn = async () => {
    if (!editingColumn) return
    
    setIsSavingColumn(true)
    try {
      const response = await api.put(`/api/tasks/board-columns/${editingColumn.id}/`, {
        label: columnForm.label,
        color: columnForm.color,
        description: columnForm.description,
      })
      
      if (response.data.column) {
        setBoardColumns(prev => prev.map(col => 
          col.id === editingColumn.id ? { ...col, ...response.data.column } : col
        ))
      }
      setEditingColumn(null)
    } catch (error) {
      console.error('Failed to save column:', error)
    } finally {
      setIsSavingColumn(false)
    }
  }

  // Handle opening column edit modal
  const openColumnEdit = (column) => {
    setColumnForm({
      label: column.label,
      color: column.color || 'bg-gray-500',
      description: column.description || '',
    })
    setEditingColumn(column)
  }

  // Handle moving column left or right
  const handleMoveColumn = async (column, direction) => {
    const currentIndex = boardColumns.findIndex(c => c.id === column.id)
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1
    
    if (newIndex < 0 || newIndex >= boardColumns.length) return
    
    // Swap positions in local state
    const newColumns = [...boardColumns]
    const temp = newColumns[currentIndex]
    newColumns[currentIndex] = newColumns[newIndex]
    newColumns[newIndex] = temp
    
    setBoardColumns(newColumns)
    
    // Save to API
    try {
      await api.post('/api/tasks/board-columns/reorder/', {
        order: newColumns.map(c => c.id),
      })
    } catch (error) {
      console.error('Failed to reorder columns:', error)
      // Revert on error
      setBoardColumns(boardColumns)
    }
  }

  // Handle hiding a column
  const handleHideColumn = async (column) => {
    try {
      await api.put(`/api/tasks/board-columns/${column.id}/`, {
        is_visible: false,
      })
      
      setBoardColumns(prev => prev.filter(c => c.id !== column.id))
      setHiddenColumns(prev => [...prev, { ...column, is_visible: false }])
      toast.success(`${column.label} column hidden`)
    } catch (error) {
      console.error('Failed to hide column:', error)
      toast.error('Failed to hide column')
    }
  }

  // Handle restoring a hidden column
  const handleRestoreColumn = async (column) => {
    try {
      await api.put(`/api/tasks/board-columns/${column.id}/`, {
        is_visible: true,
      })
      
      setHiddenColumns(prev => prev.filter(c => c.id !== column.id))
      setBoardColumns(prev => [...prev, { ...column, is_visible: true }].sort((a, b) => a.position - b.position))
      toast.success(`${column.label} column restored`)
    } catch (error) {
      console.error('Failed to restore column:', error)
      toast.error('Failed to restore column')
    }
  }

  // Handle setting WIP limit
  const handleSetLimit = async (column, limit) => {
    try {
      const response = await api.put(`/api/tasks/board-columns/${column.id}/`, {
        wip_limit: limit,
      })
      
      if (response.data.column) {
        setBoardColumns(prev => prev.map(c => 
          c.id === column.id ? { ...c, wip_limit: limit } : c
        ))
      }
      toast.success(`WIP limit set to ${limit || 'unlimited'}`)
    } catch (error) {
      console.error('Failed to set limit:', error)
      toast.error('Failed to set limit')
    }
  }

  const markSelectedAsDraft = async () => {
    if (selectedTasks.length === 0) return
    
    setIsMarkingDraft(true)
    try {
      await api.post('/tasks/bulk/mark-draft/', { task_ids: selectedTasks })
      router.reload({ preserveScroll: true })
      setSelectedTasks([])
    } catch (error) {
      console.error('Failed to mark tasks as draft:', error)
    } finally {
      setIsMarkingDraft(false)
    }
  }

  const removeSelectedFromDrafts = async () => {
    if (selectedTasks.length === 0) return
    
    setIsRemovingFromDraft(true)
    try {
      await api.post('/tasks/bulk/remove-draft/', { task_ids: selectedTasks })
      router.reload({ preserveScroll: true })
      setSelectedTasks([])
    } catch (error) {
      console.error('Failed to remove tasks from drafts:', error)
    } finally {
      setIsRemovingFromDraft(false)
    }
  }

  const removeTaskFromDraft = async (taskId) => {
    try {
      await api.post('/tasks/bulk/remove-draft/', { task_ids: [taskId] })
      router.reload({ preserveScroll: true })
    } catch (error) {
      console.error('Failed to remove task from draft:', error)
    }
  }

  const statusColors = {
    draft: 'bg-yellow-100 text-yellow-700',
    todo: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-purple-100 text-purple-700',
    done: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const priorityColors = {
    low: 'text-gray-600',
    normal: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600',
  }

  // Check if task has breached its due date (past due and not done)
  const isTaskBreached = (task) => {
    if (!task.due_date) return false
    if (task.status === 'done') return false
    const dueDate = new Date(task.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDate < today
  }

  // Group tasks by status for board view
  const tasksByStatus = boardColumns.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id)
    return acc
  }, {})

  // Drag and drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id)
    // Add visual feedback
    setTimeout(() => {
      e.target.style.opacity = '0.5'
    }, 0)
  }

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
    setDraggedTask(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e, columnId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = async (e, newStatus) => {
    e.preventDefault()
    setDragOverColumn(null)
    
    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null)
      return
    }

    try {
      await api.post(`/tasks/${draggedTask.uuid}/update/`, { status: newStatus })
      router.reload({ preserveScroll: true })
    } catch (error) {
      console.error('Failed to update task status:', error)
      toast.error(error?.response?.data?.error || 'Failed to update task status')
    }
    
    setDraggedTask(null)
  }

  // Get the current view label
  const activeView = views.find(v => v.id === activeViewId)
  const BUILT_IN_TITLES = { all: 'All Tasks', my_tasks: 'My Tasks', created_by_me: 'Created by me', watching: 'Watching', due_soon: 'Due soon', overdue: 'Overdue', drafts: 'Drafts' }
  const pageTitle = activeView ? activeView.label : (BUILT_IN_TITLES[activeViewId] || 'All Tasks')

  return (
    <>
      <Head title={pageTitle} />
      <TasksLayout workspace={workspace} currentView={activeViewId}>
        {({ openNav }) => !isDesktop ? (
          <MobileTasks
            views={views}
            draftsCount={draftsCount}
            currentView={activeViewId}
            onSelectView={loadView}
            onOpenNav={openNav}
            pageTitle={pageTitle}
            tasks={tasks}
            pagination={pagination}
            filters={filters}
            setFilters={setFilters}
            appliedFilters={getInitialFilters()}
            applyFilters={applyFiltersWith}
            clearFilters={clearFilters}
            sort={sort}
            projects={projects}
            users={users}
            createStatus={boardColumns[0]?.id || 'todo'}
            createProject={quickCreateProject}
          />
        ) : (
        <>
        <main className="flex-1 min-w-0">
          <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
            {/* Mobile header - stacked */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Mobile toggle button */}
                <button
                  className="p-2 rounded-md hover:bg-gray-100 lg:hidden"
                  title="Open tasks navigation"
                  aria-label="Open tasks navigation"
                  onClick={openNav}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" className="w-5 h-5 text-gray-500"><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">{pageTitle}</h1>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 rounded-md p-0.5 flex-shrink-0">
                <button
                  onClick={() => setViewMode('board')}
                  className={`p-1.5 rounded ${viewMode === 'board' ? 'bg-white shadow-sm text-[#0B3D26]' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Board View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-[#0B3D26]' : 'text-gray-500 hover:text-gray-700'}`}
                  title="List View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-white shadow-sm text-[#0B3D26]' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Card View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </button>
              </div>
              <SimpleSelect compact className="w-36 flex-shrink-0" value={sort} onChange={changeSort} options={TASK_SORTS} ariaLabel="Sort tasks" />
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`px-2 sm:px-3 py-1.5 border rounded-md text-sm flex items-center gap-1 flex-shrink-0 ${
                  showFilters || hasActiveFilters
                    ? 'border-[#0B3D26] text-[#0B3D26] bg-[#0B3D26]/5'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                Filter
                {hasActiveFilters && (
                  <span className="ml-1 bg-[#0B3D26] text-white text-xs rounded-full px-1.5">
                    {Object.values(filters).filter(v => v !== '').length}
                  </span>
                )}
              </button>
              <button className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1 flex-shrink-0">
                <span className="hidden sm:inline">Actions</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/></svg>
              </button>
            </div>
          </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-gray-50 border-b border-gray-200 px-3 sm:px-6 py-4 flex-shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-3 lg:gap-4 items-end">
                {/* Search */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Search</label>
                  <input
                    type="search"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                    placeholder="Title or #id"
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white w-full lg:min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                  />
                </div>

                {/* Project Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Project</label>
                  <SimpleSelect
                    compact className="w-full lg:min-w-[140px]" value={filters.project} onChange={(value) => setFilters({ ...filters, project: value })}
                    emptyLabel="All Projects" options={[{ id: 'none', name: 'No project' }, ...projects.map(p => ({ id: p.uuid, name: p.name }))]}
                  />
                </div>

                {/* Due Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Due</label>
                  <SimpleSelect compact className="w-full lg:min-w-[140px]" value={filters.due} onChange={(value) => setFilters({ ...filters, due: value })} emptyLabel="Any due date" options={DUE_FILTERS} />
                </div>

                {/* Task Number Search */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Task ID</label>
                  <input
                    type="text"
                    value={filters.taskNumber}
                    onChange={(e) => setFilters({ ...filters, taskNumber: e.target.value })}
                    placeholder="e.g. 123"
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white w-full lg:min-w-[100px] focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Status</label>
                  <SimpleSelect
                    compact className="w-full lg:min-w-[140px]" value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })}
                    emptyLabel="All Statuses"
                    options={[
                      { id: 'todo', name: 'To Do' }, { id: 'in_progress', name: 'In Progress' }, { id: 'review', name: 'In Review' },
                      { id: 'done', name: 'Done' }, { id: 'cancelled', name: 'Cancelled' },
                    ]}
                  />
                </div>

                {/* Priority Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Priority</label>
                  <SimpleSelect
                    compact className="w-full lg:min-w-[140px]" value={filters.priority} onChange={(value) => setFilters({ ...filters, priority: value })}
                    emptyLabel="All Priorities"
                    options={[{ id: 'urgent', name: 'Urgent' }, { id: 'high', name: 'High' }, { id: 'normal', name: 'Normal' }, { id: 'low', name: 'Low' }]}
                  />
                </div>

                {/* Assignee Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Assignee</label>
                  <SimpleSelect
                    compact className="w-full lg:min-w-[140px]" value={filters.assignee} onChange={(value) => setFilters({ ...filters, assignee: value })}
                    emptyLabel="All Assignees" options={[{ id: 'unassigned', name: 'Unassigned' }, { id: 'me', name: 'Assigned to Me' }, ...users]}
                  />
                </div>

                {/* Date From Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">From Date</label>
                  <DatePicker
                    value={filters.dateFrom}
                    max={filters.dateTo || undefined}
                    onChange={(v) => setFilters({ ...filters, dateFrom: v })}
                    aria-label="From date"
                    allowClear
                  />
                </div>

                {/* Date To Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">To Date</label>
                  <DatePicker
                    value={filters.dateTo}
                    min={filters.dateFrom || undefined}
                    onChange={(v) => setFilters({ ...filters, dateTo: v })}
                    aria-label="To date"
                    allowClear
                  />
                </div>

                {/* Filter Actions */}
                <div className="flex items-center gap-2 col-span-2 sm:col-span-3 lg:col-span-1 lg:ml-auto pt-2 lg:pt-0">
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear
                    </button>
                  )}
                  <button
                    onClick={applyFilters}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium ${THEME.button.primary}`}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 sm:p-6">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Bulk actions toolbar */}
              {selectedTasks.length > 0 && (
                <div className="px-4 py-3 bg-[#0B3D26]/5 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    {selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2">
                    {activeViewId === 'drafts' ? (
                      <button
                        onClick={removeSelectedFromDrafts}
                        disabled={isRemovingFromDraft}
                        className={`${THEME.button.primary} px-3 py-1.5 rounded-md text-sm flex items-center gap-2 disabled:opacity-50`}
                      >
                        {isRemovingFromDraft ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Removing...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Remove from Drafts
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={markSelectedAsDraft}
                        disabled={isMarkingDraft}
                        className={`${THEME.button.primary} px-3 py-1.5 rounded-md text-sm flex items-center gap-2 disabled:opacity-50`}
                      >
                        {isMarkingDraft ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Marking...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            Mark as Draft
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedTasks([])}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
              <div className="px-3 sm:px-4 py-2 text-sm text-gray-600 border-b border-gray-200">{tasks.length} task{tasks.length === 1 ? '' : 's'}</div>
              
              {viewMode === 'board' ? (
                // Board View (Kanban - like Jira)
                <div className="p-2 sm:p-4 bg-gray-50 h-[calc(100vh-12rem)] flex flex-col">
                  {/* Hidden Columns Panel */}
                  {hiddenColumns.length > 0 && (
                    <div className="mb-3 flex-shrink-0">
                      <button
                        onClick={() => setShowHiddenColumns(!showHiddenColumns)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors shadow-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                        {hiddenColumns.length} hidden column{hiddenColumns.length > 1 ? 's' : ''}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={`w-4 h-4 transition-transform ${showHiddenColumns ? 'rotate-180' : ''}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                      
                      {showHiddenColumns && (
                        <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex flex-wrap gap-2">
                            {hiddenColumns.map((column) => (
                              <div
                                key={column.id}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                              >
                                <div className={`w-2.5 h-2.5 rounded-full ${column.color}`}></div>
                                <span className="text-gray-700">{column.label}</span>
                                <button
                                  onClick={() => handleRestoreColumn(column)}
                                  className="text-gray-400 hover:text-[#0B3D26] transition-colors"
                                  title="Restore column"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2 sm:gap-4 flex-1 min-h-0">
                    {boardColumns.map((column) => (
                      <div
                        key={column.id}
                        className={`group flex-1 min-w-0 rounded-lg transition-all flex flex-col h-full ${
                          dragOverColumn === column.id 
                            ? 'bg-blue-50 ring-2 ring-blue-300' 
                            : 'bg-gray-100'
                        }`}
                        onDragOver={(e) => handleDragOver(e, column.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, column.id)}
                      >
                        {/* Column Header */}
                        <div className="p-3 border-b border-gray-200 flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                              <h3 className="font-semibold text-gray-800 text-sm">{column.label}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full shadow-sm ${
                                column.wip_limit && (tasksByStatus[column.id]?.length || 0) >= column.wip_limit
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-white text-gray-600'
                              }`}>
                                {tasksByStatus[column.id]?.length || 0}
                                {column.wip_limit && <span className="text-gray-400">/{column.wip_limit}</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Column Options Menu */}
                              <Popover
                                width={200}
                                maxHeight={400}
                                showArrow={true}
                                onOpenChange={(isOpen) => setShowColumnOptionsPopover(isOpen ? column.id : null)}
                                trigger={({ toggle }) => (
                                  <button
                                    onClick={toggle}
                                    className={`p-1 rounded transition-all ${
                                      showColumnOptionsPopover === column.id
                                        ? 'text-[#0B3D26] bg-white'
                                        : 'text-gray-400 hover:text-[#0B3D26] hover:bg-white'
                                    }`}
                                    title="Column Options"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                                    </svg>
                                  </button>
                                )}
                              >
                                {({ close }) => (
                                  <div className="py-2">
                                    {/* Column Section */}
                                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Column</div>
                                    
                                    {/* Edit Details Button */}
                                    <button
                                      onClick={() => {
                                        openColumnEdit(column)
                                        close()
                                      }}
                                      className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                      </svg>
                                      Edit details
                                    </button>
                                    
                                    {/* Set Limit - shows inline input */}
                                    <div className="px-3 py-2">
                                      <div className="flex items-center gap-3 text-sm text-gray-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" />
                                        </svg>
                                        <span>WIP limit</span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="99"
                                          placeholder="∞"
                                          defaultValue={column.wip_limit || ''}
                                          onBlur={(e) => {
                                            const val = e.target.value ? parseInt(e.target.value) : null
                                            if (val !== column.wip_limit) {
                                              handleSetLimit(column, val)
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              const val = e.target.value ? parseInt(e.target.value) : null
                                              handleSetLimit(column, val)
                                              close()
                                            }
                                          }}
                                          className="w-14 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0B3D26] focus:border-[#0B3D26]"
                                        />
                                      </div>
                                    </div>
                                    
                                    <button 
                                      onClick={() => {
                                        handleHideColumn(column)
                                        close()
                                      }}
                                      className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                      </svg>
                                      Hide from view
                                    </button>
                                    
                                    {/* Position Section */}
                                    <div className="border-t border-gray-200 mt-2 pt-2">
                                      <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Position</div>
                                      
                                      <button 
                                        onClick={() => {
                                          handleMoveColumn(column, 'left')
                                          close()
                                        }}
                                        className={`w-full px-3 py-2 text-sm flex items-center gap-3 transition-colors ${
                                          boardColumns.indexOf(column) === 0 
                                            ? 'text-gray-400 cursor-not-allowed' 
                                            : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                        disabled={boardColumns.indexOf(column) === 0}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                        </svg>
                                        <div className="text-left">
                                          <div>Move left</div>
                                          {boardColumns.indexOf(column) === 0 && (
                                            <div className="text-xs text-gray-400">This is the left-most column</div>
                                          )}
                                        </div>
                                      </button>
                                      
                                      <button 
                                        onClick={() => {
                                          handleMoveColumn(column, 'right')
                                          close()
                                        }}
                                        className={`w-full px-3 py-2 text-sm flex items-center gap-3 transition-colors ${
                                          boardColumns.indexOf(column) === boardColumns.length - 1 
                                            ? 'text-gray-400 cursor-not-allowed' 
                                            : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                        disabled={boardColumns.indexOf(column) === boardColumns.length - 1}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                        </svg>
                                        <div className="text-left">
                                          <div>Move right</div>
                                          {boardColumns.indexOf(column) === boardColumns.length - 1 && (
                                            <div className="text-xs text-gray-400">This is the right-most column</div>
                                          )}
                                        </div>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </Popover>
                              
                              {/* Add Task Button */}
                              <TaskCreatePopover
                                status={column.id}
                                defaultProject={quickCreateProject}
                                trigger={({ toggle, open }) => (
                                  <button
                                    onClick={toggle}
                                    className={`p-1 rounded transition-all ${
                                      open
                                        ? 'text-[#0B3D26] bg-white'
                                        : 'text-gray-400 hover:text-[#0B3D26] hover:bg-white'
                                    }`}
                                    title="Add New Task"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                  </button>
                                )}
                              />
                          </div>
                        </div>
                      </div>
                        
                        {/* Column Cards */}
                        <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                          {tasksByStatus[column.id]?.length === 0 ? (
                            <div className="text-center text-gray-400 text-xs py-8">
                              Drop tasks here
                            </div>
                          ) : (
                            tasksByStatus[column.id]?.map((task) => (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task)}
                                onDragEnd={handleDragEnd}
                                className={`bg-white -sm border border-gray-200 p-3 cursor-grab hover:shadow-md hover:border-gray-300 transition-all ${
                                  draggedTask?.id === task.id ? 'opacity-50' : ''
                                }`}
                              >
                                {/* Column colour indicator */}
                                <div className={`h-1 w-full rounded-full mb-2 ${column.color || 'bg-gray-300'}`}></div>
                                
                                <Link
                                  href={`/tasks/${task.uuid}/`}
                                  draggable={false}
                                  className="block text-left w-full"
                                >
                                  <div className="text-xs text-gray-500 mb-1">#{task.id}</div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 hover:text-[#0B3D26]">
                                    {task.title}
                                  </h4>
                                </Link>
                                {task.project && (
                                  <Link href={`/tasks/projects/${task.project.uuid}/`} className="mb-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 max-w-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#0B3D26]/60 flex-shrink-0" />
                                    <span className="truncate">{task.project.name}</span>
                                  </Link>
                                )}
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {/* Priority badge */}
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                      task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                      task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                      task.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {task.priority === 'urgent' && (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-0.5">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                      {task.priority === 'high' && (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-0.5">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </span>
                                  </div>
                                  
                                  {/* Assignee avatar */}
                                  {task.assignee ? (
                                    <div className="flex items-center gap-1" title={task.assignee.name}>
                                      <div className="w-6 h-6 rounded-full bg-[#0B3D26] text-white text-xs flex items-center justify-center">
                                        {task.assignee.name?.charAt(0)?.toUpperCase() || '?'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-400 text-xs flex items-center justify-center" title="Unassigned">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Due date if exists */}
                                {task.due_date && (
                                  <div className={`mt-2 pt-2 border-t border-gray-100 flex items-center gap-1 text-xs ${
                                    isTaskBreached(task) ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                    </svg>
                                    {task.due_date}
                                    {isTaskBreached(task) && (
                                      <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-medium">Breached</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : viewMode === 'list' ? (
                // List View (Table)
                <DataTable
                  data={tasks}
                  serverPagination={pagination ? { page: pagination.current_page, pages: pagination.total_pages, count: pagination.total_count } : undefined}
                  onPageChange={(page, pageSize) => goToPage(page, pageSize)}
                  columns={[
                    {
                      key: 'select',
                      header: (
                        <input
                          type="checkbox"
                          checked={tasks.length > 0 && selectedTasks.length === tasks.length}
                          onChange={toggleAllTasks}
                          className="rounded border-gray-300"
                        />
                      ),
                      sortable: false,
                      hideable: false,
                      render: (task) => (
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="rounded border-gray-300"
                        />
                      ),
                    },
                    {
                      key: 'title',
                      header: 'Task',
                      render: (task) => (
                        <Link href={`/tasks/${task.uuid}/`} className={`${THEME.link} text-left`}>
                          <div className="font-medium">#{task.id} {task.title}</div>
                        </Link>
                      ),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (task) => (
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${statusColors[task.status] || 'bg-gray-100 text-gray-700'}`}>
                          {task.status_display}
                        </span>
                      ),
                    },
                    {
                      key: 'priority',
                      header: 'Priority',
                      render: (task) => (
                        <span className={`font-medium ${priorityColors[task.priority] || 'text-gray-600'}`}>
                          {task.priority_display}
                        </span>
                      ),
                    },
                    {
                      key: 'project',
                      header: 'Project',
                      sortable: false,
                      render: (task) => task.project ? (
                        <Link href={`/tasks/projects/${task.project.uuid}/`} className="text-gray-700 hover:text-[#0B3D26] truncate">
                          {task.project.name}
                        </Link>
                      ) : <span className="text-gray-400">—</span>,
                    },
                    {
                      key: 'assignee',
                      header: 'Assignee',
                      render: (task) => task.assignee?.name || 'Unassigned',
                    },
                    {
                      key: 'due_date',
                      header: 'Due Date',
                      render: (task) => task.due_date ? (
                        <span className={`inline-flex items-center gap-1 ${isTaskBreached(task) ? 'text-red-600 font-medium' : ''}`}>
                          {task.due_date}
                          {isTaskBreached(task) && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-medium">Breached</span>
                          )}
                        </span>
                      ) : '-',
                    },
                    {
                      key: 'created_at',
                      header: 'Created',
                      render: (task) => task.created_at,
                    },
                    ...(activeViewId === 'drafts' ? [{
                      key: 'actions',
                      header: 'Actions',
                      sortable: false,
                      hideable: false,
                      render: (task) => (
                        <div onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => removeTaskFromDraft(task.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1"
                            title="Remove from Drafts"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Restore
                          </button>
                        </div>
                      ),
                    }] : []),
                  ]}
                />
              ) : (
                // Card View (Grid)
                <div className="p-4 sm:p-6 bg-gray-50/50">
                  {tasks.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No tasks yet</h3>
                      <p className="text-gray-500 mb-4">Get started by creating your first task</p>
                      <Link href="/tasks/new/" className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B3D26] text-white rounded-lg hover:bg-[#082C1B] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Create Task
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`group relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden ${
                            selectedTasks.includes(task.id) ? 'ring-2 ring-[#0B3D26] ring-offset-2' : 'border border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          {/* Priority indicator bar */}
                          <div className={`h-1 w-full ${
                            task.priority === 'urgent' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                            task.priority === 'high' ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                            task.priority === 'normal' ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                            'bg-gradient-to-r from-gray-300 to-gray-200'
                          }`} />
                          
                          <div className="p-4">
                            {/* Header: ID, Status, Checkbox */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-400">#{task.id}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-full ${statusColors[task.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {task.status_display}
                                </span>
                              </div>
                              <input 
                                type="checkbox" 
                                checked={selectedTasks.includes(task.id)}
                                onChange={() => toggleTaskSelection(task.id)}
                                className="w-4 h-4 rounded border-gray-300 text-[#0B3D26] focus:ring-[#0B3D26]/20 opacity-0 group-hover:opacity-100 transition-opacity checked:opacity-100"
                              />
                            </div>
                            
                            {/* Title */}
                            <Link
                              href={`/tasks/${task.uuid}/`}
                              className="block text-left w-full group/title"
                            >
                              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover/title:text-[#0B3D26] transition-colors leading-snug">
                                {task.title}
                              </h3>
                            </Link>
                            {task.project && (
                              <Link href={`/tasks/projects/${task.project.uuid}/`} className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 max-w-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0B3D26]/60 flex-shrink-0" />
                                <span className="truncate">{task.project.name}</span>
                              </Link>
                            )}
                            
                            {/* Tags */}
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {task.tags.slice(0, 3).map((tag, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 rounded-md">
                                    {tag}
                                  </span>
                                ))}
                                {task.tags.length > 3 && (
                                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-md">
                                    +{task.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Footer */}
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                              {/* Assignee */}
                              <div className="flex items-center gap-2">
                                {task.assignee ? (
                                  <div className="flex items-center gap-2" title={task.assignee.name}>
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0B3D26] to-[#1E5C3A] text-white text-[10px] font-medium flex items-center justify-center shadow-sm">
                                      {task.assignee.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <span className="text-xs text-gray-600 truncate max-w-[80px]">{task.assignee.name?.split(' ')[0]}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-gray-400">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                      </svg>
                                    </div>
                                    <span className="text-xs">Unassigned</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Due date */}
                              {task.due_date && (
                                <div className={`flex items-center gap-1.5 text-xs ${
                                  isTaskBreached(task) ? 'text-red-600' : 'text-gray-500'
                                }`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                  </svg>
                                  <span className="font-medium">
                                    {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                  {isTaskBreached(task) && (
                                    <span className="px-1 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-medium">Breached</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Pagination */}
                  {pagination && pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 mt-4 border-t border-gray-200 bg-white rounded-b-lg">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => goToPage(pagination.current_page - 1)}
                          disabled={!pagination.has_previous}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => goToPage(pagination.current_page + 1)}
                          disabled={!pagination.has_next}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing page <span className="font-medium">{pagination.current_page}</span> of{' '}
                            <span className="font-medium">{pagination.total_pages}</span>
                            {' '}({pagination.total_count} total tasks)
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                              onClick={() => goToPage(pagination.current_page - 1)}
                              disabled={!pagination.has_previous}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Previous</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                            {[...Array(pagination.total_pages)].map((_, idx) => {
                              const pageNum = idx + 1;
                              if (
                                pageNum === 1 ||
                                pageNum === pagination.total_pages ||
                                (pageNum >= pagination.current_page - 2 && pageNum <= pagination.current_page + 2)
                              ) {
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => goToPage(pageNum)}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                      pageNum === pagination.current_page
                                        ? 'z-10 bg-[#0B3D26] border-[#0B3D26] text-white'
                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              } else if (
                                pageNum === pagination.current_page - 3 ||
                                pageNum === pagination.current_page + 3
                              ) {
                                return <span key={pageNum} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>;
                              }
                              return null;
                            })}
                            <button
                              onClick={() => goToPage(pagination.current_page + 1)}
                              disabled={!pagination.has_next}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Next</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Floating create button - board view already has a per-column button */}
        {viewMode !== 'board' && (
          <div className="fixed bottom-6 right-6 z-50">
            <TaskCreatePopover
              status={boardColumns[0]?.id || 'todo'}
              defaultProject={quickCreateProject}
              trigger={({ toggle, open }) => (
                <button
                  onClick={toggle}
                  className={`w-14 h-14 bg-[#0B3D26] hover:bg-[#14502F] text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center ${
                    open ? 'ring-2 ring-white/40' : ''
                  }`}
                  title="Create task"
                  aria-label="Create task"
                  aria-expanded={open}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            />
          </div>
        )}

        {/* Edit Column Modal */}
        <Modal
          isOpen={!!editingColumn}
          onClose={() => setEditingColumn(null)}
          icon={Pencil}
          title="Edit column"
          size="sm"
          footer={(
            <>
              <ModalButton variant="secondary" onClick={() => setEditingColumn(null)}>Cancel</ModalButton>
              <ModalButton variant="primary" onClick={handleSaveColumn} disabled={!columnForm.label.trim()} loading={isSavingColumn}>
                {isSavingColumn ? 'Saving…' : 'Save'}
              </ModalButton>
            </>
          )}
        >
          {editingColumn && (
            <ModalBody className="space-y-4">
              {/* Preview Badge */}
              <div className="flex justify-center">
                <span className={`px-3 py-1 text-sm font-medium rounded-full text-white ${columnForm.color}`}>
                  {columnForm.label || editingColumn.label}
                </span>
              </div>

              <div>
                <label htmlFor="column-label" className="block text-sm font-medium text-gray-700 mb-1">
                  Label text <span className="text-red-500">*</span>
                </label>
                <input
                  id="column-label"
                  type="text"
                  autoFocus
                  value={columnForm.label}
                  onChange={(e) => setColumnForm(prev => ({ ...prev, label: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && columnForm.label.trim() && handleSaveColumn()}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                />
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {['bg-gray-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500'].map((colorClass) => (
                    <button
                      key={colorClass}
                      type="button"
                      aria-label={colorClass.replace('bg-', '').replace('-500', '')}
                      aria-pressed={columnForm.color === colorClass}
                      onClick={() => setColumnForm(prev => ({ ...prev, color: colorClass }))}
                      className={`w-7 h-7 rounded-full ${colorClass} border-2 border-white ring-2 ${
                        columnForm.color === colorClass ? 'ring-[#0B3D26]' : 'ring-gray-200 hover:ring-gray-400'
                      } transition-all`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="column-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  id="column-description"
                  type="text"
                  value={columnForm.description}
                  onChange={(e) => setColumnForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                />
                <p className="text-xs text-gray-500 mt-1">Visible in group headers and value pickers</p>
              </div>
            </ModalBody>
          )}
        </Modal>

        </>
        )}
      </TasksLayout>
    </>
  )
}
