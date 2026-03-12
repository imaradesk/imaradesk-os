import React, { useState } from 'react'
import Avatar from './Avatar'
import Button from './Button'
import Textarea from './Textarea'

export default function CommentBubble({ 
  comment, 
  onReply, 
  isInternal = false,
  currentUser 
}) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyInternal, setReplyInternal] = useState(false)
  
  const handleSubmitReply = () => {
    if (replyText.trim()) {
      onReply({
        message: replyText,
        is_internal: replyInternal,
        parent_id: comment.id
      })
      setReplyText('')
      setReplyInternal(false)
      setShowReplyForm(false)
    }
  }
  
  return (
    <div className="group">
      <div className="flex gap-3">
        <Avatar name={comment.author?.name} size="md" />
        
        <div className="flex-1">
          <div className={`rounded-2xl px-4 py-3 ${
            isInternal 
              ? 'bg-yellow-50 border-2 border-yellow-200' 
              : 'bg-white border border-gray-200 shadow-sm'
          }`}>
            <div className="flex items-start justify-between mb-1">
              <div>
                <span className="font-semibold text-gray-900">
                  {comment.author?.name || 'Unknown User'}
                </span>
                {isInternal && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                    Internal
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">{comment.created_at}</span>
            </div>
            
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {comment.message}
            </p>
            
            {comment.attachments && comment.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {comment.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {att.name}
                  </a>
                ))}
              </div>
            )}
          </div>
          
          {/* Reply button */}
          <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-xs text-gray-600 hover:text-[#4a154b] font-medium"
            >
              Reply
            </button>
          </div>
          
          {/* Reply form */}
          {showReplyForm && (
            <div className="mt-3 ml-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                placeholder="Write your reply..."
                className="mb-3"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replyInternal}
                    onChange={(e) => setReplyInternal(e.target.checked)}
                    className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                  />
                  <span className="text-sm text-gray-700">Internal note</span>
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowReplyForm(false)
                      setReplyText('')
                      setReplyInternal(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim()}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 ml-8 space-y-3">
              {comment.replies.map((reply) => (
                <CommentBubble
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  isInternal={reply.is_internal}
                  currentUser={currentUser}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
