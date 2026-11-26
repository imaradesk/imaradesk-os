import React, { useState, useEffect, useRef, useCallback } from 'react'
import DatePicker from '../components/pickers/DatePicker'
import { Head, Link, router, usePage } from '@inertiajs/react'
import toast from 'react-hot-toast'
import {
  ChevronLeft, ChevronRight, FileText, Plus, Search, SlidersHorizontal, X, List, LayoutGrid, Columns2, Inbox, Settings2, MessageSquare,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { TicketDetailPanel } from '../components/ticket'
import TicketPreviewPopover from '../components/ticket/TicketPreviewPopover'
import api from '../../utils/axios'
import TicketBulkBar from '../components/tickets/TicketBulkBar'
import {
  TicketStatusIcon, TicketStatusBadge, ChannelLabel, SlaBadge, slaAccent, priorityId,
} from '../components/ticket/ui'
import FieldPopover from '../components/detail/FieldPopover'
import { PriorityIcon, priorityOptionIcon, MiniAvatar, EmptyState, Pager, Spinner } from '../components/tasks/ui'
import { CONTROL } from '../components/tasks/constants'
import SimpleSelect from '../components/SimpleSelect'
import MobileTickets from '../components/tickets/MobileTickets'
import { viewIcon, ViewType } from '../components/viewIcons'
import useMediaQuery, { DESKTOP_QUERY } from '../../utils/useMediaQuery'

const EMPTY_FILTERS = {
  ticketNumber: '',
  status: '',
  priority: '',
  type: '',
  assignee: '',
  dateFrom: '',
  dateTo: '',
}

const FILTER_OPTIONS = {
  status: [['new', 'New'], ['open', 'Open'], ['in_progress', 'In Progress'], ['pending', 'On Hold'], ['resolved', 'Resolved'], ['closed', 'Closed']],
  priority: [['urgent', 'Urgent'], ['high', 'High'], ['normal', 'Normal'], ['low', 'Low']],
  type: [['question', 'Question'], ['incident', 'Incident'], ['problem', 'Problem'], ['task', 'Task']],
  assignee: [['unassigned', 'Unassigned'], ['me', 'Assigned to me'], ['my-team', 'My team']],
}

const PRIORITY_FILTER_OPTIONS = FILTER_OPTIONS.priority.map(([id, name]) => ({ id, name }))

const FILTER_LABELS = {
  ticketNumber: 'Number', status: 'Status', priority: 'Priority', type: 'Type', assignee: 'Assignee', dateFrom: 'From', dateTo: 'To',
}

const VIEW_MODES = [
  ['list', List, 'List'],
  ['card', LayoutGrid, 'Cards'],
  ['detailed', Columns2, 'Split'],
]

const readStorage = (key, fallback) => {
  try { return localStorage.getItem(key) || fallback } catch { return fallback }
}
const writeStorage = (key, value) => {
  try { localStorage.setItem(key, value) } catch { /* storage unavailable */ }
}

const filtersFromUrl = (url) => {
  const params = new URLSearchParams(url.split('?')[1] || '')
  return Object.fromEntries(Object.keys(EMPTY_FILTERS).map((k) => [k, params.get(k) || '']))
}

const filterValueLabel = (key, value) => {
  const option = FILTER_OPTIONS[key]?.find(([id]) => id === value)
  return option ? option[1] : value
}

// The list API sends "Oct 20, 14:05"; show the date part only
const shortDate = (requested) => (requested || '').split(',')[0]

function ViewTooltip({ children, label, disabled = false }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)
  if (disabled) return children
  return (
    <div
      ref={ref}
      onMouseEnter={() => {
        if (ref.current) {
          const r = ref.current.getBoundingClientRect()
          setPos({ top: r.top + r.height / 2, left: r.right + 8 })
        }
        setShow(true)
      }}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="fixed px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md whitespace-nowrap shadow-lg z-[100] pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: 'translateY(-50%)' }}
        >
          {label}
        </div>
      )}
    </div>
  )
}

