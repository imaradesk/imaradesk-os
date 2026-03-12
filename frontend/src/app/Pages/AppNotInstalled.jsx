import React from 'react'
import { Head, Link } from '@inertiajs/react'
import AppShell from '../components/AppShell'
import { THEME } from '../constants/theme'

export default function AppNotInstalled({ app = {}, return_url = '/' }) {
  return (
    <>
      <Head title={`${app.name || 'App'} Not Installed`} />
      <AppShell>
        <div className="flex-1 bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-xl overflow-hidden">
            {/* Header */}
          
            
            {/* Content */}
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">App Not Installed</h2>
                <p className="text-gray-600">
                  To access this feature, you need to install the <strong>{app.name}</strong> app from the marketplace.
                </p>
              </div>
              
              {/* App Info Card */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-3">{app.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {app.is_free ? (
                      <span className="text-green-600 font-medium">Free</span>
                    ) : (
                      <>
                        <span className="text-lg font-bold text-gray-900">${app.price}</span>
                        <span className="text-gray-500">/month</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/settings/marketplace/?app=${app.slug}`}
                  className={`flex-1 text-center px-6 py-3 rounded-lg font-medium ${THEME.button.primary}`}
                >
                  <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Go to Modules
                </Link>
                <Link
                  href={return_url}
                  className="flex-1 text-center px-6 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Go Back
                </Link>
              </div>
              
              {/* Help Text */}
              <p className="text-xs text-gray-400 text-center mt-6">
                Need help? Contact us &nbsp; <a target="_blank" href="mailto:info@imaradesk.com" className="text-[#4a154b] hover:underline">Support</a>
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  )

}
