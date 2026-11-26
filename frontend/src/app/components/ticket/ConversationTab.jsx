import React, { useState, useRef, useCallback, useEffect } from 'react'
import RichEditor, { isRichTextEmpty } from '../RichEditor'
import { router } from '@inertiajs/react'
import api from '../../../utils/axios'
import MentionHtml from './MentionHtml'
import Tabs from '../Tabs'
import { timeAgo, parseServerDate } from '../detail/DetailUI'
import { useUnsavedChanges } from '../../context/UnsavedChangesContext'

const looksLikeHtml = (text) => /<\/?[a-z][\s\S]*>/i.test(text || '')

const LockIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
)

const ChatIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

const ActionIcon = ({ d }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
)

const ICON_REPLY = 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6'
const ICON_GLOBE = 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
const ICON_LOCK = 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
const ICON_TRASH = 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'

// Icon-only buttons shown when the card is hovered
const CardActions = ({ actions, headerBg }) => (
  <div className={`absolute right-9 top-0 h-[37px] flex items-center gap-0.5 pl-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ${headerBg}`}>
    {actions.map(({ key, label, icon, onClick, danger }) => (
      <button
        key={key}
        type="button"
        title={label}
        aria-label={label}
        onClick={onClick}
        className={`w-7 h-7 inline-flex items-center justify-center rounded-md transition-colors ${
          danger ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/70'
        }`}
      >
        <ActionIcon d={icon} />
      </button>
    ))}
  </div>
)

const AVATAR_COLORS = ['bg-emerald-600', 'bg-sky-600', 'bg-violet-600', 'bg-rose-600', 'bg-amber-600', 'bg-teal-600', 'bg-indigo-600', 'bg-fuchsia-600']

const Avatar = ({ name }) => {
  const label = (name || '?').trim()
  const initials = label.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?'
  const hash = [...label].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0)
  return (
    <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ring-4 ring-white flex items-center justify-center text-sm font-semibold text-white ${AVATAR_COLORS[hash % AVATAR_COLORS.length]}`}>
      {initials}
    </div>
  )
}

// Inline editor shown inside a bubble while replying
const ReplyBox = ({ onSend, onCancel }) => {
  const [html, setHtml] = useState('')
  const [mentions, setMentions] = useState([])
  const dirty = !isRichTextEmpty(html) || mentions.length > 0
  const { guard } = useUnsavedChanges(dirty)
  const requestCancel = () => guard(onCancel)
  const ref = useRef(null)
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus?.(), 50)
    return () => clearTimeout(t)
  }, [])
  const empty = isRichTextEmpty(html)
  return (
    <div className="relative pl-8 mt-3">
      <span className="absolute left-3 top-0 h-4 w-5 border-l border-b border-gray-300 rounded-bl-xl" />
      <div className="rounded-md border border-gray-200 bg-white">
        <RichEditor
          compact
          editorRef={(r) => { ref.current = r }}
          mentions
          onMentionsChange={setMentions}
          value={html}
          onChange={setHtml}
          placeholder="Write a reply… (use @ to mention someone)"
        />
        <div className="flex items-center justify-end gap-2 px-2 py-1.5 border-t border-gray-100">
          <button type="button" onClick={requestCancel} className="h-7 px-2.5 rounded-md text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
          <button
            type="button"
            disabled={empty}
            onClick={() => onSend(html, mentions)}
            className="h-7 px-3 rounded-md text-xs font-medium text-white bg-[#0B3D26] hover:bg-[#14502F] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  )
}

// Replies rendered as a thread: a vertical line with a curved branch into each reply
const ReplyThread = ({ replies }) => (
  <div className="mt-4 pl-8 relative">
    {replies.map((r, i) => (
      <div key={r.id} className={`relative flex items-start gap-2.5 ${i < replies.length - 1 ? 'pb-4' : ''}`}>
        {i < replies.length - 1 && <span className="absolute -left-5 top-0 bottom-0 w-px bg-gray-300" />}
        <span className="absolute -left-5 top-0 h-4 w-5 border-l border-b border-gray-300 rounded-bl-xl" />
        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white ${AVATAR_COLORS[0]}`}>
          {r.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 rounded-2xl bg-gray-100 px-3 py-2">
          <div className="flex items-baseline gap-2 text-xs">
            <span className="font-semibold text-gray-900">{r.name}</span>
            <time className="text-gray-500" title={parseServerDate(r.created_at)?.toLocaleString()}>{timeAgo(r.created_at)}</time>
          </div>
          <MentionHtml
            className="mt-0.5 text-sm text-gray-700 prose prose-sm max-w-none [&_p]:my-0"
            html={r.html}
          />
        </div>
      </div>
    ))}
  </div>
)

