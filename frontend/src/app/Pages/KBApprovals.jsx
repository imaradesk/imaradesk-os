import React, { useState } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import toast from 'react-hot-toast'
import { ClipboardCheck, Check, X, XCircle, CheckCircle2, Info, Eye } from 'lucide-react'
import KBLayout, { PageHeader } from '../components/kb/KBLayout'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal, { ModalBody, ModalButton } from '../components/Modal'
import { Pager } from '../components/tasks/ui'
import { INPUT } from '../components/kb/constants'
import { ArticleThumb, EmptyState, MiniAvatar, timeAgo } from '../components/kb/ui'

const COLS = 'md:grid-cols-[minmax(0,1fr)_9rem_9rem_6rem_12rem]'

export default function KBApprovals({ articles = [], requiresApproval = true, autoPublishOnApproval = true, pagination = {}, sidebar = {}, pendingCount = 0 }) {
  const isAdmin = !!usePage().props.auth?.user?.isAdmin
  const [approving, setApproving] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [busyId, setBusyId] = useState(null)

  // Core routes (by id) respect auto_publish_on_approval and pass the reason to the author.
  const act = (article, action, payload, messages) => {
    setBusyId(article.id)
    toast.promise(
      new Promise((resolve, reject) => {
        router.post(`/knowledgebase/article/${article.id}/${action}/`, payload, {
          preserveScroll: true,
          onSuccess: () => resolve(),
          onError: () => reject(),
          onFinish: () => setBusyId(null),
        })
      }),
      messages,
    )
  }

  const confirmApprove = () => act(approving, 'approve', {}, {
    loading: 'Approving article...',
    success: autoPublishOnApproval ? 'Article approved and published' : 'Article approved',
    error: 'Failed to approve article',
  })

  const closeReject = () => {
    setRejecting(null)
    setRejectReason('')
  }

  const submitReject = () => {
    const article = rejecting
    closeReject()
    act(article, 'reject', { reason: rejectReason }, {
      loading: 'Sending back...',
      success: 'Article sent back to the author',
      error: 'Failed to reject article',
    })
  }

  const total = pagination.count ?? articles.length
  const pager = pagination.pages > 1 && {
    current_page: pagination.page,
    total_pages: pagination.pages,
    total_count: pagination.count,
    per_page: 10,
    has_next: pagination.has_next,
    has_previous: pagination.has_prev,
  }

  return (
    <>
      <Head title="Approvals" />
      <KBLayout sidebar={sidebar} pendingCount={pendingCount}>
        <PageHeader
          title="Approvals"
          subtitle={total ? `${total} article${total === 1 ? '' : 's'} waiting for review` : 'Review articles before they go live'}
          icon={(
            <span className="w-8 h-8 rounded-lg bg-[#0B3D26]/10 text-[#0B3D26] inline-flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-4 h-4" />
            </span>
          )}
        />

        {!requiresApproval && (
          <div className="mx-4 sm:mx-6 mt-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3">
            <Info className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-900">
              Approval is turned off, so authors can publish directly.
              {isAdmin && (
                <>
                  {' '}
                  <Link href="/administration/knowledge-base/" className="font-medium underline underline-offset-2">Change in settings</Link>
                </>
              )}
            </p>
          </div>
        )}

        {articles.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="You're all caught up"
            description="Articles submitted for review will appear here."
            action={<Link href="/knowledgebase/articles/" className="text-sm text-[#0B3D26] hover:underline">Browse articles</Link>}
          />
        ) : (
          <div role="table" aria-label="Articles waiting for review" className={`divide-y divide-gray-100 ${requiresApproval ? '' : 'mt-4 border-t border-gray-100'}`}>
            <div role="row" className={`hidden md:grid ${COLS} gap-4 items-center px-4 sm:px-6 h-8 text-[11px] font-medium uppercase tracking-wider text-gray-400 bg-gray-50`}>
              <span role="columnheader">Article</span>
              <span role="columnheader">Category</span>
              <span role="columnheader">Author</span>
              <span role="columnheader">Submitted</span>
              <span role="columnheader" className="sr-only">Actions</span>
            </div>
            {articles.map((a) => {
              const busy = busyId === a.id
              return (
                <div
                  key={a.id}
                  role="row"
                  className={`group grid grid-cols-1 ${COLS} gap-x-4 gap-y-2 items-center px-4 sm:px-6 py-3 md:py-0 md:h-16 hover:bg-gray-50/80 transition-all ${busy ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div role="cell" className="flex items-center gap-3 min-w-0">
                    <ArticleThumb article={a} />
                    <div className="min-w-0">
                      <Link href={`/knowledgebase/article/${a.uuid}/`} className="block truncate text-sm font-medium text-gray-900 hover:text-[#0B3D26]">
                        {a.title}
                      </Link>
                      <p className="text-xs text-gray-500 truncate">{a.summary || 'No summary'}</p>
                    </div>
                  </div>
                  <div role="cell" className="hidden md:block text-xs text-gray-600 truncate">{a.category}</div>
                  <div role="cell" className="hidden md:flex items-center gap-2 min-w-0">
                    <MiniAvatar user={{ name: a.author }} />
                    <span className="text-xs text-gray-600 truncate">{a.author}</span>
                  </div>
                  <div role="cell" className="hidden md:block text-xs text-gray-500" title={new Date(a.created_at).toLocaleString()}>{timeAgo(a.created_at)}</div>
                  <div role="cell" className="flex items-center gap-1.5 md:justify-end pl-11 md:pl-0">
                    <Link
                      href={`/knowledgebase/article/${a.uuid}/`}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      aria-label={`Preview ${a.title}`}
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setRejecting(a)}
                      className="h-7 px-2.5 inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setApproving(a)}
                      className="h-7 px-2.5 inline-flex items-center gap-1 rounded-md bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {pager && <Pager pagination={pager} onPage={(page) => router.get('/knowledgebase/approvals/', { page }, { preserveScroll: true })} />}

        <ConfirmDialog
          isOpen={!!approving}
          onClose={() => setApproving(null)}
          onConfirm={confirmApprove}
          icon={CheckCircle2}
          title="Approve article"
          message={autoPublishOnApproval
            ? `“${approving?.title}” will be published and visible in the support portal.`
            : `“${approving?.title}” will be approved and returned to the author as a draft.`}
          confirmText={autoPublishOnApproval ? 'Approve & publish' : 'Approve'}
          confirmStyle="primary"
        />

        <Modal
          isOpen={!!rejecting}
          onClose={closeReject}
          icon={XCircle}
          tone="danger"
          title="Reject article"
          description={rejecting ? `“${rejecting.title}” goes back to the author as a draft.` : undefined}
          size="md"
          footer={(
            <>
              <ModalButton variant="secondary" onClick={closeReject}>Cancel</ModalButton>
              <ModalButton variant="danger" onClick={submitReject}>Reject article</ModalButton>
            </>
          )}
        >
          <ModalBody>
            <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="reject-reason"
              autoFocus
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className={`${INPUT} resize-none`}
              rows={4}
              placeholder="What needs to change before this can be approved?"
            />
          </ModalBody>
        </Modal>
      </KBLayout>
    </>
  )
}
