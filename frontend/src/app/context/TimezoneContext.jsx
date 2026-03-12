import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

// Detect user's timezone
const detectUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

// Get initial timezone from localStorage or detect
const getInitialTimezone = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('userTimezone')
    return saved || detectUserTimezone()
  }
  return 'UTC'
}

const TimezoneContext = createContext(null)

export function TimezoneProvider({ children }) {
  const [timezone, setTimezoneState] = useState(getInitialTimezone)

  // Update timezone and persist to localStorage
  const setTimezone = useCallback((tz) => {
    setTimezoneState(tz)
    if (typeof window !== 'undefined') {
      localStorage.setItem('userTimezone', tz)
    }
  }, [])

  // Sync with localStorage changes (e.g., from other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'userTimezone' && e.newValue) {
        setTimezoneState(e.newValue)
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Date formatting functions that use the timezone
  const formatDate = useCallback((dateString, options = {}) => {
    if (!dateString) return ''
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: timezone,
      ...options
    }
    return new Date(dateString).toLocaleDateString('en-US', defaultOptions)
  }, [timezone])

  const formatDateTime = useCallback((dateString, options = {}) => {
    if (!dateString) return ''
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      ...options
    }
    return new Date(dateString).toLocaleDateString('en-US', defaultOptions)
  }, [timezone])

  const formatTime = useCallback((dateString, options = {}) => {
    if (!dateString) return ''
    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      ...options
    }
    return new Date(dateString).toLocaleTimeString('en-US', defaultOptions)
  }, [timezone])

  const formatShortDate = useCallback((dateString, options = {}) => {
    if (!dateString) return ''
    const defaultOptions = {
      month: 'short',
      day: 'numeric',
      timeZone: timezone,
      ...options
    }
    return new Date(dateString).toLocaleDateString('en-US', defaultOptions)
  }, [timezone])

  const formatShortDateTime = useCallback((dateString, options = {}) => {
    if (!dateString) return ''
    const defaultOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      ...options
    }
    return new Date(dateString).toLocaleDateString('en-US', defaultOptions)
  }, [timezone])

  const formatRelativeTime = useCallback((dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return formatShortDate(dateString)
  }, [formatShortDate])

  const value = {
    timezone,
    setTimezone,
    detectUserTimezone,
    formatDate,
    formatDateTime,
    formatTime,
    formatShortDate,
    formatShortDateTime,
    formatRelativeTime,
  }

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  )
}

export function useTimezone() {
  const context = useContext(TimezoneContext)
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider')
  }
  return context
}

// Export a standalone function for use outside of React components
export function getStoredTimezone() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userTimezone') || detectUserTimezone()
  }
  return 'UTC'
}

export default TimezoneContext
