import React, { useMemo, useState } from 'react'
import { router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import {
  ArrowLeft, ArrowRight, Check, Info, ImagePlus, X, FilePen, Send, Globe, Star, MessageSquare, Hash,
  Pencil, SquarePen, FileText, AlignLeft, SlidersHorizontal,
} from 'lucide-react'
import api from '../../../utils/axios'
import Drawer, { DrawerBody } from '../Drawer'
import ConfirmDialog from '../ConfirmDialog'
import Select from '../SearchableSelect'
import RichEditor from '../RichEditor'
import { INPUT } from './constants'
import { Toggle, Spinner, PRIMARY_BTN, SECONDARY_BTN } from './ui'
import CategoryCreatePopover from './CategoryCreatePopover'
import { useUnsavedChanges } from '../../context/UnsavedChangesContext'

const STEPS = [
  { num: 1, title: 'Basics', icon: FileText },
  { num: 2, title: 'Content', icon: AlignLeft },
  { num: 3, title: 'Publish', icon: SlidersHorizontal },
]

const initialForm = (article, requireApproval) => ({
  title: article?.title || '',
  summary: article?.summary || '',
  content: article?.content || '',
  // The article page passes the category as an object; lists and prefills pass its id
  category: (typeof article?.category === 'object' ? article?.category?.id : article?.category) || '',
  tags: article?.tags || '',
  // New articles default to review when approval is required
  status: article?.status || (!article?.uuid && requireApproval ? 'pending' : 'draft'),
  featured: article?.featured || false,
  allow_comments: article?.allow_comments ?? true,
  display_image: article?.display_image || '',
})

/**
 * Create / edit article wizard in the shared Drawer. Mount with a fresh `key`
 * per opening so the form starts from `article` (null or a prefill for a new article).
 */
export default function ArticleFormDrawer({ isOpen, article = null, categories = [], requireApproval = false, onClose }) {
  const isEditing = !!article?.uuid
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const initial = useMemo(() => initialForm(article, requireApproval), [article, requireApproval])
  const [form, setForm] = useState(initial)
  const [imagePreview, setImagePreview] = useState(initial.display_image || null)
  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }))

  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  useUnsavedChanges(dirty)
  const requestClose = () => (dirty && !saving ? setConfirmDiscard(true) : onClose())

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)

    setUploading(true)
    setUploadProgress(0)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', 'kb-images')

    try {
      const response = await api.post('/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total)),
      })
      set('display_image')(response.data.file_url)
      toast.success('Image uploaded')
    } catch (error) {
      toast.error('Failed to upload image')
      setImagePreview(form.display_image || null)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const removeImage = () => {
    setImagePreview(null)
    set('display_image')('')
  }

  const validate = (target) => {
    const next = {}
    if (target > 1 && !form.title.trim()) next.title = 'Give the article a title'
    if (target > 1 && !form.category) next.category = 'Pick a category'
    if (Object.keys(next).length) { setErrors(next); setStep(1); return false }
    if (target > 2 && !form.content.replace(/<[^>]+>/g, '').trim()) { setErrors({ content: 'Write the article content' }); setStep(2); return false }
    setErrors({})
    return true
  }
  const goTo = (target) => { if (target < step || validate(target)) setStep(target) }

  const submit = () => {
    if (!validate(4)) return
    const url = isEditing ? `/knowledgebase/article/${article.uuid}/update/` : '/knowledgebase/article/add/'
    router.post(url, form, {
      forceFormData: true,
      preserveScroll: isEditing,
      onStart: () => setSaving(true),
      onFinish: () => setSaving(false),
      onSuccess: () => {
        toast.success(isEditing ? 'Article saved' : 'Article created')
        onClose()
      },
      onError: () => toast.error('Could not save the article'),
    })
  }

  // Enter in a text field moves to the next step instead of submitting early
  const handleSubmit = (e) => {
    e.preventDefault()
    if (step < 3) goTo(step + 1)
    else submit()
  }

  const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean)
  const statusOptions = [
    { id: 'draft', name: 'Draft', hint: 'Only visible to your team', icon: FilePen, tile: 'bg-gray-100 text-gray-600' },
    { id: 'pending', name: 'Submit for review', hint: 'An approver publishes it', icon: Send, tile: 'bg-amber-50 text-amber-600' },
    (!requireApproval || form.status === 'published') && { id: 'published', name: requireApproval ? 'Published' : 'Publish now', hint: 'Live in the support portal', icon: Globe, tile: 'bg-emerald-50 text-emerald-600' },
  ].filter(Boolean)

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={requestClose}
        title={isEditing ? 'Edit article' : 'New article'}
        description={form.title || `Step ${step} of ${STEPS.length}`}
        icon={isEditing ? Pencil : SquarePen}
        size="md"
        floating
        header={<Stepper step={step} onStep={goTo} />}
        footer={(
          <>
            {step > 1 ? (
              <button type="button" onClick={() => setStep(step - 1)} className={SECONDARY_BTN}><ArrowLeft className="w-4 h-4" /> Back</button>
            ) : (
              <button type="button" onClick={requestClose} className={SECONDARY_BTN}>Cancel</button>
            )}
            <span className="flex-1 text-xs text-gray-400 text-center hidden sm:block">{dirty ? 'Unsaved changes' : ''}</span>
            {isEditing && step < 3 && (
              <button type="button" onClick={submit} disabled={saving || uploading} className={SECONDARY_BTN}>
                {saving ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />} Save
              </button>
            )}
            {step < 3 ? (
              <button type="button" onClick={() => goTo(step + 1)} className={PRIMARY_BTN}>Continue <ArrowRight className="w-4 h-4" /></button>
            ) : (
              <button type="button" onClick={submit} disabled={saving || uploading} className={PRIMARY_BTN}>
                {saving ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />} {isEditing ? 'Save changes' : 'Create article'}
              </button>
            )}
          </>
        )}
      >
        <DrawerBody>
          <form onSubmit={handleSubmit} key={step} className="animate-fadeIn space-y-6">
            {step === 1 && (
              <>
                <Field label="Title" required error={errors.title} htmlFor="kb-title">
                  <input
                    id="kb-title"
                    type="text"
                    autoFocus
                    value={form.title}
                    onChange={(e) => { set('title')(e.target.value); setErrors({}) }}
                    className={`${INPUT} !text-base !py-2.5 ${errors.title ? '!border-red-400' : ''}`}
                    placeholder="e.g. How do I reset my password?"
                  />
                </Field>

                <Field label="Category" required error={errors.category}>
                  <Select
                    value={form.category}
                    onChange={(value) => { set('category')(value); setErrors({}) }}
                    options={categories}
                    placeholder="Select category"
                    displayKey="name"
                    valueKey="id"
                    searchable
                    allowClear={false}
                  />
                  {categories.length === 0 && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      No categories yet.{' '}
                      <CategoryCreatePopover
                        trigger={({ open, toggle }) => (
                          <button type="button" onClick={toggle} aria-expanded={open} className="text-[#0B3D26] hover:underline">Create one</button>
                        )}
                      />
                    </p>
                  )}
                </Field>

                <Field label="Summary" hint="Shown in search results and article lists." htmlFor="kb-summary">
                  <textarea
                    id="kb-summary"
                    value={form.summary}
                    onChange={(e) => set('summary')(e.target.value)}
                    rows={3}
                    className={`${INPUT} resize-none`}
                    placeholder="One or two sentences that describe the answer"
                  />
                </Field>

                <Field label="Cover image" hint="Shown at the top of the article. PNG, JPG or GIF up to 5MB.">
                  {imagePreview ? (
                    <div className="relative group rounded-xl overflow-hidden border border-gray-200">
                      <img src={imagePreview} alt="Cover preview" className="w-full h-44 object-cover" />
                      {uploading ? (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
                          <Spinner className="w-5 h-5 text-[#0B3D26]" />
                          <div className="w-40 h-1 rounded-full bg-gray-200 overflow-hidden">
                            <div className="h-full bg-[#0B3D26] transition-[width] duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center rounded-md bg-black/50 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          aria-label="Remove image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <label className="group flex flex-col items-center justify-center gap-2 h-32 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 cursor-pointer hover:border-[#0B3D26]/50 hover:bg-[#0B3D26]/[0.02] transition-colors">
                      <span className="w-9 h-9 rounded-lg bg-white border border-gray-200 inline-flex items-center justify-center text-gray-400 group-hover:text-[#0B3D26] transition-colors">
                        <ImagePlus className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-medium text-[#0B3D26]">Upload an image</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" disabled={uploading} />
                    </label>
                  )}
                </Field>
              </>
            )}

            {step === 2 && (
              <Field label="Content" required error={errors.content}>
                <RichEditor
                  value={form.content}
                  onChange={(html) => { set('content')(html); if (errors.content) setErrors({}) }}
                  placeholder="Write your article content here..."
                />
              </Field>
            )}

            {step === 3 && (
              <>
                <fieldset>
                  <legend className="text-sm font-medium text-gray-900 mb-2">Status</legend>
                  <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {statusOptions.map((o) => {
                      const on = form.status === o.id
                      const Icon = o.icon
                      return (
                        <button
                          key={o.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => set('status')(o.id)}
                          className={`relative text-left rounded-lg border p-3 transition-all ${
                            on ? 'border-[#0B3D26] ring-2 ring-[#0B3D26]/15 bg-[#0B3D26]/[0.03]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-md inline-flex items-center justify-center ${o.tile}`}><Icon className="w-3.5 h-3.5" /></span>
                          <span className="block mt-2 text-sm font-medium text-gray-900">{o.name}</span>
                          <span className="block text-xs text-gray-500">{o.hint}</span>
                          {on && (
                            <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#0B3D26] text-white inline-flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {requireApproval && (
                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      Approval is required in this workspace, so articles are published by an approver.
                    </p>
                  )}
                </fieldset>

                <Field label="Tags" hint="Comma-separated. Helps customers find the article in search." htmlFor="kb-tags">
                  <input
                    id="kb-tags"
                    type="text"
                    value={form.tags}
                    onChange={(e) => set('tags')(e.target.value)}
                    className={INPUT}
                    placeholder="billing, password, account"
                  />
                  {tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span key={t} className="inline-flex items-center gap-0.5 h-6 px-2 rounded-md bg-gray-100 text-xs text-gray-600">
                          <Hash className="w-3 h-3 text-gray-400" />{t}
                        </span>
                      ))}
                    </div>
                  )}
                </Field>

                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Options</h2>
                  <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
                    <OptionRow icon={Star} title="Feature this article" description="Highlight it on the portal home page.">
                      <Toggle checked={form.featured} onChange={set('featured')} label="Feature this article" />
                    </OptionRow>
                    <OptionRow icon={MessageSquare} title="Allow comments" description="Let readers leave comments on the article.">
                      <Toggle checked={form.allow_comments} onChange={set('allow_comments')} label="Allow comments" />
                    </OptionRow>
                  </div>
                </section>
              </>
            )}
            {/* Hidden submit so Enter in a text field triggers handleSubmit */}
            <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
          </form>
        </DrawerBody>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={onClose}
        title="Discard changes?"
        message={isEditing ? 'Your edits to this article will be lost.' : 'This article hasn’t been saved yet and will be lost.'}
        confirmText="Discard"
        cancelText="Keep editing"
      />
    </>
  )
}

function Stepper({ step, onStep }) {
  return (
    <ol className="px-6 py-2.5 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
      {STEPS.map((s, i) => {
        const done = step > s.num
        const current = step === s.num
        return (
          <li key={s.num} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {i > 0 && <span className={`w-6 sm:w-10 h-px transition-colors ${step > i ? 'bg-[#0B3D26]/40' : 'bg-gray-200'}`} />}
            <button
              type="button"
              onClick={() => onStep(s.num)}
              aria-current={current ? 'step' : undefined}
              className={`h-7 pl-1 pr-2.5 inline-flex items-center gap-1.5 rounded-full text-xs font-medium transition-colors ${current ? 'bg-[#0B3D26]/10 text-[#0B3D26]' : done ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center transition-colors ${current ? 'bg-[#0B3D26] text-white' : done ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {done ? <Check className="w-3 h-3" strokeWidth={3} /> : <s.icon className="w-3 h-3" />}
              </span>
              {s.title}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function Field({ label, required, hint, error, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function OptionRow({ icon: Icon, title, description, children }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  )
}
