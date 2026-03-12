import React, { useState } from 'react'
import { Link } from '@inertiajs/react'

export default function SettingsSidenav({ activeSection = 'general' }) {
  const [teamExpanded, setTeamExpanded] = useState(activeSection?.startsWith('team'))
  const [emailsExpanded, setEmailsExpanded] = useState(activeSection?.startsWith('emails'))
  const [slaExpanded, setSlaExpanded] = useState(activeSection?.startsWith('sla'))

  const sections = [
    { id: 'general', label: 'General', href: '/settings/', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'notifications', label: 'Notifications', href: '/settings/notifications/', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'security', label: 'Security', href: '/settings/security/', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { id: 'marketplace', label: 'Modules', href: '/settings/marketplace/', icon: 'M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z' },
    { id: 'views', label: 'Views', href: '/settings/views/', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
  ]

  const teamSections = [
    { id: 'team-users', label: 'Users', href: '/settings/team/users/', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
    { id: 'team-roles', label: 'Roles', href: '/settings/team/roles/', icon: 'M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z' },
    { id: 'team-groups', label: 'Groups', href: '/settings/team/groups/', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
    { id: 'team-import', label: 'Import', href: '/settings/team/import/', icon: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z' },
  ]

  const emailsSections = [
    { id: 'emails-templates', label: 'Templates', href: '/settings/emails/templates/', icon: 'M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z' },
  ]

  const slaSections = [
    { id: 'sla-policies', label: 'SLA Policies', href: '/settings/sla/policies/', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ]

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h2 className="text-gray-800 font-semibold">Settings</h2>
      </div>

      <nav className="p-2 flex-1 overflow-y-auto">
        {sections.map((section) => (
          <Link
            key={section.id}
            href={section.href}
            className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
              activeSection === section.id 
                ? 'bg-[#4a154b]/10 text-[#4a154b] font-medium' 
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d={section.icon} />
            </svg>
            <span className="truncate">{section.label}</span>
          </Link>
        ))}

        {/* Team Section with Submenu */}
        <div className="mt-2">
          <button
            onClick={() => setTeamExpanded(!teamExpanded)}
            className="w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <span className="truncate">Team</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={`w-4 h-4 transition-transform ${
              teamExpanded ? 'rotate-90' : ''
            }`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          {teamExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {teamSections.map((section) => (
                <Link
                  key={section.id}
                  href={section.href}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                    activeSection === section.id 
                      ? 'bg-[#4a154b]/10 text-[#4a154b] font-medium' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d={section.icon} />
                  </svg>
                  <span className="truncate">{section.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Emails Section with Submenu */}
        <div>
          <button
            onClick={() => setEmailsExpanded(!emailsExpanded)}
            className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection?.startsWith('emails') 
                ? 'bg-[#4a154b]/10 text-[#4a154b]' 
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="truncate">Emails</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={`w-4 h-4 transition-transform ${
              emailsExpanded ? 'rotate-90' : ''
            }`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          {emailsExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {emailsSections.map((section) => (
                <Link
                  key={section.id}
                  href={section.href}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                    activeSection === section.id 
                      ? 'bg-[#4a154b]/10 text-[#4a154b] font-medium' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d={section.icon} />
                  </svg>
                  <span className="truncate">{section.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* SLA Section with Submenu */}
        <div>
          <button
            onClick={() => setSlaExpanded(!slaExpanded)}
            className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection?.startsWith('sla') 
                ? 'bg-[#4a154b]/10 text-[#4a154b]' 
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">SLA</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={`w-4 h-4 transition-transform ${
              slaExpanded ? 'rotate-90' : ''
            }`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          {slaExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {slaSections.map((section) => (
                <Link
                  key={section.id}
                  href={section.href}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                    activeSection === section.id 
                      ? 'bg-[#4a154b]/10 text-[#4a154b] font-medium' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d={section.icon} />
                  </svg>
                  <span className="truncate">{section.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}
