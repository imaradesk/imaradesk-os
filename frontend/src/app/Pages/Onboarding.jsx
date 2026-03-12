import React, { useState, useEffect } from 'react'
import { Head, useForm } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout'
import Select from '../components/SearchableSelect'

export default function Onboarding({ errors: serverErrors = {} }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  
  const { data, setData, post, processing } = useForm({
    // Admin info
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    // Business info
    workspace_name: '',
    business_type: '',
    org_size: '',
  })

  useEffect(() => {
    const errorKeys = Object.keys(serverErrors)
    if (errorKeys.length > 0) {
      errorKeys.forEach(key => {
        if (serverErrors[key]) {
          toast.error(serverErrors[key])
        }
      })
    }
  }, [serverErrors])

  const businessTypes = [
    { id: 'Software', name: 'Software' },
    { id: 'Insurance', name: 'Insurance' },
    { id: 'Healthcare', name: 'Healthcare' },
    { id: 'Finance', name: 'Finance' },
    { id: 'E-commerce', name: 'E-commerce' },
    { id: 'Education', name: 'Education' },
    { id: 'Manufacturing', name: 'Manufacturing' },
    { id: 'Retail', name: 'Retail' },
    { id: 'Consulting', name: 'Consulting' },
    { id: 'Other', name: 'Other' }
  ]

  const organizationSizes = [
    '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
  ]

  const handleNext = (e) => {
    e.preventDefault()
    
    if (currentStep === 1) {
      if (!data.first_name || !data.last_name || !data.email || !data.password) {
        toast.error('Please fill in all required fields')
        return
      }
      if (data.password !== data.confirm_password) {
        toast.error('Passwords do not match')
        return
      }
      if (data.password.length < 8) {
        toast.error('Password must be at least 8 characters')
        return
      }
      toast.success('Step 1 completed!')
      setCurrentStep(2)
    }
  }

  const handleBack = (e) => {
    e.preventDefault()
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!data.workspace_name) {
      toast.error('Please enter your workspace name')
      return
    }
    if (!agreedToTerms) {
      toast.error('Please agree to the Terms of Service and Privacy Policy')
      return
    }
    
    toast.promise(
      new Promise((resolve, reject) => {
        post('/onboarding/', {
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
        loading: 'Setting up your workspace...',
        success: 'Workspace created successfully!',
        error: 'Failed to create workspace',
      }
    )
  }

  const steps = [
    { number: 1, title: 'Admin Account', subtitle: 'Your credentials' },
    { number: 2, title: 'Business Info', subtitle: 'Organization details' },
  ]

  return (
    <AuthLayout
      title="Welcome to ImaraDesk"
      subtitle="Let's set up your helpdesk platform. This quick setup will configure your workspace and get you started."
      features={[
        'Setup your workspace in under 2 minutes',
        'Create your admin account',
        'Start managing tickets immediately'
      ]}
    >
      <Head title="Setup - ImaraDesk" />
      
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-center">
        Setup Your Workspace
      </h1>
      <p className="text-gray-500 mb-6 md:mb-8 text-center text-sm sm:text-base">
        Complete the onboarding to get started
      </p>

      {/* Mobile Step Indicator */}
      <div className="md:hidden mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Step {currentStep} of 2</span>
          <span className="text-sm text-gray-500">
            {steps[currentStep - 1]?.title}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-[#4a154b] h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 2) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Vertical Step Indicators - Hidden on mobile */}
        <div className="w-64 flex-shrink-0 hidden md:block">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Steps</h3>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                    currentStep === step.number ? 'bg-[#4a154b] text-white' : 
                    currentStep > step.number ? 'bg-green-500 text-white' : 
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > step.number ? '✓' : step.number}
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className={`text-sm font-medium ${
                      currentStep === step.number ? 'text-gray-900' : 
                      currentStep > step.number ? 'text-green-600' : 
                      'text-gray-500'
                    }`}>
                      {step.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">{step.subtitle}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 flex justify-center">
                      <div className={`w-0.5 h-6 ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1">
          {/* Step 1: Admin Account */}
          {currentStep === 1 && (
            <form onSubmit={handleNext} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">First Name</label>
                  <input
                    type="text"
                    value={data.first_name}
                    onChange={e => setData('first_name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent bg-gray-50 ${
                      serverErrors.first_name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={data.last_name}
                    onChange={e => setData('last_name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent bg-gray-50 ${
                      serverErrors.last_name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
                <input
                  type="email"
                  value={data.email}
                  onChange={e => setData('email', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent bg-gray-50 ${
                    serverErrors.email ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="admin@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Password</label>
                <input
                  type="password"
                  value={data.password}
                  onChange={e => setData('password', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent bg-gray-50 ${
                    serverErrors.password ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={data.confirm_password}
                  onChange={e => setData('confirm_password', e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent bg-gray-50 border-gray-200"
                  placeholder="Re-enter your password"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#4a154b] text-white py-3 rounded-lg font-semibold hover:bg-[#5a235c] transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          )}

          {/* Step 2: Business Info */}
          {currentStep === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Workspace Name</label>
                <input
                  type="text"
                  value={data.workspace_name}
                  onChange={e => setData('workspace_name', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent bg-gray-50 ${
                    serverErrors.workspace_name ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="My Company"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Type of Business</label>
                <Select
                  value={data.business_type}
                  onChange={(value) => setData('business_type', value)}
                  options={businessTypes}
                  placeholder="Select business type"
                  displayKey="name"
                  valueKey="id"
                  searchable={true}
                  allowClear={true}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Organization Size</label>
                <div className="flex flex-wrap gap-2">
                  {organizationSizes.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setData('org_size', size)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        data.org_size === size
                          ? 'bg-[#4a154b] text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Terms Agreement Checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="terms-agreement"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b] cursor-pointer"
                />
                <label htmlFor="terms-agreement" className="text-sm text-gray-600 cursor-pointer">
                  I agree to the Terms of Service and Privacy Policy
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={processing || !agreedToTerms}
                  className="flex-1 bg-[#4a154b] text-white py-3 rounded-lg font-semibold hover:bg-[#5a235c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Setting up...' : 'Complete Setup'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
