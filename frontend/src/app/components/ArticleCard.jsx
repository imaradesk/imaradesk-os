import React from 'react'
import { Link } from '@inertiajs/react'

const statusColors = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  published: { bg: 'bg-green-100', text: 'text-green-700', label: 'Published' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
}

export default function ArticleCard({ 
  article, 
  showStatus = false,
  showFeatured = false,
}) {
  const status = statusColors[article.status] || statusColors.draft

  return (
    <Link
      href={`/knowledgebase/article/${article.uuid}`}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-[#4a154b]/30 transition-all group"
    >
      {/* Image Header - Only show if display_image exists */}
      {article.display_image && (
        <div className="h-36 relative overflow-hidden">
          <img 
            src={article.display_image} 
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {article.views > 0 && (
            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              <span className="text-white text-xs font-medium">{article.views.toLocaleString()}</span>
            </div>
          )}
          {showFeatured && article.featured && (
            <div className="absolute top-3 left-3 bg-yellow-500 px-2 py-0.5 rounded-full">
              <span className="text-white text-xs font-medium">⭐ Featured</span>
            </div>
          )}
        </div>
      )}

      {/* Card Body */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#4a154b]/10 text-[#4a154b]">
            {article.category || 'General'}
          </span>
          {showStatus && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#4a154b] transition-colors">
          {article.title}
        </h3>

        {article.summary && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {article.summary}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#4a154b]/10 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[#4a154b]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs text-gray-600 truncate max-w-[100px]">
              {article.author || 'Unknown'}
            </span>
          </div>
          {article.updated_at && (
            <span className="text-xs text-gray-500">{article.updated_at}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
