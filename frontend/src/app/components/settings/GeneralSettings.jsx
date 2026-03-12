import React, { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import Select from '../SearchableSelect'
import { THEME, COLORS } from '../../constants/theme'
import { useTimezone } from '../../context/TimezoneContext'

// Generate all IANA timezones
const getAllTimezones = () => {
  const timezones = Intl.supportedValuesOf('timeZone')
  return timezones.map(tz => {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset'
    })
    const parts = formatter.formatToParts(now)
    const offset = parts.find(p => p.type === 'timeZoneName')?.value || ''
    return {
      id: tz,
      name: `${tz.replace(/_/g, ' ')} (${offset})`,
      offset: offset
    }
  }).sort((a, b) => {
    // Sort by offset first, then alphabetically
    const offsetA = a.offset.replace('GMT', '').replace('+', '') || '0'
    const offsetB = b.offset.replace('GMT', '').replace('+', '') || '0'
    const numA = parseFloat(offsetA.replace(':', '.')) || 0
    const numB = parseFloat(offsetB.replace(':', '.')) || 0
    if (numA !== numB) return numA - numB
    return a.id.localeCompare(b.id)
  })
}

export default function GeneralSettings({ business = {} }) {
  const [isEditing, setIsEditing] = useState(false)
  const [companyName, setCompanyName] = useState(business?.company_name || '')
  const [companyDescription, setCompanyDescription] = useState(business?.description || '')
  const [businessType, setBusinessType] = useState(business?.business_type || '')
  const [orgSize, setOrgSize] = useState(business?.org_size || '')
  const [isSaving, setIsSaving] = useState(false)

  // Use timezone from context
  const { timezone, setTimezone, detectUserTimezone, formatDate } = useTimezone()
  const [isSavingTimezone, setIsSavingTimezone] = useState(false)

  // Memoize timezone options to avoid regenerating on every render
  const timezoneOptions = useMemo(() => getAllTimezones(), [])

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light'
    }
    return 'light'
  })

  
  useEffect(() => {
    const applyTheme = (selectedTheme) => {
      if (selectedTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else if (selectedTheme === 'light') {
        document.documentElement.classList.remove('dark')
      } else if (selectedTheme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
    }

    applyTheme(theme)
    localStorage.setItem('theme', theme)

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])
  
  useEffect(() => {
    setCompanyName(business?.company_name || '')
    setCompanyDescription(business?.description || '')
    setBusinessType(business?.business_type || '')
    setOrgSize(business?.org_size || '')
  }, [business])

  
  const businessTypeOptions = [
    { id: 'Software', name: 'Software & Technology' },
    { id: 'Insurance', name: 'Insurance' },
    { id: 'Healthcare', name: 'Healthcare' },
    { id: 'Finance', name: 'Finance & Banking' },
    { id: 'Retail', name: 'Retail & E-commerce' },
    { id: 'Manufacturing', name: 'Manufacturing' },
    { id: 'Education', name: 'Education' },
    { id: 'Government', name: 'Government' },
    { id: 'Consulting', name: 'Consulting' },
    { id: 'NonProfit', name: 'Non-Profit' },
    { id: 'Other', name: 'Other' },
  ]

  const orgSizeOptions = [
    { id: '1-10', name: '1-10 employees' },
    { id: '11-50', name: '11-50 employees' },
    { id: '51-200', name: '51-200 employees' },
    { id: '201-500', name: '201-500 employees' },
    { id: '501-1000', name: '501-1000 employees' },
    { id: '1001+', name: '1001+ employees' },
  ]

  const handleCancel = () => {
    setCompanyName(business?.company_name || '')
    setCompanyDescription(business?.description || '')
    setBusinessType(business?.business_type || '')
    setOrgSize(business?.org_size || '')
    setIsEditing(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/settings/update-business/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': window.csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          company_name: companyName,
          description: companyDescription,
          business_type: businessType,
          org_size: orgSize,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Company information saved successfully')
        setIsEditing(false)
      } else {
        toast.error(data.error || 'Failed to save company information')
      }
    } catch (error) {
      console.error('Error saving company info:', error)
      toast.error('Failed to save company information')
    } finally {
      setIsSaving(false)
    }
  }



  const getBusinessTypeLabel = (value) => {
    const option = businessTypeOptions.find(opt => opt.id === value)
    return option?.name || value || 'Not set'
  }

  const getOrgSizeLabel = (value) => {
    const option = orgSizeOptions.find(opt => opt.id === value)
    return option?.name || value || 'Not set'
  }

  const getTimezoneLabel = (value) => {
    const option = timezoneOptions.find(opt => opt.id === value)
    return option?.name || value || 'Not set'
  }

  const handleTimezoneChange = (newTimezone) => {
    setIsSavingTimezone(true)
    try {
      setTimezone(newTimezone) // Context handles localStorage
      toast.success('Timezone updated successfully')
    } catch (error) {
      console.error('Error saving timezone:', error)
      toast.error('Failed to save timezone')
    } finally {
      setIsSavingTimezone(false)
    }
  }

  const handleDetectTimezone = () => {
    const detected = detectUserTimezone()
    handleTimezoneChange(detected)
  }

  return (
    <div className=" max-w-4xl space-y-8">

      {/* Company Information Card */}
      <div className="bg-white overflow-hidden">
        {/* Card Header */}
        <div 
          className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${COLORS.primary}08, ${COLORS.primaryLight}05)` }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${COLORS.primary}15` }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth="1.5" 
                stroke="currentColor" 
                className="w-5 h-5"
                style={{ color: COLORS.primary }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Company Information</h3>
              <p className="text-xs text-gray-500">Basic details about your organization</p>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 hover:shadow-md"
              style={{ 
                backgroundColor: COLORS.primary, 
                color: 'white',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Edit
            </button>
          )}
        </div>

        {/* Card Content */}
        <div className="p-6">
          {!isEditing ? (
            /* Read-only View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Company Name</label>
                <p className="text-base font-medium text-gray-900">{companyName || <span className="text-gray-400 italic">Not set</span>}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Business Type</label>
                <p className="text-base text-gray-900">{getBusinessTypeLabel(businessType)}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Organization Size</label>
                <p className="text-base text-gray-900">{getOrgSizeLabel(orgSize)}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Created On</label>
                <p className="text-base text-gray-900">
                  {business?.created_on ? formatDate(business.created_on) : <span className="text-gray-400 italic">Unknown</span>}
                </p>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Description</label>
                <p className="text-base text-gray-700 leading-relaxed">
                  {companyDescription || <span className="text-gray-400 italic">No description provided</span>}
                </p>
              </div>
            </div>
          ) : (
            /* Edit View */
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Company Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-[#4a154b] transition-all duration-200 outline-none"
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)} 
                    placeholder="Enter company name" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Business Type</label>
                  <Select
                    value={businessType}
                    onChange={setBusinessType}
                    options={businessTypeOptions}
                    placeholder="Select business type"
                    displayKey="name"
                    valueKey="id"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Organization Size</label>
                  <Select
                    value={orgSize}
                    onChange={setOrgSize}
                    options={orgSizeOptions}
                    placeholder="Select organization size"
                    displayKey="name"
                    valueKey="id"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-[#4a154b] transition-all duration-200 outline-none resize-none"
                  rows="3" 
                  value={companyDescription} 
                  onChange={(e) => setCompanyDescription(e.target.value)} 
                  placeholder="Brief description of your company"
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={handleCancel}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Email-to-Ticket Card */}
      {business?.help_email && (
        <div className="bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Support Email</h3>
                <p className="text-xs text-gray-500">Your support email address for automatic ticket creation</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                <code className="text-sm font-mono text-green-700">{business.help_email}</code>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(business.help_email)
                  toast.success('Email copied to clipboard')
                }}
                className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                title="Copy to clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              Emails sent to this address will automatically create support tickets
            </p>
          </div>
        </div>
      )}

      {/* Customer Portal Link Card */}
      <div className="bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Customer Portal</h3>
              <p className="text-xs text-gray-500">Share this link with your customers to access the support portal</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <code className="text-sm font-mono text-blue-700">{window.location.origin}/portal</code>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/portal`)
                toast.success('Portal link copied to clipboard')
              }}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              title="Copy to clipboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
            </button>
            <a
              href={`${window.location.origin}/portal`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              title="Open portal in new tab"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
          <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            Customers can submit and track tickets through this portal
          </p>
        </div>
      </div>

      {/* Timezone Settings Card */}
      <div className="bg-white">
        <div 
          className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${COLORS.primary}08, ${COLORS.primaryLight}05)` }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${COLORS.primary}15` }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth="1.5" 
                stroke="currentColor" 
                className="w-5 h-5"
                style={{ color: COLORS.primary }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Timezone</h3>
              <p className="text-xs text-gray-500">Set your preferred timezone for dates and times</p>
            </div>
          </div>
          <button
            onClick={handleDetectTimezone}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600"
            title="Auto-detect timezone"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            Auto-detect
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Select Timezone</label>
              <Select
                value={timezone}
                onChange={handleTimezoneChange}
                options={timezoneOptions}
                placeholder="Select timezone"
                displayKey="name"
                valueKey="id"
                searchable={true}
                allowClear={false}
                disabled={isSavingTimezone}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <span>Current time in selected timezone: {new Date().toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}