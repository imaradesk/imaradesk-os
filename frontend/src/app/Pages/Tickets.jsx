import React, { useState, useEffect } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppShell from '../components/AppShell'
import { Popover } from '../../components/Popover'
import { THEME, COLORS } from '../constants/theme'
import Skeleton from '../components/Skeleton'
import { TicketDetailPanel } from '../components/ticket'
import api from '../../utils/axios'
import {
  AssignAgentDrawer,
  AssignTeamDrawer,
  ChangeStatusDrawer,
  ChangePriorityDrawer,
  ChangeTypeDrawer,
  DeleteConfirmDrawer,
  MergeTicketsDrawer
} from '../components/tickets/BulkActionDrawers'
import {
  GlobalOutlined,
  MailOutlined,
  MessageOutlined,
  SendOutlined,
  SlackOutlined,
  WindowsOutlined,
  ApiOutlined,
} from '@ant-design/icons'

// Map icon name strings (from DB) to actual components
const CHANNEL_ICON_MAP = {
  GlobalOutlined,
  MailOutlined,
  MessageOutlined,
  SendOutlined,
  SlackOutlined,
  WindowsOutlined,
  ApiOutlined,
}

// Helper to render channel icon
const ChannelIcon = ({ channel, className = '', style = {} }) => {
  if (!channel) return <span className={className}>🌐</span>
  const IconComponent = CHANNEL_ICON_MAP[channel.icon]
  if (IconComponent) {
    return <IconComponent className={className} style={style} />
  }
  // Fallback to emoji or default icon
  return <GlobalOutlined className={className} style={style} />
}

// Helper to get display label from computed_status
const getStatusDisplay = (computedStatus) => {
  if (!computedStatus) return 'Unknown'
  const labels = {
    'new': 'New',
    'open': 'Open',
    'in_progress': 'In Progress',
    'pending': 'On Hold',
    'resolved': 'Resolved',
    'closed': 'Closed',
  }
  return labels[computedStatus] || computedStatus
}

// Helper to get status badge styling from computed_status
const getStatusBadgeClass = (computedStatus) => {
  if (!computedStatus) return 'bg-gray-100 text-gray-600'
  const styles = {
    'new': 'bg-purple-100 text-purple-700',
    'open': 'bg-blue-100 text-blue-700',
    'in_progress': 'bg-yellow-100 text-yellow-700',
    'pending': 'bg-orange-100 text-orange-700',
    'resolved': 'bg-green-100 text-green-700',
    'closed': 'bg-gray-100 text-gray-600',
  }
  return styles[computedStatus] || 'bg-gray-100 text-gray-600'
}

// Hover Popover for ticket title - shows description on hover
const TicketTitlePopover = ({ ticket, children, className = '' }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [description, setDescription] = useState(null)
  const hoverTimeoutRef = React.useRef(null)
  const loadingTimeoutRef = React.useRef(null)
  
  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true)
      setShowPopover(true)
      setIsLoading(true)
      
      // Show skeleton for at least 50ms before loading description
      loadingTimeoutRef.current = setTimeout(() => {
        // Use ticket's description if already available, otherwise could fetch from API
        if (ticket.description) {
          setDescription(ticket.description)
          setIsLoading(false)
        } else {
          // Fetch description from API if not available
          api.get(`/tickets/api/${ticket.uuid}/description/`)
            .then(res => {
              setDescription(res.data.description || 'No description provided')
              setIsLoading(false)
            })
            .catch(() => {
              setDescription('No description provided')
              setIsLoading(false)
            })
        }
      }, 50)
    }, 200) // Small delay before showing popover to avoid accidental triggers
  }
  
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }
    setIsHovered(false)
    setShowPopover(false)
    setIsLoading(true)
    setDescription(null)
  }
  
  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {/* Popover */}
      <div 
        className={`absolute z-[9999] left-0 top-full mt-2 min-w-[280px] max-w-[90vw] w-max transition-all duration-150 ${
          showPopover ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
        }`}
      >
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</p>
          </div>
          <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2 w-64">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
              </div>
            ) : description ? (
              <div 
                className="text-sm text-gray-700 prose prose-sm max-w-[500px] [&_img]:max-w-full [&_img]:h-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:break-words"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            ) : (
              <p className="text-sm text-gray-500 italic">No description provided</p>
            )}
          </div>
        </div>
        {/* Arrow */}
        <div className="absolute -top-2 left-4 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white" style={{ filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.05))' }}></div>
      </div>
    </div>
  )
}

