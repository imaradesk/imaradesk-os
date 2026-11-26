import React, { useRef, useState, useEffect, useCallback } from 'react'
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, RotateCw } from 'lucide-react'

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const matchesAccept = (file, accept) => {
  if (!accept) return true
  return accept.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).some((t) => {
    if (t.startsWith('.')) return file.name.toLowerCase().endsWith(t)
    if (t.endsWith('/*')) return file.type.toLowerCase().startsWith(t.slice(0, -1))
    return file.type.toLowerCase() === t
  })
}

/**
 * Shared file input that uploads as soon as a file is chosen and shows the progress.
 *
 *   <FileUpload
 *     accept="image/*"
 *     maxSize={5 * 1024 * 1024}
 *     hint="PNG, JPG, GIF up to 5MB"
 *     onUpload={async (file, { onProgress, signal }) => { … onProgress(percent) … }}
 *     onSuccess={(result, file) => …}
 *   />
 *
 * - `onUpload` must return a promise; throw (or reject) to show the error and offer a retry.
 *   Call `onProgress(0-100)` as bytes are sent, and pass `signal` to the request so Cancel can abort it.
 * - Click or drag-and-drop to choose a file. Image files get a thumbnail.
 * - The file is not shown as done until `onUpload` resolves.
 */
export default function FileUpload({
  onUpload,
  onSuccess,
  onError,
  accept,
  maxSize,
  hint,
  label = 'Click to upload or drag and drop',
  disabled = false,
  className = '',
}) {
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('idle') // idle | uploading | done | error
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  // Release the thumbnail URL and abort any request still in flight when unmounting
  useEffect(() => () => abortRef.current?.abort(), [])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const start = useCallback(async (selected) => {
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('uploading')
    setProgress(0)
    setError('')
    try {
      const result = await onUpload(selected, {
        signal: controller.signal,
        onProgress: (percent) => setProgress(Math.max(0, Math.min(100, Math.round(percent)))),
      })
      setProgress(100)
      setStatus('done')
      onSuccess?.(result, selected)
    } catch (err) {
      if (controller.signal.aborted) return
      const message = err?.response?.data?.error || err?.message || 'Upload failed'
      setError(message)
      setStatus('error')
      onError?.(err, selected)
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [onUpload, onSuccess, onError])

  const reset = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setFile(null)
    setPreview(null)
    setProgress(0)
    setStatus('idle')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const select = (selected) => {
    if (!selected || disabled || status === 'uploading') return
    if (!matchesAccept(selected, accept)) {
      setFile(null)
      setPreview(null)
      setStatus('error')
      setError('This file type is not supported')
      return
    }
    if (maxSize && selected.size > maxSize) {
      setFile(null)
      setPreview(null)
      setStatus('error')
      setError(`File must be smaller than ${formatBytes(maxSize)}`)
      return
    }
    setFile(selected)
    setPreview(selected.type.startsWith('image/') ? URL.createObjectURL(selected) : null)
    start(selected)
  }

  const uploading = status === 'uploading'
  const openPicker = () => { if (!disabled && !uploading) inputRef.current?.click() }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled || uploading}
        onChange={(e) => select(e.target.files?.[0])}
        className="hidden"
      />

      {/* Drop zone: shown until a file has been accepted */}
      {!file && (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={openPicker}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker() } }}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); select(e.dataTransfer.files?.[0]) }}
          className={`border-2 border-dashed rounded-xl px-6 py-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B3D26]/40 ${
            disabled ? 'opacity-50 cursor-not-allowed border-gray-200'
              : isDragging ? 'cursor-pointer border-[#0B3D26] bg-[#0B3D26]/5'
                : 'cursor-pointer border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <span className="mx-auto mb-3 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <UploadCloud className="w-6 h-6 text-gray-400" />
          </span>
          <p className="text-sm font-medium text-gray-700">{isDragging ? 'Drop file here' : label}</p>
          {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
      )}

      {/* Selected file with progress */}
      {file && (
        <div className={`rounded-xl border px-4 py-3.5 ${status === 'error' ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-3">
            {preview ? (
              <img src={preview} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
            ) : (
              <span className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-gray-400" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>{file.name}</p>
              <p className="text-xs text-gray-500">
                {formatBytes(file.size)}
                {uploading && ` · Uploading ${progress}%`}
                {status === 'done' && ' · Uploaded'}
              </p>
            </div>
            {status === 'done' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
            {status === 'error' && (
              <button type="button" onClick={() => start(file)} title="Retry" aria-label="Retry upload" className="p-1.5 rounded-md text-gray-500 hover:text-[#0B3D26] hover:bg-white flex-shrink-0">
                <RotateCw className="w-4 h-4" />
              </button>
            )}
            {status !== 'done' && (
              <button type="button" onClick={reset} title={uploading ? 'Cancel' : 'Remove'} aria-label={uploading ? 'Cancel upload' : 'Remove file'} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {(uploading || status === 'done') && (
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden"
            >
              <div
                className={`h-full rounded-full transition-all duration-200 ease-out ${status === 'done' ? 'bg-emerald-500' : 'bg-[#0B3D26]'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {status === 'error' && error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 mt-px flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}
