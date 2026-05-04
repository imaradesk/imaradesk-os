import React, { useState, useEffect, useCallback } from 'react'
import { Head, router } from '@inertiajs/react'
import api from '../../utils/axios'
import toast from 'react-hot-toast'
import {
  Boxes, Users, Shield, Mail, Bell, Radio,
  Check, ChevronRight, ChevronLeft, Loader2,
  Sparkles, SkipForward, Plus, Trash2, Rocket, AlertTriangle
} from 'lucide-react'

const STEPS = [
  { id: 1, key: 'modules', title: 'Modules', description: 'Activate the modules you need', icon: Boxes },
  { id: 2, key: 'channels', title: 'Channels', description: 'Configure support channels', icon: Radio },
  { id: 3, key: 'users_groups', title: 'Users & Groups', description: 'Create teams and add agents', icon: Users },
  { id: 4, key: 'sla', title: 'SLA Policies', description: 'Set response & resolution targets', icon: Shield },
  { id: 5, key: 'emails_smtp', title: 'Emails & SMTP', description: 'Configure email delivery', icon: Mail },
  { id: 6, key: 'notifications', title: 'Notifications', description: 'Choose what alerts you receive', icon: Bell },
]

export default function QuickStart() {
  const [currentStep, setCurrentStep] = useState(1)
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
    { priority: 'CRITICAL', first_response_time: 30, resolution_time: 240 },
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
        setStepsCompleted(data.steps || {})
        setCurrentStep(data.current_step || 1)
        if (data.is_complete) {
          router.visit('/dashboard/')
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
        setChannels(res.data.channels)
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
          setCurrentStep(currentStep + 1)
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
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1)
      } else {
        setShowSuccess(true)
      }
    } catch {
      if (currentStep < 5) setCurrentStep(currentStep + 1)
      else setShowSuccess(true)
    }
  }

  const handleComplete = async () => {
    try {
      await api.post('/api/onboarding/complete/')
    } catch {
      // ignore
    }
    toast.success('Setup complete! Welcome to ImaraDesk.')
    router.visit('/dashboard/')
  }

  if (initialLoading) {
    return (
      <>
        <Head title="Quick Start" />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#4a154b]" />
        </div>
      </>
    )
  }

  return (
    <>
      <Head title="Quick Start - Setup Your Workspace" />
      <div className="min-h-screen bg-gray-50">
        {/* Top bar */}
        <div className="bg-[#4a154b] border-b">
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                <Rocket className="w-5 h-5" />
                Quick Start
              </h1>
              <p className="text-purple-200 text-sm mt-1">Set up your workspace in a few simple steps</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-purple-200 text-sm">Step {currentStep} of 6</span>
              <button
                onClick={handleComplete}
                className="text-sm text-purple-200 hover:text-white transition-colors underline underline-offset-2"
              >
                Skip Setup
              </button>
            </div>
          </div>
        </div>

        {showSuccess ? (
          <div className="max-w-5xl mx-auto px-6">
            <SuccessScreen onComplete={handleComplete} />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex gap-8">
              {/* Left sidebar - Step navigation */}
              <div className="w-64 shrink-0">
                <div className="sticky top-8">
                  <nav className="space-y-1">
                    {STEPS.map((step) => {
                      const Icon = step.icon
                      const isActive = currentStep === step.id
                      const isDone = stepsCompleted[step.id]
                      return (
                        <button
                          key={step.id}
                          onClick={() => setCurrentStep(step.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                            isActive
                              ? 'bg-white shadow-sm border border-[#4a154b]/20'
                              : 'hover:bg-white/60'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isDone
                              ? 'bg-green-100'
                              : isActive
                                ? 'bg-[#4a154b] text-white'
                                : 'bg-gray-200'
                          }`}>
                            {isDone
                              ? <Check className="w-4 h-4 text-green-600" />
                              : <Icon className={`w-4 h-4 ${isActive ? '' : 'text-gray-500'}`} />
                            }
                          </div>
                          <div className="min-w-0">
                            <div className={`text-sm font-medium ${
                              isActive ? 'text-gray-900' : isDone ? 'text-green-700' : 'text-gray-600'
                            }`}>
                              {step.title}
                            </div>
                            <div className="text-xs text-gray-400 truncate">{step.description}</div>
                          </div>
                        </button>
                      )
                    })}
                  </nav>

                  {/* Progress */}
                  <div className="mt-6 px-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>Progress</span>
                      <span>{Object.values(stepsCompleted).filter(Boolean).length}/6</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-[#4a154b] h-1.5 rounded-full transition-all"
                        style={{ width: `${(Object.values(stepsCompleted).filter(Boolean).length / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Step content */}
                  <div className="p-8">
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

                  {/* Footer */}
                  <div className="px-8 py-4 border-t bg-gray-50 flex items-center justify-between">
                    <div>
                      {currentStep > 1 && (
                        <button
                          onClick={() => setCurrentStep(currentStep - 1)}
                          className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSkip}
                        className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <SkipForward className="w-4 h-4" /> Set up Later
                      </button>
                      <button
                        onClick={handleSaveStep}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#4a154b] text-white rounded-lg hover:bg-[#3a1040] transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {currentStep === 6 ? 'Finish Setup' : 'Save & Continue'}
                        {currentStep < 6 && !loading && <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}


/* ============================================================
   Step Components
   ============================================================ */

function ModulesStep({ apps, selectedApps, toggleApp }) {
  const ICON_MAP = {
    'ticket-management': '🎫', 'tasks-projects': '✅', 'knowledge-base': '📚',
    'asset-management': '💻', 'surveys': '📊', 'email-to-ticket': '📧',
    'ai-assistant': '🤖', 'customer-portal': '🌐', 'sla-management': '⏱️',
    'automation': '⚡', 'analytics': '📈',
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Activate Modules</h3>
      <p className="text-sm text-gray-500 mb-5">Choose which modules to enable for your workspace. You can change this later in Settings.</p>
      <div className="grid grid-cols-2 gap-3">
        {apps.map(app => {
          const isSelected = selectedApps.includes(app.id)
          return (
            <button
              key={app.id}
              onClick={() => toggleApp(app.id)}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? 'border-[#4a154b] bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className="text-2xl shrink-0">{ICON_MAP[app.slug] || '📦'}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{app.name}</span>
                  {app.is_free && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Free</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{app.description}</p>
              </div>
              <div className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                isSelected ? 'bg-[#4a154b] border-[#4a154b]' : 'border-gray-300'
              }`}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}


function ChannelsStep({ channels, setChannels }) {
  const CHANNEL_ICONS = {
    'web': '🌐',
    'email': '📧',
    'microsoft365': '📨',
    'api': '🔌',
    'slack': '💬',
    'teams': '👥',
  }

  const toggleChannel = (channelId) => {
    setChannels(channels.map(ch => 
      ch.id === channelId ? { ...ch, is_activated: !ch.is_activated } : ch
    ))
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Configure Channels</h3>
      <p className="text-sm text-gray-500 mb-5">Enable channels through which customers can submit tickets. You can configure additional settings for each channel later.</p>
      <div className="space-y-3">
        {channels.map(channel => {
          const isActive = channel.is_activated
          return (
            <button
              key={channel.id}
              onClick={() => toggleChannel(channel.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all ${
                isActive
                  ? 'border-[#4a154b] bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className="text-2xl shrink-0">{CHANNEL_ICONS[channel.slug] || '📡'}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{channel.name}</span>
                  {channel.slug === 'web' && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Recommended</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{channel.description || `Accept tickets via ${channel.name}`}</p>
              </div>
              <div className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                isActive ? 'bg-[#4a154b] border-[#4a154b]' : 'border-gray-300'
              }`}>
                {isActive && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          )
        })}
      </div>
      {channels.filter(c => c.is_activated).length === 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">Enable at least one channel to allow customers to submit tickets.</p>
        </div>
      )}
    </div>
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

  const availableGroups = savedGroups.length > 0 ? savedGroups : []

  return (
    <div className="space-y-8">
      {/* Groups */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-gray-900">Groups</h3>
          {groupsSaved && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
              <Check className="w-3 h-3" /> Groups saved
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">Create support groups to organize your team (e.g. "Billing", "Technical Support"). Save groups first, then add agents below.</p>
        <div className="space-y-3">
          {groups.map((g, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input type="text" placeholder="Group name" value={g.name}
                onChange={e => updateGroup(idx, 'name', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-transparent outline-none" />
              <input type="text" placeholder="Description (optional)" value={g.description}
                onChange={e => updateGroup(idx, 'description', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-transparent outline-none" />
              {groups.length > 1 && (
                <button onClick={() => removeGroup(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button onClick={addGroup} className="flex items-center gap-1 text-sm text-[#4a154b] hover:text-[#3a1040] font-medium">
            <Plus className="w-4 h-4" /> Add Group
          </button>
          <button onClick={handleSaveGroups} disabled={savingGroups}
            className="flex items-center gap-1 px-4 py-1.5 text-sm bg-[#4a154b] text-white rounded-lg hover:bg-[#3a1040] transition-colors font-medium disabled:opacity-50">
            {savingGroups ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Save Groups
          </button>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Agents */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Add Agents</h3>
        <p className="text-sm text-gray-500 mb-4">Add team members who will handle support tickets. They'll be assigned to your organization automatically.</p>
        <div className="space-y-4">
          {users.map((u, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
              <div className="flex items-center gap-3 mb-3">
                <input type="text" placeholder="Full name" value={u.full_name}
                  onChange={e => updateUser(idx, 'full_name', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-transparent outline-none" />
                <input type="email" placeholder="Email address" value={u.email}
                  onChange={e => updateUser(idx, 'email', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-transparent outline-none" />
                {users.length > 1 && (
                  <button onClick={() => removeUser(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
              {availableGroups.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Assign to groups</label>
                  <div className="flex flex-wrap gap-2">
                    {availableGroups.map(group => {
                      const isChecked = (u.group_ids || []).includes(Number(group.id))
                      return (
                        <label key={group.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all ${
                            isChecked ? 'bg-[#4a154b] text-white border-[#4a154b]' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                          }`}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggleUserGroup(idx, group.id)} className="sr-only" />
                          {isChecked && <Check className="w-3 h-3" />}
                          {group.name}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              {availableGroups.length === 0 && !groupsSaved && (
                <p className="text-xs text-gray-400 italic">Save groups above first to assign agents to groups</p>
              )}
            </div>
          ))}
        </div>
        <button onClick={addUser} className="mt-3 flex items-center gap-1 text-sm text-[#4a154b] hover:text-[#3a1040] font-medium">
          <Plus className="w-4 h-4" /> Add Agent
        </button>
      </div>
    </div>
  )
}


function SLAStep({ enabled, setEnabled, policies, setPolicies }) {
  const updatePolicy = (idx, field, val) => {
    const copy = [...policies]
    copy[idx] = { ...copy[idx], [field]: parseInt(val) || 0 }
    setPolicies(copy)
  }

  const priorityColors = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-blue-100 text-blue-700',
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">SLA Policies</h3>
      <p className="text-sm text-gray-500 mb-5">Define response and resolution time targets for tickets by priority level.</p>

      <label className="flex items-center gap-3 mb-6 cursor-pointer">
        <div onClick={() => setEnabled(!enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-[#4a154b]' : 'bg-gray-300'}`}>
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
        </div>
        <span className="text-sm font-medium text-gray-700">Enable SLA Tracking</span>
      </label>

      {enabled && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">First Response (min)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Resolution Time (min)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {policies.map((p, idx) => (
                <tr key={p.priority}>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${priorityColors[p.priority]}`}>{p.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="1" value={p.first_response_time}
                      onChange={e => updatePolicy(idx, 'first_response_time', e.target.value)}
                      className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-transparent outline-none" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="1" value={p.resolution_time}
                      onChange={e => updatePolicy(idx, 'resolution_time', e.target.value)}
                      className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-transparent outline-none" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


function EmailsSMTPStep({ smtp, setSmtp }) {
  const update = (field, val) => setSmtp({ ...smtp, [field]: val })

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Email & SMTP Configuration</h3>
      <p className="text-sm text-gray-500 mb-5">Configure SMTP settings so ImaraDesk can send emails on your behalf. Skip if you'll use the default settings.</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
          <input type="text" placeholder="smtp.gmail.com" value={smtp.host} onChange={e => update('host', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
          <input type="number" placeholder="587" value={smtp.port} onChange={e => update('port', parseInt(e.target.value) || 587)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input type="text" placeholder="your@email.com" value={smtp.username} onChange={e => update('username', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input type="password" placeholder="••••••••" value={smtp.password} onChange={e => update('password', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
          <input type="email" placeholder="noreply@yourcompany.com" value={smtp.default_from_email} onChange={e => update('default_from_email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
          <input type="text" placeholder="Your Company" value={smtp.sender_name} onChange={e => update('sender_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reply-To Email</label>
          <input type="email" placeholder="support@yourcompany.com" value={smtp.reply_to_email} onChange={e => update('reply_to_email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-transparent outline-none" />
        </div>
        <div className="flex items-end gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={smtp.use_tls} onChange={e => update('use_tls', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]" />
            <span className="text-sm text-gray-700">Use TLS</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={smtp.use_ssl} onChange={e => update('use_ssl', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]" />
            <span className="text-sm text-gray-700">Use SSL</span>
          </label>
        </div>
      </div>
    </div>
  )
}


function NotificationsStep({ prefs, setPrefs }) {
  const toggle = (key) => setPrefs({ ...prefs, [key]: !prefs[key] })

  const sections = [
    {
      title: 'Email Notifications',
      items: [
        { key: 'email_new_ticket', label: 'New ticket created' },
        { key: 'email_ticket_assigned', label: 'Ticket assigned to you' },
        { key: 'email_ticket_reply', label: 'New reply on your tickets' },
        { key: 'email_ticket_resolved', label: 'Ticket resolved' },
        { key: 'email_sla_breach', label: 'SLA breach warning' },
      ],
    },
    {
      title: 'Browser Notifications',
      items: [
        { key: 'browser_new_ticket', label: 'New ticket created' },
        { key: 'browser_ticket_assigned', label: 'Ticket assigned to you' },
        { key: 'browser_ticket_reply', label: 'New reply on your tickets' },
      ],
    },
  ]

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Notification Preferences</h3>
      <p className="text-sm text-gray-500 mb-5">Choose which notifications you want to receive. You can change these anytime in Settings.</p>

      <div className="space-y-6 max-w-lg">
        {sections.map(section => (
          <div key={section.title}>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">{section.title}</h4>
            <div className="space-y-2">
              {section.items.map(item => (
                <label key={item.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <div onClick={() => toggle(item.key)}
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${prefs[item.key] ? 'bg-[#4a154b]' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs[item.key] ? 'translate-x-5' : ''}`} />
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


function SuccessScreen({ onComplete }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <Check className="w-10 h-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
      <p className="text-gray-500 text-center max-w-md mb-8">
        Your workspace is configured and ready to go. You can always adjust these settings later from the Settings page.
      </p>
      <button onClick={onComplete}
        className="px-8 py-3 bg-[#4a154b] text-white rounded-lg hover:bg-[#3a1040] transition-colors font-medium text-sm">
        Go to Dashboard
      </button>
    </div>
  )
}
