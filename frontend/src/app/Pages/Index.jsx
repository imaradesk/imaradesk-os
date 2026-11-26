import React, { useState } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, CheckCircle2, CircleDot, Inbox, LayoutDashboard, Loader2, Lock, PauseCircle, Plus } from 'lucide-react'
import AppShell from '../components/AppShell'
import SimpleSelect from '../components/SimpleSelect'
import WidgetSkeleton from '../components/dashboard/WidgetSkeleton'
import { useChartTheme } from '../components/dashboard/theme'
import {
  ChartLegend, ChartTooltip, Donut, List, Progress, Row, Segments, StatTiles, axisProps, fmt,
} from '../components/dashboard/primitives'
import { useInstalledModules } from '../context/InstalledModulesContext'

const PERIODS = [
  { id: '7days', name: 'Last 7 days', chart: 'Daily performance' },
  { id: '30days', name: 'Last 30 days', chart: 'Daily performance' },
  { id: '3months', name: 'Last 3 months', chart: 'Weekly performance' },
  { id: '6months', name: 'Last 6 months', chart: 'Weekly performance' },
  { id: '1year', name: 'Last year', chart: 'Monthly performance' },
]

export default function Index({ dashboard = {}, timeFilter = '7days' }) {
  return (
    <>
      <Head title="Dashboard" />
      {/* AppShell provides the theme, so everything reading useChartTheme must render inside it */}
      <AppShell active="home">
        <Dashboard dashboard={dashboard} initialPeriod={timeFilter} />
      </AppShell>
    </>
  )
}

