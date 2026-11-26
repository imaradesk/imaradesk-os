import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { BookOpen, Search } from 'lucide-react'
import PortalShell from '../components/portal/PortalShell'
import {
  BTN_PRIMARY, BTN_SECONDARY, PORTAL_CARD, PortalArticleCard, PortalEmpty, PortalHero, PortalSearch, Reveal,
} from '../components/portal/PortalUI'

export default function PortalKBSearch({ query, results = [], tenant_name }) {
  const [searchQuery, setSearchQuery] = useState(query || '')

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.visit(`/portal/kb-search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <>
      <Head title={`Search: ${query || 'Knowledge base'}`} />

      <PortalShell tenantName={tenant_name}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-4">
          <PortalHero
            compact
            eyebrow="Knowledge base"
            title="Search articles"
            description="Find answers from our support documentation."
          >
            <PortalSearch
              size="lg"
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
              placeholder="Search for answers…"
            />
          </PortalHero>

          <div className="mt-6">
            {query ? (
              <>
                <div className="flex items-end justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 tracking-tight">
                      Results for “{query}”
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {results.length} {results.length === 1 ? 'article' : 'articles'} found
                    </p>
                  </div>
                  <Link href="/portal/kb/" className="text-xs font-medium text-[#0B3D26] hover:underline">Browse all</Link>
                </div>

                {results.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {results.map((article, i) => (
                      <Reveal key={article.uuid} index={Math.min(i, 9)} step={50} className="flex">
                        <PortalArticleCard article={article} />
                      </Reveal>
                    ))}
                  </div>
                ) : (
                  <div className={PORTAL_CARD}>
                    <PortalEmpty
                      icon={Search}
                      title="No results found"
                      description={`We could not find articles matching “${query}”. Try different keywords or ask our support team.`}
                      action={
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Link href="/portal/kb/" className={BTN_SECONDARY}>Browse articles</Link>
                          <Link href="/portal/create-ticket/" className={BTN_PRIMARY}>Submit a ticket</Link>
                        </div>
                      }
                    />
                  </div>
                )}
              </>
            ) : (
              <div className={PORTAL_CARD}>
                <PortalEmpty
                  icon={BookOpen}
                  title="Start your search"
                  description="Enter a keyword above to search our knowledge base."
                  action={<Link href="/portal/kb/" className={BTN_SECONDARY}>Browse all articles</Link>}
                />
              </div>
            )}
          </div>
        </div>
      </PortalShell>
    </>
  )
}
