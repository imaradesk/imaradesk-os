import React, { useState, useMemo } from 'react'
import { Head, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import { SettingsHeading } from '../components/settings/SettingsPage'
import {
  BookOpen, CheckSquare, ChevronDown, EyeOff, GripVertical, Layers, MousePointerClick,
  PanelLeft, Search, Star, Ticket, ToggleRight, X,
} from 'lucide-react'
import { viewVisual } from '../components/viewIcons'
import { useInstalledModules } from '../context/InstalledModulesContext'
import Tabs from '../components/Tabs'

const TYPE_LABELS = {
  TICKET: 'Tickets',
  TASK: 'Tasks',
  KB: 'Knowledge Base',
}

const ALL_VIEW_TYPES = [
  { id: 'TICKET', label: 'Tickets', icon: Ticket },
  { id: 'TASK', label: 'Tasks', icon: CheckSquare, module: 'tasks' },
  { id: 'KB', label: 'Knowledge Base', icon: BookOpen, module: 'kb' },
]

const HOW_TO = [
  { icon: GripVertical, title: 'Drag to reorder', body: 'The order here is the order in the sidebar.' },
  { icon: ToggleRight, title: 'Toggle to show or hide', body: 'Only enabled views appear for your team.' },
  { icon: Star, title: 'Star the default', body: 'The page opens on this view the first time.' },
]

function ViewIcon({ type, viewId, muted = false }) {
  const { icon: Icon, color } = viewVisual(type, viewId)
  return (
    <span
      className={`w-9 h-9 flex-shrink-0 rounded-lg inline-flex items-center justify-center transition-all duration-300 ${muted ? 'grayscale opacity-60' : ''}`}
      style={{ color, backgroundColor: `${color}1a` }}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
    </span>
  )
}

// Preview: shows how enabled views will appear in the sidebar
function ViewsPreview({ views, activeType }) {
  const enabledViews = views.filter((v) => v.is_active)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
        <PanelLeft className="w-4 h-4 text-gray-400" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">Sidebar preview</h3>
          <p className="text-xs text-gray-500">{TYPE_LABELS[activeType]} page</p>
        </div>
      </div>

      <div className="p-4">
        {/* Mock app window */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200">
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="w-2 h-2 rounded-full bg-gray-300" />
          </div>
          <div className="p-2.5">
            <div className="flex items-center justify-between px-1.5 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Views</span>
              <span className="text-[10px] text-gray-400 tabular-nums">{enabledViews.length} active</span>
            </div>

            {enabledViews.length === 0 ? (
              <div className="py-8 text-center animate-fadeIn">
                <EyeOff className="w-5 h-5 mx-auto text-gray-300 mb-1.5" />
                <p className="text-xs text-gray-500">No active views</p>
                <p className="text-[11px] text-gray-400">Enable a view to see it here</p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {enabledViews.map((view, index) => {
                  const { icon: Icon } = viewVisual(activeType, view.view_id)
                  return (
                    <li
                      key={view.id}
                      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs animate-portalSlideIn transition-colors ${
                        view.is_default ? 'bg-[#0B3D26]/10 text-[#0B3D26] font-medium' : 'text-gray-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
                      <span className="flex-1 truncate">{view.label}</span>
                      {view.is_default && <Star className="w-3 h-3 fill-current" />}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs text-gray-500">
          <Star className="w-3.5 h-3.5 mt-px flex-shrink-0 text-amber-500" />
          The starred view opens first when people visit the {TYPE_LABELS[activeType]} page.
        </p>
      </div>
    </div>
  )
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onChange}
      className={`relative w-9 h-5 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B3D26]/30 ${checked ? 'bg-[#0B3D26]' : 'bg-gray-300'}`}
    >
      <span className={`toggle-knob absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ease-smooth ${checked ? 'translate-x-4' : ''}`} />
    </button>
  )
}

export default function SettingsViews({ views = {}, currentType = 'TICKET' }) {
  const [activeType, setActiveType] = useState(currentType)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [localViews, setLocalViews] = useState(views)
  const [searchQuery, setSearchQuery] = useState('')
  const [showIntro, setShowIntro] = useState(false)

  // Get installed modules from context
  const { isModuleInstalled } = useInstalledModules()

  // Only show tabs for installed modules (Tickets always shown)
  const viewTypes = useMemo(() => {
    return ALL_VIEW_TYPES.filter(type => {
      if (!type.module) return true
      return isModuleInstalled(type.module)
    })
  }, [isModuleInstalled])

  const allCurrentViews = localViews[activeType] || []

  // Filter views based on search query
  const currentViews = useMemo(() => {
    if (!searchQuery.trim()) return allCurrentViews
    const query = searchQuery.toLowerCase()
    return allCurrentViews.filter(view =>
      view.label.toLowerCase().includes(query) ||
      view.view_id.toLowerCase().includes(query) ||
      (view.description && view.description.toLowerCase().includes(query))
    )
  }, [allCurrentViews, searchQuery])

  const activeCount = allCurrentViews.filter((v) => v.is_active).length

  // Reset to TICKET if current type's module is not installed
  React.useEffect(() => {
    const isValidType = viewTypes.some(type => type.id === activeType)
    if (!isValidType) {
      setActiveType('TICKET')
    }
  }, [viewTypes, activeType])

  // Update local views when props change
  React.useEffect(() => {
    setLocalViews(views)
  }, [views])

  // Apply a change to the active tab's views right away; the reload confirms it
  const patchViews = (fn) => setLocalViews((prev) => ({ ...prev, [activeType]: (prev[activeType] || []).map(fn) }))

  const toggleView = async (viewId, currentStatus) => {
    patchViews((v) => (v.id === viewId ? { ...v, is_active: !currentStatus } : v))
    try {
      const response = await api.post(`/administration/views/${viewId}/toggle/`, { is_active: !currentStatus })

      const data = response.data

      if (data.success) {
        toast.success(data.message)
        router.reload({ only: ['views'] })
      } else {
        toast.error(data.message || 'Failed to update view')
        setLocalViews(views)
      }
    } catch (error) {
      toast.error('Failed to update view')
      console.error(error)
      setLocalViews(views)
    }
  }

  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === index) return

    const newViews = [...allCurrentViews]
    const draggedItem = newViews[draggedIndex]
    newViews.splice(draggedIndex, 1)
    newViews.splice(index, 0, draggedItem)

    setLocalViews({
      ...localViews,
      [activeType]: newViews
    })
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return

    // Update order in backend
    const viewIds = allCurrentViews.map(v => v.id)

    try {
      const response = await api.post('/administration/views/reorder/', { view_ids: viewIds })

      const data = response.data

      if (data.success) {
        toast.success('Views reordered successfully')
        router.reload({ only: ['views'] })
      } else {
        toast.error(data.message || 'Failed to reorder views')
        // Revert on error
        setLocalViews(views)
      }
    } catch (error) {
      toast.error('Failed to reorder views')
      console.error(error)
      // Revert on error
      setLocalViews(views)
    } finally {
      setDraggedIndex(null)
    }
  }

  const setDefaultView = async (viewId) => {
    patchViews((v) => ({ ...v, is_default: v.id === viewId }))
    try {
      const response = await api.post(`/administration/views/${viewId}/set-default/`)

      const data = response.data

      if (data.success) {
        toast.success(data.message)
        router.reload({ only: ['views'] })
      } else {
        toast.error(data.message || 'Failed to set default view')
        setLocalViews(views)
      }
    } catch (error) {
      toast.error('Failed to set default view')
      console.error(error)
      setLocalViews(views)
    }
  }

  return (
    <>
      <Head title="Views - Settings" />
      <AppShell active="settings" fixedHeight>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex flex-wrap items-center gap-3">
              <SettingsHeading section="views">Configure Views</SettingsHeading>
              <div className="relative ml-auto w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setSearchQuery('') }}
                  placeholder="Search views"
                  aria-label="Search views"
                  className="w-full h-9 pl-9 pr-8 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26] transition-shadow"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full space-y-6">
              {/* Intro */}
              <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white animate-portalRise">
                <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#0B3D26]/10 blur-3xl" />
                <div className="relative p-5 sm:p-6 flex items-start gap-4">
                  <span className="w-11 h-11 rounded-xl bg-[#0B3D26] text-white inline-flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Layers className="w-5 h-5" strokeWidth={1.75} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-semibold tracking-tight text-gray-900">Shape your team's sidebar</h1>
                    <p className="mt-0.5 text-sm text-gray-500">
                      Views are saved filters in the sidebar of tickets, tasks and the knowledge base. They give quick access to
                      work by status, assignment or priority.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowIntro((v) => !v)}
                      aria-expanded={showIntro}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#0B3D26] hover:underline"
                    >
                      How it works
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showIntro ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className={`grid transition-[grid-template-rows] duration-300 ease-smooth ${showIntro ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <ul className="relative grid sm:grid-cols-3 gap-3 px-5 sm:px-6 pb-5 sm:pb-6">
                      {HOW_TO.map(({ icon: Icon, title, body }, i) => (
                        <li
                          key={title}
                          style={showIntro ? { animationDelay: `${i * 60}ms` } : undefined}
                          className={`flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 ${showIntro ? 'animate-portalRise' : ''}`}
                        >
                          <span className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-[#0B3D26] inline-flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4" strokeWidth={1.75} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{title}</p>
                            <p className="text-xs text-gray-500">{body}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Views list */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Tabs
                      label="View type"
                      active={activeType}
                      onChange={(id) => {
                        setActiveType(id)
                        setSearchQuery('')
                      }}
                      tabs={viewTypes.map((t) => ({ ...t, count: (localViews[t.id] || []).length }))}
                    />
                    <p className="ml-auto text-xs text-gray-500">
                      {searchQuery
                        ? `Showing ${currentViews.length} of ${allCurrentViews.length}`
                        : <><span className="font-medium text-gray-900 tabular-nums">{activeCount}</span> of {allCurrentViews.length} enabled</>}
                    </p>
                  </div>

                  {currentViews.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-14 px-6 text-center animate-portalRise">
                      <span className="mx-auto mb-3 w-12 h-12 rounded-xl bg-gray-100 text-gray-400 inline-flex items-center justify-center">
                        {searchQuery ? <Search className="w-6 h-6" strokeWidth={1.5} /> : <Layers className="w-6 h-6" strokeWidth={1.5} />}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {searchQuery ? `No views match “${searchQuery}”` : `No ${TYPE_LABELS[activeType]} views yet`}
                      </h3>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="mt-4 h-8 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  ) : (
                    <ul key={activeType} className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
                      {currentViews.map((view, index) => {
                        const dragging = draggedIndex === index
                        return (
                          <li
                            key={view.id}
                            draggable={!searchQuery}
                            onDragStart={(e) => !searchQuery && handleDragStart(e, index)}
                            onDragOver={(e) => !searchQuery && handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
                            className={`group relative flex items-center gap-3 px-3 sm:px-4 py-3 animate-portalRise transition-[background-color,box-shadow,opacity] duration-200 ${
                              dragging
                                ? 'z-10 bg-white shadow-card-hover ring-2 ring-[#0B3D26]/20 opacity-90'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            {view.is_default && <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[#0B3D26]" />}

                            {!searchQuery && (
                              <span className="text-gray-300 group-hover:text-gray-500 cursor-grab active:cursor-grabbing transition-colors" title="Drag to reorder">
                                <GripVertical className="w-4 h-4" />
                              </span>
                            )}

                            <ViewIcon type={activeType} viewId={view.view_id} muted={!view.is_active} />

                            <div className={`flex-1 min-w-0 transition-opacity ${view.is_active ? '' : 'opacity-60'}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 truncate">{view.label}</h3>
                                {view.is_default && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-medium text-amber-700 animate-portalPop">
                                    <Star className="w-2.5 h-2.5 fill-current" /> Default
                                  </span>
                                )}
                              </div>
                              {view.description && <p className="mt-0.5 text-xs text-gray-500 truncate">{view.description}</p>}
                              <code className="mt-1 inline-block px-1.5 rounded bg-gray-100 text-[10px] text-gray-500">{view.view_id}</code>
                            </div>

                            <button
                              type="button"
                              onClick={() => !view.is_default && setDefaultView(view.id)}
                              aria-pressed={view.is_default}
                              aria-label={view.is_default ? 'Default view' : `Set ${view.label} as default`}
                              title={view.is_default ? 'Default view' : 'Set as default'}
                              className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-all duration-200 ${
                                view.is_default
                                  ? 'text-amber-500 cursor-default'
                                  : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100'
                              }`}
                            >
                              <Star className={`w-4 h-4 transition-transform duration-300 ${view.is_default ? 'fill-current scale-110' : 'hover:scale-110'}`} />
                            </button>

                            <Switch
                              checked={view.is_active}
                              onChange={() => toggleView(view.id, view.is_active)}
                              label={view.is_active ? `Hide ${view.label}` : `Show ${view.label}`}
                            />
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {!searchQuery && currentViews.length > 1 && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-400">
                      <MousePointerClick className="w-3.5 h-3.5" />
                      Drag rows by the handle to change their order in the sidebar.
                    </p>
                  )}
                </div>

                {/* Preview */}
                <div className="lg:sticky lg:top-20 animate-portalRise [animation-delay:120ms]">
                  <ViewsPreview views={allCurrentViews} activeType={activeType} />
                </div>
              </div>
            </div>
          </main>
        </div>
      </AppShell>
    </>
  )
}