function Dashboard({ dashboard, initialPeriod }) {
  const { auth } = usePage().props
  const { isModuleInstalled } = useInstalledModules()
  const t = useChartTheme()
  const [period, setPeriod] = useState(initialPeriod)
  const [loading, setLoading] = useState(false)

  const changePeriod = (value) => {
    setPeriod(value)
    setLoading(true)
    router.get('/dashboard/', { timeFilter: value }, {
      preserveState: true,
      preserveScroll: true,
      only: ['dashboard', 'timeFilter'],
      onFinish: () => setLoading(false),
    })
  }

  const tickets = dashboard.tickets || {}
  const sla = dashboard.sla || {}
  // The task card only shows when the server sends task counts
  const tasks = dashboard.tasks
  const priorities = dashboard.priorities || []
  const groups = dashboard.groups || []
  const activity = dashboard.recentActivity || []
  const firstName = (auth?.user?.name || '').split(' ')[0]
  const chartTitle = PERIODS.find((p) => p.id === period)?.chart || 'Performance'

  const stats = [
    { label: 'Open', value: tickets.open, icon: Inbox },
    { label: 'In progress', value: tickets.inProgress, icon: CircleDot },
    { label: 'On hold', value: tickets.hold, icon: PauseCircle },
    { label: 'Resolved', value: tickets.resolved, icon: CheckCircle2 },
    { label: 'Closed', value: tickets.closed, icon: Lock },
  ]

  const series = [
    { key: 'open', name: 'Open', color: t.brand },
    { key: 'inProgress', name: 'In progress', color: t.brand2 },
    { key: 'hold', name: 'On hold', color: t.amber },
    { key: 'resolved', name: 'Resolved', color: t.brand3 },
    { key: 'closed', name: 'Closed', color: t.gray },
  ]

  const statusColors = [t.brand, t.brand2, t.brand3, t.amber, t.gray, t.red]
  const statuses = (dashboard.statusDistribution || []).map((s, i) => ({
    name: s.status, value: s.count, color: statusColors[i % statusColors.length],
  }))
  const priorityColors = { Urgent: t.red, High: t.amber, Normal: t.brand, Low: t.gray }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)]">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
              <LayoutDashboard className="w-4 h-4 text-gray-500" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Here's what's happening with your tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
            <div className="w-44">
              <SimpleSelect value={period} onChange={changePeriod} options={PERIODS} />
            </div>
            <Link
              href="/tickets/new/"
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium bg-[#0B3D26] hover:bg-[#14502F] text-white transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> New ticket
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-50 p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500">{label}</span>
                <Icon className="w-4 h-4 text-gray-300" />
              </div>
              <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">{loading ? '—' : fmt(value ?? 0)}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title={chartTitle} className="lg:col-span-2" loading={loading}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard.performanceData || []} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={t.grid} />
                  <XAxis dataKey="label" {...axisProps(t)} interval="preserveStartEnd" minTickGap={12} />
                  <YAxis {...axisProps(t)} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip t={t} />} />
                  {series.map((s) => (
                    <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stackId="1" stroke={s.color} fill={s.color} fillOpacity={0.25} strokeWidth={2} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3"><ChartLegend items={series} /></div>
          </Card>

          <Card title="Status distribution" loading={loading}>
            <Donut items={statuses} t={t} centerValue={statuses.reduce((n, s) => n + (s.value || 0), 0)} centerLabel="tickets" />
            <div className="mt-3"><ChartLegend items={statuses.map((s) => ({ name: `${s.name} (${s.value})`, color: s.color }))} /></div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card title="SLA performance" loading={loading}>
            <div className="space-y-4">
              <Progress label="Compliance rate" value={sla.complianceRate ?? 0} color={t.brand} t={t} />
              <StatTiles items={[
                { label: 'Breaches', value: sla.breaches ?? 0, tone: 'red' },
                { label: 'At risk', value: sla.atRisk ?? 0, tone: 'amber' },
                { label: 'On track', value: sla.onTrack ?? 0, tone: 'green' },
              ]} />
            </div>
          </Card>
          <Card title="Response metrics" loading={loading}>
            <div className="space-y-4">
              <Metric label="Average response time" value={sla.avgResponseTime ?? '—'} />
              <Metric label="Average resolution time" value={sla.avgResolutionTime ?? '—'} />
            </div>
          </Card>
          {tasks && isModuleInstalled('tasks') && (
            <Card title="Task status" loading={loading}>
              <Segments t={t} columns={1} parts={[
                { name: 'To do', value: tasks.todo ?? 0, color: t.gray },
                { name: 'In progress', value: tasks.inProgress ?? 0, color: t.brand2 },
                { name: 'Review', value: tasks.review ?? 0, color: t.amber },
                { name: 'Done', value: tasks.done ?? 0, color: t.brand },
              ]} />
            </Card>
          )}
          <Card title="Priority breakdown" loading={loading}>
            <div className="space-y-3">
              {priorities.length === 0 && <Empty />}
              {priorities.map((p) => (
                <Progress key={p.label} label={p.label} value={p.percentage} detail={`${p.count} tickets`} color={priorityColors[p.label] || t.brand2} t={t} />
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Assignment groups" loading={loading}>
            {groups.length === 0 ? <Empty /> : (
              <List>
                {groups.map((g) => (
                  <Row key={g.name} title={g.name} meta={`Average resolution: ${g.avgResolutionTime}`} right={g.activeTickets} rightMeta="active" />
                ))}
              </List>
            )}
          </Card>
          <Card title="Recent activity" loading={loading}>
            {activity.length === 0 ? <Empty /> : (
              <List>
                {activity.map((a, i) => (
                  <Row key={i} title={a.action} meta={`${a.user} · ${a.time}`} leading={<Activity className="w-4 h-4 text-gray-300 flex-shrink-0" />} />
                ))}
              </List>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Card({ title, children, loading, className = '' }) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white p-4 min-w-0 ${className}`}>
      <h2 className="text-sm font-semibold text-gray-900 mb-3">{title}</h2>
      {loading ? <WidgetSkeleton /> : children}
    </section>
  )
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums">{value}</p>
    </div>
  )
}

function Empty() {
  return <p className="py-6 text-center text-sm text-gray-400">No data yet</p>
}
