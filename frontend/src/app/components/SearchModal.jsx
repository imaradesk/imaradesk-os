import Modal from './Modal'
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, router } from '@inertiajs/react'
import api from '../../utils/axios'
import { useInstalledModules } from '../context/InstalledModulesContext'
import SimpleSelect from './SimpleSelect'

const ALL_SEARCH_TABS = [
  { id: 'tickets', label: 'Tickets' },
  { id: 'tasks', label: 'Tasks', module: 'tasks' },
  { id: 'knowledge_base', label: 'Knowledge Base', module: 'kb' },
  { id: 'users', label: 'Users' },
]

// Commented out for future use
// const TICKET_FILTERS = [
//   { id: 'subject', label: 'Subject' },
//   { id: 'public_message', label: 'Public Message' },
//   { id: 'private_message', label: 'Private Message' },
// ]

// const STATUS_OPTIONS = [
//   { value: '', label: 'Status' },
//   { value: 'new', label: 'New' },
//   { value: 'open', label: 'Open' },
//   { value: 'in_progress', label: 'In Progress' },
//   { value: 'pending', label: 'On Hold' },
//   { value: 'resolved', label: 'Resolved' },
//   { value: 'closed', label: 'Closed' },
// ]

// Search placeholder text based on active tab
const getSearchPlaceholder = (tab) => {
  const placeholders = {
    tickets: 'Search tickets by title, ticket number...',
    tasks: 'Search tasks by title...',
    knowledge_base: 'Search articles by title, content...',
    users: 'Search users by name, email...',
  }
  return placeholders[tab] || 'Search...'
}

// Skeleton loading component
const SearchSkeleton = () => (
  <div className="px-4 py-2 space-y-3">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex items-start gap-3 p-2 animate-pulse">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
)

// Helper to get status badge styling
const getStatusBadgeClass = (status) => {
  if (!status) return 'bg-gray-100 text-gray-600'
  const styles = {
    'new': 'text-green-600',
    'open': 'text-blue-600',
    'in_progress': 'text-yellow-600',
    'pending': 'text-orange-600',
    'resolved': 'text-green-600',
    'closed': 'text-gray-500',
  }
  return styles[status] || 'text-gray-600'
}

const getStatusLabel = (status) => {
  const labels = {
    'new': 'New',
    'open': 'Open',
    'in_progress': 'In Progress',
    'pending': 'On Hold',
    'resolved': 'Resolved',
    'closed': 'Closed',
  }
  return labels[status] || status
}

