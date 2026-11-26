import React, { useState, useEffect } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import { SettingsHeading, Toggle, btn } from '../components/settings/SettingsPage'
import Select from '../components/SearchableSelect'
import Alert from '../components/Alert'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, FileText, Timer,
  Zap, Plus, Trash2, Info, ShieldAlert,
} from 'lucide-react'
import { PolicySummary, PriorityTile, fieldClass } from '../components/sla/SLAUI'

/** Live summary of the policy as it's being edited */
function PolicyPreview({ formData, customRuleCount }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden animate-portalRise [animation-delay:120ms]">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Eye className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900">Preview</h3>
      </div>
      <div className="p-4">
        <PolicySummary
          name={formData.name}
          priority={formData.priority}
          active={formData.status === 'active'}
          description={formData.description}
          firstResponse={formData.first_response_time}
          resolution={formData.resolution_time}
          notifyBeforeBreach={formData.notify_before_breach}
          useCustomRules={formData.use_custom_rules}
          customRuleCount={customRuleCount}
          rulesLogic={formData.rules_logic}
          autoAssignOnBreach={formData.auto_assign_on_breach}
        />
      </div>
    </div>
  )
}

const PRIORITIES = [
  { id: 'low', label: 'Low', dot: 'bg-gray-400', active: 'border-gray-400 bg-gray-50' },
  { id: 'medium', label: 'Medium', dot: 'bg-blue-500', active: 'border-blue-400 bg-blue-50' },
  { id: 'high', label: 'High', dot: 'bg-amber-500', active: 'border-amber-400 bg-amber-50' },
  { id: 'urgent', label: 'Urgent', dot: 'bg-red-500', active: 'border-red-400 bg-red-50' },
]

const humanizeMinutes = (raw) => {
  const minutes = Number(raw)
  if (!minutes || minutes <= 0) return 'No limit set'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  const parts = []
  if (days) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
  if (hours) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
  if (mins) parts.push(`${mins} ${mins === 1 ? 'minute' : 'minutes'}`)
  return parts.join(' ')
}

const TIME_PRESETS = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '4h', minutes: 240 },
  { label: '8h', minutes: 480 },
  { label: '24h', minutes: 1440 },
]

