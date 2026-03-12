import React, { useState, useEffect } from 'react'
import { usePage } from '@inertiajs/react'
import toast from 'react-hot-toast'

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
      setPreferences({
        ...preferences,
        ...notification_preferences,
        weekly_report_email: notification_preferences.weekly_report_email || user_email,
      })
    }
  }, [notification_preferences, user_email])
  
  const handleToggle = async (field) => {
    const newValue = !preferences[field]
    const updatedPreferences = { ...preferences, [field]: newValue }
    
    // If weekly report is being turned on, ensure email is set
    if (field === 'weekly_performance_report' && newValue && !updatedPreferences.weekly_report_email) {
      updatedPreferences.weekly_report_email = user_email
    }
    
    setPreferences(updatedPreferences)
    
    // Save to backend
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
      const response = await fetch('/settings/notifications/update/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': window.csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify(data),
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Notification settings saved')
      } else {
        toast.error(result.message || 'Failed to save settings')
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
      onClick={onToggle}
      disabled={disabled || isSaving}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:ring-offset-2 ${enabled ? 'bg-[#4a154b]' : 'bg-gray-200'} ${(disabled || isSaving) ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
  
  const NotificationItem = ({ field, title, description }) => (
    <div className="flex items-start justify-between p-2 hover:bg-white rounded transition-colors">
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-900">{title}</span>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <Toggle enabled={preferences[field]} onToggle={() => handleToggle(field)} />
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Ticket Notifications */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
          </svg>
          Ticket Notifications
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <NotificationItem 
            field="notify_new_ticket_created"
            title="New ticket created"
            description="When a new ticket is submitted"
          />
          <NotificationItem 
            field="notify_ticket_assigned"
            title="Ticket assigned to me"
            description="When a ticket is assigned to you"
          />
          <NotificationItem 
            field="notify_ticket_status_changed"
            title="Ticket status changed"
            description="When ticket status is updated (open, pending, resolved, closed)"
          />
          <NotificationItem 
            field="notify_ticket_priority_changed"
            title="Ticket priority changed"
            description="When ticket priority is updated (low, medium, high, urgent)"
          />
          <NotificationItem 
            field="notify_new_comment"
            title="New comment or reply"
            description="When someone comments on a ticket you're involved with"
          />
          <NotificationItem 
            field="notify_ticket_reassigned"
            title="Ticket reassigned"
            description="When a ticket is reassigned to another agent"
          />
          <NotificationItem 
            field="notify_ticket_group_assigned"
            title="Ticket assigned to group"
            description="When a ticket is assigned to a group (notifies all group members)"
          />
          <NotificationItem 
            field="notify_ticket_merged"
            title="Ticket merged"
            description="When tickets are merged together"
          />
          <NotificationItem 
            field="notify_ticket_mentioned"
            title="Ticket mentioned in"
            description="When you're mentioned using @username in a ticket"
          />
        </div>
      </div>

      {/* Reports */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
          </svg>
          Reports
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between p-2 hover:bg-white rounded transition-colors">
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900">Weekly performance report</span>
              <p className="text-xs text-gray-500 mt-0.5">Weekly summary of team performance and metrics</p>
            </div>
            <Toggle 
              enabled={preferences.weekly_performance_report} 
              onToggle={() => handleToggle('weekly_performance_report')} 
            />
          </div>
          
          {/* Weekly Report Email - shows when weekly report is enabled */}
          {preferences.weekly_performance_report && (
            <div className="p-3 bg-white rounded-lg border border-gray-200 ml-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send report to
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
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
                    className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-[#4a154b] transition-colors"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Weekly reports will be sent every Monday at 9:00 AM
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
