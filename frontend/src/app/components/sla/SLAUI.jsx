import React from 'react'
import { Link } from '@inertiajs/react'
import {
  AlertTriangle, ArrowRight, BellRing, CircleCheckBig, Filter, Gauge, MessageSquareReply, OctagonAlert, ShieldAlert,
  Signal, SignalLow, SignalMedium,
} from 'lucide-react'

// Shared building blocks for the SLA pages (overview, policies, policy form,
// business hours, holidays). Mirrors the look of the marketplace and
// integrations pages: rounded-2xl surfaces, tinted icon tiles, staggered rise.

export const PRIORITIES = {
  urgent: { label: 'Urgent', icon: OctagonAlert, color: '#ef4444', dot: 'bg-red-500', bar: 'bg-red-500', tile: 'bg-red-50 text-red-600', pill: 'border-red-200 bg-red-50 text-red-700' },
  high: { label: 'High', icon: Signal, color: '#f59e0b', dot: 'bg-amber-500', bar: 'bg-amber-500', tile: 'bg-amber-50 text-amber-600', pill: 'border-amber-200 bg-amber-50 text-amber-700' },
  medium: { label: 'Medium', icon: SignalMedium, color: '#3b82f6', dot: 'bg-blue-500', bar: 'bg-blue-500', tile: 'bg-blue-50 text-blue-600', pill: 'border-blue-200 bg-blue-50 text-blue-700' },
  low: { label: 'Low', icon: SignalLow, color: '#64748b', dot: 'bg-gray-400', bar: 'bg-gray-400', tile: 'bg-gray-100 text-gray-600', pill: 'border-gray-200 bg-gray-100 text-gray-600' },
}

export const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low']

export const priorityMeta = (id) => PRIORITIES[String(id || '').toLowerCase()] || PRIORITIES.low

export const fieldClass =
  'w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0B3D26] focus:ring-4 focus:ring-[#0B3D26]/10 transition-shadow'

/** 90 -> "1h 30m", 1500 -> "1d 1h" */
export function shortMinutes(raw) {
  const minutes = Number(raw)
  if (!minutes || minutes <= 0) return '—'
  const d = Math.floor(minutes / 1440)
  const h = Math.floor((minutes % 1440) / 60)
  const m = minutes % 60
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ')
}

