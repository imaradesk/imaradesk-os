import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { useTimezone } from '../context/TimezoneContext';

const THEME = {
  primary: '#4a154b',
};

export default function PortalKBArticle({ article, related_articles, tenant_name }) {
  const { formatDate, formatShortDate } = useTimezone();

  return (
    <>
      <Head title={article.title} />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header - Themed App Bar */}
        <header className="shadow-sm" style={{ background: THEME.primary }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="/portal/" className="text-2xl font-bold text-white">
                {tenant_name || 'Customer Portal'}
              </Link>
              <div className="flex gap-3">
                {/* <Link
                  href="/portal/create-ticket/"
                  className="px-4 py-2 bg-white text-gray-800 rounded-lg transition-all hover:bg-gray-100 text-sm font-medium"
                >
                  Submit Ticket
                </Link> */}
                <Link
                  href="/portal/"
                  className="text-sm text-white hover:text-gray-200 transition-all"
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Article Header */}
        <div className="py-8 px-4" style={{ background: THEME.primary }}>
          <div className="max-w-6xl mx-auto">
            <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-white text-sm mb-4">
              {article.category}
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">{article.title}</h1>
            <div className="flex items-center gap-4 text-white/80 text-sm">
              <span>👁️ {article.views} views</span>
              <span>•</span>
              <span>
                Updated {formatDate(article.updated_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Article Content */}
            <div className="lg:col-span-2">
              <div className="bg-white -sm border border-gray-200 p-8">
                {/* Display Image */}
                {article.display_image && (
                  <div className="mb-8 -mx-8 -mt-8">
                    <img
                      src={article.display_image}
                      alt={article.title}
                      className="w-full h-64 md:h-80 object-cover rounded-t-lg"
                    />
                  </div>
                )}
                
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                  style={{
                    '--tw-prose-headings': THEME.primary,
                    '--tw-prose-links': THEME.primary,
                  }}
                />

                {/* Helpful Section */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <p className="text-lg font-semibold mb-4" style={{ color: THEME.primary }}>
                    Was this article helpful?
                  </p>
                  <div className="flex gap-3">
                    <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                      👍 Yes
                    </button>
                    <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                      👎 No
                    </button>
                  </div>
                </div>

                {/* Still Need Help */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-2" style={{ color: THEME.primary }}>
                    Still need help?
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    If this article didn't solve your issue, feel free to submit a support ticket.
                  </p>
                  <Link
                    href="/portal/create-ticket/"
                    className="inline-block px-4 py-2 text-white rounded-lg transition-all"
                    style={{ background: THEME.primary }}
                  >
                    Submit a Ticket
                  </Link>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              {/* Quick Actions */}
              <div className="bg-white -sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: THEME.primary }}>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Link
                    href="/portal/create-ticket/"
                    className="block w-full py-2 text-center text-white rounded-lg transition-all"
                    style={{ background: THEME.primary }}
                  >
                    Submit Ticket
                  </Link>
                  <Link
                    href="/portal/track-ticket/"
                    className="block w-full py-2 text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Track Ticket
                  </Link>
                </div>
              </div>

              {/* Related Articles */}
              {related_articles.length > 0 && (
                <div className="bg-white -sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: THEME.primary }}>
                    Related Articles
                  </h3>
                  <div className="space-y-3">
                    {related_articles.map((relatedArticle) => (
                      <Link
                        key={relatedArticle.uuid}
                        href={`/portal/kb/${relatedArticle.uuid}/`}
                        className="block rounded-lg overflow-hidden hover:shadow-md transition-all border border-gray-100"
                      >
                        {relatedArticle.display_image && (
                          <img
                            src={relatedArticle.display_image}
                            alt={relatedArticle.title}
                            className="w-full h-24 object-cover"
                          />
                        )}
                        <div className="p-3 bg-gray-50">
                          <h4 className="text-sm font-medium mb-1" style={{ color: THEME.primary }}>
                            {relatedArticle.title}
                          </h4>
                          <p className="text-xs text-gray-600 line-clamp-2">{relatedArticle.excerpt}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Article Info */}
              <div className="bg-white -sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: THEME.primary }}>
                  Article Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{article.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Views:</span>
                    <span className="font-medium">{article.views}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">
                      {formatShortDate(article.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Updated:</span>
                    <span className="font-medium">
                      {formatShortDate(article.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