export default function Tickets({ sidebar = {}, tickets = [], currentView = null, pagination = null, draftsCount = 0 }) {
  const { url } = usePage()
  const views = sidebar.views || []
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  // Use currentView if provided, otherwise the default view (is_default) or the first one
  const defaultView = views.find((v) => v.is_default) || views[0]
  const initialCurrentView = currentView || (defaultView ? defaultView.id : null)

  const [viewsOpen, setViewsOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1024)
  const [viewMode, setViewMode] = useState(() => readStorage('ticketsViewMode', 'list'))
  const [isTicketsLoading, setIsTicketsLoading] = useState(false)
  const [localTickets, setLocalTickets] = useState(tickets)
  const [localCurrentView, setLocalCurrentView] = useState(initialCurrentView)
  const [selectedTickets, setSelectedTickets] = useState([])
  const [selectedDetailTicket, setSelectedDetailTicket] = useState(null) // For split view

  const appliedFilters = filtersFromUrl(url)
  const [filters, setFilters] = useState(appliedFilters)
  const activeFilterKeys = Object.keys(appliedFilters).filter((k) => appliedFilters[k] !== '')
  const [showFilters, setShowFilters] = useState(activeFilterKeys.some((k) => k !== 'ticketNumber'))

  // Pagination state for infinite scroll (card/split views)
  const [currentPage, setCurrentPage] = useState(pagination?.current_page || 1)
  const [hasMore, setHasMore] = useState(pagination?.has_next || false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    setLocalTickets(tickets)
    const defaultV = views.find((v) => v.is_default) || views[0]
    setLocalCurrentView(currentView || (defaultV ? defaultV.id : null))
    setCurrentPage(pagination?.current_page || 1)
    setHasMore(pagination?.has_next || false)
    setFilters(filtersFromUrl(url))
  }, [tickets, currentView, views, pagination])

  // Keep the split view pointed at a ticket that's in the list
  useEffect(() => {
    if (viewMode !== 'detailed') return
    if (localTickets.length === 0) {
      if (selectedDetailTicket) setSelectedDetailTicket(null)
    } else if (!selectedDetailTicket || !localTickets.some((t) => t.uuid === selectedDetailTicket.uuid)) {
      setSelectedDetailTicket(localTickets[0])
    }
  }, [viewMode, localTickets, selectedDetailTicket])

  useEffect(() => { writeStorage('ticketsViewMode', viewMode) }, [viewMode])

  const buildUrlParams = (page = null, nextFilters = filters) => {
    const params = new URLSearchParams()
    if (localCurrentView) params.set('view', localCurrentView)
    if (page) params.set('page', page)
    Object.entries(nextFilters).forEach(([k, v]) => v && params.set(k, v))
    return params.toString()
  }

  const loadView = (viewId) => {
    setIsTicketsLoading(true)
    setLocalCurrentView(viewId)
    setSelectedTickets([])
    setSelectedDetailTicket(null)
    router.visit(`/tickets/?view=${viewId}`, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setIsTicketsLoading(false),
    })
  }

  // Load the next page for infinite scroll (card/split views)
  const loadMoreTickets = async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    const nextPage = currentPage + 1
    try {
      const response = await api.get(`/tickets/api/list/?${buildUrlParams(nextPage, appliedFilters)}`)
      setLocalTickets((prev) => {
        const seen = new Set(prev.map((t) => t.uuid))
        return [...prev, ...response.data.tickets.filter((t) => !seen.has(t.uuid))]
      })
      setCurrentPage(nextPage)
      setHasMore(response.data.pagination?.has_next || false)
    } catch {
      toast.error('Could not load more tickets')
      setHasMore(false)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollTop + clientHeight >= scrollHeight * 0.8) loadMoreTickets()
  }, [currentPage, hasMore, isLoadingMore, localCurrentView, url])

  const toggleTicketSelection = (ticketId) => {
    setSelectedTickets((prev) => (prev.includes(ticketId) ? prev.filter((id) => id !== ticketId) : [...prev, ticketId]))
  }

  const allSelected = localTickets.length > 0 && selectedTickets.length === localTickets.length
  const toggleAllTickets = () => setSelectedTickets(allSelected ? [] : localTickets.map((t) => t.uuid))

  const applyFilters = (nextFilters = filters) => router.get(`/tickets/?${buildUrlParams(null, nextFilters)}`)
  const removeFilter = (key) => applyFilters({ ...appliedFilters, [key]: '' })
  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    router.get(`/tickets/?view=${localCurrentView}`)
  }

  const activeView = views.find((v) => v.id === localCurrentView)
  const pageTitle = localCurrentView === 'drafts' ? 'Drafts' : (activeView ? activeView.label : 'Tickets')
  const totalCount = pagination?.total_count ?? localTickets.length

  return (
    <>
      <Head title={pageTitle} />
      <AppShell active="tickets" fixedHeight={!isDesktop}>
        {!isDesktop ? (
          <MobileTickets
            views={views}
            draftsCount={draftsCount}
            currentView={localCurrentView}
            onSelectView={loadView}
            pageTitle={pageTitle}
            totalCount={totalCount}
            tickets={localTickets}
            isLoading={isTicketsLoading}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMoreTickets}
            onScroll={handleScroll}
            filters={filters}
            setFilters={setFilters}
            appliedFilters={appliedFilters}
            activeFilterKeys={activeFilterKeys}
            filterOptions={FILTER_OPTIONS}
            filterLabels={FILTER_LABELS}
            filterValueLabel={filterValueLabel}
            applyFilters={applyFilters}
            removeFilter={removeFilter}
            clearFilters={clearFilters}
          />
        ) : (
        <div className="flex h-[calc(100vh-3rem)] bg-white">
          {/* ── Views sidebar ─────────────────────── */}
          <aside className={`bg-gray-50/50 border-r border-gray-200 flex flex-col h-full overflow-hidden flex-shrink-0 transition-all duration-200 ${viewsOpen ? 'w-60' : 'w-12'}`}>
            <div className={`h-12 border-b border-gray-200 flex items-center flex-shrink-0 ${viewsOpen ? 'px-4 justify-between' : 'justify-center'}`}>
              {viewsOpen ? (
                <>
                  <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900"><Inbox className="w-4 h-4 text-gray-500" /> Views</h2>
                  <button onClick={() => setViewsOpen(false)} title="Collapse views" aria-label="Collapse views" className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button onClick={() => setViewsOpen(true)} title="Expand views" aria-label="Expand views" className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${viewsOpen ? 'p-2' : 'py-2 px-1.5'} space-y-0.5`}>
              {views.length === 0 ? (
                viewsOpen && (
                  <div className="py-10 px-3 text-center">
                    <p className="text-xs text-gray-500 mb-2">No views configured.</p>
                    <Link href="/administration/views/" className="text-xs text-[#0B3D26] font-medium hover:underline">Configure views</Link>
                  </div>
                )
              ) : (
                views.map((v) => (
                  <ViewTooltip key={v.id} label={`${v.label} · ${v.count}`} disabled={viewsOpen}>
                    <ViewButton active={localCurrentView === v.id} collapsed={!viewsOpen} icon={viewIcon(ViewType.TICKET, v.id)} label={v.label} count={v.count} onClick={() => loadView(v.id)} />
                  </ViewTooltip>
                ))
              )}
            </nav>

            <div className={`border-t border-gray-200 flex-shrink-0 ${viewsOpen ? 'p-2' : 'py-2 px-1.5'} space-y-0.5`}>
              <ViewTooltip label={`Drafts · ${draftsCount}`} disabled={viewsOpen}>
                <ViewButton
                  active={localCurrentView === 'drafts'}
                  collapsed={!viewsOpen}
                  icon={FileText}
                  label="Drafts"
                  count={draftsCount}
                  onClick={() => loadView('drafts')}
                />
              </ViewTooltip>
              <ViewTooltip label="Manage views" disabled={viewsOpen}>
                <Link
                  href="/administration/views/"
                  className={`flex items-center gap-2 h-8 rounded-md text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors ${viewsOpen ? 'px-2.5' : 'justify-center'}`}
                >
                  <Settings2 className="w-4 h-4 flex-shrink-0" />
                  {viewsOpen && 'Manage views'}
                </Link>
              </ViewTooltip>
            </div>
          </aside>

          {/* ── Main ──────────────────────────────── */}
          <main
            className={`relative flex-1 min-w-0 flex flex-col ${viewMode === 'detailed' ? 'overflow-hidden' : 'overflow-y-auto'}`}
            onScroll={viewMode === 'card' ? handleScroll : undefined}
          >
            {/* Header */}
            <div className={`${viewMode === 'detailed' ? '' : 'sticky top-0'} z-10 bg-white/70 backdrop-blur border-b border-gray-200 flex-shrink-0`}>
              <div className="h-12 px-4 sm:px-6 flex items-center gap-3">
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  <h1 className="text-sm font-semibold text-gray-900 truncate">{pageTitle}</h1>
                  <span className="text-xs text-gray-400 tabular-nums">{totalCount}</span>
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); applyFilters() }}
                  className="hidden md:flex items-center relative"
                >
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={filters.ticketNumber}
                    onChange={(e) => setFilters({ ...filters, ticketNumber: e.target.value.toUpperCase() })}
                    placeholder="Ticket number"
                    aria-label="Search by ticket number"
                    className={`${CONTROL} w-44 pl-8`}
                  />
                </form>

                <button
                  onClick={() => setShowFilters((v) => !v)}
                  aria-expanded={showFilters}
                  className={`h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border text-sm transition-colors ${
                    showFilters || activeFilterKeys.length
                      ? 'border-[#0B3D26]/30 bg-[#0B3D26]/5 text-[#0B3D26]'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">Filter</span>
                  {activeFilterKeys.length > 0 && (
                    <span className="min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[#0B3D26] text-white text-[10px] font-semibold flex items-center justify-center">
                      {activeFilterKeys.length}
                    </span>
                  )}
                </button>

                <div className="flex items-center rounded-md border border-gray-200 p-0.5" role="tablist" aria-label="Layout">
                  {VIEW_MODES.map(([id, Icon, label]) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={viewMode === id}
                      onClick={() => setViewMode(id)}
                      title={`${label} view`}
                      className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                        viewMode === id ? 'bg-[#0B3D26]/10 text-[#0B3D26]' : 'text-gray-500 hover:text-gray-900'
                      } ${id === 'detailed' ? 'hidden md:flex' : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>

                <Link
                  href="/tickets/new/"
                  className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-medium transition-colors flex-shrink-0"
                >
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New ticket</span>
                </Link>
              </div>

              {/* Filter controls */}
              {showFilters && (
                <div className="px-4 sm:px-6 pb-3 flex flex-wrap items-center gap-2 animate-fadeIn">
                  {['status', 'priority', 'type', 'assignee'].map((key) => key === 'priority' ? (
                    <FieldPopover
                      key={key}
                      label="Priority"
                      value={filters.priority}
                      options={PRIORITY_FILTER_OPTIONS}
                      optionIcon={priorityOptionIcon}
                      emptyLabel="Any priority"
                      width={240}
                      triggerClassName={`${CONTROL} min-w-[8.5rem] !px-2.5 justify-between`}
                      onPick={(priority) => setFilters({ ...filters, priority })}
                    >
                      {filters.priority && <PriorityIcon priority={filters.priority} />}
                      <span className="text-sm text-gray-900 truncate">
                        {PRIORITY_FILTER_OPTIONS.find((o) => o.id === filters.priority)?.name || 'Any priority'}
                      </span>
                    </FieldPopover>
                  ) : (
                    <SimpleSelect
                      key={key}
                      compact
                      value={filters[key]}
                      onChange={(value) => setFilters({ ...filters, [key]: value })}
                      ariaLabel={FILTER_LABELS[key]}
                      emptyLabel={`Any ${FILTER_LABELS[key].toLowerCase()}`}
                      options={FILTER_OPTIONS[key].map(([id, name]) => ({ id, name }))}
                    />
                  ))}
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                    From
                    <DatePicker value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(dateFrom) => setFilters({ ...filters, dateFrom })} size="sm" allowClear placeholder="Any date" aria-label="From date" className="w-36" />
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                    To
                    <DatePicker value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(dateTo) => setFilters({ ...filters, dateTo })} size="sm" allowClear placeholder="Any date" aria-label="To date" className="w-36" />
                  </label>
                  <input
                    type="text"
                    value={filters.ticketNumber}
                    onChange={(e) => setFilters({ ...filters, ticketNumber: e.target.value.toUpperCase() })}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                    placeholder="Ticket number"
                    className={`${CONTROL} w-36 md:hidden`}
                  />
                  <div className="flex items-center gap-1.5 ml-auto">
                    {activeFilterKeys.length > 0 && (
                      <button onClick={clearFilters} className="h-8 px-2.5 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100">Clear all</button>
                    )}
                    <button onClick={() => applyFilters()} className="h-8 px-3 text-sm font-medium rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white">Apply</button>
                  </div>
                </div>
              )}

              {/* Applied filter chips */}
              {!showFilters && activeFilterKeys.length > 0 && (
                <div className="px-4 sm:px-6 pb-2.5 flex flex-wrap items-center gap-1.5">
                  {activeFilterKeys.map((key) => (
                    <span key={key} className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-md bg-gray-100 text-xs text-gray-700">
                      <span className="text-gray-500">{FILTER_LABELS[key]}:</span> {filterValueLabel(key, appliedFilters[key])}
                      <button onClick={() => removeFilter(key)} className="p-0.5 rounded text-gray-400 hover:text-gray-700" aria-label={`Remove ${FILTER_LABELS[key]} filter`}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-900 px-1">Clear</button>
                </div>
              )}
            </div>

            {/* Content */}
            {isTicketsLoading ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <Spinner className="w-5 h-5 text-[#0B3D26]" />
              </div>
            ) : localTickets.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={activeFilterKeys.length ? 'No tickets match these filters' : 'No tickets here'}
                description={activeFilterKeys.length ? 'Try removing a filter or switching views.' : 'Tickets in this view will show up here.'}
                action={activeFilterKeys.length ? (
                  <button onClick={clearFilters} className="h-8 px-3 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Clear filters</button>
                ) : (
                  <Link href="/tickets/new/" className="h-8 px-3 inline-flex items-center gap-1.5 text-sm font-medium rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white">
                    <Plus className="w-4 h-4" /> New ticket
                  </Link>
                )}
              />
            ) : viewMode === 'detailed' ? (
              <SplitView
                tickets={localTickets}
                selected={selectedTickets}
                active={selectedDetailTicket}
                onActivate={setSelectedDetailTicket}
                onToggle={toggleTicketSelection}
                allSelected={allSelected}
                onToggleAll={toggleAllTickets}
                onScroll={handleScroll}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                onLoadMore={loadMoreTickets}
              />
            ) : viewMode === 'card' ? (
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {localTickets.map((t) => (
                    <TicketCard key={t.uuid} ticket={t} selected={selectedTickets.includes(t.uuid)} onToggle={() => toggleTicketSelection(t.uuid)} />
                  ))}
                </div>
                <LoadMoreFooter isLoadingMore={isLoadingMore} hasMore={hasMore} onLoadMore={loadMoreTickets} />
              </div>
            ) : (
              <div className={selectedTickets.length > 0 ? 'pb-20' : ''}>
                <div className="hidden md:flex items-center gap-3 px-4 sm:px-6 h-9 border-b border-gray-200 bg-gray-50/50 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAllTickets}
                    aria-label="Select all tickets"
                    className="rounded border-gray-300 text-[#0B3D26] focus:ring-[#0B3D26]/20"
                  />
                  <span className="w-4" />
                  <span className="w-24">Ticket</span>
                  <span className="flex-1">Subject</span>
                  <span className="hidden lg:block w-40">Requester</span>
                  <span className="hidden xl:block w-28">Channel</span>
                  <span className="w-6" title="Assignee" />
                  <span className="w-14 text-right">Created</span>
                </div>
                <ul>
                  {localTickets.map((t) => (
                    <TicketRow key={t.uuid} ticket={t} selected={selectedTickets.includes(t.uuid)} onToggle={() => toggleTicketSelection(t.uuid)} />
                  ))}
                </ul>
                <Pager pagination={pagination} onPage={(page) => router.get(`/tickets/?${buildUrlParams(page, appliedFilters)}`)} />
              </div>
            )}

            <TicketBulkBar
              selectedTickets={selectedTickets}
              tickets={localTickets}
              currentView={localCurrentView}
              onClear={() => setSelectedTickets([])}
            />
          </main>
        </div>
        )}

      </AppShell>
    </>
  )
}

// ─────────────────────────────────────────────
// Building blocks
// ─────────────────────────────────────────────

function ViewButton({ active, collapsed, label, count, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center gap-2 h-8 rounded-md text-sm transition-colors ${collapsed ? 'justify-center' : 'px-2.5'} ${
        active ? 'bg-[#0B3D26]/10 text-[#0B3D26] font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {collapsed ? (
        Icon ? <Icon className="w-4 h-4" /> : (
          <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold ${active ? 'bg-[#0B3D26]/10' : 'bg-gray-100 text-gray-500'}`}>
            {label.charAt(0).toUpperCase()}
          </span>
        )
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1 text-left truncate">{label}</span>
          <span className={`text-xs tabular-nums ${active ? '' : 'text-gray-400'}`}>{count}</span>
        </>
      )}
    </button>
  )
}

function Checkbox({ checked, onChange, label }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      className="rounded border-gray-300 text-[#0B3D26] focus:ring-[#0B3D26]/20"
    />
  )
}

/** Dense list row (Linear-style); the whole row opens the ticket. */
function TicketRow({ ticket: t, selected, onToggle }) {
  const assignee = t.assignee ? { name: t.assignee } : null
  return (
    <li className={`group flex items-center gap-3 pl-4 sm:pl-6 pr-4 sm:pr-6 border-b border-gray-100 border-l-2 transition-colors ${slaAccent(t.sla_info)} ${
      selected ? 'bg-[#0B3D26]/5' : 'hover:bg-gray-50'
    }`}>
      <Checkbox checked={selected} onChange={onToggle} label={`Select ${t.ticket_number}`} />
      <Link href={`/tickets/${t.uuid}/`} className="flex-1 min-w-0 flex items-center gap-3 h-12">
        <span className="w-4 flex justify-center"><PriorityIcon priority={priorityId(t.priority)} /></span>
        <span className="hidden md:block w-24 text-xs text-gray-500 tabular-nums truncate">{t.ticket_number}</span>
        <TicketStatusIcon status={t.computed_status} />
        <span className="flex-1 min-w-0 flex items-center gap-2">
          <span className="min-w-0">
            <TicketPreviewPopover ticket={t}>
              <span className="block text-sm text-gray-900 truncate group-hover:text-[#0B3D26]">{t.subject || 'No subject'}</span>
            </TicketPreviewPopover>
            <span className="md:hidden block text-xs text-gray-500 truncate">{t.ticket_number} · {t.requester}</span>
          </span>
          <SlaBadge slaInfo={t.sla_info} className="flex-shrink-0" />
        </span>
        <span className="hidden lg:flex w-40 items-center gap-2 min-w-0">
          <MiniAvatar user={{ name: t.requester }} />
          <span className="text-xs text-gray-600 truncate">{t.requester}</span>
        </span>
        <span className="hidden xl:block w-28 min-w-0"><ChannelLabel channel={t.channel} source={t.source} /></span>
        <span className="w-6 flex justify-center"><MiniAvatar user={assignee} /></span>
        <span className="w-14 text-right text-xs text-gray-400 tabular-nums whitespace-nowrap" title={t.requested}>{shortDate(t.requested)}</span>
      </Link>
    </li>
  )
}

function TicketCard({ ticket: t, selected, onToggle }) {
  const assignee = t.assignee ? { name: t.assignee } : null
  return (
    <div className={`group relative flex flex-col rounded-xl border bg-white p-4 transition-all hover:shadow-md ${
      selected ? 'border-[#0B3D26]/30 ring-1 ring-[#0B3D26]' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-center gap-2 mb-2.5">
        <Checkbox checked={selected} onChange={onToggle} label={`Select ${t.ticket_number}`} />
        <span className="text-xs text-gray-500 tabular-nums">{t.ticket_number}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <SlaBadge slaInfo={t.sla_info} />
          <TicketStatusBadge status={t.computed_status} />
        </span>
      </div>

      <Link href={`/tickets/${t.uuid}/`} className="block">
        <TicketPreviewPopover ticket={t}>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#0B3D26] transition-colors">
            {t.subject || 'No subject'}
          </h3>
        </TicketPreviewPopover>
      </Link>
      {t.description && (
        <p className="mt-1 text-xs text-gray-500 line-clamp-2">{t.description.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')}</p>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 min-w-0">
        <MiniAvatar user={{ name: t.requester }} />
        <span className="truncate">{t.requester}</span>
        <span className="text-gray-400 flex-shrink-0">· {shortDate(t.requested)}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
        <PriorityIcon priority={priorityId(t.priority)} showLabel />
        <span className="text-xs text-gray-500">{t.type}</span>
        <span className="ml-auto flex items-center gap-2 min-w-0">
          <ChannelLabel channel={t.channel} source={t.source} showName={false} />
          <MiniAvatar user={assignee} />
        </span>
      </div>
    </div>
  )
}

const SPLIT_WIDTH_KEY = 'tickets.splitListWidth'
const SPLIT_MIN = 260
const SPLIT_MAX = 640
const SPLIT_DEFAULT = 352

const clampSplit = (w) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, w))

function SplitView({ tickets, selected, active, onActivate, onToggle, allSelected, onToggleAll, onScroll, isLoadingMore, hasMore, onLoadMore }) {
  const [listWidth, setListWidth] = useState(() => {
    const saved = Number(localStorage.getItem(SPLIT_WIDTH_KEY))
    return saved ? clampSplit(saved) : SPLIT_DEFAULT
  })
  const [resizing, setResizing] = useState(false)

  const startResize = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = listWidth
    let latest = startWidth
    setResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev) => {
      latest = clampSplit(startWidth + ev.clientX - startX)
      setListWidth(latest)
    }
    const onUp = () => {
      setResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      localStorage.setItem(SPLIT_WIDTH_KEY, String(latest))
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const resetWidth = () => {
    setListWidth(SPLIT_DEFAULT)
    localStorage.setItem(SPLIT_WIDTH_KEY, String(SPLIT_DEFAULT))
  }

  return (
    <div className="flex flex-1 min-h-0">
      <div className="relative flex-shrink-0 border-r border-gray-200 flex flex-col" style={{ width: listWidth }}>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize ticket list"
          title="Drag to resize · double-click to reset"
          onPointerDown={startResize}
          onDoubleClick={resetWidth}
          className="group absolute top-0 -right-1.5 z-20 h-full w-3 cursor-col-resize"
        >
          <div className={`mx-auto h-full w-0.5 transition-colors ${resizing ? 'bg-[#0B3D26]' : 'bg-transparent group-hover:bg-[#0B3D26]/50'}`} />
        </div>
        <div className="h-9 px-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2 text-xs text-gray-500">
          <Checkbox checked={allSelected} onChange={onToggleAll} label="Select all tickets" />
          {selected.length > 0 ? `${selected.length} selected` : `${tickets.length} loaded`}
        </div>
        <div className="flex-1 overflow-y-auto" onScroll={onScroll}>
        <ul>
          {tickets.map((t) => {
            const isActive = active?.uuid === t.uuid
            return (
              <li
                key={t.uuid}
                onClick={() => onActivate(t)}
                className={`flex gap-2.5 px-4 py-3 border-b border-gray-100 border-l-2 cursor-pointer transition-colors ${
                  isActive ? 'bg-[#0B3D26]/5 border-l-[#0B3D26]' : `${slaAccent(t.sla_info)} hover:bg-gray-50`
                } ${selected.includes(t.uuid) && !isActive ? 'bg-[#0B3D26]/5' : ''}`}
              >
                <span className="pt-0.5"><Checkbox checked={selected.includes(t.uuid)} onChange={() => onToggle(t.uuid)} label={`Select ${t.ticket_number}`} /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <TicketStatusIcon status={t.computed_status} />
                    <TicketPreviewPopover ticket={t} className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isActive ? 'font-medium text-gray-900' : 'text-gray-900'}`}>{t.subject || 'No subject'}</p>
                    </TicketPreviewPopover>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap tabular-nums">{shortDate(t.requested)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 min-w-0">
                    <span className="tabular-nums flex-shrink-0">{t.ticket_number}</span>
                    <span className="truncate">· {t.requester}</span>
                    <span className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                      <SlaBadge slaInfo={t.sla_info} />
                      <PriorityIcon priority={priorityId(t.priority)} />
                      <MiniAvatar user={t.assignee ? { name: t.assignee } : null} size="w-4 h-4 text-[8px]" />
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <LoadMoreFooter isLoadingMore={isLoadingMore} hasMore={hasMore} onLoadMore={onLoadMore} />
        </div>
      </div>

      {active ? (
        <TicketDetailPanel ticketUuid={active.uuid} onTicketUpdate={() => router.reload({ preserveScroll: true })} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center bg-gray-50/50">
          <MessageSquare className="w-8 h-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">Select a ticket to see it here</p>
        </div>
      )}
    </div>
  )
}

function LoadMoreFooter({ isLoadingMore, hasMore, onLoadMore }) {
  if (isLoadingMore) {
    return <div className="py-5 flex justify-center"><Spinner className="w-5 h-5 text-[#0B3D26]" /></div>
  }
  if (!hasMore) {
    return <p className="py-4 text-center text-xs text-gray-400">You're all caught up</p>
  }
  // Fallback for when the list is too short to scroll
  return (
    <div className="py-4 flex justify-center">
      <button onClick={onLoadMore} className="h-8 px-3 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Load more</button>
    </div>
  )
}
