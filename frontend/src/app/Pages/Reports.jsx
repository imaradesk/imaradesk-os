import React, { useMemo, useState } from 'react'
import { Head, router } from '@inertiajs/react'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  ListTodo,
  ShieldCheck,
  Ticket,
  TrendingUp,
  UserX,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import DatePicker from '../components/pickers/DatePicker'
import DataTable from '../../components/DataTable'
import { COLORS } from '../constants/theme'
import { useInstalledModules } from '../context/InstalledModulesContext'
import SimpleSelect from '../components/SimpleSelect'

const EmptyChart = () => (
  <div className="py-10 text-center text-xs text-gray-400">No data available</div>
)

const Card = ({ className = '', children }) => (
  <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>{children}</div>
)

const CardHeader = ({ title, description, right }) => (
  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-xs text-gray-500 mt-0.5 truncate">{description}</p>}
    </div>
    {right}
  </div>
)

const BarChart = ({ data, labelKey, valueKey, color = COLORS.primary, maxHeight = 220 }) => {
  if (!data || data.length === 0) return <EmptyChart />

  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1)

  return (
    <div className="flex items-end gap-1.5" style={{ height: maxHeight }}>
      {data.map((item, idx) => {
        const value = Number(item[valueKey]) || 0
        const height = (value / max) * 100
        return (
          <div key={idx} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-medium text-gray-500 tabular-nums">{value}</span>
            <div
              className="w-full rounded-t-sm transition-opacity hover:opacity-80"
              style={{
                height: `${height}%`,
                backgroundColor: color,
                minHeight: value > 0 ? '3px' : '0',
              }}
              title={`${item[labelKey]}: ${value}`}
            />
            <span className="text-[10px] text-gray-400 truncate w-full text-center" title={item[labelKey]}>
              {String(item[labelKey] ?? '').slice(0, 8)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const HorizontalBarChart = ({ data, labelKey, valueKey, color = COLORS.primary }) => {
  if (!data || data.length === 0) return <EmptyChart />

  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1)

  return (
    <div className="space-y-2.5">
      {data.map((item, idx) => {
        const value = Number(item[valueKey]) || 0
        const width = (value / max) * 100
        return (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-24 truncate" title={item[labelKey]}>
              {item[labelKey] || 'Unknown'}
            </span>
            <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
              <div
                className="h-full rounded flex items-center justify-end pr-1.5 transition-all"
                style={{ width: `${Math.max(width, 5)}%`, backgroundColor: color }}
              >
                <span className="text-[10px] font-medium text-white tabular-nums">{value}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const DonutChart = ({ data, labelKey, valueKey, colors }) => {
  if (!data || data.length === 0) return <EmptyChart />

  const total = data.reduce((sum, d) => sum + (Number(d[valueKey]) || 0), 0)
  if (total === 0) return <EmptyChart />

  const defaultColors = ['#0B3D26', '#2E6B49', '#4F8A68', '#7FB394', '#A8D0B8', '#C9E3D3']
  const chartColors = colors || defaultColors

  let cumulativePercent = 0
  const segments = data.map((item, idx) => {
    const percent = (Number(item[valueKey]) || 0) / total * 100
    const startPercent = cumulativePercent
    cumulativePercent += percent
    return { ...item, percent, startPercent, color: chartColors[idx % chartColors.length] }
  })

  const gradientStops = segments
    .map((seg) => `${seg.color} ${seg.startPercent}% ${seg.startPercent + seg.percent}%`)
    .join(', ')

  return (
    <div className="flex items-center gap-5">
      <div
        className="w-32 h-32 rounded-full relative flex-shrink-0"
        style={{ background: `conic-gradient(${gradientStops})` }}
      >
        <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-gray-900 tabular-nums">{total}</span>
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Total</span>
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600 flex-1 truncate">{seg[labelKey]}</span>
            <span className="font-medium text-gray-800 tabular-nums">{seg[valueKey]}</span>
            <span className="text-gray-400 tabular-nums w-10 text-right">{seg.percent.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const TONES = {
  default: 'bg-gray-50 text-gray-400',
  brand: 'bg-[#0B3D26]/10 text-[#0B3D26]',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-blue-50 text-blue-600',
}

const KPI = ({ title, value, subtitle, trend, trendValue, icon: Icon, tone = 'default' }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-gray-500 truncate">{title}</span>
      {Icon && (
        <span className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${TONES[tone] || TONES.default}`}>
          <Icon className="w-4 h-4" />
        </span>
      )}
    </div>
    <div className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums">{value}</div>
    {(subtitle || trend) && (
      <div className="mt-1 flex items-center gap-2 text-xs min-w-0">
        {trend && (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium flex-shrink-0 ${
            trend === 'up' ? 'bg-green-50 text-green-700' : trend === 'down' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {trendValue}
          </span>
        )}
        {subtitle && <span className="text-gray-500 truncate">{subtitle}</span>}
      </div>
    )}
  </div>
)

const REPORT_SECTIONS = [
  {
    id: 'tickets',
    label: 'Tickets',
    moduleKey: 'tickets',
    icon: Ticket,
    reports: [
      { id: 'overview', label: 'Overview' },
      { id: 'unassigned', label: 'Unassigned' },
      { id: 'on_hold', label: 'On Hold' },
      { id: 'aging', label: 'Aging Tickets' },
      { id: 'priority', label: 'Priority' },
      { id: 'sla', label: 'SLA Performance' },
      { id: 'volume', label: 'Volume Trends' },
      { id: 'agents', label: 'Agent Performance' },
      { id: 'groups', label: 'Group Performance' },
    ],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    moduleKey: 'tasks',
    icon: ListTodo,
    reports: [
      { id: 'overview', label: 'Overview' },
      { id: 'status', label: 'By Status' },
      { id: 'assignees', label: 'By Assignee' },
    ],
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
  tasks = {},
}) {
  const { isModuleInstalled } = useInstalledModules()

  const availableSections = useMemo(
    () => REPORT_SECTIONS.filter((section) => section.moduleKey === 'tickets' || isModuleInstalled(section.moduleKey)),
    [isModuleInstalled]
  )

  const [activeSection, setActiveSection] = useState(report_type)
  const [activeReport, setActiveReport] = useState('overview')
  const [expandedSections, setExpandedSections] = useState([report_type])
  const [selectedRange, setSelectedRange] = useState(date_range)
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1024)
  const [showFilters, setShowFilters] = useState(false)

  const [customStartDate, setCustomStartDate] = useState(
    filters.start_date ? filters.start_date.split('T')[0] : ''
  )
  const [customEndDate, setCustomEndDate] = useState(
    filters.end_date ? filters.end_date.split('T')[0] : ''
  )

  const [selectedGroup, setSelectedGroup] = useState(filters.group || '')
  const [selectedAgent, setSelectedAgent] = useState(filters.agent || '')
  const [selectedStatus, setSelectedStatus] = useState(filters.status || '')
  const [selectedPriority, setSelectedPriority] = useState(filters.priority || '')

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
    router.visit(`/reports/?${buildFilterQuery(overrides)}`, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  const handleExport = () => {
    window.location.href = `/reports/export/?${buildFilterQuery()}`
  }

  const handleSectionChange = (sectionId) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    )
    if (activeSection !== sectionId) {
      setActiveSection(sectionId)
      setActiveReport('overview')
      setSelectedGroup('')
      setSelectedAgent('')
      setSelectedStatus('')
      setSelectedPriority('')
      router.visit(`/reports/?type=${sectionId}&range=${selectedRange}`, {
        preserveState: true,
        preserveScroll: true,
      })
    }
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
  const currentSection = availableSections.find((s) => s.id === activeSection)
  const activeReportLabel = currentSection?.reports.find((r) => r.id === activeReport)?.label || 'Overview'

  const formatStatus = (status) => {
    const labels = {
      new: 'New',
      open: 'Open',
      in_progress: 'In Progress',
      pending: 'Pending',
      resolved: 'Resolved',
      closed: 'Closed',
      todo: 'To Do',
      review: 'In Review',
      done: 'Done',
      cancelled: 'Cancelled',
      deployed: 'Deployed',
      in_use: 'In Use',
      in_stock: 'In Stock',
      retired: 'Retired',
      maintenance: 'Maintenance',
    }
    return labels[status] || status
  }

  const formatPriority = (priority) => {
    const labels = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent', normal: 'Normal' }
    return labels[priority] || priority
  }

  const priorityTones = {
    urgent: 'bg-violet-100 text-violet-700',
    high: 'bg-red-100 text-red-700',
    normal: 'bg-blue-100 text-blue-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-green-100 text-green-700',
  }

  const statusTones = {
    new: 'bg-green-100 text-green-700',
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-700',
    todo: 'bg-gray-100 text-gray-700',
    review: 'bg-violet-100 text-violet-700',
    done: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const Chip = ({ children, tone = 'bg-gray-100 text-gray-700' }) => (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${tone}`}>{children}</span>
  )

  return (
    <>
      <Head title="Reports" />
      <AppShell active="chart" fixedHeight>
        <div className="flex flex-1 min-h-0">
          <aside
            className={`hidden lg:flex flex-col flex-shrink-0 border-r border-gray-200 bg-gray-50/50 h-full overflow-hidden transition-all duration-200 ${
              sidebarOpen ? 'w-60' : 'w-12'
            }`}
          >
            <div className={`h-12 border-b border-gray-200 flex items-center flex-shrink-0 ${sidebarOpen ? 'px-4 justify-between' : 'justify-center'}`}>
              {sidebarOpen ? (
                <>
                  <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <BarChart3 className="w-4 h-4 text-gray-500" /> Reports
                  </h2>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    title="Collapse reports navigation"
                    aria-label="Collapse reports navigation"
                    className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSidebarOpen(true)}
                  title="Expand reports navigation"
                  aria-label="Expand reports navigation"
                  className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${sidebarOpen ? 'p-2' : 'py-2 px-1.5'} space-y-0.5`}>
              {availableSections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                const isExpanded = expandedSections.includes(section.id)
                return (
                  <div key={section.id}>
                    <button
                      onClick={() => handleSectionChange(section.id)}
                      title={section.label}
                      aria-expanded={isExpanded}
                      className={`w-full flex items-center gap-2 h-8 rounded-md text-sm transition-colors ${
                        sidebarOpen ? 'px-2.5' : 'justify-center'
                      } ${
                        isActive
                          ? 'bg-[#0B3D26]/10 text-[#0B3D26] font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? '' : 'text-gray-400'}`} />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left truncate">{section.label}</span>
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </>
                      )}
                    </button>

                    {sidebarOpen && isExpanded && (
                      <div className="ml-4 mt-0.5 pl-2 border-l border-gray-200 space-y-px">
                        {section.reports.map((report) => {
                          const selected = isActive && activeReport === report.id
                          return (
                            <button
                              key={report.id}
                              onClick={() => {
                                if (activeSection !== section.id) {
                                  setActiveSection(section.id)
                                  router.visit(`/reports/?type=${section.id}&range=${selectedRange}`, {
                                    preserveState: true,
                                    preserveScroll: true,
                                  })
                                }
                                setActiveReport(report.id)
                              }}
                              className={`w-full text-left h-7 px-2 rounded-md text-[13px] transition-colors ${
                                selected
                                  ? 'bg-[#0B3D26]/5 text-[#0B3D26] font-medium'
                                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                              }`}
                            >
                              {report.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
          </aside>

          <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-gray-200 flex-shrink-0">
              <div className="min-h-12 px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2">
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  <h1 className="text-sm font-semibold text-gray-900 truncate">{currentSection?.label}</h1>
                  <span className="hidden sm:inline text-xs text-gray-400 truncate">{activeReportLabel}</span>
                </div>

                <button
                  onClick={() => setShowFilters((v) => !v)}
                  aria-expanded={showFilters}
                  className={`h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border text-sm transition-colors flex-shrink-0 ${
                    showFilters || hasActiveFilters
                      ? 'border-[#0B3D26]/30 bg-[#0B3D26]/5 text-[#0B3D26]'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filter</span>
                  {hasActiveFilters && (
                    <span className="min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[#0B3D26] text-white text-[10px] font-semibold flex items-center justify-center">
                      {[selectedGroup, selectedAgent, selectedStatus, selectedPriority].filter(Boolean).length}
                    </span>
                  )}
                </button>

                <SimpleSelect
                  compact
                  className="w-36 flex-shrink-0"
                  value={selectedRange}
                  onChange={handleRangeChange}
                  ariaLabel="Date range"
                  options={DATE_RANGES.map((range) => ({ id: range.value, name: range.label }))}
                />

                <button
                  onClick={handleExport}
                  className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 flex-shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>

              <div className="lg:hidden px-4 pb-2 flex items-center gap-2">
                <SimpleSelect
                  compact
                  className="flex-1 min-w-0"
                  value={activeSection}
                  onChange={(value) => handleSectionChange(value)}
                  ariaLabel="Report section"
                  options={availableSections.map((section) => ({ id: section.id, name: section.label }))}
                />
                <SimpleSelect
                  compact
                  className="flex-1 min-w-0"
                  value={activeReport}
                  onChange={setActiveReport}
                  ariaLabel="Report"
                  options={(currentSection?.reports || []).map((report) => ({ id: report.id, name: report.label }))}
                />
              </div>

              {showFilters && (
                <div className="px-4 sm:px-6 pb-3 flex flex-wrap items-end gap-2 animate-fadeIn">
                  {selectedRange === 'custom' && (
                    <>
                      <label className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                        From
                        <DatePicker
                          value={customStartDate}
                          max={customEndDate || undefined}
                          onChange={setCustomStartDate}
                          size="sm"
                          allowClear
                          placeholder="Start date"
                          aria-label="Start date"
                          className="w-36"
                        />
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                        To
                        <DatePicker
                          value={customEndDate}
                          min={customStartDate || undefined}
                          onChange={setCustomEndDate}
                          size="sm"
                          allowClear
                          placeholder="End date"
                          aria-label="End date"
                          className="w-36"
                        />
                      </label>
                    </>
                  )}

                  {activeSection === 'tickets' && (
                    <>
                      <SimpleSelect
                        compact
                        value={selectedGroup}
                        onChange={setSelectedGroup}
                        emptyLabel="All Groups"
                        ariaLabel="Group"
                        options={filter_options.groups || []}
                      />
                      <SimpleSelect
                        compact
                        value={selectedAgent}
                        onChange={setSelectedAgent}
                        emptyLabel="All Agents"
                        ariaLabel="Agent"
                        options={filter_options.agents || []}
                      />
                      <SimpleSelect
                        compact
                        value={selectedStatus}
                        onChange={setSelectedStatus}
                        emptyLabel="All Statuses"
                        ariaLabel="Status"
                        options={filter_options.statuses || []}
                      />
                      <SimpleSelect
                        compact
                        value={selectedPriority}
                        onChange={setSelectedPriority}
                        emptyLabel="All Priorities"
                        ariaLabel="Priority"
                        options={filter_options.priorities || []}
                      />
                    </>
                  )}

                  {activeSection === 'tasks' && (
                    <>
                      <SimpleSelect
                        compact
                        value={selectedAgent}
                        onChange={setSelectedAgent}
                        emptyLabel="All Assignees"
                        ariaLabel="Assignee"
                        options={filter_options.agents || []}
                      />
                      <SimpleSelect
                        compact
                        value={selectedPriority}
                        onChange={setSelectedPriority}
                        emptyLabel="All Priorities"
                        ariaLabel="Priority"
                        options={filter_options.priorities || []}
                      />
                    </>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                    {selectedRange === 'custom' && customStartDate && customEndDate && (
                      <button
                        onClick={handleApplyCustomDateRange}
                        className="h-8 px-2.5 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                      >
                        Apply dates
                      </button>
                    )}
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="h-8 px-2.5 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                      >
                        Clear all
                      </button>
                    )}
                    <button
                      onClick={() => applyFilters()}
                      className="h-8 px-3 text-sm font-medium rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {!showFilters && hasActiveFilters && (
                <div className="px-4 sm:px-6 pb-2.5 flex flex-wrap items-center gap-1.5">
                  {[
                    ['Group', selectedGroup, filter_options.groups],
                    ['Agent', selectedAgent, filter_options.agents],
                    ['Status', selectedStatus, filter_options.statuses],
                    ['Priority', selectedPriority, filter_options.priorities],
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value, options]) => (
                      <span key={label} className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-gray-100 text-xs text-gray-700">
                        <span className="text-gray-500">{label}:</span>
                        {(options || []).find((o) => String(o.id) === String(value))?.name || value}
                      </span>
                    ))}
                  <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-900 px-1">Clear</button>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {activeSection === 'tickets' && tickets && (
                <>
                  {activeReport === 'overview' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <KPI
                          title="Total Tickets"
                          value={tickets.total || 0}
                          subtitle={`${tickets.period_total || 0} in selected period`}
                          icon={Ticket}
                          tone="brand"
                        />
                        <KPI
                          title="Unassigned"
                          value={tickets.unassigned_count || 0}
                          subtitle="Needs assignment"
                          icon={UserX}
                          tone="amber"
                        />
                        <KPI
                          title="Open Tickets"
                          value={tickets.open_count || 0}
                          subtitle="Requires attention"
                          icon={Clock}
                          tone="blue"
                        />
                        <KPI
                          title="On Hold"
                          value={tickets.on_hold_count || 0}
                          subtitle="Pending customer response"
                          icon={Clock}
                          tone="amber"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <KPI
                          title="SLA Compliance"
                          value={`${tickets.sla?.compliance_rate || 0}%`}
                          subtitle={`${tickets.sla?.on_track || 0} on track`}
                          trend={tickets.sla?.compliance_rate >= 90 ? 'up' : 'down'}
                          trendValue={tickets.sla?.compliance_rate >= 90 ? 'Good' : 'Needs attention'}
                          icon={ShieldCheck}
                          tone="green"
                        />
                        <KPI
                          title="On Track"
                          value={tickets.sla?.on_track || 0}
                          subtitle="Meeting SLA targets"
                          icon={CheckCircle2}
                          tone="green"
                        />
                        <KPI
                          title="Response Breached"
                          value={tickets.sla?.response_breached || 0}
                          subtitle="First response SLA missed"
                          icon={Clock}
                          tone="amber"
                        />
                        <KPI
                          title="Resolution Breached"
                          value={tickets.sla?.resolution_breached || 0}
                          subtitle="Resolution SLA missed"
                          icon={AlertTriangle}
                          tone="red"
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader title="Status Distribution" />
                          <div className="p-4">
                            <DonutChart
                              data={tickets.status_breakdown?.map((s) => ({
                                status: formatStatus(s.status),
                                count: s.count,
                              })) || []}
                              labelKey="status"
                              valueKey="count"
                            />
                          </div>
                        </Card>
                        <Card>
                          <CardHeader title="Priority Distribution" />
                          <div className="p-4">
                            <DonutChart
                              data={tickets.priority_breakdown?.map((p) => ({
                                priority: formatPriority(p.priority),
                                count: p.count,
                              })) || []}
                              labelKey="priority"
                              valueKey="count"
                              colors={['#dc2626', '#f97316', '#eab308', '#22c55e']}
                            />
                          </div>
                        </Card>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader title="Tickets by Source" />
                          <div className="p-4">
                            <HorizontalBarChart
                              data={tickets.source_breakdown?.map((s) => ({
                                source: s.source || 'Unknown',
                                count: s.count,
                              })) || []}
                              labelKey="source"
                              valueKey="count"
                            />
                          </div>
                        </Card>
                        <Card>
                          <CardHeader title="Tickets by Type" />
                          <div className="p-4">
                            <HorizontalBarChart
                              data={tickets.type_breakdown?.map((t) => ({
                                type: t.type || 'Unknown',
                                count: t.count,
                              })) || []}
                              labelKey="type"
                              valueKey="count"
                              color="#2E6B49"
                            />
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}

                  {activeReport === 'unassigned' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KPI
                          title="Unassigned Tickets"
                          value={tickets.unassigned_count || 0}
                          subtitle="Needs agent assignment"
                          icon={UserX}
                          tone="amber"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">Unassigned Tickets</h3>
                          <span className="text-xs text-gray-400">{tickets.unassigned_tickets?.length || 0} tickets</span>
                        </div>
                        <DataTable
                          dense
                          columns={[
                            { header: 'Ticket #', key: 'ticket_number' },
                            {
                              header: 'Subject',
                              key: 'title',
                              render: (row) => (
                                <span className="truncate max-w-xs block" title={row.title}>{row.title}</span>
                              ),
                            },
                            {
                              header: 'Requester',
                              key: 'requester',
                              render: (row) =>
                                `${row.requester__first_name || ''} ${row.requester__last_name || ''}`.trim() ||
                                row.requester__email ||
                                'Unknown',
                            },
                            {
                              header: 'Status',
                              key: 'status',
                              render: (row) => (
                                <Chip tone={statusTones[row.status] || 'bg-gray-100 text-gray-700'}>
                                  {formatStatus(row.status)}
                                </Chip>
                              ),
                            },
                            {
                              header: 'Priority',
                              key: 'priority',
                              render: (row) => (
                                <Chip tone={priorityTones[row.priority] || 'bg-gray-100 text-gray-700'}>
                                  {formatPriority(row.priority)}
                                </Chip>
                              ),
                            },
                            {
                              header: 'Created',
                              key: 'created_at',
                              render: (row) =>
                                new Date(row.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }),
                            },
                          ]}
                          data={tickets.unassigned_tickets || []}
                        />
                      </div>
                    </div>
                  )}

                  {activeReport === 'on_hold' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KPI
                          title="On Hold"
                          value={tickets.on_hold_count || 0}
                          subtitle="Pending customer response"
                          icon={Clock}
                          tone="amber"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">Tickets On Hold</h3>
                          <span className="text-xs text-gray-400">{tickets.on_hold_tickets?.length || 0} tickets</span>
                        </div>
                        <DataTable
                          dense
                          columns={[
                            { header: 'Ticket #', key: 'ticket_number' },
                            {
                              header: 'Subject',
                              key: 'title',
                              render: (row) => (
                                <span className="truncate max-w-xs block" title={row.title}>{row.title}</span>
                              ),
                            },
                            {
                              header: 'Requester',
                              key: 'requester',
                              render: (row) =>
                                `${row.requester__first_name || ''} ${row.requester__last_name || ''}`.trim() ||
                                row.requester__email ||
                                'Unknown',
                            },
                            {
                              header: 'Assignee',
                              key: 'assignee',
                              render: (row) =>
                                `${row.assignee__first_name || ''} ${row.assignee__last_name || ''}`.trim() ||
                                'Unassigned',
                            },
                            {
                              header: 'Priority',
                              key: 'priority',
                              render: (row) => (
                                <Chip tone={priorityTones[row.priority] || 'bg-gray-100 text-gray-700'}>
                                  {formatPriority(row.priority)}
                                </Chip>
                              ),
                            },
                            {
                              header: 'Created',
                              key: 'created_at',
                              render: (row) =>
                                new Date(row.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }),
                            },
                          ]}
                          data={tickets.on_hold_tickets || []}
                        />
                      </div>
                    </div>
                  )}

                  {activeReport === 'aging' && (
                    <div className="space-y-5">
                      <Card>
                        <CardHeader title="Ticket Aging Analysis" description="Open tickets by how long they've been waiting" />
                        <div className="p-4">
                          <BarChart
                            data={Object.entries(tickets.aging || {}).map(([label, value]) => ({
                              label,
                              count: value,
                            }))}
                            labelKey="label"
                            valueKey="count"
                          />
                        </div>
                      </Card>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {Object.entries(tickets.aging || {}).map(([label, value]) => (
                          <div key={label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                            <div className="text-xl font-semibold text-[#0B3D26] tabular-nums">{value}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeReport === 'priority' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['low', 'normal', 'high', 'urgent'].map((priority) => {
                          const colors = {
                            urgent: '#7c3aed',
                            normal: '#eab308',
                            high: '#dc2626',
                            medium: '#eab308',
                            low: '#22c55e',
                          }
                          const count = (tickets.priority_breakdown || []).find((p) => p.priority === priority)?.count || 0
                          return (
                            <div key={priority} className="bg-white border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[priority] }} />
                                <span className="text-xs font-medium text-gray-500">{formatPriority(priority)}</span>
                              </div>
                              <div className="mt-1.5 text-2xl font-semibold text-gray-900 tabular-nums">{count}</div>
                            </div>
                          )
                        })}
                      </div>

                      {['low', 'normal', 'high', 'urgent'].map((priority) => {
                        const priorityTickets = tickets.priority_tickets?.[priority] || []
                        const priorityCount = (tickets.priority_breakdown || []).find((p) => p.priority === priority)?.count || 0
                        const colors = {
                          urgent: '#7c3aed',
                          normal: '#eab308',
                          high: '#dc2626',
                          medium: '#eab308',
                          low: '#22c55e',
                        }

                        return (
                          <div key={priority} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[priority] }} />
                              <h3 className="text-sm font-semibold text-gray-900">{formatPriority(priority)}</h3>
                              <span className="text-xs text-gray-400">{priorityCount} tickets</span>
                            </div>
                            {priorityTickets.length > 0 ? (
                              <DataTable
                                dense
                                columns={[
                                  { header: 'Ticket #', key: 'ticket_number' },
                                  {
                                    header: 'Subject',
                                    key: 'title',
                                    render: (row) => (
                                      <span className="truncate max-w-xs block" title={row.title}>{row.title}</span>
                                    ),
                                  },
                                  {
                                    header: 'Assignee',
                                    key: 'assignee',
                                    render: (row) =>
                                      row.assignee__first_name
                                        ? `${row.assignee__first_name} ${row.assignee__last_name || ''}`.trim()
                                        : 'Unassigned',
                                  },
                                  {
                                    header: 'Status',
                                    key: 'status',
                                    render: (row) => (
                                      <Chip tone={statusTones[row.status] || 'bg-gray-100 text-gray-700'}>
                                        {formatStatus(row.status)}
                                      </Chip>
                                    ),
                                  },
                                  { header: 'Group', key: 'group__name', render: (row) => row.group__name || '—' },
                                ]}
                                data={priorityTickets}
                                defaultPageSize={10}
                              />
                            ) : (
                              <div className="bg-white border border-gray-200 rounded-lg py-6 text-center text-xs text-gray-400">
                                No tickets
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {activeReport === 'sla' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <KPI
                          title="Total with SLA"
                          value={tickets.sla?.total_with_sla || 0}
                          subtitle="Tickets tracked by SLA"
                          icon={ShieldCheck}
                          tone="brand"
                        />
                        <KPI
                          title="On Track"
                          value={tickets.sla?.on_track || 0}
                          subtitle="Meeting SLA targets"
                          trend="up"
                          trendValue="Good"
                          icon={CheckCircle2}
                          tone="green"
                        />
                        <KPI
                          title="Response Breached"
                          value={tickets.sla?.response_breached || 0}
                          subtitle="First response SLA missed"
                          trend="down"
                          trendValue="Needs work"
                          icon={Clock}
                          tone="amber"
                        />
                        <KPI
                          title="Resolution Breached"
                          value={tickets.sla?.resolution_breached || 0}
                          subtitle="Resolution SLA missed"
                          trend="down"
                          trendValue="Urgent"
                          icon={AlertTriangle}
                          tone="red"
                        />
                      </div>

                      <Card>
                        <CardHeader title="SLA Compliance Overview" />
                        <div className="p-4">
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
                      </Card>
                    </div>
                  )}

                  {activeReport === 'volume' && (
                    <Card>
                      <CardHeader title="Daily Ticket Volume" description="Tickets created per day in selected period" />
                      <div className="p-4">
                        <BarChart
                          data={tickets.daily_volume?.map((d) => ({
                            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            count: d.count,
                          })) || []}
                          labelKey="date"
                          valueKey="count"
                        />
                      </div>
                    </Card>
                  )}

                  {activeReport === 'agents' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Agent Performance</h3>
                        <span className="text-xs text-gray-400">{tickets.assignee_stats?.length || 0} agents</span>
                      </div>
                      <DataTable
                        dense
                        columns={[
                          { header: 'Agent', key: 'name' },
                          { header: 'Total Tickets', key: 'total' },
                          { header: 'Resolved', key: 'resolved' },
                          { header: 'Open', key: 'open' },
                          {
                            header: 'Resolution Rate',
                            key: 'resolution_rate',
                            render: (row) => {
                              const rate = row.total > 0 ? Math.round((row.resolved / row.total) * 100) : 0
                              return (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[100px] overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${rate}%`,
                                        backgroundColor: rate >= 70 ? '#22c55e' : rate >= 50 ? '#eab308' : '#dc2626',
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs tabular-nums">{rate}%</span>
                                </div>
                              )
                            },
                          },
                        ]}
                        data={tickets.assignee_stats || []}
                      />
                    </div>
                  )}

                  {activeReport === 'groups' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Group Performance</h3>
                        <span className="text-xs text-gray-400">{tickets.group_stats?.length || 0} groups</span>
                      </div>
                      <DataTable
                        dense
                        columns={[
                          { header: 'Group', key: 'group__name', render: (row) => row.group__name || 'Unassigned' },
                          { header: 'Total Tickets', key: 'total' },
                          { header: 'Open', key: 'open' },
                        ]}
                        data={tickets.group_stats || []}
                      />
                    </div>
                  )}
                </>
              )}

              {activeSection === 'tasks' && tasks && (
                <>
                  {activeReport === 'overview' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KPI
                          title="Total Tasks"
                          value={tasks.total || 0}
                          subtitle={`${tasks.period_total || 0} in selected period`}
                          icon={ListTodo}
                          tone="brand"
                        />
                        <KPI
                          title="Overdue Tasks"
                          value={tasks.overdue || 0}
                          subtitle="Past due date"
                          trend={tasks.overdue > 0 ? 'down' : 'up'}
                          trendValue={tasks.overdue > 0 ? 'Action needed' : 'All on track'}
                          icon={AlertTriangle}
                          tone="red"
                        />
                        <KPI
                          title="Created in Period"
                          value={tasks.period_total || 0}
                          subtitle="New tasks this range"
                          icon={TrendingUp}
                          tone="blue"
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader title="Tasks by Status" />
                          <div className="p-4">
                            <DonutChart
                              data={tasks.status_breakdown?.map((s) => ({
                                status: formatStatus(s.status),
                                count: s.count,
                              })) || []}
                              labelKey="status"
                              valueKey="count"
                            />
                          </div>
                        </Card>
                        <Card>
                          <CardHeader title="Tasks by Priority" />
                          <div className="p-4">
                            <DonutChart
                              data={tasks.priority_breakdown?.map((p) => ({
                                priority: formatPriority(p.priority),
                                count: p.count,
                              })) || []}
                              labelKey="priority"
                              valueKey="count"
                              colors={['#dc2626', '#f97316', '#eab308', '#22c55e']}
                            />
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}

                  {activeReport === 'status' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader title="Tasks by Status" />
                        <div className="p-4">
                          <HorizontalBarChart
                            data={tasks.status_breakdown?.map((s) => ({
                              status: formatStatus(s.status),
                              count: s.count,
                            })) || []}
                            labelKey="status"
                            valueKey="count"
                          />
                        </div>
                      </Card>
                      <Card>
                        <CardHeader title="Status Distribution" />
                        <div className="p-4">
                          <DonutChart
                            data={tasks.status_breakdown?.map((s) => ({
                              status: formatStatus(s.status),
                              count: s.count,
                            })) || []}
                            labelKey="status"
                            valueKey="count"
                          />
                        </div>
                      </Card>
                    </div>
                  )}

                  {activeReport === 'assignees' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Tasks by Assignee</h3>
                        <span className="text-xs text-gray-400">{tasks.assignee_stats?.length || 0} assignees</span>
                      </div>
                      <DataTable
                        dense
                        columns={[
                          { header: 'Assignee', key: 'name' },
                          { header: 'Total', key: 'total' },
                          { header: 'Completed', key: 'completed' },
                          { header: 'In Progress', key: 'in_progress' },
                        ]}
                        data={tasks.assignee_stats || []}
                      />
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
