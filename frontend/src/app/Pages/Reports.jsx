import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import AppShell from '../components/AppShell'
import Select from '../components/SearchableSelect'
import { THEME, COLORS } from '../constants/theme'

// Simple bar chart component
const BarChart = ({ data, labelKey, valueKey, color = COLORS.primary, maxHeight = 200 }) => {
  if (!data || data.length === 0) return <div className="text-gray-400 text-center py-8">No data available</div>
  
  const max = Math.max(...data.map(d => d[valueKey] || 0))
  
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: maxHeight }}>
      {data.map((item, idx) => {
        const height = max > 0 ? ((item[valueKey] || 0) / max) * 100 : 0
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-gray-700">{item[valueKey] || 0}</span>
            <div 
              className="w-full rounded-t transition-all hover:opacity-80"
              style={{ 
                height: `${height}%`,
                backgroundColor: color,
                minHeight: item[valueKey] > 0 ? '4px' : '0'
              }}
              title={`${item[labelKey]}: ${item[valueKey]}`}
            />
            <span className="text-xs text-gray-500 truncate max-w-full" title={item[labelKey]}>
              {item[labelKey]?.slice(0, 8)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Horizontal bar chart
const HorizontalBarChart = ({ data, labelKey, valueKey, color = COLORS.primary }) => {
  if (!data || data.length === 0) return <div className="text-gray-400 text-center py-4">No data</div>
  
  const max = Math.max(...data.map(d => d[valueKey] || 0))
  
  return (
    <div className="space-y-3">
      {data.map((item, idx) => {
        const width = max > 0 ? ((item[valueKey] || 0) / max) * 100 : 0
        return (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-24 truncate" title={item[labelKey]}>
              {item[labelKey] || 'Unknown'}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div 
                className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                style={{ width: `${Math.max(width, 5)}%`, backgroundColor: color }}
              >
                <span className="text-xs font-medium text-white">{item[valueKey]}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Donut chart component
const DonutChart = ({ data, labelKey, valueKey, colors }) => {
  if (!data || data.length === 0) return <div className="text-gray-400 text-center py-8">No data</div>
  
  const total = data.reduce((sum, d) => sum + (d[valueKey] || 0), 0)
  const defaultColors = ['#4a154b', '#6e3770', '#825084', '#9c6e9c', '#b68cb6', '#d0aad0']
  const chartColors = colors || defaultColors
  
  let cumulativePercent = 0
  const segments = data.map((item, idx) => {
    const percent = total > 0 ? (item[valueKey] / total) * 100 : 0
    const startPercent = cumulativePercent
    cumulativePercent += percent
    return {
      ...item,
      percent,
      startPercent,
      color: chartColors[idx % chartColors.length]
    }
  })
  
  // Generate conic gradient
  const gradientStops = segments.map((seg, idx) => {
    const start = seg.startPercent
    const end = seg.startPercent + seg.percent
    return `${seg.color} ${start}% ${end}%`
  }).join(', ')
  
  return (
    <div className="flex items-center gap-6">
      <div 
        className="w-40 h-40 rounded-full relative"
        style={{
          background: `conic-gradient(${gradientStops})`,
        }}
      >
        <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">{total}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: seg.color }} />
            <span className="text-sm text-gray-600 flex-1">{seg[labelKey]}</span>
            <span className="text-sm font-medium text-gray-800">{seg[valueKey]}</span>
            <span className="text-xs text-gray-400">({seg.percent.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// KPI Card component
const KPICard = ({ title, value, subtitle, trend, trendValue, icon, color = COLORS.primary }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
        {icon}
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          trend === 'up' ? 'bg-green-100 text-green-700' : 
          trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {trendValue}
        </span>
      )}
    </div>
    <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
    <div className="text-sm text-gray-500">{title}</div>
    {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
  </div>
)

// Data table component
const DataTable = ({ columns, data, emptyMessage = 'No data available' }) => {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-gray-400">{emptyMessage}</div>
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col, idx) => (
              <th key={idx} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="py-3 px-4 text-sm text-gray-700">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Report sections
const REPORT_SECTIONS = [
  {
    id: 'tickets',
    label: 'Tickets',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
    reports: [
      { id: 'overview', label: 'Overview' },
      { id: 'unassigned', label: 'Unassigned' },
      { id: 'on_hold', label: 'On Hold' },
      { id: 'aging', label: 'Aging Tickets' },
      { id: 'sla', label: 'SLA Performance' },
      { id: 'volume', label: 'Volume Trends' },
      { id: 'agents', label: 'Agent Performance' },
      { id: 'groups', label: 'Group Performance' },
    ]
  },
]

const DATE_RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'custom', label: 'Custom Range' },
]

export default function Reports({ 
  report_type = 'tickets', 
  date_range = '30',
  filters = {},
  filter_options = {},
  tickets = {},
}) {
  const [activeSection, setActiveSection] = useState(report_type)
  const [activeReport, setActiveReport] = useState('overview')
  const [selectedRange, setSelectedRange] = useState(date_range)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  
  // Custom date range
  const [customStartDate, setCustomStartDate] = useState(
    filters.start_date ? filters.start_date.split('T')[0] : ''
  )
  const [customEndDate, setCustomEndDate] = useState(
    filters.end_date ? filters.end_date.split('T')[0] : ''
  )
  
  // Filter states
  const [selectedGroup, setSelectedGroup] = useState(filters.group || '')
  const [selectedAgent, setSelectedAgent] = useState(filters.agent || '')
  const [selectedStatus, setSelectedStatus] = useState(filters.status || '')
  const [selectedPriority, setSelectedPriority] = useState(filters.priority || '')
  
  // Build filter query string
  const buildFilterQuery = (overrides = {}) => {
    const params = new URLSearchParams()
    params.set('type', overrides.type ?? activeSection)
    params.set('range', overrides.range ?? selectedRange)
    
    const group = overrides.group ?? selectedGroup
    const agent = overrides.agent ?? selectedAgent
    const status = overrides.status ?? selectedStatus
    const priority = overrides.priority ?? selectedPriority
    const startDate = overrides.start_date ?? customStartDate
    const endDate = overrides.end_date ?? customEndDate
    
    if (group) params.set('group', group)
    if (agent) params.set('agent', agent)
    if (status) params.set('status', status)
    if (priority) params.set('priority', priority)
    
    if ((overrides.range ?? selectedRange) === 'custom' && startDate && endDate) {
      params.set('start_date', startDate)
      params.set('end_date', endDate)
    }
    
    return params.toString()
  }
  
  const applyFilters = (overrides = {}) => {
    const query = buildFilterQuery(overrides)
    router.visit(`/reports/?${query}`, {
      preserveState: true,
      preserveScroll: true,
    })
  }
  
  // Export function
  const handleExport = () => {
    const query = buildFilterQuery()
    window.location.href = `/reports/export/?${query}`
  }
  
  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId)
    setActiveReport('overview')
    // Reset filters when changing section
    setSelectedGroup('')
    setSelectedAgent('')
    setSelectedStatus('')
    setSelectedPriority('')
    router.visit(`/reports/?type=${sectionId}&range=${selectedRange}`, {
      preserveState: true,
      preserveScroll: true,
    })
  }
  
  const handleRangeChange = (range) => {
    setSelectedRange(range)
    if (range !== 'custom') {
      applyFilters({ range })
    }
  }
  
  const handleApplyCustomDateRange = () => {
    if (customStartDate && customEndDate) {
      applyFilters({ range: 'custom', start_date: customStartDate, end_date: customEndDate })
    }
  }
  
  const clearFilters = () => {
    setSelectedGroup('')
    setSelectedAgent('')
    setSelectedStatus('')
    setSelectedPriority('')
    setSelectedRange('30')
    setCustomStartDate('')
    setCustomEndDate('')
    router.visit(`/reports/?type=${activeSection}&range=30`, {
      preserveState: true,
      preserveScroll: true,
    })
  }
  
  const hasActiveFilters = selectedGroup || selectedAgent || selectedStatus || selectedPriority
  
  const currentSection = REPORT_SECTIONS.find(s => s.id === activeSection)
  
  // Format status labels
  const formatStatus = (status) => {
    const labels = {
      'new': 'New',
      'open': 'Open',
      'in_progress': 'In Progress',
      'pending': 'Pending',
      'resolved': 'Resolved',
      'closed': 'Closed',
      'todo': 'To Do',
      'review': 'In Review',
      'done': 'Done',
      'cancelled': 'Cancelled',
      'deployed': 'Deployed',
      'in_use': 'In Use',
      'in_stock': 'In Stock',
      'retired': 'Retired',
      'maintenance': 'Maintenance',
    }
    return labels[status] || status
  }
  
  const formatPriority = (priority) => {
    const labels = {
      'low': 'Low',
      'normal': 'Normal',
      'high': 'High',
      'urgent': 'Urgent',
      'critical': 'Critical',
    }
    return labels[priority] || priority
  }

  return (
    <>
      <Head title="Reports" />
      <AppShell active="chart">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {/* Reports Sidebar */}
          {sidebarOpen && (
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
              <div className="px-4 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
                <p className="text-xs text-gray-500 mt-1">Analytics & Insights</p>
              </div>
              
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {REPORT_SECTIONS.map((section) => (
                  <div key={section.id}>
                    <button
                      onClick={() => handleSectionChange(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? 'text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      style={activeSection === section.id ? { backgroundColor: COLORS.primary } : {}}
                    >
                      <span className={activeSection === section.id ? 'text-white' : 'text-gray-400'}>
                        {section.icon}
                      </span>
                      {section.label}
                    </button>
                    
                    {activeSection === section.id && (
                      <div className="ml-4 mt-1 space-y-1">
                        {section.reports.map((report) => (
                          <button
                            key={report.id}
                            onClick={() => setActiveReport(report.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              activeReport === report.id
                                ? 'bg-purple-50 font-medium'
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                            style={activeReport === report.id ? { color: COLORS.primary } : {}}
                          >
                            {report.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </aside>
          )}
          
          {/* Main Content */}
          <main className="flex-1 bg-gray-50 overflow-auto">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">
                      {currentSection?.label} Reports
                    </h1>
                    <p className="text-sm text-gray-500">
                      {currentSection?.reports.find(r => r.id === activeReport)?.label || 'Overview'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Filter Toggle Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 border rounded-lg text-sm flex items-center gap-2 transition-colors ${
                      showFilters || hasActiveFilters 
                        ? 'border-purple-500 text-purple-700 bg-purple-50' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filters
                    {hasActiveFilters && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-purple-600 text-white">
                        {[selectedGroup, selectedAgent, selectedStatus, selectedPriority].filter(Boolean).length}
                      </span>
                    )}
                  </button>
                  
                  {/* Date Range Filter */}
                  <select
                    value={selectedRange}
                    onChange={(e) => handleRangeChange(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {DATE_RANGES.map((range) => (
                      <option key={range.value} value={range.value}>{range.label}</option>
                    ))}
                  </select>
                  
                  {/* Export Button */}
                  <button 
                    onClick={handleExport}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Excel
                  </button>
                </div>
              </div>
              
              {/* Filter Panel */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Custom Date Range */}
                    {selectedRange === 'custom' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Ticket-specific filters */}
                    {activeSection === 'tickets' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Group</label>
                          <Select
                            value={selectedGroup}
                            onChange={setSelectedGroup}
                            options={filter_options.groups || []}
                            placeholder="All Groups"
                            displayKey="name"
                            valueKey="id"
                            allowClear={true}
                            searchable={true}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Agent</label>
                          <Select
                            value={selectedAgent}
                            onChange={setSelectedAgent}
                            options={filter_options.agents || []}
                            placeholder="All Agents"
                            displayKey="name"
                            valueKey="id"
                            allowClear={true}
                            searchable={true}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                          <Select
                            value={selectedStatus}
                            onChange={setSelectedStatus}
                            options={filter_options.statuses || []}
                            placeholder="All Statuses"
                            displayKey="name"
                            valueKey="id"
                            allowClear={true}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                          <Select
                            value={selectedPriority}
                            onChange={setSelectedPriority}
                            options={filter_options.priorities || []}
                            placeholder="All Priorities"
                            displayKey="name"
                            valueKey="id"
                            allowClear={true}
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Task-specific filters */}
                    {activeSection === 'tasks' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Assignee</label>
                          <Select
                            value={selectedAgent}
                            onChange={setSelectedAgent}
                            options={filter_options.agents || []}
                            placeholder="All Assignees"
                            displayKey="name"
                            valueKey="id"
                            allowClear={true}
                            searchable={true}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                          <Select
                            value={selectedPriority}
                            onChange={setSelectedPriority}
                            options={filter_options.priorities || []}
                            placeholder="All Priorities"
                            displayKey="name"
                            valueKey="id"
                            allowClear={true}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Filter Actions */}
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => applyFilters()}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                      style={{ backgroundColor: COLORS.primary }}
                    >
                      Apply Filters
                    </button>
                    {selectedRange === 'custom' && customStartDate && customEndDate && (
                      <button
                        onClick={handleApplyCustomDateRange}
                        className="px-4 py-2 border border-purple-500 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        Apply Date Range
                      </button>
                    )}
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Report Content */}
            <div className="p-6">
              {/* TICKET REPORTS */}
              {activeSection === 'tickets' && tickets && (
                <>
                  {/* Overview */}
                  {activeReport === 'overview' && (
                    <div className="space-y-6">
                      {/* KPI Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard
                          title="Total Tickets"
                          value={tickets.total || 0}
                          subtitle={`${tickets.period_total || 0} in selected period`}
                          icon={<svg className="w-5 h-5" style={{ color: COLORS.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>}
                        />
                        <KPICard
                          title="Unassigned"
                          value={tickets.unassigned_count || 0}
                          subtitle="Needs assignment"
                          icon={<svg className="w-5 h-5" style={{ color: '#f59e0b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                          color="#f59e0b"
                        />
                        <KPICard
                          title="Open Tickets"
                          value={tickets.open_count || 0}
                          subtitle="Requires attention"
                          icon={<svg className="w-5 h-5" style={{ color: COLORS.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                        <KPICard
                          title="On Hold"
                          value={tickets.on_hold_count || 0}
                          subtitle="Pending customer response"
                          icon={<svg className="w-5 h-5" style={{ color: '#f59e0b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                          color="#f59e0b"
                        />
                      </div>
                      
                      {/* SLA KPI Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard
                          title="SLA Compliance"
                          value={`${tickets.sla?.compliance_rate || 0}%`}
                          subtitle={`${tickets.sla?.on_track || 0} on track`}
                          trend={tickets.sla?.compliance_rate >= 90 ? 'up' : 'down'}
                          trendValue={tickets.sla?.compliance_rate >= 90 ? 'Good' : 'Needs attention'}
                          icon={<svg className="w-5 h-5" style={{ color: COLORS.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                        <KPICard
                          title="SLA Breaches"
                          value={(tickets.sla?.response_breached || 0) + (tickets.sla?.resolution_breached || 0)}
                          subtitle={`${tickets.sla?.response_breached || 0} response, ${tickets.sla?.resolution_breached || 0} resolution`}
                          icon={<svg className="w-5 h-5" style={{ color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                          color="#dc2626"
                        />
                      </div>
                      
                      {/* Charts Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Status Distribution */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
                          <DonutChart 
                            data={tickets.status_breakdown?.map(s => ({ 
                              status: formatStatus(s.status), 
                              count: s.count 
                            })) || []}
                            labelKey="status"
                            valueKey="count"
                          />
                        </div>
                        
                        {/* Priority Distribution */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
                          <DonutChart 
                            data={tickets.priority_breakdown?.map(p => ({ 
                              priority: formatPriority(p.priority), 
                              count: p.count 
                            })) || []}
                            labelKey="priority"
                            valueKey="count"
                            colors={['#dc2626', '#f97316', '#eab308', '#22c55e']}
                          />
                        </div>
                      </div>
                      
                      {/* Source and Type */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Source</h3>
                          <HorizontalBarChart 
                            data={tickets.source_breakdown?.map(s => ({ 
                              source: s.source || 'Unknown', 
                              count: s.count 
                            })) || []}
                            labelKey="source"
                            valueKey="count"
                          />
                        </div>
                        
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Type</h3>
                          <HorizontalBarChart 
                            data={tickets.type_breakdown?.map(t => ({ 
                              type: t.type || 'Unknown', 
                              count: t.count 
                            })) || []}
                            labelKey="type"
                            valueKey="count"
                            color="#6366f1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Unassigned Tickets */}
                  {activeReport === 'unassigned' && (
                    <div className="space-y-6">
                      {/* KPI Card */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <KPICard
                          title="Unassigned Tickets"
                          value={tickets.unassigned_count || 0}
                          subtitle="Needs agent assignment"
                          icon={<svg className="w-5 h-5" style={{ color: '#f59e0b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                          color="#f59e0b"
                        />
                      </div>
                      
                      {/* Unassigned Tickets Table */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Unassigned Tickets</h3>
                        <DataTable 
                          columns={[
                            { header: 'Ticket #', key: 'ticket_number' },
                            { header: 'Subject', key: 'title', render: (row) => (
                              <span className="truncate max-w-xs block" title={row.title}>{row.title}</span>
                            )},
                            { header: 'Requester', render: (row) => (
                              `${row.requester__first_name || ''} ${row.requester__last_name || ''}`.trim() || row.requester__email || 'Unknown'
                            )},
                            { header: 'Status', key: 'status', render: (row) => (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                row.status === 'new' ? 'bg-green-100 text-green-700' :
                                row.status === 'open' ? 'bg-blue-100 text-blue-700' :
                                row.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {row.status?.charAt(0).toUpperCase() + row.status?.slice(1)}
                              </span>
                            )},
                            { header: 'Priority', key: 'priority', render: (row) => (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                row.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                row.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                row.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {formatPriority(row.priority)}
                              </span>
                            )},
                            { header: 'Created', key: 'created_at', render: (row) => (
                              new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            )},
                          ]}
                          data={tickets.unassigned_tickets || []}
                          emptyMessage="No unassigned tickets"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* On Hold Tickets */}
                  {activeReport === 'on_hold' && (
                    <div className="space-y-6">
                      {/* KPI Card */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <KPICard
                          title="On Hold"
                          value={tickets.on_hold_count || 0}
                          subtitle="Pending customer response"
                          icon={<svg className="w-5 h-5" style={{ color: '#f59e0b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                          color="#f59e0b"
                        />
                      </div>
                      
                      {/* On Hold Tickets Table */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets On Hold</h3>
                        <DataTable 
                          columns={[
                            { header: 'Ticket #', key: 'ticket_number' },
                            { header: 'Subject', key: 'title', render: (row) => (
                              <span className="truncate max-w-xs block" title={row.title}>{row.title}</span>
                            )},
                            { header: 'Requester', render: (row) => (
                              `${row.requester__first_name || ''} ${row.requester__last_name || ''}`.trim() || row.requester__email || 'Unknown'
                            )},
                            { header: 'Assignee', render: (row) => (
                              `${row.assignee__first_name || ''} ${row.assignee__last_name || ''}`.trim() || 'Unassigned'
                            )},
                            { header: 'Priority', key: 'priority', render: (row) => (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                row.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                row.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                row.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {formatPriority(row.priority)}
                              </span>
                            )},
                            { header: 'Created', key: 'created_at', render: (row) => (
                              new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            )},
                          ]}
                          data={tickets.on_hold_tickets || []}
                          emptyMessage="No tickets on hold"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Aging Tickets */}
                  {activeReport === 'aging' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Ticket Aging Analysis</h3>
                        <p className="text-sm text-gray-500 mb-6">Open tickets by how long they've been waiting</p>
                        
                        <div className="h-64">
                          <BarChart 
                            data={Object.entries(tickets.aging || {}).map(([label, value]) => ({
                              label,
                              count: value
                            }))}
                            labelKey="label"
                            valueKey="count"
                          />
                        </div>
                      </div>
                      
                      {/* Aging summary cards */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {Object.entries(tickets.aging || {}).map(([label, value]) => (
                          <div 
                            key={label}
                            className="bg-white rounded-xl border border-gray-200 p-4 text-center"
                          >
                            <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>{value}</div>
                            <div className="text-sm text-gray-500">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* SLA Performance */}
                  {activeReport === 'sla' && (
                    <div className="space-y-6">
                      {/* SLA KPIs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard
                          title="Total with SLA"
                          value={tickets.sla?.total_with_sla || 0}
                          subtitle="Tickets tracked by SLA"
                          icon={<svg className="w-5 h-5" style={{ color: COLORS.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                        />
                        <KPICard
                          title="On Track"
                          value={tickets.sla?.on_track || 0}
                          subtitle="Meeting SLA targets"
                          trend="up"
                          trendValue="Good"
                          icon={<svg className="w-5 h-5" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                          color="#22c55e"
                        />
                        <KPICard
                          title="Response Breached"
                          value={tickets.sla?.response_breached || 0}
                          subtitle="First response SLA missed"
                          trend="down"
                          trendValue="Needs work"
                          icon={<svg className="w-5 h-5" style={{ color: '#f97316' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                          color="#f97316"
                        />
                        <KPICard
                          title="Resolution Breached"
                          value={tickets.sla?.resolution_breached || 0}
                          subtitle="Resolution SLA missed"
                          trend="down"
                          trendValue="Critical"
                          icon={<svg className="w-5 h-5" style={{ color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                          color="#dc2626"
                        />
                      </div>
                      
                      {/* SLA Compliance Chart */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">SLA Compliance Overview</h3>
                        <DonutChart 
                          data={[
                            { label: 'On Track', count: tickets.sla?.on_track || 0 },
                            { label: 'Response Breached', count: tickets.sla?.response_breached || 0 },
                            { label: 'Resolution Breached', count: tickets.sla?.resolution_breached || 0 },
                          ]}
                          labelKey="label"
                          valueKey="count"
                          colors={['#22c55e', '#f97316', '#dc2626']}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Volume Trends */}
                  {activeReport === 'volume' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Daily Ticket Volume</h3>
                        <p className="text-sm text-gray-500 mb-6">Tickets created per day in selected period</p>
                        
                        <div className="h-64">
                          <BarChart 
                            data={tickets.daily_volume?.map(d => ({
                              date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                              count: d.count
                            })) || []}
                            labelKey="date"
                            valueKey="count"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Agent Performance */}
                  {activeReport === 'agents' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance</h3>
                        <DataTable 
                          columns={[
                            { header: 'Agent', key: 'name' },
                            { header: 'Total Tickets', key: 'total' },
                            { header: 'Resolved', key: 'resolved' },
                            { header: 'Open', key: 'open' },
                            { 
                              header: 'Resolution Rate', 
                              render: (row) => {
                                const rate = row.total > 0 ? Math.round((row.resolved / row.total) * 100) : 0
                                return (
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[100px]">
                                      <div 
                                        className="h-2 rounded-full"
                                        style={{ 
                                          width: `${rate}%`,
                                          backgroundColor: rate >= 70 ? '#22c55e' : rate >= 50 ? '#eab308' : '#dc2626'
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm">{rate}%</span>
                                  </div>
                                )
                              }
                            },
                          ]}
                          data={tickets.assignee_stats || []}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Group Performance */}
                  {activeReport === 'groups' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Performance</h3>
                        <DataTable 
                          columns={[
                            { header: 'Group', key: 'group__name', render: (row) => row.group__name || 'Unassigned' },
                            { header: 'Total Tickets', key: 'total' },
                            { header: 'Open', key: 'open' },
                          ]}
                          data={tickets.group_stats || []}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </AppShell>
    </>
  )
}
