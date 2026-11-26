import React, { useMemo, useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import { Plus, MoreHorizontal, Pencil, Trash2, CalendarClock, Eye, Search, X, FolderTree, SlidersHorizontal } from 'lucide-react'
import KBLayout, { PageHeader, ArticleFormButton } from '../components/kb/KBLayout'
import ArticleList from '../components/kb/ArticleList'
import KBOnboarding from '../components/kb/KBOnboarding'
import CategoryForm from '../components/kb/CategoryForm'
import DropdownMenu from '../components/DropdownMenu'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal, { ModalBody, ModalButton } from '../components/Modal'
import { ProgressBar } from '../components/tasks/ui'
import { ARTICLE_STATUSES, ARTICLE_SORTS, CONTROL } from '../components/kb/constants'
import {
  CategoryIcon, ArticleStatusIcon, ArticleThumb, MiniAvatar, EmptyState, timeAgo, formatLongDate, formatCount, PRIMARY_BTN,
} from '../components/kb/ui'
import Tabs from '../components/Tabs'
import SimpleSelect from '../components/SimpleSelect'
import { Popover } from '../../components/Popover'

const BAR_COLORS = { published: 'bg-emerald-500', pending: 'bg-amber-400', draft: 'bg-gray-300', rejected: 'bg-red-400', archived: 'bg-slate-400' }

export default function KBCategoryView(props) {
  const { category, sidebar = {}, pendingCount = 0 } = props
  return (
    <>
      <Head title={category.name} />
      <KBLayout sidebar={sidebar} pendingCount={pendingCount}>
        <CategoryContent {...props} />
      </KBLayout>
    </>
  )
}

function CategoryContent({ category, tab, sidebar, ...rest }) {
  const [editOpen, setEditOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const base = `/knowledgebase/categories/${category.id}`
  const { counts } = category
  const prefill = { category: category.id }

  const remove = () => {
    router.post(`/knowledgebase/category/${category.id}/delete/`, {}, {
      onSuccess: () => toast.success(`“${category.name}” deleted`),
      onError: () => toast.error('Could not delete the category'),
    })
  }

  const tabs = [
    { id: 'overview', label: 'Overview', href: `${base}/` },
    { id: 'articles', label: 'Articles', href: `${base}/articles/`, count: counts.total },
  ]

  return (
    <>
      <PageHeader
        title={category.name}
        icon={<CategoryIcon icon={category.icon} size="w-8 h-8" iconSize="w-4 h-4" />}
        back={(
          <Link href="/knowledgebase/categories/" className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 pr-2 mr-1 border-r border-gray-200">
            <FolderTree className="w-3.5 h-3.5" /> Categories
          </Link>
        )}
        actions={(
          <>
            <ArticleFormButton prefill={prefill} className={PRIMARY_BTN}>
              <Plus className="w-4 h-4" /> New article
            </ArticleFormButton>
            <DropdownMenu
              width={200}
              trigger={({ toggle, open }) => (
                <button onClick={toggle} aria-label="Category actions" aria-expanded={open} className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              )}
              items={[
                { label: 'Edit category', icon: Pencil, onClick: () => setEditOpen(true) },
                { type: 'divider' },
                { label: 'Delete category', icon: Trash2, danger: true, onClick: () => setConfirmDelete(true) },
              ]}
            />
          </>
        )}
      >
        <div className="px-4 sm:px-6 pb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <MiniAvatar user={category.created_by ? { name: category.created_by } : null} />
            {category.created_by || 'Unknown'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" /> Created {formatLongDate(category.created_at)}
          </span>
          <ProgressBar value={category.progress} className="w-40" />
          <span>{counts.published}/{counts.total} published</span>
          <span className="inline-flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {formatCount(counts.views)} views</span>
        </div>
        <div className="px-4 sm:px-6 py-2 border-t border-gray-100">
          <Tabs label="Category sections" active={tab} tabs={tabs} />
        </div>
      </PageHeader>

      {tab === 'overview' && <OverviewTab category={category} {...rest} />}
      {tab === 'articles' && <ArticlesTab category={category} kbHasArticles={(sidebar?.counts?.all || 0) > 0} {...rest} />}

      <Modal
        isOpen={editOpen}
        onClose={() => !savingEdit && setEditOpen(false)}
        title="Edit category"
        description={category.name}
        icon={Pencil}
        size="lg"
        footer={(
          <>
            <ModalButton onClick={() => setEditOpen(false)} disabled={savingEdit}>Cancel</ModalButton>
            <ModalButton variant="primary" type="submit" form="kb-category-edit" loading={savingEdit}>Save changes</ModalButton>
          </>
        )}
      >
        {editOpen && (
          <ModalBody>
            <CategoryForm
              formId="kb-category-edit"
              category={categoryFields(category)}
              onSavingChange={setSavingEdit}
              onDone={() => setEditOpen(false)}
            />
          </ModalBody>
        )}
      </Modal>
      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Delete category?"
        message={counts.total
          ? `“${category.name}” has ${counts.total} article${counts.total === 1 ? '' : 's'}. They'll become uncategorized. This can't be undone.`
          : 'Are you sure you want to delete this category? This can’t be undone.'}
        confirmText="Delete"
      />
    </>
  )
}

const categoryFields = (c) => ({ id: c.id, name: c.name, description: c.description || '', icon: c.icon || 'Folder' })

// ─────────────────────────────────────────────
// Overview
// ─────────────────────────────────────────────

function OverviewTab({ category, statusBreakdown = [], topArticles = [], recentArticles = [] }) {
  const { counts } = category
  const articlesUrl = `/knowledgebase/categories/${category.id}/articles/`
  const stats = [
    { label: 'Total articles', value: counts.total },
    { label: 'Published', value: counts.published },
    { label: 'Drafts', value: counts.draft },
    { label: 'In review', value: counts.pending, warn: counts.pending > 0 },
  ]
  const totalForBar = statusBreakdown.reduce((n, s) => n + s.count, 0)

  return (
    <div className="p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-[1fr_22rem] gap-6 max-w-6xl">
      <div className="space-y-6 min-w-0">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">About</h2>
          {category.description ? (
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{category.description}</p>
          ) : (
            <p className="text-sm text-gray-400">No description yet.</p>
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Articles</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 border border-gray-200 rounded-lg divide-x divide-gray-200 overflow-hidden">
            {stats.map((s) => (
              <div key={s.label} className="px-4 py-3">
                <div className={`text-xl font-semibold tabular-nums ${s.warn ? 'text-amber-600' : 'text-gray-900'}`}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
          {totalForBar > 0 && (
            <div className="mt-3">
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-100" aria-hidden="true">
                {statusBreakdown.filter((s) => s.count).map((s) => (
                  <div key={s.status} className={BAR_COLORS[s.status]} style={{ width: `${(s.count / totalForBar) * 100}%` }} title={`${s.label}: ${s.count}`} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {statusBreakdown.map((s) => (
                  <Link key={s.status} href={`${articlesUrl}?status=${s.status}`} className="inline-flex items-center gap-1.5 hover:text-gray-800">
                    <ArticleStatusIcon status={s.status} /> {s.label} <span className="tabular-nums">{s.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Most viewed</h2>
            <Link href={`${articlesUrl}?sort=views`} className="text-xs text-gray-500 hover:text-gray-800">View all</Link>
          </div>
          {topArticles.length === 0 ? (
            <p className="text-sm text-gray-400">{counts.total ? 'No views yet.' : 'No articles in this category yet.'}</p>
          ) : (
            <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {topArticles.map((a) => (
                <li key={a.uuid} className="flex items-center gap-3 px-3 h-10">
                  <ArticleStatusIcon status={a.status} />
                  <Link href={`/knowledgebase/article/${a.uuid}/`} className="flex-1 truncate text-sm text-gray-900 hover:text-[#0B3D26]">{a.title}</Link>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 tabular-nums"><Eye className="w-3.5 h-3.5" /> {formatCount(a.views)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="min-w-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Recently updated</h2>
        {recentArticles.length === 0 ? (
          <div className="text-sm text-gray-400">
            <p>Nothing here yet.</p>
            <ArticleFormButton prefill={{ category: category.id }} className="mt-2 inline-flex items-center gap-1 text-sm text-[#0B3D26] hover:underline">
              <Plus className="w-3.5 h-3.5" /> Write the first article
            </ArticleFormButton>
          </div>
        ) : (
          <ol className="relative border-l border-gray-200 ml-1.5 space-y-3">
            {recentArticles.map((a) => (
              <li key={a.uuid} className="pl-4 relative">
                <span className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-gray-300 ring-2 ring-white" />
                <div className="flex items-start gap-2">
                  <ArticleThumb article={a} size="w-6 h-6" />
                  <div className="min-w-0">
                    <Link href={`/knowledgebase/article/${a.uuid}/`} className="block text-sm font-medium text-gray-900 hover:text-[#0B3D26] leading-snug truncate">{a.title}</Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.author && a.author !== 'Unknown' ? `${a.author} · ` : ''}{timeAgo(a.updated_at || a.created_at)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────
// Articles
// ─────────────────────────────────────────────

const queryParam = (key, fallback = '') => {
  if (typeof window === 'undefined') return fallback
  return new URLSearchParams(window.location.search).get(key) || fallback
}

function ArticlesTab({ category, articles = [], kbHasArticles }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(() => queryParam('status'))
  const [sort, setSort] = useState(() => queryParam('sort', 'newest'))

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = articles.filter((a) => (
      (!q || a.title.toLowerCase().includes(q) || (a.summary || '').toLowerCase().includes(q))
      && (!status || a.status === status)
    ))
    if (sort === 'views') return [...list].sort((a, b) => (b.views || 0) - (a.views || 0))
    if (sort === 'title') return [...list].sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [articles, search, status, sort])

  const filtered = !!(search || status)
  const clear = () => { setSearch(''); setStatus('') }

  if (articles.length === 0) {
    return (
      <KBOnboarding
        category={category.id}
        {...(kbHasArticles && {
          title: `No articles in ${category.name} yet`,
          description: 'Write one from scratch, or start from an article support teams commonly publish.',
        })}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-0 sm:flex-none sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${category.name}`}
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
                status
                  ? 'border-[#0B3D26] bg-[#0B3D26]/5 text-[#0B3D26]'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {status && <span className="font-medium">1</span>}
            </button>
          )}
        >
          {() => (
            <div className="p-4 space-y-3">
              <div className="text-sm font-medium text-gray-900">Filters</div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Status</div>
                <SimpleSelect compact className="w-full" value={status} onChange={setStatus} options={ARTICLE_STATUSES.slice(0, 3)} emptyLabel="Any status" ariaLabel="Filter by status" />
              </div>
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

      {rows.length > 0 ? (
        <div className="border-t border-gray-100">
          <ArticleList articles={rows} />
          {filtered && (
            <p className="px-4 sm:px-6 py-2.5 border-t border-gray-100 text-xs text-gray-500 tabular-nums">
              Showing {rows.length} of {articles.length}
            </p>
          )}
        </div>
      ) : (
        <div className="border-t border-gray-100">
          <EmptyState
            icon={Search}
            title="No articles match these filters"
            description="Try a different search or clear the filters."
            action={<button onClick={clear} className="text-sm text-[#0B3D26] hover:underline">Clear filters</button>}
          />
        </div>
      )}
    </div>
  )
}
