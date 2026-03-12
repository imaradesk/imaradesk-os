import React from 'react'
import Button from '../../../components/Button'
import { THEME } from '../../constants/theme'

export default function AttachmentsTab({ 
  attachments = [],
  onAddAttachment
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end mb-4">
        <Button
          onClick={onAddAttachment}
          style={{ backgroundColor: THEME.PRIMARY }}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Attachment
        </Button>
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <p className="text-gray-500 text-lg">No attachments yet</p>
          <p className="text-gray-400 text-sm mt-1">Add files to this ticket</p>
        </div>
      ) : (
        attachments.map(att => (
          <div key={att.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <a
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-gray-900 hover:text-[#4a154b] truncate"
                >
                  {att.file_name}
                </a>
                {att.is_internal && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    Internal
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                {att.file_size && (
                  <span>{Math.round(att.file_size / 1024)} KB</span>
                )}
                {att.uploaded_by && (
                  <span>Uploaded by {att.uploaded_by.name}</span>
                )}
                {att.created_at && (
                  <span>{att.created_at}</span>
                )}
              </div>
            </div>
            <a
              href={att.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-2 text-gray-400 hover:text-[#4a154b] rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </div>
        ))
      )}
    </div>
  )
}
