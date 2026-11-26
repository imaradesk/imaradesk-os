import React, { useMemo, useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import {
  Search, Send, Pencil, Mail, Ticket, ListChecks, Timer, MessageSquare, UserRound,
  BarChart3, BookOpen, Sparkles, ChevronRight,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { SettingsHeading } from '../components/settings/SettingsPage'
import TestEmailModal from '../components/settings/TestEmailModal'
import StatusBadge from '../components/settings/TemplateStatusBadge'
import toast from 'react-hot-toast'
import api from '../../utils/axios'
import { Toggle } from '../components/settings/SettingsPage'

// Display order of the categories the server assigns, and the icon each one uses
const CATEGORIES = [
  { key: 'Tickets', icon: Ticket, tint: 'bg-blue-50 text-blue-600' },
  { key: 'Tasks', icon: ListChecks, tint: 'bg-emerald-50 text-emerald-600' },
  { key: 'SLA', icon: Timer, tint: 'bg-orange-50 text-orange-600' },
  { key: 'Comments', icon: MessageSquare, tint: 'bg-sky-50 text-sky-600' },
  { key: 'Account', icon: UserRound, tint: 'bg-violet-50 text-violet-600' },
  { key: 'Knowledge base', icon: BookOpen, tint: 'bg-teal-50 text-teal-600' },
  { key: 'Reports', icon: BarChart3, tint: 'bg-indigo-50 text-indigo-600' },
  { key: 'Custom', icon: Sparkles, tint: 'bg-gray-100 text-gray-600' },
]
const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

function timeAgo(iso) {
  if (!iso) return ''
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  const steps = [[60, 'second'], [60, 'minute'], [24, 'hour'], [30, 'day'], [12, 'month'], [Infinity, 'year']]
  let value = seconds
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-Math.round(value), unit)
    value /= size
  }
  return ''
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-full text-xs font-medium border transition-colors ${
        active ? 'bg-[#0B3D26] border-[#0B3D26] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  )
}

export default function EmailsTemplates({ templates = [], emailSettings = {}, businessName = '' }) {
  const [useBusinessName, setUseBusinessName] = useState(!!emailSettings.use_business_name_in_footer)
  const [savingFooter, setSavingFooter] = useState(false)

  const toggleBusinessName = async () => {
    const next = !useBusinessName
    setUseBusinessName(next)
    setSavingFooter(true)
    try {
      const { data } = await api.post('/administration/emails/settings/update/', { use_business_name_in_footer: next })
      if (!data.success) throw new Error(data.message)
      toast.success(next ? 'Emails will be signed with your business name' : 'Emails will be signed by Imaradesk')
    } catch (error) {
      setUseBusinessName(!next)
      toast.error(error.response?.data?.message || 'Could not save the setting')
    } finally {
      setSavingFooter(false)
    }
  }

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [testTemplate, setTestTemplate] = useState(null)

  const counts = useMemo(() => {
    const out = {}
    templates.forEach(t => { out[t.category] = (out[t.category] || 0) + 1 })
    return out
  }, [templates])

  const term = query.trim().toLowerCase()
  const visible = templates.filter(t =>
    (category === 'all' || t.category === category) &&
    (status === 'all' || t.status === status) &&
    (!term || [t.name, t.subject, t.type, t.template_type].some(v => (v || '').toLowerCase().includes(term)))
  )
  const sections = CATEGORIES
    .map(c => ({ ...c, items: visible.filter(t => t.category === c.key) }))
    .filter(s => s.items.length > 0)

  const filtering = term || category !== 'all' || status !== 'all'
  const clearFilters = () => { setQuery(''); setCategory('all'); setStatus('all') }
  const openEditor = (t) => router.visit(`/administration/emails/templates/${t.id}/edit/`)

  return (
    <>
      <Head title="Email Templates - Settings" />
      <AppShell active="settings" fixedHeight>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex flex-wrap items-center gap-3">
              <SettingsHeading section="emails-templates">Email Templates</SettingsHeading>
            </div>

            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full space-y-5">
              <p className="text-sm text-gray-600">
                The emails your helpdesk sends automatically. Edit the wording, then send yourself a test to see how it looks.
              </p>

              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">Use my business name on footer</div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Sign emails “Best regards, The {businessName || 'your business'} Team”. When off, they are signed “The Imaradesk Team”.
                  </p>
                </div>
                <Toggle checked={useBusinessName} onChange={toggleBusinessName} disabled={savingFooter} label="Use my business name on footer" />
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[12rem] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by name or subject"
                      aria-label="Search templates"
                      className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                    />
                  </div>
                  <div className="ml-auto inline-flex p-0.5 bg-gray-100 rounded-lg" role="group" aria-label="Filter by status">
                    {['all', 'active', 'draft', 'archived'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={`h-8 px-3 rounded-md text-xs font-medium capitalize transition-all ${
                          status === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Chip active={category === 'all'} onClick={() => setCategory('all')}>
                    All <span className="opacity-70">{templates.length}</span>
                  </Chip>
                  {CATEGORIES.filter(c => counts[c.key]).map(c => (
                    <Chip key={c.key} active={category === c.key} onClick={() => setCategory(c.key)}>
                      {c.key} <span className="opacity-70">{counts[c.key]}</span>
                    </Chip>
                  ))}
                </div>
              </div>

              {templates.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl py-14 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="mt-3 text-sm font-medium text-gray-900">No email templates yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Templates are created when your workspace is set up.</p>
                </div>
              ) : sections.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl py-10 text-center">
                  <p className="text-sm font-medium text-gray-900">No templates match your filters</p>
                  <button type="button" onClick={clearFilters} className="mt-2 text-sm text-[#0B3D26] hover:underline">
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {sections.map(section => (
                    <section key={section.key}>
                      <h2 className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {section.key}
                        <span className="font-normal normal-case tracking-normal text-gray-400">{section.items.length}</span>
                      </h2>
                      <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                        {section.items.map(t => {
                          const Icon = CATEGORY_BY_KEY[t.category]?.icon || Mail
                          return (
                            <li
                              key={t.id}
                              onClick={() => openEditor(t)}
                              className="group flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors"
                            >
                              <div className={`hidden sm:flex shrink-0 w-9 h-9 rounded-lg items-center justify-center ${CATEGORY_BY_KEY[t.category]?.tint || 'bg-gray-100 text-gray-600'}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Link
                                    href={`/administration/emails/templates/${t.id}/edit/`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-medium text-sm text-gray-900 truncate hover:text-[#0B3D26]"
                                  >
                                    {t.name}
                                  </Link>
                                  <StatusBadge status={t.status} />
                                </div>
                                <p className="mt-0.5 text-sm text-gray-500 truncate" title={t.subject}>{t.subject}</p>
                              </div>
                              <div className="hidden md:block shrink-0 text-right text-xs text-gray-400 w-28">
                                {t.updated_at && <span title={new Date(t.updated_at).toLocaleString()}>Edited {timeAgo(t.updated_at)}</span>}
                              </div>
                              <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setTestTemplate(t)}
                                  title="Send a test email"
                                  aria-label={`Send a test of ${t.name}`}
                                  className="p-2 rounded-lg text-gray-400 hover:text-[#0B3D26] hover:bg-[#0B3D26]/5 transition-colors"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                                <Link
                                  href={`/administration/emails/templates/${t.id}/edit/`}
                                  title="Edit"
                                  aria-label={`Edit ${t.name}`}
                                  className="p-2 rounded-lg text-gray-400 hover:text-[#0B3D26] hover:bg-[#0B3D26]/5 transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Link>
                                <ChevronRight className="hidden sm:block w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ))}
                  {filtering && (
                    <p className="text-xs text-gray-400 text-center">
                      Showing {visible.length} of {templates.length} templates ·{' '}
                      <button type="button" onClick={clearFilters} className="text-[#0B3D26] hover:underline">Clear filters</button>
                    </p>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>

        <TestEmailModal template={testTemplate} onClose={() => setTestTemplate(null)} />
      </AppShell>
    </>
  )
}
