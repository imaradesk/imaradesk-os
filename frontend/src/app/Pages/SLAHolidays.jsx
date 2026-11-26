import React, { useMemo, useState } from 'react'
import DatePicker from '../components/pickers/DatePicker'
import { Head } from '@inertiajs/react'
import { CalendarDays, CalendarHeart, CalendarPlus, History, Loader2, Pencil, Plus, Repeat, Sparkles, Trash2 } from 'lucide-react'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import { SettingsHeading, Toggle } from '../components/settings/SettingsPage'
import Modal from '../components/Modal'
import Select from '../components/SearchableSelect'
import { EmptyState, SlaDisabledBanner, SlaHero, StatTile, fieldClass } from '../components/sla/SLAUI'
import { toast } from 'react-hot-toast'
import Tabs from '../components/Tabs'

const parseDate = (value) => new Date(`${value}T00:00:00`)

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Next date the holiday applies; recurring holidays roll forward to this or next year */
function nextOccurrence(holiday, today) {
  const date = parseDate(holiday.date)
  if (Number.isNaN(date.getTime()) || !holiday.recurring) return date
  const next = new Date(today.getFullYear(), date.getMonth(), date.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  return next
}

const daysUntil = (date, today) => Math.round((date - today) / 86400000)

function relativeDay(days) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days > 1) return `In ${days} days`
  if (days === -1) return 'Yesterday'
  return `${Math.abs(days)} days ago`
}

function DateTile({ date, highlight = false }) {
  return (
    <span className={`w-12 h-14 flex-shrink-0 rounded-xl border overflow-hidden flex flex-col text-center transition-transform duration-300 group-hover:-rotate-3 ${
      highlight ? 'border-[#0B3D26]/30 shadow-sm' : 'border-gray-200'
    }`}>
      <span className={`text-[10px] font-semibold uppercase tracking-wider py-0.5 ${highlight ? 'bg-[#0B3D26] text-white' : 'bg-gray-100 text-gray-500'}`}>
        {date.toLocaleDateString('en-US', { month: 'short' })}
      </span>
      <span className="flex-1 flex items-center justify-center bg-white text-lg font-semibold text-gray-900 tabular-nums">
        {date.getDate()}
      </span>
    </span>
  )
}

