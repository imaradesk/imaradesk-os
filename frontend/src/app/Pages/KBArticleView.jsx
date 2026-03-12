import React, { useState } from 'react'
import { Head, Link, router, useForm } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import { THEME } from '../constants/theme'
import { ArrowLeft, Edit, Eye, ThumbsUp, ThumbsDown, Share2, MessageSquare, FileText, Link as LinkIcon } from 'lucide-react'

export default function KBArticleView({ article, comments = [], relatedArticles = [] }) {
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  const { data, setData, post, reset } = useForm({
    comment: '',
  })

  const handleLike = () => {
    setLiked(!liked)
    if (disliked) setDisliked(false)
    toast.success(liked ? 'Like removed' : 'Article liked!')
  }

  const handleDislike = () => {
    setDisliked(!disliked)
    if (liked) setLiked(false)
    toast.success(disliked ? 'Dislike removed' : 'Feedback recorded')
  }

  const handleShare = (platform) => {
    const url = window.location.href
    const title = article.title
    
    let shareUrl = ''
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        break
      case 'copy':
        navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard!')
        setShowShareMenu(false)
        return
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400')
      setShowShareMenu(false)
    }
  }

  const handleCommentSubmit = (e) => {
    e.preventDefault()
    if (!data.comment.trim()) {
      toast.error('Please enter a comment')
      return
    }
    
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          reset()
          resolve()
        }, 500)
      }),
      {
        loading: 'Posting comment...',
        success: 'Comment posted successfully!',
        error: 'Failed to post comment',
      }
    )
  }

  const tagsList = article.tags ? article.tags.split(',').map(t => t.trim()).filter(t => t) : []

  return (
    <>
      <Head title={article.title} />
      <AppShell active="knowledgebase">
        <main className="flex-1 bg-gray-50">
          {/* Header */}
          <div className={`${THEME.gradient} text-white px-6 py-4`}>
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <Link
                  href="/knowledgebase/"
                  className="flex items-center gap-2 text-white hover:text-blue-100"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Knowledge Base
                </Link>
                <Link
                  href={`/knowledgebase/article/${article.id}/edit/`}
                  className={`px-4 py-2 rounded-md ${THEME.button.secondary} flex items-center gap-2`}
                >
                  <Edit className="w-4 h-4" />
                  Edit Article
                </Link>
              </div>

              {/* Article Header */}
              <div className="mb-4">
                {article.category && (
                  <Link 
                    href={`/knowledgebase/category/${article.category.id}`}
                    className="inline-flex items-center gap-2 text-sm text-blue-100 hover:text-white mb-3"
                  >
                    <span className="text-lg">{article.category.icon}</span>
                    {article.category.name}
                  </Link>
                )}
                <h1 className="text-3xl font-bold text-white mb-3">{article.title}</h1>
                
                {/* Meta info */}
                <div className="flex items-center gap-4 text-sm text-blue-100">
                  {article.author && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white text-[#4a154b] flex items-center justify-center text-xs font-semibold">
                        {article.author.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{article.author.name}</span>
                    </div>
                  )}
                  <span>•</span>
                  <span>{new Date(article.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {article.views.toLocaleString()} views</span>
                  {article.status !== 'published' && (
                    <>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        article.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                        article.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {article.status.charAt(0).toUpperCase() + article.status.slice(1)}
                      </span>
                    </>
                  )}
                </div>

                {/* Summary */}
                {article.summary && (
                  <p className="mt-4 text-lg text-blue-100 italic">{article.summary}</p>
                )}
              </div>
            </div>
          </div>

          {/* Article Content */}
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-wrap">{article.content}</div>
              </div>

              {/* Tags */}
              {tagsList.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700">Tags:</span>
                    {tagsList.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 cursor-pointer"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Like/Dislike & Share */}
              <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                      liked
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <ThumbsUp className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                    Helpful
                  </button>
                  <button
                    onClick={handleDislike}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                      disliked
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <ThumbsDown className={`w-5 h-5 ${disliked ? 'fill-current' : ''}`} />
                    Not helpful
                  </button>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md ${THEME.button.secondary}`}
                  >
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>

                  {showShareMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                      <button
                        onClick={() => handleShare('twitter')}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left"
                      >
                        <svg className="w-5 h-5 text-[#1DA1F2]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                        <span className="text-sm text-gray-700">Twitter</span>
                      </button>
                      <button
                        onClick={() => handleShare('facebook')}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left"
                      >
                        <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span className="text-sm text-gray-700">Facebook</span>
                      </button>
                      <button
                        onClick={() => handleShare('linkedin')}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left"
                      >
                        <svg className="w-5 h-5 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        <span className="text-sm text-gray-700">LinkedIn</span>
                      </button>
                      <button
                        onClick={() => handleShare('copy')}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left border-t border-gray-100"
                      >
                        <LinkIcon className="w-5 h-5 text-gray-600" />
                        <span className="text-sm text-gray-700">Copy link</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comments Section */}
            {article.allow_comments && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Comments ({comments.length})</h2>

                {/* Add Comment Form */}
                <form onSubmit={handleCommentSubmit} className="mb-8">
                  <textarea
                    value={data.comment}
                    onChange={(e) => setData('comment', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent resize-none"
                    placeholder="Share your thoughts..."
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      className={`px-6 py-2 rounded-md ${THEME.button.primary}`}
                    >
                      Post Comment
                    </button>
                  </div>
                </form>

                {/* Comments List */}
                {comments.length > 0 ? (
                  <div className="space-y-6">
                    {comments.map((comment, index) => (
                      <div key={index} className="border-b border-gray-200 pb-6 last:border-0">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#4a154b] text-white flex items-center justify-center font-semibold">
                            {comment.author?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{comment.author}</span>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm text-gray-500">{comment.date}</span>
                            </div>
                            <p className="text-gray-700">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No comments yet. Be the first to share your thoughts!</p>
                  </div>
                )}
              </div>
            )}

            {/* Related Articles */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mt-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
              {relatedArticles.length > 0 ? (
                <div className="space-y-4">
                  {relatedArticles.map((relArticle) => (
                    <Link
                      key={relArticle.id}
                      href={`/knowledgebase/article/${relArticle.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-[#4a154b] hover:shadow-md transition-all"
                    >
                      <h3 className="font-semibold text-gray-900 mb-1 hover:text-[#4a154b]">
                        {relArticle.title}
                      </h3>
                      {relArticle.summary && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{relArticle.summary}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {relArticle.views.toLocaleString()} views</span>
                        <span>•</span>
                        <span>{new Date(relArticle.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600 font-medium">No related articles found</p>
                  <p className="text-sm text-gray-500 mt-1">Check back later for more content in this category</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </AppShell>
    </>
  )
}
