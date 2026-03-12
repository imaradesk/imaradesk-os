/**
 * CSRF Token Utilities for Django
 * Use these helpers for all non-Inertia HTTP requests (fetch, custom APIs, etc.)
 */

/**
 * Get CSRF token from cookie
 * Django stores the CSRF token in a cookie named 'csrftoken'
 */
export function getCsrfToken() {
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

/**
 * Wrapper around fetch that automatically includes CSRF token
 * Use this instead of regular fetch for POST/PUT/PATCH/DELETE requests
 * 
 * @example
 * await csrfFetch('/api/tickets/', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 *   headers: { 'Content-Type': 'application/json' }
 * })
 */
export async function csrfFetch(url, options = {}) {
  const token = getCsrfToken()
  const headers = {
    ...(options.headers || {}),
  }
  
  // Add CSRF token for unsafe methods
  if (token && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase())) {
    headers['X-CSRFToken'] = token
  }
  
  // Add X-Requested-With header to identify AJAX requests
  headers['X-Requested-With'] = 'XMLHttpRequest'
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin', // Include cookies in the request
  })
}

/**
 * Get CSRF headers object for manual use
 * Useful when you need to pass headers to third-party libraries
 */
export function getCsrfHeaders() {
  const token = getCsrfToken()
  return {
    'X-CSRFToken': token || '',
    'X-Requested-With': 'XMLHttpRequest',
  }
}
