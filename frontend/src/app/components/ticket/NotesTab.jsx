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
  onSubmitComment
}, ref) => {
  // Local state for note mentions
  const [noteMentions, setNoteMentions] = useState([])
  
  // Filter to only show internal notes, sorted by latest first
  const internalNotes = comments
    .filter(c => c.is_internal)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div className="space-y-6">
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

      {/* Notes Input */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          {pendingStatusAction ? 'Add Note for Status Change' : 'Add Internal Note'}
        </h3>
        <div className="flex gap-4">
          <Avatar name={currentUser?.name || 'You'} size="md" />
          <div className="flex-1">
            <MentionTextarea
              ref={ref}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              onMentionsChange={setNoteMentions}
              rows={4}
              placeholder={pendingStatusAction 
                ? "Add a note explaining this status change (optional)..." 
                : "Write an internal note... (Use @ to mention someone)"}
              className="mb-3"
            />
            <div className="flex items-center justify-end gap-3">
              {pendingStatusAction && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPendingStatusAction(null)
                    setStatusNote('')
                    setNoteMentions([])
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
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
              >
                {pendingStatusAction 
                  ? (pendingStatusAction.type === 'assign' ? 'Assign & Save' : 'Update') 
                  : 'Add Note'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Log */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Notes History</h3>
        {internalNotes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p className="text-gray-500 text-lg">No internal notes yet</p>
            <p className="text-gray-400 text-sm mt-1">Notes added during status changes will appear here</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div 
              className="absolute left-5 top-0 bottom-0 w-0.5" 
              style={{ backgroundColor: COLORS.primaryLight }}
            />
            
            <div className="space-y-6">
              {internalNotes.map((note) => (
                <div key={note.id} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div 
                    className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  
                  {/* Chat bubble */}
                  <div className="max-w-[80%]">
                    <div 
                      className="relative rounded-2xl rounded-tl-sm p-4 shadow-sm"
                      style={{ 
                        backgroundColor: `${COLORS.primary}10`,
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
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar name={note.author?.name || 'System'} size="sm" />
                        <span className="font-semibold text-gray-900 text-sm">{note.author?.name || 'System'}</span>
                        <span 
                          className="px-2 py-0.5 text-xs rounded-full text-white"
                          style={{ backgroundColor: COLORS.primary }}
                        >
                          Internal Note
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.message}</p>
                      <div className="mt-2 text-xs text-gray-500">{note.created_at}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

NotesTab.displayName = 'NotesTab'

export default NotesTab
