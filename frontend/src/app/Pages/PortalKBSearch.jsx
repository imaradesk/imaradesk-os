import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';

const THEME = {
  primary: '#4a154b',
  gradient: 'linear-gradient(135deg, #4a154b 0%, #165c66 100%)',
};

export default function PortalKBSearch({ query, results, tenant_name }) {
  const [searchQuery, setSearchQuery] = useState(query || '');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.visit(`/portal/kb-search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      <Head title={`Search: ${query}`} />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header - Blended with Hero */}
        <header className="shadow-sm" style={{ background: THEME.primary }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="/portal/" className="text-2xl font-bold text-white">
                {tenant_name || 'Customer Portal'}
              </Link>
              <div className="flex gap-3">
                <Link
                  href="/portal/create-ticket/"
                  className="px-4 py-2 bg-white text-gray-800 rounded-lg transition-all hover:bg-gray-100 font-medium"
                >
                  Submit Ticket
                </Link>
                <Link
                  href="/portal/"
                  className="px-4 py-2 border-2 border-white text-white rounded-lg hover:bg-white hover:bg-opacity-10 transition-all font-medium"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Search Section */}
        <div className="py-12 px-4" style={{ background: THEME.primary }}>
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6 text-center">
              Search Knowledge Base
            </h1>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for answers..."
                  className="w-full px-6 py-4 pr-32 rounded-lg text-gray-800 text-lg focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-30 shadow-lg"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-all font-medium"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Results */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {query && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold" style={{ color: THEME.primary }}>
                  Search Results for "{query}"
                </h2>
                <p className="text-gray-600 mt-1">
                  Found {results.length} {results.length === 1 ? 'article' : 'articles'}
                </p>
              </div>

              {results.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {results.map((article) => (
                    <Link
                      key={article.id}
                      href={`/portal/kb/${article.id}/`}
                      className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2" style={{ color: THEME.primary }}>
                            {article.title}
                          </h3>
                          <p className="text-gray-600 mb-3">{article.excerpt}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="px-3 py-1 bg-gray-100 rounded-full">
                              {article.category}
                            </span>
                            <span>👁️ {article.views} views</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <svg
                            className="w-6 h-6 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: THEME.primary }}>
                    No Results Found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    We couldn't find any articles matching "{query}". Try different keywords or{' '}
                    <Link
                      href="/portal/create-ticket/"
                      className="font-medium hover:underline"
                      style={{ color: THEME.primary }}
                    >
                      submit a support ticket
                    </Link>
                    .
                  </p>
                  <Link
                    href="/portal/"
                    className="inline-block px-6 py-2 text-white rounded-lg transition-all"
                    style={{ background: THEME.primary }}
                  >
                    Back to Home
                  </Link>
                </div>
              )}
            </>
          )}

          {!query && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">💡</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: THEME.primary }}>
                Start Your Search
              </h3>
              <p className="text-gray-600">
                Enter a keyword above to search our knowledge base
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
