import React from 'react'
import { Toaster, ToastBar } from 'react-hot-toast'

const SUCCESS_BG = '#0B3D26'
const ERROR_BG = '#DC2626'
const NEUTRAL_BG = '#1F2937'

const base = {
  color: '#fff',
  borderRadius: '18px',
  padding: '10px 14px',
  fontSize: '14px',
  fontWeight: 500,
  lineHeight: '1.4',
  maxWidth: '440px',
  boxShadow: '0 10px 30px -8px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.12)',
}

/** App-wide toasts: bottom center, rounded, green for success, red for errors. */
export default function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      gutter={10}
      containerStyle={{ bottom: 24 }}
      toastOptions={{
        duration: 4000,
        style: { ...base, background: NEUTRAL_BG },
        success: {
          duration: 3000,
          style: { ...base, background: SUCCESS_BG },
          iconTheme: { primary: '#fff', secondary: SUCCESS_BG },
        },
        error: {
          style: { ...base, background: ERROR_BG },
          iconTheme: { primary: '#fff', secondary: ERROR_BG },
        },
        loading: {
          iconTheme: { primary: '#fff', secondary: 'rgba(255,255,255,.25)' },
        },
      }}
    >
      {(t) => (
        <ToastBar
          toast={t}
          style={{ ...t.style, animation: t.visible ? 'toastIn .32s cubic-bezier(.21,1.02,.73,1) forwards' : 'toastOut .22s cubic-bezier(.4,0,1,1) forwards' }}
        />
      )}
    </Toaster>
  )
}
