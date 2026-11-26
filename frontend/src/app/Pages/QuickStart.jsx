import React, { useState, useEffect, useCallback } from 'react'
import { Head, router } from '@inertiajs/react'
import api from '../../utils/axios'
import { HIDDEN_CHANNELS } from '../components/SidebarNav'
import toast from 'react-hot-toast'
import bgImage from '../assets/bg.png'
import logoImage from '../assets/imaradesk-logo.png'
import confetti from 'canvas-confetti'
import {
  Boxes, Users, Shield, Mail, Bell, Radio,
  Check, ChevronRight, ChevronLeft, Loader2,
  Plus, Trash2, AlertTriangle, ArrowRight, Lock, Lightbulb,
  Ticket, ListTodo, LibraryBig, Globe, Timer, Zap, ChartColumn,
  Inbox, Plug, Server, Send, Package,
} from 'lucide-react'

const STEPS = [
  {
    id: 1,
    key: 'modules',
    title: 'Modules',
    icon: Boxes,
    heading: 'What should your workspace do?',
    sub: "Pick the modules you want switched on. You can add or remove them anytime.",
    highlight: 'Start with the essentials — ticketing is a great default.',
  },
  {
    id: 2,
    key: 'channels',
    title: 'Channels',
    icon: Radio,
    heading: 'Where will your customers reach you?',
    sub: 'Turn on the channels customers can use to raise a ticket. Nothing is permanent.',
    highlight: 'The web portal is the fastest way to get going.',
  },
  {
    id: 3,
    key: 'users_groups',
    title: 'Users & Groups',
    icon: Users,
    heading: 'Who is on your support team?',
    sub: 'Create groups to organise agents, then invite the people who will handle tickets.',
    highlight: 'Groups you create here become the routing targets for your tickets.',
  },
  {
    id: 4,
    key: 'sla',
    title: 'SLA Policies',
    icon: Shield,
    heading: 'How fast should you respond?',
    sub: 'Set first-response and resolution targets per priority so nothing slips through.',
    highlight: 'You can tighten these targets later as you learn your real volumes.',
  },
  {
    id: 5,
    key: 'emails_smtp',
    title: 'Emails & SMTP',
    icon: Mail,
    heading: 'How should we send your emails?',
    sub: 'Connect your own SMTP so replies come from your domain. Or keep our defaults for now.',
    highlight: 'Using your own address builds trust and improves deliverability.',
  },
  {
    id: 6,
    key: 'notifications',
    title: 'Notifications',
    icon: Bell,
    heading: 'When do you want to be told?',
    sub: 'Choose the moments you want to hear about — in your inbox and in the browser.',
    highlight: "You can fine-tune all of this from Settings later.",
  },
]

const STEP_PROGRESS = [10, 30, 50, 70, 88, 100]

// Shared form styling. Inputs are 16px on phones so iOS doesn't zoom on focus.
const INPUT = 'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-base sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#0B3D26] focus:ring-4 focus:ring-[#0B3D26]/10'
const PRIMARY_BTN = 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#0B3D26] text-white text-sm font-semibold shadow-sm shadow-[#0B3D26]/20 transition-all duration-150 hover:bg-[#072618] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100'

