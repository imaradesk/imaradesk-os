import React, { useState, useEffect } from 'react'
import { Head, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import Select from '../components/SearchableSelect'
import { THEME } from '../constants/theme'

export default function SLAPolicies({ policies = [] }) {
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, policyId: null })
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [slaSettings, setSlaSettings] = useState({
    enabled: false,
    auto_pause_resolved: true,
    auto_resume_reopened: true,
    escalation_enabled: true,
    send_notifications: true,
  })
  const [formData, setFormData] = useState({
    name: '',
    priority: 'medium',
    description: '',
    first_response_time: 60,
    resolution_time: 240,
    status: 'active',
    apply_to_new_tickets: false,
    send_escalation_emails: false,
    auto_assign_on_breach: false,
    pause_on_pending: false,
    notify_before_breach: 30,
  })

  // Fetch SLA settings on mount
  useEffect(() => {
    fetchSLASettings()
  }, [])

  const fetchSLASettings = async () => {
    try {
      setIsLoadingSettings(true)
      const response = await fetch('/sla/api/settings/')
      const data = await response.json()
      if (data.success) {
        setSlaSettings(data.settings)
      }
    } catch (error) {
      console.error('Error fetching SLA settings:', error)
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const toggleSLAConfirm = () => {
    setConfirmDialog({ 
      isOpen: true, 
      action: slaSettings.enabled ? 'deactivate' : 'activate',
      policyId: null 
    })
  }

  const toggleSLA = async () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    
    toast.promise(
      fetch('/sla/api/settings/update/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ enabled: !slaSettings.enabled }),
      }).then(async (response) => {
        const data = await response.json()
        if (data.success) {
          setSlaSettings(data.settings)
          return data.settings.enabled ? 'SLA tracking activated!' : 'SLA tracking disabled'
        } else {
          throw new Error(data.message || 'Failed to update SLA settings')
        }
      }),
      {
        loading: slaSettings.enabled ? 'Deactivating SLA...' : 'Activating SLA...',
        success: (message) => message,
        error: (err) => err.message || 'Failed to toggle SLA',
      }
    )
  }

  const updateSLASetting = async (setting, value) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    
    toast.promise(
      fetch('/sla/api/settings/update/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ [setting]: value }),
      }).then(async (response) => {
        const data = await response.json()
        if (data.success) {
          setSlaSettings(data.settings)
          return 'Setting updated successfully!'
        } else {
          throw new Error(data.message || 'Unknown error')
        }
      }),
      {
        loading: 'Updating setting...',
        success: (message) => message,
        error: (err) => err.message || 'Failed to update setting',
      }
    )
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const url = editingPolicy 
      ? `/sla/api/policies/${editingPolicy.id}/update/`
      : '/sla/api/policies/create/'
    
    const method = editingPolicy ? 'PUT' : 'POST'
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    
    toast.promise(
      fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(formData),
      }).then(async (response) => {
        const data = await response.json()
        if (data.success) {
          setTimeout(() => window.location.reload(), 1000)
          return editingPolicy ? 'Policy updated successfully!' : 'Policy created successfully!'
        } else {
          throw new Error(data.message || 'Failed to save policy')
        }
      }),
      {
        loading: editingPolicy ? 'Updating policy...' : 'Creating policy...',
        success: (message) => message,
        error: (err) => err.message || 'Failed to save policy',
      }
    )
  }
  
  const handleEdit = (policy) => {
    setEditingPolicy(policy)
    setFormData({
      name: policy.name,
      priority: policy.priority,
      description: policy.description,
      first_response_time: policy.first_response_minutes,
      resolution_time: policy.resolution_time_minutes,
      status: policy.status,
      apply_to_new_tickets: policy.apply_to_new_tickets ?? false,
      send_escalation_emails: policy.send_escalation_emails ?? false,
      auto_assign_on_breach: policy.auto_assign_on_breach ?? false,
      pause_on_pending: policy.pause_on_pending ?? false,
      notify_before_breach: policy.notify_before_breach,
    })
    setShowModal(true)
  }
  
  const handleDeleteConfirm = (policyId) => {
    setConfirmDialog({ isOpen: true, action: 'delete', policyId })
  }

  const handleDelete = async () => {
    const policyId = confirmDialog.policyId
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    
    toast.promise(
      fetch(`/sla/api/policies/${policyId}/delete/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      }).then(async (response) => {
        const data = await response.json()
        if (data.success) {
          setTimeout(() => window.location.reload(), 1000)
          return 'Policy deleted successfully!'
        } else {
          throw new Error(data.message || 'Failed to delete policy')
        }
      }),
      {
        loading: 'Deleting policy...',
        success: (message) => message,
        error: (err) => err.message || 'Failed to delete policy',
      }
    )
  }
  
  const openNewModal = () => {
    setEditingPolicy(null)
    setFormData({
      name: '',
      priority: 'medium',
      description: '',
      first_response_time: 60,
      resolution_time: 240,
      status: 'active',
      apply_to_new_tickets: false,
      send_escalation_emails: false,
      auto_assign_on_breach: false,
      pause_on_pending: false,
      notify_before_breach: 30,
    })
    setShowModal(true)
  }

  return (
    <>
      <Head title="SLA Policies - Settings" />
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, policyId: null })}
        onConfirm={() => {
          if (confirmDialog.action === 'delete') {
            handleDelete()
          } else if (confirmDialog.action === 'activate' || confirmDialog.action === 'deactivate') {
            toggleSLA()
          }
        }}
        title={
          confirmDialog.action === 'delete' 
            ? 'Delete SLA Policy'
            : confirmDialog.action === 'activate'
            ? 'Activate SLA Tracking'
            : 'Deactivate SLA Tracking'
        }
        message={
          confirmDialog.action === 'delete'
            ? 'Are you sure you want to delete this SLA policy? This action cannot be undone.'
            : confirmDialog.action === 'activate'
            ? 'Activate SLA tracking to start monitoring ticket response and resolution times against your defined policies?'
            : 'Deactivate SLA tracking? New tickets will not be assigned SLA policies. Note: Existing tickets with active SLA policies will continue to be tracked until they are resolved or closed.'
        }
        confirmText={
          confirmDialog.action === 'delete' ? 'Delete' :
          confirmDialog.action === 'activate' ? 'Activate' : 'Deactivate'
        }
        cancelText="Cancel"
        confirmStyle={confirmDialog.action === 'delete' || confirmDialog.action === 'deactivate' ? 'danger' : 'primary'}
      />
      
      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="sla-policies" slaEnabled={slaSettings.enabled} />}
          
          <main className="flex-1 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!sidenavOpen && (
                  <button
                    className="p-2 rounded-md hover:bg-gray-100"
                    title="Show Settings Menu"
                    onClick={() => setSidenavOpen(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-500">
                      <path d="M13.5 6 21 12l-7.5 6v-4.5H3v-3h10.5V6z"/>
                    </svg>
                  </button>
                )}
                <h1 className="text-xl font-semibold text-gray-800">SLA Policies</h1>
              </div>
              {slaSettings.enabled && (
                <Link
                  href="/settings/sla/policies/add/"
                  className={`${THEME.button.primary} px-4 py-2 rounded-lg flex items-center gap-2`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New SLA Policy
                </Link>
              )}
            </div>

            <div className="p-6">
              {/* SLA Information Alert */}
              <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">What is SLA?</h3>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      <strong>Service Level Agreement (SLA)</strong> is a commitment between a service provider and customer that defines the expected level of service. 
                      In ticketing systems, SLAs set target response and resolution times based on ticket priority. This helps teams:
                    </p>
                    <ul className="mt-2 ml-4 text-sm text-blue-800 space-y-1 list-disc">
                      <li><strong>Prioritize work</strong> - Critical issues get faster attention</li>
                      <li><strong>Meet commitments</strong> - Track performance against targets</li>
                      <li><strong>Improve service</strong> - Identify bottlenecks and optimize workflows</li>
                      <li><strong>Build trust</strong> - Set clear expectations with customers</li>
                    </ul>
                    <p className="text-sm text-blue-800 mt-2">
                      <strong>Note:</strong> SLA tracking is disabled by default. Configure your policies below, then activate SLA to start monitoring ticket performance.
                    </p>
                  </div>
                </div>
              </div>

              {/* SLA Activation Banner */}
              {isLoadingSettings ? (
                // Skeleton loader for activation banner
                <div className="p-6 rounded-lg border-2 border-gray-200 bg-gray-50 mb-6 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                        <div className="h-6 w-48 bg-gray-300 rounded"></div>
                      </div>
                      <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
                    </div>
                    <div className="h-10 w-20 bg-gray-300 rounded-full"></div>
                  </div>
                </div>
              ) : (
                <div className={`p-6 rounded-lg border-2 mb-6 ${
                  slaSettings.enabled 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-300'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        slaSettings.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                      }`}></div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        SLA Tracking is {slaSettings.enabled ? 'Active' : 'Disabled'}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {slaSettings.enabled 
                        ? 'Service Level Agreement tracking is currently active. Tickets will be monitored against defined SLA policies.'
                        : 'Enable SLA tracking to monitor ticket response and resolution times against defined policies.'
                      }
                    </p>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button
                    onClick={toggleSLAConfirm}
                    className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      slaSettings.enabled
                        ? 'bg-green-600 focus:ring-green-500'
                        : 'bg-gray-300 focus:ring-gray-400'
                    }`}
                  >
                    <span
                      className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
                        slaSettings.enabled ? 'translate-x-11' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Additional Settings when SLA is enabled */}
                
              </div>
              )}

              {/* Policies Section - Only show when SLA is enabled */}
              {isLoadingSettings ? (
                // Skeleton loader for policies section
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden p-6 animate-pulse">
                  <div className="h-4 w-2/3 bg-gray-300 rounded mb-4"></div>
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="h-5 w-32 bg-gray-300 rounded"></div>
                              <div className="h-6 w-16 bg-gray-300 rounded-full"></div>
                              <div className="h-6 w-16 bg-gray-300 rounded-full"></div>
                            </div>
                            <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-gray-300 rounded"></div>
                            <div className="w-9 h-9 bg-gray-300 rounded"></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                          <div>
                            <div className="h-3 w-24 bg-gray-300 rounded mb-2"></div>
                            <div className="h-5 w-20 bg-gray-300 rounded"></div>
                          </div>
                          <div>
                            <div className="h-3 w-24 bg-gray-300 rounded mb-2"></div>
                            <div className="h-5 w-20 bg-gray-300 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : slaSettings.enabled ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">Define service level agreements for different ticket priorities</p>
                    
                    {policies.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No SLA Policies Yet</h3>
                        <p className="text-gray-600 mb-4">Create your first SLA policy to start tracking service levels</p>
                        <Link
                          href="/settings/sla/policies/add/"
                          className={`inline-block ${THEME.button.primary} px-4 py-2 rounded-lg`}
                        >
                          Create First Policy
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">{policies.map((policy) => (
                      <div key={policy.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-gray-900">{policy.name}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                policy.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                policy.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                policy.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {policy.priority}
                              </span>
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                {policy.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{policy.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/settings/sla/policies/${policy.id}/edit/`}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </Link>
                            <button 
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                              onClick={() => handleDeleteConfirm(policy.id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">First Response Time</div>
                            <div className="font-semibold text-gray-900">{policy.first_response}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Resolution Time</div>
                            <div className="font-semibold text-gray-900">{policy.resolution_time}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden p-8">
                  <div className="text-center max-w-2xl mx-auto">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">SLA Tracking is Disabled</h3>
                    <p className="text-gray-600 mb-6">
                      Enable SLA tracking above to define response and resolution time targets for different ticket priorities.
                    </p>
                    <p className="text-sm text-gray-500">
                      Once enabled, you'll be able to create SLA policies to ensure accurate ticket response time tracking.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
        
        {/* Modal for creating/editing SLA policy - Only show when SLA is enabled */}
        {slaSettings.enabled && (
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={editingPolicy ? 'Edit SLA Policy' : 'New SLA Policy'}
            maxWidth="max-w-2xl"
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Policy Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Critical Issues SLA"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.priority}
                  onChange={(value) => setFormData({ ...formData, priority: value })}
                  options={[
                    { id: 'critical', name: 'Critical' },
                    { id: 'high', name: 'High' },
                    { id: 'medium', name: 'Medium' },
                    { id: 'low', name: 'Low' }
                  ]}
                  placeholder="Select priority"
                  required
                  allowClear={false}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe when this policy applies"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Response Time (minutes) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                    value={formData.first_response_time}
                    onChange={(e) => setFormData({ ...formData, first_response_time: parseInt(e.target.value) })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resolution Time (minutes) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                    value={formData.resolution_time}
                    onChange={(e) => setFormData({ ...formData, resolution_time: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onChange={(value) => setFormData({ ...formData, status: value })}
                  options={[
                    { id: 'active', name: 'Active' },
                    { id: 'inactive', name: 'Inactive' }
                  ]}
                  placeholder="Select status"
                  allowClear={false}
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.apply_to_new_tickets}
                    onChange={(e) => setFormData({ ...formData, apply_to_new_tickets: e.target.checked })}
                    className="w-4 h-4 text-[#4a154b] border-gray-300 rounded focus:ring-[#4a154b]"
                  />
                  <span className="text-sm text-gray-700">Apply to new tickets</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">Automatically apply this policy to new tickets matching the priority</p>
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.send_escalation_emails}
                    onChange={(e) => setFormData({ ...formData, send_escalation_emails: e.target.checked })}
                    className="w-4 h-4 text-[#4a154b] border-gray-300 rounded focus:ring-[#4a154b]"
                  />
                  <span className="text-sm text-gray-700">Send escalation emails</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">Notify team members when SLA is at risk of breach</p>
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.auto_assign_on_breach}
                    onChange={(e) => setFormData({ ...formData, auto_assign_on_breach: e.target.checked })}
                    className="w-4 h-4 text-[#4a154b] border-gray-300 rounded focus:ring-[#4a154b]"
                  />
                  <span className="text-sm text-gray-700">Auto-assign on breach</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">Automatically assign ticket to an administrator when SLA is breached</p>
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.pause_on_pending}
                    onChange={(e) => setFormData({ ...formData, pause_on_pending: e.target.checked })}
                    className="w-4 h-4 text-[#4a154b] border-gray-300 rounded focus:ring-[#4a154b]"
                  />
                  <span className="text-sm text-gray-700">Pause on pending status</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">Pause SLA timer when ticket is pending customer response</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notify before breach (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                  value={formData.notify_before_breach}
                  onChange={(e) => setFormData({ ...formData, notify_before_breach: parseInt(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">Set to 0 to disable notifications</p>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${THEME.button.primary} px-4 py-2 rounded-lg`}
                >
                  {editingPolicy ? 'Update Policy' : 'Create Policy'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AppShell>
    </>
  )
}
