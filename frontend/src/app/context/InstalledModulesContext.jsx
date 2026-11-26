import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { router } from '@inertiajs/react'

/**
 * InstalledModulesContext
 * 
 * Provides global access to installed/active modules throughout the app.
 * Use this to conditionally show/hide features based on installed modules.
 * 
 * Usage:
 *   const { isModuleInstalled, modules } = useInstalledModules()
 *   
 *   // Check if a specific module is installed
 *   if (isModuleInstalled('kb')) { ... }
 *   
 *   // Get all modules status
 *   const { tasks, kb, email_to_ticket, customer_portal } = modules
 */

const InstalledModulesContext = createContext({
  modules: { tickets: true },
  isModuleInstalled: () => false,
  isModuleActive: () => false,
})

/**
 * Provider component - wraps the app and holds module state
 * Uses router events to sync with page props
 */
export function InstalledModulesProvider({ children, initialModules = {} }) {
  const [modulesData, setModulesData] = useState(initialModules)
  
  // Listen to Inertia navigation events to update modules data
  useEffect(() => {
    // Update modules when page changes
    const handleNavigate = (event) => {
      const pageProps = event.detail?.page?.props || {}
      const newModulesData = pageProps.installedModules || pageProps.installed_modules
      if (newModulesData) {
        setModulesData(newModulesData)
      }
    }
    
    // Listen to Inertia navigate event
    document.addEventListener('inertia:navigate', handleNavigate)
    
    // Also check initial page on mount (in case router.page is available)
    if (router.page?.props) {
      const pageProps = router.page.props
      const initialData = pageProps.installedModules || pageProps.installed_modules
      if (initialData && Object.keys(initialData).length > 0) {
        setModulesData(initialData)
      }
    }
    
    return () => {
      document.removeEventListener('inertia:navigate', handleNavigate)
    }
  }, [])
  
  // Normalize module status. If the server shares no module map at all, the
  // features that ship with this edition are treated as installed.
  const modules = useMemo(() => {
    const shared = Object.keys(modulesData).length > 0
    const on = (...keys) => (shared ? keys.some((key) => Boolean(modulesData[key])) : true)
    return {
      tickets: true,
      tasks: on('tasks'),
      kb: on('kb', 'knowledge_base'),
      email_to_ticket: on('email_to_ticket'),
      customer_portal: on('customer_portal'),
    }
  }, [modulesData])
  
  /**
   * Check if a module is installed and active
   * @param {string} moduleId - The module identifier (e.g., 'tasks', 'kb')
   * @returns {boolean}
   */
  const isModuleInstalled = (moduleId) => {
    if (!moduleId) return false
    
    // Normalize module ID
    const normalizedId = moduleId.toLowerCase().replace(/-/g, '_')
    
    // Handle aliases
    const aliases = {
      'knowledge_base': 'kb',
      'knowledgebase': 'kb',
      'knowledge-base': 'kb',
      'task': 'tasks',
      'email': 'email_to_ticket',
      'portal': 'customer_portal',
    }
    
    const id = aliases[normalizedId] || normalizedId
    return Boolean(modules[id])
  }
  
  /**
   * Alias for isModuleInstalled - checks if module is active
   * @param {string} moduleId 
   * @returns {boolean}
   */
  const isModuleActive = isModuleInstalled
  
  const value = useMemo(() => ({
    modules,
    isModuleInstalled,
    isModuleActive,
  }), [modules])
  
  return (
    <InstalledModulesContext.Provider value={value}>
      {children}
    </InstalledModulesContext.Provider>
  )
}

/**
 * Hook to access installed modules context
 * @returns {{ modules: object, isModuleInstalled: function, isModuleActive: function }}
 */
export function useInstalledModules() {
  const context = useContext(InstalledModulesContext)
  if (!context) {
    console.warn('useInstalledModules must be used within InstalledModulesProvider')
    return {
      modules: { tickets: true },
      isModuleInstalled: () => false,
      isModuleActive: () => false,
    }
  }
  return context
}

/**
 * HOC to wrap components that need module access
 */
export function withInstalledModules(Component) {
  return function WrappedComponent(props) {
    const moduleContext = useInstalledModules()
    return <Component {...props} {...moduleContext} />
  }
}

/**
 * Component that only renders children if a module is installed
 * 
 * Usage:
 *   <ModuleGate module="tasks">
 *     <TasksPage />
 *   </ModuleGate>
 */
export function ModuleGate({ module, children, fallback = null }) {
  const { isModuleInstalled } = useInstalledModules()
  
  if (!isModuleInstalled(module)) {
    return fallback
  }
  
  return children
}

export default InstalledModulesContext
