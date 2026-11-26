import React, { useState } from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import {
  ArrowRight, Check, Clock, Eye, EyeOff, Link2Off, Loader2, Lock, LogIn, Mail, MailX, Moon, PartyPopper,
  ShieldCheck, Sun, User, UserRoundCheck, UserRoundX,
} from 'lucide-react'
import { ThemeProvider, useTheme } from '../components/ThemeContext'
import logoImage from '../assets/imaradesk-logo.png'

// Landing page for the emailed /invite/<token>/ link. The backend picks the state:
//   signup   – no account for the invited email yet: create one here
//   login    – an account exists: sign in (login?next=/invite/<token>/) and come back
//   accept   – signed in as the invited email: confirm and join
//   mismatch – signed in as someone else: switch accounts
//   joined   – just accepted
//   accepted / expired / revoked / invalid – nothing left to do

const STEPS = ['Invitation', 'Account', 'Join']
const STEP_FOR_STATE = { signup: 1, login: 1, mismatch: 1, accept: 2, joined: 3 }

const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'case', label: 'Upper & lower case', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { key: 'number', label: 'A number', test: (p) => /\d/.test(p) },
]

const inputClass = (error) =>
  `w-full h-11 pl-10 pr-3 rounded-xl border bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 transition-shadow ${
    error ? 'border-red-300 focus:ring-red-500/10' : 'border-gray-200 focus:border-[#0B3D26] focus:ring-[#0B3D26]/10'
  }`

const primaryBtn =
  'group w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
const secondaryBtn =
  'w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors'

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
    >
      <span key={isDark ? 'sun' : 'moon'} className="animate-portalSpinIn">
        {isDark ? <Sun className="w-[18px] h-[18px]" strokeWidth={1.75} /> : <Moon className="w-[18px] h-[18px]" strokeWidth={1.75} />}
      </span>
    </button>
  )
}

