import React, { createContext, useContext, useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../utils/axios'
import AppShell from '../AppShell'
import Drawer from '../Drawer'
import KBSidebar from './KBSidebar'
import ArticleFormDrawer from './ArticleFormDrawer'
import { ARTICLE_TEMPLATE_MAP } from './templates'
import { apiError } from './ui'

const KBLayoutContext = createContext({ openNav: () => {}, openArticleForm: () => {} })

export const useKBLayout = () => useContext(KBLayoutContext)

/**
 * Knowledge base workspace frame: global AppShell + nested workspace sidebar,
 * the same shape as TasksLayout.
 * Desktop shows a persistent sidebar; mobile/tablet uses a left drawer.
 * The create/edit article drawer lives here so any page can open it via
 * useKBLayout().openArticleForm(article?, prefill?) or <ArticleFormButton>.
 * `?new=1` opens it on load (with optional `template` / `category` prefill);
 * `?edit=1` opens it for `current` (the article the page shows).
 * Keyboard: "c" new article.
 */
export default function KBLayout({ sidebar = {}, pendingCount, current = null, children }) {
  const [navOpen, setNavOpen] = useState(false)
  // { key, article } while the form drawer is open; key remounts the form on every opening
  const [formState, setFormState] = useState({ key: 0, article: null, open: false })

  const openArticleForm = async (article = null, prefill = null) => {
    let full = article ? { ...article } : prefill
    // List rows don't carry the article body; fetch it before editing
    if (article?.uuid && article.content === undefined) {
      try {
        const { data } = await api.get(`/knowledgebase/article/${article.uuid}/form-data/`)
        full = data.article
      } catch (error) {
        toast.error(apiError(error, 'Could not load the article'))
        return
      }
    }
    setFormState((s) => ({ key: s.key + 1, article: full, open: true }))
  }
  const closeArticleForm = () => setFormState((s) => ({ ...s, open: false }))

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isNew = params.get('new') === '1'
    const isEdit = params.get('edit') === '1' && current
    if (!isNew && !isEdit) return
    const template = ARTICLE_TEMPLATE_MAP[params.get('template')]
    const category = params.get('category')
    ;['new', 'edit', 'template'].forEach((k) => params.delete(k))
    const qs = params.toString()
    window.history.replaceState(window.history.state, '', window.location.pathname + (qs ? `?${qs}` : ''))
    if (isEdit) openArticleForm(current)
    else openArticleForm(null, newArticlePrefill({ template, category }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target.tagName || '').toLowerCase()
      if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return
      if (document.querySelector('[role="dialog"], .fixed.inset-0')) return
      if (e.key === 'c') { e.preventDefault(); openArticleForm() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const ctx = { openNav: () => setNavOpen(true), openArticleForm }

  return (
    <AppShell active="knowledgebase" fixedHeight>
      <KBLayoutContext.Provider value={ctx}>
        <div className="flex flex-1 min-h-0">
          <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 border-r border-gray-200 bg-gray-50 min-h-0">
            <KBSidebar sidebar={sidebar} pendingCount={pendingCount} />
          </aside>
          <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-white overflow-y-auto">
            {children}
          </div>
        </div>

        <Drawer isOpen={navOpen} onClose={() => setNavOpen(false)} position="left" width="max-w-[18rem]" title="Knowledge base">
          <div className="flex-1 overflow-hidden bg-gray-50">
            <KBSidebar sidebar={sidebar} pendingCount={pendingCount} onNavigate={() => setNavOpen(false)} />
          </div>
        </Drawer>

        <ArticleFormDrawer
          key={formState.key}
          isOpen={formState.open}
          article={formState.article}
          categories={sidebar.categories || []}
          requireApproval={!!sidebar.requireApproval}
          onClose={closeArticleForm}
        />
      </KBLayoutContext.Provider>
    </AppShell>
  )
}

/** Initial values for a new article from a starter template and/or a category id. */
export function newArticlePrefill({ template, category } = {}) {
  const prefill = {
    ...(template ? { title: template.title, summary: template.summary, content: template.content, tags: template.tags } : {}),
    ...(category ? { category: Number(category) } : {}),
  }
  return Object.keys(prefill).length ? prefill : null
}

/** Button that opens the article form drawer; pass `article` to edit it, or `prefill` for a new one. */
export function ArticleFormButton({ article = null, prefill = null, className, children, ...props }) {
  const { openArticleForm } = useKBLayout()
  return <button type="button" onClick={() => openArticleForm(article, prefill)} className={className} {...props}>{children}</button>
}

/** Compact page header with the mobile navigation trigger. */
export function PageHeader({ title, subtitle, icon, actions, back, children }) {
  const { openNav } = useKBLayout()
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-20">
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 min-h-[56px]">
        <button
          onClick={openNav}
          className="lg:hidden -ml-1 p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
          aria-label="Open knowledge base navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        {back}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {icon}
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900 truncate">{title}</h1>
            {subtitle && <div className="text-xs text-gray-500 truncate">{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {children}
    </header>
  )
}
