import React, { useState, useEffect } from 'react'
import TimePicker from '../components/pickers/TimePicker'
import { Head } from '@inertiajs/react'
import { CalendarClock, CalendarOff, Clock, Globe2, Loader2, PauseCircle, Save, Sun } from 'lucide-react'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import { SettingsHeading, Toggle } from '../components/settings/SettingsPage'
import Select from '../components/SearchableSelect'
import { SlaCard, SlaDisabledBanner, SlaHero, StatTile } from '../components/sla/SLAUI'
import { toast } from 'react-hot-toast'

const toMinutes = (value) => {
  const [h, m] = String(value || '').split(':').map(Number)
  return Number.isFinite(h) ? h * 60 + (m || 0) : null
}

/** Open minutes for a day, or 0 when closed / invalid */
const openMinutes = (enabled, start, end) => {
  if (!enabled) return 0
  const s = toMinutes(start)
  const e = toMinutes(end)
  return s !== null && e !== null && e > s ? e - s : 0
}

const formatHours = (minutes) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

const TIMELINE_TICKS = [0, 6, 12, 18, 24]

function DayTimeline({ enabled, start, end }) {
  const s = toMinutes(start) ?? 0
  const e = toMinutes(end) ?? 0
  const valid = enabled && e > s
  return (
    <div className="relative h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
      <span
        className="absolute inset-y-0 rounded-full bg-[#0B3D26] transition-all duration-500 ease-smooth"
        style={{ left: `${(s / 1440) * 100}%`, width: valid ? `${((e - s) / 1440) * 100}%` : '0%', opacity: valid ? 1 : 0 }}
      />
    </div>
  )
}

