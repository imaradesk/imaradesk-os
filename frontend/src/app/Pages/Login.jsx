import React, { useEffect, useState } from 'react'
import { Head, useForm, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout'

export default function Login({ errors: serverErrors = {}, next = '' }) {
  const [showPassword, setShowPassword] = useState(false)
  const { data, setData, post, processing } = useForm({
    email: '',
    password: '',
    next: next,
  })

  useEffect(() => {
    if (serverErrors.general) {
      toast.error(serverErrors.general)
    } else if (serverErrors.email) {
      toast.error(serverErrors.email)
    } else if (serverErrors.password) {
      toast.error(serverErrors.password)
    }
  }, [serverErrors])

  const handleSubmit = (e) => {
    e.preventDefault()
    toast.promise(
      new Promise((resolve, reject) => {
        post('/login/', {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          forceFormData: true,
          preserveScroll: true,
          onSuccess: () => resolve(),
          onError: () => reject(),
        })
      }),
      {
        loading: 'Signing in...',
        success: 'Welcome back!',
        error: 'Failed to sign in',
      }
    )
  }

  return (
    <AuthLayout
      title="Welcome Back to ImaraDesk"
      subtitle="Access your helpdesk dashboard and manage support tickets with ease"
      features={[
        'Manage all your support tickets in one place',
        'Real-time analytics and reporting',
        'Collaborate with your team seamlessly'
      ]}
    >
      <Head title="Sign In" />
      
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-center">
        Welcome back
      </h1>
      <p className="text-gray-500 mb-6 md:mb-8 text-center text-sm sm:text-base">
        Sign in to your ImaraDesk workspace
      </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent bg-gray-50 ${
                    serverErrors.email ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              {serverErrors.email && (
                <p className="mt-1 text-sm text-red-600">{serverErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Password</label>
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
                  className={`w-full pl-12 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent bg-gray-50 ${
                    serverErrors.password ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
              {serverErrors.general && (
                <p className="mt-1 text-sm text-red-600">{serverErrors.general}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]" />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <Link href="/forgot-password/" className="text-sm text-[#4a154b] font-semibold hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-[#4a154b] text-white py-3 rounded-lg font-semibold hover:bg-[#5a235c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* <div className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/register/" className="text-[#4a154b] font-semibold hover:underline">
              Create workspace
            </Link>
          </div> */}
    </AuthLayout>
  )
}
