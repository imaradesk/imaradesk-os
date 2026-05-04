import React, { useState, useRef, useCallback } from 'react'
import MentionTextarea from '../../../components/MentionTextarea'
import api from '../../../utils/axios'

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
  hideForm = false  // Hide the input form (for use in detail panel)
}) {
  // Use ticket or task as the source item
  const item = ticket || task
  const isTask = !!task
  
  // Pending attachments state
  const [pendingAttachments, setPendingAttachments] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  // Filter to only show non-internal comments, reversed for latest first
  const publicComments = comments.filter(c => !c.is_internal).slice().reverse()
  
  // Expanded items state for collapsible functionality
  const [expandedConversations, setExpandedConversations] = useState({})
  
  // Toggle expand/collapse
  const toggleConversation = (id) => {
    setExpandedConversations(prev => ({ ...prev, [id]: !prev[id] }))
  }
  
  // Collapse/Expand all functions
  const collapseAllConversations = () => {
    setExpandedConversations({})
  }
  
  const expandAllConversations = () => {
    const expanded = { description: true }
    publicComments.forEach(c => { expanded[c.id] = true })
    setExpandedConversations(expanded)
  }
  
  // Check if all are collapsed
  const allConversationsCollapsed = Object.keys(expandedConversations).length === 0 || 
    Object.values(expandedConversations).every(v => !v)

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

  // Submit comment with attachments
  const handleSubmit = () => {
    if (!newComment.trim() && pendingAttachments.length === 0) return
    
    onSubmitComment({
      message: newComment,
      is_internal: commentInternal,
      mentions: commentMentions,
      attachments: pendingAttachments.map(att => ({
        file_url: att.file_url,
        file_name: att.file_name,
        file_size: att.file_size,
        file_type: att.file_type,
      })),
    })
    
    // Clear pending attachments after submit
    setPendingAttachments([])
  }

  // Check if file is an image
  const isImageFile = (fileName) => {
    if (!fileName) return false
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable conversation area */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pb-4">
        {/* Header with Expand/Collapse All */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Conversation</h3>
          <button
            onClick={allConversationsCollapsed ? expandAllConversations : collapseAllConversations}
            className="text-sm text-[#4a154b] hover:text-[#5a235c]"
          >
          {allConversationsCollapsed ? 'Expand All' : 'Collapse All'}
        </button>
      </div>

      {/* Stepper Timeline for Conversations */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[11px] top-3 bottom-0 w-px bg-[#825084]/30" />
        
        <div className="space-y-4">
          {/* Initial Ticket Description */}
          <div className="relative flex items-start gap-3">
            {/* Timeline dot with message icon */}
            <div className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full border-2 border-[#825084] bg-white flex items-center justify-center text-[#825084]">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            
            <div className="flex-1 pb-2">
              {/* Header row with chevron */}
              <button
                onClick={() => toggleConversation('description')}
                className="flex items-center gap-2 w-full text-left group"
              >
                <svg 
                  className={`w-4 h-4 text-gray-400 transition-transform ${expandedConversations['description'] ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                <span className="text-sm font-medium text-gray-900">
                  {isTask 
                    ? item?.created_by?.name || 'Unknown User'
                    : (item?.is_guest_ticket 
                        ? item?.guest_name || 'Guest User' 
                        : item?.requester?.name || 'Unknown User')
                  }
                </span>
                <span className="text-sm text-gray-500">{isTask ? 'created this task' : 'created this ticket'}</span>
              </button>
              <p className="text-xs text-[#825084] ml-6 mt-0.5">{item?.created_at}</p>
              
              {/* Expandable message bubble - simple style */}
              {expandedConversations['description'] && (
                <div className="mt-2 ml-6 py-3 px-4 bg-gray-50 border-l-2 border-[#825084]">
                  <div 
                    className="text-sm text-gray-700 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: item?.description }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Comments */}
          {publicComments.map((comment) => (
            <div key={comment.id} className="relative flex items-start gap-3">
              {/* Timeline dot with message icon */}
              <div className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full border-2 border-[#825084] bg-white flex items-center justify-center text-[#825084]">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              
              <div className="flex-1 pb-2">
                {/* Header row with chevron */}
                <button
                  onClick={() => toggleConversation(comment.id)}
                  className="flex items-center gap-2 w-full text-left group"
                >
                  <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedConversations[comment.id] ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">{comment.author?.name || 'Unknown'}</span>
                  <span className="text-sm text-gray-500">replied</span>
                </button>
                <p className="text-xs text-[#825084] ml-6 mt-0.5">{comment.created_at}</p>
                
                {/* Expandable message bubble - simple style */}
                {expandedConversations[comment.id] && (
                  <div className="mt-2 ml-6 py-3 px-4 bg-gray-50 border-l-2 border-[#825084]">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.message}</p>
                    
                    {/* Comment attachments */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Attachments ({comment.attachments.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {comment.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.file_url || att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="text-xs text-gray-700 truncate max-w-[150px]">{att.file_name || att.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

        {publicComments.length === 0 && !item?.description && (
          <div className="text-center py-6 text-gray-400 text-sm">
            No conversation yet
          </div>
        )}
      </div>

      {/* Comment Form - fixed at bottom */}
      {!readOnly && !hideForm && (
        <div className="flex-shrink-0 pt-4 border-t border-gray-200 -mx-6 px-6 -mb-6 pb-6 bg-gray-50">
        <div 
          className={`bg-white rounded-lg border-2 overflow-visible relative transition-colors ${
            isDragOver ? 'border-[#4a154b] bg-[#4a154b]/5' : 'border-gray-200'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-[#4a154b]/10 rounded-lg flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-white rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4a154b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm font-medium text-[#4a154b]">Drop files here</span>
              </div>
            </div>
          )}
          
          {/* Input area */}
          <div className="p-4">
            <MentionTextarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onMentionsChange={onMentionsChange}
              onPaste={handlePaste}
              rows={3}
              placeholder="Write your comment... (Use @ to mention someone, paste or drag files)"
            />
          </div>
          
          {/* Pending attachments preview */}
          {pendingAttachments.length > 0 && (
            <div className="px-4 pb-3">
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
            <div className="px-4 pb-3 flex items-center gap-2 text-sm text-gray-500">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading files...
            </div>
          )}
          
          {/* Bottom bar with icons and send button */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={commentInternal}
                  onChange={(e) => setCommentInternal(e.target.checked)}
                  className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                />
                <span className="text-sm text-gray-600">Internal note</span>
              </label>
            </div>
            
            {/* Right side - send button */}
            <button
              onClick={handleSubmit}
              disabled={processing || uploadingFiles || (!newComment.trim() && pendingAttachments.length === 0)}
              className="px-4 py-2 text-sm font-medium text-white bg-[#4a154b] rounded-md hover:bg-[#5a235c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </div>        </div>      )}
    </div>
  )
}