export default function Tickets({ sidebar = {}, tickets = [], currentView = null, pagination = null, draftsCount = 0 }) {
  const { url } = usePage()
  const views = sidebar.views || []
  
  // Parse URL params for initial filter values
  const getInitialFilters = () => {
    const params = new URLSearchParams(url.split('?')[1] || '')
    return {
      ticketNumber: params.get('ticketNumber') || '',
      status: params.get('status') || '',
      priority: params.get('priority') || '',
      type: params.get('type') || '',
      assignee: params.get('assignee') || '',
      dateFrom: params.get('dateFrom') || '',
      dateTo: params.get('dateTo') || '',
    }
  }
  
  // Find default view (is_default: true) or fallback to first view
  const defaultView = views.find(v => v.is_default) || views[0]
  // Use currentView if provided, otherwise use the default view's id
  const initialCurrentView = currentView || (defaultView ? defaultView.id : null)
  
  const [viewsOpen, setViewsOpen] = useState(true)
  const [viewMode, setViewMode] = useState(() => {
    // Get saved view mode from localStorage, default to 'detailed'
    const savedViewMode = localStorage.getItem('ticketsViewMode')
    return savedViewMode || 'detailed'
  }) // 'list', 'card', or 'detailed'
  // Only show loading if data isn't already available
  const hasInitialData = views.length > 0 || tickets.length > 0
  const [isViewsLoading, setIsViewsLoading] = useState(!hasInitialData)
  const [isTicketsLoading, setIsTicketsLoading] = useState(!hasInitialData)
  const [localTickets, setLocalTickets] = useState(tickets)
  const [localCurrentView, setLocalCurrentView] = useState(initialCurrentView)
  const [initialLoadComplete, setInitialLoadComplete] = useState(hasInitialData)
  const [selectedTickets, setSelectedTickets] = useState([])
  const [selectedDetailTicket, setSelectedDetailTicket] = useState(null) // For detailed view

  // Check if any selected ticket is closed/resolved (disable bulk field edits)
  const hasClosedSelected = selectedTickets.some(id => {
    const t = localTickets.find(t => t.uuid === id)
    return t && (t.computed_status === 'closed' || t.computed_status === 'resolved')
  })
  const [isMarkingDraft, setIsMarkingDraft] = useState(false)
  const [isRemovingFromDraft, setIsRemovingFromDraft] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showActionsDropdown, setShowActionsDropdown] = useState(false)
  const [filters, setFilters] = useState(getInitialFilters)
  
  // Drawer states
  const [showAssignAgentDrawer, setShowAssignAgentDrawer] = useState(false)
  const [showAssignTeamDrawer, setShowAssignTeamDrawer] = useState(false)
  const [showChangeStatusDrawer, setShowChangeStatusDrawer] = useState(false)
  const [showChangePriorityDrawer, setShowChangePriorityDrawer] = useState(false)
  const [showChangeTypeDrawer, setShowChangeTypeDrawer] = useState(false)
  const [showDeleteConfirmDrawer, setShowDeleteConfirmDrawer] = useState(false)
  const [showMergeDrawer, setShowMergeDrawer] = useState(false)
  const [expandedRows, setExpandedRows] = useState(new Set())
  
  // Pagination state for infinite scroll (card/detailed views)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(pagination?.has_next || false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  React.useEffect(() => {
    if (hasInitialData) {
      setIsViewsLoading(false)
      setIsTicketsLoading(false)
      setInitialLoadComplete(true)
      return
    }
    
    setIsViewsLoading(true)
    setIsTicketsLoading(true)
    const timer = setTimeout(() => {
      setIsViewsLoading(false)
      setIsTicketsLoading(false)
      setInitialLoadComplete(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [hasInitialData])

  React.useEffect(() => {
    setLocalTickets(tickets)
    // Use currentView if provided, otherwise use default view (is_default) or first view
    const defaultV = views.find(v => v.is_default) || views[0]
    const newCurrentView = currentView || (defaultV ? defaultV.id : null)
    setLocalCurrentView(newCurrentView)
    if (initialLoadComplete) {
      setIsTicketsLoading(false)
    }
    // Reset pagination state when tickets change (new view loaded)
    setCurrentPage(pagination?.current_page || 1)
    setHasMore(pagination?.has_next || false)
  }, [tickets, currentView, views, initialLoadComplete, pagination])

  // Auto-select first ticket in detailed view mode, or clear if no tickets
  React.useEffect(() => {
    if (viewMode === 'detailed') {
      if (localTickets.length > 0 && !selectedDetailTicket) {
        setSelectedDetailTicket(localTickets[0])
      } else if (localTickets.length === 0 && selectedDetailTicket) {
        setSelectedDetailTicket(null)
      }
    }
  }, [viewMode, localTickets, selectedDetailTicket])

  // Save view mode to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('ticketsViewMode', viewMode)
  }, [viewMode])

  const loadView = (viewId) => {
    setIsTicketsLoading(true)
    setLocalCurrentView(viewId)
    setSelectedTickets([])
    setSelectedDetailTicket(null) // Clear selected ticket when switching views
    // Reset pagination when loading a new view
    setCurrentPage(1)
    setHasMore(false)
    router.visit(`/tickets/?view=${viewId}`, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setIsTicketsLoading(false),
    })
  }

  // Load more tickets for infinite scroll (card/detailed views)
  const loadMoreTickets = async () => {
    if (isLoadingMore || !hasMore) return
    
    setIsLoadingMore(true)
    const nextPage = currentPage + 1
    const params = new URLSearchParams()
    params.set('view', localCurrentView)
    params.set('page', nextPage)
    if (filters.ticketNumber) params.set('ticketNumber', filters.ticketNumber)
    if (filters.status) params.set('status', filters.status)
    if (filters.priority) params.set('priority', filters.priority)
    if (filters.type) params.set('type', filters.type)
    if (filters.assignee) params.set('assignee', filters.assignee)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    
    try {
      const response = await api.get(`/tickets/api/list/?${params.toString()}`)
      
      setLocalTickets(prev => [...prev, ...response.data.tickets])
      setCurrentPage(nextPage)
      setHasMore(response.data.pagination?.has_next || false)
    } catch (error) {
      console.error('Failed to load more tickets:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Scroll handler for infinite scroll
  const handleScroll = React.useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    // Load more when scrolled to 80% of the container
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      loadMoreTickets()
    }
  }, [currentPage, hasMore, isLoadingMore, localCurrentView, filters])

  const toggleTicketSelection = (ticketId) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    )
  }

  const toggleAllTickets = () => {
    if (selectedTickets.length === localTickets.length) {
      setSelectedTickets([])
    } else {
      setSelectedTickets(localTickets.map(t => t.uuid))
    }
  }

  const toggleRowExpand = (ticketId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId)
      } else {
        newSet.add(ticketId)
      }
      return newSet
    })
  }

  const markSelectedAsDraft = async () => {
    if (selectedTickets.length === 0) return
    
    setIsMarkingDraft(true)
    try {
      await api.post('/tickets/bulk/mark-draft/', { ticket_ids: selectedTickets })
      
      // Reload the current view to reflect changes
      router.reload({ preserveScroll: true })
      setSelectedTickets([])
    } catch (error) {
      console.error('Failed to mark tickets as draft:', error)
    } finally {
      setIsMarkingDraft(false)
    }
  }

  const removeSelectedFromDraft = async () => {
    if (selectedTickets.length === 0) return
    
    setIsRemovingFromDraft(true)
    try {
      await api.post('/tickets/bulk/remove-draft/', { ticket_ids: selectedTickets })
      
      // Reload the current view to reflect changes
      router.reload({ preserveScroll: true })
      setSelectedTickets([])
    } catch (error) {
      console.error('Failed to remove tickets from draft:', error)
    } finally {
      setIsRemovingFromDraft(false)
    }
  }

  // Handle bulk action success
  const handleBulkActionSuccess = (message) => {
    // Reload the current view to reflect changes
    router.reload({ preserveScroll: true })
    setSelectedTickets([])
    setShowActionsDropdown(false)
  }

  // Duplicate ticket handler
  const handleDuplicateTicket = async () => {
    if (selectedTickets.length !== 1) return
    
    try {
      const response = await api.post(`/tickets/${selectedTickets[0]}/duplicate/`)
      
      // Navigate to the new ticket
      router.visit(`/tickets/${response.data.new_ticket_uuid}/`)
    } catch (error) {
      console.error('Failed to duplicate ticket:', error)
    }
  }

  // Helper function to format SLA time
  const formatSlaTime = (hours) => {
    if (hours === null || hours === undefined) return null
    if (hours < 1) {
      const minutes = Math.round(hours * 60)
      return `${minutes}m`
    } else if (hours < 24) {
      return `${Math.round(hours * 10) / 10}h`
    } else {
      const days = Math.floor(hours / 24)
      const remainingHours = Math.round(hours % 24)
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
    }
  }

  // SLA Badge component
  const SLABadge = ({ slaInfo }) => {
    if (!slaInfo) return null
    
    const { overall_status, response, resolution, is_on_hold } = slaInfo
    
    if (is_on_hold) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600" title="SLA On Hold">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
          Hold
        </span>
      )
    }
    
    if (resolution.breached) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700" title={`Resolution overdue by ${formatSlaTime(resolution.hours_overdue)}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          Breached
        </span>
      )
    }
    
    if (overall_status === 'at_risk') {
      const timeLeft = resolution.hours_remaining || response.hours_remaining
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700" title={`SLA at risk - ${formatSlaTime(timeLeft)} remaining`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          {formatSlaTime(timeLeft)}
        </span>
      )
    }
    
    // On track
    const timeLeft = resolution.hours_remaining || response.hours_remaining
    if (timeLeft) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700" title={`${formatSlaTime(timeLeft)} remaining`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          {formatSlaTime(timeLeft)}
        </span>
      )
    }
    
    return null
  }

  // Get the current view label from the views list
  const activeView = views.find(v => v.id === localCurrentView)
  const pageTitle = activeView ? activeView.label : 'Tickets'

  // Build URL params with current filters
  const buildUrlParams = (page = null) => {
    const params = new URLSearchParams()
    params.set('view', localCurrentView)
    
    if (page) params.set('page', page)
    if (filters.ticketNumber) params.set('ticketNumber', filters.ticketNumber)
    if (filters.status) params.set('status', filters.status)
    if (filters.priority) params.set('priority', filters.priority)
    if (filters.type) params.set('type', filters.type)
    if (filters.assignee) params.set('assignee', filters.assignee)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    
    return params.toString()
  }

  const applyFilters = () => {
    router.get(`/tickets/?${buildUrlParams()}`)
  }

  const clearFilters = () => {
    setFilters({
      ticketNumber: '',
      status: '',
      priority: '',
      type: '',
      assignee: '',
      dateFrom: '',
      dateTo: '',
    })
    // Reload the page without filters
    router.get(`/tickets/?view=${localCurrentView}`)
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  // Show filter panel if there are active filters on load
  useEffect(() => {
    if (hasActiveFilters) {
      setShowFilters(true)
    }
  }, [])

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (showActionsDropdown && !e.target.closest('.actions-dropdown-container')) {
        setShowActionsDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showActionsDropdown])


  return (
    <>
      <Head title={pageTitle} />
      <AppShell active="tickets">
        {/* Content row: Views sidebar + main list */}
        <div className="flex h-[calc(100vh-3rem)]">
        {/* Views Sidebar */}
        <div className="relative">
          {viewsOpen && (
          <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-gray-800 font-semibold">Views</h2>
            </div>

          <nav className="p-2 flex-1 overflow-y-auto">
            {isViewsLoading ? (
              <Skeleton />
            ) : views.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mb-4">No views configured.</p>
                <Link
                  href="/administration/views/"
                  className={`${THEME.link} font-medium text-sm px-4 py-2 rounded-md border border-current hover:bg-gray-50 transition-colors`}
                >
                  Configure Views
                </Link>
              </div>
            ) : (
              views.map((v) => (
                <button
                  key={v.id}
                  onClick={() => loadView(v.id)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                    localCurrentView === v.id
                      ? 'bg-[#4a154b]/10 text-[#4a154b] font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                  >
                  <span className="truncate">{v.label}</span>
                  <span className={`ml-3 inline-flex items-center justify-center rounded-full text-xs px-2 py-0.5 ${
                    localCurrentView === v.id
                      ? 'bg-[#4a154b]/20 text-[#4a154b]'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {v.count}
                  </span>
                </button>
              ))
            )}
          </nav>


          <div className="mt-auto border-t border-gray-200 p-2 space-y-1">
            {/* Drafts link */}
            <button
              onClick={() => loadView('drafts')}
              className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                localCurrentView === 'drafts'
                  ? 'bg-[#4a154b]/10 text-[#4a154b] font-medium'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
              style={localCurrentView === 'drafts' ? { borderLeft: `3px solid ${COLORS.primary}` } : {}}
            >
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Drafts
              </span>
              <span className={`ml-3 inline-flex items-center justify-center rounded-full text-xs px-2 py-0.5 ${
                localCurrentView === 'drafts'
                  ? 'bg-[#4a154b]/20 text-[#4a154b]'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {draftsCount}
              </span>
            </button>
            
            <Link
              href="/administration/views/"
              className={`w-full px-3 py-2 text-sm ${THEME.link} text-left rounded-md hover:bg-[#4a154b]/5 transition-colors flex items-center gap-2`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Manage Views
            </Link>
            <Popover
              width={160}
              maxHeight={200}
              showArrow={true}
              trigger={({ toggle }) => (
                <button
                  onClick={toggle}
                  className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-700 text-left rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Change View Mode
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3 ml-auto">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              )}
            >
              {({ close }) => (
                <div className="py-1">
                  <button
                    onClick={() => {
                      setViewMode('list')
                      close()
                    }}
                    className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors ${
                      viewMode === 'list'
                        ? 'bg-[#4a154b]/10 text-[#4a154b] font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                    </svg>
                    List
                    {viewMode === 'list' && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 ml-auto">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('card')
                      close()
                    }}
                    className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors ${
                      viewMode === 'card'
                        ? 'bg-[#4a154b]/10 text-[#4a154b] font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                    Card
                    {viewMode === 'card' && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 ml-auto">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('detailed')
                      close()
                      // Auto-select first ticket if none selected
                      if (!selectedDetailTicket && localTickets.length > 0) {
                        setSelectedDetailTicket(localTickets[0])
                      }
                    }}
                    className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors ${
                      viewMode === 'detailed'
                        ? 'bg-[#4a154b]/10 text-[#4a154b] font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                    </svg>
                    Detailed
                    {viewMode === 'detailed' && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 ml-auto">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </Popover>
          </div>
        </aside>
          )}
          {/* Floating toggle button on sidebar border */}
          <button
            onClick={() => setViewsOpen(v => !v)}
            className="absolute top-3 z-10 w-6 h-6 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-700"
            style={{ left: viewsOpen ? '276px' : '0px' }}
            title={viewsOpen ? 'Hide Views' : 'Show Views'}
          >
            {viewsOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Main */}
        <main 
          className={`flex-1 flex flex-col ${viewMode === 'detailed' ? 'overflow-hidden' : 'overflow-y-auto'}`}
          onScroll={viewMode === 'card' ? handleScroll : undefined}
        >
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-800">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-1.5 border rounded-md text-sm flex items-center gap-1 ${
                  showFilters || hasActiveFilters
                    ? 'border-[#4a154b] text-[#4a154b] bg-[#4a154b]/5'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                Filter
                {hasActiveFilters && (
                  <span className="ml-1 bg-[#4a154b] text-white text-xs rounded-full px-1.5">
                    {Object.values(filters).filter(v => v !== '').length}
                  </span>
                )}
              </button>
              
              {/* Actions Dropdown */}
              <div className="relative actions-dropdown-container">
                <button 
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  className={`px-3 py-1.5 border rounded-md text-sm flex items-center gap-1 ${
                    selectedTickets.length > 0
                      ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={selectedTickets.length === 0}
                >
                  Actions
                  {selectedTickets.length > 0 && (
                    <span className="ml-1 bg-[#4a154b] text-white text-xs rounded-full px-1.5">
                      {selectedTickets.length}
                    </span>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`w-4 h-4 transition-transform ${showActionsDropdown ? 'rotate-180' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                
                {showActionsDropdown && selectedTickets.length > 0 && (
                  <div className="absolute right-0 mt-1 w-56 bg-white -lg border border-gray-200 py-1 z-50">
                    {/* Bulk Actions - work with multiple tickets */}
                    <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Bulk Actions</div>
                    <button 
                      className={`w-full px-4 py-2 text-sm text-left flex items-center gap-3 ${hasClosedSelected ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => { if (!hasClosedSelected) { setShowAssignAgentDrawer(true); setShowActionsDropdown(false); } }}
                      disabled={hasClosedSelected}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      Assign to Agent
                    </button>
                    <button 
                      className={`w-full px-4 py-2 text-sm text-left flex items-center gap-3 ${hasClosedSelected ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => { if (!hasClosedSelected) { setShowAssignTeamDrawer(true); setShowActionsDropdown(false); } }}
                      disabled={hasClosedSelected}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      Assign to Team
                    </button>
                    <button 
                      className={`w-full px-4 py-2 text-sm text-left flex items-center gap-3 ${hasClosedSelected ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => { if (!hasClosedSelected) { setShowChangeStatusDrawer(true); setShowActionsDropdown(false); } }}
                      disabled={hasClosedSelected}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                      </svg>
                      Change Status
                    </button>
                    <button 
                      className={`w-full px-4 py-2 text-sm text-left flex items-center gap-3 ${hasClosedSelected ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => { if (!hasClosedSelected) { setShowChangePriorityDrawer(true); setShowActionsDropdown(false); } }}
                      disabled={hasClosedSelected}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                      </svg>
                      Change Priority
                    </button>
                    <button 
                      className={`w-full px-4 py-2 text-sm text-left flex items-center gap-3 ${hasClosedSelected ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => { if (!hasClosedSelected) { setShowChangeTypeDrawer(true); setShowActionsDropdown(false); } }}
                      disabled={hasClosedSelected}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      </svg>
                      Change Type
                    </button>
                    <button 
                      onClick={() => {
                        markSelectedAsDraft()
                        setShowActionsDropdown(false)
                      }}
                      disabled={isMarkingDraft}
                      className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      {isMarkingDraft ? 'Marking...' : 'Mark as Draft'}
                    </button>
                    {localCurrentView === 'drafts' && (
                      <button 
                        onClick={() => {
                          removeSelectedFromDraft()
                          setShowActionsDropdown(false)
                        }}
                        disabled={isRemovingFromDraft}
                        className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {isRemovingFromDraft ? 'Removing...' : 'Remove from Draft'}
                      </button>
                    )}
                    <button 
                      className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      onClick={() => setShowActionsDropdown(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Export Selected
                    </button>
                    <button 
                      className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      onClick={() => setShowActionsDropdown(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 6.456V6.75" />
                      </svg>
                      Print Tickets
                    </button>
                    
                    {/* Single Ticket Actions - only when 1 ticket selected */}
                    {selectedTickets.length === 1 && (
                      <>
                        <div className="border-t border-gray-100 my-1"></div>
                        <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Single Ticket</div>
                        <button 
                          className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                          onClick={handleDuplicateTicket}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                          </svg>
                          Duplicate Ticket
                        </button>
                        <button 
                          className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                          onClick={() => setShowActionsDropdown(false)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          View Ticket
                        </button>
                      </>
                    )}
                    
                    {/* Merge - requires 2+ tickets */}
                    {selectedTickets.length >= 2 && (
                      <>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button 
                          className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                          onClick={() => { setShowMergeDrawer(true); setShowActionsDropdown(false); }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                          </svg>
                          Merge Tickets ({selectedTickets.length})
                        </button>
                      </>
                    )}
                    
                    <div className="border-t border-gray-100 my-1"></div>
                    <button 
                      className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-3"
                      onClick={() => { setShowDeleteConfirmDrawer(true); setShowActionsDropdown(false); }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Delete Selected
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="flex flex-wrap gap-4 items-end">
                {/* Ticket Number Search */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Ticket Number</label>
                  <input
                    type="text"
                    value={filters.ticketNumber}
                    onChange={(e) => setFilters({ ...filters, ticketNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. INCF7ACE4"
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#4a154b]/20 focus:border-[#4a154b]"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#4a154b]/20 focus:border-[#4a154b]"
                  >
                    <option value="">All Statuses</option>
                    <option value="new">New</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#4a154b]/20 focus:border-[#4a154b]"
                  >
                    <option value="">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Type Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#4a154b]/20 focus:border-[#4a154b]"
                  >
                    <option value="">All Types</option>
                    <option value="question">Question</option>
                    <option value="incident">Incident</option>
                    <option value="problem">Problem</option>
                    <option value="task">Task</option>
                  </select>
                </div>

                {/* Assignee Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Assignee</label>
                  <select
                    value={filters.assignee}
                    onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#4a154b]/20 focus:border-[#4a154b]"
                  >
                    <option value="">All Assignees</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="me">Assigned to Me</option>
                    <option value="my-team">My Team</option>
                  </select>
                </div>

                {/* Date From Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">From Date</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#4a154b]/20 focus:border-[#4a154b]"
                  />
                </div>

                {/* Date To Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">To Date</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#4a154b]/20 focus:border-[#4a154b]"
                  />
                </div>

                {/* Filter Actions */}
                <div className="flex items-center gap-2 ml-auto">
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={applyFilters}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium ${THEME.button.primary}`}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={viewMode === 'detailed' ? 'flex flex-col flex-1 min-h-0' : 'p-6'}>
            <div className={`bg-white overflow-hidden ${viewMode === 'detailed' ? 'border-t border-gray-200 flex flex-col flex-1 min-h-0' : 'border border-gray-200 rounded-lg'}`}>
              {/* Bulk actions toolbar */}
              {selectedTickets.length > 0 && viewMode !== 'detailed' && (
                <div className="px-4 py-3 bg-[#4a154b]/5 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">{selectedTickets.length}</span> ticket{selectedTickets.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedTickets([])}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Selection
                  </button>
                </div>
              )}
              {viewMode !== 'detailed' && (
                <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-200">{isTicketsLoading ? 'Loading...' : `${localTickets.length} ticket${localTickets.length === 1 ? '' : 's'}`}</div>
              )}
              {isTicketsLoading ? (
                <Skeleton/>
              ) : viewMode === 'detailed' ? (
                  // Detailed View (Split Panel - Master Detail)
                  <div className="flex flex-1 min-h-0">
                    {/* Ticket List Panel */}
                    <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
                      {/* Header with select all and count */}
                      <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={localTickets.length > 0 && selectedTickets.length === localTickets.length}
                            onChange={toggleAllTickets}
                            className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                          />
                          <span className="text-sm text-gray-600">
                            {selectedTickets.length > 0 
                              ? `${selectedTickets.length} selected` 
                              : `${localTickets.length} ticket${localTickets.length === 1 ? '' : 's'}`}
                          </span>
                        </div>
                        {selectedTickets.length > 0 && (
                          <button
                            onClick={() => setSelectedTickets([])}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
                        {localTickets.length === 0 ? (
                          <div className="p-8 text-center">
                            <p className="text-gray-500">No tickets found</p>
                          </div>
                        ) : (
                          <>
                          {localTickets.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => setSelectedDetailTicket(t)}
                              className={`px-4 py-4 border-b border-gray-100 cursor-pointer transition-colors border-l-4 ${
                                selectedDetailTicket?.uuid === t.uuid
                                  ? 'bg-[#4a154b]/5 border-l-[#4a154b]'
                                  : (t.sla_info?.resolution?.breached && !t.sla_info?.is_on_hold)
                                    ? 'hover:bg-gray-50 border-l-red-500'
                                    : (t.sla_info?.overall_status === 'at_risk' && !t.sla_info?.is_on_hold)
                                      ? 'hover:bg-gray-50 border-l-amber-500'
                                      : 'hover:bg-gray-50 border-l-transparent'
                              } ${selectedTickets.includes(t.uuid) ? 'bg-[#4a154b]/5' : ''}`}
                            >
                              <div className="flex gap-3">
                                {/* Checkbox */}
                                <div className="flex-shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    type="checkbox" 
                                    checked={selectedTickets.includes(t.uuid)}
                                    onChange={() => toggleTicketSelection(t.uuid)}
                                    className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                                  />
                                </div>
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${
                                    t.computed_status === 'new' ? 'bg-green-500' :
                                    t.computed_status === 'open' ? 'bg-blue-500' :
                                    t.computed_status === 'in_progress' ? 'bg-yellow-500' :
                                    t.computed_status === 'pending' ? 'bg-orange-500' :
                                    t.computed_status === 'resolved' ? 'bg-green-600' :
                                    'bg-gray-500'
                                  }`}>
                                    {t.requester ? t.requester.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'G'}
                                  </div>
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  {/* Title Row with Date */}
                                  <div className="flex items-start justify-between gap-2">
                                    <TicketTitlePopover ticket={t} className="flex-1">
                                      <p className="text-sm font-medium text-gray-900 line-clamp-1 cursor-pointer">{t.subject || t.title || 'No title'}</p>
                                    </TicketTitlePopover>
                                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                                      {t.requested ? t.requested.split(',')[0] : (t.created_at ? new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '')}
                                    </span>
                                  </div>
                                  {/* Ticket Number */}
                                  <p className="text-xs text-gray-500 mt-0.5 mb-2">{t.ticket_number}</p>
                                  {/* Tags */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      t.assignee ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                      {t.assignee ? 'assigned' : 'unassigned'}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      t.priority === 'Urgent' || t.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                      t.priority === 'High' || t.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                      t.priority === 'Normal' || t.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {t.priority?.toLowerCase() || 'normal'}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                      {t.channel ? (
                                        <>
                                          <span 
                                            className="w-3.5 h-3.5 flex items-center justify-center rounded mr-1"
                                            style={{ backgroundColor: t.channel.icon_bg || '#e5e7eb', color: t.channel.icon_color || '#6b7280' }}
                                          >
                                            <ChannelIcon channel={t.channel} className="text-[8px]" />
                                          </span>
                                          {t.channel.name}
                                        </>
                                      ) : (
                                        <>🌐 {t.source || 'Web'}</>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {/* Loading spinner for infinite scroll */}
                          {isLoadingMore && (
                            <div className="py-4 flex justify-center">
                              <svg className="animate-spin h-5 w-5 text-[#4a154b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          )}
                          {!hasMore && localTickets.length > 0 && (
                            <div className="py-3 text-center text-xs text-gray-400">
                              No more tickets
                            </div>
                          )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Ticket Detail Panel */}
                    {selectedDetailTicket ? (
                      <TicketDetailPanel 
                        ticketUuid={selectedDetailTicket.uuid} 
                        onTicketUpdate={() => router.reload({ preserveScroll: true })}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
                        <div className="text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-16 h-16 mx-auto text-gray-300 mb-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                          </svg>
                          <p className="text-sm">Select a ticket to view details</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : viewMode === 'list' ? (
                  <>
                  {/* List View (Table with Expandable Rows) */}
                  <div className="divide-y divide-gray-100">
                    {/* Header */}
                    <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-3 bg-gray-50/80 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="col-span-1 flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={localTickets.length > 0 && selectedTickets.length === localTickets.length}
                          onChange={toggleAllTickets}
                          className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                        />
                      </div>
                      <div className="col-span-3">Ticket</div>
                      <div className="col-span-2">Requester</div>
                      <div className="col-span-2">Assignee</div>
                      <div className="col-span-1">Source</div>
                      <div className="col-span-1">Priority</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-1"></div>
                    </div>
                    
                    {localTickets.length === 0 ? (
                      <div className="p-12 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-16 h-16 mx-auto text-gray-300 mb-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                        <p className="text-gray-500 mb-2">No tickets found</p>
                        <Link href="/tickets/new/" className="text-[#4a154b] hover:underline font-medium">Create your first ticket</Link>
                      </div>
                    ) : (
                      localTickets.map((t) => (
                        <div key={t.id} className="group">
                          {/* Main Row */}
                          <div 
                            className={`grid grid-cols-12 gap-4 px-4 py-4 items-center cursor-pointer transition-all ${
                              selectedTickets.includes(t.id) ? 'bg-[#4a154b]/5' : 'hover:bg-gray-50/80'
                            } ${
                              (t.sla_info?.resolution?.breached && !t.sla_info?.is_on_hold)
                                ? 'border-l-4 border-l-red-500' 
                                : (t.sla_info?.overall_status === 'at_risk' && !t.sla_info?.is_on_hold)
                                  ? 'border-l-4 border-l-amber-500'
                                  : 'border-l-4 border-l-transparent'
                            }`}
                            onClick={() => toggleRowExpand(t.id)}
                          >
                            {/* Checkbox */}
                            <div className="col-span-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={selectedTickets.includes(t.uuid)}
                                onChange={() => toggleTicketSelection(t.uuid)}
                                className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                              />
                            </div>
                            
                            {/* Ticket Info */}
                            <div className="col-span-3 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Link href={`/tickets/${t.uuid}/`} className="text-sm font-semibold text-[#4a154b] hover:underline" onClick={(e) => e.stopPropagation()}>
                                  {t.ticket_number}
                                </Link>
                                <SLABadge slaInfo={t.sla_info} />
                              </div>
                              <TicketTitlePopover ticket={t}>
                                <p className="text-sm text-gray-900 truncate font-medium cursor-pointer">{t.subject}</p>
                              </TicketTitlePopover>
                              <p className="text-xs text-gray-500 mt-0.5">{t.requested}</p>
                            </div>
                            
                            {/* Requester */}
                            <div className="col-span-2 hidden lg:block">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4a154b] to-[#7c3085] flex items-center justify-center text-white text-xs font-medium">
                                  {t.requester?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <span className="text-sm text-gray-700 truncate">{t.requester}</span>
                              </div>
                            </div>
                            
                            {/* Assignee */}
                            <div className="col-span-2 hidden lg:block">
                              {t.assignee ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-medium">
                                    {t.assignee?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  <span className="text-sm text-gray-700 truncate">{t.assignee}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400 italic">Unassigned</span>
                              )}
                            </div>
                            
                            {/* Source/Channel */}
                            <div className="col-span-1 hidden lg:block">
                              <div className="flex items-center gap-1.5">
                                {t.channel ? (
                                  <>
                                    <span 
                                      className="w-5 h-5 flex items-center justify-center rounded text-xs"
                                      style={{ backgroundColor: t.channel.icon_bg || '#f3f4f6', color: t.channel.icon_color || '#6b7280' }}
                                    >
                                      <ChannelIcon channel={t.channel} />
                                    </span>
                                    <span className="text-sm text-gray-600">{t.channel.name}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-5 h-5 flex items-center justify-center rounded bg-blue-100 text-blue-600 text-xs">🌐</span>
                                    <span className="text-sm text-gray-600">{t.source || 'Web'}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Priority */}
                            <div className="col-span-1 hidden lg:block">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                t.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                                t.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                t.priority === 'Normal' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {t.priority === 'Urgent' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
                                {t.priority}
                              </span>
                            </div>
                            
                            {/* Status */}
                            <div className="col-span-1 hidden lg:block">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(t.computed_status)}`}>
                                {getStatusDisplay(t.computed_status)}
                              </span>
                            </div>
                            
                            {/* Expand Arrow */}
                            <div className="col-span-1 text-right">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" 
                                className={`w-5 h-5 text-gray-400 transition-transform duration-200 inline-block ${expandedRows.has(t.id) ? 'rotate-180' : ''}`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                            </div>
                          </div>
                          
                          {/* Expanded Details */}
                          {expandedRows.has(t.id) && (
                            <div className="bg-gray-50/50 px-4 py-4 border-t border-gray-100">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Description Preview */}
                                <div className="lg:col-span-2">
                                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Description</h4>
                                  {t.description ? (
                                    <div 
                                      className="text-sm text-gray-700 line-clamp-3 prose prose-sm max-w-none"
                                      dangerouslySetInnerHTML={{ __html: t.description }}
                                    />
                                  ) : (
                                    <p className="text-sm text-gray-700">No description provided</p>
                                  )}
                                </div>
                                
                                {/* Quick Info */}
                                <div>
                                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Details</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-500">Type</span>
                                      <span className="text-gray-900 font-medium">{t.type}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-500">Group</span>
                                      <span className="text-gray-900">{t.group || '—'}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* SLA Info */}
                                <div>
                                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">SLA Information</h4>
                                  {t.sla_info ? (
                                    <div className="space-y-2">
                                      {t.sla_info.policy_name && (
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-gray-500">Policy</span>
                                          <span className="text-gray-900 font-medium">{t.sla_info.policy_name}</span>
                                        </div>
                                      )}
                                      {t.sla_info.resolution?.due_at && (
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-gray-500">Due Date</span>
                                          <span className="text-gray-900">
                                            {new Date(t.sla_info.resolution.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                      )}
                                      {t.sla_info.resolution?.status === 'breached' ? (
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-gray-500">Overdue</span>
                                          <span className="text-red-600 font-semibold">
                                            {t.sla_info.resolution.hours_overdue < 24 
                                              ? `${Math.round(t.sla_info.resolution.hours_overdue)}h` 
                                              : `${Math.round(t.sla_info.resolution.hours_overdue / 24)}d ${Math.round(t.sla_info.resolution.hours_overdue % 24)}h`}
                                          </span>
                                        </div>
                                      ) : t.sla_info.resolution?.hours_remaining !== null && (
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-gray-500">Time Left</span>
                                          <span className={`font-medium ${t.sla_info.resolution.status === 'at_risk' ? 'text-amber-600' : 'text-green-600'}`}>
                                            {t.sla_info.resolution.hours_remaining < 24 
                                              ? `${Math.round(t.sla_info.resolution.hours_remaining)}h` 
                                              : `${Math.floor(t.sla_info.resolution.hours_remaining / 24)}d ${Math.round(t.sla_info.resolution.hours_remaining % 24)}h`}
                                          </span>
                                        </div>
                                      )}
                                      {t.sla_info.is_on_hold && (
                                        <div className="flex items-center gap-1 text-sm text-blue-600">
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                                          </svg>
                                          <span>On Hold</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic">No SLA applied</p>
                                  )}
                                </div>
                                {/* <div>
                                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Quick Actions</h4>
                                  <div className="flex flex-wrap gap-2">
                                    <Link 
                                      href={`/tickets/${t.uuid}/`}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#4a154b] rounded-lg hover:bg-[#3a1039] transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      View
                                    </Link>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); toggleTicketSelection(t.uuid); }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                      {selectedTickets.includes(t.uuid) ? 'Deselect' : 'Select'}
                                    </button>
                                  </div>
                                </div> */}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Table Pagination for List View */}
                  {pagination && pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => router.get(`/tickets/?${buildUrlParams(pagination.current_page - 1)}`)}
                          disabled={!pagination.has_previous}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => router.get(`/tickets/?${buildUrlParams(pagination.current_page + 1)}`)}
                          disabled={!pagination.has_next}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{((pagination.current_page - 1) * 10) + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(pagination.current_page * 10, pagination.total_count)}</span> of{' '}
                            <span className="font-medium">{pagination.total_count}</span> tickets
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                              onClick={() => router.get(`/tickets/?${buildUrlParams(pagination.current_page - 1)}`)}
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
                                    onClick={() => router.get(`/tickets/?${buildUrlParams(pageNum)}`)}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                      pageNum === pagination.current_page
                                        ? 'z-10 bg-[#4a154b] border-[#4a154b] text-white'
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
                              onClick={() => router.get(`/tickets/?${buildUrlParams(pagination.current_page + 1)}`)}
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
                </>
                ) : (
                  // Card View (Modern Grid)
                  <div className="p-6 bg-gray-50/30">
                    {localTickets.length === 0 ? (
                      <div className="p-12 text-center bg-white rounded-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-16 h-16 mx-auto text-gray-300 mb-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                        <p className="text-gray-500 mb-2">No tickets found</p>
                        <Link href="/tickets/new/" className="text-[#4a154b] hover:underline font-medium">Create your first ticket</Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {localTickets.map((t) => (
                          <div
                            key={t.id}
                            className={`group bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 ${
                              selectedTickets.includes(t.id) ? 'ring-2 ring-[#4a154b] ring-offset-2' : ''
                            } ${
                              (t.sla_info?.resolution?.breached && !t.sla_info?.is_on_hold)
                                ? 'bg-gradient-to-br from-red-50 to-white' 
                                : (t.sla_info?.overall_status === 'at_risk' && !t.sla_info?.is_on_hold)
                                  ? 'bg-gradient-to-br from-amber-50 to-white'
                                  : ''
                            }`}
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox" 
                                  checked={selectedTickets.includes(t.uuid)}
                                  onChange={() => toggleTicketSelection(t.uuid)}
                                  className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                                />
                                <div>
                                  <Link href={`/tickets/${t.uuid}/`} className="text-sm font-bold text-[#4a154b] hover:underline">{t.ticket_number}</Link>
                                  <p className="text-xs text-gray-500">{t.requested}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <SLABadge slaInfo={t.sla_info} />
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(t.computed_status)}`}>
                                  {getStatusDisplay(t.computed_status)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Title */}
                            <TicketTitlePopover ticket={t} className="block mb-4">
                              <Link href={`/tickets/${t.uuid}/`}>
                                <h3 className="text-base font-semibold text-gray-900 group-hover:text-[#4a154b] transition-colors line-clamp-2 cursor-pointer">
                                  {t.subject}
                                </h3>
                              </Link>
                            </TicketTitlePopover>
                            
                            {/* Meta Info */}
                            <div className="flex items-center gap-4 mb-4">
                              {/* Requester */}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4a154b] to-[#7c3085] flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                                  {t.requester?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500">Requester</p>
                                  <p className="text-sm text-gray-900 truncate">{t.requester}</p>
                                </div>
                              </div>
                              
                              {/* Assignee */}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {t.assignee ? (
                                  <>
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                                      {t.assignee?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs text-gray-500">Assignee</p>
                                      <p className="text-sm text-gray-900 truncate">{t.assignee}</p>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs text-gray-500">Assignee</p>
                                      <p className="text-sm text-gray-400 italic">Unassigned</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Footer Tags */}
                            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                              <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                                {t.type}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                                t.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                                t.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                t.priority === 'Normal' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {t.priority === 'Urgent' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
                                {t.priority}
                              </span>
                              <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs text-gray-500 ml-auto">
                                {t.channel ? (
                                  <>
                                    <span 
                                      className="w-4 h-4 flex items-center justify-center rounded mr-1"
                                      style={{ backgroundColor: t.channel.icon_bg || '#f3f4f6', color: t.channel.icon_color || '#6b7280' }}
                                    >
                                      <ChannelIcon channel={t.channel} className="text-[10px]" />
                                    </span>
                                    {t.channel.name}
                                  </>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5 mr-1">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                                    </svg>
                                    {t.source || 'Web'}
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Loading spinner for infinite scroll */}
                    {isLoadingMore && (
                      <div className="py-6 flex justify-center">
                        <svg className="animate-spin h-6 w-6 text-[#4a154b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                    {!hasMore && localTickets.length > 0 && !isLoadingMore && (
                      <div className="py-4 text-center text-sm text-gray-400">
                        No more tickets to load
                      </div>
                    )}
                  </div>
                )
              }
            </div>
          </div>
        </main>
        </div>

        {/* Floating Action Button - hidden in detailed view */}
        {viewMode !== 'detailed' && (
          <Link href="/tickets/new/" className={THEME.fab} title="Add Ticket">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </Link>
        )}

        {/* Bulk Action Drawers */}
        <AssignAgentDrawer 
          isOpen={showAssignAgentDrawer} 
          onClose={() => setShowAssignAgentDrawer(false)} 
          selectedTickets={selectedTickets} 
          onSuccess={handleBulkActionSuccess} 
        />
        <AssignTeamDrawer 
          isOpen={showAssignTeamDrawer} 
          onClose={() => setShowAssignTeamDrawer(false)} 
          selectedTickets={selectedTickets} 
          onSuccess={handleBulkActionSuccess} 
        />
        <ChangeStatusDrawer 
          isOpen={showChangeStatusDrawer} 
          onClose={() => setShowChangeStatusDrawer(false)} 
          selectedTickets={selectedTickets} 
          onSuccess={handleBulkActionSuccess} 
        />
        <ChangePriorityDrawer 
          isOpen={showChangePriorityDrawer} 
          onClose={() => setShowChangePriorityDrawer(false)} 
          selectedTickets={selectedTickets} 
          onSuccess={handleBulkActionSuccess} 
        />
        <ChangeTypeDrawer 
          isOpen={showChangeTypeDrawer} 
          onClose={() => setShowChangeTypeDrawer(false)} 
          selectedTickets={selectedTickets} 
          onSuccess={handleBulkActionSuccess} 
        />
        <DeleteConfirmDrawer 
          isOpen={showDeleteConfirmDrawer} 
          onClose={() => setShowDeleteConfirmDrawer(false)} 
          selectedTickets={selectedTickets} 
          onSuccess={handleBulkActionSuccess} 
        />
        <MergeTicketsDrawer 
          isOpen={showMergeDrawer} 
          onClose={() => setShowMergeDrawer(false)} 
          selectedTickets={selectedTickets} 
          tickets={tickets} 
          onSuccess={handleBulkActionSuccess} 
        />
      </AppShell>
    </>
  )
}