import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

const THEME_KEY = 'imaradesk-theme'
// Outside a ThemeProvider (e.g. the backoffice) components render light
const ThemeContext = createContext({ theme: 'light', isDark: false, toggleTheme: () => {} })

const systemTheme = () => {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch (e) {
    return 'light'
  }
}

// `fallback` is used when nothing is stored yet: 'dark', 'light' or 'system'
export function readTheme(storageKey = THEME_KEY, fallback = 'dark') {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === 'light' || stored === 'dark') return stored
  } catch (e) { /* storage unavailable */ }
  return fallback === 'system' ? systemTheme() : fallback
}

export function ThemeProvider({ children, storageKey = THEME_KEY, fallback = 'dark' }) {
  const [theme, setTheme] = useState(() => readTheme(storageKey, fallback))

  useEffect(() => {
    try { localStorage.setItem(storageKey, theme) } catch (e) { /* storage unavailable */ }
  }, [storageKey, theme])

  const toggleTheme = useCallback(() => setTheme(current => (current === 'dark' ? 'light' : 'dark')), [])

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
