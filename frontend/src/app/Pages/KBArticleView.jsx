import React, { useState } from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Pencil, Eye, ThumbsUp, ThumbsDown, Share2, MessageSquare, FileText, Link as LinkIcon,
  Twitter, Facebook, Linkedin, Clock, Star, Hash, ChevronDown,
} from 'lucide-react'
import KBLayout, { PageHeader, ArticleFormButton } from '../components/kb/KBLayout'
import DropdownMenu from '../components/DropdownMenu'
import {
  ArticleStatusBadge, CategoryIcon, MiniAvatar, Panel, EmptyState, ARTICLE_PROSE,
  formatLongDate, timeAgo, readingTime, formatCount, PRIMARY_BTN, SECONDARY_BTN,
} from '../components/kb/ui'
import { INPUT } from '../components/kb/constants'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'

export default function KBArticleView({ article, comments = [], relatedArticles = [], sidebar = {}, pendingCount = 0 }) {
  const [vote, setVote] = useState(null) // 'up' | 'down' | null

  const { data, setData, reset } = useForm({ comment: '' })
  useUnsavedChanges(Boolean(data.comment.trim()))

  const castVote = (value) => {
    const next = vote === value ? null : value
    setVote(next)
    if (next) toast.success(next === 'up' ? 'Thanks for the feedback!' : 'Feedback recorded')
  }

  const share = (platform) => {
    const url = window.location.href
    const targets = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    }
    if (platform === 'copy') {
      navigator.clipboard.writeText(url).then(() => toast.success('Link copied'), () => toast.error('Could not copy the link'))
      return
    }
    window.open(targets[platform], '_blank', 'width=600,height=400')
  }

  const submitComment = (e) => {
    e.preventDefault()
    if (!data.comment.trim()) {
      toast.error('Please enter a comment')
      return
    }
    toast.promise(
      new Promise((resolve) => { setTimeout(() => { reset(); resolve() }, 500) }),
      { loading: 'Posting comment...', success: 'Comment posted', error: 'Failed to post comment' },
    )
  }

  const tags = article.tags ? article.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
  const minutes = readingTime(article.content)
  const backHref = article.category ? `/knowledgebase/categories/${article.category.id}/articles/` : '/knowledgebase/articles/'

  return (
    <>
      <Head title={article.title} />
      <KBLayout sidebar={sidebar} pendingCount={pendingCount} current={article}>
        <PageHeader
          title={article.title}
          subtitle={article.category?.name || 'Uncategorized'}
          back={(
            <Link href={backHref} className="p-1.5 -ml-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label="Back to articles">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          actions={(
            <>
              <DropdownMenu
                width={200}
                trigger={({ open, toggle }) => (
                  <button type="button" onClick={toggle} aria-expanded={open} className={SECONDARY_BTN}>
                    <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Share</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                )}
                items={[
                  { label: 'Copy link', icon: LinkIcon, onClick: () => share('copy') },
                  { type: 'divider' },
                  { label: 'Twitter / X', icon: Twitter, onClick: () => share('twitter') },
                  { label: 'Facebook', icon: Facebook, onClick: () => share('facebook') },
                  { label: 'LinkedIn', icon: Linkedin, onClick: () => share('linkedin') },
                ]}
              />
              <ArticleFormButton article={article} className={PRIMARY_BTN}>
                <Pencil className="w-4 h-4" /> Edit
              </ArticleFormButton>
            </>
          )}
        />

        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_18rem] gap-8 px-4 sm:px-6 lg:px-10 py-8 max-w-[1200px] w-full mx-auto">
          <article className="min-w-0 max-w-3xl w-full mx-auto xl:mx-0">
            {/* Title block */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {article.category && (
                <Link
                  href={`/knowledgebase/categories/${article.category.id}/`}
                  className="inline-flex items-center gap-1.5 h-6 pl-1 pr-2 rounded-md bg-[#0B3D26]/5 text-xs font-medium text-[#0B3D26] hover:bg-[#0B3D26]/10 transition-colors"
                >
                  <CategoryIcon icon={article.category.icon} size="w-4 h-4" iconSize="w-3 h-3" className="text-[#0B3D26]" />
                  {article.category.name}
                </Link>
              )}
              {article.status !== 'published' && <ArticleStatusBadge status={article.status} />}
              {article.featured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Featured
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 leading-tight">{article.title}</h1>
            {article.summary && <p className="mt-3 text-base text-gray-500 leading-relaxed">{article.summary}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
              {article.author && (
                <span className="inline-flex items-center gap-2 text-gray-700">
                  <MiniAvatar user={article.author} size="w-6 h-6 text-[10px]" />
                  <span className="font-medium">{article.author.name || article.author.email}</span>
                </span>
              )}
              <span>{formatLongDate(article.created_at)}</span>
              <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {minutes} min read</span>
              <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {formatCount(article.views)} views</span>
            </div>

            {article.display_image && (
              <img src={article.display_image} alt="" className="mt-6 w-full max-h-[22rem] object-cover rounded-xl border border-gray-200" />
            )}

            <div className={`mt-8 ${ARTICLE_PROSE}`} dangerouslySetInnerHTML={{ __html: article.content }} />

            {tags.length > 0 && (
              <div className="mt-8 flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-0.5 h-6 px-2 rounded-md bg-gray-100 text-xs text-gray-600">
                    <Hash className="w-3 h-3 text-gray-400" />{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Feedback */}
            <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50/60 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm font-medium text-gray-900 flex-1">Was this article helpful?</p>
              <div className="flex items-center gap-2">
                <VoteButton active={vote === 'up'} tone="emerald" icon={ThumbsUp} onClick={() => castVote('up')}>Yes</VoteButton>
                <VoteButton active={vote === 'down'} tone="red" icon={ThumbsDown} onClick={() => castVote('down')}>No</VoteButton>
              </div>
            </div>

            {article.allow_comments && (
              <section className="mt-10">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Comments <span className="tabular-nums">{comments.length}</span>
                </h2>
                <form onSubmit={submitComment} className="rounded-lg border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-[#0B3D26]/20 focus-within:border-[#0B3D26] transition-shadow">
                  <textarea
                    value={data.comment}
                    onChange={(e) => setData('comment', e.target.value)}
                    rows={3}
                    aria-label="Add a comment"
                    className={`${INPUT} !border-0 !ring-0 resize-none rounded-b-none`}
                    placeholder="Add a comment…"
                  />
                  <div className="flex justify-end px-2 py-2 border-t border-gray-100">
                    <button type="submit" disabled={!data.comment.trim()} className={PRIMARY_BTN}>Comment</button>
                  </div>
                </form>

                {comments.length > 0 ? (
                  <ul className="mt-4 space-y-4">
                    {comments.map((c, i) => (
                      <li key={i} className="flex gap-3">
                        <MiniAvatar user={{ name: c.author }} size="w-7 h-7 text-[11px]" />
                        <div className="min-w-0">
                          <p className="text-sm"><span className="font-medium text-gray-900">{c.author}</span> <span className="text-xs text-gray-400">{c.date}</span></p>
                          <p className="text-sm text-gray-700 mt-0.5">{c.text}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                    <MessageSquare className="w-4 h-4" /> No comments yet.
                  </p>
                )}
              </section>
            )}
          </article>

          {/* Details rail */}
          <aside className="space-y-6 xl:sticky xl:top-[80px] self-start w-full max-w-3xl mx-auto xl:mx-0">
            <Panel title="Details" bodyClassName="divide-y divide-gray-100">
              <Detail label="Status"><ArticleStatusBadge status={article.status} /></Detail>
              <Detail label="Category">{article.category?.name || 'Uncategorized'}</Detail>
              <Detail label="Author">{article.author?.name || article.author?.email || 'Unknown'}</Detail>
              <Detail label="Created">{formatLongDate(article.created_at)}</Detail>
              <Detail label="Updated" title={new Date(article.updated_at).toLocaleString()}>{timeAgo(article.updated_at)}</Detail>
              <Detail label="Views"><span className="tabular-nums">{formatCount(article.views)}</span></Detail>
              <Detail label="Comments">{article.allow_comments ? 'Allowed' : 'Off'}</Detail>
            </Panel>

            <Panel title="Related articles" bodyClassName="p-0">
              {relatedArticles.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {relatedArticles.map((r) => (
                    <li key={r.id}>
                      <Link href={`/knowledgebase/article/${r.uuid}/`} className="group block px-4 py-3 hover:bg-gray-50/80 transition-colors">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-[#0B3D26]">{r.title}</p>
                        <p className="mt-1 text-xs text-gray-500 inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {formatCount(r.views)} · {timeAgo(r.created_at)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={FileText} title="Nothing related yet" description="Other published articles in this category appear here." />
              )}
            </Panel>
          </aside>
        </div>
      </KBLayout>
    </>
  )
}

function Detail({ label, title, children }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-gray-900 text-right truncate" title={title}>{children}</span>
    </div>
  )
}

const VOTE_TONES = {
  emerald: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  red: 'border-red-300 bg-red-50 text-red-700',
}

function VoteButton({ active, tone, icon: Icon, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-md border text-sm font-medium transition-all active:scale-95 ${
        active ? VOTE_TONES[tone] : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? 'fill-current' : ''}`} /> {children}
    </button>
  )
}