export default function AddSLAPolicy({ policy = null, existingPoliciesByPriority = {} }) {
  const isEditing = !!policy
  const [currentStep, setCurrentStep] = useState(1)
  const [errorAlert, setErrorAlert] = useState(null)
  const [assignmentGroups, setAssignmentGroups] = useState([])

  // Fetch assignment groups on mount
  useEffect(() => {
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
    fetchAssignmentGroups()
  }, [])

  const [formData, setFormData] = useState({
    name: policy?.name || '',
    priority: (policy?.priority || 'medium').toLowerCase(),
    description: policy?.description || '',
    status: policy?.status || 'active',
    notify_before_breach: policy?.notify_before_breach || 15,
    first_response_time: policy?.first_response_time || 60,
    resolution_time: policy?.resolution_time || 240,
    apply_business_hours: policy?.apply_business_hours ?? true,
    apply_holidays: policy?.apply_holidays ?? false,
    send_escalation_emails: policy?.send_escalation_emails ?? policy?.escalate_on_breach ?? false,
    auto_assign_on_breach: policy?.auto_assign_on_breach ?? false,
    pause_on_pending: policy?.pause_on_pending ?? false,
    use_custom_rules: policy?.use_custom_rules ?? false,
    custom_rules: policy?.custom_rules ?? [],
    rules_logic: policy?.rules_logic ?? 'AND',
  })

  // Available fields for rule conditions
  const ruleFields = [
    { id: 'priority', name: 'Priority', type: 'select', options: [
      { id: 'urgent', name: 'Urgent' },
      { id: 'high', name: 'High' },
      { id: 'normal', name: 'Normal' },
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
    { id: 'AND', name: 'All conditions are met (AND)' },
    { id: 'OR', name: 'Any condition is met (OR)' },
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

  const steps = [
    { number: 1, name: 'Details', description: 'Name, priority and status', icon: FileText },
    { number: 2, name: 'Targets', description: 'Response and resolution goals', icon: Timer },
    { number: 3, name: 'Triggers', description: 'Conditions and automation', icon: Zap },
  ]

  const current = steps[currentStep - 1]
  const StepIcon = current.icon

  const handleNext = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const form = e.currentTarget.closest('form')
    if (form && !form.checkValidity()) {
      form.reportValidity()
      return
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const handlePrevious = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Pressing Enter on an earlier step should advance instead of saving.
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
      return
    }

    if (!formData.name.trim()) {
      setErrorAlert({ title: 'Missing policy name', message: 'Give the policy a name before saving.' })
      setCurrentStep(1)
      return
    }

    if (!Number(formData.first_response_time) || !Number(formData.resolution_time)) {
      setErrorAlert({ title: 'Check target times', message: 'First response and resolution times must be greater than zero.' })
      setCurrentStep(2)
      return
    }

    const url = isEditing
      ? `/sla/api/policies/${policy.id}/update/`
      : '/sla/api/policies/create/'

    const payload = {
      ...formData,
      notify_before_breach: Number(formData.notify_before_breach) || 0,
      first_response_time: Number(formData.first_response_time) || 0,
      resolution_time: Number(formData.resolution_time) || 0,
    }

    try {
      const response = isEditing
        ? await api.put(url, payload)
        : await api.post(url, payload)

      const data = response.data

      if (data.success) {
        toast.success(isEditing ? 'Policy updated successfully!' : 'Policy created successfully!')
        setTimeout(() => {
          router.visit('/administration/sla/')
        }, 1000)
      } else {
        // Show errors in Alert component
        let errorMessage = ''
        if (data.errors && typeof data.errors === 'object') {
          const errorList = Object.keys(data.errors).map(key => {
            const errors = Array.isArray(data.errors[key]) ? data.errors[key] : [data.errors[key]]
            return `${key}: ${errors.join(', ')}`
          })
          errorMessage = errorList.join('. ')
        } else {
          errorMessage = data.message || 'Unknown error occurred'
        }
        setErrorAlert({ title: 'Failed to save policy', message: errorMessage })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (error) {
      setErrorAlert({
        title: 'Failed to save policy',
        message: 'Please check your connection and try again.',
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <>
      <Head title={isEditing ? 'Edit SLA Policy' : 'Add SLA Policy'} />
      <AppShell active="settings" fixedHeight>
        <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
          <header>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex items-center justify-between gap-3">
              <SettingsHeading section="sla-policies">
                {isEditing ? 'Edit SLA policy' : 'New SLA policy'}
              </SettingsHeading>
              <Link href="/administration/sla/" className={`${btn.secondary} h-9`}>
                <ArrowLeft className="w-4 h-4" />
                Back to SLA
              </Link>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {errorAlert && (
              <Alert
                type="error"
                title={errorAlert.title}
                message={errorAlert.message}
                onClose={() => setErrorAlert(null)}
                className="mb-5"
              />
            )}

            {/* Mobile progress */}
            <div className="lg:hidden mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Step {currentStep} of 3 · {current.name}</span>
                <span>{Math.round((currentStep / 3) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full rounded-full bg-[#0B3D26] transition-all duration-300" style={{ width: `${(currentStep / 3) * 100}%` }} />
              </div>
            </div>

            <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_280px] lg:gap-6 lg:items-start">
              {/* Stepper rail */}
              <aside className="hidden lg:block sticky top-20 animate-portalRise">
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Step {currentStep} of 3</span>
                    <span>{Math.round((currentStep / 3) * 100)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-[#0B3D26] transition-all duration-300" style={{ width: `${(currentStep / 3) * 100}%` }} />
                  </div>

                  <ol className="mt-6 space-y-4">
                    {steps.map((step, index) => {
                      const done = currentStep > step.number
                      const active = currentStep === step.number
                      const Icon = step.icon
                      return (
                        <li key={step.number} className="relative">
                          {index < steps.length - 1 && (
                            <span className="absolute left-[15px] top-9 h-[calc(100%-8px)] w-0.5 -ml-px rounded-full bg-gray-200 overflow-hidden">
                              <span className={`block w-full bg-emerald-400 transition-[height] duration-500 ease-smooth ${done ? 'h-full' : 'h-0'}`} />
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => { if (done) setCurrentStep(step.number) }}
                            disabled={!done && !active}
                            className={`relative z-10 flex w-full items-start gap-3 text-left rounded-lg transition-opacity ${
                              done ? 'cursor-pointer' : active ? 'cursor-default' : 'cursor-default opacity-70'
                            }`}
                          >
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 border transition-all duration-300 ${
                              done
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : active
                                  ? 'bg-[#0B3D26] text-white border-[#0B3D26] ring-4 ring-[#0B3D26]/10'
                                  : 'bg-white text-gray-500 border-gray-200'
                            }`}>
                              {done ? <Check key="done" className="w-4 h-4 animate-portalPop" strokeWidth={2.5} /> : <Icon className="w-4 h-4" />}
                            </span>
                            <span className="pt-0.5">
                              <span className={`block text-sm ${active ? 'font-semibold text-gray-900' : done ? 'font-medium text-gray-900' : 'font-medium text-gray-500'}`}>
                                {step.name}
                              </span>
                              <span className="block text-xs text-gray-500">{step.description}</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                </div>
                <p className="mt-3 px-1 text-xs text-gray-500">You can go back to a previous step at any time.</p>
              </aside>

              <div className="min-w-0">
                <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white animate-portalRise [animation-delay:60ms]">
                  <div className="px-5 sm:px-6 py-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg bg-[#0B3D26]/[0.07] text-[#0B3D26] flex items-center justify-center flex-shrink-0">
                        <StepIcon className="w-4 h-4" />
                      </span>
                      <div>
                        <h2 className="text-[15px] font-semibold text-gray-900">
                          {currentStep === 1 && 'Policy details'}
                          {currentStep === 2 && 'Target times'}
                          {currentStep === 3 && 'Trigger rules'}
                        </h2>
                        <p className="mt-0.5 text-sm text-gray-500">{current.description}</p>
                      </div>
                    </div>
                  </div>

                  <div key={currentStep} className="px-5 sm:px-6 py-6 animate-stepIn">
                    {/* Step 1: Details */}
                    {currentStep === 1 && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Policy name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={fieldClass}
                            placeholder="e.g. Standard support"
                            autoFocus
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Priority level <span className="text-red-500">*</span>
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {PRIORITIES.map((p) => {
                              const selected = formData.priority === p.id
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, priority: p.id })}
                                  className={`group relative flex flex-col items-start gap-2 p-3 rounded-xl border text-left text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                                    selected
                                      ? `${p.active} text-gray-900 ring-2 ring-[#0B3D26]/15`
                                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:-translate-y-0.5'
                                  }`}
                                  aria-pressed={selected}
                                >
                                  <PriorityTile priority={p.id} size="sm" />
                                  {p.label}
                                  {selected && (
                                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0B3D26] text-white inline-flex items-center justify-center animate-portalPop">
                                      <Check className="w-3 h-3" strokeWidth={3} />
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                          <p className="mt-1.5 text-xs text-gray-500">Maps to ticket priority.</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className={`${fieldClass} h-auto py-2.5 resize-none`}
                            placeholder="What does this policy cover?"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                            <div className="grid grid-cols-2 gap-2">
                              {['active', 'inactive'].map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, status })}
                                  className={`h-10 rounded-lg border text-sm font-medium capitalize transition-colors ${
                                    formData.status === status
                                      ? 'border-[#0B3D26] bg-[#0B3D26]/[0.07] text-[#0B3D26]'
                                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                  }`}
                                  aria-pressed={formData.status === status}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notify before breach</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={formData.notify_before_breach}
                                onChange={(e) => setFormData({ ...formData, notify_before_breach: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                min="1"
                                className={`${fieldClass} pr-20`}
                                placeholder="15"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">minutes</span>
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500">Send a warning before the target is missed.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Targets */}
                    {currentStep === 2 && (
                      <div className="space-y-5">
                        <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 px-4 py-3">
                          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs leading-relaxed text-blue-800">
                            These are maximums, counted in business hours when the policy uses working hours.
                          </p>
                        </div>

                        {[
                          { key: 'first_response_time', label: 'First response time', hint: 'Time allowed to send the first reply to a ticket.', required: true },
                          { key: 'resolution_time', label: 'Resolution time', hint: 'Time allowed to fully resolve the ticket.', required: true },
                        ].map((field) => (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <div className="rounded-xl border border-gray-200 p-4">
                              <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                  <input
                                    type="number"
                                    value={formData[field.key]}
                                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                    min="1"
                                    className={`${fieldClass} h-11 text-base font-semibold pr-20`}
                                    placeholder={field.key === 'first_response_time' ? '60' : '240'}
                                    required
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">minutes</span>
                                </div>
                                <span className="text-xs text-gray-500 w-28 flex-shrink-0">{humanizeMinutes(formData[field.key])}</span>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                {TIME_PRESETS.map((preset) => (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, [field.key]: preset.minutes })}
                                    aria-pressed={Number(formData[field.key]) === preset.minutes}
                                    className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-all duration-200 active:scale-95 ${
                                      Number(formData[field.key]) === preset.minutes
                                        ? 'border-[#0B3D26] bg-[#0B3D26] text-white shadow-sm'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                                    }`}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500">{field.hint}</p>
                          </div>
                        ))}

                        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                          New {formData.priority} priority tickets should receive a first reply within{' '}
                          <strong className="font-semibold text-gray-900">{humanizeMinutes(formData.first_response_time)}</strong>{' '}
                          and be resolved within{' '}
                          <strong className="font-semibold text-gray-900">{humanizeMinutes(formData.resolution_time)}</strong>.
                        </div>
                      </div>
                    )}

                    {/* Step 3: Triggers */}
                    {currentStep === 3 && (
                      <div className="space-y-5">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">Which tickets does this policy apply to?</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              { id: false, title: 'Priority based', text: 'Apply to every new ticket with this priority.' },
                              { id: true, title: 'Custom rules', text: 'Match tickets using fields and conditions.' },
                            ].map((mode) => {
                              const active = formData.use_custom_rules === mode.id
                              return (
                                <button
                                  key={String(mode.id)}
                                  type="button"
                                  onClick={() => toggleCustomRules(mode.id)}
                                  className={`rounded-xl border p-4 text-left transition-colors ${
                                    active ? 'border-[#0B3D26] bg-[#0B3D26]/[0.04]' : 'border-gray-200 bg-white hover:border-gray-300'
                                  }`}
                                  aria-pressed={active}
                                >
                                  <span className="flex items-center justify-between gap-2">
                                    <span className={`text-sm font-medium ${active ? 'text-gray-900' : 'text-gray-700'}`}>{mode.title}</span>
                                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${active ? 'border-[#0B3D26]' : 'border-gray-300'}`}>
                                      {active && <span className="w-2 h-2 rounded-full bg-[#0B3D26]" />}
                                    </span>
                                  </span>
                                  <span className="mt-1 block text-xs leading-relaxed text-gray-500">{mode.text}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {!formData.use_custom_rules ? (
                          <div className="rounded-xl border border-gray-200">
                            <div className="px-4 py-3.5">
                              <div className="text-sm font-medium text-gray-900">Applies by priority</div>
                              <p className="mt-0.5 text-xs text-gray-500">
                                While active, every ticket with <strong className="font-medium text-gray-700">{PRIORITIES.find((p) => p.id === formData.priority)?.label || formData.priority}</strong> priority gets this policy automatically.
                              </p>
                            </div>
                            {formData.status === 'active' && existingPoliciesByPriority[formData.priority] && existingPoliciesByPriority[formData.priority].id !== policy?.id && (
                              <div className="mx-4 mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5">
                                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs leading-relaxed text-amber-800">
                                  <strong className="font-semibold">{existingPoliciesByPriority[formData.priority].name}</strong> is already active for this priority. Deactivate it first, or this policy can't be saved as active.
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <span className="text-sm text-gray-600">Match tickets where</span>
                              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-gray-100 w-full sm:w-auto">
                                {['AND', 'OR'].map((logic) => (
                                  <button
                                    key={logic}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, rules_logic: logic })}
                                    className={`h-7 px-4 rounded-md text-xs font-semibold transition-colors ${
                                      formData.rules_logic === logic ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    {logic === 'AND' ? 'All' : 'Any'}
                                  </button>
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">condition{formData.rules_logic === 'AND' ? 's are' : ' is'} met</span>
                            </div>

                            <div className="space-y-2.5">
                              {formData.custom_rules.map((rule, index) => {
                                const selectedField = ruleFields.find(f => f.id === rule.field)
                                const needsValue = !['is_empty', 'is_not_empty'].includes(rule.operator)

                                return (
                                  <React.Fragment key={rule.id}>
                                    {index > 0 && (
                                      <div className="flex items-center gap-3 pl-3">
                                        <span className="h-px flex-1 bg-gray-100" />
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#0B3D26]">
                                          {formData.rules_logic}
                                        </span>
                                        <span className="h-px flex-1 bg-gray-100" />
                                      </div>
                                    )}
                                    <div className="rounded-xl border border-gray-200 p-3.5">
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <span className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                                            {index + 1}
                                          </span>
                                          <div className="min-w-[130px] flex-1">
                                            <Select
                                              value={rule.field}
                                              onChange={(value) => updateRule(rule.id, { field: value, value: '' })}
                                              options={ruleFields}
                                              placeholder="Select field"
                                              allowClear={false}
                                            />
                                          </div>
                                        </div>
                                        <div className="min-w-[140px] flex-1">
                                          <Select
                                            value={rule.operator}
                                            onChange={(value) => updateRule(rule.id, { operator: value })}
                                            options={ruleOperators}
                                            placeholder="Select operator"
                                            allowClear={false}
                                          />
                                        </div>
                                        {needsValue && (
                                          (selectedField?.type === 'select' || selectedField?.type === 'api') ? (
                                            <div className="flex-1 min-w-[130px]">
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
                                              className={`${fieldClass} flex-1 min-w-[130px]`}
                                            />
                                          )
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => removeRule(rule.id)}
                                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0 self-end sm:self-auto"
                                          title="Remove condition"
                                          aria-label="Remove condition"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </React.Fragment>
                                )
                              })}
                            </div>

                            <button
                              type="button"
                              onClick={addRule}
                              className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:text-[#0B3D26] hover:border-[#0B3D26]/40 hover:bg-[#0B3D26]/[0.03] transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Add condition
                            </button>

                            {formData.custom_rules.length > 0 && formData.custom_rules.some(r => r.value || ['is_empty', 'is_not_empty'].includes(r.operator)) && (
                              <div className="rounded-lg bg-gray-50 px-4 py-3">
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Preview</div>
                                <code className="text-xs text-gray-700 font-mono leading-relaxed">
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
                                    return (
                                      <span key={rule.id}>
                                        {i > 0 && <span className="text-[#0B3D26] font-semibold"> {formData.rules_logic} </span>}
                                        <span className="text-blue-600">{field}</span>
                                        <span className="text-gray-400"> {opSymbol} </span>
                                        {value && <span className="text-emerald-600">{value}</span>}
                                      </span>
                                    )
                                  })}
                                </code>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="rounded-xl border border-gray-200 flex items-start justify-between gap-4 px-4 py-3.5">
                          <div>
                            <div className="text-sm font-medium text-gray-900">Escalate to admin on breach</div>
                            <p className="mt-0.5 text-xs text-gray-500">Email an administrator when this target is missed.</p>
                          </div>
                          <Toggle
                            checked={formData.auto_assign_on_breach}
                            onChange={() => setFormData({ ...formData, auto_assign_on_breach: !formData.auto_assign_on_breach })}
                            label="Escalate to admin on breach"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      {currentStep > 1 && (
                        <button type="button" onClick={handlePrevious} className={btn.secondary}>
                          <ArrowLeft className="w-4 h-4" />
                          Back
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <Link href="/administration/sla/" className={`${btn.secondary} flex-1 sm:flex-none`}>
                        Cancel
                      </Link>
                      {currentStep < 3 ? (
                        <button type="button" onClick={handleNext} className={`${btn.primary} flex-1 sm:flex-none`}>
                          Continue
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button type="submit" className={`${btn.primary} flex-1 sm:flex-none`}>
                          <CheckCircle2 className="w-4 h-4" />
                          {isEditing ? 'Update policy' : 'Create policy'}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              {/* Live preview */}
              <aside className="hidden xl:block sticky top-20">
                <PolicyPreview formData={formData} customRuleCount={formData.custom_rules.length} />
              </aside>
            </div>
          </div>
        </main>
      </AppShell>
    </>
  )
}
