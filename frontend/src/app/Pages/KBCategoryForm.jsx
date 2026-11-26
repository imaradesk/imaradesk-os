import React, { useEffect, useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import { Pencil, Trash2, Plus, FolderTree, FolderPlus, FileText, Sparkles, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../utils/axios'
import KBLayout, { PageHeader } from '../components/kb/KBLayout'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal, { ModalBody, ModalButton } from '../components/Modal'
import CategoryForm from '../components/kb/CategoryForm'
import SuggestionsEmptyState from '../components/SuggestionsEmptyState'
import CategoryCreatePopover from '../components/kb/CategoryCreatePopover'
import { CATEGORY_TEMPLATES } from '../components/kb/templates'
import { CategoryIcon, MiniAvatar, Spinner, timeAgo, PRIMARY_BTN, SECONDARY_BTN } from '../components/kb/ui'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'

const LIST_URL = '/knowledgebase/categories/'
const ROW_ACTION = 'w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 transition-colors'
const PAGE_BTN = 'inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

export default function KBCategoryForm({ categories = [], pagination = {}, search: initialSearch = '', totalCategories, sidebar = {}, pendingCount = 0 }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [addingAll, setAddingAll] = useState(false)
  // Create uses CategoryCreatePopover; edit opens the shared Modal
  const [editing, setEditing] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editDirty, setEditDirty] = useState(false)
  const { guard } = useUnsavedChanges(editDirty)
  const closeEdit = () => { if (!savingEdit) guard(() => setEditing(null)) }
  const [search, setSearch] = useState(initialSearch)
  const [searching, setSearching] = useState(false)

  // Search runs on the server (the list is paginated); debounce typing, reset to page 1
  useEffect(() => {
    if (search.trim() === initialSearch) return undefined
    const id = setTimeout(() => {
      router.get(LIST_URL, search.trim() ? { search: search.trim() } : {}, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        onStart: () => setSearching(true),
        onFinish: () => setSearching(false),
      })
    }, 250)
    return () => clearTimeout(id)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Create every suggested category, one request each (the add endpoint takes a single category).
  // Skips names that already exist and keeps going past a failure.
  const addAllSuggestions = async () => {
    setAddingAll(true)
    const existing = new Set(categories.map((c) => c.name.trim().toLowerCase()))
    let added = 0
    let failed = 0
    for (const t of CATEGORY_TEMPLATES) {
      if (existing.has(t.name.toLowerCase())) continue
      const body = new FormData()
      body.append('name', t.name)
      body.append('description', t.description)
      body.append('icon', t.icon)
      try {
        await api.post('/knowledgebase/category/add/', body)
        added += 1
      } catch (error) {
        if (error?.isSessionExpired) { setAddingAll(false); return }
        failed += 1
      }
    }
    if (added) toast.success(`${added} categor${added === 1 ? 'y' : 'ies'} added`)
    if (failed) toast.error(`${failed} categor${failed === 1 ? 'y' : 'ies'} could not be added`)
    router.reload({ onFinish: () => setAddingAll(false) })
  }

  const handleDelete = (categoryId) => {
    toast.promise(
      new Promise((resolve, reject) => {
        router.post(`/knowledgebase/category/${categoryId}/delete/`, {}, {
          headers: { 'X-CSRFToken': window.csrfToken },
          preserveScroll: true,
          onSuccess: () => {
            setDeleteConfirm(null)
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: 'Deleting category...',
        success: 'Category deleted',
        error: 'Failed to delete category',
      },
    )
  }

  const total = totalCategories ?? pagination.total_items ?? categories.length
  const hasNone = total === 0
  const matches = pagination.total_items ?? categories.length
  const page = pagination.current_page || 1
  const pages = pagination.total_pages || 1
  const goToPage = (n) => router.get(LIST_URL, { page: n, ...(initialSearch ? { search: initialSearch } : {}) }, { preserveState: true, preserveScroll: true })
  const toDelete = categories.find((c) => c.id === deleteConfirm)

  return (
    <>
      <Head title="Categories" />
      <KBLayout sidebar={sidebar} pendingCount={pendingCount}>
        <PageHeader
          title="Categories"
          subtitle={`${total} categor${total === 1 ? 'y' : 'ies'} · group articles by topic in the portal`}
          icon={(
            <span className="w-8 h-8 rounded-lg bg-[#0B3D26]/10 text-[#0B3D26] inline-flex items-center justify-center flex-shrink-0">
              <FolderTree className="w-4 h-4" />
            </span>
          )}
        />

        {hasNone ? (
          <SuggestionsEmptyState
            surface="bg-white"
            title="Let's create your first category"
            description="Categories organise articles in the support portal so customers can browse answers by topic."
            action={(
              <CategoryCreatePopover
                trigger={({ open, toggle }) => (
                  <button type="button" onClick={toggle} aria-expanded={open} className={`${PRIMARY_BTN} !h-9 !px-4`}>
                    <Plus className="w-4 h-4" /> Create new
                  </button>
                )}
              />
            )}
            layout="pills"
            suggestionsDescription="Pick one to add it, or add them all at once"
            suggestions={CATEGORY_TEMPLATES.map((t) => ({
              id: t.id,
              title: t.name,
              meta: t.description,
              icon: <CategoryIcon icon={t.icon} size="w-5 h-5" iconSize="w-3 h-3" className="bg-[#0B3D26]/10 text-[#0B3D26] !rounded-full" />,
              disabled: addingAll,
              wrap: (renderPill) => <CategoryCreatePopover prefill={t} trigger={({ toggle }) => renderPill(toggle)} />,
            }))}
            footer={(
              <button type="button" onClick={addAllSuggestions} disabled={addingAll} className={SECONDARY_BTN}>
                {addingAll ? <Spinner className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-[#0B3D26]" />}
                {addingAll ? 'Adding…' : `Add all ${CATEGORY_TEMPLATES.length}`}
              </button>
            )}
          />
        ) : (
          // Same look as Settings → Team → Users: toolbar, rounded table card, Prev/Next pager
          <div className="flex-1 bg-gray-50">
            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setSearch('') }}
                    placeholder="Search name or description"
                    aria-label="Search categories"
                    className="w-full h-9 pl-9 pr-8 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26] transition-shadow"
                  />
                  {searching ? (
                    <Spinner className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  ) : search && (
                    <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {initialSearch && (
                  <span className="text-xs text-gray-500" aria-live="polite">
                    {matches} match{matches === 1 ? '' : 'es'}
                  </span>
                )}

                <CategoryCreatePopover
                  className="md:ml-auto self-start md:self-auto"
                  trigger={({ open, toggle }) => (
                    <button
                      type="button"
                      onClick={toggle}
                      aria-expanded={open}
                      className="group inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-medium shadow-sm transition-all active:scale-[0.97]"
                    >
                      <FolderPlus className="w-4 h-4 transition-transform group-hover:scale-110" /> New category
                    </button>
                  )}
                />
              </div>

              {/* Content */}
              {categories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-14 px-6 text-center animate-portalRise">
                  <span className="mx-auto mb-3 w-12 h-12 rounded-xl bg-gray-100 text-gray-400 inline-flex items-center justify-center">
                    <Search className="w-6 h-6" strokeWidth={1.5} />
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900">No matching categories</h3>
                  <p className="mt-1 text-sm text-gray-500">Nothing matches “{initialSearch}”. Try a different word.</p>
                  <div className="mt-4">
                    <button type="button" onClick={() => setSearch('')} className="h-8 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Clear search
                    </button>
                  </div>
                </div>
              ) : (
                <div key="list" className="rounded-2xl border border-gray-200 bg-white animate-fadeIn">
                  <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_minmax(0,0.7fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_auto] gap-4 px-5 py-2.5 border-b border-gray-100 bg-gray-50 rounded-t-2xl text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    <span>Category</span><span>Articles</span><span>Created by</span><span>Created</span><span className="w-[4.5rem]" />
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {categories.map((cat, index) => (
                      <li
                        key={cat.id}
                        style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
                        className="group grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2.2fr)_minmax(0,0.7fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_auto] items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3 last:rounded-b-2xl hover:bg-gray-50 transition-colors animate-portalRise"
                      >
                        <Link href={`/knowledgebase/categories/${cat.id}/`} className="flex items-center gap-3 min-w-0">
                          <CategoryIcon icon={cat.icon} size="w-9 h-9" className="bg-[#0B3D26]/10 text-[#0B3D26] transition-transform duration-300 group-hover:scale-105" />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-gray-900 truncate group-hover:text-[#0B3D26] transition-colors">{cat.name}</span>
                            <span className="block text-xs text-gray-500 truncate">{cat.description || 'No description'}</span>
                          </span>
                        </Link>
                        <div className="hidden md:block">
                          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-[#0B3D26]/10 text-[#0B3D26] text-[11px] font-medium tabular-nums whitespace-nowrap">
                            <FileText className="w-3 h-3" /> {cat.article_count}
                          </span>
                        </div>
                        <div className="hidden md:flex items-center gap-2 min-w-0">
                          <MiniAvatar user={cat.created_by && cat.created_by !== 'Unknown' ? { name: cat.created_by } : null} />
                          <span className="text-sm text-gray-600 truncate">{cat.created_by || 'Unknown'}</span>
                        </div>
                        <div className="hidden md:block text-sm text-gray-500">{timeAgo(cat.created_at)}</div>
                        <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setEditing(cat)}
                            className={`${ROW_ACTION} hover:text-blue-600 hover:bg-blue-50`}
                            aria-label={`Edit ${cat.name}`}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(cat.id)}
                            className={`${ROW_ACTION} hover:text-red-600 hover:bg-red-50`}
                            aria-label={`Delete ${cat.name}`}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="md:hidden col-span-2 flex flex-wrap items-center gap-1.5 pl-12 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-[#0B3D26]/10 text-[#0B3D26] text-[11px] font-medium">
                            <FileText className="w-3 h-3" /> {cat.article_count} article{cat.article_count === 1 ? '' : 's'}
                          </span>
                          <span>{timeAgo(cat.created_at)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <p className="text-gray-500">
                    Page <span className="font-medium text-gray-900">{page}</span> of {pages} · {matches} categor{matches === 1 ? 'y' : 'ies'}
                  </p>
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={!pagination.has_previous} onClick={() => goToPage(page - 1)} className={PAGE_BTN}>
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <button type="button" disabled={!pagination.has_next} onClick={() => goToPage(page + 1)} className={PAGE_BTN}>
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Modal
          isOpen={!!editing}
          onClose={closeEdit}
          title="Edit category"
          description={editing?.name}
          icon={Pencil}
          size="lg"
          footer={(
            <>
              <ModalButton onClick={closeEdit} disabled={savingEdit}>Cancel</ModalButton>
              <ModalButton variant="primary" type="submit" form="kb-category-edit" loading={savingEdit}>Save changes</ModalButton>
            </>
          )}
        >
          {editing && (
            <ModalBody>
              <CategoryForm
                key={editing.id}
                formId="kb-category-edit"
                category={{ id: editing.id, name: editing.name, description: editing.description || '', icon: editing.icon || 'Folder' }}
                onSavingChange={setSavingEdit}
                onDirtyChange={setEditDirty}
                onDone={() => { setEditDirty(false); setEditing(null) }}
              />
            </ModalBody>
          )}
        </Modal>

        <ConfirmDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm)}
          title="Delete category"
          message={toDelete?.article_count
            ? `“${toDelete.name}” has ${toDelete.article_count} article${toDelete.article_count === 1 ? '' : 's'}. They'll become uncategorized. This can't be undone.`
            : 'Are you sure you want to delete this category? This can’t be undone.'}
          confirmText="Delete"
        />
      </KBLayout>
    </>
  )
}
