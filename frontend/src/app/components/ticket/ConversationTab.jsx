import React from 'react'
import Avatar from '../../../components/Avatar'
import Button from '../../../components/Button'
import MentionTextarea from '../../../components/MentionTextarea'
import { COLORS } from '../../constants/theme'

export default function ConversationTab({ 
  ticket,
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
  readOnly = false
}) {
  // Filter to only show non-internal comments
  const publicComments = comments.filter(c => !c.is_internal)

  return (
    <div className="space-y-6">
      {/* Stepper Timeline for Conversations */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div 
          className="absolute left-5 top-0 bottom-0 w-0.5" 
          style={{ backgroundColor: COLORS.primaryLight }}
        />
        
        <div className="space-y-6">
          {/* Initial Ticket Description */}
          <div className="relative flex items-start gap-4">
            {/* Timeline dot */}
            <div 
              className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: COLORS.primary }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            
            {/* Chat bubble with pointing edge */}
            <div className="max-w-[85%] flex-1">
              <div 
                className="relative rounded-2xl rounded-tl-sm p-4 shadow-sm"
                style={{ 
                  backgroundColor: `${COLORS.primary}08`,
                  borderLeft: `3px solid ${COLORS.primary}`
                }}
              >
                {/* Pointing edge */}
                <div 
                  className="absolute -left-[10px] top-4 w-0 h-0"
                  style={{
                    borderTop: '8px solid transparent',
                    borderBottom: '8px solid transparent',
                    borderRight: `10px solid ${COLORS.secondary}`
                  }}
                />
                
                <div className="flex items-center gap-3 mb-3">
                  <Avatar 
                    name={ticket?.is_guest_ticket ? ticket?.guest_name : ticket?.requester?.name} 
                    size="md" 
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {ticket?.is_guest_ticket 
                        ? ticket?.guest_name || 'Guest User' 
                        : ticket?.requester?.name || 'Unknown User'}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {ticket?.is_guest_ticket && ticket?.guest_email && (
                        <span className="mr-2">{ticket.guest_email}</span>
                      )}
                      {ticket?.is_guest_ticket && ticket?.guest_phone && (
                        <span>{ticket.guest_phone}</span>
                      )}
                      {!ticket?.is_guest_ticket && 'Created this ticket'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">{ticket?.created_at}</span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                  {ticket?.description}
                </p>
              </div>
            </div>
          </div>

          {/* Filtered Comments (non-internal only) */}
          {publicComments.map((comment) => (
            <div key={comment.id} className="relative flex items-start gap-4">
              {/* Timeline dot */}
              <div 
                className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                style={{ backgroundColor: COLORS.primaryLight }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              
              {/* Chat bubble with pointing edge */}
              <div className="max-w-[85%] flex-1">
                <div 
                  className="relative rounded-2xl rounded-tl-sm p-4 shadow-sm"
                  style={{ 
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderLeft: `3px solid ${COLORS.primaryLight}`
                  }}
                >
                  {/* Pointing edge */}
                  <div 
                    className="absolute -left-[10px] top-4 w-0 h-0"
                    style={{
                      borderTop: '8px solid transparent',
                      borderBottom: '8px solid transparent',
                      borderRight: `10px solid ${COLORS.secondary}`
                    }}
                  />
                  
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar name={comment.author?.name} size="sm" />
                    <span className="font-semibold text-gray-900 text-sm">{comment.author?.name || 'Unknown User'}</span>
                    <span className="text-xs text-gray-500">{comment.created_at}</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap text-sm">{comment.message}</p>
                  
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {comment.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700 transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          {att.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {publicComments.length === 0 && !ticket?.description && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-500 text-lg">No conversations yet</p>
          <p className="text-gray-400 text-sm mt-1">Start a conversation on this ticket</p>
        </div>
      )}

      {/* Comment Form */}
      {!readOnly && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky bottom-6">
          <div className="flex gap-4">
            <Avatar name="Current User" size="md" />
            <div className="flex-1">
              <MentionTextarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onMentionsChange={onMentionsChange}
                rows={4}
                placeholder="Write your comment... (Use @ to mention someone)"
                className="mb-3"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commentInternal}
                    onChange={(e) => setCommentInternal(e.target.checked)}
                    className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                  />
                  <span className="text-sm text-gray-700">Internal note</span>
                </label>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      onChange={onFileUpload}
                      className="hidden"
                    />
                    <Button variant="ghost" size="sm" as="span">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      Attach
                    </Button>
                  </label>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onSubmitComment()}
                    disabled={processing || !newComment.trim()}
                  >
                    {processing ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
