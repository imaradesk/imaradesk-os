import React, { useEffect, useState, useMemo } from 'react'
import { Head, useForm, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout'
import { ArrowLeft, Eye, EyeOff, Mail, Lock, MailOpen } from 'lucide-react'

export default function Login({ errors: serverErrors = {}, next = '', invite = null }) {
  const [showPassword, setShowPassword] = useState(false)

  const isModalMode = useMemo(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('modal') === '1'
  }, [])

  const { data, setData, post, processing } = useForm({
    email: invite?.email || '',
    password: '',
    next: next,
  })

  useEffect(() => {
    const err = serverErrors.general || serverErrors.email || serverErrors.password
    if (err) toast.error(err)
  }, [serverErrors])

  const handleSubmit = (e) => {
    e.preventDefault()
    toast.promise(
      new Promise((resolve, reject) => {
        post('/login/', {
          headers: { 'X-CSRFToken': window.csrfToken },
          forceFormData: true,
          preserveScroll: true,
          onSuccess: () => {
            resolve()
            if (isModalMode && window.parent !== window) {
              window.parent.postMessage('login:success', '*')
            }
          },
          onError: () => reject(),
        })
      }),
      { loading: 'Signing in…', success: 'Welcome back!', error: 'Sign-in failed' }
    )
  }

  const FormContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="email"
            value={data.email}
            onChange={e => setData('email', e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm bg-white ${
              serverErrors.email ? 'border-red-400' : 'border-gray-200'
            }`}
            placeholder="you@company.com"
            autoComplete="email"
            autoFocus
          />
        </div>
        {serverErrors.email && <p className="mt-1 text-xs text-red-600">{serverErrors.email}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <Link href="/forgot-password/" className="text-xs text-[#0B3D26] hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={data.password}
            onChange={e => setData('password', e.target.value)}
            className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm bg-white ${
              serverErrors.password ? 'border-red-400' : 'border-gray-200'
            }`}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {serverErrors.password && <p className="mt-1 text-xs text-red-600">{serverErrors.password}</p>}
        {serverErrors.general && <p className="mt-1 text-xs text-red-600">{serverErrors.general}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="remember" className="rounded border-gray-300" />
        <label htmlFor="remember" className="text-sm text-gray-600 select-none">Remember me</label>
      </div>

      <button
        type="submit"
        disabled={processing}
        className="w-full bg-[#0B3D26] hover:bg-[#14502F] text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {processing ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gray-400">or</span>
        </div>
      </div>

      <button
        type="button"
        disabled
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed opacity-60"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        Continue with SAML
      </button>
    </form>
  )

  if (isModalMode) {
    return (
      <>
        <Head title="Sign In" />
        <div className="p-6">{FormContent}</div>
      </>
    )
  }

  return (
    <AuthLayout>
      <Head title="Sign In" />
      {invite ? (
        <div className="mb-7 animate-portalRise">
          <Link href={next} className="group inline-flex items-center gap-1 mb-4 text-xs text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" /> Back to invitation
          </Link>
          <div className="flex items-start gap-3 p-3 mb-5 rounded-xl border border-[#0B3D26]/15 bg-[#0B3D26]/5">
            <span className="w-8 h-8 flex-shrink-0 rounded-lg bg-[#0B3D26] text-white inline-flex items-center justify-center">
              <MailOpen className="w-4 h-4" strokeWidth={1.75} />
            </span>
            <p className="text-xs text-gray-600 leading-relaxed">
              You're joining <span className="font-semibold text-gray-900">{invite.workspace}</span>
              {invite.role && <> as <span className="font-semibold text-gray-900">{invite.role}</span></>}.
              Sign in with <span className="font-medium text-gray-900">{invite.email}</span> to accept.
            </p>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in to accept</h1>
          <p className="text-sm text-gray-500">You'll come straight back to your invitation.</p>
        </div>
      ) : (
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
          <p className="text-sm text-gray-500">Enter your credentials to access your workspace</p>
        </div>
      )}
      {FormContent}
    </AuthLayout>
  )
}
