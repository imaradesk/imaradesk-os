import React, { useState } from 'react'
import Button from '../../../components/Button'
import { THEME } from '../../constants/theme'

// Helper to check if file is an image
const isImageFile = (fileName) => {
  if (!fileName) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']
  const lowerName = fileName.toLowerCase()
  return imageExtensions.some(ext => lowerName.endsWith(ext))
}

// Helper to get file icon based on extension
const getFileIcon = (fileName) => {
  if (!fileName) return 'file'
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith('.pdf')) return 'pdf'
  if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) return 'doc'
  if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) return 'xls'
  if (lowerName.endsWith('.zip') || lowerName.endsWith('.rar') || lowerName.endsWith('.7z')) return 'zip'
  if (lowerName.endsWith('.txt')) return 'txt'
  return 'file'
}

// File icon component
const FileIcon = ({ type }) => {
  const iconStyles = {
    pdf: { bg: 'bg-red-50', text: 'text-red-600', label: 'PDF' },
    doc: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'DOC' },
    xls: { bg: 'bg-green-50', text: 'text-green-600', label: 'XLS' },
    zip: { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'ZIP' },
    txt: { bg: 'bg-gray-50', text: 'text-gray-600', label: 'TXT' },
    file: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'FILE' },
  }
  const style = iconStyles[type] || iconStyles.file
  
  return (
    <div className={`w-full h-full ${style.bg} flex flex-col items-center justify-center`}>
      <svg className={`w-8 h-8 ${style.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <span className={`text-xs font-bold ${style.text} mt-1`}>{style.label}</span>
    </div>
  )
}

// Image preview with loading state
const ImagePreview = ({ src, alt, onError }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const handleLoad = () => setLoading(false)
  const handleError = () => {
    setLoading(false)
    setError(true)
    onError?.()
  }

  if (error) {
    return <FileIcon type="file" />
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-[#4a154b] rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  )
}

export default function AttachmentsTab({ 
  attachments = [],
  onAddAttachment,
  compact = false  // For use in TicketDetailPanel
}) {
  const handleImageError = (attachment) => {
    console.log('Failed to load image:', attachment.file_name, attachment.file_url)
  }

  return (
    <div className="h-full overflow-y-auto">
      {onAddAttachment && (
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
      )}

      {attachments.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <p className="text-gray-500 text-lg">No attachments yet</p>
          <p className="text-gray-400 text-sm mt-1">Add files to this ticket</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
          {attachments.map(att => {
            const isImage = isImageFile(att.file_name)
            const fileType = getFileIcon(att.file_name)
            
            // Log images for debugging
            if (isImage) {
              console.log('Loading image attachment:', att.file_name, att.file_url)
            }
            
            return (
              <a
                key={att.id}
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all hover:border-[#4a154b]"
              >
                {/* Preview area */}
                <div className={`relative ${compact ? 'h-24' : 'h-32'} bg-gray-50 overflow-hidden`}>
                  {isImage ? (
                    <ImagePreview 
                      src={att.file_url} 
                      alt={att.file_name}
                      onError={() => handleImageError(att)}
                    />
                  ) : (
                    <FileIcon type={fileType} />
                  )}
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white rounded-full p-2">
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Internal badge */}
                  {att.is_internal && (
                    <span className="absolute top-2 right-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      Internal
                    </span>
                  )}
                </div>
                
                {/* File info */}
                <div className={`${compact ? 'p-2' : 'p-3'}`}>
                  <p className={`font-medium text-gray-900 truncate group-hover:text-[#4a154b] ${compact ? 'text-xs' : 'text-sm'}`}>
                    {att.file_name}
                  </p>
                  <div className={`flex items-center gap-2 text-gray-500 mt-1 ${compact ? 'text-xs' : 'text-xs'}`}>
                    {att.file_size && (
                      <span>{Math.round(att.file_size / 1024)} KB</span>
                    )}
                    {att.uploaded_by && !compact && (
                      <>
                        <span>•</span>
                        <span className="truncate">{att.uploaded_by.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
