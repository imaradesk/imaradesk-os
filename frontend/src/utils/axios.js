/**
 * Axios instance configured for Django + Inertia.js
 * Automatically handles CSRF tokens for all unsafe HTTP methods
 */
import axios from 'axios'
import { getCsrfToken } from './csrf'

// Create axios instance
const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add CSRF token
api.interceptors.request.use(
  (config) => {
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 403 CSRF errors
    if (error.response?.status === 403) {
      const detail = error.response?.data?.detail || ''
      if (detail.includes('CSRF')) {
        console.error('CSRF token error. Please refresh the page.')
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
