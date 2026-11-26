import React, { useEffect, useState } from 'react'
import { router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import api from '../../../utils/axios'
import Select from '../SearchableSelect'
import DatePicker from '../pickers/DatePicker'
import RichEditor from '../RichEditor'
import { THEME } from '../../constants/theme'
import { useUnsavedChanges } from '../../context/UnsavedChangesContext'
import TaskTypeSelect from './TaskTypeSelect'

const PRIORITY_OPTIONS = [
  { id: 'low', name: 'Low' },
  { id: 'normal', name: 'Normal' },
  { id: 'high', name: 'High' },
  { id: 'urgent', name: 'Urgent' },
]

/**
 * The "Create New Task" form shown inside task popovers (sidebar, board
 * columns, floating button, project pages). Mount it only while the popover
 * is open so each opening starts with a fresh form.
 *
 * status: status of the new task (e.g. the board column it was opened from).
 * defaultProject / lockProject: pre-select a project, optionally read-only.
 */
export default function TaskCreateForm({ close, status = 'todo', defaultProject = '', lockProject = false, onCreated }) {
  const [isLoadingAddForm, setIsLoadingAddForm] = useState(true)
  const [addFormUsers, setAddFormUsers] = useState([])
  const [addFormGroups, setAddFormGroups] = useState([])
  const [addFormProjects, setAddFormProjects] = useState([])
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    assignee: '',
    task_type: '',
    priority: 'normal',
    group: '',
    due_date: '',
    project: defaultProject || '',
  })
  const [selectedTags, setSelectedTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [selectedWatchers, setSelectedWatchers] = useState([])
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [initialForm] = useState(newTaskForm)

  const dirty = JSON.stringify(newTaskForm) !== JSON.stringify(initialForm) || selectedTags.length > 0 || selectedWatchers.length > 0
  const { guard } = useUnsavedChanges(dirty)
  const requestClose = () => guard(close)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await api.get('/api/tasks/form-data/')
        if (cancelled) return
        setAddFormUsers(response.data.users || [])
        setAddFormGroups(response.data.groups || [])
        setAddFormProjects(response.data.projects || [])
      } catch (error) {
        console.error('Failed to fetch form data:', error)
      }
      if (!cancelled) setIsLoadingAddForm(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const addTag = () => {
    if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
      setSelectedTags([...selectedTags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tag) => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!newTaskForm.title.trim()) {
      toast.error('Title is required')
      return
    }

    if (!newTaskForm.description.trim()) {
      toast.error('Description is required')
      return
    }

    setIsCreatingTask(true)

    try {
      const response = await api.post('/tasks/new/', {
        title: newTaskForm.title,
        description: newTaskForm.description,
        assignee: newTaskForm.assignee || null,
        task_type: newTaskForm.task_type || null,
        priority: newTaskForm.priority,
        group: newTaskForm.group || null,
        due_date: newTaskForm.due_date || null,
        project: newTaskForm.project || null,
        tags: JSON.stringify(selectedTags),
        watchers: JSON.stringify(selectedWatchers),
        status,
      })

      toast.success('Task created successfully')
      if (close) close()
      if (onCreated) onCreated(response.data?.task)
      else router.reload({ preserveScroll: true })
    } catch (error) {
      console.error('Failed to create task:', error)
      toast.error(error?.response?.data?.error || 'Failed to create task')
    } finally {
      setIsCreatingTask(false)
    }
  }

  return (
    <div className="max-h-[60vh] overflow-hidden flex flex-col">
      {/* Popover Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <h4 className="font-semibold text-gray-900 text-sm">Create New Task</h4>
        <button
          onClick={requestClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    
      {/* Popover Content */}
      <div className="p-4 overflow-y-auto flex-1">
        {isLoadingAddForm ? (
          // Skeleton loader
          <div className="animate-pulse space-y-4">
            <div>
              <div className="h-3 w-12 bg-gray-200 rounded mb-2"></div>
              <div className="h-9 w-full bg-gray-200 rounded"></div>
            </div>
            <div>
              <div className="h-3 w-20 bg-gray-200 rounded mb-2"></div>
              <div className="h-24 w-full bg-gray-200 rounded"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="h-3 w-14 bg-gray-200 rounded mb-2"></div>
                <div className="h-9 w-full bg-gray-200 rounded"></div>
              </div>
              <div>
                <div className="h-3 w-14 bg-gray-200 rounded mb-2"></div>
                <div className="h-9 w-full bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="h-3 w-16 bg-gray-200 rounded mb-2"></div>
                <div className="h-9 w-full bg-gray-200 rounded"></div>
              </div>
              <div>
                <div className="h-3 w-16 bg-gray-200 rounded mb-2"></div>
                <div className="h-9 w-full bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ) : (
          // Form
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                placeholder="Brief summary of the task"
                autoFocus
              />
            </div>
          
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <RichEditor
                value={newTaskForm.description}
                onChange={(html) => setNewTaskForm({ ...newTaskForm, description: html })}
                placeholder="Detailed description of the task..."
              />
            </div>
          
            {/* Assignment Section */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assignment</h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignee
                  </label>
                  <Select
                    value={newTaskForm.assignee}
                    onChange={(val) => setNewTaskForm({ ...newTaskForm, assignee: val })}
                    options={addFormUsers}
                    valueKey="id"
                    displayKey="name"
                    placeholder="Select assignee"
                    allowClear={true}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group
                  </label>
                  <Select
                    value={newTaskForm.group}
                    onChange={(val) => setNewTaskForm({ ...newTaskForm, group: val })}
                    options={addFormGroups}
                    valueKey="id"
                    displayKey="name"
                    placeholder="Select group"
                    allowClear={true}
                  />
                </div>
              </div>
            </div>
          
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <TaskTypeSelect value={newTaskForm.task_type} onChange={(val) => setNewTaskForm({ ...newTaskForm, task_type: val })} />
            </div>

            {/* Priority & Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <Select
                  value={newTaskForm.priority}
                  onChange={(val) => setNewTaskForm({ ...newTaskForm, priority: val })}
                  options={PRIORITY_OPTIONS}
                  valueKey="id"
                  displayKey="name"
                  allowClear={false}
                />
              </div>
            
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <DatePicker
                  value={newTaskForm.due_date}
                  onChange={(v) => setNewTaskForm({ ...newTaskForm, due_date: v })}
                  aria-label="Due date"
                  allowClear
                />
              </div>
            </div>
          
            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              {lockProject ? (
                <div className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-700 truncate">
                  {addFormProjects.find(p => p.uuid === newTaskForm.project)?.name || 'This project'}
                </div>
              ) : (
                <Select
                  value={newTaskForm.project}
                  onChange={(val) => setNewTaskForm({ ...newTaskForm, project: val })}
                  options={addFormProjects}
                  valueKey="uuid"
                  displayKey="name"
                  placeholder="No project"
                  allowClear={true}
                  searchable={true}
                />
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                  placeholder="Add tags (press Enter)"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 bg-[#0B3D26] text-white text-sm rounded-md hover:bg-[#082C1B] transition-colors"
                >
                  Add
                </button>
              </div>
            
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          
            {/* Watchers */}
            {addFormUsers.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Watchers</h5>
                <Select
                  value=""
                  onChange={(userId) => {
                    if (userId && !selectedWatchers.includes(userId)) {
                      setSelectedWatchers([...selectedWatchers, userId])
                    }
                  }}
                  options={addFormUsers.filter(u => !selectedWatchers.includes(u.id))}
                  valueKey="id"
                  displayKey="name"
                  placeholder="Select watchers..."
                  allowClear={false}
                />
                {selectedWatchers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedWatchers.map(watcherId => {
                      const user = addFormUsers.find(u => u.id === watcherId)
                      return user ? (
                        <span
                          key={watcherId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs"
                        >
                          {user.name}
                          <button
                            type="button"
                            onClick={() => setSelectedWatchers(selectedWatchers.filter(id => id !== watcherId))}
                            className="hover:text-purple-900"
                          >
                            ×
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            )}
          
            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={requestClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingTask}
                className={`px-4 py-2 text-sm font-medium rounded-md ${THEME.button.primary} disabled:opacity-50 flex items-center gap-2`}
              >
                {isCreatingTask ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Task'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
