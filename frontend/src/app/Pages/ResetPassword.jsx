import React, { useEffect, useState } from 'react'
import { Head, useForm, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout'

export default function ResetPassword({ 
  errors: serverErrors = {}, 
  success = false, 
  token_valid = true,
  token = ''
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetComplete, setResetComplete] = useState(success)
  
  const { data, setData, post, processing, errors } = useForm({
    password: '',
    password_confirm: '',
  })

  useEffect(() => {
    if (serverErrors.password) {
      toast.error(serverErrors.password)
    }
    if (serverErrors.password_confirm) {
      toast.error(serverErrors.password_confirm)
    }
    if (serverErrors.token) {
      toast.error(serverErrors.token)
    }
    if (success) {
      setResetComplete(true)
    }
  }, [serverErrors, success])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Client-side validation
    if (data.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (data.password !== data.password_confirm) {
      toast.error('Passwords do not match')
      return
    }
    
    toast.promise(
      new Promise((resolve, reject) => {
        post(`/reset-password/${token}/`, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          forceFormData: true,
          preserveScroll: true,
          onSuccess: () => {
            setResetComplete(true)
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: 'Resetting password...',
        success: 'Password reset successful!',
        error: 'Failed to reset password',
      }
    )
  }

  // Invalid or expired token
  if (!token_valid) {
    return (
      <AuthLayout>
        <Head title="Invalid Reset Link" />
        
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Invalid Reset Link
          </h1>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {serverErrors.token || 'This password reset link has expired or has already been used.'}
          </p>
          
          <div className="space-y-3">
            <Link
              href="/forgot-password/"
              className="block w-full bg-[#0B3D26] text-white py-3 rounded-lg font-semibold hover:bg-[#14502F] transition-colors text-center"
            >
              Request New Reset Link
            </Link>
            <Link
              href="/login/"
              className="block w-full text-center text-[#0B3D26] font-semibold hover:underline py-2"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  // Password reset successful
  if (resetComplete) {
    return (
      <AuthLayout>
        <Head title="Password Reset Successful" />
        
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Password Updated!
          </h1>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          
          <Link
            href="/login/"
            className="block w-full bg-[#0B3D26] text-white py-3 rounded-lg font-semibold hover:bg-[#14502F] transition-colors text-center"
          >
            Sign In Now
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // Reset password form
  return (
    <AuthLayout>
      <Head title="Reset Password" />
      
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-center">
        Set New Password
      </h1>
      <p className="text-gray-500 mb-6 md:mb-8 text-center text-sm sm:text-base">
        Create a strong password for your account
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">New Password</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={data.password}
              onChange={e => setData('password', e.target.value)}
              className={`w-full pl-12 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-[#0B3D26] focus:border-transparent bg-gray-50 ${
                serverErrors.password ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {serverErrors.password && (
            <p className="mt-1 text-sm text-red-600">{serverErrors.password}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm Password</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </span>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={data.password_confirm}
              onChange={e => setData('password_confirm', e.target.value)}
              className={`w-full pl-12 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-[#0B3D26] focus:border-transparent bg-gray-50 ${
                serverErrors.password_confirm ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {serverErrors.password_confirm && (
            <p className="mt-1 text-sm text-red-600">{serverErrors.password_confirm}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={processing}
          className="w-full bg-[#0B3D26] text-white py-3 rounded-lg font-semibold hover:bg-[#14502F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login/" className="text-sm text-[#0B3D26] font-semibold hover:underline">
          ← Back to Sign In
        </Link>
      </div>
    </AuthLayout>
  )
}
