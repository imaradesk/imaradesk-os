import React, { useState, useEffect } from 'react'
import DatePicker from '../components/pickers/DatePicker'
import { Head, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import { SettingsHeading, SettingsRow, Toggle, Badge, btn } from '../components/settings/SettingsPage'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import Select from '../components/SearchableSelect'
import TimePicker from '../components/pickers/TimePicker'
import {
  Calendar, CalendarDays, CalendarPlus, CheckCircle2, Clock, Gauge, Globe2, Loader2, Pencil, Plus,
  Repeat, Search, Shield, SlidersHorizontal, Timer, Trash2, X,
} from 'lucide-react'
import {
  EmptyState, PolicySummary, SlaCard, SlaHero, StatTile, fieldClass,
} from '../components/sla/SLAUI'
import Tabs from '../components/Tabs'

const formatDuration = (start, end) => {
  if (!start || !end) return null
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  const totalMins = (endH * 60 + endM) - (startH * 60 + startM)
  if (totalMins <= 0) return 'Invalid'
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

const Spinner = () => <Loader2 className="w-4 h-4 animate-spin" />

function SearchField({ value, onChange, placeholder }) {
  return (
    <div className="relative sm:w-72">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onChange('') }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full h-9 pl-9 pr-8 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26] transition-shadow"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export default function SLASettings({
  policies = [],
  business_hours = null,
  holidays = [],
  activeTab: initialTab = 'policies'
}) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [policySearch, setPolicySearch] = useState('')
  const [holidaySearch, setHolidaySearch] = useState('')
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, policyId: null, holidayId: null })
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [slaSettings, setSlaSettings] = useState({
    enabled: false,
    auto_pause_resolved: true,
    auto_resume_reopened: true,
    escalation_enabled: true,
    send_notifications: true,
  })

  // Business Hours State
  const [loading, setLoading] = useState(false)
  const [timezones, setTimezones] = useState([])
  const [loadingTimezones, setLoadingTimezones] = useState(true)
  const [businessFormData, setBusinessFormData] = useState({
    name: business_hours?.name || 'Default Business Hours',
    timezone: business_hours?.timezone || 'America/New_York',
    monday_enabled: business_hours?.monday_enabled ?? true,
    monday_start: business_hours?.monday_start || '09:00',
    monday_end: business_hours?.monday_end || '17:00',
    tuesday_enabled: business_hours?.tuesday_enabled ?? true,
    tuesday_start: business_hours?.tuesday_start || '09:00',
    tuesday_end: business_hours?.tuesday_end || '17:00',
    wednesday_enabled: business_hours?.wednesday_enabled ?? true,
    wednesday_start: business_hours?.wednesday_start || '09:00',
    wednesday_end: business_hours?.wednesday_end || '17:00',
    thursday_enabled: business_hours?.thursday_enabled ?? true,
    thursday_start: business_hours?.thursday_start || '09:00',
    thursday_end: business_hours?.thursday_end || '17:00',
    friday_enabled: business_hours?.friday_enabled ?? true,
    friday_start: business_hours?.friday_start || '09:00',
    friday_end: business_hours?.friday_end || '17:00',
    saturday_enabled: business_hours?.saturday_enabled ?? false,
    saturday_start: business_hours?.saturday_start || '09:00',
    saturday_end: business_hours?.saturday_end || '17:00',
    sunday_enabled: business_hours?.sunday_enabled ?? false,
    sunday_start: business_hours?.sunday_start || '09:00',
    sunday_end: business_hours?.sunday_end || '17:00',
    pause_outside_hours: business_hours?.pause_outside_hours ?? false,
    exclude_holidays: business_hours?.exclude_holidays ?? true,
    is_active: true,
  })

  // Holidays State
  const [holidaysList, setHolidaysList] = useState(holidays)
  const [showHolidayModal, setShowHolidayModal] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState(null)
  const [holidayFormData, setHolidayFormData] = useState({
    name: '',
    date: '',
    recurring: false,
    status: 'active',
  })

  const tabs = [
    { id: 'policies', label: 'Policies', icon: Shield, count: policies.length },
    { id: 'business-hours', label: 'Business hours', icon: Clock },
    { id: 'holidays', label: 'Holidays', icon: Calendar, count: holidaysList.length },
  ]

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ]

  const activePolicies = policies.filter((p) => p.status === 'active').length
  const openDays = days.filter((d) => businessFormData[`${d.key}_enabled`]).length

  // Fetch SLA settings on mount
  useEffect(() => {
    fetchSLASettings()
  }, [])

  // Load timezones on mount
  useEffect(() => {
    const fetchTimezones = async () => {
      try {
        const response = await api.get('/sla/api/timezones/')
        const data = response.data
        if (data.success) {
          setTimezones(data.timezones)
        }
      } catch (error) {
        console.error('Error loading timezones:', error)
      } finally {
        setLoadingTimezones(false)
      }
    }
    fetchTimezones()
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

  const toggleSLAConfirm = () => {
    setConfirmDialog({
      isOpen: true,
      action: slaSettings.enabled ? 'deactivate' : 'activate',
      policyId: null,
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

  // Business Hours handlers
  const handleBusinessInputChange = (field, value) => {
    setBusinessFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleBusinessSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/sla/api/business-hours/save/', businessFormData)

      const data = response.data

      if (data.success) {
        toast.success(data.message || 'Business hours saved successfully')
      } else {
        toast.error(data.message || 'Failed to save business hours')
      }
    } catch (error) {
      console.error('Error saving business hours:', error)
      toast.error('An error occurred while saving business hours')
    } finally {
      setLoading(false)
    }
  }

  // Holiday handlers
  const handleAddHoliday = () => {
    setEditingHoliday(null)
    setHolidayFormData({
      name: '',
      date: '',
      recurring: false,
      status: 'active',
    })
    setShowHolidayModal(true)
  }

  const handleEditHoliday = (holiday) => {
    setEditingHoliday(holiday)
    setHolidayFormData({
      name: holiday.name,
      date: holiday.date,
      recurring: holiday.recurring,
      status: holiday.status,
    })
    setShowHolidayModal(true)
  }

  const handleHolidaySubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingHoliday
        ? `/sla/api/holidays/${editingHoliday.id}/update/`
        : '/sla/api/holidays/create/'

      const method = editingHoliday ? 'put' : 'post'

      const response = await api[method](url, holidayFormData)

      const data = response.data

      if (data.success) {
        toast.success(data.message || 'Holiday saved successfully')

        if (editingHoliday) {
          setHolidaysList(prev => prev.map(h => h.id === editingHoliday.id ? data.holiday : h))
        } else {
          setHolidaysList(prev => [...prev, data.holiday])
        }

        setShowHolidayModal(false)
      } else {
        toast.error(data.message || 'Failed to save holiday')
      }
    } catch (error) {
      console.error('Error saving holiday:', error)
      toast.error('An error occurred while saving holiday')
    } finally {
      setLoading(false)
    }
  }

  const confirmDeleteHoliday = (holidayId) => {
    setConfirmDialog({ isOpen: true, action: 'delete-holiday', holidayId })
  }

  const handleDeleteHoliday = async () => {
    const holidayId = confirmDialog.holidayId

    toast.promise(
      api.delete(`/sla/api/holidays/${holidayId}/delete/`)
        .then((response) => {
          const data = response.data
          if (data.success) {
            setHolidaysList(prev => prev.filter(h => h.id !== holidayId))
            return data.message || 'Holiday deleted successfully'
          }
          throw new Error(data.message || 'Failed to delete holiday')
        }),
      {
        loading: 'Deleting holiday...',
        success: (message) => message,
        error: (err) => err.message || 'Failed to delete holiday',
      }
    )
  }

  const policyQuery = policySearch.trim().toLowerCase()
  const filteredPolicies = policyQuery
    ? policies.filter((p) => [p.name, p.description, p.priority].some((v) => v && String(v).toLowerCase().includes(policyQuery)))
    : policies
  const holidayQuery = holidaySearch.trim().toLowerCase()
  const filteredHolidays = holidayQuery
    ? holidaysList.filter((h) => h.name && h.name.toLowerCase().includes(holidayQuery))
    : holidaysList


  return (
    <>
      <Head title="SLA Settings" />
      <AppShell active="settings" fixedHeight>
        <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
          <header>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex items-center justify-between gap-3">
              <SettingsHeading section="sla">SLA</SettingsHeading>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Status */}
            {isLoadingSettings ? (
              <div>
                <div className="flex items-center gap-4 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-gray-200" />
                    <div className="h-3 w-3/4 rounded bg-gray-200" />
                  </div>
                </div>
              </div>
            ) : (
              <SlaHero
                bare
                icon={null}
                title={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    Service level agreements
                    <Badge tone={slaSettings.enabled ? 'green' : 'gray'} dot>
                      {slaSettings.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </span>
                }
                description={slaSettings.enabled
                  ? 'Tickets are being measured against your policies and working hours.'
                  : 'Turn on SLA tracking to measure first response and resolution times.'}
                aside={slaSettings.enabled && (
                  <div className="grid grid-cols-3 gap-2">
                    <StatTile icon={Shield} label="Policies" value={activePolicies} hint={`of ${policies.length}`} />
                    <StatTile icon={Clock} label="Open days" value={openDays} hint="per week" tone="text-emerald-600" />
                    <StatTile icon={CalendarDays} label="Holidays" value={holidaysList.length} tone="text-amber-600" />
                  </div>
                )}
              />
            )}

            {/* Disabled state */}
            {!isLoadingSettings && !slaSettings.enabled && (
              <section className="animate-portalRise [animation-delay:80ms]">
                <div className="px-5 sm:px-8 py-12 text-center">
                  <div className="relative mx-auto w-16 h-16">
                    <span className="absolute inset-0 rounded-2xl bg-[#0B3D26]/10 animate-ping [animation-duration:2.5s]" />
                    <span className="relative w-16 h-16 rounded-2xl bg-[#0B3D26]/10 text-[#0B3D26] inline-flex items-center justify-center animate-portalPop">
                      <Gauge className="w-8 h-8" strokeWidth={1.5} />
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-gray-900">SLA tracking is disabled</h3>
                  <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                    Enable tracking to define priorities, working hours and holidays. You can turn it off again at any time.
                  </p>
                  <button type="button" onClick={toggleSLAConfirm} className={`${btn.primary} mt-6 active:scale-[0.97]`}>
                    <Shield className="w-4 h-4" />
                    Enable SLA tracking
                  </button>
                </div>
              </section>
            )}

            {/* Enabled: tabs */}
            {!isLoadingSettings && slaSettings.enabled && (
              <div className="space-y-4">
                <Tabs
                  label="SLA sections"
                  active={activeTab}
                  onChange={setActiveTab}
                  tabs={tabs}
                />

                <div key={activeTab} className="animate-portalSlideIn">
                  {/* Policies */}
                  {activeTab === 'policies' && (
                    <div className="space-y-4">
                    <SearchField value={policySearch} onChange={setPolicySearch} placeholder="Search policies" />
                    {policies.length === 0 ? (
                      <EmptyState
                        bare
                        icon={Shield}
                        title="No policies yet"
                        description="Create your first policy to start measuring service levels."
                        action={
                          <Link href="/administration/sla/policies/add/" className={`${btn.primary} active:scale-[0.97]`}>
                            <Plus className="w-4 h-4" />
                            Create policy
                          </Link>
                        }
                      />
                    ) : filteredPolicies.length === 0 ? (
                      <EmptyState
                        bare
                        icon={Search}
                        title="No matching policies"
                        description={`No policies match "${policySearch.trim()}".`}
                      />
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500">
                          Targets applied to new tickets, based on priority · <span className="font-medium text-gray-900">{activePolicies}</span> of {policies.length} active
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,280px)] gap-4">
                          {filteredPolicies.map((policy, index) => {
                            const active = policy.status === 'active'
                            return (
                              <article
                                key={policy.id}
                                style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                                className={`group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-4 animate-portalRise portal-lift hover:shadow-card-hover hover:border-[#0B3D26]/30 ${active ? '' : 'opacity-70'}`}
                              >
                                <PolicySummary
                                  priority={policy.priority}
                                  active={active}
                                  description={policy.description}
                                  firstResponse={policy.first_response_minutes}
                                  resolution={policy.resolution_time_minutes}
                                  notifyBeforeBreach={policy.notify_before_breach}
                                  useCustomRules={policy.use_custom_rules}
                                  customRuleCount={policy.custom_rules?.length || 0}
                                  rulesLogic={policy.rules_logic}
                                  autoAssignOnBreach={policy.auto_assign_on_breach}
                                  title={
                                    <Link
                                      href={`/administration/sla/policies/${policy.id}/edit/`}
                                      className="block text-sm font-semibold text-gray-900 truncate hover:text-[#0B3D26] transition-colors"
                                    >
                                      {policy.name}
                                    </Link>
                                  }
                                  actions={
                                    <div className="flex items-center gap-0.5 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                      <Link
                                        href={`/administration/sla/policies/${policy.id}/edit/`}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                        title="Edit policy"
                                        aria-label={`Edit ${policy.name}`}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Link>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteConfirm(policy.id)}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        title="Delete policy"
                                        aria-label={`Delete ${policy.name}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  }
                                />
                              </article>
                            )
                          })}

                          <Link
                            href="/administration/sla/policies/add/"
                            style={{ animationDelay: `${Math.min(filteredPolicies.length, 8) * 50}ms` }}
                            className="group flex flex-col items-center justify-center gap-2 min-h-[10rem] rounded-2xl border border-dashed border-gray-300 bg-white/50 text-gray-500 hover:text-[#0B3D26] hover:border-[#0B3D26]/30 transition-colors animate-portalRise"
                          >
                            <span className="w-10 h-10 rounded-xl bg-gray-100 inline-flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90">
                              <Plus className="w-5 h-5" />
                            </span>
                            <span className="text-sm font-medium">New policy</span>
                          </Link>
                        </div>
                      </div>
                    )}
                    </div>
                  )}

                  {/* Business hours */}
                  {activeTab === 'business-hours' && (
                    <form onSubmit={handleBusinessSubmit} className="space-y-4">
                      {/* Week at a glance */}
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {days.map((day, i) => {
                          const isEnabled = businessFormData[`${day.key}_enabled`]
                          return (
                            <button
                              key={day.key}
                              type="button"
                              onClick={() => handleBusinessInputChange(`${day.key}_enabled`, !isEnabled)}
                              aria-pressed={isEnabled}
                              title={`${isEnabled ? 'Close' : 'Open'} on ${day.label}`}
                              style={{ animationDelay: `${i * 40}ms` }}
                              className={`rounded-xl border px-1 py-2.5 sm:py-3 text-center transition-all duration-300 animate-portalRise active:scale-95 ${
                                isEnabled
                                  ? 'border-[#0B3D26] bg-[#0B3D26] text-white shadow-sm'
                                  : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                              }`}
                            >
                              <span className="block text-xs sm:text-sm font-semibold">{day.label.slice(0, 3)}</span>
                              <span className={`hidden sm:block mt-0.5 text-[10px] tabular-nums ${isEnabled ? 'text-white/80' : ''}`}>
                                {isEnabled ? `${businessFormData[`${day.key}_start`]}–${businessFormData[`${day.key}_end`]}` : 'Closed'}
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      <SlaCard icon={Globe2} title="Timezone" description="Holidays and working hours are evaluated in this timezone." delay={60}>
                        <div className="max-w-md">
                          {loadingTimezones ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Spinner />
                              Loading timezones…
                            </div>
                          ) : (
                            <Select
                              value={businessFormData.timezone}
                              onChange={(value) => handleBusinessInputChange('timezone', value)}
                              options={timezones}
                              displayKey="name"
                              valueKey="id"
                              placeholder="Select timezone..."
                              searchable={true}
                              allowClear={false}
                            />
                          )}
                        </div>
                      </SlaCard>

                      <SlaCard icon={Clock} title="Weekly schedule" description={`${openDays} of 7 days are currently open.`} flush delay={120}>
                        <div className="divide-y divide-gray-100">
                          {days.map((day) => {
                            const isEnabled = businessFormData[`${day.key}_enabled`]
                            const startTime = businessFormData[`${day.key}_start`]
                            const endTime = businessFormData[`${day.key}_end`]
                            const duration = formatDuration(startTime, endTime)

                            return (
                              <div
                                key={day.key}
                                className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-3.5 transition-colors ${
                                  isEnabled ? '' : 'bg-gray-50/60'
                                }`}
                              >
                                <div className="flex items-center gap-3 sm:w-44 flex-shrink-0">
                                  <Toggle
                                    checked={isEnabled}
                                    onChange={() => handleBusinessInputChange(`${day.key}_enabled`, !isEnabled)}
                                    label={`Toggle ${day.label}`}
                                  />
                                  <span className={`text-sm font-medium transition-colors ${isEnabled ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {day.label}
                                  </span>
                                </div>

                                <div className={`flex flex-1 items-center gap-2 min-w-0 transition-opacity duration-200 ${
                                  isEnabled ? 'opacity-100' : 'opacity-45 pointer-events-none'
                                }`}>
                                  <TimePicker
                                    value={startTime}
                                    onChange={(v) => handleBusinessInputChange(`${day.key}_start`, v)}
                                    disabled={!isEnabled}
                                    aria-label={`${day.label} start time`}
                                    className="w-[124px]"
                                  />
                                  <span className="text-xs text-gray-400">to</span>
                                  <TimePicker
                                    value={endTime}
                                    onChange={(v) => handleBusinessInputChange(`${day.key}_end`, v)}
                                    disabled={!isEnabled}
                                    aria-label={`${day.label} end time`}
                                    className="w-[124px]"
                                  />
                                  {isEnabled && duration && (
                                    <span className={`ml-auto inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium ring-1 ring-inset animate-portalPop ${
                                      duration === 'Invalid'
                                        ? 'bg-red-50 text-red-700 ring-red-600/15'
                                        : 'bg-gray-100 text-gray-600 ring-gray-500/10'
                                    }`}>
                                      <Timer className="w-3 h-3" />
                                      {duration}
                                    </span>
                                  )}
                                </div>

                                <div className={`inline-flex items-center gap-1.5 text-xs font-medium sm:w-16 sm:justify-end flex-shrink-0 ${
                                  isEnabled ? 'text-emerald-600' : 'text-gray-400'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                  {isEnabled ? 'Open' : 'Closed'}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </SlaCard>

                      <SlaCard icon={SlidersHorizontal} title="Additional options" description="Fine-tune how the countdown behaves." flush delay={180}>
                        <div className="divide-y divide-gray-100">
                          <SettingsRow
                            title="Pause the timer outside business hours"
                            description="The SLA countdown stops while the office is closed."
                          >
                            <Toggle
                              checked={businessFormData.pause_outside_hours}
                              onChange={() => handleBusinessInputChange('pause_outside_hours', !businessFormData.pause_outside_hours)}
                              label="Pause SLA timer outside business hours"
                            />
                          </SettingsRow>
                          <SettingsRow
                            title="Exclude holidays"
                            description="Configured holidays do not count towards SLA time."
                          >
                            <Toggle
                              checked={businessFormData.exclude_holidays}
                              onChange={() => handleBusinessInputChange('exclude_holidays', !businessFormData.exclude_holidays)}
                              label="Exclude holidays from SLA calculations"
                            />
                          </SettingsRow>
                        </div>
                      </SlaCard>

                      <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-5 py-3 sm:rounded-2xl border-t sm:border border-gray-200 bg-white/80 backdrop-blur flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-xs text-gray-500">Applies to every policy that uses business hours.</p>
                        <button
                          type="submit"
                          disabled={loading}
                          className={`${btn.primary} self-end sm:self-auto active:scale-[0.97]`}
                        >
                          {loading ? <><Spinner /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Save changes</>}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Holidays */}
                  {activeTab === 'holidays' && (
                    <div className="space-y-4">
                    <SearchField value={holidaySearch} onChange={setHolidaySearch} placeholder="Search holidays" />
                    {holidaysList.length === 0 ? (
                      <EmptyState
                        bare
                        icon={CalendarDays}
                        title="No holidays configured"
                        description="Add public holidays or office closures to pause the countdown."
                        action={
                          <button type="button" onClick={handleAddHoliday} className={`${btn.primary} active:scale-[0.97]`}>
                            <CalendarPlus className="w-4 h-4" />
                            Add holiday
                          </button>
                        }
                      />
                    ) : filteredHolidays.length === 0 ? (
                      <EmptyState
                        bare
                        icon={Search}
                        title="No matching holidays"
                        description={`No holidays match "${holidaySearch.trim()}".`}
                      />
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500">
                          SLA timers pause on these dates · <span className="font-medium text-gray-900">{holidaysList.length}</span> configured
                        </p>
                        <ul className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
                          {filteredHolidays.map((holiday, index) => {
                            const holidayDate = new Date(holiday.date + 'T00:00:00')
                            const isPast = holidayDate < new Date()
                            const isUpcoming = !isPast && holidayDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            const active = holiday.status === 'active'
                            return (
                              <li
                                key={holiday.id}
                                style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
                                className={`group flex items-center gap-4 px-4 sm:px-5 py-3 hover:bg-gray-50 transition-colors animate-portalRise ${active ? '' : 'opacity-60'}`}
                              >
                                {/* Date tile */}
                                <div className={`w-12 flex-shrink-0 rounded-xl border overflow-hidden text-center transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 ${
                                  isUpcoming && active ? 'border-amber-200' : 'border-gray-200'
                                }`}>
                                  <div className={`py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                    isUpcoming && active ? 'bg-amber-500 text-white' : holiday.recurring ? 'bg-blue-500 text-white' : 'bg-[#0B3D26] text-white'
                                  }`}>
                                    {holidayDate.toLocaleDateString('en-US', { month: 'short' })}
                                  </div>
                                  <div className="py-1 bg-white text-lg font-semibold leading-tight text-gray-900 tabular-nums">{holidayDate.getDate()}</div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-gray-900 truncate">{holiday.name}</h4>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                                    <span>{holidayDate.toLocaleDateString('en-US', { weekday: 'long' })}, {holidayDate.getFullYear()}</span>
                                    <span className="inline-flex items-center gap-1">
                                      {holiday.recurring ? <><Repeat className="w-3 h-3" /> Yearly</> : 'One-time'}
                                    </span>
                                  </div>
                                </div>

                                <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                                  {isUpcoming && active && <Badge tone="amber" dot>Soon</Badge>}
                                  {isPast && !holiday.recurring && <Badge tone="gray">Past</Badge>}
                                  <Badge tone={active ? 'green' : 'gray'} dot>{active ? 'Active' : 'Inactive'}</Badge>
                                </div>

                                <div className="flex items-center gap-0.5 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => handleEditHoliday(holiday)}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-[#0B3D26] hover:bg-[#0B3D26]/5 transition-colors"
                                    title="Edit holiday"
                                    aria-label={`Edit ${holiday.name}`}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => confirmDeleteHoliday(holiday.id)}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Delete holiday"
                                    aria-label={`Delete ${holiday.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Add/Edit Holiday Modal */}
        {showHolidayModal && (
          <Modal
            isOpen={showHolidayModal}
            onClose={() => setShowHolidayModal(false)}
            title={editingHoliday ? 'Edit holiday' : 'Add holiday'}
          >
            <form onSubmit={handleHolidaySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Holiday name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={holidayFormData.name}
                  onChange={(e) => setHolidayFormData({ ...holidayFormData, name: e.target.value })}
                  className={fieldClass}
                  placeholder="e.g. New Year's Day"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  value={holidayFormData.date}
                  onChange={(date) => setHolidayFormData({ ...holidayFormData, date })}
                  size="lg"
                  aria-label="Holiday date"
                  required
                />
              </div>

              <div className="w-full flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3">
                <span>
                  <span className="block text-sm font-medium text-gray-900">Repeats every year</span>
                  <span className="block mt-0.5 text-xs text-gray-500">Useful for public holidays with a fixed date.</span>
                </span>
                <Toggle
                  checked={holidayFormData.recurring}
                  onChange={() => setHolidayFormData({ ...holidayFormData, recurring: !holidayFormData.recurring })}
                  label="Repeats every year"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <Select
                  value={holidayFormData.status}
                  onChange={(value) => setHolidayFormData({ ...holidayFormData, status: value })}
                  options={[
                    { id: 'active', name: 'Active' },
                    { id: 'inactive', name: 'Inactive' },
                  ]}
                  placeholder="Select status"
                  allowClear={false}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowHolidayModal(false)} className={btn.secondary}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} className={btn.primary}>
                  {loading ? <><Spinner /> Saving…</> : (editingHoliday ? 'Save changes' : 'Add holiday')}
                </button>
              </div>
            </form>
          </Modal>
        )}

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, action: null, policyId: null, holidayId: null })}
          onConfirm={() => {
            if (confirmDialog.action === 'delete') {
              handleDelete()
            } else if (confirmDialog.action === 'delete-holiday') {
              handleDeleteHoliday()
            } else if (confirmDialog.action === 'activate' || confirmDialog.action === 'deactivate') {
              toggleSLA()
            }
          }}
          title={
            confirmDialog.action === 'delete'
              ? 'Delete SLA policy'
              : confirmDialog.action === 'delete-holiday'
                ? 'Delete holiday'
                : confirmDialog.action === 'activate'
                  ? 'Activate SLA tracking'
                  : 'Deactivate SLA tracking'
          }
          message={
            confirmDialog.action === 'delete'
              ? 'Are you sure you want to delete this SLA policy? This action cannot be undone.'
              : confirmDialog.action === 'delete-holiday'
                ? 'Remove this holiday? SLA timers will no longer pause on this date.'
                : confirmDialog.action === 'activate'
                  ? 'Activate SLA tracking to start monitoring ticket response and resolution times against your defined policies?'
                  : 'Deactivate SLA tracking? New tickets will not be assigned SLA policies.'
          }
          confirmText={
            confirmDialog.action === 'delete' ? 'Delete' :
            confirmDialog.action === 'delete-holiday' ? 'Delete' :
            confirmDialog.action === 'activate' ? 'Activate' : 'Deactivate'
          }
          cancelText="Cancel"
          confirmStyle={confirmDialog.action === 'delete' || confirmDialog.action === 'deactivate' || confirmDialog.action === 'delete-holiday' ? 'danger' : 'primary'}
        />
      </AppShell>
    </>
  )
}
