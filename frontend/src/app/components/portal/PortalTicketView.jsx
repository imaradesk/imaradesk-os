import React, { useEffect, useRef, useState } from 'react'
import { Link } from '@inertiajs/react'
import {
  CalendarDays, CheckCircle2, Clock, MessageSquare, Send, User, Activity,
} from 'lucide-react'
import { useTimezone } from '../../context/TimezoneContext'
import { useUnsavedChanges } from '../../context/UnsavedChangesContext'
import { initials } from '../tasks/ui'
import RichEditor, { isRichTextEmpty } from '../RichEditor'
import {
  BTN_PRIMARY, PORTAL_CARD, PortalPriorityBadge, PortalStatusBadge, Reveal, TicketProgress,
} from './PortalUI'
import Tabs from '../Tabs'

// Conversation view shared by the guest "Track ticket" page and the
// authenticated portal ticket page. Both pass the same server payload shape.

const looksLikeHtml = (value) => /<([a-z][\w-]*)\b[^>]*>/i.test(value || '')

function CommentBubble({ comment, isSupport, index }) {
  const { formatShortDateTime } = useTimezone()
  const author = comment.author || (isSupport ? 'Support Team' : 'You')
  const when = formatShortDateTime(comment.created_at)

  return (
    <Reveal index={index} step={40} className={`flex items-start gap-3 ${isSupport ? '' : 'flex-row-reverse'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${
        isSupport ? 'bg-[#0B3D26] text-white' : 'bg-gray-200 text-gray-600'
      }`}>
        {initials(author)}
      </div>

      <div className={`min-w-0 max-w-[85%] ${isSupport ? '' : 'text-right'}`}>
        <div className={`flex items-center gap-2 mb-1 ${isSupport ? '' : 'justify-end'}`}>
          <span className="text-xs font-medium text-gray-900">{author}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
            isSupport ? 'bg-[#0B3D26]/10 text-[#0B3D26]' : 'bg-gray-100 text-gray-500'
          }`}>
            {isSupport ? 'Support' : 'You'}
          </span>
          {when && <span className="text-[11px] text-gray-400">{when}</span>}
        </div>
        <div className={`inline-block text-left rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isSupport
            ? 'bg-gray-50 border border-gray-200 text-gray-700'
            : 'bg-[#0B3D26]/5 border border-[#0B3D26]/10 text-gray-800'
        }`}>
          {looksLikeHtml(comment.message) ? (
            <div
              className="prose prose-sm max-w-none text-gray-700 prose-p:my-1 prose-a:text-[#0B3D26]"
              dangerouslySetInnerHTML={{ __html: comment.message }}
            />
          ) : (
            <span className="whitespace-pre-wrap">{comment.message}</span>
          )}
        </div>
      </div>
    </Reveal>
  )
}

function ActivityRow({ activity, index }) {
  const { formatShortDateTime } = useTimezone()
  return (
    <Reveal as="li" index={index} step={40} className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Activity className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-700">{activity.description}</p>
        <p className="mt-0.5 text-xs text-gray-400">
          {activity.actor || 'System'} · {formatShortDateTime(activity.created_at)}
        </p>
      </div>
    </Reveal>
  )
}

export default function PortalTicketView({
  ticket, comments = [], activity_logs = [], backHref = '/portal/', backLabel = 'Back to portal',
  onSubmitComment, submitting = false, canComment = true, children,
}) {
  const { formatDateTime } = useTimezone()
  const [activeTab, setActiveTab] = useState('comments')
  const [message, setMessage] = useState('')
  const listEndRef = useRef(null)
  const seenCount = useRef(comments.length)
  useUnsavedChanges(!isRichTextEmpty(message))

  // Bring a newly sent reply into view
  useEffect(() => {
    if (comments.length > seenCount.current) listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    seenCount.current = comments.length
  }, [comments.length])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isRichTextEmpty(message) || submitting) return
    const ok = await onSubmitComment?.(message)
    if (ok !== false) setMessage('')
  }

  const tabs = [
    { id: 'comments', label: 'Conversation', count: comments.length },
    { id: 'activity', label: 'Activity', count: activity_logs.length },
  ]

  return (
    <div className="mt-6 space-y-4">
      <Link href={backHref} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors">
        ← {backLabel}
      </Link>

      {/* Ticket summary */}
      <div className={PORTAL_CARD}>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500 tabular-nums">#{ticket.ticket_number}</span>
            <PortalStatusBadge status={ticket.status} />
            <PortalPriorityBadge priority={ticket.priority} />
          </div>

          <h1 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
            {ticket.subject}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400" /> Created {formatDateTime(ticket.created_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" /> Updated {formatDateTime(ticket.updated_at)}
            </span>
            {ticket.assignee && (
              <span className="inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" /> {ticket.assignee}
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 px-5 sm:px-6 py-5 bg-gray-50/60">
          <h2 className="text-xs font-medium text-gray-500 mb-4">Progress</h2>
          <TicketProgress status={ticket.status} />
        </div>

        <div className="border-t border-gray-200 px-5 sm:px-6 py-5">
          <h2 className="text-xs font-medium text-gray-500 mb-2">Description</h2>
          {looksLikeHtml(ticket.description) ? (
            <div
              className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-a:text-[#0B3D26]"
              dangerouslySetInnerHTML={{ __html: ticket.description || '' }}
            />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
          )}
        </div>
      </div>

      {/* Conversation + activity */}
      <div className={PORTAL_CARD}>
        <div className="px-4 sm:px-6 py-2.5 border-b border-gray-200">
          <Tabs label="Ticket sections" active={activeTab} onChange={setActiveTab} tabs={tabs} />
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'comments' && (
            <div key="comments" className="animate-fadeIn">
              {comments.length > 0 ? (
                <div className="space-y-5">
                  {comments.map((comment, index) => {
                    const isSupport = comment.is_agent !== undefined ? !!comment.is_agent : !comment.is_guest
                    return <CommentBubble key={comment.id} comment={comment} isSupport={isSupport} index={Math.min(index, 8)} />
                  })}
                  <div ref={listEndRef} />
                </div>
              ) : (
                <div className="text-center py-10">
                  <MessageSquare className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">No messages yet</p>
                  <p className="mt-0.5 text-xs text-gray-500">Replies from the support team will appear here.</p>
                </div>
              )}

              {canComment && (
                <form onSubmit={handleSubmit} className="mt-6 pt-5 border-t border-gray-200">
                  <p className="block text-xs font-medium text-gray-500 mb-1.5">Add a reply</p>
                  <RichEditor
                    compact
                    value={message}
                    onChange={setMessage}
                    placeholder="Type your message…"
                  />
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-gray-400">Do not share passwords or sensitive information.</p>
                    <button type="submit" disabled={submitting || isRichTextEmpty(message)} className={BTN_PRIMARY}>
                      <Send className={`w-4 h-4 transition-transform ${submitting ? 'translate-x-1 -translate-y-1 opacity-60' : ''}`} />
                      {submitting ? 'Sending…' : 'Send reply'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            activity_logs.length > 0 ? (
              <ul className="space-y-4">
                {activity_logs.map((activity, index) => <ActivityRow key={activity.id} activity={activity} index={Math.min(index, 8)} />)}
              </ul>
            ) : (
              <div className="text-center py-10 animate-fadeIn">
                <CheckCircle2 className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">No activity yet</p>
                <p className="mt-0.5 text-xs text-gray-500">Updates to this ticket will appear here.</p>
              </div>
            )
          )}
        </div>
      </div>

      {children}
    </div>
  )
}
