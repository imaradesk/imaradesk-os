import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { BookOpen, ChevronDown, FolderOpen } from 'lucide-react'
import LucideIcon from '../components/LucideIcon'
import PortalShell from '../components/portal/PortalShell'
import {
  BTN_PRIMARY, PORTAL_CARD, PortalArticleCard, PortalEmpty, PortalHero, PortalSearch, Reveal,
} from '../components/portal/PortalUI'

export default function CustomerPortalKBList({ portal_settings, categories = [], articles = [], selectedCategory = null }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false)

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.visit(`/portal/kb-search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleCategorySelect = (categoryId) => {
    router.visit(categoryId ? `/portal/kb/?category=${categoryId}` : '/portal/kb/')
  }

  const tenantName = portal_settings?.tenant_name
  const activeCategory = categories.find((c) => c.id === selectedCategory)

  return (
    <>
      <Head title="Knowledge Base" />

      <PortalShell tenantName={tenantName}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
          <PortalHero
            compact
            eyebrow="Self service"
            title="Knowledge base"
            description="Browse guides, answers and how-tos from our support team."
          >
            <div className="max-w-xl">
              <PortalSearch
                size="lg"
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearch}
                placeholder="Search articles…"
              />
            </div>
          </PortalHero>

          <div className="mt-5 flex flex-col lg:flex-row gap-5 items-start">
            {/* Categories */}
            <aside className="w-full lg:w-60 flex-shrink-0">
              <button
                type="button"
                onClick={() => setMobileCategoriesOpen((v) => !v)}
                aria-expanded={mobileCategoriesOpen}
                className="lg:hidden w-full h-10 px-3 rounded-xl bg-white border border-gray-200 flex items-center justify-between text-sm text-gray-700 shadow-sm"
              >
                <span className="inline-flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-gray-400" />
                  {activeCategory?.name || 'All categories'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${mobileCategoriesOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className={`${mobileCategoriesOpen ? 'block' : 'hidden'} lg:block mt-2 lg:mt-0`}>
                <div className={`${PORTAL_CARD} p-2 lg:sticky lg:top-20`}>
                  <p className="px-2.5 pt-1.5 pb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">Categories</p>

                  <button
                    type="button"
                    onClick={() => handleCategorySelect(null)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                      !selectedCategory ? 'bg-[#0B3D26]/10 text-[#0B3D26] font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <BookOpen className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">All articles</span>
                    </span>
                    <span className="text-[11px] tabular-nums text-gray-400">{articles.length}</span>
                  </button>

                  {categories.map((category) => {
                    const active = selectedCategory === category.id
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategorySelect(category.id)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                          active ? 'bg-[#0B3D26]/10 text-[#0B3D26] font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <LucideIcon name={category.icon || 'Folder'} className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{category.name}</span>
                        </span>
                        <span className="text-[11px] tabular-nums text-gray-400">{category.article_count || 0}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </aside>

            {/* Articles */}
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-end justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 tracking-tight">
                    {activeCategory?.name || 'All articles'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {articles.length} {articles.length === 1 ? 'article' : 'articles'}
                  </p>
                </div>
              </div>

              {articles.length === 0 ? (
                <div className={PORTAL_CARD}>
                  <PortalEmpty
                    icon={BookOpen}
                    title="No articles found"
                    description="Try a different category, or search for a specific keyword."
                    action={<Link href="/portal/kb-search/" className={BTN_PRIMARY}>Search the knowledge base</Link>}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {articles.map((article, i) => (
                    <Reveal key={article.uuid} index={Math.min(i, 9)} step={50} className="flex">
                      <PortalArticleCard article={article} />
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </PortalShell>
    </>
  )
}
