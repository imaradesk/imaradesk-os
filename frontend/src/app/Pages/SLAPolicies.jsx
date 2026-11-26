import React, { useState, useEffect } from 'react'
import { Head, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import {
  AlertTriangle, BellRing, Briefcase, CalendarDays, CalendarOff, CheckCircle2, Clock, Eye, Filter, Gauge, Layers,
  PauseCircle, Pencil, Plus, Power, Search, ShieldCheck, Siren, Timer, Trash2, X, Zap,
} from 'lucide-react'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import { SettingsHeading, Toggle, btn } from '../components/settings/SettingsPage'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import Select from '../components/SearchableSelect'
import {
  EmptyState, PRIORITIES, PRIORITY_ORDER, PriorityPill, SlaCard, SlaHero, StatTile, fieldClass, shortMinutes,
} from '../components/sla/SLAUI'
import { PriorityIcon } from '../components/tasks/ui'
import Tabs from '../components/Tabs'

const DISABLED_FEATURES = [
  { icon: ShieldCheck, title: 'SLA policies', body: 'Response and resolution targets for each priority.' },
  { icon: Briefcase, title: 'Business hours', body: 'Count only working time for accurate targets.' },
  { icon: CalendarDays, title: 'Holidays', body: 'Pause timers automatically on days off.' },
]

export default function SLAPolicies({ policies = [] }) {
  const [showModal, setShowModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, policyId: null })
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assignmentGroups, setAssignmentGroups] = useState([])
  const [slaSettings, setSlaSettings] = useState({
    enabled: false,
    auto_pause_resolved: true,
    auto_resume_reopened: true,
    escalation_enabled: true,
    send_notifications: true,
  })
  const [formData, setFormData] = useState({
    name: '',
    priority: 'medium',
    description: '',
    first_response_time: 60,
    resolution_time: 240,
    status: 'active',
    apply_business_hours: false,
    apply_holidays: false,
    send_escalation_emails: false,
    auto_assign_on_breach: false,
    pause_on_pending: false,
    notify_before_breach: 30,
    use_custom_rules: false,
    custom_rules: [],
    rules_logic: 'AND',
  })

  // Available fields for rule conditions
  const ruleFields = [
    { id: 'priority', name: 'Priority', type: 'select', options: [
      { id: 'urgent', name: 'Urgent' },
      { id: 'high', name: 'High' },
      { id: 'medium', name: 'Medium' },
      { id: 'low', name: 'Low' },
    ]},
    { id: 'tag', name: 'Tag', type: 'text' },
    { id: 'assignment_group', name: 'Assignment Group', type: 'api', options: assignmentGroups },
    { id: 'type', name: 'Ticket Type', type: 'select', options: [
      { id: 'incident', name: 'Incident' },
      { id: 'question', name: 'Question' },
      { id: 'problem', name: 'Problem' },
    ]},
    { id: 'channel', name: 'Channel', type: 'select', options: [
      { id: 'email', name: 'Email' },
      { id: 'portal', name: 'Portal' },
      { id: 'chat', name: 'Chat' },
      { id: 'manual', name: 'Manual' },
    ]},
    { id: 'requester_type', name: 'Requester Type', type: 'select', options: [
      { id: 'customer', name: 'Customer' },
      { id: 'employee', name: 'Employee' },
    ]},
  ]

  const ruleOperators = [
    { id: 'equals', name: 'Equals' },
    { id: 'not_equals', name: 'Not equals' },
    { id: 'contains', name: 'Contains' },
    { id: 'not_contains', name: 'Does not contain' },
    { id: 'starts_with', name: 'Starts with' },
    { id: 'ends_with', name: 'Ends with' },
    { id: 'is_empty', name: 'Is empty' },
    { id: 'is_not_empty', name: 'Is not empty' },
  ]

  const operatorSymbols = {
    equals: '=',
    not_equals: '≠',
    contains: '⊃',
    not_contains: '⊅',
    starts_with: '^',
    ends_with: '$',
    is_empty: '∅',
    is_not_empty: '≠∅',
  }

  const rulesLogicOptions = [
    { id: 'AND', name: 'ALL conditions are met (AND)' },
    { id: 'OR', name: 'ANY condition is met (OR)' },
  ]

  const addRule = () => {
    const newRule = {
      id: Date.now(),
      field: 'priority',
      operator: 'equals',
      value: '',
    }
    setFormData({
      ...formData,
      custom_rules: [...formData.custom_rules, newRule],
    })
  }

  const updateRule = (ruleId, updates) => {
    setFormData({
      ...formData,
      custom_rules: formData.custom_rules.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      ),
    })
  }

  const removeRule = (ruleId) => {
    setFormData({
      ...formData,
      custom_rules: formData.custom_rules.filter(rule => rule.id !== ruleId),
    })
  }

  const toggleCustomRules = (enabled) => {
    setFormData({
      ...formData,
      use_custom_rules: enabled,
      custom_rules: enabled && formData.custom_rules.length === 0 
        ? [{ id: Date.now(), field: 'priority', operator: 'equals', value: '' }] 
        : formData.custom_rules,
    })
  }

  // Fetch SLA settings and assignment groups on mount
  useEffect(() => {
    fetchSLASettings()
    fetchAssignmentGroups()
  }, [])

  const fetchSLASettings = async () => {
    try {
      setIsLoadingSettings(true)
      const response = await api.get('/sla/api/settings/')
      const data = response.data
      if (data.success) {
        setSlaSettings(data.settings)
      }
    } catch (error) {
      console.error('Error fetching SLA settings:', error)
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const fetchAssignmentGroups = async () => {
    try {
      const response = await api.get('/api/onboarding/groups/')
      if (response.data.success) {
        setAssignmentGroups(response.data.groups || [])
      }
    } catch (error) {
      console.error('Failed to fetch assignment groups:', error)
    }
  }

  const toggleSLAConfirm = () => {
    setConfirmDialog({ 
      isOpen: true, 
      action: slaSettings.enabled ? 'deactivate' : 'activate',
      policyId: null 
    })
  }

  const toggleSLA = async () => {
    toast.promise(
      api.post('/sla/api/settings/update/', { enabled: !slaSettings.enabled })
        .then((response) => {
          const data = response.data
          if (data.success) {
            setSlaSettings(data.settings)
            return data.settings.enabled ? 'SLA tracking activated!' : 'SLA tracking disabled'
          } else {
            throw new Error(data.message || 'Failed to update SLA settings')
          }
        }),
      {
        loading: slaSettings.enabled ? 'Deactivating SLA...' : 'Activating SLA...',
        success: (message) => message,
        error: (err) => err.message || 'Failed to toggle SLA',
      }
    )
  }

  const updateSLASetting = async (setting, value) => {
    toast.promise(
      api.post('/sla/api/settings/update/', { [setting]: value })
        .then((response) => {
          const data = response.data
          if (data.success) {
            setSlaSettings(data.settings)
            return 'Setting updated successfully!'
          } else {
            throw new Error(data.message || 'Unknown error')
          }
        }),
      {
        loading: 'Updating setting...',
        success: (message) => message,
        error: (err) => err.message || 'Failed to update setting',
      }
    )
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const url = editingPolicy 
      ? `/sla/api/policies/${editingPolicy.id}/update/`
      : '/sla/api/policies/create/'
    
    const method = editingPolicy ? 'put' : 'post'
    
    toast.promise(
      api[method](url, formData)
        .then((response) => {
          const data = response.data
          if (data.success) {
            setTimeout(() => window.location.reload(), 1000)
            return editingPolicy ? 'Policy updated successfully!' : 'Policy created successfully!'
          } else {
            throw new Error(data.message || 'Failed to save policy')
          }
        }),
      {
        loading: editingPolicy ? 'Updating policy...' : 'Creating policy...',
        success: (message) => message,
        error: (err) => err.message || 'Failed to save policy',
      }
    )
  }
  
  const handleEdit = (policy) => {
    setEditingPolicy(policy)
    setFormData({
      name: policy.name,
      priority: policy.priority,
      description: policy.description,
      first_response_time: policy.first_response_minutes,
      resolution_time: policy.resolution_time_minutes,
      status: policy.status,
      apply_business_hours: policy.apply_business_hours ?? false,
      apply_holidays: policy.apply_holidays ?? false,
      send_escalation_emails: policy.send_escalation_emails ?? false,
      auto_assign_on_breach: policy.auto_assign_on_breach ?? false,
      pause_on_pending: policy.pause_on_pending ?? false,
      notify_before_breach: policy.notify_before_breach,
      use_custom_rules: policy.use_custom_rules ?? false,
      custom_rules: policy.custom_rules ?? [],
      rules_logic: policy.rules_logic ?? 'AND',
    })
    setShowModal(true)
  }
  
  const handleDeleteConfirm = (policyId) => {
    setConfirmDialog({ isOpen: true, action: 'delete', policyId })
  }

  const handleDelete = async () => {
    const policyId = confirmDialog.policyId
    
    toast.promise(
      api.delete(`/sla/api/policies/${policyId}/delete/`)
        .then((response) => {
          const data = response.data
          if (data.success) {
            setTimeout(() => window.location.reload(), 1000)
            return 'Policy deleted successfully!'
          } else {
            throw new Error(data.message || 'Failed to delete policy')
          }
        }),
      {
        loading: 'Deleting policy...',
        success: (message) => message,
        error: (err) => err.message || 'Failed to delete policy',
      }
    )
  }
  
  const openNewModal = () => {
    setEditingPolicy(null)
    setFormData({
      name: '',
      priority: 'medium',
      description: '',
      first_response_time: 60,
      resolution_time: 240,
      status: 'active',
      apply_business_hours: false,
      apply_holidays: false,
      send_escalation_emails: false,
      auto_assign_on_breach: false,
      pause_on_pending: false,
      notify_before_breach: 30,
      use_custom_rules: false,
      custom_rules: [],
      rules_logic: 'AND',
    })
    setShowModal(true)
  }


  const query = searchQuery.trim().toLowerCase()
  const priorityCounts = PRIORITY_ORDER.reduce((acc, id) => ({ ...acc, [id]: policies.filter((p) => String(p.priority).toLowerCase() === id).length }), {})
  const activeCount = policies.filter((p) => p.status === 'active').length
  const visiblePolicies = policies.filter((p) =>
    (priorityFilter === 'all' || String(p.priority).toLowerCase() === priorityFilter) &&
    (!query || p.name?.toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query))
  )
  const filterOptions = [
    { id: 'all', label: 'All', icon: Layers, count: policies.length },
    ...PRIORITY_ORDER.map((id) => ({ id, label: PRIORITIES[id].label, icon: PRIORITIES[id].icon, count: priorityCounts[id] })),
  ]
  const ruleRowClass = 'flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200'

  return (
    <>
      <Head title="SLA Policies - Settings" />
      <AppShell active="settings" fixedHeight>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex flex-wrap items-center gap-3">
              <SettingsHeading section="sla-policies">SLA Policies</SettingsHeading>
              <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
                {slaSettings.enabled && policies.length > 0 && (
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setSearchQuery('') }}
                      placeholder="Search policies"
                      aria-label="Search policies"
                      className="w-full h-9 pl-9 pr-8 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26] transition-shadow"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
                {slaSettings.enabled && (
                  <Link href="/administration/sla/policies/add/" className={`${btn.primary} group flex-shrink-0`}>
                    <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
                    New policy
                  </Link>
                )}
              </div>
            </div>

            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full space-y-6">
              {/* Intro + tracking switch */}
              {isLoadingSettings ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 rounded bg-gray-100" />
                      <div className="h-3 w-3/4 rounded bg-gray-100" />
                    </div>
                    <div className="w-11 h-6 rounded-full bg-gray-100" />
                  </div>
                </div>
              ) : (
                <SlaHero
                  icon={Gauge}
                  title="Service level agreements"
                  description="Set response and resolution targets per priority so urgent work gets attention first, and track how your team performs against them."
                  aside={
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 pl-3 pr-2 py-2">
                      <span className="relative flex w-2.5 h-2.5">
                        {slaSettings.enabled && <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-60 animate-ping" />}
                        <span className={`relative w-2.5 h-2.5 rounded-full ${slaSettings.enabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">Tracking {slaSettings.enabled ? 'active' : 'off'}</p>
                        <p className="text-[11px] text-gray-500">{slaSettings.enabled ? 'Tickets are monitored' : 'Policies are not applied'}</p>
                      </div>
                      <Toggle checked={slaSettings.enabled} onChange={toggleSLAConfirm} label={slaSettings.enabled ? 'Deactivate SLA tracking' : 'Activate SLA tracking'} />
                    </div>
                  }
                >
                  {slaSettings.enabled && policies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <StatTile icon={ShieldCheck} label="Active" value={activeCount} tone="text-emerald-600" hint={`of ${policies.length} policies`} />
                      {PRIORITY_ORDER.map((id) => (
                        <StatTile key={id} icon={PRIORITIES[id].icon} label={PRIORITIES[id].label} value={priorityCounts[id]} tone={PRIORITIES[id].tile.split(' ')[1]} />
                      ))}
                    </div>
                  )}
                </SlaHero>
              )}

              {/* Policies */}
              {isLoadingSettings ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-32 rounded bg-gray-100" />
                          <div className="h-3 w-20 rounded bg-gray-100" />
                        </div>
                      </div>
                      <div className="mt-4 h-3 w-3/4 rounded bg-gray-100" />
                      <div className="mt-4 flex gap-2">
                        <div className="h-8 w-28 rounded-lg bg-gray-100" />
                        <div className="h-8 w-28 rounded-lg bg-gray-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : slaSettings.enabled ? (
                policies.length === 0 ? (
                  <EmptyState
                    icon={Timer}
                    title="No SLA policies yet"
                    description="Create your first policy to start tracking response and resolution times."
                    action={
                      <Link href="/administration/sla/policies/add/" className={btn.primary}>
                        <Plus className="w-4 h-4" /> Create first policy
                      </Link>
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    <Tabs tabs={filterOptions} active={priorityFilter} onChange={setPriorityFilter} label="Filter by priority" />

                    {visiblePolicies.length === 0 ? (
                      <EmptyState
                        icon={Search}
                        title="No policies match"
                        description={query ? `Nothing matches “${searchQuery}”.` : 'No policies with this priority yet.'}
                        action={
                          <button type="button" onClick={() => { setSearchQuery(''); setPriorityFilter('all') }} className={btn.secondary}>
                            Clear filters
                          </button>
                        }
                      />
                    ) : (
                      <div key={priorityFilter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {visiblePolicies.map((policy, index) => {
                          const active = policy.status === 'active'
                          return (
                            <article
                              key={policy.id}
                              style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                              className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 animate-portalRise portal-lift hover:shadow-card-hover hover:border-[#0B3D26]/30"
                            >
                              <div className="flex items-start gap-3">
                                <PriorityIcon priority={policy.priority} />
                                <div className="flex-1 min-w-0">
                                  <Link
                                    href={`/administration/sla/policies/${policy.id}/edit/`}
                                    className="block font-semibold text-gray-900 truncate group-hover:text-[#0B3D26] transition-colors"
                                  >
                                    {policy.name}
                                  </Link>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <PriorityPill priority={policy.priority} />
                                    <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full border text-[11px] font-medium capitalize ${
                                      active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-100 text-gray-500'
                                    }`}>
                                      <span className="relative flex w-1.5 h-1.5">
                                        {active && <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-60 animate-ping" />}
                                        <span className={`relative w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                      </span>
                                      {policy.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                  <Link
                                    href={`/administration/sla/policies/${policy.id}/edit/`}
                                    title="Edit policy"
                                    aria-label={`Edit ${policy.name}`}
                                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Link>
                                  <button
                                    type="button"
                                    title="Delete policy"
                                    aria-label={`Delete ${policy.name}`}
                                    onClick={() => handleDeleteConfirm(policy.id)}
                                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {policy.description && (
                                <p className="mt-3 text-sm text-gray-500 leading-relaxed line-clamp-2">{policy.description}</p>
                              )}

                              <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
                                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                                  <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                    <Timer className="w-3.5 h-3.5 text-sky-600" /> First response
                                  </p>
                                  <p className="mt-0.5 text-sm font-semibold text-gray-900 tabular-nums">
                                    {policy.first_response_minutes ? shortMinutes(policy.first_response_minutes) : policy.first_response}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                                  <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Resolution
                                  </p>
                                  <p className="mt-0.5 text-sm font-semibold text-gray-900 tabular-nums">
                                    {policy.resolution_time_minutes ? shortMinutes(policy.resolution_time_minutes) : policy.resolution_time}
                                  </p>
                                </div>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <SlaCard delay={80}>
                  <div className="text-center max-w-2xl mx-auto py-4">
                    <span className="relative mx-auto mb-4 w-16 h-16 rounded-2xl bg-[#0B3D26]/10 text-[#0B3D26] inline-flex items-center justify-center">
                      <span className="absolute inset-0 rounded-2xl bg-[#0B3D26]/10 animate-ping [animation-duration:2.5s]" />
                      <Clock className="relative w-8 h-8 animate-[spin_8s_linear_infinite]" strokeWidth={1.5} />
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight text-gray-900">SLA tracking is turned off</h3>
                    <p className="mt-1 text-sm text-gray-500">Turn it on to start measuring your team against clear targets.</p>
                    <button type="button" onClick={toggleSLAConfirm} className={`${btn.primary} group mt-5`}>
                      <Power className="w-4 h-4" /> Enable SLA tracking
                    </button>

                    <ul className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                      {DISABLED_FEATURES.map(({ icon: Icon, title, body }, i) => (
                        <li
                          key={title}
                          style={{ animationDelay: `${160 + i * 70}ms` }}
                          className="group rounded-xl border border-gray-200 bg-gray-50 p-4 animate-portalRise"
                        >
                          <span className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-[#0B3D26] inline-flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                            <Icon className="w-4 h-4" strokeWidth={1.75} />
                          </span>
                          <h4 className="mt-3 text-sm font-semibold text-gray-900">{title}</h4>
                          <p className="mt-0.5 text-xs text-gray-500">{body}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </SlaCard>
              )}
            </div>
          </main>
        </div>

        {/* Modal for creating/editing SLA policy - Only show when SLA is enabled */}
        {slaSettings.enabled && (
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={editingPolicy ? 'Edit SLA Policy' : 'New SLA Policy'}
            maxWidth="max-w-2xl"
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Policy name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className={fieldClass}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Urgent Issues SLA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Priority <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.priority}
                  onChange={(value) => setFormData({ ...formData, priority: value })}
                  options={[
                    { id: 'urgent', name: 'Urgent' },
                    { id: 'high', name: 'High' },
                    { id: 'medium', name: 'Medium' },
                    { id: 'low', name: 'Low' }
                  ]}
                  placeholder="Select priority"
                  required
                  allowClear={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  rows="3"
                  className={`${fieldClass} h-auto py-2`}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe when this policy applies"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <Timer className="w-4 h-4 text-sky-600" /> First response (min) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className={fieldClass}
                    value={formData.first_response_time}
                    onChange={(e) => setFormData({ ...formData, first_response_time: parseInt(e.target.value) })}
                  />
                  <p className="mt-1 text-xs text-gray-400">{shortMinutes(formData.first_response_time)}</p>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Resolution (min) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className={fieldClass}
                    value={formData.resolution_time}
                    onChange={(e) => setFormData({ ...formData, resolution_time: parseInt(e.target.value) })}
                  />
                  <p className="mt-1 text-xs text-gray-400">{shortMinutes(formData.resolution_time)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <Select
                  value={formData.status}
                  onChange={(value) => setFormData({ ...formData, status: value })}
                  options={[
                    { id: 'active', name: 'Active' },
                    { id: 'inactive', name: 'Inactive' }
                  ]}
                  placeholder="Select status"
                  allowClear={false}
                />
              </div>

              <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                <CheckRow
                  icon={Briefcase}
                  checked={formData.apply_business_hours}
                  onChange={(checked) => setFormData({ ...formData, apply_business_hours: checked })}
                  label="Apply business hours"
                  description="Only count time during configured business hours"
                />
                <CheckRow
                  icon={CalendarOff}
                  checked={formData.apply_holidays}
                  onChange={(checked) => setFormData({ ...formData, apply_holidays: checked })}
                  label="Apply holidays"
                  description="Exclude holidays from SLA time calculation"
                />
              </div>

              {/* Trigger Rules Section */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className="w-8 h-8 rounded-lg bg-[#0B3D26]/10 text-[#0B3D26] inline-flex items-center justify-center flex-shrink-0">
                    <Filter className="w-4 h-4" strokeWidth={1.75} />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Trigger rules</h4>
                    <p className="text-xs text-gray-500">Define when this SLA policy should be applied to tickets</p>
                  </div>
                </div>

                {/* Toggle between simple and advanced mode */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="inline-flex p-1 rounded-lg bg-white border border-gray-200">
                    <button
                      type="button"
                      onClick={() => toggleCustomRules(false)}
                      className={`h-7 px-3 text-sm rounded-md transition-all ${
                        !formData.use_custom_rules ? 'bg-[#0B3D26] text-white font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCustomRules(true)}
                      className={`h-7 px-3 text-sm rounded-md transition-all ${
                        formData.use_custom_rules ? 'bg-[#0B3D26] text-white font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Advanced rules
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formData.use_custom_rules
                      ? 'Build custom conditions to match tickets'
                      : 'Apply to tickets based on priority level'}
                  </span>
                </div>

                {/* Simple Mode - Apply to new tickets by priority */}
                {!formData.use_custom_rules && (
                  <div className="rounded-xl bg-white border border-gray-200 animate-fadeIn">
                    <div className="flex items-start gap-3 px-4 py-3">
                      <Zap className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Applies by priority</p>
                        <p className="text-xs text-gray-500">While active, applies to all tickets with <strong>{formData.priority}</strong> priority</p>
                      </div>
                    </div>
                    {(() => {
                      const existingPolicy = formData.status === 'active' && policies.find(p => (
                        p.status === 'active' && !p.use_custom_rules &&
                        (p.priority || '').toLowerCase() === (formData.priority || '').toLowerCase() &&
                        p.id !== editingPolicy?.id
                      ))
                      return existingPolicy ? (
                        <div className="mx-4 mb-3 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px text-amber-600" />
                          <p className="text-xs text-amber-700">
                            Policy "{existingPolicy.name}" is already active for this priority. Deactivate it first, or this policy can't be saved as active.
                          </p>
                        </div>
                      ) : null
                    })()}
                  </div>
                )}

                {/* Advanced Mode - Custom Rules Builder */}
                {formData.use_custom_rules && (
                  <div className="space-y-3 animate-fadeIn">
                    {/* Rules Logic Selector */}
                    <div className={ruleRowClass}>
                      <span className="text-sm text-gray-600">Match tickets where</span>
                      <div className="w-56">
                        <Select
                          value={formData.rules_logic}
                          onChange={(value) => setFormData({ ...formData, rules_logic: value })}
                          options={rulesLogicOptions}
                          placeholder="Select logic"
                          allowClear={false}
                        />
                      </div>
                    </div>

                    {/* Rules List */}
                    <div className="space-y-2">
                      {formData.custom_rules.map((rule, index) => {
                        const selectedField = ruleFields.find(f => f.id === rule.field)
                        const needsValue = !['is_empty', 'is_not_empty'].includes(rule.operator)

                        return (
                          <div key={rule.id} className="group animate-portalRise">
                            {index > 0 && (
                              <div className="flex items-center justify-center py-1">
                                <span className="text-[10px] font-semibold tracking-wider text-[#0B3D26] bg-[#0B3D26]/10 px-2 py-0.5 rounded-full">
                                  {formData.rules_logic}
                                </span>
                              </div>
                            )}
                            <div className={ruleRowClass}>
                              {/* Field Selector */}
                              <div className="min-w-[140px]">
                                <Select
                                  value={rule.field}
                                  onChange={(value) => updateRule(rule.id, { field: value, value: '' })}
                                  options={ruleFields}
                                  placeholder="Select field"
                                  allowClear={false}
                                />
                              </div>

                              {/* Operator Selector */}
                              <div className="min-w-[140px]">
                                <Select
                                  value={rule.operator}
                                  onChange={(value) => updateRule(rule.id, { operator: value })}
                                  options={ruleOperators}
                                  placeholder="Select operator"
                                  allowClear={false}
                                />
                              </div>

                              {/* Value Input - Show based on field type and operator */}
                              {needsValue && (
                                (selectedField?.type === 'select' || selectedField?.type === 'api') ? (
                                  <div className="flex-1 min-w-[120px]">
                                    <Select
                                      value={rule.value}
                                      onChange={(value) => updateRule(rule.id, { value: value })}
                                      options={selectedField.options}
                                      placeholder="Select value..."
                                      searchable={selectedField?.type === 'api'}
                                      allowClear={true}
                                    />
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={rule.value}
                                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                                    placeholder={`Enter ${selectedField?.name.toLowerCase()}...`}
                                    className={`${fieldClass} h-9 flex-1 min-w-[120px]`}
                                  />
                                )
                              )}

                              {/* Remove Rule Button */}
                              <button
                                type="button"
                                onClick={() => removeRule(rule.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                                title="Remove condition"
                                aria-label="Remove condition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Add Rule Button */}
                    <button
                      type="button"
                      onClick={addRule}
                      className="group flex items-center gap-2 h-9 px-3 text-sm text-[#0B3D26] hover:bg-[#0B3D26]/5 border border-dashed border-[#0B3D26]/30 hover:border-[#0B3D26] rounded-xl transition-colors w-full justify-center"
                    >
                      <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
                      Add condition
                    </button>

                    {/* Rule Preview */}
                    {formData.custom_rules.length > 0 && formData.custom_rules.some(r => r.value || ['is_empty', 'is_not_empty'].includes(r.operator)) && (
                      <div className="p-3 bg-white rounded-xl border border-gray-200 animate-fadeIn">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Eye className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-600">Rule preview</span>
                        </div>
                        <code className="block text-xs text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-200 font-mono">
                          {formData.custom_rules.map((rule, i) => {
                            const field = ruleFields.find(f => f.id === rule.field)?.name || rule.field
                            const opSymbol = operatorSymbols[rule.operator] || '='
                            const needsValue = !['is_empty', 'is_not_empty'].includes(rule.operator)
                            const selectedField = ruleFields.find(f => f.id === rule.field)
                            let displayValue = rule.value
                            if (selectedField?.options && rule.value) {
                              const option = selectedField.options.find(o => o.id === rule.value)
                              if (option) displayValue = option.name
                            }
                            const value = needsValue ? `"${displayValue || '...'}"` : ''
                            const prefix = i > 0 ? ` ${formData.rules_logic} ` : ''
                            return `${prefix}${field} ${opSymbol} ${value}`
                          }).join('')}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* TODO: Escalate on Breach - feature coming soon
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.send_escalation_emails}
                    onChange={(e) => setFormData({ ...formData, send_escalation_emails: e.target.checked })}
                    className="w-4 h-4 text-[#0B3D26] border-gray-300 rounded focus:ring-[#0B3D26]"
                  />
                  <span className="text-sm text-gray-700">Send escalation emails</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">Notify team members when SLA is at risk of breach</p>
              </div>
              */}

              <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                <CheckRow
                  icon={Siren}
                  checked={formData.auto_assign_on_breach}
                  onChange={(checked) => setFormData({ ...formData, auto_assign_on_breach: checked })}
                  label="Escalate to admin on breach"
                  description="Send escalation email to an administrator when SLA is breached"
                />
                <CheckRow
                  icon={PauseCircle}
                  checked={formData.pause_on_pending}
                  onChange={(checked) => setFormData({ ...formData, pause_on_pending: checked })}
                  label="Pause on pending status"
                  description="Pause SLA timer when ticket is pending customer response"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <BellRing className="w-4 h-4 text-amber-600" /> Notify before breach (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  className={fieldClass}
                  value={formData.notify_before_breach}
                  onChange={(e) => setFormData({ ...formData, notify_before_breach: parseInt(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">Set to 0 to disable notifications</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button type="button" className={btn.secondary} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={btn.primary}>
                  <CheckCircle2 className="w-4 h-4" />
                  {editingPolicy ? 'Update policy' : 'Create policy'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, action: null, policyId: null })}
          onConfirm={() => {
            if (confirmDialog.action === 'delete') {
              handleDelete()
            } else if (confirmDialog.action === 'activate' || confirmDialog.action === 'deactivate') {
              toggleSLA()
            }
          }}
          title={
            confirmDialog.action === 'delete'
              ? 'Delete SLA Policy'
              : confirmDialog.action === 'activate'
              ? 'Activate SLA Tracking'
              : 'Deactivate SLA Tracking'
          }
          message={
            confirmDialog.action === 'delete'
              ? 'Are you sure you want to delete this SLA policy? This action cannot be undone.'
              : confirmDialog.action === 'activate'
              ? 'Activate SLA tracking to start monitoring ticket response and resolution times against your defined policies?'
              : 'Deactivate SLA tracking? New tickets will not be assigned SLA policies. Note: Existing tickets with active SLA policies will continue to be tracked until they are resolved or closed.'
          }
          confirmText={
            confirmDialog.action === 'delete' ? 'Delete' :
            confirmDialog.action === 'activate' ? 'Activate' : 'Deactivate'
          }
          cancelText="Cancel"
          confirmStyle={confirmDialog.action === 'delete' || confirmDialog.action === 'deactivate' ? 'danger' : 'primary'}
        />
      </AppShell>
    </>
  )
}

/** Checkbox row with icon, used for the policy options in the modal */
function CheckRow({ icon: Icon, checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
      <span className={`w-8 h-8 flex-shrink-0 rounded-lg inline-flex items-center justify-center transition-colors ${checked ? 'bg-[#0B3D26]/10 text-[#0B3D26]' : 'bg-gray-100 text-gray-400'}`}>
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        {description && <span className="block text-xs text-gray-500">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 text-[#0B3D26] border-gray-300 rounded focus:ring-[#0B3D26]"
      />
    </label>
  )
}
