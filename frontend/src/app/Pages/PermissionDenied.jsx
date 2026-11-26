import React from 'react'
import { Head, Link } from '@inertiajs/react'
import AppShell from '../components/AppShell'

export default function PermissionDenied({ message = 'Permission Denied', description = '', return_url = '/' }) {
  return (
    <>
      <Head title="Permission Denied" />
      <AppShell>
        <div className="flex-1 bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-xl overflow-hidden">
            {/* Content */}
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{message}</h2>
                <p className="text-gray-600">
                  {description || 'You do not have the required permissions to access this page. Please contact your administrator if you believe this is an error.'}
                </p>
              </div>
              
              {/* Info Card */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">Access Restricted</p>
                    <p className="text-sm text-red-700 mt-1">
                      This area requires administrator privileges. If you need access, please contact your system administrator.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/"
                  className="flex-1 text-center px-6 py-3 rounded-lg font-medium bg-[#0B3D26] text-white hover:bg-[#082C1B]"
                >
                  <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Go to Dashboard
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
                Need help? Contact your system administrator for assistance.
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  )
}
