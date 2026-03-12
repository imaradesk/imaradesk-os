import React from 'react'
import { Head } from '@inertiajs/react'
import AuthLayout from '../components/AuthLayout'

export default function VerificationPending({ email, workspace_name }) {
  return (
    <AuthLayout
      title="📧 Verify Your Email"
      subtitle="We've sent a verification link to your email address. Please check your inbox to activate your workspace."
      features={[
        'Check your email inbox',
        'Click the verification link',
        'Start using your workspace'
      ]}
    >
      <Head title="Verify Your Email" />
      
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Check Your Email
        </h1>
        <p className="text-lg text-gray-600">
          One more step to activate your account
        </p>
      </div>

      {/* Email Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      {/* Details */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-3">
        {email && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Verification email sent to</p>
              <p className="text-sm text-gray-600 font-mono">{email}</p>
            </div>
          </div>
        )}

        {workspace_name && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Workspace</p>
              <p className="text-sm text-gray-600">{workspace_name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">What to do next</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the "Verify Email Address" button</li>
              <li>You'll receive your login credentials</li>
              <li>Sign in to start using your workspace</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900 mb-1">Verification link expires in 24 hours</h3>
            <p className="text-sm text-amber-800">
              If you don't verify your email within 24 hours, you'll need to register again.
            </p>
          </div>
        </div>
      </div>

      {/* Didn't receive email */}
      <div className="text-center text-sm text-gray-500">
        <p>Didn't receive the email? Check your spam folder or</p>
        <a href="/register/" className="text-blue-600 hover:text-blue-800 font-medium">
          register again
        </a>
      </div>
    </AuthLayout>
  )
}
