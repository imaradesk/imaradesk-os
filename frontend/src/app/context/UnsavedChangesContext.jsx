import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import ConfirmDialog from '../components/ConfirmDialog'
import { ThemeProvider } from '../components/ThemeContext'

const UnsavedChangesContext = createContext(null)

/**
 * App-wide guard for forms with unsaved input.
 *
 * Pages call useUnsavedChanges(dirty) and use the returned guard() around
 * custom close/cancel handlers. Browser back, Inertia navigation and native
 * unload are intercepted while at least one form is dirty.
 */
export function UnsavedChangesProvider({ children }) {
  const dirtySources = useRef(new Map())
  const [, bumpVersion] = useState(0)
  const dirty = dirtySources.current.size > 0
  const [pending, setPending] = useState(null)
  const bypassRef = useRef(false)
  const locationRef = useRef({ href: window.location.href, state: window.history.state })

  const register = useCallback((id) => {
    dirtySources.current.set(id, true)
    bumpVersion((v) => v + 1)
    return () => {
      if (dirtySources.current.delete(id)) bumpVersion((v) => v + 1)
    }
  }, [])

  useEffect(() => {
    if (!dirty) {
      setPending(null)
      return undefined
    }

    locationRef.current = { href: window.location.href, state: window.history.state }

    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }

    const offInertia = router.on('before', (event) => {
      const visit = event.detail.visit
      if (bypassRef.current || visit.method !== 'get') return
      // Refreshing the current page (router.reload after saving a comment,
      // toggling a field, etc.) is not navigation. Let it through so the
      // server-rendered props update without an unsaved-changes prompt.
      try {
        const next = new URL(visit.url, window.location.href)
        const current = new URL(window.location.href)
        if (next.pathname === current.pathname && next.search === current.search) return
      } catch (e) { /* fall through to the guard */ }
      event.preventDefault()
      setPending({ kind: 'visit', visit })
      return false
    })

    // Capture before Inertia's own popstate listener so a back gesture cannot
    // swap the page out from under an unfinished form.
    const onPopState = (event) => {
      if (bypassRef.current) {
        bypassRef.current = false
        return
      }
      if (dirtySources.current.size === 0) return
      event.stopImmediatePropagation()
      window.history.pushState(locationRef.current.state, '', locationRef.current.href)
      setPending({ kind: 'pop' })
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('popstate', onPopState, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('popstate', onPopState, true)
      offInertia()
    }
  }, [dirty])

  const guard = useCallback((action) => {
    if (dirtySources.current.size === 0) {
      action()
      return
    }
    setPending({ kind: 'action', action })
  }, [])

  // Let a successful save navigate away without prompting.
  const allowNextNavigation = useCallback(() => {
    bypassRef.current = true
    setTimeout(() => { bypassRef.current = false }, 0)
  }, [])

  const confirmDiscard = useCallback(() => {
    const next = pending
    setPending(null)
    if (!next) return

    if (next.kind === 'pop') {
      bypassRef.current = true
      window.history.back()
      return
    }

    bypassRef.current = true
    try {
      if (next.kind === 'visit') {
        const visit = next.visit
        router.visit(visit.url, {
          method: visit.method,
          data: visit.data,
          replace: visit.replace,
          preserveScroll: visit.preserveScroll,
          preserveState: visit.preserveState,
          only: visit.only,
          except: visit.except,
          headers: visit.headers,
          errorBag: visit.errorBag,
          forceFormData: visit.forceFormData,
          queryStringArrayFormat: visit.queryStringArrayFormat,
        })
      } else {
        next.action()
      }
    } finally {
      bypassRef.current = false
    }
  }, [pending])

  const value = useMemo(() => ({ register, guard, allowNextNavigation }), [register, guard, allowNextNavigation])

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      {/* Remount on open so the theme is re-read from storage (this provider sits outside AppShell's) */}
      <ThemeProvider key={pending ? 'open' : 'closed'}>
        <ConfirmDialog
          isOpen={Boolean(pending)}
          onClose={() => setPending(null)}
          onConfirm={confirmDiscard}
          title="Discard unsaved changes?"
          message="You have unsaved data. If you leave now, your changes will be lost."
          confirmText="Leave without saving"
          cancelText="Keep editing"
          confirmStyle="danger"
          zIndex="z-[10000]"
        />
      </ThemeProvider>
    </UnsavedChangesContext.Provider>
  )
}

// Snapshot the first render of a serializable form state.
export function useDirtyState(value) {
  const initial = useRef(value)
  return JSON.stringify(value) !== JSON.stringify(initial.current)
}

export function useUnsavedChanges(when = true) {
  const context = useContext(UnsavedChangesContext)
  const id = useId()
  const whenRef = useRef(when)
  whenRef.current = when

  useEffect(() => {
    if (!when) return undefined
    return context.register(id)
  }, [when, context, id])

  return {
    isDirty: Boolean(when),
    guard: context.guard,
    allowNextNavigation: context.allowNextNavigation,
  }
}
