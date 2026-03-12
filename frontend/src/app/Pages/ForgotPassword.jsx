import React, { useState } from 'react'
import { Head, useForm, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout'

export default function ForgotPassword() {
  const [emailSent, setEmailSent] = useState(false)
  const { data, setData, post, processing } = useForm({
    email: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    toast.promise(
      new Promise((resolve, reject) => {
        post('/forgot-password/', {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          forceFormData: true,
          preserveScroll: true,
          onSuccess: () => {
            setEmailSent(true)
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: 'Sending reset link...',
        success: 'Password reset link sent!',
        error: 'Failed to send reset link',
      }
    )
  }

  return (
    <AuthLayout
      title="Reset Your Password"
      subtitle="Don't worry! It happens. Enter your email and we'll send you a link to reset your password."
      features={[
        'Secure password reset process',
        'Link expires in 24 hours',
        'No account access required'
      ]}
    >
      <Head title="Forgot Password" />
      
      {!emailSent ? (
        <>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-center">
            Forgot Password?
          </h1>
          <p className="text-gray-500 mb-6 md:mb-8 text-center text-sm sm:text-base">
            Enter your email to receive a reset link
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={data.email}
                  onChange={e => setData('email', e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent bg-gray-50"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-[#4a154b] text-white py-3 rounded-lg font-semibold hover:bg-[#5a235c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login/" className="text-sm text-[#4a154b] font-semibold hover:underline flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Sign In
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center">
          <div className="mb-4 sm:mb-6 inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-100">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Check Your Email
          </h1>
          <p className="text-gray-600 mb-6 md:mb-8 text-sm sm:text-base">
            We've sent a password reset link to <strong className="break-all">{data.email}</strong>
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mb-6">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setEmailSent(false)}
              className="w-full bg-[#4a154b] text-white py-3 rounded-lg font-semibold hover:bg-[#5a235c] transition-colors"
            >
              Try Another Email
            </button>
            <Link 
              href="/login/" 
              className="block w-full text-center py-3 text-[#4a154b] font-semibold hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
