import React, { useState, useEffect } from 'react'
import { usePage } from '@inertiajs/react'
import toast from 'react-hot-toast'
import { COLORS } from '../../constants/theme'
import api from '../../../utils/axios'

export default function NotificationsSettings() {
  const { notification_preferences = {}, user_email = '' } = usePage().props
  
  const [preferences, setPreferences] = useState({
    notify_new_ticket_created: true,
    notify_ticket_assigned: true,
    notify_ticket_status_changed: true,
    notify_ticket_priority_changed: true,
    notify_new_comment: true,
    notify_ticket_reassigned: false,
    notify_ticket_group_assigned: true,
    notify_ticket_merged: true,
    notify_ticket_mentioned: true,
    weekly_performance_report: false,
    weekly_report_email: '',
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
      const response = await api.post('/settings/notifications/update/', data)
      
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
  
  const Toggle = ({ enabled, onToggle, disabled }) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      disabled={disabled || isSaving}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${enabled ? '' : 'bg-gray-200'} ${(disabled || isSaving) ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={enabled ? { backgroundColor: COLORS.primary } : {}}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
  
  const NotificationCard = ({ field, title, description }) => {
    const isEnabled = preferences[field]
    
    return (
      <div className="group relative bg-gray-50 border border-gray-100 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:-translate-y-0.5">
        {/* Status indicator dot */}
        <div className={`absolute top-3 right-3 w-2 h-2 rounded-full transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
        
        {/* Card content */}
        <div className="pr-4">
          <div className="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <h4 className="text-sm font-medium text-gray-900">{title}</h4>
          </div>
          
          {/* Description and toggle - shown on hover */}
          <div className="overflow-hidden transition-all duration-200 max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100">
            <p className="text-xs text-gray-500 mb-3 leading-relaxed pl-6">{description}</p>
            <div className="flex items-center justify-between pl-6">
              <span className="text-xs text-gray-400">{isEnabled ? 'Enabled' : 'Disabled'}</span>
              <Toggle enabled={isEnabled} onToggle={() => handleToggle(field)} />
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  const ticketNotifications = [
    { field: 'notify_new_ticket_created', title: 'New ticket created', description: 'When a new ticket is submitted' },
    { field: 'notify_ticket_assigned', title: 'Ticket assigned to me', description: 'When a ticket is assigned to you' },
    { field: 'notify_ticket_status_changed', title: 'Ticket status changed', description: 'When ticket status is updated (open, pending, resolved, closed)' },
    { field: 'notify_ticket_priority_changed', title: 'Ticket priority changed', description: 'When ticket priority is updated (low, medium, high, urgent)' },
    { field: 'notify_new_comment', title: 'New comment or reply', description: 'When someone comments on a ticket you\'re involved with' },
    { field: 'notify_ticket_reassigned', title: 'Ticket reassigned', description: 'When a ticket is reassigned to another agent' },
    { field: 'notify_ticket_group_assigned', title: 'Ticket assigned to group', description: 'When a ticket is assigned to a group (notifies all group members)' },
    { field: 'notify_ticket_merged', title: 'Ticket merged', description: 'When tickets are merged together' },
    { field: 'notify_ticket_mentioned', title: 'Mentioned in ticket', description: 'When you\'re mentioned using @username in a ticket' },
  ]
  
  const kbNotifications = [
    { field: 'notify_kb_article_published', title: 'Article published', description: 'When a knowledge base article is published' },
    { field: 'notify_kb_article_updated', title: 'Article updated', description: 'When a knowledge base article you authored is updated' },
    { field: 'notify_kb_feedback_received', title: 'Feedback received', description: 'When feedback is received on a knowledge base article' },
    { field: 'notify_kb_article_approved', title: 'Article approved', description: 'When a knowledge base article is approved or rejected' },
  ]
  
  const slaNotifications = [
    { field: 'notify_sla_response_warning', title: 'Response warning', description: 'When a ticket is approaching first response SLA breach' },
    { field: 'notify_sla_response_breached', title: 'Response breached', description: 'When a ticket has breached first response SLA' },
    { field: 'notify_sla_resolution_warning', title: 'Resolution warning', description: 'When a ticket is approaching resolution SLA breach' },
    { field: 'notify_sla_resolution_breached', title: 'Resolution breached', description: 'When a ticket has breached resolution SLA' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
          <p className="text-sm text-gray-500 mt-1">Hover over cards to see details and toggle notifications</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Enabled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-300"></span>
            Disabled
          </span>
        </div>
      </div>
      
      {/* Ticket Notifications */}
      <div className="space-y-3">
        <div className="flex items-center pb-2 border-b border-gray-200 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-800">Ticket Notifications</h3>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {ticketNotifications.map((item) => (
            <NotificationCard key={item.field} {...item} />
          ))}
        </div>
      </div>
      
      {/* Knowledge Base Notifications */}
      <div className="space-y-3">
        <div className="flex items-center pb-2 border-b border-gray-200 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-800">Knowledge Base</h3>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {kbNotifications.map((item) => (
            <NotificationCard key={item.field} {...item} />
          ))}
        </div>
      </div>
      
      {/* SLA Notifications */}
      <div className="space-y-3">
        <div className="flex items-center pb-2 border-b border-gray-200 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-800">SLA Notifications</h3>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {slaNotifications.map((item) => (
            <NotificationCard key={item.field} {...item} />
          ))}
        </div>
      </div>
      
      {/* Reports Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg text-black flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Scheduled Reports</h3>
            <p className="text-xs text-gray-500">Receive periodic summary reports via email</p>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-800">Weekly performance report</span>
              <p className="text-xs text-gray-500 mt-0.5">Summary of team performance and metrics every Monday</p>
            </div>
            <Toggle 
              enabled={preferences.weekly_performance_report} 
              onToggle={() => handleToggle('weekly_performance_report')} 
            />
          </div>
          
          {preferences.weekly_performance_report && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Delivery email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={preferences.weekly_report_email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder={user_email}
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  style={{ '--tw-ring-color': COLORS.primary, borderColor: 'inherit' }}
                  onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
