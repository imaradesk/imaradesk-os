import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import toast from 'react-hot-toast'
import { ArrowLeft, Send, Save, Loader2, Braces, Search, AlertTriangle, Eye } from 'lucide-react'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import { SettingsHeading } from '../components/settings/SettingsPage'
import TestEmailModal from '../components/settings/TestEmailModal'
import StatusBadge from '../components/settings/TemplateStatusBadge'

const STATUSES = [
  { value: 'active', label: 'Active', hint: 'Sent when its event happens' },
  { value: 'draft', label: 'Draft', hint: 'Not sent yet' },
  { value: 'archived', label: 'Archived', hint: 'No longer sent' },
]

// Same sample values the server uses when it sends a test email
const SAMPLE_VALUES = {
  ticket_number: 'TKT-12345',
  ticket_subject: 'Sample Test Ticket Subject',
  ticket_priority: 'High',
  ticket_status: 'Open',
  ticket_description: 'This is a sample ticket description for testing purposes.',
  company_name: 'Imaradesk Support',
  expiry_hours: '24',
  time_remaining: '2 hours',
  task_title: 'Sample Task Title',
  task_description: 'This is a sample task description.',
  task_due_date: '2024-12-31',
  task_status: 'In Progress',
  comment_text: 'This is a sample comment text for testing.',
  sla_name: 'Standard SLA',
  breach_time: '30 minutes',
  current_time: '2024-01-15 10:30 AM',
}

const TOKEN = /({{\s*[^}]+?\s*}})/g
const tokenName = (part) => part.replace(/^{{\s*|\s*}}$/g, '')

const inputClass = (error) =>
  `w-full h-10 px-3 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
    error ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-300 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]'
  }`

