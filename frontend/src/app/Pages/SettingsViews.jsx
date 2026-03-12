import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import { THEME } from '../constants/theme'

export default function SettingsViews({ views = {}, currentType = 'TICKET' }) {
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const [activeType, setActiveType] = useState(currentType)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [localViews, setLocalViews] = useState(views)
  const [isLoading, setIsLoading] = useState(true)

  const viewTypes = [
    { id: 'TICKET', label: 'Ticket Views', icon: '📋' },
    { id: 'KB', label: 'KB Views', icon: '📚' },
  ]

  const currentViews = localViews[activeType] || []

  // Update local views when props change
  React.useEffect(() => {
    setLocalViews(views)
  }, [views])

  // Simulate loading delay
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Simulate loading delay
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  const toggleView = async (viewId, currentStatus) => {
    try {
      const response = await fetch(`/settings/views/${viewId}/toggle/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken,
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        router.reload({ only: ['views'] })
      } else {
        toast.error(data.message || 'Failed to update view')
      }
    } catch (error) {
      toast.error('Failed to update view')
      console.error(error)
    }
  }

  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === index) return

    const newViews = [...currentViews]
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
    const viewIds = currentViews.map(v => v.id)
    
    try {
      const response = await fetch('/settings/views/reorder/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken,
        },
        body: JSON.stringify({ view_ids: viewIds }),
      })

      const data = await response.json()

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
    try {
      const response = await fetch(`/settings/views/${viewId}/set-default/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken,
        },
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        router.reload({ only: ['views'] })
      } else {
        toast.error(data.message || 'Failed to set default view')
      }
    } catch (error) {
      toast.error('Failed to set default view')
      console.error(error)
    }
  }

  return (
    <>
      <Head title="Views - Settings" />
      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="views" />}
          
          <main className="flex-1 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!sidenavOpen && (
                  <button
                    className="p-2 rounded-md hover:bg-gray-100"
                    title="Show Settings Menu"
                    onClick={() => setSidenavOpen(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-500">
                      <path d="M13.5 6 21 12l-7.5 6v-4.5H3v-3h10.5V6z"/>
                    </svg>
                  </button>
                )}
                <h1 className="text-xl font-semibold text-gray-800">Configure Views</h1>
              </div>
            </div>

            <div className="p-6">
              {/* What are Views - Info Alert */}
              <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">What are Views?</h3>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      <strong>Views</strong> are customizable filters that appear in the sidebar of your tickets, tasks, and knowledge base pages. 
                      They provide quick access to different sets of items based on status, assignment, priority, or other criteria. This helps you:
                    </p>
                    <ul className="mt-2 ml-4 text-sm text-blue-800 space-y-1 list-disc">
                      <li><strong>Focus on what matters</strong> - Quickly access your assigned items or high-priority work</li>
                      <li><strong>Stay organized</strong> - Filter items by status (To Do, In Progress, etc.)</li>
                      <li><strong>Improve productivity</strong> - Reduce time spent searching for specific items</li>
                      <li><strong>Customize workflows</strong> - Enable only the views your team needs</li>
                    </ul>
                    <p className="text-sm text-blue-800 mt-2">
                      <strong>Tip:</strong> Drag and drop to reorder views, toggle the switch to enable/disable, and select a radio button to set your default landing view.
                    </p>
                  </div>
                </div>
              </div>

              {/* Views List with Tabs */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {isLoading ? (
                  // Loading Skeleton
                  <>
                    {/* Tab Navigation Skeleton */}
                    <div className="border-b border-gray-200 mx-3">
                      <nav className="flex -mb-px">
                        {viewTypes.map((type) => (
                          <div
                            key={type.id}
                            className="px-6 py-3 animate-pulse"
                          >
                            <div className="h-6 w-28 bg-gray-200 rounded"></div>
                          </div>
                        ))}
                      </nav>
                    </div>

                    {/* Content Skeleton */}
                    <div className="p-6">
                      <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-4"></div>
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg animate-pulse"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-5 h-5 bg-gray-200 rounded"></div>
                              <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                              <div className="flex-1">
                                <div className="h-5 w-48 bg-gray-200 rounded mb-2"></div>
                                <div className="h-3 w-72 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-6 bg-gray-200 rounded-full"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  // Actual Content
                  <>
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200 mx-3">
                      <nav className="flex -mb-px">
                        {viewTypes.map((type) => (
                          <button
                            key={type.id}
                            onClick={() => setActiveType(type.id)}
                            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                              activeType === type.id
                                ? 'border-[#4a154b] text-[#4a154b]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <span className="mr-2">{type.icon}</span>
                            {type.label}
                          </button>
                        ))}
                      </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Enable or disable views to customize what appears in the sidebar. 
                    Drag rows to reorder. Select a radio button to set the default view.
                  </p>
                  
                  {currentViews.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 mb-4">No views found for {activeType}</p>
                      <p className="text-sm text-gray-400">
                        Run: python manage.py coredesk --init-views
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentViews.map((view, index) => (
                        <div
                          key={view.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-move transition-all ${
                            draggedIndex === index ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center gap-2 text-gray-400 cursor-grab active:cursor-grabbing">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                              </svg>
                            </div>
                            
                            {/* Radio button for default */}
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name={`default-${activeType}`}
                                checked={view.is_default}
                                onChange={() => setDefaultView(view.id)}
                                className="w-4 h-4 text-[#4a154b] focus:ring-[#4a154b] cursor-pointer"
                                title="Set as default view"
                              />
                            </div>
                            
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{view.label}</h3>
                              {view.description && (
                                <p className="text-sm text-gray-500 mt-1">{view.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                ID: {view.view_id}
                                {view.is_default && (
                                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                    Default
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">                            
                            <button
                              onClick={() => toggleView(view.id, view.is_active)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                view.is_active ? 'bg-[#4a154b]' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  view.is_active ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  </>
                )}
              </div>

    
            </div>
          </main>
        </div>
      </AppShell>
    </>
  )
}
