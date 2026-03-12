import React, { useState, useEffect } from 'react'
import { Head, useForm, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import { THEME } from '../constants/theme'
import AuthLayout from '../components/AuthLayout'
import Select from '../components/SearchableSelect'

export default function Register({ errors: serverErrors = {} }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  
  const { data, setData, post, processing } = useForm({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    workspace_name: '',
    subdomain: '',
    business_type: '',
    org_size: '',
    service_types: [],
    features_interest: [],
  })

  useEffect(() => {
    // Show error toasts for server validation errors
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

  const serviceTypes = [
    'Customer Support', 'Internal Support', 'Technical Support',
    'IT Helpdesk', 'Sales Support', 'Product Support'
  ]

  const features = [
    'Ticketing System', 'Live Chat', 'Tasks', 'Knowledge Base',
    'SLA Management', 'Analytics', 'Automation', 'Multi-channel Support'
  ]

  const toggleArrayItem = (field, value) => {
    const current = data[field] || []
    if (current.includes(value)) {
      setData(field, current.filter(item => item !== value))
    } else {
      setData(field, [...current, value])
    }
  }

  const handleNext = (e) => {
    e.preventDefault()
    
    if (currentStep === 1) {
      if (!data.first_name || !data.last_name || !data.email) {
        toast.error('Please fill in all required fields')
        return
      }
      toast.success('Step 1 completed!')
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!data.workspace_name || !data.subdomain) {
        toast.error('Please complete all workspace fields')
        return
      }
      toast.success('Step 2 completed!')
      setCurrentStep(3)
    } else if (currentStep === 3) {
      if (data.service_types.length === 0) {
        toast.error('Please select at least one service type')
        return
      }
      toast.success('Step 3 completed!')
      setCurrentStep(4)
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
    if (!data.workspace_name || !data.subdomain) {
      toast.error('Please complete all workspace fields')
      return
    }
    if (!agreedToTerms) {
      toast.error('Please agree to the Terms of Service and Privacy Policy')
      return
    }
    
    // Prepare data with JSON stringified arrays
    const submitData = {
      ...data,
      service_types: JSON.stringify(data.service_types || []),
      features_interest: JSON.stringify(data.features_interest || []),
    }
    
    toast.promise(
      new Promise((resolve, reject) => {
        post('/register/', {
          data: submitData,
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
        loading: 'Creating your workspace...',
        success: 'Workspace created successfully!',
        error: 'Failed to create workspace',
      }
    )
  }

  return (
    <AuthLayout
      title="Join Thousands of Teams"
      subtitle="Streamline your support operations with ImaraDesk's powerful platform trusted by organizations worldwide"
      features={[
        'Setup your workspace in under 5 minutes',
        'No credit card required to get started',
        'Free 14-day trial with full features'
      ]}
    >
      <Head title="Create your workspace" />
      
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-center">
        Create your workspace
      </h1>
      <p className="text-gray-500 mb-6 md:mb-8 text-center text-sm sm:text-base">
        Get started with ImaraDesk in minutes
      </p>

      {/* Mobile Step Indicator */}
      <div className="md:hidden mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Step {currentStep} of 4</span>
          <span className="text-sm text-gray-500">
            {currentStep === 1 && 'Personal Info'}
            {currentStep === 2 && 'Business Info'}
            {currentStep === 3 && 'Service Types'}
            {currentStep === 4 && 'Features'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-[#4a154b] h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Vertical Step Indicators - Hidden on mobile */}
        <div className="w-64 flex-shrink-0 hidden md:block">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Steps</h3>
          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                currentStep === 1 ? 'bg-[#4a154b] text-white' : currentStep > 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <div className="flex-1 pt-1">
                <h4 className={`text-sm font-medium ${currentStep === 1 ? 'text-gray-900' : currentStep > 1 ? 'text-green-600' : 'text-gray-500'}`}>
                  Personal Info
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">Your details</p>
              </div>
            </div>

            {/* Connector */}
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center">
                <div className={`w-0.5 h-6 ${currentStep > 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                currentStep === 2 ? 'bg-[#4a154b] text-white' : currentStep > 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <div className="flex-1 pt-1">
                <h4 className={`text-sm font-medium ${currentStep === 2 ? 'text-gray-900' : currentStep > 2 ? 'text-green-600' : 'text-gray-500'}`}>
                  Business Info
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">Workspace setup</p>
              </div>
            </div>

            {/* Connector */}
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center">
                <div className={`w-0.5 h-6 ${currentStep > 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                currentStep === 3 ? 'bg-[#4a154b] text-white' : currentStep > 3 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > 3 ? '✓' : '3'}
              </div>
              <div className="flex-1 pt-1">
                <h4 className={`text-sm font-medium ${currentStep === 3 ? 'text-gray-900' : currentStep > 3 ? 'text-green-600' : 'text-gray-500'}`}>
                  Service Types
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">What you need</p>
              </div>
            </div>

            {/* Connector */}
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center">
                <div className={`w-0.5 h-6 ${currentStep > 3 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                currentStep === 4 ? 'bg-[#4a154b] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                4
              </div>
              <div className="flex-1 pt-1">
                <h4 className={`text-sm font-medium ${currentStep === 4 ? 'text-gray-900' : 'text-gray-500'}`}>
                  Features
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">What interests you</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1">
          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <form onSubmit={handleNext} className="space-y-4">
              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={() => toast.info('Google sign-in coming soon!')}
                className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">First Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={data.first_name}
                    onChange={e => setData('first_name', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent bg-gray-50 ${
                      serverErrors.first_name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="John"
                  />
                </div>
                {serverErrors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{serverErrors.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Last Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={data.last_name}
                    onChange={e => setData('last_name', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent bg-gray-50 ${
                      serverErrors.last_name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Doe"
                  />
                </div>
                {serverErrors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{serverErrors.last_name}</p>
                )}
              </div>

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
                    placeholder="john.doe@gmail.com"
                  />
                </div>
                {serverErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{serverErrors.email}</p>
                )}
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
            <form onSubmit={handleNext} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Workspace Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={data.workspace_name}
                    onChange={e => setData('workspace_name', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent bg-gray-50 ${
                      serverErrors.workspace_name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="ImaraDesk Corporation"
                  />
                </div>
                {serverErrors.workspace_name && (
                  <p className="mt-1 text-sm text-red-600">{serverErrors.workspace_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Subdomain</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={data.subdomain}
                    onChange={e => setData('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4a154b] focus:border-transparent bg-gray-50 ${
                      serverErrors.subdomain ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="mdesk"
                  />
                  <span className="text-gray-500 font-medium">.coredesk.pro</span>
                </div>
                {serverErrors.subdomain && (
                  <p className="mt-1 text-sm text-red-600">{serverErrors.subdomain}</p>
                )}
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
                  className="flex-1 bg-[#4a154b] text-white py-3 rounded-lg font-semibold hover:bg-[#5a235c] transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Service Types */}
          {currentStep === 3 && (
            <form onSubmit={handleNext} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  What types of services are you looking for?
                </label>
                <p className="text-sm text-gray-500 mb-4">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {serviceTypes.map(service => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleArrayItem('service_types', service)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        data.service_types.includes(service)
                          ? 'bg-[#4a154b] text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
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
                  className="flex-1 bg-[#4a154b] text-white py-3 rounded-lg font-semibold hover:bg-[#5a235c] transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Features */}
          {currentStep === 4 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  What features do you want to explore?
                </label>
                <p className="text-sm text-gray-500 mb-4">Select all that interest you</p>
                <div className="flex flex-wrap gap-2">
                  {features.map(feature => (
                    <button
                      key={feature}
                      type="button"
                      onClick={() => toggleArrayItem('features_interest', feature)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        data.features_interest.includes(feature)
                          ? 'bg-[#4a154b] text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {feature}
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
                  I agree to the{' '}
                  <a
                    href="/terms/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4a154b] hover:underline font-medium"
                  >
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a
                    href="/privacy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4a154b] hover:underline font-medium"
                  >
                    Privacy Policy
                  </a>
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
                  {processing ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
