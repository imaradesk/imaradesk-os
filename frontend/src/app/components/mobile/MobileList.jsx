import React, { useState } from 'react'
import { Link } from '@inertiajs/react'
import { Menu, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import Modal, { ModalBody, ModalButton } from '../Modal'
import { Spinner } from '../tasks/ui'

/**
 * Building blocks for phone list pages (tickets, tasks): a header with search
 * and filter buttons, swipeable view chips, applied-filter chips, an
 * inbox-style list area, a filter sheet and a floating create button.
 *
 *   <MobileListPage>
 *     <MobileListHeader … />
 *     <MobileListBody onScroll={…}>…rows…</MobileListBody>
 *     <MobileFab href="/tickets/new/" label="New ticket" />
 *   </MobileListPage>
 */

const noScrollbar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export const stripHtml = (html) => (html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

export function MobileListPage({ children }) {
  return <div className="flex-1 min-h-0 flex flex-col bg-white">{children}</div>
}

const iconBtn = (on) => `w-10 h-10 flex items-center justify-center rounded-full transition-colors active:scale-95 ${
  on ? 'bg-[#0B3D26]/10 text-[#0B3D26]' : 'text-gray-600 active:bg-gray-100'
}`

/**
 * Title row + optional search field + view chips + applied filter chips.
 * `search` is { value, onChange, onSubmit, onClear, placeholder, defaultOpen }.
 * `chips` are { id, label, count, icon }; `appliedFilters` are { key, label, value }.
 * `onOpenNav` adds a menu button for pages with their own section nav (tasks).
 * `action` is an optional node (e.g. an add button) shown just before the search button.
 */
export function MobileListHeader({
  title, count, onOpenNav, search, filterCount = 0, onOpenFilters,
  chips = [], activeChip, onSelectChip,
  appliedFilters = [], onRemoveFilter, onClearFilters,
  action,
}) {
  const [searchOpen, setSearchOpen] = useState(Boolean(search?.defaultOpen))

  return (
    <div className="flex-shrink-0 border-b border-gray-200 bg-white">
      <div className={`h-14 ${onOpenNav ? 'pl-1.5' : 'pl-4'} pr-2 flex items-center gap-1`}>
        {onOpenNav && (
          <button onClick={onOpenNav} aria-label="Open navigation" className={iconBtn(false)}>
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
          <span className="text-sm text-gray-400 tabular-nums">{count}</span>
        </div>
        {action}
        {search && (
          <button onClick={() => setSearchOpen((v) => !v)} aria-label="Search" aria-expanded={searchOpen} className={iconBtn(searchOpen)}>
            <Search className="w-5 h-5" />
          </button>
        )}
        {onOpenFilters && (
          <button onClick={onOpenFilters} aria-label="Filters" className={`relative ${iconBtn(filterCount > 0)}`}>
            <SlidersHorizontal className="w-5 h-5" />
            {filterCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#0B3D26] text-white text-[10px] font-semibold flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {search && searchOpen && (
        <form onSubmit={(e) => { e.preventDefault(); search.onSubmit() }} className="px-4 pb-3 animate-fadeIn">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              enterKeyHint="search"
              autoFocus
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder}
              aria-label={search.placeholder}
              className="w-full h-10 pl-9 pr-9 rounded-full bg-gray-100 border-0 text-base placeholder:text-gray-400 focus:ring-2 focus:ring-[#0B3D26]/20 outline-none"
            />
            {search.value && (
              <button
                type="button"
                onClick={search.onClear}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      )}

      {chips.length > 0 && (
        <div className={`flex gap-2 overflow-x-auto px-4 pb-3 ${noScrollbar}`}>
          {chips.map((c) => {
            const on = activeChip === c.id
            const Icon = c.icon
            return (
              <button
                key={c.id}
                onClick={() => !on && onSelectChip(c.id)}
                aria-pressed={on}
                className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                  on ? 'bg-[#0B3D26] text-white' : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {c.label}
                {c.count != null && <span className={`text-xs tabular-nums ${on ? 'text-white/70' : 'text-gray-400'}`}>{c.count}</span>}
              </button>
            )
          })}
        </div>
      )}

      {appliedFilters.length > 0 && (
        <div className={`flex gap-1.5 overflow-x-auto px-4 pb-3 -mt-1 ${noScrollbar}`}>
          {appliedFilters.map((f) => (
            <span key={f.key} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-[#0B3D26]/5 text-xs text-[#0B3D26] whitespace-nowrap flex-shrink-0">
              <span className="opacity-60">{f.label}:</span> {f.value}
              <button onClick={() => onRemoveFilter(f.key)} className="w-5 h-5 flex items-center justify-center rounded-full" aria-label={`Remove ${f.label} filter`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button onClick={onClearFilters} className="text-xs text-gray-500 px-2 whitespace-nowrap">Clear all</button>
        </div>
      )}
    </div>
  )
}

/** Scrolling list area with loading, empty and load-more states. */
export function MobileListBody({ onScroll, isLoading, isEmpty, empty, hasMore, isLoadingMore, onLoadMore, children }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-24" onScroll={onScroll}>
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Spinner className="w-5 h-5 text-[#0B3D26]" /></div>
      ) : isEmpty ? (
        empty
      ) : (
        <>
          <ul>{children}</ul>
          {isLoadingMore ? (
            <div className="py-5 flex justify-center"><Spinner className="w-5 h-5 text-[#0B3D26]" /></div>
          ) : hasMore ? (
            <div className="py-4 flex justify-center">
              <button onClick={onLoadMore} className="h-9 px-4 text-sm rounded-full border border-gray-300 text-gray-700">Load more</button>
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-gray-400">You're all caught up</p>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Inbox-style row. `accent` is a left-border class (SLA / overdue), `leading`
 * is usually an avatar, `meta` sits on the last line with `trailing` pushed right.
 */
export function MobileListRow({ href, accent = 'border-l-transparent', leading, title, aside, asideClassName = 'text-gray-400', subtitle, preview, meta, trailing }) {
  return (
    <li className={`border-b border-gray-100 border-l-2 ${accent}`}>
      <Link href={href} className="flex gap-3 pl-3.5 pr-4 py-3 active:bg-gray-50 transition-colors">
        {leading}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate">{title}</span>
            {aside && <span className={`text-xs whitespace-nowrap tabular-nums ${asideClassName}`}>{aside}</span>}
          </div>
          {subtitle && <p className="text-sm text-gray-800 truncate">{subtitle}</p>}
          {preview && <p className="text-[13px] text-gray-500 truncate">{preview}</p>}
          <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
            {meta}
            {trailing && <span className="ml-auto flex items-center gap-1.5 flex-shrink-0">{trailing}</span>}
          </div>
        </div>
      </Link>
    </li>
  )
}

const fabClass = 'fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 w-14 h-14 rounded-full bg-[#0B3D26] text-white shadow-lg shadow-[#0B3D26]/30 flex items-center justify-center active:scale-95 transition-transform'

/** Floating create button above the bottom nav. Pass `href`, or `onClick` for a button. */
export function MobileFab({ href, onClick, label, ...rest }) {
  if (href) {
    return <Link href={href} aria-label={label} className={fabClass}><Plus className="w-6 h-6" /></Link>
  }
  return <button type="button" onClick={onClick} aria-label={label} className={fabClass} {...rest}><Plus className="w-6 h-6" /></button>
}

/** Bottom sheet holding filter fields, with "Show results" / "Clear all". */
export function MobileFilterSheet({ isOpen, onClose, onApply, onClear, canClear, children }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Filters"
      size="sm"
      footer={(
        <>
          {canClear && <ModalButton variant="secondary" onClick={() => { onClose(); onClear() }}>Clear all</ModalButton>}
          <ModalButton variant="primary" onClick={() => { onClose(); onApply() }}>Show results</ModalButton>
        </>
      )}
    >
      <ModalBody className="!p-4 space-y-4">{children}</ModalBody>
    </Modal>
  )
}

export function MobileFilterField({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1.5">{label}</span>
      {children}
    </label>
  )
}