export default function QuickStart() {
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = back (drives the slide-in)
  const [stepsCompleted, setStepsCompleted] = useState({})
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Step-specific state
  const [apps, setApps] = useState([])
  const [selectedApps, setSelectedApps] = useState([])
  const [channels, setChannels] = useState([])
  const [groups, setGroups] = useState([{ name: '', description: '' }])
  const [savedGroups, setSavedGroups] = useState([])
  const [groupsSaved, setGroupsSaved] = useState(false)
  const [users, setUsers] = useState([{ email: '', full_name: '', group_ids: [] }])
  const [slaEnabled, setSlaEnabled] = useState(false)
  const [slaPolicies, setSlaPolicies] = useState([
    { priority: 'URGENT', first_response_time: 30, resolution_time: 240 },
    { priority: 'HIGH', first_response_time: 60, resolution_time: 480 },
    { priority: 'MEDIUM', first_response_time: 240, resolution_time: 1440 },
    { priority: 'LOW', first_response_time: 480, resolution_time: 2880 },
  ])
  const [smtp, setSmtp] = useState({
    host: '', port: 587, username: '', password: '',
    use_tls: true, use_ssl: false,
    default_from_email: '', sender_name: '', reply_to_email: '',
  })
  const [notifPrefs, setNotifPrefs] = useState({
    email_new_ticket: true,
    email_ticket_assigned: true,
    email_ticket_reply: true,
    email_ticket_resolved: false,
    email_sla_breach: true,
    browser_new_ticket: true,
    browser_ticket_assigned: true,
    browser_ticket_reply: true,
  })

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const res = await api.get('/api/onboarding/status/')
      if (res.data.success) {
        const data = res.data.onboarding
        const rawSteps = data.steps || {}
        setStepsCompleted(
          Object.fromEntries(Object.entries(rawSteps).map(([k, v]) => [parseInt(k), v]))
        )
        const step = data.current_step || 1
        if (data.is_complete) {
          // Revisiting after completion: start from the first step
          setCurrentStep(1)
        } else if (step > STEPS.length) {
          setShowSuccess(true)
          setCurrentStep(STEPS.length)
        } else {
          setCurrentStep(step)
        }
      }
    } catch {
      // ignore
    } finally {
      setInitialLoading(false)
    }
  }

  const loadModules = useCallback(async () => {
    try {
      const res = await api.get('/api/onboarding/modules/')
      if (res.data.success) {
        setApps(res.data.apps)
        setSelectedApps(res.data.apps.filter(a => a.is_installed).map(a => a.id))
      }
    } catch {
      // ignore
    }
  }, [])

  const loadChannels = useCallback(async () => {
    try {
      const res = await api.get('/api/onboarding/channels/')
      if (res.data.success) {
        setChannels(res.data.channels.filter(ch => !HIDDEN_CHANNELS.includes(ch.slug)))
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!initialLoading && currentStep === 1 && apps.length === 0) {
      loadModules()
    }
    if (!initialLoading && currentStep === 2 && channels.length === 0) {
      loadChannels()
    }
  }, [initialLoading, currentStep, apps.length, channels.length, loadModules, loadChannels])

  const goToStep = (step) => {
    setDirection(step >= currentStep ? 1 : -1)
    setShowSuccess(false)
    setCurrentStep(step)
  }

  const toggleApp = (id) => {
    setSelectedApps(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  const handleSaveStep = async () => {
    setLoading(true)
    try {
      let endpoint = ''
      let payload = {}

      switch (currentStep) {
        case 1:
          endpoint = '/api/onboarding/modules/save/'
          payload = { app_ids: selectedApps }
          break
        case 2:
          endpoint = '/api/onboarding/channels/save/'
          payload = { channels: channels.map(c => ({ id: c.id, is_activated: c.is_activated })) }
          break
        case 3:
          endpoint = '/api/onboarding/users-groups/save/'
          payload = {
            groups: groups.filter(g => g.name.trim()),
            users: users.filter(u => u.email.trim()).map(u => ({
              email: u.email,
              full_name: u.full_name,
              group_ids: u.group_ids,
            })),
          }
          break
        case 4:
          endpoint = '/api/onboarding/sla/save/'
          payload = { enable_sla: slaEnabled, policies: slaEnabled ? slaPolicies : [] }
          break
        case 5:
          endpoint = '/api/onboarding/emails-smtp/save/'
          payload = smtp
          break
        case 6:
          endpoint = '/api/onboarding/notifications/save/'
          payload = { preferences: notifPrefs }
          break
      }

      const res = await api.post(endpoint, payload)
      if (res.data.success) {
        setStepsCompleted(prev => ({ ...prev, [currentStep]: true }))
        toast.success('Step saved!')
        if (currentStep < 6) {
          goToStep(currentStep + 1)
        } else {
          setShowSuccess(true)
        }
      } else {
        toast.error('Failed to save')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    try {
      await api.post('/api/onboarding/skip/', { step: currentStep })
      if (currentStep < STEPS.length) {
        goToStep(currentStep + 1)
      } else {
        setShowSuccess(true)
      }
    } catch {
      if (currentStep < STEPS.length) goToStep(currentStep + 1)
      else setShowSuccess(true)
    }
  }

  const handleComplete = async () => {
    try {
      await api.post('/api/onboarding/complete/')
    } catch {
      // ignore
    }
    toast.success('Setup complete! Welcome to Imaradesk.')
    router.visit('/dashboard/')
  }

  if (initialLoading) {
    return (
      <>
        <Head title="Quick Start" />
        <div className="h-screen h-dvh flex flex-col items-center justify-center gap-5 bg-white">
          <img src={logoImage} alt="Imaradesk" className="h-9 w-auto" />
          <Loader2 className="w-6 h-6 animate-spin text-[#0B3D26]" />
        </div>
      </>
    )
  }

  const progress = showSuccess ? 100 : STEP_PROGRESS[currentStep - 1]
  const completedCount = Object.values(stepsCompleted).filter(Boolean).length
  const step = STEPS[currentStep - 1]
  const StepIcon = step.icon

  return (
    <>
      <Head title="Quick Start - Setup Your Workspace" />

      <div className="h-screen h-dvh flex bg-white overflow-hidden">
        {/* ── Desktop: step rail ─────────────────────────── */}
        <aside className="hidden lg:flex w-[340px] xl:w-[380px] flex-shrink-0 relative overflow-hidden bg-[#04170E] text-white">
          <img src={bgImage} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover object-left-top opacity-25" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#04170E]/70 via-[#04170E]/90 to-[#04170E]" />

          <div className="relative flex flex-col w-full h-full p-8 xl:p-10">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                <img src={logoImage} alt="" className="h-6 w-auto" />
              </span>
              <span className="font-serif text-lg font-medium">Imaradesk</span>
            </div>

            <div className="mt-10">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300/80">Quick start</p>
              <h2 className="mt-2 font-serif text-[28px] leading-tight font-medium text-balance">Set up your workspace</h2>
              <p className="mt-2 text-sm text-white/60">About five minutes. Every step can be changed later in Settings.</p>
            </div>

            <nav aria-label="Setup steps" className="mt-8">
              <ol className="relative">
                {STEPS.map((s, i) => {
                  const isCurrent = !showSuccess && s.id === currentStep
                  const isDone = !!stepsCompleted[s.id]
                  const Icon = s.icon
                  return (
                    <li key={s.id} className="relative">
                      {i < STEPS.length - 1 && (
                        <span aria-hidden="true" className={`absolute left-[27px] top-[46px] w-px h-[calc(100%-36px)] ${isDone ? 'bg-emerald-400/50' : 'bg-white/10'}`} />
                      )}
                      <button
                        type="button"
                        onClick={() => goToStep(s.id)}
                        aria-current={isCurrent ? 'step' : undefined}
                        className={`relative w-full flex items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors duration-200 ${
                          isCurrent ? 'bg-white/[0.08] ring-1 ring-inset ring-white/10' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                          isDone
                            ? 'bg-emerald-400 text-[#04170E]'
                            : isCurrent
                              ? 'bg-white text-[#0B3D26] shadow-[0_0_0_4px_rgba(255,255,255,0.08)]'
                              : 'bg-white/[0.06] text-white/50 ring-1 ring-inset ring-white/10'
                        }`}>
                          {isDone ? <Check className="w-4 h-4" strokeWidth={3} /> : <Icon className="w-4 h-4" />}
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-sm font-medium ${isCurrent ? 'text-white' : isDone ? 'text-white/85' : 'text-white/55'}`}>{s.title}</span>
                          <span className="block text-xs text-white/40">{isDone ? 'Done' : isCurrent ? 'In progress' : `Step ${s.id}`}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </nav>

            <div className="mt-auto pt-8 space-y-5">
              {!showSuccess && (
                <div key={currentStep} className="animate-fadeIn flex gap-3 rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10 p-4">
                  <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-300" />
                  <p className="text-sm leading-relaxed text-white/75">{step.highlight}</p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between text-xs text-white/50 mb-2">
                  <span>{completedCount} of {STEPS.length} saved</span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Setup progress" className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ───────────────────────────────────────── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          {/* Top bar: brand + segmented progress on phones, skip link everywhere */}
          <header className="flex-shrink-0 px-4 sm:px-8 lg:px-10 pt-[max(env(safe-area-inset-top),0.875rem)] pb-3 lg:pt-6 lg:pb-0">
            <div className="flex items-center gap-3">
              <div className="lg:hidden flex items-center gap-2 min-w-0 flex-1">
                <img src={logoImage} alt="Imaradesk" className="h-7 w-auto" />
                <span className="font-serif text-base font-medium text-[#0B3D26]">Imaradesk</span>
              </div>
              <div className="hidden lg:block flex-1" />
              <button
                onClick={handleComplete}
                className="h-9 px-3 -mr-3 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Skip setup
              </button>
            </div>
            <div className="lg:hidden mt-3 flex gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Setup progress">
              {STEPS.map((s) => (
                <span
                  key={s.id}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    showSuccess || stepsCompleted[s.id] ? 'bg-[#0B3D26]' : s.id === currentStep ? 'bg-[#0B3D26]/35' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </header>

          {showSuccess ? (
            <main className="flex-1 min-h-0 overflow-y-auto">
              <SuccessScreen onComplete={handleComplete} completedCount={completedCount} />
            </main>
          ) : (
            <>
              <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div
                  key={currentStep}
                  style={{ '--slide-from': `${direction * 24}px` }}
                  className="animate-portalSlideIn max-w-2xl mx-auto px-4 sm:px-8 lg:px-10 pt-4 sm:pt-8 lg:pt-12 pb-10"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-[#0B3D26]">
                    <span className="w-7 h-7 rounded-lg bg-[#EEF6F1] flex items-center justify-center">
                      <StepIcon className="w-3.5 h-3.5" />
                    </span>
                    <span>Step {currentStep} of {STEPS.length}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-500">{step.title}</span>
                  </div>
                  <h1 className="mt-4 font-serif text-[26px] sm:text-3xl lg:text-4xl leading-tight font-medium text-gray-900 text-balance">
                    {step.heading}
                  </h1>
                  <p className="mt-2 text-[15px] text-gray-500 leading-relaxed">{step.sub}</p>

                  <div className="lg:hidden mt-4 flex gap-2.5 rounded-xl bg-[#EEF6F1] px-3.5 py-3">
                    <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#0B3D26]" />
                    <p className="text-sm text-[#0B3D26]/90">{step.highlight}</p>
                  </div>

                  <div className="mt-7 sm:mt-8">
                    {currentStep === 1 && (
                      <ModulesStep apps={apps} selectedApps={selectedApps} toggleApp={toggleApp} />
                    )}
                    {currentStep === 2 && (
                      <ChannelsStep channels={channels} setChannels={setChannels} />
                    )}
                    {currentStep === 3 && (
                      <UsersGroupsStep
                        groups={groups} setGroups={setGroups}
                        users={users} setUsers={setUsers}
                        savedGroups={savedGroups} setSavedGroups={setSavedGroups}
                        groupsSaved={groupsSaved} setGroupsSaved={setGroupsSaved}
                      />
                    )}
                    {currentStep === 4 && (
                      <SLAStep enabled={slaEnabled} setEnabled={setSlaEnabled} policies={slaPolicies} setPolicies={setSlaPolicies} />
                    )}
                    {currentStep === 5 && (
                      <EmailsSMTPStep smtp={smtp} setSmtp={setSmtp} />
                    )}
                    {currentStep === 6 && (
                      <NotificationsStep prefs={notifPrefs} setPrefs={setNotifPrefs} />
                    )}
                  </div>
                </div>
              </main>

              {/* ── Action bar ─────────────────────────────── */}
              <footer className="flex-shrink-0 border-t border-gray-100 bg-white/90 backdrop-blur px-4 sm:px-8 lg:px-10 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
                <div className="max-w-2xl mx-auto flex items-center gap-2">
                  {currentStep > 1 && (
                    <button
                      onClick={() => goToStep(currentStep - 1)}
                      aria-label="Back"
                      className="h-11 w-11 sm:w-auto sm:px-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all flex-shrink-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Back</span>
                    </button>
                  )}
                  <div className="hidden sm:block flex-1" />
                  <button
                    onClick={handleSkip}
                    className="h-11 px-3 sm:px-4 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors flex-shrink-0"
                  >
                    Set up later
                  </button>
                  <button onClick={handleSaveStep} disabled={loading} className={`${PRIMARY_BTN} flex-1 sm:flex-none`}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {currentStep === 6 ? 'Finish setup' : 'Save & continue'}
                    {currentStep < 6 && !loading && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </footer>
            </>
          )}
        </div>
      </div>
    </>
  )
}


/* ============================================================
   Shared pieces
   ============================================================ */

function Field({ label, hint, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-xs text-gray-400">{hint}</span>}
    </label>
  )
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-11 h-6 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0B3D26]/15 ${checked ? 'bg-[#0B3D26]' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

/** Selectable tile used by the modules and channels steps. */
function SelectCard({ selected, onClick, icon: Icon, title, badge, description, index = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
      className={`animate-portalRise group relative flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.99] ${
        selected
          ? 'border-[#0B3D26] bg-[#F4FAF6] shadow-[0_0_0_1px_#0B3D26]'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-card-hover'
      }`}
    >
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
        selected ? 'bg-[#0B3D26] text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200/70'
      }`}>
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <span className="min-w-0 flex-1 pr-6">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          {badge}
        </span>
        {description && <span className="block mt-0.5 text-[13px] text-gray-500 leading-snug line-clamp-2">{description}</span>}
      </span>
      <span className={`absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
        selected ? 'bg-[#0B3D26] scale-100' : 'border-2 border-gray-300 scale-95'
      }`}>
        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </span>
    </button>
  )
}

function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3.5 p-4 rounded-2xl border border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-1/2 rounded bg-gray-100 animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function Pill({ tone = 'green', children }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
    blue: 'bg-blue-50 text-blue-700 ring-blue-600/15',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  }
  return <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ring-1 ring-inset ${tones[tone]}`}>{children}</span>
}

const RemoveButton = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
  >
    <Trash2 className="w-4 h-4" />
  </button>
)


/* ============================================================
   Step Components
   ============================================================ */

const MODULE_ICONS = {
  'ticket-management': Ticket, 'tasks-projects': ListTodo, 'knowledge-base': LibraryBig,
  'email-to-ticket': Mail,
  'customer-portal': Globe, 'sla-management': Timer,
  'automation': Zap, 'analytics': ChartColumn,
}

function ModulesStep({ apps, selectedApps, toggleApp }) {
  if (apps.length === 0) return <CardSkeleton count={6} />

  return (
    <div>
      <p className="mb-3 text-xs font-medium text-gray-400 tabular-nums">{selectedApps.length} of {apps.length} selected</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {apps.map((app, i) => (
          <SelectCard
            key={app.id}
            index={i}
            selected={selectedApps.includes(app.id)}
            onClick={() => toggleApp(app.id)}
            icon={MODULE_ICONS[app.slug] || Package}
            title={app.name}
            description={app.description}
          />
        ))}
      </div>
    </div>
  )
}


const CHANNEL_ICONS = {
  web: Globe,
  email: Mail,
  microsoft365: Inbox,
  api: Plug,
}

function ChannelsStep({ channels, setChannels }) {
  const toggleChannel = (channelId) => {
    setChannels(channels.map(ch =>
      ch.id === channelId ? { ...ch, is_activated: !ch.is_activated } : ch
    ))
  }

  if (channels.length === 0) return <CardSkeleton count={4} />

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {channels.map((channel, i) => (
          <SelectCard
            key={channel.id}
            index={i}
            selected={channel.is_activated}
            onClick={() => toggleChannel(channel.id)}
            icon={CHANNEL_ICONS[channel.slug] || Radio}
            title={channel.name}
            badge={channel.slug === 'web' && <Pill tone="blue">Recommended</Pill>}
            description={channel.description || `Accept tickets via ${channel.name}`}
          />
        ))}
      </div>
      {channels.filter(c => c.is_activated).length === 0 && (
        <div className="animate-fadeIn mt-4 p-3.5 bg-amber-50 ring-1 ring-inset ring-amber-200 rounded-xl flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Enable at least one channel to allow customers to submit tickets.</p>
        </div>
      )}
    </div>
  )
}


function SectionCard({ number, done, locked, title, badge, description, children }) {
  return (
    <section className={`rounded-2xl border p-4 sm:p-5 transition-colors duration-300 ${
      done ? 'border-emerald-200 bg-emerald-50/30' : locked ? 'border-gray-100 bg-gray-50/60' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-start gap-3 mb-4">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-colors duration-300 ${
          done ? 'bg-emerald-500 text-white' : locked ? 'bg-gray-200 text-gray-400' : 'bg-[#0B3D26] text-white'
        }`}>
          {done ? <Check className="w-4 h-4" strokeWidth={3} /> : locked ? <Lock className="w-3.5 h-3.5" /> : number}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap min-h-8">
            <h3 className={`font-semibold ${locked ? 'text-gray-400' : 'text-gray-900'}`}>{title}</h3>
            {badge}
          </div>
          <p className={`text-sm leading-relaxed ${locked ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function UsersGroupsStep({ groups, setGroups, users, setUsers, savedGroups, setSavedGroups, groupsSaved, setGroupsSaved }) {
  const [savingGroups, setSavingGroups] = useState(false)

  useEffect(() => {
    loadExistingGroups()
  }, [])

  const loadExistingGroups = async () => {
    try {
      const res = await api.get('/api/onboarding/groups/')
      if (res.data.success && res.data.groups.length > 0) {
        setSavedGroups(res.data.groups)
        setGroupsSaved(true)
      }
    } catch {
      // ignore
    }
  }

  const addGroup = () => setGroups([...groups, { name: '', description: '' }])
  const removeGroup = (idx) => setGroups(groups.filter((_, i) => i !== idx))
  const updateGroup = (idx, field, val) => {
    const copy = [...groups]
    copy[idx] = { ...copy[idx], [field]: val }
    setGroups(copy)
  }

  const handleSaveGroups = async () => {
    const validGroups = groups.filter(g => g.name.trim())
    if (validGroups.length === 0) {
      toast.error('Add at least one group name')
      return
    }
    setSavingGroups(true)
    try {
      const res = await api.post('/api/onboarding/users-groups/save/', {
        groups: validGroups,
        users: [],
      })
      if (res.data.success) {
        toast.success('Groups saved!')
        const groupsRes = await api.get('/api/onboarding/groups/')
        if (groupsRes.data.success) {
          setSavedGroups(groupsRes.data.groups)
        }
        setGroupsSaved(true)
      }
    } catch {
      toast.error('Failed to save groups')
    } finally {
      setSavingGroups(false)
    }
  }

  const addUser = () => setUsers([...users, { email: '', full_name: '', group_ids: [] }])
  const removeUser = (idx) => setUsers(users.filter((_, i) => i !== idx))
  const updateUser = (idx, field, val) => {
    const copy = [...users]
    copy[idx] = { ...copy[idx], [field]: val }
    setUsers(copy)
  }

  const toggleUserGroup = (userIdx, groupId) => {
    const copy = [...users]
    const current = copy[userIdx].group_ids || []
    const numId = Number(groupId)
    if (current.includes(numId)) {
      copy[userIdx] = { ...copy[userIdx], group_ids: current.filter(id => id !== numId) }
    } else {
      copy[userIdx] = { ...copy[userIdx], group_ids: [...current, numId] }
    }
    setUsers(copy)
  }

  return (
    <div className="space-y-4">
      {/* ── Part 1: Create Groups ─────────────────────── */}
      <SectionCard
        number="1"
        done={groupsSaved}
        title="Create groups"
        badge={groupsSaved && <Pill>{savedGroups.length} group{savedGroups.length !== 1 ? 's' : ''} saved</Pill>}
        description={'Groups are like departments — agents handle tickets routed to their group (e.g. "Billing", "Technical Support").'}
      >
        <div className="space-y-2.5">
          {groups.map((g, idx) => (
            <div key={idx} className="animate-portalRise flex items-start gap-2">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Group name (e.g. Billing)"
                  aria-label={`Group ${idx + 1} name`}
                  value={g.name}
                  onChange={e => updateGroup(idx, 'name', e.target.value)}
                  className={INPUT}
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  aria-label={`Group ${idx + 1} description`}
                  value={g.description}
                  onChange={e => updateGroup(idx, 'description', e.target.value)}
                  className={INPUT}
                />
              </div>
              {groups.length > 1 && <RemoveButton onClick={() => removeGroup(idx)} label={`Remove group ${idx + 1}`} />}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={addGroup} className="h-10 px-3 -ml-1 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-[#0B3D26] hover:bg-[#EEF6F1] transition-colors">
            <Plus className="w-4 h-4" /> Add another
          </button>
          <button
            onClick={handleSaveGroups}
            disabled={savingGroups}
            className="ml-auto h-10 px-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0B3D26] text-white text-sm font-medium hover:bg-[#072618] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {savingGroups && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {groupsSaved ? 'Update groups' : 'Save groups'}
          </button>
        </div>
      </SectionCard>

      {/* ── Part 2: Invite Agents ─────────────────────── */}
      <SectionCard
        number="2"
        locked={!groupsSaved}
        title="Invite agents"
        badge={!groupsSaved && <Pill tone="amber">Save groups first</Pill>}
        description="Invite team members and assign them to the groups you just created."
      >
        {!groupsSaved ? (
          <div className="flex items-center gap-3 py-4 px-4 rounded-xl border border-dashed border-gray-200">
            <Lock className="w-4 h-4 text-gray-300 shrink-0" />
            <p className="text-sm text-gray-400">Save your groups above to start adding agents.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {users.map((u, idx) => (
                <div key={idx} className="animate-portalRise rounded-xl bg-gray-50/80 ring-1 ring-inset ring-gray-100 p-3 sm:p-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Full name"
                        aria-label={`Agent ${idx + 1} name`}
                        value={u.full_name}
                        onChange={e => updateUser(idx, 'full_name', e.target.value)}
                        className={INPUT}
                      />
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        placeholder="Email address"
                        aria-label={`Agent ${idx + 1} email`}
                        value={u.email}
                        onChange={e => updateUser(idx, 'email', e.target.value)}
                        className={INPUT}
                      />
                    </div>
                    {users.length > 1 && <RemoveButton onClick={() => removeUser(idx)} label={`Remove agent ${idx + 1}`} />}
                  </div>
                  {savedGroups.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">Assign to group</p>
                      <div className="flex flex-wrap gap-1.5">
                        {savedGroups.map(group => {
                          const isChecked = (u.group_ids || []).includes(Number(group.id))
                          return (
                            <button
                              key={group.id}
                              type="button"
                              aria-pressed={isChecked}
                              onClick={() => toggleUserGroup(idx, group.id)}
                              className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-full text-xs font-medium border transition-all duration-150 active:scale-95 ${
                                isChecked
                                  ? 'bg-[#0B3D26] text-white border-[#0B3D26]'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3" strokeWidth={3} />}
                              {group.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addUser} className="mt-3 h-10 px-3 -ml-1 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-[#0B3D26] hover:bg-[#EEF6F1] transition-colors">
              <Plus className="w-4 h-4" /> Add agent
            </button>
          </>
        )}
      </SectionCard>
    </div>
  )
}


const PRIORITY_STYLES = {
  URGENT: { label: 'Urgent', dot: 'bg-red-500' },
  HIGH: { label: 'High', dot: 'bg-orange-500' },
  MEDIUM: { label: 'Medium', dot: 'bg-yellow-500' },
  LOW: { label: 'Low', dot: 'bg-blue-500' },
}

// 90 -> "1h 30m", 1440 -> "1d"
const humanizeMinutes = (mins) => {
  if (!mins) return '—'
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ')
}

function MinutesInput({ label, value, onChange }) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs font-medium text-gray-500 mb-1.5">{label}</span>
      <span className="relative block">
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`${INPUT} pr-12 tabular-nums`}
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">min</span>
      </span>
      <span className="block mt-1 text-xs text-gray-400 tabular-nums">≈ {humanizeMinutes(value)}</span>
    </label>
  )
}

function SLAStep({ enabled, setEnabled, policies, setPolicies }) {
  const updatePolicy = (idx, field, val) => {
    const copy = [...policies]
    copy[idx] = { ...copy[idx], [field]: parseInt(val) || 0 }
    setPolicies(copy)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white">
        <span className="w-10 h-10 rounded-xl bg-[#EEF6F1] text-[#0B3D26] flex items-center justify-center flex-shrink-0">
          <Timer className="w-[18px] h-[18px]" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">SLA tracking</p>
          <p className="text-[13px] text-gray-500">Track response and resolution targets on every ticket.</p>
        </div>
        <Switch checked={enabled} onChange={setEnabled} label="Enable SLA tracking" />
      </div>

      {enabled && (
        <div className="space-y-2.5">
          {policies.map((p, idx) => {
            const style = PRIORITY_STYLES[p.priority] || { label: p.priority, dot: 'bg-gray-400' }
            return (
              <div
                key={p.priority}
                style={{ animationDelay: `${idx * 40}ms` }}
                className="animate-portalRise grid grid-cols-2 sm:grid-cols-[7rem_1fr_1fr] gap-3 items-start p-4 rounded-2xl border border-gray-200 bg-white"
              >
                <div className="col-span-2 sm:col-span-1 flex items-center gap-2 sm:pt-8">
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <span className="text-sm font-semibold text-gray-900">{style.label}</span>
                </div>
                <MinutesInput label="First response" value={p.first_response_time} onChange={(v) => updatePolicy(idx, 'first_response_time', v)} />
                <MinutesInput label="Resolution" value={p.resolution_time} onChange={(v) => updatePolicy(idx, 'resolution_time', v)} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


function EmailsSMTPStep({ smtp, setSmtp }) {
  const update = (field, val) => setSmtp({ ...smtp, [field]: val })

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
          <Server className="w-4 h-4 text-gray-400" /> Server
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-4">
          <Field label="SMTP host">
            <input type="text" autoCapitalize="off" placeholder="smtp.gmail.com" value={smtp.host} onChange={e => update('host', e.target.value)} className={INPUT} />
          </Field>
          <Field label="Port">
            <input type="number" inputMode="numeric" placeholder="587" value={smtp.port} onChange={e => update('port', parseInt(e.target.value) || 587)} className={`${INPUT} tabular-nums`} />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Username">
            <input type="text" autoCapitalize="off" autoComplete="off" placeholder="your@email.com" value={smtp.username} onChange={e => update('username', e.target.value)} className={INPUT} />
          </Field>
          <Field label="Password">
            <input type="password" autoComplete="new-password" placeholder="••••••••" value={smtp.password} onChange={e => update('password', e.target.value)} className={INPUT} />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[['use_tls', 'Use TLS', 'Recommended for port 587'], ['use_ssl', 'Use SSL', 'Usually port 465']].map(([key, label, hint]) => (
            <div key={key} className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-gray-50">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-800">{label}</span>
                <span className="block text-xs text-gray-400">{hint}</span>
              </span>
              <Switch checked={smtp[key]} onChange={(v) => update(key, v)} label={label} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
          <Send className="w-4 h-4 text-gray-400" /> Sender
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="From email">
            <input type="email" inputMode="email" placeholder="noreply@yourcompany.com" value={smtp.default_from_email} onChange={e => update('default_from_email', e.target.value)} className={INPUT} />
          </Field>
          <Field label="Sender name">
            <input type="text" placeholder="Your Company" value={smtp.sender_name} onChange={e => update('sender_name', e.target.value)} className={INPUT} />
          </Field>
          <Field label="Reply-to email" hint="Where customer replies should land." className="sm:col-span-2">
            <input type="email" inputMode="email" placeholder="support@yourcompany.com" value={smtp.reply_to_email} onChange={e => update('reply_to_email', e.target.value)} className={INPUT} />
          </Field>
        </div>
      </section>
    </div>
  )
}


function NotificationsStep({ prefs, setPrefs }) {
  const toggle = (key) => setPrefs({ ...prefs, [key]: !prefs[key] })

  const sections = [
    {
      title: 'Email',
      icon: Mail,
      items: [
        { key: 'email_new_ticket', label: 'New ticket created' },
        { key: 'email_ticket_assigned', label: 'Ticket assigned to you' },
        { key: 'email_ticket_reply', label: 'New reply on your tickets' },
        { key: 'email_ticket_resolved', label: 'Ticket resolved' },
        { key: 'email_sla_breach', label: 'SLA breach warning' },
      ],
    },
    {
      title: 'Browser',
      icon: Bell,
      items: [
        { key: 'browser_new_ticket', label: 'New ticket created' },
        { key: 'browser_ticket_assigned', label: 'Ticket assigned to you' },
        { key: 'browser_ticket_reply', label: 'New reply on your tickets' },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        const Icon = section.icon
        const onCount = section.items.filter(item => prefs[item.key]).length
        return (
          <section key={section.title} style={{ animationDelay: `${i * 60}ms` }} className="animate-portalRise rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 border-b border-gray-100">
              <Icon className="w-4 h-4 text-gray-400" />
              <h3 className="flex-1 text-sm font-semibold text-gray-900">{section.title} notifications</h3>
              <span className="text-xs text-gray-400 tabular-nums">{onCount} on</span>
            </div>
            <ul className="divide-y divide-gray-100">
              {section.items.map(item => (
                <li key={item.key}>
                  <div
                    onClick={() => toggle(item.key)}
                    className="flex items-center justify-between gap-4 px-4 sm:px-5 min-h-[52px] cursor-pointer hover:bg-gray-50/70 transition-colors"
                  >
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <span onClick={e => e.stopPropagation()}>
                      <Switch checked={prefs[item.key]} onChange={() => toggle(item.key)} label={`${section.title}: ${item.label}`} />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}


function SuccessScreen({ onComplete, completedCount }) {
  useEffect(() => {
    const colors = ['#0B3D26', '#9b59b6', '#ffd700', '#ff6b6b', '#4ecdc4', '#EEF6F1', '#45b7d1', '#ff9f43']
    const defaults = { colors, origin: { y: 0.65 } }

    const fire = (ratio, opts) =>
      confetti({ ...defaults, ...opts, particleCount: Math.floor(180 * ratio) })

    fire(0.25, { spread: 26, startVelocity: 55 })
    fire(0.20, { spread: 60 })
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
    fire(0.10, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
    fire(0.10, { spread: 120, startVelocity: 45 })

    // second burst after a short delay for a lingering feel
    const t = setTimeout(() => {
      fire(0.15, { spread: 80, startVelocity: 40 })
      fire(0.10, { spread: 50, startVelocity: 55 })
    }, 600)

    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-full flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="relative mb-8 animate-portalPop">
        <div aria-hidden="true" className="absolute -inset-4 rounded-full bg-[#0B3D26]/[0.06]" />
        <div aria-hidden="true" className="absolute -inset-2 rounded-full bg-[#0B3D26]/[0.08]" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#0B3D26] to-[#1E5C3A] flex items-center justify-center shadow-xl shadow-[#0B3D26]/25">
          <Check className="w-10 h-10 text-white" strokeWidth={3} />
        </div>
      </div>

      <div className="animate-portalRise" style={{ animationDelay: '120ms' }}>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium text-gray-900">You're all set</h1>
        <p className="mt-3 text-[15px] text-gray-500 max-w-sm mx-auto leading-relaxed">
          Your workspace is live and ready. Head to the dashboard to start managing tickets.
        </p>
        <p className="mt-2 text-xs text-gray-400 tabular-nums">{completedCount} of {STEPS.length} steps saved · finish the rest anytime in Settings</p>

        <button onClick={onComplete} className={`${PRIMARY_BTN} mt-8 w-full sm:w-auto px-8`}>
          Go to dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