export function PriorityPill({ priority, className = '' }) {
  const p = priorityMeta(priority)
  const Icon = p.icon
  return (
    <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[11px] font-medium ${p.pill} ${className}`}>
      <Icon className="w-3 h-3" strokeWidth={2} /> {p.label}
    </span>
  )
}

export function PriorityTile({ priority, size = 'md' }) {
  const p = priorityMeta(priority)
  const Icon = p.icon
  const box = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'
  return (
    <span className={`${box} flex-shrink-0 inline-flex items-center justify-center ${p.tile}`}>
      <Icon className="w-4 h-4" strokeWidth={1.75} />
    </span>
  )
}

/** Intro card with a brand icon, glow and optional right-hand content (stats, actions) */
export function SlaHero({ icon: Icon = Gauge, title, description, aside, children, bare = false }) {
  return (
    <section className={`relative animate-portalRise ${bare ? '' : 'overflow-hidden rounded-2xl border border-gray-200 bg-white'}`}>
      {!bare && <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#0B3D26]/10 blur-3xl" />}
      <div className={`relative flex flex-col lg:flex-row lg:items-center gap-5 ${bare ? '' : 'p-5 sm:p-6'}`}>
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {Icon && (
            <span className="w-11 h-11 rounded-xl bg-[#0B3D26] text-white inline-flex items-center justify-center flex-shrink-0 shadow-sm">
              <Icon className="w-5 h-5" strokeWidth={1.75} />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h1>
            {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
          </div>
        </div>
        {aside && <div className="flex-shrink-0">{aside}</div>}
      </div>
      {children && <div className={`relative ${bare ? 'pt-5' : 'px-5 sm:px-6 pb-5 sm:pb-6'}`}>{children}</div>}
    </section>
  )
}

export function StatTile({ icon: Icon, label, value, tone = 'text-[#0B3D26]', hint }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 min-w-[6.5rem]">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 whitespace-nowrap">
        {Icon && <Icon className={`w-3.5 h-3.5 ${tone}`} strokeWidth={2} />} {label}
      </div>
      <p className="mt-1 text-xl font-semibold text-gray-900 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

/** Card section with icon title, used for grouped settings */
export function SlaCard({ icon: Icon, title, description, action, children, flush = false, className = '', delay = 0 }) {
  return (
    <section
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={`rounded-2xl border border-gray-200 bg-white animate-portalRise ${className}`}
    >
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <span className="w-8 h-8 rounded-lg bg-[#0B3D26]/10 text-[#0B3D26] inline-flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4" strokeWidth={1.75} />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
            </div>
          </div>
          {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={flush ? '' : 'p-5 sm:p-6'}>{children}</div>
    </section>
  )
}

export function EmptyState({ icon: Icon, title, description, action, bare = false }) {
  return (
    <div className={`px-6 text-center animate-portalRise ${bare ? 'min-h-[50vh] flex flex-col items-center justify-center' : 'rounded-2xl border border-dashed border-gray-300 bg-white py-14'}`}>
      <span className="mx-auto mb-3 w-12 h-12 rounded-xl bg-gray-100 text-gray-400 inline-flex items-center justify-center">
        <Icon className="w-6 h-6" strokeWidth={1.5} />
      </span>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

/** Shown on sub-pages when SLA tracking is switched off */
export function SlaDisabledBanner({ href = '/administration/sla/' }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 animate-portalRise">
      <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" strokeWidth={1.75} />
      <p className="flex-1 text-sm text-amber-800">
        <span className="font-medium">SLA tracking is turned off.</span> Changes are saved but won't affect tickets until it's enabled.
      </p>
      <Link href={href} className="group inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:underline">
        SLA settings <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}

/**
 * Summary of a policy: priority tile, name and status, target bars with the
 * breach-warning marker, and how it applies. Used by the policy form's live
 * preview and by the policy cards on the SLA overview.
 *
 * Times are in minutes. `title` replaces the plain name (e.g. with a link),
 * `actions` sits top-right.
 */
export function PolicySummary({
  name,
  title,
  priority,
  active,
  description,
  firstResponse = 0,
  resolution = 0,
  notifyBeforeBreach = 0,
  useCustomRules = false,
  customRuleCount = 0,
  rulesLogic = 'OR',
  autoAssignOnBreach = false,
  actions,
}) {
  const first = Number(firstResponse) || 0
  const res = Number(resolution) || 0
  const notify = Number(notifyBeforeBreach) || 0
  const longest = Math.max(first, res, 1)
  const warnAt = res > notify ? ((res - notify) / longest) * 100 : null

  const targets = [
    { icon: MessageSquareReply, label: 'First response', minutes: first },
    { icon: CircleCheckBig, label: 'Resolution', minutes: res, warnAt },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <PriorityTile priority={priority} />
          <div className="min-w-0">
            {title || (
              <p className={`text-sm font-semibold truncate ${name ? 'text-gray-900' : 'text-gray-400'}`}>
                {name || 'Untitled policy'}
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <PriorityPill priority={priority} />
              <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[11px] font-medium ${
                active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-100 text-gray-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        {actions}
      </div>

      {description && <p className="text-xs text-gray-500 line-clamp-3">{description}</p>}

      <div className="space-y-3">
        {targets.map(({ icon: Icon, label, minutes, warnAt: warn }) => (
          <div key={label}>
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-gray-500">
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} /> {label}
              </span>
              <span className="font-semibold text-gray-900 tabular-nums">{shortMinutes(minutes)}</span>
            </div>
            <div className="relative mt-1.5 h-1.5 rounded-full bg-gray-100">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-[#0B3D26] transition-[width] duration-500 ease-smooth"
                style={{ width: `${(minutes / longest) * 100}%` }}
              />
              {warn !== null && warn !== undefined && notify > 0 && (
                <span
                  title={`Warning ${shortMinutes(notify)} before breach`}
                  className="absolute -top-0.5 w-0.5 h-2.5 rounded-full bg-amber-500 transition-[left] duration-500 ease-smooth"
                  style={{ left: `${warn}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <ul className="space-y-2 pt-3 border-t border-gray-100 text-xs text-gray-600">
        <li className="flex items-center gap-2">
          <BellRing className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          {notify > 0 ? `Warn ${shortMinutes(notify)} before breach` : 'No breach warning'}
        </li>
        <li className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          {useCustomRules
            ? `${customRuleCount} custom ${customRuleCount === 1 ? 'condition' : 'conditions'} (${rulesLogic === 'AND' ? 'all' : 'any'})`
            : `Applies to ${priorityMeta(priority).label} priority tickets`}
        </li>
        <li className="flex items-center gap-2">
          <ShieldAlert className={`w-3.5 h-3.5 flex-shrink-0 ${autoAssignOnBreach ? 'text-red-500' : 'text-gray-300'}`} />
          {autoAssignOnBreach ? 'Escalates to admin on breach' : 'No escalation on breach'}
        </li>
      </ul>
    </div>
  )
}
