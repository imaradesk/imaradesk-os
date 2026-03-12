import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import AppShell from '../components/AppShell'
import Select from '../components/SearchableSelect'
import { THEME } from '../constants/theme'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Users,
  Mail,
  Bell,
  Clock,
  Shield,
  ClipboardList,
  CheckCircle,
  Eye,
  FolderOpen,
  Lock,
  Zap,
  Settings,
  ChevronRight,
  Check,
  X,
} from 'lucide-react'

export default function Index({ message, user, dashboard = {}, timeFilter: initialTimeFilter = '7days' }) {
  const [timeFilter, setTimeFilter] = useState(initialTimeFilter)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showQuickStart, setShowQuickStart] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleTimeFilterChange = (value) => {
    setTimeFilter(value)
    setLoading(true)
    router.get('/', { timeFilter: value }, {
      preserveState: true,
      preserveScroll: true,
      only: ['dashboard', 'timeFilter'],
      onFinish: () => setLoading(false),
    })
  }

  const getChartTitle = () => {
    const titles = {
      '7days': 'Daily Performance (Last 7 Days)',
      '30days': 'Daily Performance (Last 30 Days)',
      '3months': 'Weekly Performance (Last 3 Months)',
      '6months': 'Weekly Performance (Last 6 Months)',
      '1year': 'Monthly Performance (Last Year)',
    }
    return titles[timeFilter] || 'Performance'
  }

  const onboardingSteps = [
    { id: 'team', title: 'Team Setup', description: 'Add team members & groups', icon: Users, link: '/settings/team/users', completed: false },
    { id: 'email', title: 'Email Settings', description: 'Configure email notifications', icon: Mail, link: '/settings/email/', completed: false },
    { id: 'notifications', title: 'Notifications', description: 'Customize Notifications', icon: Bell, link: '/settings/notifications', completed: false },
    { id: 'sla', title: 'SLA Policies', description: 'Configure service level agreements', icon: Clock, link: '/settings/sla/policies/', completed: false },
    { id: 'security', title: 'Security & 2FA', description: 'Configure your Security features', icon: Shield, link: '/settings/security/', completed: false },
  ]

  const completedSteps = onboardingSteps.filter(step => step.completed).length
  const totalSteps = onboardingSteps.length
  const progress = (completedSteps / totalSteps) * 100

  return (
    <>
      <Head title="Dashboard" />
      <AppShell active="home" topBarVariant="transparent">
        <div className="bg-gray-50 relative">
          {/* Quick Start FAB Button */}
          <button
            onClick={() => setShowQuickStart(true)}
            className="fixed bottom-8 right-8 z-40 group"
            title="Quick Start Guide"
          >
            <div className="relative">
              {/* Animated rings */}
              <span className="absolute inset-0 rounded-full bg-[#4a154b] animate-ping opacity-30"></span>
              <span className="absolute inset-0 rounded-full bg-[#4a154b] animate-pulse opacity-20 scale-125"></span>
              
              {/* Main button */}
              <div className="relative w-14 h-14 bg-gradient-to-br from-[#4a154b] to-[#7c3085] rounded-full shadow-lg flex items-center justify-center transform transition-all duration-300 hover:scale-110 hover:shadow-xl animate-bounce-slow">
                {/* Glitter effect */}
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="absolute top-1 right-2 w-2 h-2 bg-white rounded-full opacity-60 animate-twinkle"></div>
                  <div className="absolute bottom-3 left-2 w-1.5 h-1.5 bg-white rounded-full opacity-40 animate-twinkle-delayed"></div>
                  <div className="absolute top-4 left-3 w-1 h-1 bg-white rounded-full opacity-50 animate-twinkle"></div>
                </div>
                
                {/* Icon */}
                <Zap className="w-6 h-6 text-white" />
              </div>
              
              {/* Badge */}
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-gray-900 shadow animate-pulse">
                {totalSteps - completedSteps}
              </span>
            </div>
          </button>

          {/* Quick Start Drawer */}
          <div className={`fixed inset-0 z-50 ${showQuickStart ? 'visible' : 'invisible'}`}>
            {/* Backdrop */}
            <div 
              className={`absolute inset-0 bg-black transition-opacity duration-300 ${showQuickStart ? 'opacity-50' : 'opacity-0'}`}
              onClick={() => setShowQuickStart(false)}
            ></div>
            
            {/* Drawer Panel */}
            <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-out ${showQuickStart ? 'translate-x-0' : 'translate-x-full'}`}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#4a154b] to-[#7c3085]">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Zap className="w-6 h-6" />
                    Quick Start
                  </h2>
                  <p className="text-sm text-purple-200 mt-1">
                    {completedSteps} of {totalSteps} steps completed
                  </p>
                </div>
                <button
                  onClick={() => setShowQuickStart(false)}
                  className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Setup Progress</span>
                  <span className="font-medium text-[#4a154b]">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[#4a154b] to-[#7c3085] rounded-full h-2 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Steps */}
              <div className="overflow-y-auto h-[calc(100%-200px)] p-6">
                <div className="space-y-4">
                  {onboardingSteps.map((step, index) => (
                    <Link
                      key={step.id}
                      href={step.link}
                      className="block group"
                      onClick={() => setShowQuickStart(false)}
                    >
                      <div className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        step.completed 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200 bg-white hover:border-[#4a154b] hover:shadow-md'
                      }`}>
                        <div className="flex items-center gap-4">
                          {/* Step indicator */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold ${
                            step.completed 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-100 text-gray-600 group-hover:bg-[#4a154b] group-hover:text-white'
                          } transition-all`}>
                            {step.completed ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <step.icon className="w-6 h-6" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium ${step.completed ? 'text-green-700' : 'text-gray-900 group-hover:text-[#4a154b]'} transition-colors`}>
                              {step.title}
                            </div>
                            <div className="text-sm text-gray-500">{step.description}</div>
                          </div>

                          {/* Arrow */}
                          {!step.completed && (
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#4a154b] transition-colors" />
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200">
                <Link
                  href="/settings/"
                  className="block w-full px-4 py-3 bg-[#4a154b] text-white rounded-xl text-center font-medium hover:bg-[#5a2060] transition-colors"
                  onClick={() => setShowQuickStart(false)}
                >
                  Go to Settings
                </Link>
              </div>
            </div>
          </div>

          {/* Hero Section with Background */}
          <div className="relative">
            {/* Background Section - Only covers top portion */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-[#4a154b] via-[#5a2060] to-[#7c3085] overflow-hidden">
              {/* Decorative patterns */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                <div className="absolute top-8 right-20 w-24 h-24 bg-white rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-white rounded-full blur-3xl"></div>
              </div>
              {/* Grid pattern overlay */}
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}></div>
            </div>

            {/* Content inside hero */}
            <div className="relative z-10 pt-6 px-6">
              {/* Header/Greeting */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-white">Welcome back! 👋</h1>
                  <p className="text-purple-200">Here's what's happening with your tickets today</p>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={timeFilter}
                    onChange={(value) => handleTimeFilterChange(value)}
                    options={[
                      { id: '7days', name: 'Last 7 Days' },
                      { id: '30days', name: 'Last 30 Days' },
                      { id: '3months', name: 'Last 3 Months' },
                      { id: '6months', name: 'Last 6 Months' },
                      { id: '1year', name: 'Last Year' },
                    ]}
                    placeholder="Select time period"
                    displayKey="name"
                    valueKey="id"
                    searchable={false}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Link href="/tickets/new/" className="px-4 py-2 bg-white text-[#4a154b] rounded-lg hover:bg-gray-100 font-medium shadow-lg">
                    New Ticket
                  </Link>
                </div>
              </div>

              {/* Quick Stats - Floating across gradient and white sections */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pb-6">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </div>
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pb-6">
                  <StatCard 
                    title="Open" 
                    value={dashboard?.tickets?.open ?? 0} 
                    icon={<ClipboardList className="w-6 h-6 text-white" />}
                    iconBg="bg-[#4a154b]"
                  />
                  <StatCard 
                    title="In Progress" 
                    value={dashboard?.tickets?.inProgress ?? 0} 
                    icon={<CheckCircle className="w-6 h-6 text-white" />}
                    iconBg="bg-[#4a154b]"
                  />
                  <StatCard 
                    title="On Hold" 
                    value={dashboard?.tickets?.hold ?? 0} 
                    icon={<Eye className="w-6 h-6 text-white" />}
                    iconBg="bg-[#4a154b]"
                  />
                  <StatCard 
                    title="Resolved" 
                    value={dashboard?.tickets?.resolved ?? 0} 
                    icon={<FolderOpen className="w-6 h-6 text-white" />}
                    iconBg="bg-[#4a154b]"
                  />
                  <StatCard 
                    title="Closed" 
                    value={dashboard?.tickets?.closed ?? 0} 
                    icon={<Lock className="w-6 h-6 text-white" />}
                    iconBg="bg-[#4a154b]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Content Section with Padding */}
          <div className="px-6 pb-6 space-y-6">
          {/* Main Content Grid */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart Skeleton */}
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-12 h-4 bg-gray-200 rounded"></div>
                      <div className="flex-1 h-8 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Distribution Skeleton */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center justify-between mb-1">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 bg-gray-200 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Performance Chart */}
              <div className="lg:col-span-2">
                <Panel title={getChartTitle()}>
                  <div className="mt-4">
                    <MonthlyChart data={dashboard?.performanceData ?? []} />
                  </div>
                </Panel>
              </div>

              {/* Status Distribution */}
              <div>
                <Panel title="Ticket Status Distribution">
                  <StatusPieChart data={dashboard?.statusDistribution ?? []} />
                </Panel>
              </div>
            </div>
          )}

          {/* SLA and Tasks */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <div className="h-5 bg-gray-200 rounded w-32 mb-3 animate-pulse"></div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="flex items-center justify-between animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-5 bg-gray-200 rounded w-12"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* SLA Metrics */}
              <Panel title="SLA Performance">
                <div className="space-y-3 mt-3">
                  <MetricRow label="Compliance Rate" value={`${dashboard?.sla?.complianceRate ?? 0}%`} color="text-green-600" />
                  <MetricRow label="Breaches" value={dashboard?.sla?.breaches ?? 0} color="text-red-600" />
                  <MetricRow label="At Risk" value={dashboard?.sla?.atRisk ?? 0} color="text-orange-600" />
                  <MetricRow label="On Track" value={dashboard?.sla?.onTrack ?? 0} color="text-green-600" />
                </div>
              </Panel>

              {/* Response Times */}
              <Panel title="Response Metrics">
                <div className="space-y-3 mt-3">
                  <div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                    <div className="text-2xl font-bold text-[#4a154b]">{dashboard?.sla?.avgResponseTime ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Avg Resolution Time</div>
                    <div className="text-2xl font-bold text-[#4a154b]">{dashboard?.sla?.avgResolutionTime ?? '—'}</div>
                  </div>
                </div>
              </Panel>

              {/* Task Summary */}
              <Panel title="Task Status">
                <div className="space-y-2 mt-3">
                  <TaskRow label="To Do" value={dashboard?.tasks?.todo ?? 0} color="bg-gray-200" />
                  <TaskRow label="In Progress" value={dashboard?.tasks?.inProgress ?? 0} color="bg-blue-200" />
                  <TaskRow label="Review" value={dashboard?.tasks?.review ?? 0} color="bg-yellow-200" />
                  <TaskRow label="Done" value={dashboard?.tasks?.done ?? 0} color="bg-green-200" />
                </div>
              </Panel>

              {/* Priority Distribution */}
              <Panel title="Priority Breakdown">
                <div className="space-y-3 mt-3">
                  {(dashboard?.priorities ?? []).map((p) => (
                    <PriorityRow 
                      key={p.label} 
                      label={p.label} 
                      count={p.count} 
                      percentage={p.percentage} 
                    />
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* Groups Performance and Recent Activity */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="h-8 bg-gray-200 rounded w-12"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Groups Performance */}
              <Panel title="Assignment Groups">
                <div className="mt-4 space-y-3">
                  {(dashboard?.groups ?? []).map((group) => (
                    <div key={group.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#4a154b] text-white rounded-full flex items-center justify-center font-semibold">
                          {group.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{group.name}</div>
                          <div className="text-sm text-gray-500">Avg: {group.avgResolutionTime}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#4a154b]">{group.activeTickets}</div>
                        <div className="text-xs text-gray-500">active</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Recent Activity */}
              <Panel title="Recent Activity">
                <div className="mt-4 space-y-3">
                  {(dashboard?.recentActivity ?? []).map((activity, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                      <div className="w-2 h-2 mt-2 rounded-full bg-[#4a154b]"></div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">{activity.action}</div>
                        <div className="text-xs text-gray-500">
                          {activity.user} · {activity.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}
          </div>
        </div>
      </AppShell>
    </>
  )
}

function StatCard({ title, value, icon, iconBg = 'bg-[#4a154b]' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold text-[#4a154b]">{value}</div>
          <div className="text-sm text-gray-500 mt-1">{title}</div>
        </div>
        <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      {children}
    </div>
  )
}

function MonthlyChart({ data }) {
  const COLORS = {
    open: '#3b82f6',
    inProgress: '#8b5cf6', 
    hold: '#f59e0b',
    resolved: '#22c55e',
    closed: '#6b7280',
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.open} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={COLORS.open} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorInProgress" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.inProgress} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={COLORS.inProgress} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorHold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.hold} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={COLORS.hold} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.resolved} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={COLORS.resolved} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.closed} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={COLORS.closed} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="label" 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="rect"
          />
          <Area
            type="monotone"
            dataKey="open"
            name="Open"
            stroke={COLORS.open}
            fillOpacity={1}
            fill="url(#colorOpen)"
            stackId="1"
          />
          <Area
            type="monotone"
            dataKey="inProgress"
            name="In Progress"
            stroke={COLORS.inProgress}
            fillOpacity={1}
            fill="url(#colorInProgress)"
            stackId="1"
          />
          <Area
            type="monotone"
            dataKey="hold"
            name="On Hold"
            stroke={COLORS.hold}
            fillOpacity={1}
            fill="url(#colorHold)"
            stackId="1"
          />
          <Area
            type="monotone"
            dataKey="resolved"
            name="Resolved"
            stroke={COLORS.resolved}
            fillOpacity={1}
            fill="url(#colorResolved)"
            stackId="1"
          />
          <Area
            type="monotone"
            dataKey="closed"
            name="Closed"
            stroke={COLORS.closed}
            fillOpacity={1}
            fill="url(#colorClosed)"
            stackId="1"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function StatusPieChart({ data }) {
  const PIE_COLORS = {
    'New': '#22c55e',
    'Open': '#3b82f6',
    'In Progress': '#8b5cf6',
    'On Hold': '#f59e0b',
    'Resolved': '#10b981',
    'Closed': '#6b7280',
  }

  const chartData = data.map(item => ({
    name: item.status,
    value: item.count,
    percentage: item.percentage,
  }))

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percent < 0.05) return null

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={PIE_COLORS[entry.name] || '#6b7280'} 
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name) => [`${value} tickets`, name]}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend 
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            iconSize={10}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartBar({ value, max, color }) {
  const width = (value / max) * 100
  return (
    <div className="relative flex-1 bg-gray-100 rounded overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-300 flex items-center justify-center text-white text-xs font-medium`}
        style={{ width: `${width}%` }}
      >
        {value > 0 && width > 10 && value}
      </div>
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded ${color}`}></div>
      <span className="text-gray-700">{label}</span>
    </div>
  )
}

function StatusBar({ status, count, percentage }) {
  const colors = {
    'Open': 'bg-blue-500',
    'In Progress': 'bg-purple-500',
    'Hold': 'bg-yellow-500',
    'Resolved': 'bg-green-500',
    'Closed': 'bg-gray-500',
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700 font-medium">{status}</span>
        <span className="text-gray-600">{count} ({percentage}%)</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${colors[status] || 'bg-gray-500'}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}

function MetricRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-lg font-semibold ${color}`}>{value}</span>
    </div>
  )
}

function TaskRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded ${color}`}></div>
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
}

function PriorityRow({ label, count, percentage }) {
  const colors = {
    'Urgent': 'text-red-600',
    'High': 'text-orange-600',
    'Normal': 'text-blue-600',
    'Low': 'text-gray-600',
  }

  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm font-medium ${colors[label] || 'text-gray-600'}`}>{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-gray-900">{count}</span>
        <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
      </div>
    </div>
  )
}