// A comment card with a header bar and a caret pointing at the author's avatar
const CommentCard = ({ name, action, date, badge, internal = false, collapsed, onToggle, actions = [], replies = [], replying = false, onSendReply, onCancelReply, children }) => {
  const border = internal ? 'border-amber-300' : 'border-gray-200'
  const headerBg = internal ? 'bg-amber-50' : 'bg-gray-50'
  return (
    <div className="relative flex items-start gap-4">
      <Avatar name={name} />
      <div className={`group relative flex-1 min-w-0 rounded-md border bg-white ${border}`}>
        {/* Caret */}
        <span className={`absolute -left-[7px] top-[14px] w-3 h-3 rotate-45 border-l border-b ${border} ${headerBg}`} />

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className={`relative w-full flex items-center gap-x-1.5 gap-y-1 flex-wrap px-4 py-2 text-left text-sm rounded-t-md ${headerBg} ${
            collapsed ? 'rounded-b-md' : `border-b ${border}`
          }`}
        >
          <span className="font-semibold text-gray-900">{name}</span>
          <span className="text-gray-500">{action}</span>
          {date && (
            <time
              dateTime={parseServerDate(date)?.toISOString()}
              title={parseServerDate(date)?.toLocaleString() || date}
              className="text-gray-500 underline decoration-dotted underline-offset-2"
            >
              {timeAgo(date)}
            </time>
          )}
          <span className="ml-auto flex items-center gap-1.5">
            {internal && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-300 text-[11px] font-medium text-amber-700">
                <LockIcon className="w-3 h-3" /> Internal
              </span>
            )}
            {badge && (
              <span className="px-2 py-0.5 rounded-full border border-gray-300 text-[11px] font-medium text-gray-600">{badge}</span>
            )}
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </span>
        </button>

        {actions.length > 0 && <CardActions actions={actions} headerBg={headerBg} />}

        {!collapsed && (
          <div className="px-4 py-3">
            {children}
            {replies.length > 0 && <ReplyThread replies={replies} />}
            {replying && <ReplyBox onSend={onSendReply} onCancel={onCancelReply} />}
          </div>
        )}
      </div>
    </div>
  )
}

const pendingActionLabel = (action) => {
  if (!action) return ''
  if (action.type === 'assign') return 'Assigning this ticket to you'
  return `Changing status to ${(action.value || '').replace(/_/g, ' ')}`
}