export default function SearchModal({ isOpen, onClose, brands = [], categories = [] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('tickets')
  // Commented out - will be used later
  // const [activeTicketFilter, setActiveTicketFilter] = useState('subject')
  // const [selectedBrand, setSelectedBrand] = useState('')
  // // const [selectedCategory, setSelectedCategory] = useState('')
  // const [selectedStatus, setSelectedStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState([])
  const [recentlyViewed, setRecentlyViewed] = useState([])
  
  const inputRef = useRef(null)
  
  // Get installed modules from context
  const { isModuleInstalled } = useInstalledModules()
  
  // Filter search tabs based on installed modules
  const SEARCH_TABS = useMemo(() => {
    return ALL_SEARCH_TABS.filter(tab => {
      if (!tab.module) return true // Tickets and Users always shown
      return isModuleInstalled(tab.module)
    })
  }, [isModuleInstalled])
  
  // Reset to tickets if current tab's module is not installed
  useEffect(() => {
    const isValidTab = SEARCH_TABS.some(tab => tab.id === activeTab)
    if (!isValidTab && SEARCH_TABS.length > 0) {
      setActiveTab('tickets')
    }
  }, [SEARCH_TABS, activeTab])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Load recently viewed items
  useEffect(() => {
    if (isOpen) {
      loadRecentlyViewed()
    }
  }, [isOpen])

  const loadRecentlyViewed = async () => {
    try {
      const response = await api.get('/api/search/recently-viewed/')
      setRecentlyViewed(response.data.items || [])
    } catch (error) {
      // Silently fail - recently viewed is not critical
      console.log('Could not load recently viewed items')
    }
  }

  // Debounced search
  const searchTimeoutRef = useRef(null)
  
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: activeTab,
        // Commented out - will be used later
        // ...(activeTab === 'tickets' && { field: activeTicketFilter }),
        // ...(selectedBrand && { brand: selectedBrand }),
        // ...(selectedCategory && { category: selectedCategory }),
        // ...(selectedStatus && { status: selectedStatus }),
      })
      
      const response = await api.get(`/api/search/?${params.toString()}`)
      setResults(response.data.results || [])
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, activeTab])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch()
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [performSearch])

  const getResultUrl = (result) => {
    switch (result.type) {
      case 'ticket':
        return `/tickets/${result.id}/`
      case 'task':
        return `/tasks/${result.id}/`
      case 'user':
        return `/people/${result.id}/edit/`
      case 'article':
        return `/knowledgebase/article/${result.id}/`
      default:
        return '#'
    }
  }

  const handleResultClick = (result) => {
    onClose()
    router.visit(getResultUrl(result))
  }

  // Command-palette style: anchored near the top, the input owns the header
  return (
    <Modal isOpen={isOpen} onClose={onClose} align="top" size="2xl" bodyClassName="flex flex-col min-h-0">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth="1.5" 
            stroke="currentColor" 
            className="w-5 h-5 text-gray-400 mr-3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder={getSearchPlaceholder(activeTab)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-base text-gray-800 placeholder-gray-400 focus:outline-none"
          />
          <button 
            onClick={onClose}
            className="ml-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 overflow-x-auto">
          {SEARCH_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setResults([])
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#0B3D26] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ticket-specific filters - Commented out for future use */}
        {/* {activeTab === 'tickets' && (
          <>
            <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100">
              {TICKET_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveTicketFilter(filter.id)}
                  className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                    activeTicketFilter === filter.id
                      ? 'bg-purple-100 text-[#0B3D26] border border-[#0B3D26]'
                      : 'text-gray-600 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <SimpleSelect compact className="w-36" value={selectedBrand} onChange={setSelectedBrand} options={brands} emptyLabel="Brand" ariaLabel="Brand" />

              <SimpleSelect compact className="w-36" value={selectedCategory} onChange={setSelectedCategory} options={categories} emptyLabel="Category" ariaLabel="Category" />

              <SimpleSelect compact className="w-36" value={selectedStatus} onChange={setSelectedStatus} options={STATUS_OPTIONS.map((o) => ({ id: o.value, name: o.label }))} ariaLabel="Status" />
            </div>
          </>
        )} */}

        {/* Results area */}
        <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
          {/* Recently Viewed Section */}
          {!searchQuery && recentlyViewed.length > 0 && (
            <div className="px-4 py-2">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Recently viewed
              </h3>
              <div className="border-b border-dashed border-gray-200 -mx-4" />
            </div>
          )}

          {/* Loading state - Skeleton */}
          {isLoading && <SearchSkeleton />}

          {/* Results */}
          {!isLoading && (searchQuery ? results : recentlyViewed).length > 0 && (
            <div className="px-4 py-2">
              {searchQuery && (
                <h3 className="text-xs font-medium text-[#0B3D26] uppercase tracking-wider mb-2">
                  {activeTab.replace('_', ' ')}
                </h3>
              )}
              <div className="space-y-1">
                {(searchQuery ? results : recentlyViewed).map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="group w-full flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer"
                    onClick={() => handleResultClick(item)}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      {item.type === 'ticket' && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-gray-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                        </svg>
                      )}
                      {item.type === 'task' && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-gray-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {item.type === 'user' && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-gray-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      )}
                      {item.type === 'article' && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-gray-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.title || item.subject || item.name}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        {item.type === 'ticket' && (
                          <>
                            <span>#{item.ticket_number || item.id}</span>
                            <span className="text-gray-300">|</span>
                            <span>{item.requester_type || 'Individual'}</span>
                            <span className="text-gray-300">|</span>
                            <span className={getStatusBadgeClass(item.status)}>
                              {getStatusLabel(item.status)}
                            </span>
                          </>
                        )}
                        {item.type === 'task' && (
                          <>
                            <span className={getStatusBadgeClass(item.status)}>
                              {getStatusLabel(item.status)}
                            </span>
                            {item.assignee && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span>{item.assignee}</span>
                              </>
                            )}
                          </>
                        )}
                        {item.type === 'user' && (
                          <span>{item.email}</span>
                        )}
                        {item.type === 'article' && (
                          <span>{item.views || 0} views</span>
                        )}
                      </p>
                    </div>

                    {/* Go button - visible on hover */}
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div 
                        className="w-8 h-8 rounded-full bg-[#0B3D26] flex items-center justify-center text-white hover:bg-[#082C1B] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResultClick(item)
                        }}
                        title="Go to item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {!isLoading && searchQuery && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-12 h-12 mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="text-sm">No results found for "{searchQuery}"</p>
            </div>
          )}

          {/* Initial state - no search */}
          {!isLoading && !searchQuery && recentlyViewed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-12 h-12 mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="text-sm">Start typing to search</p>
            </div>
          )}
        </div>
    </Modal>
  )
}
