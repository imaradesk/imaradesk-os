import React from 'react'
import { ThemeProvider, useTheme } from './ThemeContext'

function AuthFrame({ children }) {
  const { isDark } = useTheme()
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'app-dark bg-[#0c0f12]' : 'bg-gray-50'}`}>
      <div className="w-full max-w-sm">
        {/* Form card */}
        <div className={`bg-white/70 backdrop-blur-md border rounded-xl p-8 shadow-card ${isDark ? 'border-white/10' : 'border-gray-100/80'}`}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function AuthLayout({ children }) {
  return (
    <ThemeProvider>
      <AuthFrame>{children}</AuthFrame>
    </ThemeProvider>
  )
}