export default function ConversationTab({ 
  ticket,
  task,  // Support both tickets and tasks
  comments = [],
  newComment,
  setNewComment,
  commentInternal,
  setCommentInternal,
  commentMentions = [],
  onMentionsChange,
  processing,
  onSubmitComment,
  onFileUpload,
  onUploadFile,  // New prop for uploading files and getting URL back
  readOnly = false,
  hideForm = false,  // Hide the input form (for use in detail panel)
  // A status change / assignment waiting to be confirmed with an optional internal note
  pendingAction = null,
  onConfirmPendingAction,
  onCancelPendingAction,
  focusSignal = 0,  // bump to focus the composer
  onRefresh,  // reload comments after reply/visibility/delete; defaults to an Inertia reload
}) {
  // Use ticket or task as the source item
  const item = ticket || task
  const isTask = !!task
  
  // Pending attachments state
  const [pendingAttachments, setPendingAttachments] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const editorRef = useRef(null)
  const scrollRef = useRef(null)
  const [filter, setFilter] = useState('all')
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerFocused, setComposerFocused] = useState(false)
  const blurTimer = useRef(null)

  useEffect(() => () => clearTimeout(blurTimer.current), [])

  // Re-render every minute so "x minutes ago" stays current
  const [, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  // Replies and internal notes in one timeline, oldest first so the newest bubble is last
  const publicCount = comments.filter(c => !c.is_internal).length
  const internalCount = comments.length - publicCount
  const visibleComments = comments
    .filter(c => filter === 'all' || (filter === 'internal' ? c.is_internal : !c.is_internal))
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  useEffect(() => {
    if (!focusSignal) return
    setComposerOpen(true)
    const t = setTimeout(() => editorRef.current?.focus?.(), 150)
    return () => clearTimeout(t)
  }, [focusSignal])

  useEffect(() => {
    if (!composerOpen) return
    const t = setTimeout(() => editorRef.current?.focus?.(), 50)
    return () => clearTimeout(t)
  }, [composerOpen])

  // Keep the conversation anchored to the newest bubble (and the add-comment box).
  const commentSignature = comments.map((c) => `${c.id}:${(c.replies || []).length}`).join('|')
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined
    const frame = requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
    return () => cancelAnimationFrame(frame)
  }, [commentSignature, filter, composerOpen])

  const isInternal = commentInternal || !!pendingAction

  const commentUrl = (id) => `/${isTask ? 'tasks' : 'tickets'}/${item?.uuid}/comment/${id}/`
  const reloadItem = () => (onRefresh ? onRefresh() : router.reload({ preserveScroll: true }))

  const [replyingTo, setReplyingTo] = useState(null)

  const replyToComment = (comment) => {
    setCollapsedConversations(prev => ({ ...prev, [comment.id]: false }))
    setReplyingTo(comment.id)
  }

  // Replies are stored as comments with a parent_id and inherit the parent's visibility
  const sendReply = (comment, html, mentions = []) => {
    api.post(`/${isTask ? 'tasks' : 'tickets'}/${item?.uuid}/comment/`, {
      message: html,
      is_internal: !!comment.is_internal,
      parent_id: comment.id,
      mentions,
    })
      .then(() => { setReplyingTo(null); reloadItem() })
      .catch(() => window.alert('Failed to send reply'))
  }

  const toggleCommentVisibility = (comment) => {
    api.patch(commentUrl(comment.id), { is_internal: !comment.is_internal })
      .then(reloadItem)
      .catch(() => window.alert('Failed to update comment'))
  }

  const deleteComment = (comment) => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return
    api.delete(commentUrl(comment.id))
      .then(reloadItem)
      .catch(() => window.alert('Failed to delete comment'))
  }

  const sendMenuRef = useRef(null)
  const [showSendMenu, setShowSendMenu] = useState(false)
  useEffect(() => {
    if (!showSendMenu) return
    const onDown = (e) => {
      if (sendMenuRef.current && !sendMenuRef.current.contains(e.target)) setShowSendMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showSendMenu])
  
  // Collapsed items state - cards are expanded by default
  const [collapsedConversations, setCollapsedConversations] = useState({})
  
  // Toggle expand/collapse
  const toggleConversation = (id) => {
    setCollapsedConversations(prev => ({ ...prev, [id]: !prev[id] }))
  }
  
  // Collapse/Expand all functions
  const collapseAllConversations = () => {
    const collapsed = { description: true }
    visibleComments.forEach(c => { collapsed[c.id] = true })
    setCollapsedConversations(collapsed)
  }
  
  const expandAllConversations = () => {
    setCollapsedConversations({})
  }
  
  // Check if all are collapsed
  const allConversationsCollapsed = Object.keys(collapsedConversations).length > 0 &&
    Object.values(collapsedConversations).every(v => v)

  // Upload a file and add to pending attachments
  const uploadFile = useCallback(async (file) => {
    if (!file) return
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await api.post('/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const data = response.data
      
      setPendingAttachments(prev => [...prev, {
        id: Date.now() + Math.random(),
        file_url: data.file_url,
        file_name: data.file_name,
        file_size: data.file_size,
        file_type: data.file_type,
      }])
      
      return data
    } catch (error) {
      console.error('File upload failed:', error)
      throw error
    }
  }, [])

  // Handle file input change
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    
    setUploadingFiles(true)
    try {
      await Promise.all(files.map(uploadFile))
    } catch (error) {
      // Error already logged in uploadFile
    } finally {
      setUploadingFiles(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handle drag over
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  // Handle drag leave
  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false)
    }
  }, [])

  // Handle drop
  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer?.files || [])
    if (files.length === 0) return
    
    setUploadingFiles(true)
    try {
      await Promise.all(files.map(uploadFile))
    } catch (error) {
      // Error already logged
    } finally {
      setUploadingFiles(false)
    }
  }, [uploadFile])

  // Handle paste
  const handlePaste = useCallback(async (e) => {
    const items = Array.from(e.clipboardData?.items || [])
    const files = items
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter(Boolean)
    
    if (files.length === 0) return
    
    e.preventDefault()
    e.stopPropagation()
    setUploadingFiles(true)
    try {
      await Promise.all(files.map(uploadFile))
    } catch (error) {
      // Error already logged
    } finally {
      setUploadingFiles(false)
    }
  }, [uploadFile])

  // Remove pending attachment
  const removePendingAttachment = (id) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== id))
  }

  const commentEmpty = isRichTextEmpty(newComment)
  useUnsavedChanges(!commentEmpty || pendingAttachments.length > 0 || uploadingFiles)

  const showComposer = composerOpen || !commentEmpty || pendingAttachments.length > 0 || uploadingFiles || !!pendingAction
  const composerExpanded = composerFocused || showComposer

  const focusComposer = () => {
    clearTimeout(blurTimer.current)
    setComposerFocused(true)
  }
  const blurComposer = () => {
    clearTimeout(blurTimer.current)
    // Let toolbar clicks land before collapsing
    blurTimer.current = setTimeout(() => setComposerFocused(false), 150)
  }

  // Submit comment with attachments
  const handleSubmit = () => {
    const attachments = pendingAttachments.map(att => ({
      file_url: att.file_url,
      file_name: att.file_name,
      file_size: att.file_size,
      file_type: att.file_type,
    }))

    if (pendingAction) {
      onConfirmPendingAction?.({
        message: commentEmpty ? '' : newComment,
        mentions: commentMentions,
        attachments,
      })
      setPendingAttachments([])
      return
    }

    if (commentEmpty && pendingAttachments.length === 0) return
    
    onSubmitComment({
      message: commentEmpty ? '' : newComment,
      is_internal: commentInternal,
      mentions: commentMentions,
      attachments,
    })
    
    // Clear pending attachments after submit
    setPendingAttachments([])
    setComposerOpen(false)
  }

  // Check if file is an image
  const isImageFile = (fileName) => {
    if (!fileName) return false
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
  }

  const FILTERS = [
    ['all', 'All', comments.length],
    ['replies', 'Replies', publicCount],
    ['internal', 'Internal notes', internalCount],
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar stays visible above the scrolling conversation */}
      <div className="flex-shrink-0 pb-3">
        {/* Header: filter + Expand/Collapse All */}
        <div className="flex items-center justify-between gap-3">
          <Tabs
            compact
            label="Filter conversation"
            active={filter}
            onChange={setFilter}
            tabs={FILTERS.map(([id, label, count]) => ({ id, label, count, icon: id === 'internal' ? LockIcon : undefined }))}
          />
          {visibleComments.length > 0 && (
            <button
              onClick={allConversationsCollapsed ? expandAllConversations : collapseAllConversations}
              className="text-sm text-[#0B3D26] hover:text-[#14502F] flex-shrink-0"
            >
              {allConversationsCollapsed ? 'Expand All' : 'Collapse All'}
            </button>
          )}
        </div>
      </div>

      {/* Scrollable conversation area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-4">
      {/* GitHub-style comment timeline */}
      <div className="relative">
        <div className="absolute left-[19px] top-5 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-5">
          {/* Initial Ticket Description */}
          {filter !== 'internal' && (
            <CommentCard
              name={isTask
                ? item?.created_by?.name || 'Unknown User'
                : (item?.is_guest_ticket
                    ? item?.guest_name || 'Guest User'
                    : item?.requester?.name || 'Unknown User')}
              action={isTask ? 'created this task' : 'opened this ticket'}
              date={item?.created_at}
              badge={isTask ? 'Creator' : 'Requester'}
              collapsed={!!collapsedConversations['description']}
              onToggle={() => toggleConversation('description')}
            >
              <MentionHtml
                className="text-sm text-gray-700 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-md"
                html={item?.description}
              />
            </CommentCard>
          )}

          {/* Replies and internal notes */}
          {visibleComments.map((comment) => {
            const internal = !!comment.is_internal
            const isOwner = isTask
              ? !!comment.author?.id && comment.author.id === item?.created_by?.id
              : comment.author?.is_guest || (!!comment.author?.id && comment.author.id === item?.requester?.id)
            return (
              <CommentCard
                key={comment.id}
                name={comment.author?.name || (internal ? 'System' : 'Unknown')}
                action={internal ? 'added an internal note' : 'commented'}
                date={comment.created_at}
                badge={isOwner ? (isTask ? 'Creator' : 'Requester') : null}
                internal={internal}
                collapsed={!!collapsedConversations[comment.id]}
                onToggle={() => toggleConversation(comment.id)}
                replies={(comment.replies || []).map(r => ({
                  id: r.id,
                  name: r.author?.name || 'Unknown',
                  html: r.message,
                  created_at: r.created_at,
                }))}
                replying={replyingTo === comment.id}
                onSendReply={(html, mentions) => sendReply(comment, html, mentions)}
                onCancelReply={() => setReplyingTo(null)}
                actions={readOnly ? [] : [
                  { key: 'reply', label: 'Reply', icon: ICON_REPLY, onClick: () => replyToComment(comment) },
                  internal
                    ? { key: 'visibility', label: 'Make public', icon: ICON_GLOBE, onClick: () => toggleCommentVisibility(comment) }
                    : { key: 'visibility', label: 'Make internal', icon: ICON_LOCK, onClick: () => toggleCommentVisibility(comment) },
                  { key: 'delete', label: 'Delete', icon: ICON_TRASH, danger: true, onClick: () => deleteComment(comment) },
                ]}
              >
                {looksLikeHtml(comment.message) ? (
                  <MentionHtml
                    className="text-sm text-gray-700 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-md"
                    html={comment.message}
                  />
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.message}</p>
                )}

                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {comment.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.file_url || att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs transition-colors ${
                          internal ? 'border-amber-200 bg-white hover:bg-amber-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-gray-700 truncate max-w-[160px]">{att.file_name || att.name}</span>
                      </a>
                    ))}
                  </div>
                )}
              </CommentCard>
            )
          })}
        </div>
      </div>

        {filter === 'internal' && visibleComments.length === 0 && (
          <div className="text-center py-6 text-gray-400 text-sm">No internal notes yet</div>
        )}
        {filter === 'replies' && visibleComments.length === 0 && !item?.description && (
          <div className="text-center py-6 text-gray-400 text-sm">No replies yet</div>
        )}

        {!readOnly && !hideForm && !showComposer && (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-left transition-colors hover:border-[#0B3D26]/40 hover:bg-gray-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B3D26]/10 text-[#0B3D26]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </span>
            <span className="text-sm text-gray-500 group-hover:text-gray-700">Add comment…</span>
          </button>
        )}
      </div>

      {/* Comment Form - fixed at bottom */}
      {!readOnly && !hideForm && showComposer && (
        <div className={`flex-shrink-0 pt-4 -mx-6 px-6 -mb-6 pb-6 transition-colors ${isInternal ? 'border-t border-amber-200 bg-amber-50/60' : 'border-t border-transparent'}`}>
        {/* Pending status change / assignment */}
        {pendingAction && (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-100/60 px-3 py-2">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900">{pendingActionLabel(pendingAction)}</p>
              <p className="text-xs text-amber-700">Add an optional internal note, then confirm.</p>
            </div>
            <button onClick={onCancelPendingAction} className="text-xs font-medium text-amber-800 hover:underline flex-shrink-0">Cancel</button>
          </div>
        )}

        {/* Reply / Internal note is picked from the send button's menu */}

        <div 
          className={`conversation-composer rounded-xl overflow-visible relative transition-colors ${
            composerExpanded ? 'is-expanded' : ''
          } ${isDragOver ? 'ring-2 ring-[#0B3D26]/40' : ''}`}
          onClick={() => { if (!composerExpanded) editorRef.current?.focus?.() }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPasteCapture={handlePaste}
        >
          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-[#0B3D26]/10 rounded-xl flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-white rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-[#0B3D26]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm font-medium text-[#0B3D26]">Drop files here</span>
              </div>
            </div>
          )}
          
          {/* Input area */}
          <RichEditor
            compact
            mentions
            internal={isInternal}
            editorRef={(ref) => { editorRef.current = ref }}
            value={newComment}
            onChange={setNewComment}
            onMentionsChange={onMentionsChange}
            onFocus={focusComposer}
            onBlur={blurComposer}
            placeholder={isInternal
              ? 'Write an internal note — only your team can see this (use @ to mention)'
              : 'Write your reply… (use @ to mention someone, paste or drag files)'}
          />
          
          {/* Pending attachments preview */}
          {pendingAttachments.length > 0 && (
            <div className="pt-3">
              <div className="flex flex-wrap gap-2">
                {pendingAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative group flex items-center gap-2 px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-lg"
                  >
                    {isImageFile(att.file_name) ? (
                      <img 
                        src={att.file_url} 
                        alt={att.file_name}
                        className="w-8 h-8 object-cover rounded"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <span className="text-xs text-gray-700 max-w-[100px] truncate">{att.file_name}</span>
                    <button
                      onClick={() => removePendingAttachment(att.id)}
                      className="ml-1 p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Uploading indicator */}
          {uploadingFiles && (
            <div className="pt-3 flex items-center gap-2 text-sm text-gray-500">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading files...
            </div>
          )}
          
          {/* Bottom bar with icons and send button */}
          {composerExpanded && (
          <div className="flex items-center justify-between pt-3">
            {/* Left side - attachment and internal note */}
            <div className="flex items-center gap-4">
              <label className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </label>
              {isInternal && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                  <LockIcon className="w-3 h-3" /> Only visible to your team
                </span>
              )}
            </div>
            
            {/* Right side - send button with Comment / Internal note menu */}
            <div className="relative" ref={sendMenuRef}>
              {showSendMenu && !pendingAction && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1" role="menu">
                  {[
                    [false, 'Comment', <ChatIcon key="c" />],
                    [true, 'Internal note', <LockIcon key="l" className="w-3 h-3" />],
                  ].map(([value, label, icon]) => (
                    <button
                      key={label}
                      type="button"
                      role="menuitemradio"
                      aria-checked={commentInternal === value}
                      onClick={() => {
                        setCommentInternal(value)
                        setShowSendMenu(false)
                        focusComposer()
                        editorRef.current?.focus?.()
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                        commentInternal === value ? 'text-[#0B3D26] font-medium' : 'text-gray-700'
                      }`}
                    >
                      {icon}
                      {label}
                      {commentInternal === value && (
                        <svg className="w-4 h-4 ml-auto text-[#0B3D26]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex">
                <button
                  onClick={handleSubmit}
                  disabled={processing || uploadingFiles || (!pendingAction && commentEmpty && pendingAttachments.length === 0)}
                  className={`px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    pendingAction ? 'rounded-md' : 'rounded-l-md'
                  } ${isInternal ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#0B3D26] hover:bg-[#14502F]'}`}
                >
                  {processing
                    ? 'Sending...'
                    : pendingAction
                      ? (pendingAction.type === 'assign' ? 'Assign & save' : 'Confirm & update')
                      : (commentInternal ? 'Internal note' : 'Comment')}
                </button>
                {!pendingAction && (
                  <button
                    type="button"
                    aria-label="Choose comment or internal note"
                    aria-haspopup="menu"
                    aria-expanded={showSendMenu}
                    onClick={() => setShowSendMenu((v) => !v)}
                    className={`px-2 py-2 text-white border-l rounded-r-md transition-colors ${
                      isInternal ? 'bg-amber-500 hover:bg-amber-600 border-amber-600' : 'bg-[#0B3D26] hover:bg-[#14502F] border-[#14502F]'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
          )}
        </div>        </div>      )}
    </div>
  )
}
