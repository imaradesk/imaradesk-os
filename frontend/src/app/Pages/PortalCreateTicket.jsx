import React, { useRef, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, FileText, Loader2, Mail, Pencil,
  Phone, Plus, Send, UploadCloud, User, X, Zap,
} from 'lucide-react'
import api from '../../utils/axios'
import RichEditor, { isRichTextEmpty } from '../components/RichEditor'
import PortalShell from '../components/portal/PortalShell'
import { useDirtyState, useUnsavedChanges } from '../context/UnsavedChangesContext'
import {
  BTN_PRIMARY, BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT, PORTAL_TINT, PortalHero, PortalSection,
  PortalSteps, Reveal,
} from '../components/portal/PortalUI'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
]

const FIELD_LABEL = 'block text-xs font-medium text-gray-600 mb-1.5'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const STEPS = [
  { label: 'Your details', description: 'How we reach you' },
  { label: 'Your issue', description: 'What is going on' },
  { label: 'Review', description: 'Check and send' },
]

function FieldError({ children }) {
  if (!children) return null
  return <p className="mt-1 text-[11px] text-red-600 animate-fadeIn">{children}</p>
}

/** Checkmark that draws itself on the success screen */
function SuccessMark() {
  return (
    <div className="relative w-14 h-14 mx-auto mb-4">
      <span className="absolute inset-0 rounded-full bg-green-500/20 animate-ping [animation-iteration-count:1]" />
      <span className="relative w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center animate-portalPop">
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path className="portal-check-path" d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    </div>
  )
}

