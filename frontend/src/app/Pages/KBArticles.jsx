import React, { useMemo, useState } from 'react'
import { Head } from '@inertiajs/react'
import { Plus, Search, X, Files, SlidersHorizontal } from 'lucide-react'
import KBLayout, { PageHeader, ArticleFormButton } from '../components/kb/KBLayout'
import ArticleList from '../components/kb/ArticleList'
import KBOnboarding from '../components/kb/KBOnboarding'
import { VIEW_ICONS, ARTICLE_STATUSES, ARTICLE_SORTS, CONTROL } from '../components/kb/constants'
import { EmptyState, CategoryIcon, PRIMARY_BTN } from '../components/kb/ui'
import SimpleSelect from '../components/SimpleSelect'
import { Popover } from '../../components/Popover'

const initialSearch = () => {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('search') || ''
}

export default function KBArticles({
  articles = [],
  sidebar = {},
  currentView = 'all',
  currentCategory = null,
  pendingCount = 0,
  viewTitle = 'All articles',
}) {
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('newest')

  // Status filter only makes sense on views that mix statuses
  const showStatus = currentView === 'all' || currentView === 'my_articles'
  const categoryNames = useMemo(() => [...new Set(articles.map((a) => a.category).filter(Boolean))].sort(), [articles])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = articles.filter((a) => (
      (!q || a.title.toLowerCase().includes(q) || (a.summary || '').toLowerCase().includes(q) || (a.category || '').toLowerCase().includes(q))
      && (!status || a.status === status)
      && (!category || a.category === category)
    ))
    if (sort === 'views') return [...list].sort((a, b) => (b.views || 0) - (a.views || 0))
    if (sort === 'title') return [...list].sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [articles, search, status, category, sort])

  const filtered = !!(search || status || category)
  const filterCount = (showStatus && status ? 1 : 0) + (category ? 1 : 0)
  const clear = () => { setSearch(''); setStatus(''); setCategory('') }
  const ViewIcon = VIEW_ICONS[currentView] || Files
  const icon = currentCategory
    ? <CategoryIcon icon={currentCategory.icon} size="w-7 h-7" iconSize="w-3.5 h-3.5" />
    : (
      <span className="w-8 h-8 rounded-lg bg-[#0B3D26]/10 text-[#0B3D26] inline-flex items-center justify-center flex-shrink-0">
        <ViewIcon className="w-4 h-4" />
      </span>
    )
  const prefill = currentCategory ? { category: currentCategory.id } : null
  const isEmpty = articles.length === 0
  const kbHasArticles = (sidebar.counts?.all || 0) > 0

  return (
    <>
      <Head title={viewTitle} />
      <KBLayout sidebar={sidebar} pendingCount={pendingCount}>
        <PageHeader
          title={viewTitle}
          subtitle={currentCategory?.description || `${articles.length} article${articles.length === 1 ? '' : 's'}`}
          icon={icon}
          actions={(
            <ArticleFormButton prefill={prefill} className={PRIMARY_BTN}>
              <Plus className="w-4 h-4" /> New article
              <kbd className="hidden sm:inline ml-1 text-[10px] px-1 rounded bg-white/20 font-sans">C</kbd>
            </ArticleFormButton>
          )}
        >
          {!isEmpty && (
            <div className="px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2 border-t border-gray-100">
              <div className="relative flex-1 min-w-0 sm:flex-none sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search articles"
                  aria-label="Search articles"
                  className={`${CONTROL} w-full pl-8`}
                />
              </div>
              <Popover
                width={280}
                maxHeight={380}
                strategy="fixed"
                showArrow={true}
                trigger={({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    title="Filters"
                    aria-label="Filters"
                    className={`h-8 px-2.5 inline-flex items-center gap-1.5 text-xs rounded-md border transition-colors ${
                      filterCount > 0
                        ? 'border-[#0B3D26] bg-[#0B3D26]/5 text-[#0B3D26]'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {filterCount > 0 && <span className="font-medium">{filterCount}</span>}
                  </button>
                )}
              >
                {() => (
                  <div className="p-4 space-y-3">
                    <div className="text-sm font-medium text-gray-900">Filters</div>
                    {showStatus && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Status</div>
                        <SimpleSelect compact className="w-full" value={status} onChange={setStatus} options={ARTICLE_STATUSES.slice(0, 3)} emptyLabel="Any status" ariaLabel="Filter by status" />
                      </div>
                    )}
                    {!currentCategory && categoryNames.length > 1 && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Category</div>
                        <SimpleSelect compact className="w-full" value={category} onChange={setCategory} options={categoryNames.map((c) => ({ id: c, name: c }))} emptyLabel="Any category" ariaLabel="Filter by category" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Sort by</div>
                      <SimpleSelect compact className="w-full" value={sort} onChange={setSort} options={ARTICLE_SORTS} ariaLabel="Sort articles" />
                    </div>
                  </div>
                )}
              </Popover>
              {filtered && (
                <button onClick={clear} className="h-8 px-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          )}
        </PageHeader>

        {isEmpty ? (
          <KBOnboarding
            category={currentCategory?.id}
            {...(kbHasArticles && {
              title: currentCategory ? `No articles in ${currentCategory.name} yet` : `No ${viewTitle.toLowerCase()} yet`,
              description: 'Write one from scratch, or start from an article support teams commonly publish.',
            })}
          />
        ) : rows.length > 0 ? (
          <>
            <ArticleList articles={rows} />
            {filtered && (
              <p className="px-4 sm:px-6 py-2.5 border-t border-gray-100 text-xs text-gray-500 tabular-nums">
                Showing {rows.length} of {articles.length}
              </p>
            )}
          </>
        ) : (
          <EmptyState
            icon={Search}
            title="No articles match these filters"
            description="Try a different search or clear the filters."
            action={<button onClick={clear} className="text-sm text-[#0B3D26] hover:underline">Clear filters</button>}
          />
        )}
      </KBLayout>
    </>
  )
}
