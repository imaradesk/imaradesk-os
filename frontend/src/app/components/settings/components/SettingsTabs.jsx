import React from 'react'
import Tabs from '../../Tabs'

// Icon components
const AuditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
)

const SecurityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
  </svg>
)

const DEFAULT_TABS = [
  { id: 'audit', label: 'Audit Logs', icon: <AuditIcon /> },
  { id: 'security', label: 'Security & Devices', icon: <SecurityIcon /> },
]

export default function SettingsTabs({ 
  tabs = DEFAULT_TABS, 
  activeTab, 
  onTabChange, 
  children 
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Tab Headers */}
      <div className="border-b border-gray-200 px-4 py-2">
        <Tabs label="Settings sections" active={activeTab} onChange={onTabChange} tabs={tabs} />
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

// Export icons for reuse
export { AuditIcon, SecurityIcon }