export default function PortalCreateTicket({ suggest_kb, suggested_articles = [], tenant_name, webChannelActive = true }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    description: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticketCreated, setTicketCreated] = useState(false)
  const [ticketNumber, setTicketNumber] = useState('')
  const [attachments, setAttachments] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [errors, setErrors] = useState({})
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)
  const topRef = useRef(null)
  const formDirty = useDirtyState(formData)
  useUnsavedChanges(!ticketCreated && (formDirty || attachments.length > 0))

  const validate = (index) => {
    const next = {}
    if (index === 0) {
      if (!formData.name.trim()) next.name = 'Please tell us your name.'
      if (!EMAIL_RE.test(formData.email.trim())) next.email = 'Enter a valid email so we can reply.'
    }
    if (index === 1) {
      if (!formData.subject.trim()) next.subject = 'Add a short summary.'
      if (isRichTextEmpty(formData.description)) next.description = 'Describe the issue so we can help.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const goTo = (index) => {
    setDirection(index > step ? 1 : -1)
    setStep(index)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const goNext = () => { if (validate(step)) goTo(step + 1) }

  const handleFileSelect = (e) => uploadFiles(Array.from(e.target.files))

  const uploadFiles = async (files) => {
    if (!files.length) return

    const validFiles = []
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`)
        continue
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type.`)
        continue
      }
      validFiles.push(file)
    }

    if (!validFiles.length) return

    setUploadingFiles(true)
    const uploadedFiles = []

    for (const file of validFiles) {
      try {
        const body = new FormData()
        body.append('file', file)
        body.append('category', 'ticket-attachments')

        const response = await api.post('/api/upload-file/', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        const result = response.data
        if (result.success && result.file_url) {
          uploadedFiles.push({ url: result.file_url, name: file.name, size: file.size, type: file.type })
        }
      } catch (error) {
        console.error('Upload error:', error)
        toast.error(`Failed to upload ${file.name}`)
      }
    }

    if (uploadedFiles.length > 0) {
      setAttachments((prev) => [...prev, ...uploadedFiles])
      toast.success(`${uploadedFiles.length} file(s) uploaded successfully`)
    }

    setUploadingFiles(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    // Enter in a field on an earlier step moves forward instead of submitting
    if (step < STEPS.length - 1) { goNext(); return }
    if (!validate(0)) { goTo(0); return }
    if (!validate(1)) { goTo(1); return }
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const response = await api.post('/portal/submit-ticket/', {
        ...formData,
        attachments,
      })

      const data = response.data
      if (data.success) {
        setTicketCreated(true)
        setTicketNumber(data.ticket_number)
        toast.success('Ticket created successfully!')
      } else {
        toast.error(data.message || 'Failed to create ticket')
      }
    } catch (error) {
      console.error('Ticket submission error:', error)
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (errors[e.target.name]) setErrors((prev) => ({ ...prev, [e.target.name]: undefined }))
  }

  const inputClass = (field) => `${PORTAL_INPUT} ${errors[field] ? '!border-red-400 focus:!ring-red-500/15' : ''}`

  if (ticketCreated) {
    return (
      <>
        <Head title="Ticket created" />
        <PortalShell tenantName={tenant_name}>
          <div className="max-w-xl mx-auto px-4 sm:px-6 py-16">
            <div className={`${PORTAL_CARD} p-8 text-center animate-scaleIn`}>
              <SuccessMark />
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Ticket created</h1>
              <p className="mt-1 text-sm text-gray-500">
                We have emailed a confirmation to <span className="font-medium text-gray-700">{formData.email}</span>.
              </p>

              <Reveal index={4} step={80} className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Your ticket number</p>
                <p className="mt-1 text-2xl font-semibold text-[#0B3D26] tabular-nums tracking-tight">{ticketNumber}</p>
              </Reveal>

              <p className="mt-4 text-xs text-gray-500">
                Keep this number handy. You can use it with your email address to track the ticket.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  href={`/portal/track-ticket/?ticket_number=${encodeURIComponent(ticketNumber)}&email=${encodeURIComponent(formData.email)}`}
                  className={BTN_PRIMARY}
                >
                  Track ticket <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/portal/" className={BTN_SECONDARY}>Back to home</Link>
              </div>
            </div>
          </div>
        </PortalShell>
      </>
    )
  }

  return (
    <>
      <Head title="Submit ticket" />

      <PortalShell tenantName={tenant_name}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
          <PortalHero
            compact
            eyebrow="New request"
            title="Submit a support ticket"
            description="Fill in the details below and our team will get back to you as soon as possible."
          />

          <div className="mt-5">
            {!webChannelActive ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-semibold text-amber-900">Ticket submission unavailable</h2>
                    <p className="mt-1 text-sm text-amber-700">
                      We are not accepting new tickets through this channel right now. Please try again later or use another contact method.
                    </p>
                    <Link href="/portal/" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-900 hover:underline">
                      <ArrowLeft className="w-4 h-4" /> Return to portal home
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                {/* Form */}
                <div ref={topRef} className="lg:col-span-2 scroll-mt-20">
                  <form onSubmit={handleSubmit} noValidate className={`${PORTAL_CARD} overflow-hidden`}>
                    <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-gray-200">
                      <PortalSteps steps={STEPS} current={step} onSelect={goTo} />
                    </div>

                    {/* Keyed on the step so each one slides in from the direction of travel */}
                    <div
                      key={step}
                      className="p-5 sm:p-6 animate-portalSlideIn"
                      style={{ '--slide-from': `${direction * 24}px` }}
                    >
                      {step === 0 && (
                        <PortalSection title="Let's start with you" description="We will send updates about your request to this email.">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className={FIELD_LABEL} htmlFor="name">Full name <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input id="name" type="text" name="name" value={formData.name} onChange={handleChange} autoFocus className={`${inputClass('name')} pl-9`} autoComplete="name" placeholder="Jane Doe" />
                              </div>
                              <FieldError>{errors.name}</FieldError>
                            </div>
                            <div>
                              <label className={FIELD_LABEL} htmlFor="email">Email address <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} className={`${inputClass('email')} pl-9`} autoComplete="email" placeholder="you@example.com" />
                              </div>
                              <FieldError>{errors.email}</FieldError>
                            </div>
                            <div className="sm:col-span-2">
                              <label className={FIELD_LABEL} htmlFor="phone">Phone number <span className="text-gray-400 font-normal">(optional)</span></label>
                              <div className="relative">
                                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input id="phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} className={`${PORTAL_INPUT} pl-9`} autoComplete="tel" />
                              </div>
                            </div>
                          </div>
                        </PortalSection>
                      )}

                      {step === 1 && (
                        <PortalSection title="What do you need help with?" description="The more detail you share, the faster we can solve it.">
                          <div className="space-y-4">
                            <div>
                              <label className={FIELD_LABEL} htmlFor="subject">Subject <span className="text-red-500">*</span></label>
                              <input id="subject" type="text" name="subject" value={formData.subject} onChange={handleChange} autoFocus className={inputClass('subject')} placeholder="A short summary of your issue" />
                              <FieldError>{errors.subject}</FieldError>
                            </div>

                            <div>
                              <label className={FIELD_LABEL}>Description <span className="text-red-500">*</span></label>
                              <RichEditor
                                value={formData.description}
                                onChange={(html) => {
                                  setFormData((prev) => ({ ...prev, description: html }))
                                  if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }))
                                }}
                                placeholder="What happened, what you expected, and any steps to reproduce it…"
                              />
                              <FieldError>{errors.description}</FieldError>
                            </div>

                            <div>
                              <label className={FIELD_LABEL}>Attachments <span className="text-gray-400 font-normal">(optional)</span></label>
                              <div
                                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(e) => { e.preventDefault(); setDragging(false); uploadFiles(Array.from(e.dataTransfer.files)) }}
                                className={`rounded-xl border border-dashed p-5 text-center transition-all duration-200 ${
                                  dragging ? 'border-[#0B3D26] bg-[#0B3D26]/5 scale-[1.01]'
                                    : uploadingFiles ? 'border-[#0B3D26]/40 bg-[#0B3D26]/5' : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  multiple
                                  onChange={handleFileSelect}
                                  className="hidden"
                                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                                />
                                <UploadCloud className={`w-6 h-6 mx-auto mb-2 transition-all ${dragging ? 'text-[#0B3D26] -translate-y-1' : 'text-gray-400'}`} />
                                <p className="text-xs text-gray-500 mb-2">{dragging ? 'Drop to upload' : 'Drag files here, or'}</p>
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={uploadingFiles}
                                  className={BTN_SECONDARY}
                                >
                                  {uploadingFiles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                  {uploadingFiles ? 'Uploading…' : 'Choose files'}
                                </button>
                                <p className="mt-2 text-[11px] text-gray-500">PNG, JPG, GIF, PDF, DOC, XLS up to 10MB each</p>
                              </div>

                              {attachments.length > 0 && (
                                <ul className="mt-3 space-y-2">
                                  {attachments.map((file, index) => (
                                    <li key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 animate-portalRise">
                                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
                                        <p className="text-[11px] text-gray-500">{formatFileSize(file.size)}</p>
                                      </div>
                                      <button type="button" onClick={() => removeAttachment(index)} className="text-gray-400 hover:text-red-600 p-1" aria-label={`Remove ${file.name}`}>
                                        <X className="w-4 h-4" />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </PortalSection>
                      )}

                      {step === 2 && (
                        <PortalSection title="Review your request" description="Make sure everything looks right before sending.">
                          <div className="space-y-3">
                            <Reveal className="rounded-xl border border-gray-200 p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">Contact</h3>
                                <button type="button" onClick={() => goTo(0)} className="inline-flex items-center gap-1 text-xs text-[#0B3D26] hover:underline">
                                  <Pencil className="w-3 h-3" /> Edit
                                </button>
                              </div>
                              <p className="text-sm font-medium text-gray-900">{formData.name}</p>
                              <p className="text-sm text-gray-600">{formData.email}{formData.phone && ` · ${formData.phone}`}</p>
                            </Reveal>

                            <Reveal index={1} className="rounded-xl border border-gray-200 p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">Issue</h3>
                                <button type="button" onClick={() => goTo(1)} className="inline-flex items-center gap-1 text-xs text-[#0B3D26] hover:underline">
                                  <Pencil className="w-3 h-3" /> Edit
                                </button>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">{formData.subject}</p>
                              <div
                                className="mt-2 prose prose-sm max-w-none text-gray-700 prose-p:my-1 max-h-48 overflow-y-auto"
                                dangerouslySetInnerHTML={{ __html: formData.description }}
                              />
                              {attachments.length > 0 && (
                                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500">
                                  <FileText className="w-3.5 h-3.5" /> {attachments.length} attachment{attachments.length === 1 ? '' : 's'}
                                </p>
                              )}
                            </Reveal>
                          </div>
                        </PortalSection>
                      )}
                    </div>

                    <div className="px-5 sm:px-6 py-4 border-t border-gray-200 bg-gray-50/60 flex items-center justify-between gap-3">
                      {step > 0 ? (
                        <button type="button" onClick={() => goTo(step - 1)} className={BTN_SECONDARY}>
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                      ) : (
                        <p className="text-[11px] text-gray-500">Step 1 of {STEPS.length} · takes about a minute</p>
                      )}

                      {step < STEPS.length - 1 ? (
                        <button type="button" onClick={goNext} disabled={uploadingFiles} className={`${BTN_PRIMARY} group`}>
                          Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ) : (
                        <button type="submit" disabled={isSubmitting || uploadingFiles} className={BTN_PRIMARY}>
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {isSubmitting ? 'Submitting…' : 'Submit ticket'}
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <div className={`${PORTAL_TINT} p-5`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-[#0B3D26]" />
                      <h2 className="text-sm font-semibold text-gray-900">Fast response</h2>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Our average first response time is under 2 hours during business hours.
                    </p>
                  </div>

                  <div className={`${PORTAL_CARD} p-5`}>
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">Tips for faster support</h2>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {[
                        'Describe the issue and what you expected to happen',
                        'Include any error messages you saw',
                        'List the steps that reproduce the problem',
                        'Attach screenshots when helpful',
                      ].map((tip) => (
                        <li key={tip} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-xs leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {suggest_kb && suggested_articles.length > 0 && (
                    <div className={`${PORTAL_CARD} p-5`}>
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <h2 className="text-sm font-semibold text-gray-900">Helpful articles</h2>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">These may answer your question before you submit.</p>
                      <div className="space-y-2">
                        {suggested_articles.map((article) => (
                          <Link
                            key={article.uuid}
                            href={`/portal/kb/${article.uuid}/`}
                            className="portal-lift block rounded-lg border border-gray-200 px-3 py-2 hover:border-gray-300 hover:bg-gray-50"
                          >
                            <h3 className="text-xs font-medium text-gray-900 line-clamp-2">{article.title}</h3>
                            {article.excerpt && <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-2">{article.excerpt}</p>}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </PortalShell>
    </>
  )
}