function Stepper({ current }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <span className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-semibold transition-all duration-300 ${
                  done ? 'bg-[#0B3D26] text-white' : active ? 'bg-[#0B3D26]/10 text-[#0B3D26] ring-2 ring-[#0B3D26]/30' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5 animate-portalPop" strokeWidth={3} /> : i + 1}
              </span>
              <span className={`text-xs font-medium ${active || done ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
            </span>
            {i < STEPS.length - 1 && (
              <span className="flex-1 h-0.5 rounded-full bg-gray-100 overflow-hidden">
                <span className={`block h-full bg-[#0B3D26] transition-all duration-500 ease-out ${done ? 'w-full' : 'w-0'}`} />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** Who invited you, to what, as which role */
function InviteSummary({ invite, workspace }) {
  const letter = (workspace || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="text-center">
      <div className="relative mx-auto w-16 h-16 animate-portalPop">
        <span className="absolute inset-0 rounded-2xl bg-[#0B3D26]/20 blur-xl" aria-hidden="true" />
        <span className="relative w-16 h-16 rounded-2xl bg-[#0B3D26] text-white text-2xl font-semibold inline-flex items-center justify-center shadow-lg">
          {letter}
        </span>
      </div>
      <p className="mt-5 text-sm text-gray-500">
        {invite?.invited_by ? <><span className="font-medium text-gray-900">{invite.invited_by}</span> invited you to join</> : 'You’ve been invited to join'}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 text-balance">{workspace}</h1>
      {invite && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {invite.role && (
            <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[#0B3D26]/10 text-[#0B3D26] text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> {invite.role}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-gray-100 text-gray-600 text-xs max-w-full">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{invite.email}</span>
          </span>
        </div>
      )}
      {invite?.role_description && <p className="mt-3 text-xs text-gray-500 max-w-xs mx-auto">{invite.role_description}</p>}
    </div>
  )
}

function Field({ label, icon: Icon, error, children, trailing }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        {children}
        {trailing}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 animate-fadeIn">{error}</p>}
    </div>
  )
}

function SignupForm({ token, invite, errors, initialName }) {
  const [show, setShow] = useState(false)
  const { data, setData, post, processing } = useForm({
    action: 'signup',
    full_name: initialName || '',
    password: '',
    password_confirm: '',
  })

  const passed = PASSWORD_RULES.filter((r) => r.test(data.password)).length
  const mismatch = data.password_confirm && data.password !== data.password_confirm
  const canSubmit = data.full_name.trim() && data.password.length >= 8 && data.password === data.password_confirm && !processing

  const submit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    post(`/invite/${token}/`, { headers: { 'X-CSRFToken': window.csrfToken }, forceFormData: true, preserveScroll: true })
  }

  const eye = (
    <button
      type="button"
      onClick={() => setShow((v) => !v)}
      aria-label={show ? 'Hide password' : 'Show password'}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700"
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  )

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Create your account</h2>
        <p className="mt-0.5 text-sm text-gray-500">It takes less than a minute.</p>
      </div>

      <Field label="Email" icon={Mail}>
        <input type="email" value={invite.email} readOnly disabled className={`${inputClass()} pr-20 bg-gray-50 text-gray-500 cursor-not-allowed`} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] text-gray-400">
          <Lock className="w-3 h-3" /> Invited
        </span>
      </Field>

      <Field label="Full name" icon={User} error={errors.full_name}>
        <input
          type="text"
          value={data.full_name}
          onChange={(e) => setData('full_name', e.target.value)}
          autoFocus
          autoComplete="name"
          placeholder="Jane Doe"
          maxLength={128}
          className={inputClass(errors.full_name)}
        />
      </Field>

      <Field label="Password" icon={Lock} error={errors.password} trailing={eye}>
        <input
          type={show ? 'text' : 'password'}
          value={data.password}
          onChange={(e) => setData('password', e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
          className={`${inputClass(errors.password)} pr-10`}
        />
      </Field>

      {/* Strength meter */}
      <div className="-mt-1">
        <div className="flex gap-1.5">
          {PASSWORD_RULES.map((rule, i) => (
            <span key={rule.key} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < passed ? 'bg-[#0B3D26]' : 'bg-gray-200'}`} />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(data.password)
            return (
              <li key={rule.key} className={`inline-flex items-center gap-1 text-[11px] transition-colors ${ok ? 'text-green-700' : 'text-gray-400'}`}>
                <Check className={`w-3 h-3 transition-opacity ${ok ? 'opacity-100' : 'opacity-40'}`} strokeWidth={3} /> {rule.label}
              </li>
            )
          })}
        </ul>
      </div>

      <Field label="Confirm password" icon={Lock} error={errors.password_confirm || (mismatch ? 'Passwords do not match' : '')}>
        <input
          type={show ? 'text' : 'password'}
          value={data.password_confirm}
          onChange={(e) => setData('password_confirm', e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
          className={inputClass(errors.password_confirm || mismatch)}
        />
      </Field>

      {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}

      <button type="submit" disabled={!canSubmit} className={primaryBtn}>
        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {processing ? 'Creating your account…' : 'Create account & join'}
        {!processing && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
      </button>
    </form>
  )
}

function PostButton({ token, action, className, children, busyLabel }) {
  const { post, processing } = useForm({ action })
  return (
    <button
      type="button"
      disabled={processing}
      onClick={() => post(`/invite/${token}/`, { headers: { 'X-CSRFToken': window.csrfToken }, forceFormData: true })}
      className={className}
    >
      {processing && <Loader2 className="w-4 h-4 animate-spin" />}
      {processing ? busyLabel : children}
    </button>
  )
}

function Notice({ icon: Icon, tone = 'gray', title, children }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-500',
    amber: 'bg-amber-50 text-amber-600',
    brand: 'bg-[#0B3D26]/10 text-[#0B3D26]',
    green: 'bg-green-50 text-green-600',
  }
  return (
    <div className="text-center">
      <span className={`mx-auto w-14 h-14 rounded-2xl inline-flex items-center justify-center animate-portalPop ${tones[tone]}`}>
        <Icon className="w-7 h-7" strokeWidth={1.5} />
      </span>
      <h1 className="mt-5 text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
      <div className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">{children}</div>
    </div>
  )
}

function Body({ state, token, invite, workspace, currentUser, loginUrl, errors, mine, already_member, full_name }) {
  const inviter = invite?.invited_by || 'the person who invited you'

  switch (state) {
    case 'signup':
      return (
        <>
          <InviteSummary invite={invite} workspace={workspace} />
          <div className="my-6 h-px bg-gray-100" />
          <SignupForm token={token} invite={invite} errors={errors} initialName={full_name} />
          <p className="mt-4 text-center text-xs text-gray-500">
            Already have an account? <Link href={loginUrl} className="font-medium text-[#0B3D26] hover:underline">Sign in instead</Link>
          </p>
        </>
      )

    case 'login':
      return (
        <>
          <InviteSummary invite={invite} workspace={workspace} />
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-start gap-3 animate-portalRise [animation-delay:120ms]">
            <span className="w-9 h-9 flex-shrink-0 rounded-lg bg-white border border-gray-200 text-[#0B3D26] inline-flex items-center justify-center">
              <UserRoundCheck className="w-4 h-4" strokeWidth={1.75} />
            </span>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">You already have an account.</span> Sign in as {invite.email} and
              you'll come straight back here to accept.
            </p>
          </div>
          {errors.general && <p className="mt-3 text-sm text-red-600">{errors.general}</p>}
          <Link href={loginUrl} className={`${primaryBtn} mt-5`}>
            <LogIn className="w-4 h-4" /> Sign in to accept
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-3 text-center text-xs text-gray-500">
            Forgot it? <Link href="/forgot-password/" className="font-medium text-[#0B3D26] hover:underline">Reset your password</Link>, then open this link again.
          </p>
        </>
      )

    case 'accept':
      return (
        <>
          <InviteSummary invite={invite} workspace={workspace} />
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2 text-sm text-green-700 animate-portalRise [animation-delay:120ms]">
            <Check className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
            <span className="min-w-0 truncate">Signed in as <span className="font-medium">{currentUser?.email}</span></span>
          </div>
          <PostButton token={token} action="accept" busyLabel="Joining…" className={`${primaryBtn} mt-5`}>
            <PartyPopper className="w-4 h-4" /> Accept & join {workspace}
          </PostButton>
          <a href="/dashboard/" className="mt-3 block text-center text-xs text-gray-500 hover:text-gray-900 transition-colors">Not now</a>
        </>
      )

    case 'mismatch':
      return (
        <>
          <InviteSummary invite={invite} workspace={workspace} />
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 animate-portalRise [animation-delay:120ms]">
            <UserRoundX className="w-5 h-5 flex-shrink-0 text-amber-600" strokeWidth={1.75} />
            <p className="text-sm text-amber-800 min-w-0">
              You're signed in as <span className="font-medium break-all">{currentUser?.email}</span>, but this invite is for{' '}
              <span className="font-medium break-all">{invite.email}</span>. Switch accounts to accept it.
            </p>
          </div>
          <PostButton token={token} action="switch" busyLabel="Signing out…" className={`${primaryBtn} mt-5`}>
            <LogIn className="w-4 h-4" /> Sign out & continue as {invite.email}
          </PostButton>
          <a href="/dashboard/" className={`${secondaryBtn} mt-2`}>Stay signed in as {currentUser?.name || currentUser?.email}</a>
        </>
      )

    case 'joined':
      return (
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16">
            <span className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" aria-hidden="true" />
            <span className="relative w-16 h-16 rounded-full bg-green-500 text-white inline-flex items-center justify-center shadow-lg animate-portalPop">
              <Check className="w-8 h-8" strokeWidth={3} />
            </span>
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-gray-900 animate-portalRise [animation-delay:120ms]">
            {already_member ? 'Role updated' : `Welcome to ${workspace}!`}
          </h1>
          <p className="mt-2 text-sm text-gray-500 animate-portalRise [animation-delay:180ms]">
            {already_member
              ? <>You're now {invite?.role ? <span className="font-medium text-gray-900">{invite.role}</span> : 'a member'} in {workspace}.</>
              : <>You've joined as {invite?.role ? <span className="font-medium text-gray-900">{invite.role}</span> : 'a team member'}. Your workspace is ready.</>}
          </p>
          <a href="/dashboard/" className={`${primaryBtn} mt-7 animate-portalRise [animation-delay:240ms]`}>
            Go to dashboard <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      )

    case 'accepted':
      return mine ? (
        <Notice icon={UserRoundCheck} tone="green" title="You're already in">
          You accepted this invitation to {workspace}.
          <a href="/dashboard/" className={`${primaryBtn} mt-6`}>Go to dashboard <ArrowRight className="w-4 h-4" /></a>
        </Notice>
      ) : (
        <Notice icon={UserRoundCheck} tone="brand" title="Invitation already used">
          This invitation to {workspace} has already been accepted. If it was you, sign in to continue.
          <Link href="/login/" className={`${primaryBtn} mt-6`}><LogIn className="w-4 h-4" /> Sign in</Link>
        </Notice>
      )

    case 'expired':
      return (
        <Notice icon={Clock} tone="amber" title="This invitation has expired">
          Invite links are valid for 7 days. Ask {inviter} to send you a new one.
        </Notice>
      )

    case 'revoked':
      return (
        <Notice icon={MailX} tone="gray" title="This invitation was cancelled">
          It may have been replaced by a newer invite. Check your inbox for the latest one, or ask {inviter} to resend it.
        </Notice>
      )

    default:
      return (
        <Notice icon={Link2Off} tone="gray" title="Invitation not found">
          This link isn't valid. Make sure you copied the whole link from the email.
          <Link href="/login/" className={`${secondaryBtn} mt-6`}>Go to sign in</Link>
        </Notice>
      )
  }
}

function Frame(props) {
  const { isDark } = useTheme()
  const step = STEP_FOR_STATE[props.state]

  return (
    <div className={`relative min-h-screen overflow-hidden ${isDark ? 'app-dark bg-[#0c0f12]' : 'bg-gray-50'}`}>
      {/* Soft brand glow */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-[#0B3D26]/10 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4">
        <span className="flex items-center gap-2">
          <img src={logoImage} alt="" className="h-7 w-auto" />
          <span className="text-sm font-semibold text-gray-900">Imaradesk</span>
        </span>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex justify-center px-4 pb-12 pt-4 sm:pt-10">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-xl shadow-black/5 overflow-hidden animate-portalRise">
            {step !== undefined && (
              <div className="px-6 sm:px-8 py-4 border-b border-gray-100">
                <Stepper current={step} />
              </div>
            )}
            {/* key replays the entrance animation whenever the state changes */}
            <div key={props.state} className="px-6 sm:px-8 py-8 animate-fadeIn">
              <Body {...props} />
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-gray-400">
            Sent to the wrong person? You can safely ignore this invitation.
          </p>
        </div>
      </main>
    </div>
  )
}

export default function AcceptInvite(props) {
  const errors = props.errors || {}
  return (
    <ThemeProvider>
      <Head title={props.workspace ? `Join ${props.workspace}` : 'Invitation'} />
      <Frame {...props} errors={errors} />
    </ThemeProvider>
  )
}
