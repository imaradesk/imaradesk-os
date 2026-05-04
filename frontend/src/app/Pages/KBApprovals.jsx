import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import KBSidebar from '../components/KBSidebar'
import ConfirmDialog from '../components/ConfirmDialog'
import DataTable from '../../components/DataTable'
import { CheckCircle2 } from 'lucide-react'

export default function KBApprovals({ articles = [], requiresApproval = true, autoPublishOnApproval = true, pagination = {}, sidebar = { views: [] }, pendingCount = 0 }) {
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionArticleId, setActionArticleId] = useState(null)

  const handlePreview = (article) => {
    setSelectedArticle(article)
    setShowPreview(true)
  }

  const handleApprove = (articleId) => {
    setActionArticleId(articleId)
    setConfirmAction('approve')
    setShowConfirmDialog(true)
  }

  const confirmApprove = () => {
    if (!actionArticleId) return

    toast.promise(
      new Promise((resolve, reject) => {
        router.post(`/knowledgebase/article/${actionArticleId}/approve/`, {}, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          preserveScroll: true,
          onSuccess: () => {
            setActionArticleId(null)
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: 'Approving article...',
        success: autoPublishOnApproval ? 'Article approved and published!' : 'Article approved!',
        error: 'Failed to approve article',
      }
    )
  }

  const handleReject = (articleId) => {
    setActionArticleId(articleId)
    setShowRejectModal(true)
  }

  const submitReject = () => {
    if (!actionArticleId) return

    toast.promise(
      new Promise((resolve, reject) => {
        router.post(`/knowledgebase/article/${actionArticleId}/reject/`, { reason: rejectReason }, {
          headers: {
            'X-CSRFToken': window.csrfToken,
            'Content-Type': 'application/json',
          },
          preserveScroll: true,
          onSuccess: () => {
            setShowRejectModal(false)
            setRejectReason('')
            setActionArticleId(null)
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: 'Rejecting article...',
        success: 'Article rejected and author notified',
        error: 'Failed to reject article',
      }
    )
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <>
      <Head title="KB Approvals" />
      <AppShell active="knowledgebase">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          <KBSidebar views={sidebar.views} activePage="approvals" pendingCount={pendingCount} />
          <main className="flex-1 bg-gray-50 min-h-screen">
          <div className="px-6 py-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Knowledge Base Approvals</h1>
              <p className="text-gray-600 mt-2">Review and approve pending knowledge base articles</p>
            </div>

            {!requiresApproval && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  <strong>Notice:</strong> KB approval is currently disabled. Articles can be published directly without approval.
                </p>
              </div>
            )}

            <DataTable
              data={articles}
              defaultSortKey="created_at"
              columns={[
                {
                  key: 'title',
                  header: 'Article',
                  render: (article) => (
                    <div className="flex flex-col">
                      <Link
                        href={`/knowledgebase/article/${article.uuid}/`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {article.title}
                      </Link>
                      {article.summary && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'category',
                  header: 'Category',
                  render: (article) => (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {article.category || 'Uncategorized'}
                    </span>
                  ),
                },
                {
                  key: 'author',
                  header: 'Author',
                },
                {
                  key: 'created_at',
                  header: 'Submitted',
                  render: (article) => formatDate(article.created_at),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  sortable: false,
                  hideable: false,
                  render: (article) => (
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/knowledgebase/article/${article.uuid}/`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApprove(article.uuid) }}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReject(article.uuid) }}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </main>
        </div>
      </AppShell>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false)
          setConfirmAction(null)
          setActionArticleId(null)
        }}
        onConfirm={confirmAction === 'approve' ? confirmApprove : null}
        title={confirmAction === 'approve' ? 'Approve Article' : 'Confirm Action'}
        message={
          confirmAction === 'approve'
            ? autoPublishOnApproval
              ? 'Are you sure you want to approve and publish this article? It will be visible to all users.'
              : 'Are you sure you want to approve this article?'
            : 'Are you sure you want to proceed?'
        }
        confirmText={confirmAction === 'approve' ? 'Approve' : 'Confirm'}
        confirmStyle="primary"
      />

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white -xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Article</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting this article. This will be sent to the author.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={4}
                placeholder="Enter rejection reason (optional)..."
              />
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                  setActionArticleId(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Reject Article
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
