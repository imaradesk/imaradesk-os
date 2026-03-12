import React, { useState, useRef, useEffect } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import AppShell from '../components/AppShell'
import KBSidebar from '../components/KBSidebar'
import { THEME, COLORS } from '../constants/theme'

const statusColors = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  published: { bg: 'bg-green-100', text: 'text-green-700', label: 'Published' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
}

export default function KBArticles({ 
  articles = [], 
  sidebar = { views: [] }, 
  currentView = 'all',
  pendingCount = 0,
  viewTitle = 'All Articles'
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFabMenu, setShowFabMenu] = useState(false)
  const fabMenuRef = useRef(null)

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (article.category && article.category.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fabMenuRef.current && !fabMenuRef.current.contains(event.target)) {
        setShowFabMenu(false)
      }
    }

    if (showFabMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFabMenu])

  return (
    <>
      <Head title={`KB - ${viewTitle}`} />
      <AppShell active="knowledgebase">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          <KBSidebar 
            views={sidebar.views} 
            currentView={currentView} 
            activePage="articles" 
            pendingCount={pendingCount} 
          />
          <main className="flex-1 bg-gray-50">
            {/* Header */}
            <div className={`${THEME.gradient} text-white px-6 py-8`}>
              <div className="">
                <div className="flex items-center gap-3 mb-4">
                  <Link href="/knowledgebase/" className="text-white/80 hover:text-white text-sm">
                    Knowledge Base
                  </Link>
                  <span className="text-white/50">/</span>
                  <span className="text-white text-sm">{viewTitle}</span>
                </div>
                <h1 className="text-2xl font-bold mb-4">{viewTitle}</h1>
                
                {/* Search */}
                <div className="relative max-w-xl">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search articles..."
                    className="w-full px-4 py-3 pr-12 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#825084]"
                  />
                  <svg className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-8">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-gray-600">
                  {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
                </p>
                <Link
                  href="/knowledgebase/article/new/"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md ${THEME.button.primary}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  New Article
                </Link>
              </div>

              {filteredArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredArticles.map((article) => {
                    const status = statusColors[article.status] || statusColors.draft
                    return (
                      <Link
                        key={article.id}
                        href={`/knowledgebase/article/${article.id}`}
                        className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group"
                      >
                        {/* Article Header/Image */}
                        <div className="h-36 relative overflow-hidden">
                          <img 
                            src="/static/assets/article.jpg" 
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                          {article.views > 0 && (
                            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-white text-xs font-medium">{article.views.toLocaleString()}</span>
                            </div>
                          )}
                          {article.featured && (
                            <div className="absolute top-3 left-3 bg-yellow-500 px-2 py-0.5 rounded-full">
                              <span className="text-white text-xs font-medium">⭐ Featured</span>
                            </div>
                          )}
                        </div>

                        {/* Article Content */}
                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e6f0f1] text-[#4a154b]">
                              {article.category || 'General'}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                              {status.label}
                            </span>
                          </div>

                          <h3 className="font-bold text-gray-900 text-base mb-3 leading-tight line-clamp-2 group-hover:text-[#4a154b] transition-colors">
                            {article.title}
                          </h3>

                          {article.summary && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                              {article.summary}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <span className="text-xs text-gray-600 truncate max-w-[100px]">
                                {article.author || 'Unknown'}
                              </span>
                            </div>
                            {article.updated_at && (
                              <span className="text-xs text-gray-500">
                                {article.updated_at}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery 
                      ? 'Try adjusting your search query.' 
                      : 'Get started by creating your first knowledge base article.'}
                  </p>
                  <Link
                    href="/knowledgebase/article/new/"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md ${THEME.button.primary}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create Article
                  </Link>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Floating Action Button */}
        <div ref={fabMenuRef} className="fixed bottom-6 right-6 z-50">
          {showFabMenu && (
            <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-48 mb-2">
              <Link
                href="/knowledgebase/article/new/"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-700"
              >
                <span className="text-lg">📝</span>
                <span className="text-sm font-medium">New Article</span>
              </Link>
              <Link
                href="/knowledgebase/category/new/"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-700"
              >
                <span className="text-lg">📁</span>
                <span className="text-sm font-medium">New Category</span>
              </Link>
            </div>
          )}
          <button
            onClick={() => setShowFabMenu(!showFabMenu)}
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 ${
              showFabMenu ? 'rotate-45' : ''
            }`}
            style={{ backgroundColor: COLORS.primary }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </AppShell>
    </>
  )
}
