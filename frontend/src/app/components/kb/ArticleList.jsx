import React from 'react'
import { Link } from '@inertiajs/react'
import { Eye, Pencil, Star } from 'lucide-react'
import { ArticleStatusIcon, ArticleThumb, MiniAvatar, timeAgo, formatCount } from './ui'
import { ARTICLE_STATUS_MAP } from './constants'
import { ArticleFormButton } from './KBLayout'

const COLS = 'md:grid-cols-[minmax(0,1fr)_9rem_9rem_5rem_6rem_2rem]'

/** Row table of articles, matching the Tasks list rows. */
export default function ArticleList({ articles, showHeader = true }) {
  return (
    <div role="table" aria-label="Articles" className="divide-y divide-gray-100">
      {showHeader && (
        <div role="row" className={`hidden md:grid ${COLS} gap-4 items-center px-4 sm:px-6 h-8 text-[11px] font-medium uppercase tracking-wider text-gray-400 bg-gray-50`}>
          <span role="columnheader">Article</span>
          <span role="columnheader">Category</span>
          <span role="columnheader">Author</span>
          <span role="columnheader" className="text-right">Views</span>
          <span role="columnheader">Created</span>
          <span role="columnheader" className="sr-only">Actions</span>
        </div>
      )}
      {articles.map((a) => <ArticleRow key={a.uuid || a.id} article={a} />)}
    </div>
  )
}

export function ArticleRow({ article }) {
  const status = ARTICLE_STATUS_MAP[article.status] || ARTICLE_STATUS_MAP.draft
  const author = article.author && article.author !== 'Unknown' ? { name: article.author } : null
  return (
    <div
      role="row"
      className={`group grid grid-cols-[minmax(0,1fr)_auto] ${COLS} gap-x-4 gap-y-1.5 items-center px-4 sm:px-6 py-3 md:py-0 md:h-14 hover:bg-gray-50/80 transition-colors`}
    >
      <div role="cell" className="flex items-center gap-3 min-w-0">
        <ArticleThumb article={article} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span title={status.name} className="inline-flex"><ArticleStatusIcon status={article.status} /></span>
            <Link
              href={`/knowledgebase/article/${article.uuid}/`}
              className="truncate text-sm font-medium text-gray-900 hover:text-[#0B3D26] focus:outline-none focus-visible:underline"
            >
              {article.title}
            </Link>
            {article.featured && <Star className="w-3.5 h-3.5 flex-shrink-0 text-amber-400 fill-amber-400" aria-label="Featured" />}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {article.status !== 'published' && <span className={`${status.text} font-medium`}>{status.name} · </span>}
            {article.summary || 'No summary'}
          </p>
        </div>
      </div>
      <div role="cell" className="hidden md:block text-xs text-gray-600 truncate">{article.category || 'Uncategorized'}</div>
      <div role="cell" className="hidden md:flex items-center gap-2 min-w-0">
        <MiniAvatar user={author} />
        <span className="text-xs text-gray-600 truncate">{author?.name || 'Unknown'}</span>
      </div>
      <div role="cell" className="hidden md:block text-right text-sm tabular-nums text-gray-600">{formatCount(article.views)}</div>
      <div role="cell" className="hidden md:block text-xs text-gray-500" title={article.created_at ? new Date(article.created_at).toLocaleString() : undefined}>
        {timeAgo(article.created_at)}
      </div>
      <div role="cell" className="flex justify-end">
        <ArticleFormButton
          article={article}
          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity"
          aria-label={`Edit ${article.title}`}
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </ArticleFormButton>
      </div>
      {/* Mobile meta line */}
      <div className="md:hidden col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-11 text-xs text-gray-500">
        <span className="truncate">{article.category || 'Uncategorized'}</span>
        <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {formatCount(article.views)}</span>
        <span>{timeAgo(article.created_at)}</span>
      </div>
    </div>
  )
}
