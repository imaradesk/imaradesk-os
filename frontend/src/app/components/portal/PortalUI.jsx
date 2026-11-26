import React from 'react'
import { Link } from '@inertiajs/react'
import {
  ArrowRight, BookOpen, Check, Eye, Search, Sparkles,
} from 'lucide-react'
import { TICKET_STATUS_MAP, TicketStatusIcon, statusLabel } from '../ticket/ui'
import { PRIORITY_MAP } from '../tasks/constants'
import { PriorityIcon } from '../tasks/ui'

// Public portal primitives. Styling mirrors the ticket list/detail screens:
// 2xl white cards, hairline borders, brand purple actions and soft status chips.

export const PORTAL_CARD = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

// Soft brand-tinted panel (help prompts, announcements); remapped in dark mode
export const PORTAL_TINT = 'portal-tint rounded-2xl border'

export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-medium whitespace-nowrap shadow-sm hover:shadow transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

export const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 text-sm font-medium whitespace-nowrap transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

export const BTN_GHOST =
  'inline-flex items-center justify-center gap-2 h-8 px-2.5 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors'

export const PORTAL_INPUT =
  'w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/15 focus:border-[#0B3D26]'

/** Staggered entrance: children rise in one after another */
export function Reveal({ index = 0, step = 50, as: Tag = 'div', className = '', style, children, ...rest }) {
  return (
    <Tag className={`animate-portalRise ${className}`} style={{ animationDelay: `${index * step}ms`, ...style }} {...rest}>
      {children}
    </Tag>
  )
}

export function PortalHero({ eyebrow, title, description, children, compact = false }) {
  return (
    <div className={`portal-hero mt-6 relative overflow-hidden rounded-2xl px-6 sm:px-8 ${compact ? 'py-8' : 'py-12 sm:py-14'}`}>
      {/* Soft glows + dot grid instead of a hard illustration */}
      <div className="portal-hero-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/10 blur-3xl animate-float" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-28 -left-10 w-72 h-72 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 max-w-2xl">
        {eyebrow && (
          <Reveal as="span" className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-white/90 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" /> {eyebrow}
          </Reveal>
        )}
        <Reveal as="h1" index={1} className={`${compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'} font-semibold tracking-tight text-white`}>
          {title}
        </Reveal>
        {description && <Reveal as="p" index={2} className="mt-2 text-sm sm:text-base text-white/70 leading-relaxed">{description}</Reveal>}
        {children && <Reveal index={3} className="mt-6">{children}</Reveal>}
      </div>
    </div>
  )
}

/**
 * Horizontal step indicator for guided flows.
 * steps: [{ label, description? }]; onSelect(i) lets users jump back to completed steps.
 */
export function PortalSteps({ steps, current, onSelect }) {
  return (
    <ol className="flex items-start gap-2">
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={step.label} className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => done && onSelect?.(i)}
              disabled={!done}
              aria-current={active ? 'step' : undefined}
              className="group w-full text-left disabled:cursor-default"
            >
              <span className="block h-1 rounded-full bg-gray-200 overflow-hidden">
                <span
                  className="block h-full rounded-full bg-[#0B3D26] transition-all duration-500 ease-smooth"
                  style={{ width: done ? '100%' : active ? '50%' : '0%' }}
                />
              </span>
              <span className="mt-2.5 flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 transition-all duration-300 ${
                  done ? 'bg-[#0B3D26] text-white' : active ? 'bg-[#0B3D26]/10 text-[#0B3D26] ring-2 ring-[#0B3D26]/30' : 'bg-gray-100 text-gray-400'
                }`}>
                  {done ? <Check className="w-3 h-3 animate-portalPop" strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-xs font-medium truncate transition-colors ${active || done ? 'text-gray-900' : 'text-gray-400'} ${done ? 'group-hover:text-[#0B3D26]' : ''}`}>
                    {step.label}
                  </span>
                  {step.description && <span className="hidden sm:block text-[11px] text-gray-500 truncate">{step.description}</span>}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

const PROGRESS_STAGES = [
  { label: 'Received', statuses: ['new', 'open'] },
  { label: 'In progress', statuses: ['in_progress', 'pending'] },
  { label: 'Resolved', statuses: ['resolved'] },
  { label: 'Closed', statuses: ['closed'] },
]

