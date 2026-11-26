import React, { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import { SettingsHeading } from '../components/settings/SettingsPage'
import Drawer, { DrawerBody, DrawerFooter } from '../components/Drawer'
import Select from '../components/SearchableSelect'
import { THEME } from '../constants/theme'
import toast from 'react-hot-toast'

const ENCRYPTION_OPTIONS = [
  { id: 'tls', name: 'TLS (Recommended)' },
  { id: 'ssl', name: 'SSL' },
  { id: 'none', name: 'None' },
]

export default function EmailsSMTP({ smtp_config = {}, auth = {} }) {
  const [smtpEnabled, setSmtpEnabled] = useState(smtp_config.enabled || false)
  const [smtpActive, setSmtpActive] = useState(smtp_config.active !== false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [testDrawerOpen, setTestDrawerOpen] = useState(false)
  const [testEmail, setTestEmail] = useState(auth?.user?.email || '')
  
  // Check if SMTP is configured (has host)
  const isConfigured = Boolean(smtp_config.host)

  useEffect(() => {
    setSmtpEnabled(smtp_config.enabled || false)
    setSmtpActive(smtp_config.active !== false)
  }, [smtp_config.enabled, smtp_config.active])
  
  // Form state
  const [formData, setFormData] = useState({
    host: smtp_config.host || '',
    port: smtp_config.port || '587',
    username: smtp_config.username || '',
    password: '',
    encryption: smtp_config.use_ssl ? 'ssl' : (smtp_config.use_tls !== false ? 'tls' : 'none'),
    from_email: smtp_config.from_email || '',
    from_name: smtp_config.from_name || '',
  })

  const hasExistingPassword = smtp_config.has_password || false

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const getPayload = () => ({
    enabled: smtpEnabled,
    active: smtpActive,
    host: formData.host,
    port: formData.port,
    username: formData.username,
    password: formData.password,
    use_tls: formData.encryption === 'tls',
    use_ssl: formData.encryption === 'ssl',
    from_email: formData.from_email,
    from_name: formData.from_name,
  })

  const openTestDrawer = () => {
    if (!formData.host || !formData.port || !formData.username || !formData.from_email) {
      toast.error('Please fill in all required fields before testing.')
      return
    }
    
    if (!formData.password && !hasExistingPassword) {
      toast.error('Password is required to test the connection.')
      return
    }
    
    setTestDrawerOpen(true)
  }

  const handleTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Please enter a valid email address.')
      return
    }

    setIsTesting(true)
    try {
      const response = await api.post('/administration/emails/smtp/test/', {
        ...getPayload(),
        test_email: testEmail,
      })

      const data = response.data
      
      if (data.success) {
        toast.success(data.message)
        setTestDrawerOpen(false)
      } else {
        toast.error(data.message || 'Test failed')
      }
    } catch (error) {
      toast.error('Failed to test connection. Please try again.')
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    
    if (smtpEnabled && (!formData.host || !formData.port || !formData.username || !formData.from_email)) {
      toast.error('Please fill in all required fields.')
      return
    }

    setIsSaving(true)
    try {
      const response = await api.post('/administration/emails/smtp/save/', getPayload())

      const data = response.data
      
      if (data.success) {
        toast.success(data.message)
        // Clear password field after save (it's stored encrypted)
        setFormData(prev => ({ ...prev, password: '' }))
        setDrawerOpen(false)
        // Reload to get updated config
        window.location.reload()
      } else {
        toast.error(data.message || 'Save failed')
      }
    } catch (error) {
      toast.error('Failed to save configuration. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleEnabled = async () => {
    const newEnabled = !smtpEnabled
    
    // If enabling and not configured, prompt to configure first
    if (newEnabled && !isConfigured) {
      toast.error('Please configure SMTP settings first.')
      setDrawerOpen(true)
      return
    }
    
    setSmtpEnabled(newEnabled)
    
    // Auto-save only the enabled state
    try {
      await api.post('/administration/emails/smtp/save/', {
        enabled: newEnabled,
      })
      toast.success(newEnabled ? 'Custom SMTP enabled' : 'Custom SMTP disabled')
    } catch (error) {
      // Revert on error
      setSmtpEnabled(!newEnabled)
      toast.error('Failed to update setting')
    }
  }

  return (
    <>
      <Head title="SMTP Configuration - Settings" />
      <AppShell active="settings" fixedHeight>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          
          <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex flex-wrap items-center gap-3">
              <SettingsHeading section="emails-smtp">SMTP Configuration</SettingsHeading>
            </div>

            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full">
              {/* Info Box */}
              <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">SMTP Configuration</h3>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      <strong>SMTP (Simple Mail Transfer Protocol)</strong> is used to send outgoing emails from your helpdesk. Configure these settings to:
                    </p>
                    <ul className="mt-2 ml-4 text-sm text-blue-800 space-y-1 list-disc">
                      <li><strong>Send ticket notifications</strong> — Automatically notify customers and agents about ticket updates</li>
                      <li><strong>Use your own domain</strong> — Send emails from your company's email address for professional communication</li>
                      <li><strong>Ensure delivery</strong> — Properly configured SMTP improves email deliverability and avoids spam filters</li>
                    </ul>
                    <p className="text-sm text-blue-800 mt-2">
                      <strong>Tip:</strong> Use TLS encryption for secure email transmission. Common ports are 587 (TLS) or 465 (SSL).
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-6">
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Enable Custom SMTP</h3>
                      <p className="text-sm text-gray-500 mt-1">Use your own SMTP server instead of the default email service</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleEnabled}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0B3D26] focus:ring-offset-2 ${
                        smtpEnabled ? 'bg-[#0B3D26]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          smtpEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

              {smtpEnabled && !isConfigured && (
                <div className="text-center py-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500 mb-4">No SMTP server configured yet.</p>
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className={`${THEME.button.primary} px-4 py-2 rounded-lg inline-flex items-center gap-2`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add SMTP
                  </button>
                </div>
              )}

              {smtpEnabled && isConfigured && (
                <div className="space-y-4">
                  {/* Status Badge */}
                  {!smtpActive && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm text-yellow-800">SMTP is deactivated. Emails will use system default.</span>
                    </div>
                  )}

                  {/* Current Configuration Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                      <p className={`text-sm font-medium ${smtpActive ? 'text-green-600' : 'text-yellow-600'}`}>
                        {smtpActive ? '● Active' : '○ Inactive'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Server</p>
                      <p className="text-sm font-medium text-gray-900">{smtp_config.host}:{smtp_config.port}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Encryption</p>
                      <p className="text-sm font-medium text-gray-900">
                        {smtp_config.use_ssl ? 'SSL' : smtp_config.use_tls ? 'TLS' : 'None'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Username</p>
                      <p className="text-sm font-medium text-gray-900">{smtp_config.username}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">From Email</p>
                      <p className="text-sm font-medium text-gray-900">{smtp_config.from_email}</p>
                    </div>
                    {smtp_config.from_name && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">From Name</p>
                        <p className="text-sm font-medium text-gray-900">{smtp_config.from_name}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setDrawerOpen(true)}
                      className={`${THEME.button.primary} px-4 py-2 rounded-lg inline-flex items-center gap-2`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Configuration
                    </button>
                  </div>
                </div>
              )}

              {!smtpEnabled && (
                <div className="text-center py-8 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Custom SMTP is disabled. Enable it above to configure your own email server.</p>
                </div>
              )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* SMTP Configuration Drawer */}
      <Drawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        title={isConfigured ? "Edit SMTP Configuration" : "Add SMTP Configuration"}
        size="sm"
        floating
      >
        <form onSubmit={handleSave} className="flex flex-col h-full">
          <DrawerBody>
            <div className="space-y-5">
              {/* Active/Inactive Toggle in Drawer (only show when editing) */}
              {isConfigured && (
                <div className="flex items-center justify-between pb-5 border-b border-gray-200">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Active</h3>
                    <p className="text-xs text-gray-500 mt-1">Deactivate to temporarily pause this SMTP config</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSmtpActive(!smtpActive)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0B3D26] focus:ring-offset-2 ${
                      smtpActive ? 'bg-[#0B3D26]' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        smtpActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Host <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="host"
                  value={formData.host}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]"
                  placeholder="smtp.gmail.com"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Port <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="port"
                    value={formData.port}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]"
                    placeholder="587"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Encryption
                  </label>
                  <Select
                    value={formData.encryption}
                    onChange={(value) => setFormData(prev => ({ ...prev, encryption: value }))}
                    options={ENCRYPTION_OPTIONS}
                    placeholder="Select encryption"
                    allowClear={false}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]"
                  placeholder="username@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password {!hasExistingPassword && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]"
                  placeholder={hasExistingPassword ? "••••••••  (leave blank to keep existing)" : "Enter password"}
                  required={!hasExistingPassword}
                />
                {hasExistingPassword && (
                  <p className="text-xs text-gray-500 mt-1">Leave blank to keep the existing password</p>
                )}
              </div>

              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Sender Information</h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="from_email"
                      value={formData.from_email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]"
                      placeholder="noreply@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Name
                    </label>
                    <input
                      type="text"
                      name="from_name"
                      value={formData.from_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]"
                      placeholder="Imaradesk Support"
                    />
                  </div>
                </div>
              </div>
            </div>
          </DrawerBody>

          <DrawerFooter>
            <div className="flex items-center justify-between w-full">
              <button 
                type="button" 
                onClick={openTestDrawer}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                Test Connection
              </button>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className={`${THEME.button.primary} px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                >
                  {isSaving && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </DrawerFooter>
        </form>
      </Drawer>

      {/* Test Email Drawer */}
      <Drawer 
        isOpen={testDrawerOpen} 
        onClose={() => setTestDrawerOpen(false)} 
        title="Test SMTP Connection"
        size="sm"
        floating
      >
        <div className="flex flex-col h-full">
          <DrawerBody>
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-blue-800">
                    A test email will be sent to verify your SMTP configuration is working correctly.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send Test Email To <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B3D26]"
                  placeholder="your@email.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter the email address where you want to receive the test email.</p>
              </div>
            </div>
          </DrawerBody>

          <DrawerFooter>
            <div className="flex justify-end gap-3 w-full">
              <button 
                type="button"
                onClick={() => setTestDrawerOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className={`${THEME.button.primary} px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
              >
                {isTesting && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isTesting ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </DrawerFooter>
        </div>
      </Drawer>
    </AppShell>
    </>
  )
}
