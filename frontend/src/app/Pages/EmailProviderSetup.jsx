import React, { useState } from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import toast from 'react-hot-toast'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import Select from '../components/SearchableSelect'
import { THEME } from '../constants/theme'

export default function EmailProviderSetup({ provider_id = 'imap', is_connected = false, config = {}, connected_mailboxes = [] }) {
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const [currentStep, setCurrentStep] = useState(is_connected ? 3 : 1)
  const [isConnected, setIsConnected] = useState(is_connected)
  const [testingConnection, setTestingConnection] = useState(false)
  const [mailboxes, setMailboxes] = useState(connected_mailboxes)
  const [disconnecting, setDisconnecting] = useState(false)

  const { data, setData, post, processing } = useForm({
    email: config.email || '',
    password: config.password || '',
    imap_host: config.imap_host || '',
    imap_port: config.imap_port || '993',
    enable_smtp: config.enable_smtp ?? false,
    smtp_host: config.smtp_host || '',
    smtp_port: config.smtp_port || '587',
    use_ssl: config.use_ssl ?? true,
    auto_create_tickets: config.auto_create_tickets ?? true,
    auto_reply: config.auto_reply ?? true,
    default_priority: config.default_priority || 'normal',
  })

  const handleIMAPConnect = async () => {
    if (!data.email || !data.password || !data.imap_host) {
      toast.error('Please fill in email, password, and IMAP host')
      return
    }

    if (data.enable_smtp && !data.smtp_host) {
      toast.error('Please fill in SMTP host when outgoing email is enabled')
      return
    }

    setTestingConnection(true)
    try {
      const response = await api.post('/api/integrations/custom-imap/connect/', data)
      const result = response.data
      if (result.success) {
        setIsConnected(true)
        setMailboxes([...mailboxes, {
          id: result.mailbox_id,
          email: data.email,
          display_name: data.email.split('@')[0],
          imap_host: data.imap_host,
        }])
        setCurrentStep(2)
        toast.success('Connected successfully!')
      } else {
        toast.error(result.error || 'Failed to connect')
      }
    } catch (error) {
      toast.error('Connection failed')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleDisconnect = async (mailboxId) => {
    if (disconnecting) return
    setDisconnecting(true)
    try {
      const response = await api.post('/api/integrations/custom-imap/disconnect/', { mailbox_id: mailboxId })
      const result = response.data
      if (result.status === 'success') {
        const remaining = mailboxes.filter(mb => mb.id !== mailboxId)
        setMailboxes(remaining)
        if (remaining.length === 0) {
          setIsConnected(false)
          setCurrentStep(1)
          setData({ ...data, email: '', password: '', imap_host: '', imap_port: '993', enable_smtp: false, smtp_host: '', smtp_port: '587' })
        }
        toast.success('Mailbox disconnected successfully')
      } else {
        toast.error(result.message || 'Failed to disconnect')
      }
    } catch (error) {
      toast.error('Failed to disconnect mailbox')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleNextStep = () => {
    if (currentStep === 1 && !isConnected) {
      toast.error('Please connect your email account first')
      return
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    toast.promise(
      new Promise((resolve, reject) => {
        post('/api/integrations/custom-imap/configure/', {
          preserveScroll: true,
          onSuccess: () => resolve(),
          onError: () => reject(),
        })
      }),
      {
        loading: 'Saving configuration...',
        success: 'Email integration configured successfully!',
        error: 'Configuration failed',
      }
    )
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      const response = await api.post('/api/integrations/custom-imap/test/')
      const result = response.data
      if (result.success) {
        toast.success('Connection test successful!')
      } else {
        toast.error(result.error || 'Connection test failed')
      }
    } catch (error) {
      toast.error('Connection test failed')
    } finally {
      setTestingConnection(false)
    }
  }

  return (
    <>
      <Head title="Custom IMAP/SMTP Integration - Settings" />
      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="channels" />}

          <main className="flex-1 bg-gray-50">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {!sidenavOpen && (
                  <button className="p-2 rounded-md hover:bg-gray-100" onClick={() => setSidenavOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-500">
                      <path d="M13.5 6 21 12l-7.5 6v-4.5H3v-3h10.5V6z"/>
                    </svg>
                  </button>
                )}
                <Link href="/settings/channels/" className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Back to Channels">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-500">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="4" width="20" height="16" rx="2" fill="white" fillOpacity="0.3"/>
                      <path d="M2 8L12 14L22 8" stroke="white" strokeWidth="1.5"/>
                      <path d="M6 17H18" stroke="white" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2"/>
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-800">Custom IMAP/SMTP Integration</h1>
                    <p className="text-sm text-gray-600">Configure IMAP/SMTP settings manually</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200 text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Connected
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200 text-sm">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    Not Connected
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-0">
              {/* Step Sidebar */}
              <div className="w-64 flex-shrink-0 border-r border-gray-200 p-6">
                <div className="sticky top-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-6">Setup Steps</h3>
                  <div className="space-y-4">
                    {[
                      { num: 1, title: 'Connect Account', desc: 'Enter IMAP credentials' },
                      { num: 2, title: 'Configure Settings', desc: 'Set up email routing' },
                      { num: 3, title: 'Test & Complete', desc: 'Verify setup works' },
                    ].map((step, idx) => (
                      <React.Fragment key={step.num}>
                        {idx > 0 && (
                          <div className="flex items-center gap-3">
                            <div className="w-8 flex justify-center">
                              <div className={`w-0.5 h-8 ${currentStep > step.num - 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            </div>
                          </div>
                        )}
                        <div
                          className={`flex items-start gap-3 ${isConnected || step.num === 1 ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                          onClick={() => (isConnected || step.num === 1) && setCurrentStep(step.num)}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                            currentStep === step.num ? 'bg-gray-900 text-white' : currentStep > step.num ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {currentStep > step.num ? '✓' : step.num}
                          </div>
                          <div className="flex-1 pt-1">
                            <h4 className={`text-sm font-medium ${currentStep === step.num ? 'text-gray-900' : currentStep > step.num ? 'text-green-600' : 'text-gray-500'}`}>
                              {step.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-blue-900">Tip</h4>
                        <p className="text-xs text-blue-700 mt-1">Use an app-specific password for better security.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 p-6">
                <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

                  {/* Step 1: Connect */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">Connect Your Account</h2>
                        <p className="text-sm text-gray-600">Enter your IMAP/SMTP credentials to connect.</p>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                              <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)}
                                placeholder="your-email@domain.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                              <input type="password" value={data.password} onChange={(e) => setData('password', e.target.value)}
                                placeholder="Enter password"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">IMAP Settings (Incoming)</h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Host <span className="text-red-500">*</span></label>
                                <input type="text" value={data.imap_host} onChange={(e) => setData('imap_host', e.target.value)}
                                  placeholder="imap.domain.com"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                                <input type="text" value={data.imap_port} onChange={(e) => setData('imap_port', e.target.value)}
                                  placeholder="993"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                              </div>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">SMTP Settings (Outgoing)</h4>
                                <p className="text-xs text-gray-500">Optional - Enable to send emails from this mailbox</p>
                              </div>
                              <button type="button" onClick={() => setData('enable_smtp', !data.enable_smtp)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                                  data.enable_smtp ? 'bg-blue-600' : 'bg-gray-200'
                                }`}>
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                  data.enable_smtp ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                              </button>
                            </div>
                            {data.enable_smtp && (
                              <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host <span className="text-red-500">*</span></label>
                                  <input type="text" value={data.smtp_host} onChange={(e) => setData('smtp_host', e.target.value)}
                                    placeholder="smtp.domain.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                                  <input type="text" value={data.smtp_port} onChange={(e) => setData('smtp_port', e.target.value)}
                                    placeholder="587"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="use_ssl" checked={data.use_ssl} onChange={(e) => setData('use_ssl', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                            <label htmlFor="use_ssl" className="text-sm text-gray-700">Use SSL/TLS encryption</label>
                          </div>

                          {!isConnected ? (
                            <button type="button" onClick={handleIMAPConnect} disabled={testingConnection}
                              className={`w-full px-4 py-2.5 ${THEME.button.primary} rounded-lg font-medium`}>
                              {testingConnection ? 'Testing Connection...' : 'Test & Connect'}
                            </button>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-lg border border-green-200">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Connected Successfully
                              </div>
                              {mailboxes.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="text-sm font-medium text-gray-700 mb-3">Connected Mailboxes</h4>
                                  <div className="space-y-2">
                                    {mailboxes.map((mailbox) => (
                                      <div key={mailbox.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                            </svg>
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-900">{mailbox.email}</p>
                                            {mailbox.imap_host && <p className="text-xs text-gray-500">{mailbox.imap_host}</p>}
                                          </div>
                                        </div>
                                        <button type="button" onClick={() => handleDisconnect(mailbox.id)} disabled={disconnecting}
                                          className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50">
                                          {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-gray-200">
                        <button type="button" onClick={handleNextStep} disabled={!isConnected}
                          className={`px-6 py-2.5 ${THEME.button.primary} rounded-lg font-medium inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed`}>
                          Next: Configure Settings
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Configure */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">Configure Settings</h2>
                        <p className="text-sm text-gray-600">Customize how emails are processed and converted to tickets.</p>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-4">Ticket Settings</h3>
                          <div className="space-y-4">
                            <label className="flex items-start gap-3">
                              <input type="checkbox" checked={data.auto_create_tickets} onChange={(e) => setData('auto_create_tickets', e.target.checked)}
                                className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              <div>
                                <span className="text-sm font-medium text-gray-900">Auto-create tickets</span>
                                <p className="text-xs text-gray-500">Automatically create tickets from incoming emails</p>
                              </div>
                            </label>
                            <label className="flex items-start gap-3">
                              <input type="checkbox" checked={data.auto_reply} onChange={(e) => setData('auto_reply', e.target.checked)}
                                className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              <div>
                                <span className="text-sm font-medium text-gray-900">Send auto-reply</span>
                                <p className="text-xs text-gray-500">Send confirmation email when ticket is created</p>
                              </div>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Default Priority</label>
                          <Select value={data.default_priority} onChange={(val) => setData('default_priority', val)}
                            options={[
                              { id: 'low', name: 'Low' },
                              { id: 'normal', name: 'Normal' },
                              { id: 'high', name: 'High' },
                              { id: 'urgent', name: 'Urgent' },
                            ]}
                            placeholder="Select priority" allowClear={false} />
                        </div>
                      </div>

                      <div className="flex justify-between pt-4 border-t border-gray-200">
                        <button type="button" onClick={handlePrevStep}
                          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium inline-flex items-center hover:bg-gray-50">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          Back
                        </button>
                        <button type="button" onClick={handleNextStep}
                          className={`px-6 py-2.5 ${THEME.button.primary} rounded-lg font-medium inline-flex items-center`}>
                          Next: Test & Complete
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Test & Complete */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">Test & Complete</h2>
                        <p className="text-sm text-gray-600">Verify your connection works and save your configuration.</p>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                        <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-100">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-green-900">Connection Ready</h4>
                            <p className="text-sm text-green-700 mt-1">Your IMAP account is connected and ready to receive emails.</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Test Connection</h4>
                          <button type="button" onClick={handleTestConnection} disabled={testingConnection}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                            {testingConnection ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Testing...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Test Connection
                              </>
                            )}
                          </button>
                        </div>

                        <div className="border-t pt-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Configuration Summary</h4>
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-gray-500">Auto-create tickets</dt>
                              <dd className="text-gray-900">{data.auto_create_tickets ? 'Enabled' : 'Disabled'}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">Auto-reply</dt>
                              <dd className="text-gray-900">{data.auto_reply ? 'Enabled' : 'Disabled'}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">Default priority</dt>
                              <dd className="text-gray-900 capitalize">{data.default_priority}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>

                      <div className="flex justify-between pt-4 border-t border-gray-200">
                        <button type="button" onClick={handlePrevStep}
                          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium inline-flex items-center hover:bg-gray-50">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          Back
                        </button>
                        <button type="submit" disabled={processing}
                          className={`px-6 py-2.5 ${THEME.button.primary} rounded-lg font-medium inline-flex items-center`}>
                          {processing ? 'Saving...' : 'Save & Complete'}
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </main>
        </div>
      </AppShell>
    </>
  )
}
