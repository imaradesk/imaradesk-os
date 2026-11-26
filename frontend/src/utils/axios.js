/**
 * Axios instance configured for Django + Inertia.js
 * Automatically handles CSRF tokens for all unsafe HTTP methods
 * Includes session expiration detection
 */
import axios from 'axios'
import { getCsrfToken } from './csrf'

// Redirect to login when session expires (no modal dialog)
const redirectToLoginIfNotOnAuthRoute = () => {
  const currentPath = window.location.pathname
  const authRoutes = ['/login/', '/logout/', '/onboarding/', '/forgot-password/', '/reset-password/', '/invite/', '/auth/']
  
  // Don't redirect if already on an auth route
  if (authRoutes.some(route => currentPath.startsWith(route))) {
    return
  }
  
  // Hard redirect to login page (full page reload clears all state)
  window.location.href = '/login/'
}

// Create axios instance
const api = axios.create({
  baseURL: '',
  withCredentials: true, // Include cookies in requests
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  },
})

/**
 * Check if the response indicates a session expiration (redirect to login)
 * Django redirects to /login/ when session expires, but axios follows the redirect
 * automatically, so we detect this by checking the response URL or content
 */
const isSessionExpiredResponse = (response) => {
  // Check if we were redirected to the login page
  // response.request.responseURL contains the final URL after redirects
  const responseURL = response.request?.responseURL || ''
  if (responseURL.includes('/login/')) {
    return true
  }

  // Check if the response is HTML (login page) instead of expected JSON
  // This happens when session expires and Django returns the login page
  const contentType = response.headers?.['content-type'] || ''
  if (contentType.includes('text/html')) {
    // Check if it looks like a login page redirect
    const data = response.data
    if (typeof data === 'string' && (data.includes('/login/') || data.includes('login'))) {
      return true
    }
  }

  return false
}

// Request interceptor to add CSRF token
api.interceptors.request.use(
  (config) => {
    // File uploads: never force the JSON Content-Type on a FormData body.
    // With `Content-Type: application/json` axios serializes FormData to JSON
    // (defaults/index.js: `isFormData -> JSON.stringify(formDataToJSON(data))`),
    // so the server receives no files ("No file provided"). Dropping the header
    // lets axios send multipart and the browser append the boundary.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers && typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type')
      } else if (config.headers) {
        delete config.headers['Content-Type']
        delete config.headers['content-type']
      }
    }

    const unsafeMethods = ['post', 'put', 'patch', 'delete']
    
    if (unsafeMethods.includes(config.method?.toLowerCase())) {
      const token = getCsrfToken()
      if (token) {
        config.headers['X-CSRFToken'] = token
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Auth routes list
const AUTH_ROUTES = ['/login/', '/logout/', '/onboarding/', '/forgot-password/', '/reset-password/', '/invite/', '/auth/']

// Check if a URL is an auth route
const isAuthRoute = (url = '') => {
  const currentPath = window.location.pathname
  const requestPath = url.split('?')[0]
  return AUTH_ROUTES.some(route => currentPath.startsWith(route) || requestPath.startsWith(route))
}

// Response interceptor for error handling and session detection
api.interceptors.response.use(
  (response) => {
    // Check for session expiration on successful responses
    // (302 redirect is followed automatically, resulting in 200 from login page)
    const requestUrl = response.config?.url || ''
    const responseURL = response.request?.responseURL || ''
    
    // Skip if request or response is to an auth route
    if (isAuthRoute(requestUrl) || isAuthRoute(responseURL)) {
      return response
    }
    
    if (isSessionExpiredResponse(response)) {
      console.warn('Session expired - redirecting to login')
      redirectToLoginIfNotOnAuthRoute()
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
    if (isAuthRoute(requestUrl) || isAuthRoute(responseURL)) {
      return Promise.reject(error)
    }
    
    // Handle 403 CSRF errors
    if (error.response?.status === 403) {
      const detail = error.response?.data?.detail || ''
      if (detail.includes('CSRF')) {
        console.error('CSRF token error. Please refresh the page.')
      }
    }
    
    // Handle 401 Unauthorized - session expired
    if (error.response?.status === 401) {
      console.warn('Session expired (401) - redirecting to login')
      redirectToLoginIfNotOnAuthRoute()
      return Promise.reject({
        isSessionExpired: true,
        message: 'Session expired. Please log in again.',
        originalError: error,
      })
    }

    // Handle 302 redirect to login (if not automatically followed)
    if (error.response?.status === 302) {
      const location = error.response.headers?.location || ''
      if (location.includes('/login/')) {
        console.warn('Session expired (302) - redirecting to login')
        redirectToLoginIfNotOnAuthRoute()
        return Promise.reject({
          isSessionExpired: true,
          message: 'Session expired. Please log in again.',
          originalError: error,
        })
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
