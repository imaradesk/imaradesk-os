import React from 'react'
import { THEME } from '../../constants/theme'

export default function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Two-Factor Authentication</h3>
        <button className={`${THEME.button.primary} px-4 py-2 rounded-lg`}>Enable 2FA</button>
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Active Sessions</h3>
        <div className="text-sm text-gray-600">1 active session</div>
      </div>
    </div>
  )
}
