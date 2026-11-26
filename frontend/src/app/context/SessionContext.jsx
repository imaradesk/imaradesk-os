import React, { createContext, useContext } from 'react'

const SessionContext = createContext(null)

// Redirect to login page immediately when session expires
export const redirectToLogin = () => {
  const currentPath = window.location.pathname
  const authRoutes = ['/login/', '/logout/', '/onboarding/', '/forgot-password/', '/reset-password/', '/invite/', '/auth/']

  // Don't redirect if already on an auth route.
  if (authRoutes.some(route => currentPath.startsWith(route))) {
    return
  }

  // Hard redirect to login page (clears all React state)
  window.location.href = '/login/'
}

export function SessionProvider({ children }) {
  return (
    <SessionContext.Provider value={{ redirectToLogin }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}


export default SessionProvider

