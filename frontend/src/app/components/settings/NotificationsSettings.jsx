import React, { useState, useEffect, useMemo } from 'react'
import { usePage } from '@inertiajs/react'
import toast from 'react-hot-toast'
import { BellRing, Mail } from 'lucide-react'
import { SettingsSection, SettingsRow, Toggle, Badge, btn } from './SettingsPage'
import api from '../../../utils/axios'
import { useInstalledModules } from '../../context/InstalledModulesContext'

export default function NotificationsSettings() {
  const { notification_preferences = {}, notification_modules = [], user_email = '' } = usePage().props
  const { isModuleInstalled } = useInstalledModules()
  
  const [preferences, setPreferences] = useState({
    weekly_performance_report: false,
    weekly_report_email: '',
    ...notification_preferences,
  })
  const [isSaving, setIsSaving] = useState(false)
  
  useEffect(() => {
    if (notification_preferences) {
      setPreferences(prev => ({
        ...prev,
        ...notification_preferences,
        weekly_report_email: notification_preferences.weekly_report_email || user_email,
      }))
    }
  }, [notification_preferences, user_email])
  
  const handleToggle = async (field) => {
    const newValue = !preferences[field]
    const updatedPreferences = { ...preferences, [field]: newValue }
    
    if (field === 'weekly_performance_report' && newValue && !updatedPreferences.weekly_report_email) {
      updatedPreferences.weekly_report_email = user_email
    }
    
    setPreferences(updatedPreferences)
    await savePreferences({ [field]: newValue })
  }
  
  const handleEmailChange = (e) => {
    setPreferences({ ...preferences, weekly_report_email: e.target.value })
  }
  
  const handleEmailBlur = async () => {
    await savePreferences({ weekly_report_email: preferences.weekly_report_email })
  }
  
  const savePreferences = async (data) => {
    setIsSaving(true)
    try {
      const response = await api.post('/administration/notifications/update/', data)
      
      if (response.data.success) {
        toast.success('Notification settings saved')
      } else {
        toast.error(response.data.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error)
      toast.error('Failed to save notification settings')
    } finally {
      setIsSaving(false)
    }
  }
  
  const setMany = async (fields, value) => {
    const changes = Object.fromEntries(fields.map((f) => [f, value]))
    setPreferences((prev) => ({ ...prev, ...changes }))
    await savePreferences(changes)
  }

  // Module icon mapping
  const moduleIcons = {
    tickets: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
      </svg>
    ),
    tasks: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    kb: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    sla: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    general: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364" />
      </svg>
    ),
  }
  
  // Filter modules based on installed apps
  const filteredModules = useMemo(() => {
    return notification_modules.filter(module => {
      if (module.alwaysVisible) return true
      return isModuleInstalled(module.id)
    })
  }, [notification_modules, isModuleInstalled])
  
  // Count enabled notifications per module
  const getEnabledCount = (module) => {
    return module.items.filter(item => preferences[item.field]).length
  }

  const allFields = filteredModules.flatMap((m) => m.items.map((i) => i.field))
  const totalOn = allFields.filter((f) => preferences[f]).length

  return (
    <>
      {/* Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="relative flex w-9 h-9 items-center justify-center rounded-lg bg-[#0B3D26]/[0.07] text-[#0B3D26]">
            <BellRing className="w-4 h-4" />
          </span>
          <div>
            <div className="text-sm font-medium text-gray-900">{totalOn} of {allFields.length} email notifications on</div>
            <div className="text-xs text-gray-500">Changes save automatically{isSaving && ' · saving…'}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMany(allFields, true)} disabled={isSaving || totalOn === allFields.length} className={btn.secondary}>Turn all on</button>
          <button onClick={() => setMany(allFields, false)} disabled={isSaving || totalOn === 0} className={btn.secondary}>Turn all off</button>
        </div>
      </div>

      {filteredModules.map((module) => {
        const fields = module.items.map((i) => i.field)
        const enabledCount = getEnabledCount(module)
        const allOn = enabledCount === fields.length
        return (
          <SettingsSection
            key={module.id}
            id={`notif-${module.id}`}
            flush
            title={
              <span className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-md bg-gray-100 text-gray-600 flex items-center justify-center [&_svg]:w-4 [&_svg]:h-4">{moduleIcons[module.id]}</span>
                {module.name}
                <Badge tone={enabledCount ? 'brand' : 'gray'}>{enabledCount}/{fields.length}</Badge>
              </span>
            }
            action={
              <button onClick={() => setMany(fields, !allOn)} disabled={isSaving} className="text-sm font-medium text-[#0B3D26] hover:underline disabled:opacity-50">
                {allOn ? 'Turn all off' : 'Turn all on'}
              </button>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y divide-gray-100 lg:divide-y-0">
              {module.items.map((item, idx) => (
                <label
                  key={item.field}
                  className={`flex items-start justify-between gap-4 px-5 sm:px-6 py-4 cursor-pointer hover:bg-gray-50/70 transition-colors lg:border-b lg:border-gray-100 ${idx % 2 === 0 ? 'lg:border-r' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">{item.title}</span>
                    {item.description && <span className="block mt-0.5 text-xs leading-relaxed text-gray-500">{item.description}</span>}
                  </span>
                  <Toggle checked={!!preferences[item.field]} disabled={isSaving} label={item.title} onChange={() => handleToggle(item.field)} />
                </label>
              ))}
            </div>
          </SettingsSection>
        )
      })}

      <SettingsSection id="notif-reports" title="Scheduled reports" description="Summary reports delivered by email." flush>
        <SettingsRow title="Weekly performance report" description="Team performance and key metrics, every Monday morning.">
          <Toggle
            checked={!!preferences.weekly_performance_report}
            disabled={isSaving}
            label="Weekly performance report"
            onChange={() => handleToggle('weekly_performance_report')}
          />
        </SettingsRow>
        <div className={`grid transition-all duration-300 ease-out ${preferences.weekly_performance_report ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="px-5 sm:px-6 pb-5">
              <label htmlFor="weekly-email" className="block text-xs font-medium text-gray-600 mb-1.5">Send to</label>
              <div className="relative max-w-md">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="weekly-email"
                  type="email"
                  value={preferences.weekly_report_email || ''}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder={user_email}
                  className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#0B3D26] focus:ring-4 focus:ring-[#0B3D26]/10"
                />
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>
    </>
  )
}
