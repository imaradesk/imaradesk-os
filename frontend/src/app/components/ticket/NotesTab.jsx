import React, { forwardRef, useState } from 'react'
import Avatar from '../../../components/Avatar'
import Button from '../../../components/Button'
import MentionTextarea from '../../../components/MentionTextarea'
import { COLORS } from '../../constants/theme'

const NotesTab = forwardRef(({ 
  comments = [],
  currentUser,
  statusNote,
  setStatusNote,
  pendingStatusAction,
  setPendingStatusAction,
  processing,
  onExecuteAction,
  onSubmitComment,
  hideForm = false  // Hide the input form (for use in detail panel)
}, ref) => {
  // Local state for note mentions
  const [noteMentions, setNoteMentions] = useState([])
  
  // Expanded items state for collapsible functionality
  const [expandedNotes, setExpandedNotes] = useState({})
  
  // Toggle expand/collapse
  const toggleNote = (id) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }))
  }
  
  // Filter to only show internal notes, sorted by latest first
  const internalNotes = comments
    .filter(c => c.is_internal)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  
  // Collapse/Expand all functions
  const collapseAllNotes = () => {
    setExpandedNotes({})
  }
  
  const expandAllNotes = () => {
    const expanded = {}
    internalNotes.forEach(n => { expanded[n.id] = true })
    setExpandedNotes(expanded)
  }
  
  // Check if all are collapsed
  const allNotesCollapsed = Object.keys(expandedNotes).length === 0 || 
    Object.values(expandedNotes).every(v => !v)

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable notes area */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pb-4">
        {/* Pending Action Banner */}
        {pendingStatusAction && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium text-amber-800">
                  {pendingStatusAction.type === 'assign' 
                    ? 'Assigning ticket to yourself' 
                    : `Changing status to ${pendingStatusAction.value?.replace('_', ' ')}`}
                </p>
                <p className="text-sm text-amber-700 mt-1">Add a note and confirm the action</p>
              </div>
            </div>
          </div>
        )}

        {/* Notes History */}
        <div>
          {/* Header with Expand/Collapse All */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Internal Notes</h3>
            {internalNotes.length > 0 && (
              <button
                onClick={allNotesCollapsed ? expandAllNotes : collapseAllNotes}
                className="text-sm text-[#4a154b] hover:text-[#5a235c]"
              >
                {allNotesCollapsed ? 'Expand All' : 'Collapse All'}
              </button>
            )}
          </div>
          
          {internalNotes.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              No internal notes yet
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line - amber for internal notes */}
              <div className="absolute left-[11px] top-3 bottom-0 w-px bg-amber-200" />
              
              <div className="space-y-4">
                {internalNotes.map((note) => (
                  <div key={note.id} className="relative flex items-start gap-3">
                    {/* Timeline dot with pencil icon - amber color */}
                    <div className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full border-2 border-amber-400 bg-white flex items-center justify-center text-amber-400">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    
                    <div className="flex-1 pb-2">
                      {/* Header row with chevron */}
                      <button
                        onClick={() => toggleNote(note.id)}
                        className="flex items-center gap-2 w-full text-left group flex-wrap"
                      >
                        <svg 
                          className={`w-4 h-4 text-gray-400 transition-transform ${expandedNotes[note.id] ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">{note.author?.name || 'System'}</span>
                        <span className="text-sm text-gray-500">added a note</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                          Internal
                        </span>
                      </button>
                      <p className="text-xs text-[#825084] ml-6 mt-0.5">{note.created_at}</p>
                      
                      {/* Expandable message bubble - amber style */}
                      {expandedNotes[note.id] && (
                        <div className="mt-2 ml-6 py-3 px-4 bg-amber-50 border-l-2 border-amber-200">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.message}</p>
                          
                          {/* Note attachments */}
                          {note.attachments && note.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-amber-200">
                              <p className="text-xs text-gray-500 mb-2">Attachments ({note.attachments.length})</p>
                              <div className="flex flex-wrap gap-2">
                                {note.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att.file_url || att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-2 py-1.5 bg-white border border-amber-200 rounded hover:bg-amber-50 transition-colors"
                                  >
                                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          )}
        </div>
      </div>

      {/* Notes Input - fixed at bottom */}
      {!hideForm && (
      <div className="flex-shrink-0 pt-4 border-t border-gray-200 -mx-6 px-6 -mb-6 pb-6 bg-gray-50">
        <div className="bg-white rounded-lg border border-gray-200 overflow-visible relative">
          <div className="px-4 pt-4 pb-2">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">
              {pendingStatusAction ? 'Add Note for Status Change' : 'Add Internal Note'}
            </h3>
          <MentionTextarea
            ref={ref}
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            onMentionsChange={setNoteMentions}
            rows={3}
            placeholder={pendingStatusAction 
              ? "Add a note explaining this status change (optional)..." 
              : "Write an internal note... (Use @ to mention someone)"}
          />
        </div>
        
        {/* Bottom bar */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
          {pendingStatusAction && (
            <button
              onClick={() => {
                setPendingStatusAction(null)
                setStatusNote('')
                setNoteMentions([])
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => {
              if (pendingStatusAction) {
                onExecuteAction(statusNote, noteMentions)
                setNoteMentions([])
              } else if (statusNote.trim()) {
                onSubmitComment({
                  message: statusNote,
                  is_internal: true,
                  mentions: noteMentions
                })
                setStatusNote('')
                setNoteMentions([])
              }
            }}
            disabled={processing || (!pendingStatusAction && !statusNote.trim())}
            className="px-4 py-2 text-sm font-medium text-white bg-[#4a154b] rounded-md hover:bg-[#5a235c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pendingStatusAction 
              ? (pendingStatusAction.type === 'assign' ? 'Assign & Save' : 'Update') 
              : 'Add Note'}
          </button>
        </div>
        </div>
      </div>
      )}
    </div>
  )
})

NotesTab.displayName = 'NotesTab'

export default NotesTab
