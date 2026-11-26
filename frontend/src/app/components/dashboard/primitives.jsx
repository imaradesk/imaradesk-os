import React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Building blocks shared by every widget so charts, bars and lists look the same.

export const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : n)

export const axisProps = (t) => ({ tick: { fill: t.axis, fontSize: 11 }, axisLine: false, tickLine: false })

// Choices for widgets with a "how many rows" setting
export const LIMITS = [{ id: 3, name: '3' }, { id: 4, name: '4' }, { id: 6, name: '6' }]

export const initials = (name) => name.split(' ').map((p) => p[0]).join('').slice(0, 2)

export const TONE_TEXT = {
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  orange: 'text-orange-600',
  gray: 'text-gray-500',
  blue: 'text-gray-600',
}

export const TONE_DOT = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
}

export function ChartTooltip({ active, payload, label, t, suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-dropdown"
      style={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, color: t.tooltipText }}
    >
      {label != null && <p className="font-medium mb-1 opacity-70">{label}</p>}
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="opacity-70">{p.name}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums">{fmt(p.value)}{suffix}</span>
        </div>
      ))}
    </div>
  )
}

export function ChartLegend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((i) => (
        <span key={i.name} className="inline-flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full" style={{ background: i.color }} />
          {i.name}
        </span>
      ))}
    </div>
  )
}

export function Bar1({ value, max = 100, color, t, height = 'h-1.5' }) {
  return (
    <div className={`${height} rounded-full overflow-hidden`} style={{ background: t.track }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (value / (max || 1)) * 100)}%`, background: color }} />
    </div>
  )
}

export function Progress({ label, value, color, t, suffix = '%', max = 100, detail }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 truncate pr-2">{label}</span>
        <span className="text-gray-400 tabular-nums whitespace-nowrap">
          <span className="font-medium text-gray-900">{fmt(value)}{suffix}</span>{detail && ` · ${detail}`}
        </span>
      </div>
      <Bar1 value={value} max={max} color={color} t={t} />
    </div>
  )
}

/** Stacked horizontal bar with a legend grid underneath. */
export function Segments({ parts, t, columns = 2 }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5" style={{ background: t.track }}>
        {parts.map((p) => <div key={p.name} title={`${p.name}: ${p.value}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </div>
      <div className={`grid gap-x-4 gap-y-1.5 mt-3 ${columns === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {parts.map((p) => (
          <div key={p.name} className="flex items-center gap-1.5 text-xs min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-gray-500 truncate">{p.name}</span>
            <span className="ml-auto font-medium text-gray-900 tabular-nums">{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Ring({ value, color, t, label, display, height = 'h-40' }) {
  return (
    <div className={`relative ${height}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="80%" outerRadius="100%" data={[{ value, fill: color }]} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={10} background={{ fill: t.track }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-2xl font-semibold text-gray-900 tabular-nums">{display ?? `${value}%`}</p>
        {label && <p className="text-[11px] text-gray-400">{label}</p>}
      </div>
    </div>
  )
}

export function Donut({ items, t, centerValue, centerLabel, height = 'h-48' }) {
  return (
    <div className={`relative ${height}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={items} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="92%" paddingAngle={2} cornerRadius={3} stroke="none">
            {items.map((s) => <Cell key={s.name} fill={s.color} />)}
          </Pie>
          <Tooltip content={<ChartTooltip t={t} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-2xl font-semibold text-gray-900 tabular-nums">{fmt(centerValue)}</p>
        <p className="text-[11px] text-gray-400">{centerLabel}</p>
      </div>
    </div>
  )
}

/** Time series as lines or grouped bars, chosen by the widget's chart style setting. */
export function SeriesChart({ data, series, t, variant = 'line', height = 'h-64', suffix = '', domain }) {
  const Chart = variant === 'bar' ? BarChart : LineChart
  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 6, right: 4, left: -18, bottom: 0 }} barCategoryGap="24%" barGap={2}>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey="label" {...axisProps(t)} interval="preserveStartEnd" minTickGap={12} />
          <YAxis {...axisProps(t)} domain={domain} />
          <Tooltip
            content={<ChartTooltip t={t} suffix={suffix} />}
            cursor={variant === 'bar' ? { fill: t.brandSoft } : { stroke: t.axis, strokeDasharray: '3 3' }}
          />
          {series.map((s) => (variant === 'bar' && !s.lineOnly
            ? <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} stackId={s.stack} />
            : variant === 'bar' ? null : (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={s.dashed ? 1.5 : 2}
                strokeDasharray={s.dashed ? '4 4' : undefined}
                dot={false}
                activeDot={{ r: 3.5, strokeWidth: 0 }}
              />
            )))}
        </Chart>
      </ResponsiveContainer>
    </div>
  )
}

/** Horizontal bars for ranked categories. */
export function RankBars({ items, t, height = 'h-64', color }) {
  const max = Math.max(1, ...items.map((c) => c.value))
  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide domain={[0, max * 1.05]} />
          <YAxis type="category" dataKey="name" width={84} {...axisProps(t)} />
          <Tooltip content={<ChartTooltip t={t} />} cursor={{ fill: t.brandSoft }} />
          <Bar dataKey="value" name="Count" fill={color || t.brand} radius={[0, 4, 4, 0]} barSize={14} background={{ fill: t.track, radius: 4 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Vertical bars, one colour per bar. */
export function ColumnBars({ items, t, height = 'h-60', name = 'Count' }) {
  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey="name" {...axisProps(t)} />
          <YAxis {...axisProps(t)} />
          <Tooltip content={<ChartTooltip t={t} />} cursor={{ fill: t.brandSoft }} />
          <Bar dataKey="value" name={name} radius={[4, 4, 0, 0]} barSize={28}>
            {items.map((a) => <Cell key={a.name} fill={a.color || t.brand} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Avatar({ name, status }) {
  return (
    <span className="relative flex-shrink-0">
      <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gray-100 text-gray-600">{initials(name)}</span>
      {status && (
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
          status === 'online' ? 'bg-emerald-500' : status === 'away' ? 'bg-amber-500' : 'bg-gray-300'
        }`} />
      )}
    </span>
  )
}

export function List({ children }) {
  return <div className="divide-y divide-gray-100 -my-2">{children}</div>
}

export function Row({ title, meta, right, rightMeta, rightTone, leading }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {leading}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800 truncate">{title}</p>
        {meta && <p className="text-[11px] text-gray-400 truncate mt-0.5">{meta}</p>}
      </div>
      {(right != null || rightMeta) && (
        <div className="text-right flex-shrink-0">
          {right != null && <p className={`text-sm font-medium tabular-nums ${rightTone ? TONE_TEXT[rightTone] : 'text-gray-900'}`}>{right}</p>}
          {rightMeta && <p className="text-[11px] text-gray-400">{rightMeta}</p>}
        </div>
      )}
    </div>
  )
}

export function StatTiles({ items }) {
  return (
    <div className={`grid gap-2 ${items.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
      {items.map((s) => (
        <div key={s.label} className="rounded-lg border border-gray-200 px-2 py-2 text-center">
          <p className={`text-lg font-semibold tabular-nums leading-tight ${s.tone ? TONE_TEXT[s.tone] : 'text-gray-900'}`}>{fmt(s.value)}</p>
          <p className="text-[11px] text-gray-500">{s.label}</p>
        </div>
      ))}
    </div>
  )
}
