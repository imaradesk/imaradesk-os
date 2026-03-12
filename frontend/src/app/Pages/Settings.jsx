import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import { THEME } from '../constants/theme'
import {
  GeneralSettings,
  NotificationsSettings,
  SecuritySettings,
} from '../components/settings'

export default function Settings({ activeSection = 'general', users = [], pagination = {}, orgs = [], roles = [], groups = [], permissions = {}, business = {}, businessHours = null }) {
  const [sidenavOpen, setSidenavOpen] = useState(true)

  const sections = [
    { id: 'general', label: 'General', href: '/settings/', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'notifications', label: 'Notifications', href: '/settings/notifications/', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'security', label: 'Security', href: '/settings/security/', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  ]

  // Get current section label
  const currentSection = sections.find(s => s.id === activeSection)
  const pageTitle = currentSection ? currentSection.label : 'Settings'

  return (
    <>
      <Head title="Settings" />
      <AppShell active="settings">
        {/* Content row: Settings sidenav + main content */}
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {/* Settings Sidebar */}
          {sidenavOpen && <SettingsSidenav activeSection={activeSection} />}

          {/* Main Content */}
          <main className="flex-1 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
              {!sidenavOpen && (
                <button
                  className="p-2 rounded-md hover:bg-gray-100"
                  title="Show Settings Menu"
                  onClick={() => setSidenavOpen(true)}
                  aria-expanded={sidenavOpen}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-500">
                    <path d="M13.5 6 21 12l-7.5 6v-4.5H3v-3h10.5V6z"/>
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-semibold text-gray-800">{pageTitle}</h1>
            </div>

            <div className="p-6">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-6">
                  {activeSection === 'general' && (
                    <GeneralSettings business={business} />
                  )}

                  {activeSection === 'notifications' && (
                    <NotificationsSettings />
                  )}

                  {activeSection === 'security' && (
                    <SecuritySettings />
                  )}

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button className={`${THEME.button.primary} px-4 py-2 rounded-lg`}>
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </AppShell>
    </>
  )
}