export default function SLAHolidays({ holidays = [], slaEnabled = false }) {
  const [holidaysList, setHolidaysList] = useState(holidays)
  const [showModal, setShowModal] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const statusOptions = [
    { id: 'active', name: 'Active' },
    { id: 'inactive', name: 'Inactive' },
  ]
  
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    recurring: false,
    status: 'active',
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddHoliday = () => {
    setEditingHoliday(null)
    setFormData({
      name: '',
      date: '',
      recurring: false,
      status: 'active',
    })
    setShowModal(true)
  }

  const handleEdit = (holiday) => {
    setEditingHoliday(holiday)
    setFormData({
      name: holiday.name,
      date: holiday.date,
      recurring: holiday.recurring,
      status: holiday.status,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingHoliday
        ? `/sla/api/holidays/${editingHoliday.id}/update/`
        : '/sla/api/holidays/create/'
      
      const method = editingHoliday ? 'put' : 'post'

      const response = await api[method](url, formData)

      const data = response.data

      if (data.success) {
        toast.success(data.message || 'Holiday saved successfully')
        
        // Update the list
        if (editingHoliday) {
          setHolidaysList(prev => prev.map(h => h.id === editingHoliday.id ? data.holiday : h))
        } else {
          setHolidaysList(prev => [...prev, data.holiday])
        }
        
        setShowModal(false)
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

  const handleDelete = async (holidayId) => {
    if (!confirm('Are you sure you want to delete this holiday?')) {
      return
    }

    try {
      const response = await api.delete(`/sla/api/holidays/${holidayId}/delete/`)

      const data = response.data

      if (data.success) {
        toast.success(data.message || 'Holiday deleted successfully')
        setHolidaysList(prev => prev.filter(h => h.id !== holidayId))
      } else {
        toast.error(data.message || 'Failed to delete holiday')
      }
    } catch (error) {
      console.error('Error deleting holiday:', error)
      toast.error('An error occurred while deleting holiday')
    }
  }


  const [filter, setFilter] = useState('upcoming')

  // Annotate each holiday with its next occurrence so the list can be ordered and grouped
  const annotated = useMemo(() => {
    const today = startOfToday()
    return holidaysList
      .filter(Boolean)
      .map((holiday) => {
        const next = nextOccurrence(holiday, today)
        return { holiday, next, days: daysUntil(next, today) }
      })
      .sort((a, b) => (a.days >= 0) === (b.days >= 0) ? (a.days >= 0 ? a.days - b.days : b.days - a.days) : (a.days >= 0 ? -1 : 1))
  }, [holidaysList])

  const upcoming = annotated.filter((h) => h.days >= 0)
  const past = annotated.filter((h) => h.days < 0)
  const nextHoliday = upcoming.find((h) => h.holiday.status === 'active')
  const visible = filter === 'upcoming' ? upcoming : filter === 'past' ? past : annotated

  return (
    <>
      <Head title="Holidays - Settings" />
      <AppShell active="settings" fixedHeight>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex flex-wrap items-center gap-3 justify-between">
              <SettingsHeading section="sla-holidays">Holidays</SettingsHeading>
              <button
                type="button"
                onClick={handleAddHoliday}
                className="group inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-medium shadow-sm transition-all active:scale-[0.97]"
              >
                <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
                Add holiday
              </button>
            </div>

            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto w-full space-y-6">
              {!slaEnabled && <SlaDisabledBanner />}

              <SlaHero
                icon={CalendarHeart}
                title="Holidays"
                description="Days your team is off. SLA timers pause on active holidays so tickets aren't penalised."
                aside={
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <StatTile icon={CalendarDays} label="Upcoming" value={upcoming.length} />
                    <StatTile icon={Repeat} label="Recurring" value={annotated.filter((h) => h.holiday.recurring).length} tone="text-blue-600" />
                  </div>
                }
              >
                {nextHoliday && (
                  <div className="flex items-center gap-3 rounded-xl border border-[#0B3D26]/30 bg-[#0B3D26]/5 px-4 py-3 animate-portalRise [animation-delay:120ms]">
                    <Sparkles className="w-4 h-4 flex-shrink-0 text-[#0B3D26]" />
                    <p className="text-sm text-gray-700 min-w-0">
                      Next up: <span className="font-semibold text-gray-900">{nextHoliday.holiday.name}</span>
                      <span className="text-gray-500"> · {nextHoliday.next.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </p>
                    <span className="ml-auto flex-shrink-0 px-2 py-0.5 rounded-full bg-[#0B3D26] text-white text-[11px] font-medium">
                      {relativeDay(nextHoliday.days)}
                    </span>
                  </div>
                )}
              </SlaHero>

              {annotated.length === 0 ? (
                <EmptyState
                  icon={CalendarPlus}
                  title="No holidays yet"
                  description="Add public holidays and company days off so SLA timers pause automatically."
                  action={
                    <button type="button" onClick={handleAddHoliday} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-medium transition-colors">
                      <Plus className="w-4 h-4" /> Add holiday
                    </button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  <Tabs
                    label="Filter holidays"
                    active={filter}
                    onChange={setFilter}
                    tabs={[
                      { id: 'upcoming', label: 'Upcoming', icon: CalendarDays, count: upcoming.length },
                      { id: 'past', label: 'Past', icon: History, count: past.length },
                      { id: 'all', label: 'All', count: annotated.length },
                    ]}
                  />

                  {visible.length === 0 ? (
                    <EmptyState
                      icon={filter === 'past' ? History : CalendarDays}
                      title={filter === 'past' ? 'No past holidays' : 'Nothing coming up'}
                      description={filter === 'past' ? 'One-time holidays move here once they have passed.' : 'Add a holiday to plan ahead.'}
                    />
                  ) : (
                    <ul key={filter} className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
                      {visible.map(({ holiday, next, days }, index) => {
                        const inactive = holiday.status !== 'active'
                        const isNext = nextHoliday?.holiday.id === holiday.id
                        return (
                          <li
                            key={holiday.id}
                            style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
                            className="group flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-gray-50 transition-colors animate-portalRise"
                          >
                            <div className={inactive ? 'opacity-50 grayscale' : ''}>
                              <DateTile date={next} highlight={isNext} />
                            </div>

                            <div className={`flex-1 min-w-0 ${inactive ? 'opacity-60' : ''}`}>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-medium text-gray-900 truncate">{holiday.name}</h3>
                                {holiday.recurring ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-blue-200 bg-blue-50 text-[10px] font-medium text-blue-700">
                                    <Repeat className="w-2.5 h-2.5" /> Yearly
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-[10px] font-medium text-gray-500">One-time</span>
                                )}
                                {inactive && (
                                  <span className="px-1.5 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-[10px] font-medium text-amber-700">Inactive</span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {next.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                <span className={days >= 0 && days <= 7 ? 'text-[#0B3D26] font-medium' : ''}> · {relativeDay(days)}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleEdit(holiday)}
                                aria-label={`Edit ${holiday.name}`}
                                title="Edit"
                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(holiday.id)}
                                aria-label={`Delete ${holiday.name}`}
                                title="Delete"
                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Add/Edit Holiday Modal */}
        {showModal && (
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
          >
            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label htmlFor="holiday-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Holiday name <span className="text-red-500">*</span>
                </label>
                <input
                  id="holiday-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={fieldClass}
                  placeholder="e.g., New Year's Day"
                  required
                />
              </div>

              <div>
                <label htmlFor="holiday-date" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  id="holiday-date"
                  value={formData.date}
                  onChange={(date) => handleInputChange('date', date)}
                  size="lg"
                  required
                />
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
                <span className={`w-8 h-8 flex-shrink-0 rounded-lg inline-flex items-center justify-center transition-colors ${formData.recurring ? 'bg-[#0B3D26]/10 text-[#0B3D26]' : 'bg-gray-100 text-gray-400'}`}>
                  <Repeat className="w-4 h-4" strokeWidth={1.75} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Recurring annually</p>
                  <p className="text-xs text-gray-500">Repeats every year on the same date</p>
                </div>
                <Toggle
                  checked={formData.recurring}
                  onChange={() => handleInputChange('recurring', !formData.recurring)}
                  label="Recurring annually"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <Select
                  value={formData.status}
                  onChange={(value) => handleInputChange('status', value)}
                  options={statusOptions}
                  displayKey="name"
                  valueKey="id"
                  placeholder="Select status..."
                  allowClear={false}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-9 px-4 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-medium shadow-sm transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Saving…' : editingHoliday ? 'Update holiday' : 'Add holiday'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AppShell>
    </>
  )
}
