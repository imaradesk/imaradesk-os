import React from 'react'
import Avatar from './Avatar'

// Theme colors
const COLORS = {
  primary: '#4a154b',
  primaryLight: '#825084',
  secondary: '#f3f4f6',
}

export default function ActivityTimeline({ activities = [] }) {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'comment':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case 'status_change':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'assignment':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      case 'attachment':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }
  
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No activity yet
      </div>
    )
  }
  
  return (
    <div className="relative">
      {/* Dotted Timeline line */}
      <div 
        className="absolute left-5 top-0 bottom-0 w-0.5" 
        style={{ 
          backgroundImage: `repeating-linear-gradient(to bottom, ${COLORS.primaryLight} 0, ${COLORS.primaryLight} 6px, transparent 6px, transparent 12px)` 
        }}
      />
      
      <div className="space-y-6">
        {activities.map((activity, index) => (
          <div key={activity.id} className="relative flex items-start gap-4">
            {/* Timeline dot */}
            <div 
              className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md text-white"
              style={{ backgroundColor: COLORS.primary }}
            >
              {getActivityIcon(activity.activity_type)}
            </div>
            
            {/* Activity content bubble with pointing edge */}
            <div className="max-w-[85%] flex-1">
              <div 
                className="relative rounded-2xl rounded-tl-sm p-4 shadow-sm"
                style={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderLeft: `3px solid ${COLORS.primaryLight}`
                }}
              >
                {/* Pointing edge - matches bubble bg */}
                <div 
                  className="absolute -left-[10px] top-4 w-0 h-0"
                  style={{
                    borderTop: '8px solid transparent',
                    borderBottom: '8px solid transparent',
                    borderRight: `10px solid #320a32`
                  }}
                />
                
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={activity.actor?.name} size="sm" />
                  <span className="text-sm font-medium text-gray-900">
                    {activity.actor?.name || 'System'}
                  </span>
                  <span className="text-xs text-gray-500">{activity.created_at}</span>
                </div>
                <p className="text-sm text-gray-700">{activity.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