export default function SLABusinessHours({ business_hours = null, slaEnabled = false }) {
  const [loading, setLoading] = useState(false)
  const [timezones, setTimezones] = useState([])
  const [loadingTimezones, setLoadingTimezones] = useState(true)
  
  const [formData, setFormData] = useState({
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

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ]

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
        toast.error('Failed to load timezones')
      } finally {
        setLoadingTimezones(false)
      }
    }
    fetchTimezones()
  }, [])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/sla/api/business-hours/save/', formData)

      const data = response.data

      if (data.success) {
        toast.success(data.message || 'Business hours saved successfully')
        // Optionally reload the page to refresh data
        window.location.reload()
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

  const weeklyMinutes = days.reduce(
    (sum, day) => sum + openMinutes(formData[`${day.key}_enabled`], formData[`${day.key}_start`], formData[`${day.key}_end`]),
    0
  )
  const openDays = days.filter((day) => formData[`${day.key}_enabled`]).length

  return (
    <>
      <Head title="Business Hours - Settings" />
      <AppShell active="settings" fixedHeight>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex flex-wrap items-center gap-3">
              <SettingsHeading section="sla-business-hours">Business Hours</SettingsHeading>
            </div>

            <form onSubmit={handleSubmit} className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto w-full space-y-6">
              {!slaEnabled && <SlaDisabledBanner />}

              <SlaHero
                icon={CalendarClock}
                title="Business hours"
                description="When your support team is working. SLA timers use this schedule to measure response and resolution times."
                aside={
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <StatTile icon={Clock} label="Weekly hours" value={formatHours(weeklyMinutes)} />
                    <StatTile icon={Sun} label="Open days" value={`${openDays}/7`} tone="text-amber-600" />
                  </div>
                }
              />

              <SlaCard icon={Globe2} title="Timezone" description="All times below are in this timezone." delay={60}>
                {loadingTimezones ? (
                  <div className="h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading timezones…
                  </div>
                ) : (
                  <Select
                    value={formData.timezone}
                    onChange={(value) => handleInputChange('timezone', value)}
                    options={timezones}
                    displayKey="name"
                    valueKey="id"
                    placeholder="Select timezone..."
                    searchable={true}
                    allowClear={false}
                  />
                )}
              </SlaCard>

              <SlaCard icon={CalendarClock} title="Weekly schedule" description="Turn days on or off and set opening hours." flush delay={120}>
                <div className="hidden sm:flex items-center gap-4 px-5 sm:px-6 pt-3 text-[10px] text-gray-400 tabular-nums">
                  <span className="w-36 flex-shrink-0" />
                  <span className="w-[15.5rem] flex-shrink-0" />
                  <span className="flex-1 flex justify-between">
                    {TIMELINE_TICKS.map((t) => <span key={t}>{String(t).padStart(2, '0')}:00</span>)}
                  </span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {days.map((day, index) => {
                    const enabled = formData[`${day.key}_enabled`]
                    const start = formData[`${day.key}_start`]
                    const end = formData[`${day.key}_end`]
                    const minutes = openMinutes(enabled, start, end)
                    const invalid = enabled && minutes === 0
                    return (
                      <li
                        key={day.key}
                        style={{ animationDelay: `${160 + index * 35}ms` }}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3.5 animate-portalRise"
                      >
                        <div className="w-36 flex-shrink-0 flex items-center gap-3">
                          <Toggle
                            checked={enabled}
                            onChange={() => handleInputChange(`${day.key}_enabled`, !enabled)}
                            label={`${day.label} ${enabled ? 'open' : 'closed'}`}
                          />
                          <div className="min-w-0">
                            <p className={`text-sm font-medium transition-colors ${enabled ? 'text-gray-900' : 'text-gray-400'}`}>{day.label}</p>
                            <p className={`text-[11px] tabular-nums ${invalid ? 'text-red-600' : 'text-gray-400'}`}>
                              {!enabled ? 'Closed' : invalid ? 'End before start' : formatHours(minutes)}
                            </p>
                          </div>
                        </div>

                        <div className={`w-[15.5rem] flex-shrink-0 flex items-center gap-2 transition-opacity duration-300 ${enabled ? '' : 'opacity-50'}`}>
                          <TimePicker
                            aria-label={`${day.label} start`}
                            value={start}
                            onChange={(v) => handleInputChange(`${day.key}_start`, v)}
                            disabled={!enabled}
                            className="w-[7.25rem]"
                          />
                          <span className="text-gray-300">–</span>
                          <TimePicker
                            aria-label={`${day.label} end`}
                            value={end}
                            onChange={(v) => handleInputChange(`${day.key}_end`, v)}
                            disabled={!enabled}
                            className="w-[7.25rem]"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <DayTimeline enabled={enabled} start={start} end={end} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </SlaCard>

              <SlaCard icon={PauseCircle} title="Additional options" flush delay={200}>
                <div className="divide-y divide-gray-100">
                  {[
                    { key: 'pause_outside_hours', icon: PauseCircle, label: 'Pause SLA timer outside business hours', description: 'The SLA countdown pauses while the office is closed.' },
                    { key: 'exclude_holidays', icon: CalendarOff, label: 'Exclude holidays from SLA calculations', description: "Defined holidays won't count towards SLA time." },
                  ].map(({ key, icon: Icon, label, description }) => (
                    <div key={key} className="flex items-center gap-3 px-5 sm:px-6 py-4">
                      <span className={`w-8 h-8 flex-shrink-0 rounded-lg inline-flex items-center justify-center transition-colors ${formData[key] ? 'bg-[#0B3D26]/10 text-[#0B3D26]' : 'bg-gray-100 text-gray-400'}`}>
                        <Icon className="w-4 h-4" strokeWidth={1.75} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500">{description}</p>
                      </div>
                      <Toggle checked={formData[key]} onChange={() => handleInputChange(key, !formData[key])} label={label} />
                    </div>
                  ))}
                </div>
              </SlaCard>

              <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur px-4 py-3 shadow-card-hover animate-portalRise [animation-delay:240ms]">
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-900 tabular-nums">{formatHours(weeklyMinutes)}</span> per week across {openDays} {openDays === 1 ? 'day' : 'days'}
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-medium shadow-sm transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {loading ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </main>
        </div>
      </AppShell>
    </>
  )
}
