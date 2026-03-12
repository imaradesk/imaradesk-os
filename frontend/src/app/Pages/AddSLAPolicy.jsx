import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import Select from '../components/SearchableSelect'
import Alert from '../components/Alert'

export default function AddSLAPolicy({ policy = null }) {
  const isEditing = !!policy
  const [currentStep, setCurrentStep] = useState(1)
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const [errorAlert, setErrorAlert] = useState(null)
  
  const [formData, setFormData] = useState({
    name: policy?.name || '',
    priority: policy?.priority || 'medium',
    description: policy?.description || '',
    status: policy?.status || 'active',
    notify_before_breach: policy?.notify_before_breach || 15,
    first_response_time: policy?.first_response_time || 60,
    resolution_time: policy?.resolution_time || 240,
    apply_to_new_tickets: policy?.apply_to_new_tickets ?? true,
    escalate_on_breach: policy?.escalate_on_breach ?? false,
    auto_assign_on_breach: policy?.auto_assign_on_breach ?? false,
  })

  const steps = [
    { number: 1, name: 'Enter details', description: 'Basic policy information' },
    { number: 2, name: 'Set targets', description: 'Response and resolution goals' },
    { number: 3, name: 'Configure triggers', description: 'Automation and actions' },
  ]

  const handleNext = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const handlePrevious = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const url = isEditing 
      ? `/sla/api/policies/${policy.id}/update/`
      : '/sla/api/policies/create/'
    
    const method = isEditing ? 'PUT' : 'POST'
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(formData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(isEditing ? 'Policy updated successfully!' : 'Policy created successfully!')
        setTimeout(() => {
          router.visit('/settings/sla/policies/')
        }, 1000)
      } else {
        // Show errors in Alert component
        let errorMessage = ''
        if (data.errors && typeof data.errors === 'object') {
          const errorList = Object.keys(data.errors).map(key => {
            const errors = Array.isArray(data.errors[key]) ? data.errors[key] : [data.errors[key]]
            return `${key}: ${errors.join(', ')}`
          })
          errorMessage = errorList.join('. ')
        } else {
          errorMessage = data.message || 'Unknown error occurred'
        }
        setErrorAlert({ title: 'Failed to save policy', message: errorMessage })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (error) {
      setErrorAlert({ 
        title: 'Failed to save policy', 
        message: 'Please check your connection and try again.' 
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <>
      <Head title={isEditing ? 'Edit SLA Policy' : 'Add SLA Policy'} />
      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="sla-policies" />}
          
          <main className="flex-1 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!sidenavOpen && (
                  <button
                    className="p-2 rounded-md hover:bg-gray-100"
                    onClick={() => setSidenavOpen(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-500">
                      <path d="M13.5 6 21 12l-7.5 6v-4.5H3v-3h10.5V6z"/>
                    </svg>
                  </button>
                )}
                <h1 className="text-xl font-semibold text-gray-800">
                  {isEditing ? 'Edit SLA Policy' : 'Add SLA Policy'}
                </h1>
              </div>
              <Link
                href="/settings/sla/policies/"
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Back to Policies
              </Link>
            </div>

            <div className="flex gap-0">
              {/* Vertical Stepper */}
              <div className="w-64 flex-shrink-0 border-r border-gray-200 p-6">
                <div className="sticky top-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-6">Steps</h3>
                  <div className="space-y-4">
                      {/* Step 1 */}
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                          currentStep === 1 ? 'bg-gray-900 text-white' : currentStep > 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {currentStep > 1 ? '✓' : '1'}
                        </div>
                        <div className="flex-1 pt-1">
                          <h4 className={`text-sm font-medium ${
                            currentStep === 1 ? 'text-gray-900' : currentStep > 1 ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            Enter details
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">Basic policy information</p>
                        </div>
                      </div>

                      {/* Connector Line */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 flex justify-center">
                          <div className={`w-0.5 h-8 ${currentStep > 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                          currentStep === 2 ? 'bg-gray-900 text-white' : currentStep > 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {currentStep > 2 ? '✓' : '2'}
                        </div>
                        <div className="flex-1 pt-1">
                          <h4 className={`text-sm font-medium ${
                            currentStep === 2 ? 'text-gray-900' : currentStep > 2 ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            Set targets
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">Response and resolution goals</p>
                        </div>
                      </div>

                      {/* Connector Line */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 flex justify-center">
                          <div className={`w-0.5 h-8 ${currentStep > 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                          currentStep === 3 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          3
                        </div>
                        <div className="flex-1 pt-1">
                          <h4 className={`text-sm font-medium ${
                            currentStep === 3 ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            Configure triggers
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">Automation and actions</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Form */}
              <div className="flex-1 p-6">
                {errorAlert && (
                  <Alert
                    type="error"
                    title={errorAlert.title}
                    message={errorAlert.message}
                    onClose={() => setErrorAlert(null)}
                    className="mb-6"
                  />
                )}
                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                    {/* Step 1: General */}
                    {currentStep === 1 && (
                      <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">General Information</h2>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Policy Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                            placeholder="e.g., Standard Support Policy"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority Level <span className="text-red-500">*</span>
                          </label>
                          <Select
                            value={formData.priority}
                            onChange={(value) => setFormData({ ...formData, priority: value })}
                            options={[
                              { value: 'low', label: 'Low' },
                              { value: 'medium', label: 'Medium' },
                              { value: 'high', label: 'High' },
                              { value: 'critical', label: 'Critical' }
                            ]}
                            placeholder="Select priority level"
                            displayKey="label"
                            valueKey="value"
                            searchable={true}
                            allowClear={false}
                          />
                          <p className="text-xs text-gray-500 mt-1">This policy will apply to tickets with this priority level</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                            placeholder="Describe the purpose of this SLA policy..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                          <Select
                            value={formData.status}
                            onChange={(value) => setFormData({ ...formData, status: value })}
                            options={[
                              { value: 'active', label: 'Active' },
                              { value: 'inactive', label: 'Inactive' }
                            ]}
                            placeholder="Select status"
                            displayKey="label"
                            valueKey="value"
                            searchable={true}
                            allowClear={false}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notify Before Breach (minutes)
                          </label>
                          <input
                            type="number"
                            value={formData.notify_before_breach}
                            onChange={(e) => setFormData({ ...formData, notify_before_breach: parseInt(e.target.value) })}
                            min="1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                            placeholder="15"
                          />
                          <p className="text-xs text-gray-500 mt-1">Send warning notifications this many minutes before SLA breach</p>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Targets */}
                    {currentStep === 2 && (
                      <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Target Times</h2>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex gap-3">
                            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-blue-900">Time Configuration</p>
                              <p className="text-xs text-blue-700 mt-1">Define the maximum time allowed for first response and full resolution. All times are in minutes.</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            First Response Time (minutes) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={formData.first_response_time}
                            onChange={(e) => setFormData({ ...formData, first_response_time: parseInt(e.target.value) })}
                            min="1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                            placeholder="60"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">Time allowed to provide the first response to a ticket</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Resolution Time (minutes) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={formData.resolution_time}
                            onChange={(e) => setFormData({ ...formData, resolution_time: parseInt(e.target.value) })}
                            min="1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                            placeholder="240"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">Time allowed to fully resolve a ticket</p>
                        </div>

                        {/* Time Examples */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Time Examples:</p>
                          <ul className="space-y-1 text-xs text-gray-600">
                            <li>• 60 minutes = 1 hour</li>
                            <li>• 240 minutes = 4 hours</li>
                            <li>• 480 minutes = 8 hours (1 business day)</li>
                            <li>• 1440 minutes = 24 hours</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Triggers */}
                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Automation Triggers</h2>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-700">Configure automated actions and conditions for this SLA policy.</p>
                        </div>

                        <div className="space-y-4">
                          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.apply_to_new_tickets}
                              onChange={(e) => setFormData({ ...formData, apply_to_new_tickets: e.target.checked })}
                              className="w-5 h-5 mt-0.5 text-[#4a154b] rounded focus:ring-2 focus:ring-[#4a154b]"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">Apply to New Tickets</p>
                              <p className="text-xs text-gray-500 mt-1">Automatically apply this policy to new tickets matching the priority level</p>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.escalate_on_breach}
                              onChange={(e) => setFormData({ ...formData, escalate_on_breach: e.target.checked })}
                              className="w-5 h-5 mt-0.5 text-[#4a154b] rounded focus:ring-2 focus:ring-[#4a154b]"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">Escalate on Breach</p>
                              <p className="text-xs text-gray-500 mt-1">Automatically escalate the ticket when SLA is breached</p>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.auto_assign_on_breach}
                              onChange={(e) => setFormData({ ...formData, auto_assign_on_breach: e.target.checked })}
                              className="w-5 h-5 mt-0.5 text-[#4a154b] rounded focus:ring-2 focus:ring-[#4a154b]"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">Auto-assign on Breach</p>
                              <p className="text-xs text-gray-500 mt-1">Automatically assign to a supervisor when SLA is breached</p>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
                    <div>
                      {currentStep > 1 && (
                        <button
                          type="button"
                          onClick={handlePrevious}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          Back
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href="/settings/sla/policies/"
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </Link>
                      {currentStep < 3 ? (
                        <button
                          type="button"
                          onClick={handleNext}
                          className="px-4 py-2 bg-[#4a154b] text-white rounded-md hover:bg-[#0a2f33]"
                        >
                          Next
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#4a154b] text-white rounded-md hover:bg-[#0a2f33]"
                        >
                          {isEditing ? 'Update Policy' : 'Create Policy'}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </main>
        </div>
      </AppShell>
    </>
  )
}
