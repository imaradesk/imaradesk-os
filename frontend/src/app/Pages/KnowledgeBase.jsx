import React, { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import AppShell from '../components/AppShell'
import KBSidebar from '../components/KBSidebar'
import ArticleCard from '../components/ArticleCard'
import { Popover } from '../../components/Popover'
import { THEME, COLORS } from '../constants/theme'
import LucideIcon from '../components/LucideIcon'
import { FileText, CheckCircle, Eye, FolderOpen, BarChart3, FileEdit } from 'lucide-react'

export default function KnowledgeBase({ 
  articles = [], 
  categories = [], 
  sidebar = { views: [] }, 
  currentView = 'all',
  pendingCount = 0,
  stats = {},
  topArticles = [],
  featuredArticles = []
}) {
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate max views for chart scaling
  const maxViews = Math.max(...topArticles.map(a => a.views), 1)

  const statCards = [
    { label: 'Total Articles', value: stats.totalArticles || 0, icon: FileText, color: 'from-[#4a154b] to-[#825084]' },
    { label: 'Published', value: stats.publishedArticles || 0, icon: CheckCircle, color: 'from-green-500 to-green-600' },
    { label: 'Total Views', value: stats.totalViews?.toLocaleString() || 0, icon: Eye, color: 'from-blue-500 to-blue-600' },
    { label: 'Categories', value: stats.totalCategories || 0, icon: FolderOpen, color: 'from-amber-500 to-amber-600' },
  ]

  return (
    <>
      <Head title="Knowledge Base" />
      <AppShell active="knowledgebase">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          <KBSidebar views={sidebar.views} currentView={currentView} activePage="home" pendingCount={pendingCount} />
          <main className="flex-1 bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-6">
            <div className="">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Knowledge Base</h1>
              <p className="text-gray-500 mb-4">Manage and organize your knowledge base articles</p>
              
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
          <div className="px-6 py-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {statCards.map((stat, idx) => (
                <div
                  key={idx}
                  className=" p-5 border bg-white border-gray-200 text-gray-900 flex items-center justify-between"
                >
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>

                  <div 
                    style={{ backgroundColor: COLORS.primary }}
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-white`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Top Articles Chart */}
              <div className="lg:col-span-2 bg-white  border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">Top Performing Articles</h2>
                  <Link href="/knowledgebase/articles/" className="text-sm text-[#4a154b] hover:underline">
                    View All →
                  </Link>
                </div>
                {topArticles.length > 0 ? (
                  <div className="space-y-4">
                    {topArticles.map((article, idx) => (
                      <div key={article.id} className="flex items-center gap-4">
                        <div className="w-6 text-sm font-semibold text-gray-500">#{idx + 1}</div>
                        <div className="flex-1">
                          <Link 
                            href={`/knowledgebase/article/${article.uuid}`}
                            className="text-sm font-medium text-gray-800 hover:text-[#4a154b] block mb-1 truncate"
                          >
                            {article.title}
                          </Link>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-[#4a154b] to-[#825084] transition-all duration-500"
                                style={{ width: `${(article.views / maxViews) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-16 text-right">{article.views.toLocaleString()} views</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No published articles yet</p>
                  </div>
                )}
              </div>

              {/* Categories Quick View */}
              <div className="bg-white  border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Categories</h2>
                  <Link href="/knowledgebase/categories/" className="text-sm text-[#4a154b] hover:underline">
                    Manage →
                  </Link>
                </div>
                {categories.length > 0 ? (
                  <div className="space-y-2">
                    {categories.slice(0, 6).map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/knowledgebase/articles/?category=${cat.id}`}
                        className="flex items-center justify-between p-3  hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <LucideIcon name={cat.icon} className="w-5 h-5 text-[#4a154b]" />
                          <span className="text-sm font-medium text-gray-700 group-hover:text-[#4a154b]">{cat.name}</span>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{cat.count}</span>
                      </Link>
                    ))}
                    {categories.length > 6 && (
                      <div className="text-center pt-2">
                        <Link href="/knowledgebase/categories/" className="text-sm text-[#4a154b] hover:underline">
                          +{categories.length - 6} more categories
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FolderOpen className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="mb-3">No categories yet</p>
                    <Link href="/knowledgebase/categories/" className={`text-sm px-4 py-2 rounded-md ${THEME.button.primary}`}>
                      Create Category
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Featured/Popular Articles */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Popular Articles</h2>
                <Link href="/knowledgebase/articles/" className="text-sm text-[#4a154b] hover:underline">
                  View All Articles →
                </Link>
              </div>
              {featuredArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {featuredArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200  p-12 text-center">
                  <FileEdit className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No articles yet</h3>
                  <p className="text-gray-500 mb-6">Get started by creating your first knowledge base article</p>
                  <Link
                    href="/knowledgebase/article/new/"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md ${THEME.button.primary}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create First Article
                  </Link>
                </div>
              )}
            </section>
          </div>
        </main>
        </div>

        {/* Floating Action Button with Popover */}
        <div className="fixed bottom-6 right-6 z-50">
          <Popover
            width={180}
            maxHeight={200}
            showArrow={false}
            trigger={({ open, toggle }) => (
              <button
                onClick={toggle}
                className={`${THEME.fab} ${open ? 'rotate-45' : ''} transition-transform duration-200`}
                title="Add New"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          >
            {({ close }) => (
              <div className="py-1">
                <Link
                  href="/knowledgebase/categories/"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  onClick={close}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-[#4a154b]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Category</span>
                </Link>
                <Link
                  href="/knowledgebase/article/new/"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  onClick={close}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-[#4a154b]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Article</span>
                </Link>
              </div>
            )}
          </Popover>
        </div>
      </AppShell>
    </>
  )
}