function Card({ title, description, children, className = '' }) {
  return (
    <section className={`bg-white border border-gray-200 rounded-xl ${className}`}>
      {title && (
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

function FieldError({ message }) {
  return message ? <p className="mt-1.5 text-xs text-red-600">{message}</p> : null
}

/** Renders text with {{tokens}} either highlighted or swapped for sample values. */
function TokenText({ text, sample, variables }) {
  return text.split(TOKEN).map((part, i) => {
    if (!part.match(TOKEN)) return <React.Fragment key={i}>{part}</React.Fragment>
    const name = tokenName(part)
    if (sample) {
      const value = SAMPLE_VALUES[name] ?? variables[name]
      return value
        ? <span key={i} className={SAMPLE_VALUES[name] ? '' : 'italic text-gray-500'}>{value}</span>
        : <span key={i} className="text-red-600">{part}</span>
    }
    const known = name in variables
    return (
      <span
        key={i}
        className={`px-1 rounded font-mono text-[0.85em] ${known ? 'bg-[#0B3D26]/10 text-[#0B3D26]' : 'bg-red-50 text-red-600'}`}
        title={known ? variables[name] : 'Not a variable this template provides'}
      >
        {part}
      </span>
    )
  })
}

function EmailPreview({ subject, body, sample, variables }) {
  const paragraphs = body.split(/\n\s*\n/).filter(p => p.trim())
  return (
    <div className="rounded-lg bg-gray-100 p-3 sm:p-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white border border-gray-200 border-b-0 rounded-t-lg px-5 py-3 text-base font-bold text-gray-900">Imaradesk</div>
        <div className="bg-white border border-gray-200 px-5 py-5 text-sm text-gray-700 leading-relaxed space-y-3 break-words">
          {paragraphs.length === 0
            ? <p className="text-gray-400 italic">The email body is empty.</p>
            : paragraphs.map((p, i) => (
              <p key={i}>
                {p.split('\n').map((line, j, lines) => (
                  <React.Fragment key={j}>
                    <TokenText text={line} sample={sample} variables={variables} />
                    {j < lines.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-b-lg px-5 py-3 text-xs text-gray-500">Imaradesk — Support</div>
      </div>
      <p className="sr-only">Subject: {subject}</p>
    </div>
  )
}

export default function EditEmailTemplate({ template }) {
  const { auth } = usePage().props
  const initial = useMemo(() => ({
    name: template.name || '',
    subject: template.subject || '',
    body_text: template.body_text || '',
    status: template.status || 'active',
  }), [template])

  const [saved, setSaved] = useState(initial)
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [sample, setSample] = useState(false)
  const [varQuery, setVarQuery] = useState('')
  const [testOpen, setTestOpen] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(template.updated_at)

  const subjectRef = useRef(null)
  const bodyRef = useRef(null)
  // Variables go into whichever field was focused last; the body by default
  const lastField = useRef('body_text')

  const variables = template.available_variables || {}
  const dirty = Object.keys(form).some(k => form[k] !== saved[k])

  const unknownTokens = useMemo(() => {
    const used = new Set([...`${form.subject}\n${form.body_text}`.matchAll(TOKEN)].map(m => tokenName(m[0])))
    return [...used].filter(name => !(name in variables))
  }, [form.subject, form.body_text, variables])

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }))
  }

  const insertVariable = (name) => {
    const field = lastField.current
    const el = field === 'subject' ? subjectRef.current : bodyRef.current
    const token = `{{${name}}}`
    const value = form[field]
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    set(field, value.slice(0, start) + token + value.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const save = async () => {
    if (saving) return
    const next = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (!form.subject.trim()) next.subject = 'Subject is required'
    if (!form.body_text.trim()) next.body_text = 'Email body is required'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post(`/administration/emails/templates/${template.id}/update/`, form)
      setSaved(form)
      setErrors({})
      if (data.updated_at) setUpdatedAt(data.updated_at)
      toast.success('Template saved')
    } catch (error) {
      const data = error.response?.data
      if (data?.errors) setErrors(data.errors)
      toast.error(data?.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  // Cmd/Ctrl+S saves
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = '' }
    const removeInertia = router.on('before', (event) => {
      if (event.detail.visit.method === 'get' && !window.confirm('You have unsaved changes. Leave without saving?')) {
        event.preventDefault()
      }
    })
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      removeInertia()
    }
  }, [dirty])

  const varTerm = varQuery.trim().toLowerCase()
  const shownVariables = Object.entries(variables).filter(([name, desc]) =>
    !varTerm || name.toLowerCase().includes(varTerm) || (desc || '').toLowerCase().includes(varTerm)
  )

  return (
    <>
      <Head title={`${form.name || 'Email template'} - Email Templates`} />
      <AppShell active="settings" fixedHeight>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
              <Link
                href="/administration/emails/templates/"
                className="p-1.5 -ml-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Back to email templates"
                title="Back to email templates"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0 flex-1">
                <SettingsHeading section="emails-templates">
                  <span className="truncate">{form.name || 'Untitled template'}</span>
                  <StatusBadge status={form.status} />
                </SettingsHeading>
              </div>
              <p className="hidden md:block text-xs text-gray-500">
                {dirty
                  ? <span className="inline-flex items-center gap-1.5 text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Unsaved changes</span>
                  : updatedAt && <>Saved {new Date(updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</>}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTestOpen(true)}
                  className="h-9 px-3 sm:px-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Send className="w-4 h-4" /> <span className="hidden sm:inline">Send test</span>
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || saving}
                  title="Save (Ctrl+S)"
                  className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-medium shadow-sm transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving' : 'Save changes'}
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); save() }}
              className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-5 gap-6 items-start"
            >
              <div className="lg:col-span-3 space-y-6 min-w-0">
                <Card title="Details">
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                      <input
                        id="name"
                        type="text"
                        value={form.name}
                        maxLength={200}
                        onChange={(e) => set('name', e.target.value)}
                        className={inputClass(errors.name)}
                      />
                      <FieldError message={errors.name} />
                    </div>

                    <div>
                      <span className="block text-sm font-medium text-gray-700 mb-1.5">Status</span>
                      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Status">
                        {STATUSES.map(s => (
                          <button
                            key={s.value}
                            type="button"
                            role="radio"
                            aria-checked={form.status === s.value}
                            onClick={() => set('status', s.value)}
                            className={`text-left px-3 py-2 rounded-lg border transition-all ${
                              form.status === s.value
                                ? 'border-[#0B3D26] bg-[#0B3D26]/5 ring-1 ring-[#0B3D26]'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <span className="block text-sm font-medium text-gray-900">{s.label}</span>
                            <span className="block text-xs text-gray-500 mt-0.5">{s.hint}</span>
                          </button>
                        ))}
                      </div>
                      <FieldError message={errors.status} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      <span>Sent for <span className="font-medium text-gray-700">{template.type}</span> · {template.category}</span>
                      <code className="font-mono text-gray-400">{template.template_type}</code>
                    </div>
                  </div>
                </Card>

                <Card title="Message" description="Plain text. Leave a blank line between paragraphs; the header and footer are added for you.">
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                      <input
                        id="subject"
                        ref={subjectRef}
                        type="text"
                        value={form.subject}
                        maxLength={500}
                        onFocus={() => { lastField.current = 'subject' }}
                        onChange={(e) => set('subject', e.target.value)}
                        placeholder="e.g. Ticket #{{ticket_number}} created"
                        className={inputClass(errors.subject)}
                      />
                      <FieldError message={errors.subject} />
                    </div>

                    <div>
                      <div className="flex items-end justify-between gap-2 mb-1.5">
                        <label htmlFor="body_text" className="block text-sm font-medium text-gray-700">Body</label>
                        <span className="text-xs text-gray-400">{form.body_text.length.toLocaleString()} characters</span>
                      </div>
                      <textarea
                        id="body_text"
                        ref={bodyRef}
                        value={form.body_text}
                        onFocus={() => { lastField.current = 'body_text' }}
                        onChange={(e) => set('body_text', e.target.value)}
                        rows={16}
                        className={`${inputClass(errors.body_text)} h-auto py-2.5 leading-relaxed resize-y min-h-[14rem]`}
                        placeholder={'Hi {{customer_name}},\n\nYour support ticket has been created.\n\nThank you,\n{{company_name}}'}
                      />
                      <FieldError message={errors.body_text} />
                    </div>

                    {unknownTokens.length > 0 && (
                      <div className="flex gap-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                        <p>
                          {unknownTokens.map(t => <code key={t} className="font-mono mr-1">{`{{${t}}}`}</code>)}
                          {unknownTokens.length === 1 ? 'is not a variable' : 'are not variables'} this template provides, so {unknownTokens.length === 1 ? 'it' : 'they'} will be sent as typed.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <aside className="lg:col-span-2 space-y-6 min-w-0 lg:sticky lg:top-20">
                <Card>
                  <div className="-m-5">
                    <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-gray-100">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Eye className="w-4 h-4 text-gray-400" /> Preview
                      </h2>
                      <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                        Sample data
                        <button
                          type="button"
                          role="switch"
                          aria-checked={sample}
                          onClick={() => setSample(s => !s)}
                          className={`relative w-8 h-[18px] rounded-full transition-colors ${sample ? 'bg-[#0B3D26]' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${sample ? 'translate-x-3.5' : ''}`} />
                        </button>
                      </label>
                    </div>
                    <div className="px-5 py-3 border-b border-gray-100 text-xs space-y-1">
                      <div className="flex gap-2"><span className="w-12 shrink-0 text-gray-400">To</span><span className="text-gray-700 truncate">{auth?.user?.email || 'recipient@example.com'}</span></div>
                      <div className="flex gap-2">
                        <span className="w-12 shrink-0 text-gray-400">Subject</span>
                        <span className="font-medium text-gray-900 break-words min-w-0">
                          {form.subject ? <TokenText text={form.subject} sample={sample} variables={variables} /> : <span className="text-gray-400 italic font-normal">No subject</span>}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 max-h-[28rem] overflow-y-auto">
                      <EmailPreview subject={form.subject} body={form.body_text} sample={sample} variables={variables} />
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="-m-5">
                    <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Braces className="w-4 h-4 text-gray-400" /> Variables
                        <span className="text-xs font-normal text-gray-400">{Object.keys(variables).length}</span>
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-500">Click one to insert it where your cursor is in the subject or body.</p>
                    </div>
                    {Object.keys(variables).length === 0 ? (
                      <p className="px-5 py-6 text-sm text-gray-500 text-center">This template has no variables.</p>
                    ) : (
                      <>
                        {Object.keys(variables).length > 6 && (
                          <div className="px-5 pt-3">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                              <input
                                type="search"
                                value={varQuery}
                                onChange={(e) => setVarQuery(e.target.value)}
                                placeholder="Find a variable"
                                aria-label="Find a variable"
                                className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                              />
                            </div>
                          </div>
                        )}
                        <ul className="p-2 max-h-72 overflow-y-auto">
                          {shownVariables.map(([name, desc]) => (
                            <li key={name}>
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => insertVariable(name)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left hover:bg-[#0B3D26]/5 group transition-colors"
                              >
                                <code className="text-xs font-mono text-[#0B3D26] truncate">{`{{${name}}}`}</code>
                                <span className="text-xs text-gray-500 truncate group-hover:text-gray-700">{desc}</span>
                              </button>
                            </li>
                          ))}
                          {shownVariables.length === 0 && (
                            <li className="px-3 py-4 text-xs text-gray-500 text-center">No variables match "{varQuery.trim()}"</li>
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                </Card>
              </aside>
            </form>
          </main>
        </div>

        <TestEmailModal
          template={testOpen ? template : null}
          onClose={() => setTestOpen(false)}
          note={dirty ? 'You have unsaved changes. The test uses the last saved version, so save first to test your edits.' : null}
        />
      </AppShell>
    </>
  )
}
