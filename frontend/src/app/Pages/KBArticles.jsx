import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import AppShell from '../components/AppShell'
import KBSidebar from '../components/KBSidebar'
import ArticleCard from '../components/ArticleCard'
import { Popover } from '../../components/Popover'
import { THEME, COLORS } from '../constants/theme'

export default function KBArticles({
  articles = [], 
  sidebar = { views: [] }, 
  currentView = 'all',
  pendingCount = 0,
  viewTitle = 'All Articles'
}) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (article.category && article.category.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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
            <div className="bg-white border-b border-gray-200 px-6 py-6">
              <div className="">
                <div className="flex items-center gap-3 mb-4">
                  <Link href="/knowledgebase/" className="text-gray-500 hover:text-gray-900 text-sm">
                    Knowledge Base
                  </Link>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-900 text-sm">{viewTitle}</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{viewTitle}</h1>
                
                {/* Search */}
                <div className="relative max-w-xl">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search articles..."
                    className="w-full px-4 py-3 pr-12  border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
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
                  {filteredArticles.map((article) => (
                    <ArticleCard 
                      key={article.id} 
                      article={article} 
                      showStatus 
                      showFeatured 
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white  border border-gray-200 p-12 text-center">
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
        <div className="fixed bottom-6 right-6 z-50">
          <Popover
            width={180}
            maxHeight={200}
            showArrow={false}
            trigger={({ open, toggle }) => (
              <button
                onClick={toggle}
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 ${
                  open ? 'rotate-45' : ''
                }`}
                style={{ backgroundColor: COLORS.primary }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            )}
          >
            {({ close }) => (
              <div className="py-1">
                <Link
                  href="/knowledgebase/article/new/"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-700"
                  onClick={close}
                >
                  <span className="text-lg">📝</span>
                  <span className="text-sm font-medium">New Article</span>
                </Link>
                <Link
                  href="/knowledgebase/categories/"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-700"
                  onClick={close}
                >
                  <span className="text-lg">📁</span>
                  <span className="text-sm font-medium">New Category</span>
                </Link>
              </div>
            )}
          </Popover>
        </div>
      </AppShell>
    </>
  )
}