/** Where a ticket sits in its lifecycle, so customers can follow along */
export function TicketProgress({ status }) {
  const found = PROGRESS_STAGES.findIndex((s) => s.statuses.includes(status))
  const current = found === -1 ? 0 : found
  const waitingOnCustomer = status === 'pending'

  return (
    <div>
      <div className="relative flex items-start justify-between">
        <span className="absolute left-3 right-3 top-3 h-0.5 bg-gray-200" aria-hidden="true" />
        <span
          className="absolute left-3 top-3 h-0.5 bg-[#0B3D26] transition-all duration-700 ease-smooth"
          style={{ width: `calc((100% - 1.5rem) * ${current / (PROGRESS_STAGES.length - 1)})` }}
          aria-hidden="true"
        />
        {PROGRESS_STAGES.map((stage, i) => {
          const reached = i <= current
          return (
            <div key={stage.label} className="relative z-10 flex flex-col items-center gap-1.5 w-16">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white transition-colors duration-500 ${
                  reached ? 'bg-[#0B3D26] text-white' : 'bg-gray-200 text-gray-400'
                }`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {i < current ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : (
                  <span className={`w-2 h-2 rounded-full ${reached ? 'bg-white' : 'bg-gray-400'} ${i === current && current < 3 ? 'animate-pulse' : ''}`} />
                )}
              </span>
              <span className={`text-[11px] text-center leading-tight ${i === current ? 'font-semibold text-gray-900' : reached ? 'text-gray-700' : 'text-gray-400'}`}>
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
      {waitingOnCustomer && (
        <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 animate-portalRise">
          We are waiting on a reply from you. Add a message below to keep things moving.
        </p>
      )}
    </div>
  )
}

export function PortalSearch({ value, onChange, onSubmit, placeholder = 'Search articles…', buttonLabel = 'Search', size = 'md' }) {
  const tall = size === 'lg'
  return (
    <form onSubmit={onSubmit} className="relative w-full">
      <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 ${tall ? 'w-5 h-5' : 'w-4 h-4'}`} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`w-full rounded-xl bg-white text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-white/30 ${
          tall ? 'h-12 pl-11 pr-28 text-sm sm:text-base' : 'h-10 pl-10 pr-24 text-sm'
        }`}
      />
      <button
        type="submit"
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-lg bg-[#0B3D26] hover:bg-[#14502F] text-white font-medium transition-colors ${
          tall ? 'h-9 px-4 text-sm' : 'h-7 px-3 text-xs'
        }`}
      >
        {buttonLabel}
      </button>
    </form>
  )
}

export function PortalStatusBadge({ status, label }) {
  const meta = TICKET_STATUS_MAP[status]
  const chip = (meta?.lozenge || 'bg-gray-100 text-gray-700 hover:bg-gray-200').replace(/hover:\S+/g, '')
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${chip}`}>
      <TicketStatusIcon status={status} className="!w-3 !h-3" />
      {label || statusLabel(status)}
    </span>
  )
}

export function PortalPriorityBadge({ priority, label }) {
  const meta = PRIORITY_MAP[priority] || PRIORITY_MAP.normal
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium whitespace-nowrap">
      <PriorityIcon priority={priority || 'normal'} />
      {label || meta.name}
    </span>
  )
}

export function PortalSection({ title, description, action, children, className = '' }) {
  return (
    <section className={className}>
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function PortalArticleCard({ article, compact = false }) {
  const excerpt = (article.excerpt || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim()

  return (
    <Link
      href={`/portal/kb/${article.uuid}/`}
      className="portal-lift group flex flex-col w-full bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 overflow-hidden"
    >
      <div className={`${compact ? 'h-28' : 'h-36'} bg-gradient-to-br from-[#f5eef5] to-gray-50 flex items-center justify-center relative overflow-hidden`}>
        {article.display_image ? (
          <img src={article.display_image} alt="" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
        ) : (
          <BookOpen className="w-8 h-8 text-[#0B3D26]/40 group-hover:scale-110 transition-transform duration-300" />
        )}
        {article.category && (
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur text-[11px] font-medium text-gray-700">
            {article.category}
          </span>
        )}
      </div>

      <div className={`flex flex-col flex-1 ${compact ? 'p-4' : 'p-4'}`}>
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#0B3D26] transition-colors">
          {article.title}
        </h3>
        {excerpt && <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{excerpt}</p>}

        <div className="mt-auto pt-3 flex items-center justify-between text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-gray-400" /> {article.views || 0}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-[#0B3D26]">
            Read <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export function PortalStat({ label, value, accent = false }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className={`text-2xl font-semibold tabular-nums tracking-tight ${accent ? 'text-[#0B3D26]' : 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

export function PortalEmpty({ icon: Icon = BookOpen, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-3 animate-portalPop">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function BackLink({ href, children = 'Back' }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors">
      {children}
    </Link>
  )
}
