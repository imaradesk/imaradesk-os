import React from 'react'
import { createRoot } from 'react-dom/client'
import { createInertiaApp, router } from '@inertiajs/react'
import { Toaster } from 'react-hot-toast'
import { TimezoneProvider } from './app/context/TimezoneContext'
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

createInertiaApp({
  resolve: name => {
    // Load pages from app directory
    const appPages = import.meta.glob('./app/Pages/**/*.jsx', { eager: true })
    return appPages[`./app/Pages/${name}.jsx`]
  },
  setup({ el, App, props }) {
    createRoot(el).render(
      <TimezoneProvider>
        <App {...props} />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4a154b',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </TimezoneProvider>
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




// import React from 'react'
// import { createRoot } from 'react-dom/client'
// import { createInertiaApp } from '@inertiajs/react'
// import { Toaster } from 'react-hot-toast'
// import axios from 'axios'
// import './index.css'

// /* ---------------- CSRF HANDLING (FIXED) ---------------- */

// /* Always read latest Django CSRF token from cookie */
// function getCsrfTokenFromCookie(){
//   return document.cookie
//     .split('; ')
//     .find(row => row.startsWith('csrftoken='))
//     ?.split('=')[1]
// }

// /* REQUIRED for Django session authentication */
// axios.defaults.withCredentials = true

// /* Good practice for Django */
// axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'

// /* Inject fresh token into EVERY request */
// axios.interceptors.request.use(config => {
//   const token = getCsrfTokenFromCookie()

//   if (token) {
//     config.headers['X-CSRFToken'] = token
//   }

//   return config
// })

// /* Optional legacy compatibility (safe to keep if needed) */
// Object.defineProperty(window, 'csrfToken', {
//   get: getCsrfTokenFromCookie
// })

// /* ---------------- INERTIA SETUP ---------------- */

// createInertiaApp({
//   resolve: name => {
//     const sitePages = import.meta.glob('./site/Pages/**/*.jsx', { eager: true })
//     const appPages = import.meta.glob('./app/Pages/**/*.jsx', { eager: true })

//     return (
//       sitePages[`./site/Pages/${name}.jsx`] ||
//       appPages[`./app/Pages/${name}.jsx`]
//     )
//   },

//   setup({ el, App, props }) {
//     createRoot(el).render(
//       <>
//         <App {...props} />

//         <Toaster
//           position="top-right"
//           toastOptions={{
//             duration: 4000,
//             style: {
//               background: '#363636',
//               color: '#fff',
//             },
//             success: {
//               duration: 3000,
//             },
//             error: {
//               duration: 4000,
//             },
//           }}
//         />
//       </>
//     )
//   },

//   progress: {
//     color: '#4B5563',
//   },
// })