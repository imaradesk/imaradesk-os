import React, { useState } from 'react'
import Avatar from './Avatar'

// Theme colors
const COLORS = {
  primary: '#4a154b',
  primaryLight: '#825084',
  secondary: '#f3f4f6',
}

export default function ActivityTimeline({ activities = [] }) {
  // Expanded items state for collapsible functionality
  const [expandedActivities, setExpandedActivities] = useState({})
  
  // Toggle expand/collapse
  const toggleActivity = (id) => {
    setExpandedActivities(prev => ({ ...prev, [id]: !prev[id] }))
  }
  
  // Reverse for latest first
  const sortedActivities = [...activities].reverse()
  
  // Collapse/Expand all functions
  const collapseAllActivities = () => {
    setExpandedActivities({})
  }
  
  const expandAllActivities = () => {
    const expanded = {}
    sortedActivities.forEach(a => { expanded[a.id] = true })
    setExpandedActivities(expanded)
  }
  
  // Check if all are collapsed
  const allActivitiesCollapsed = Object.keys(expandedActivities).length === 0 || 
    Object.values(expandedActivities).every(v => !v)

  // Status badge helper
  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase()?.replace(/\s+/g, '_')
    const styles = {
      'new': 'bg-purple-100 text-purple-700 border border-purple-200',
      'open': 'bg-blue-100 text-blue-700 border border-blue-200',
      'in_progress': 'bg-blue-100 text-blue-700 border border-blue-200',
      'pending': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      'resolved': 'bg-green-100 text-green-700 border border-green-200',
      'closed': 'bg-gray-100 text-gray-600 border border-gray-200',
    }
    return styles[statusLower] || 'bg-gray-100 text-gray-600 border border-gray-200'
  }

  // Format status label
  const formatStatus = (status) => {
    if (!status) return ''
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'comment':
      case 'comment_added':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case 'status_change':
      case 'status_changed':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'reopened':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'assigned':
      case 'assignment':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      case 'attachment':
      case 'attachment_added':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        )
      default:
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }
  
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        No activity yet
      </div>
    )
  }
  
  return (
    <div>
      {/* Header with Expand/Collapse All */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Activity</h3>
        <button
          onClick={allActivitiesCollapsed ? expandAllActivities : collapseAllActivities}
          className="text-sm text-[#4a154b] hover:text-[#5a235c]"
        >
          {allActivitiesCollapsed ? 'Expand All' : 'Collapse All'}
        </button>
      </div>

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[11px] top-3 bottom-0 w-px bg-[#825084]/30" />
        
        <div className="space-y-4">
          {sortedActivities.map((activity) => {
            const isStatusChange = activity.activity_type === 'status_change' || activity.activity_type === 'status_changed'
            const isInternal = activity.is_internal || activity.activity_type === 'internal_note'
            const hasContent = activity.content || activity.message
            
            return (
              <div key={activity.id} className="relative flex items-start gap-3">
                {/* Timeline dot with icon */}
                <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center ${
                  isInternal ? 'border-amber-400 text-amber-400' :
                  isStatusChange ? 'border-amber-400 text-amber-400' : 'border-[#825084] text-[#825084]'
                }`}>
                  {getActivityIcon(activity.activity_type)}
                </div>
                
                <div className="flex-1 pb-2">
                  {/* Activity with content - collapsible */}
                  {hasContent ? (
                    <>
                      <button
                        onClick={() => toggleActivity(activity.id)}
                        className="flex items-center gap-2 w-full text-left group flex-wrap"
                      >
                        <svg 
                          className={`w-4 h-4 text-gray-400 transition-transform ${expandedActivities[activity.id] ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">{activity.actor?.name || 'System'}</span>
                        <span className="text-sm text-gray-500">{isInternal ? 'added a note' : 'replied'}</span>
                        {isInternal && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                            Internal
                          </span>
                        )}
                      </button>
                      <p className="text-xs text-[#825084] ml-6 mt-0.5">{activity.created_at}</p>
                      
                      {/* Expandable message bubble */}
                      {expandedActivities[activity.id] && (
                        <div className={`mt-2 ml-6 py-3 px-4 border-l-2 ${isInternal ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-[#825084]'}`}>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.content || activity.message}</p>
                        </div>
                      )}
                    </>
                  ) : isStatusChange ? (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{activity.actor?.name || 'System'}</span>
                        <span className="text-sm text-gray-500">changed the status from</span>
                        {activity.metadata?.old_value && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(activity.metadata.old_value)}`}>
                            {formatStatus(activity.metadata.old_value)}
                          </span>
                        )}
                        <span className="text-sm text-gray-500">to</span>
                        {activity.metadata?.new_value && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(activity.metadata.new_value)}`}>
                            {formatStatus(activity.metadata.new_value)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#825084] mt-0.5">{activity.created_at}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{activity.actor?.name || 'System'}</span>
                        <span className="text-sm text-gray-500">{activity.description}</span>
                      </div>
                      <p className="text-xs text-[#825084] mt-0.5">{activity.created_at}</p>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
