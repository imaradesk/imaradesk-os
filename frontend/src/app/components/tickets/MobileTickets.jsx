import React, { useState } from 'react'
import { Inbox, FileText } from 'lucide-react'
import DatePicker from '../pickers/DatePicker'
import SimpleSelect from '../SimpleSelect'
import { TicketStatusBadge, SlaBadge, slaAccent, priorityId } from '../ticket/ui'
import { PriorityIcon, MiniAvatar, EmptyState } from '../tasks/ui'
import {
  MobileListPage, MobileListHeader, MobileListBody, MobileListRow, MobileFab, MobileFilterSheet, MobileFilterField, stripHtml,
} from '../mobile/MobileList'

/**
 * Phone layout for the tickets page (below `md`): view chips, an inbox-style
 * conversation list with infinite scroll, a filter sheet and a "new ticket" FAB.
 * Rows open the full ticket page; there are no layout modes or bulk selection here.
 */
export default function MobileTickets({
  views,
  draftsCount,
  currentView,
  onSelectView,
  pageTitle,
  totalCount,
  tickets,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onScroll,
  filters,
  setFilters,
  appliedFilters,
  activeFilterKeys,
  filterOptions,
  filterLabels,
  filterValueLabel,
  applyFilters,
  removeFilter,
  clearFilters,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false)

  const chips = [
    ...views.map((v) => ({ id: v.id, label: v.label, count: v.count })),
    { id: 'drafts', label: 'Drafts', count: draftsCount, icon: FileText },
  ]

  return (
    <MobileListPage>
      <MobileListHeader
        title={pageTitle}
        count={totalCount}
        search={{
          value: filters.ticketNumber,
          onChange: (v) => setFilters({ ...filters, ticketNumber: v.toUpperCase() }),
          onSubmit: () => applyFilters(),
          onClear: () => (appliedFilters.ticketNumber ? removeFilter('ticketNumber') : setFilters({ ...filters, ticketNumber: '' })),
          placeholder: 'Ticket number',
          defaultOpen: Boolean(appliedFilters.ticketNumber),
        }}
        filterCount={activeFilterKeys.filter((k) => k !== 'ticketNumber').length}
        onOpenFilters={() => setFiltersOpen(true)}
        chips={chips}
        activeChip={currentView}
        onSelectChip={onSelectView}
        appliedFilters={activeFilterKeys.map((key) => ({ key, label: filterLabels[key], value: filterValueLabel(key, appliedFilters[key]) }))}
        onRemoveFilter={removeFilter}
        onClearFilters={clearFilters}
      />

      <MobileListBody
        onScroll={onScroll}
        isLoading={isLoading}
        isEmpty={tickets.length === 0}
        empty={(
          <EmptyState
            icon={Inbox}
            title={activeFilterKeys.length ? 'No tickets match these filters' : 'No tickets here'}
            description={activeFilterKeys.length ? 'Try removing a filter or switching views.' : 'Tickets in this view will show up here.'}
            action={activeFilterKeys.length > 0 && (
              <button onClick={clearFilters} className="h-9 px-4 text-sm rounded-full border border-gray-300 text-gray-700">Clear filters</button>
            )}
          />
        )}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
      >
        {tickets.map((t) => (
          <MobileListRow
            key={t.uuid}
            href={`/tickets/${t.uuid}/`}
            accent={slaAccent(t.sla_info)}
            leading={<MiniAvatar user={{ name: t.requester || '?' }} size="w-10 h-10 text-sm" />}
            title={t.requester || 'Unknown requester'}
            aside={(t.requested || '').split(',')[0]}
            subtitle={t.subject || 'No subject'}
            preview={stripHtml(t.description)}
            meta={(
              <>
                <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">{t.ticket_number}</span>
                <TicketStatusBadge status={t.computed_status} />
                <SlaBadge slaInfo={t.sla_info} />
              </>
            )}
            trailing={(
              <>
                <PriorityIcon priority={priorityId(t.priority)} />
                <MiniAvatar user={t.assignee ? { name: t.assignee } : null} size="w-5 h-5 text-[9px]" />
              </>
            )}
          />
        ))}
      </MobileListBody>

      <MobileFab href="/tickets/new/" label="New ticket" />

      <MobileFilterSheet
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={() => applyFilters()}
        onClear={clearFilters}
        canClear={activeFilterKeys.length > 0}
      >
        {['status', 'priority', 'type', 'assignee'].map((key) => (
          <MobileFilterField key={key} label={filterLabels[key]}>
            <SimpleSelect
              value={filters[key]}
              onChange={(value) => setFilters({ ...filters, [key]: value })}
              ariaLabel={filterLabels[key]}
              emptyLabel={`Any ${filterLabels[key].toLowerCase()}`}
              options={filterOptions[key].map(([id, name]) => ({ id, name }))}
            />
          </MobileFilterField>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <MobileFilterField label="From">
            <DatePicker value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(dateFrom) => setFilters({ ...filters, dateFrom })} allowClear placeholder="Any date" aria-label="From date" className="w-full" />
          </MobileFilterField>
          <MobileFilterField label="To">
            <DatePicker value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(dateTo) => setFilters({ ...filters, dateTo })} allowClear placeholder="Any date" aria-label="To date" className="w-full" />
          </MobileFilterField>
        </div>
      </MobileFilterSheet>
    </MobileListPage>
  )
}
