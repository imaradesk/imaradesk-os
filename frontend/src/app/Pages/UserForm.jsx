import React, { useState } from 'react'
import { Head, useForm, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import { THEME } from '../constants/theme'

export default function UserForm({ mode = 'create', user = {}, orgs = [], groups = [], errors: serverErrors = {} }) {
  const [currentStep, setCurrentStep] = useState(1)
  
  const { data, setData, post, processing, errors } = useForm({
    username: user.username || '',
    email: user.email || '',
    password: '',
    full_name: user.full_name || '',
    is_agent: user.is_agent || false,
    organization: user.organization || '',
    groups: user.groups || [],
  })

  const toggleGroup = (groupId) => {
    const current = data.groups || []
    if (current.includes(groupId)) {
      setData('groups', current.filter(id => id !== groupId))
    } else {
      setData('groups', [...current, groupId])
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const url = mode === 'create' ? '/people/add/' : `/people/${user.id}/edit/`
    const successMsg = mode === 'create' ? 'User created successfully!' : 'User updated successfully!'
    
    toast.promise(
      new Promise((resolve, reject) => {
        post(url, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          forceFormData: true,
          preserveScroll: true,
          transform: (data) => {
            // Transform groups array to format Django expects
            const formData = new FormData()
            Object.keys(data).forEach(key => {
              if (key === 'groups' && Array.isArray(data[key])) {
                // Add each group ID as a separate entry with 'groups' key
                data[key].forEach(groupId => {
                  formData.append('groups', groupId)
                })
              } else {
                formData.append(key, data[key])
              }
            })
            return formData
          },
          onSuccess: () => {
            router.visit('/people/')
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: mode === 'create' ? 'Creating user...' : 'Updating user...',
        success: successMsg,
        error: 'Operation failed',
      }
    )
  }

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate step 1 fields
      if (!data.full_name || !data.email) {
        toast.error('Please fill in all required fields')
        return
      }
      if (mode === 'create' && !data.password) {
        toast.error('Password is required')
        return
      }
      setCurrentStep(2)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const allErrors = { ...serverErrors, ...errors }

  return (
    <>
      <Head title={mode === 'create' ? 'Create team member' : 'Edit User'} />
      <AppShell active="people">
        <main className="flex-1 bg-gray-50 min-h-screen">
          <div className="max-w-3xl mx-auto py-12 px-6">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">
                {mode === 'create' ? 'Create team member' : 'Edit team member'}
              </h1>
              <p className="text-gray-600">
                Get new team members up and running in just a couple of steps.
              </p>
            </div>

            {/* Step Indicators */}
            <div className="mb-8">
              <div className="flex items-start gap-8">
                {/* Step 1 */}
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    currentStep === 1 ? 'bg-gray-900 text-white' : currentStep > 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > 1 ? '✓' : '1'}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm font-medium ${currentStep === 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                      Enter details
                    </h3>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    currentStep === 2 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm font-medium ${currentStep === 2 ? 'text-gray-900' : 'text-gray-500'}`}>
                      Assign role
                    </h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Enter Details */}
                {currentStep === 1 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name* <span className="text-xs text-gray-500">(required)</span>
                      </label>
                      <input
                        type="text"
                        value={data.full_name}
                        onChange={(e) => setData('full_name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          allErrors?.full_name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter full name"
                      />
                      {allErrors?.full_name && <p className="mt-1 text-sm text-red-600">{allErrors.full_name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email*</label>
                      <input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          allErrors?.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="email@example.com"
                      />
                      {allErrors?.email && <p className="mt-1 text-sm text-red-600">{allErrors.email}</p>}
                    </div>

                    {mode === 'create' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Username*</label>
                          <input
                            type="text"
                            value={data.username}
                            onChange={(e) => setData('username', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              allErrors?.username ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="username"
                          />
                          {allErrors?.username && <p className="mt-1 text-sm text-red-600">{allErrors.username}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Password*</label>
                          <input
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              allErrors?.password ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter password"
                          />
                          {allErrors?.password && <p className="mt-1 text-sm text-red-600">{allErrors.password}</p>}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Step 2: Assign Role */}
                {currentStep === 2 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                      <select
                        value={data.organization}
                        onChange={(e) => setData('organization', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">— Select Organization —</option>
                        {orgs?.map((o) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <input
                        id="is_agent"
                        type="checkbox"
                        checked={!!data.is_agent}
                        onChange={(e) => setData('is_agent', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="is_agent" className="text-sm font-medium text-gray-700">
                        Make this user an agent
                      </label>
                    </div>

                    {data.is_agent && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Agent Groups
                          {groups?.length > 0 && <span className="text-gray-500 font-normal ml-2">({groups.length} available)</span>}
                        </label>
                        {groups && groups.length > 0 ? (
                          <div className="space-y-2 border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50">
                            {groups.map((group) => (
                              <label key={group.id} className="flex items-start gap-3 cursor-pointer hover:bg-white p-3 rounded-md transition-colors">
                                <input
                                  type="checkbox"
                                  checked={data.groups?.includes(group.id) || false}
                                  onChange={() => toggleGroup(group.id)}
                                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-gray-900">{group.name}</span>
                                  {group.description && (
                                    <p className="text-xs text-gray-600 mt-0.5">{group.description}</p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            No groups available. <Link href="/people/groups/" className="text-blue-600 hover:text-blue-700 font-medium">Create a group</Link> first.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <Link
                    href="/people/"
                    className="text-gray-600 hover:text-gray-800 font-medium text-sm"
                  >
                    Cancel
                  </Link>
                  
                  <div className="flex items-center gap-3">
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={handleBack}
                        className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium text-sm"
                      >
                        Back
                      </button>
                    )}
                    
                    {currentStep < 2 ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={processing}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 font-medium text-sm"
                      >
                        {processing ? 'Saving…' : mode === 'create' ? 'Create Member' : 'Save Changes'}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </main>
      </AppShell>
    </>
  )
}
