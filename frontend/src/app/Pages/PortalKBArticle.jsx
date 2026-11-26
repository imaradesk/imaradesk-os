import React, { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import {
  BookOpen, CalendarDays, Eye, Plus, Search, ThumbsDown, ThumbsUp,
} from 'lucide-react'
import { useTimezone } from '../context/TimezoneContext'
import PortalShell from '../components/portal/PortalShell'
import {
  BTN_PRIMARY, BTN_SECONDARY, PORTAL_CARD,
} from '../components/portal/PortalUI'

export default function PortalKBArticle({ article, related_articles = [], tenant_name }) {
  const { formatDate, formatShortDate } = useTimezone()
  const [feedback, setFeedback] = useState(null)

  return (
    <>
      <Head title={article.title} />

      <PortalShell tenantName={tenant_name}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
          <div className="mt-5 flex items-center gap-1.5 text-xs text-gray-500">
            <Link href="/portal/" className="hover:text-gray-900 transition-colors">Portal</Link>
            <span className="text-gray-300">/</span>
            <Link href="/portal/kb/" className="hover:text-gray-900 transition-colors">Knowledge base</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 truncate max-w-[16rem]">{article.title}</span>
          </div>

          <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <article className={`${PORTAL_CARD} overflow-hidden lg:col-span-2`}>
              {article.display_image && (
                <img src={article.display_image} alt="" className="w-full h-56 sm:h-72 object-cover" />
              )}

              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0B3D26]/10 text-[#0B3D26] font-medium">
                    <BookOpen className="w-3.5 h-3.5" /> {article.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <Eye className="w-3.5 h-3.5 text-gray-400" /> {article.views} views
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-400" /> Updated {formatDate(article.updated_at)}
                  </span>
                </div>

                <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 leading-tight">
                  {article.title}
                </h1>

                <div
                  className="mt-6 prose prose-sm sm:prose-base max-w-none text-gray-700 prose-headings:text-gray-900 prose-a:text-[#0B3D26] prose-img:rounded-lg"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />

                {/* Feedback */}
                <div className="mt-8 pt-5 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {feedback ? (
                    <p className="text-sm text-gray-600">Thanks for the feedback — it helps us improve.</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700">Was this article helpful?</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setFeedback('yes')} className={BTN_SECONDARY}>
                          <ThumbsUp className="w-4 h-4" /> Yes
                        </button>
                        <button type="button" onClick={() => setFeedback('no')} className={BTN_SECONDARY}>
                          <ThumbsDown className="w-4 h-4" /> No
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <div className="space-y-4 lg:sticky lg:top-20">
              <div className="portal-tint rounded-2xl border p-5">
                <h2 className="text-sm font-semibold text-gray-900">Still need help?</h2>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                  If this article did not solve your issue, send us a ticket and we will take a look.
                </p>
                <Link href="/portal/create-ticket/" className={`${BTN_PRIMARY} w-full mt-3`}>
                  <Plus className="w-4 h-4" /> Submit a ticket
                </Link>
                <Link href="/portal/track-ticket/" className={`${BTN_SECONDARY} w-full mt-2`}>
                  <Search className="w-4 h-4" /> Track a ticket
                </Link>
              </div>

              {related_articles.length > 0 && (
                <div className={`${PORTAL_CARD} p-5`}>
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">Related articles</h2>
                  <div className="space-y-2">
                    {related_articles.map((related) => (
                      <Link
                        key={related.uuid}
                        href={`/portal/kb/${related.uuid}/`}
                        className="group flex gap-2.5 rounded-lg border border-gray-200 p-2 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        {related.display_image ? (
                          <img src={related.display_image} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                        ) : (
                          <span className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-gray-900 line-clamp-2 group-hover:text-[#0B3D26] transition-colors">
                            {related.title}
                          </span>
                          {related.excerpt && (
                            <span className="mt-0.5 block text-[11px] text-gray-500 line-clamp-1">{related.excerpt}</span>
                          )}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className={`${PORTAL_CARD} p-5`}>
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Article details</h2>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Category</dt>
                    <dd className="font-medium text-gray-900 text-right">{article.category}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Views</dt>
                    <dd className="font-medium text-gray-900 tabular-nums">{article.views}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Created</dt>
                    <dd className="font-medium text-gray-900">{formatShortDate(article.created_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Updated</dt>
                    <dd className="font-medium text-gray-900">{formatShortDate(article.updated_at)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </PortalShell>
    </>
  )
}
