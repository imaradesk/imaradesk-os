import React, { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createInertiaApp, router } from '@inertiajs/react'
import { TimezoneProvider } from './app/context/TimezoneContext'
import { SessionProvider } from './app/context/SessionContext'
import { InstalledModulesProvider } from './app/context/InstalledModulesContext'
import { UnsavedChangesProvider } from './app/context/UnsavedChangesContext'
import PageLoader from './app/components/PageLoader'
import AppToaster from './app/components/AppToaster'
import './index.css'

// Function to get CSRF token from cookie (Django's default method)
const getCsrfTokenFromCookie = () => {
  const name = 'csrftoken'
  let cookieValue = null
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';')
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim()
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
        break
      }
    }
  }
  return cookieValue
}

// Expose CSRF token getter globally for legacy code
window.csrfToken = getCsrfTokenFromCookie()
Object.defineProperty(window, 'csrfToken', {
  get: getCsrfTokenFromCookie
})

// Configure Axios (used by Inertia) to always send CSRF token from cookie
import axios from 'axios'


axios.defaults.xsrfHeaderName = "X-CSRFToken"
axios.defaults.xsrfCookieName = "csrftoken"
axios.defaults.withCredentials = true
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'

// Auth routes that should not trigger session expired
const AUTH_ROUTES = [
  '/login/',
  '/logout/',
  '/onboarding/',
  '/forgot-password/',
  '/reset-password/',
  '/invite/',
  '/auth/',
]

// Check if current page or request is an auth route
const isAuthRoute = (url = '') => {
  const currentPath = window.location.pathname
  const requestPath = url.split('?')[0]
  return AUTH_ROUTES.some(route => 
    currentPath.startsWith(route) || requestPath.startsWith(route)
  )
}

// Check if the response indicates a session expiration
const isSessionExpiredResponse = (response) => {
  const responseURL = response.request?.responseURL || ''
  if (responseURL.includes('/login/')) {
    return true
  }
  const contentType = response.headers?.['content-type'] || ''
  if (contentType.includes('text/html')) {
    const data = response.data
    if (typeof data === 'string' && (data.includes('/login/') || data.includes('login'))) {
      return true
    }
  }
  return false
}

// Intercept all axios requests to ensure CSRF token is always sent
axios.interceptors.request.use(config => {
  const token = getCsrfTokenFromCookie()
  if (token) {
    config.headers['X-CSRFToken'] = token
  }
  return config
}, error => {
  return Promise.reject(error)
})

// Response interceptor to detect session expiration
axios.interceptors.response.use(
  (response) => {
    const requestUrl = response.config?.url || ''
    const responseURL = response.request?.responseURL || ''
    
    // Skip session expiration handling for auth routes
    // Check BOTH the request URL AND the response URL (handles redirects to login)
    // When a non-authenticated user requests a protected page, Django redirects to /login/
    // The response URL will contain /login/ but this is a normal auth flow, NOT session expiry
    const isRequestToAuthRoute = isAuthRoute(requestUrl)
    const isResponseToAuthRoute = isAuthRoute(responseURL)
    const isAuthRedirect = isSessionExpiredResponse(response)
    
    // Session expired - redirect to login immediately (no modal dialog)
    if (!isRequestToAuthRoute && !isResponseToAuthRoute && isAuthRedirect) {
      console.warn('Session expired - redirecting to login')
      window.location.href = '/login/'
      return Promise.reject({
        isSessionExpired: true,
        message: 'Session expired. Please log in again.',
        originalResponse: response,
      })
    }
    return response
  },
  (error) => {
    const requestUrl = error.config?.url || ''
    const responseURL = error.response?.request?.responseURL || ''
    
    // Skip session expiration handling for auth routes
    // Check BOTH request URL and response URL (handles redirects to login)
    if (isAuthRoute(requestUrl) || isAuthRoute(responseURL)) {
      return Promise.reject(error)
    }
    
    if (error.response?.status === 401) {
      console.warn('Session expired (401) - redirecting to login')
      window.location.href = '/login/'
      return Promise.reject({
        isSessionExpired: true,
        message: 'Session expired. Please log in again.',
        originalError: error,
      })
    }
    return Promise.reject(error)
  }
)

createInertiaApp({
  resolve: name => {
    const pages = import.meta.glob('./app/Pages/**/*.jsx', { eager: true })
    return pages[`./app/Pages/${name}.jsx`]
  },
  setup({ el, App, props }) {
    // Extract initial modules data from props if available
    const initialModules = props.initialPage?.props?.installedModules || {}
    
    createRoot(el).render(
      <UnsavedChangesProvider>
        <SessionProvider>
        <InstalledModulesProvider initialModules={initialModules}>
          <TimezoneProvider>
            <Suspense fallback={<PageLoader />}>
              <App {...props} />
            </Suspense>
            <AppToaster />
          </TimezoneProvider>
        </InstalledModulesProvider>
        </SessionProvider>
      </UnsavedChangesProvider>
    )
  },
  progress: {
    color: '#4B5563',
  },
})

// Update CSRF token on each page navigation
router.on('navigate', () => {
  const newToken = getCsrfTokenFromCookie()
  if (newToken) {
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    if (metaTag) {
      metaTag.content = newToken
    }
  }
})

