import React from 'react'
import { Head } from '@inertiajs/react'
import AuthLayout from '../components/AuthLayout'

export default function RegistrationSuccess({ email, workspace_name, subdomain, login_url }) {
  const handleLoginRedirect = () => {
    window.location.href = login_url || '/login/'
  }

  return (
    <AuthLayout
      title="🎉 Welcome to ImaraDesk!"
      subtitle="Your workspace has been created successfully. Start managing your support tickets with ease."
      features={[
        'Check your email for login credentials',
        'Sign in to access your workspace',
        'Start managing your tickets immediately'
      ]}
    >
      <Head title="Registration Successful" />
      
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Registration Successful
        </h1>
        <p className="text-lg text-gray-600">
          Your account is ready to use
        </p>
      </div>

          {/* Success Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Account Created</p>
                <p className="text-sm text-gray-600">{email}</p>
              </div>
            </div>

            {workspace_name && (
              <>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Workspace Ready</p>
                    <p className="text-sm text-gray-600">{workspace_name}</p>
                  </div>
                </div>

                {subdomain && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Your Workspace URL</p>
                      <p className="text-sm text-blue-600 font-mono break-all">{login_url?.replace('/login/', '') || `${subdomain}.localhost:8000`}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Credentials sent</p>
                <p className="text-xs text-gray-500 mt-1">You can change this after logging in</p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Next Steps</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Check your email for login credentials</li>
                  <li>• Sign in to access your workspace</li>
                  <li>• Start managing your tickets!</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleLoginRedirect}
            className="w-full bg-[#4a154b] text-white py-3 rounded-lg font-semibold hover:bg-[#5a235c] transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            {subdomain ? `Login to ${subdomain} workspace` : 'Go to Login'}
          </button>

          {subdomain && login_url && (
            <p className="text-center text-xs text-gray-500 mt-3">
              You'll be redirected to {login_url.replace('/login/', '')}
            </p>
          )}

          {/* Footer Note */}
          <p className="text-center text-xs text-gray-500 mt-6">
            Need help? Contact our support team
          </p>
    </AuthLayout>
  )
}
