import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { THEME, COLORS } from '../constants/theme';

export default function CustomerPortalKBList({ portal_settings, categories = [], articles = [], selectedCategory = null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.visit(`/portal/kb-search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleCategorySelect = (categoryId) => {
    if (categoryId) {
      router.visit(`/portal/kb/?category=${categoryId}`);
    } else {
      router.visit('/portal/kb/');
    }
  };

  return (
    <>
      <Head title="Knowledge Base" />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="relative py-8 md:py-12 lg:py-16 px-4 md:px-8 lg:px-12 overflow-hidden" style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)` }}>
          <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-end opacity-20 hidden md:flex">
            {[...Array(7)].map((_, i) => (
              <svg key={i} className="h-full" style={{ width: '80px', marginLeft: '-20px' }} viewBox="0 0 100 500">
                <polygon points="0,0 100,250 0,500" fill="white" opacity="0.3" />
              </svg>
            ))}
          </div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="mb-6">
              <Link href="/portal/" className="text-white hover:text-gray-200 inline-flex items-center gap-2 text-sm mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Portal
              </Link>
            </div>
            
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 md:mb-6">Knowledge Base</h1>
            
            <div className="relative max-w-2xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                placeholder="Search articles..."
                className="w-full px-4 md:px-6 py-3 md:py-4 pr-12 rounded-lg text-gray-800 text-base md:text-lg focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-30 shadow-lg"
              />
              <button
                onClick={handleSearch}
                className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white transition-opacity hover:opacity-80"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-6 md:py-8">
          {/* Mobile Categories Toggle */}
          <button
            onClick={() => setMobileCategoriesOpen(!mobileCategoriesOpen)}
            className="lg:hidden w-full mb-4 px-4 py-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between text-gray-700 font-medium"
          >
            <span>Categories</span>
            <svg className={`w-5 h-5 transition-transform ${mobileCategoriesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className="flex gap-6 md:gap-8">
            {/* Left Sidebar - Categories */}
            <aside className={`${mobileCategoriesOpen ? 'block' : 'hidden'} lg:block w-full lg:w-80 flex-shrink-0 mb-6 lg:mb-0`}>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">KB Categories</h2>
                </div>
                
                <nav className="p-2">
                  {/* All Articles */}
                  <button
                    onClick={() => handleCategorySelect(null)}
                    className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${
                      !selectedCategory ? 'text-white' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    style={!selectedCategory ? { backgroundColor: COLORS.primary } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                      </svg>
                      <span className="font-medium">All Articles</span>
                    </div>
                    <span className={`inline-flex items-center justify-center rounded-full text-xs px-2.5 py-1 font-medium ${
                      !selectedCategory ? 'bg-white bg-opacity-20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {articles.length}
                    </span>
                  </button>

                  {/* Categories */}
                  <div className="mt-1">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${
                          selectedCategory === category.id ? 'text-white' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        style={selectedCategory === category.id ? { backgroundColor: COLORS.primary } : {}}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{category.icon || '📁'}</span>
                          <span className="font-medium truncate">{category.name}</span>
                        </div>
                        <span className={`inline-flex items-center justify-center rounded-full text-xs px-2.5 py-1 font-medium ${
                          selectedCategory === category.id ? 'bg-white bg-opacity-20 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {category.article_count || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </nav>
              </div>
            </aside>

            {/* Right Content - Articles Grid */}
            <main className="flex-1">
              <div className="mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  {selectedCategory 
                    ? categories.find(c => c.id === selectedCategory)?.name || 'Articles'
                    : 'All Articles'}
                </h2>
                <p className="text-gray-600 mt-1">{articles.length} article{articles.length !== 1 ? 's' : ''} found</p>
              </div>

              {articles.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles found</h3>
                  <p className="text-gray-600">Try selecting a different category or searching for articles.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/portal/kb/${article.id}/`}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group"
                    >
                      {/* Article Icon/Image */}
                      <div className="h-40 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center relative">
                        <div className="text-white text-5xl">📄</div>
                        {article.views && (
                          <div className="absolute top-3 right-3 bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-white text-xs font-medium">{article.views}</span>
                          </div>
                        )}
                      </div>

                      {/* Article Content */}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {article.category || 'General'}
                          </span>
                          {article.updated_at && (
                            <span className="text-xs text-gray-500">
                              Updated {article.updated_at}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-gray-900 text-base mb-3 leading-tight line-clamp-2 group-hover:text-opacity-80 transition-colors" style={{ color: COLORS.primary }}>
                          {article.title}
                        </h3>

                        {article.excerpt && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                            {article.excerpt}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-xs text-gray-600 truncate">
                              {article.author || 'Support Team'}
                            </span>
                          </div>
                          <span className="text-xs font-medium group-hover:gap-2 inline-flex items-center transition-all" style={{ color: COLORS.primary }}>
                            Read
                            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
