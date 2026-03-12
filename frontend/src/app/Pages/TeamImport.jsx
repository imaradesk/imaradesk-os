import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import { THEME } from '../constants/theme'

export default function TeamImport() {
  const [sidenavOpen, setSidenavOpen] = useState(true)

  return (
    <>
      <Head title="Team - Import" />
      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="team-import" />}

          <main className="flex-1 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
              {!sidenavOpen && (
                <button
                  className="p-2 rounded-md hover:bg-gray-100"
                  title="Show Settings Menu"
                  onClick={() => setSidenavOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-500">
                    <path d="M13.5 6 21 12l-7.5 6v-4.5H3v-3h10.5V6z"/>
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-semibold text-gray-800">Import</h1>
            </div>

            <div className="p-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Import Users</h3>
                    <p className="text-sm text-gray-600 mb-4">Upload a CSV file to bulk import users into your team.</p>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500">CSV file up to 10MB</p>
                      <button className={`mt-4 ${THEME.button.primary} px-4 py-2 rounded-lg text-sm`}>
                        Choose File
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">CSV Format</h4>
                    <p className="text-xs text-gray-500 mb-3">Your CSV should include the following columns:</p>
                    <code className="block text-xs bg-gray-100 p-3 rounded border border-gray-200">
                      name,email,role,organization
                    </code>
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
