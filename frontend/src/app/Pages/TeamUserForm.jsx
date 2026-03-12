import React, { useState, useEffect } from 'react'
import { Head, useForm, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import Select from '../components/SearchableSelect'
import { THEME } from '../constants/theme'

export default function TeamUserForm({ mode = 'add', user = {}, orgs = [], roles = [], groups = [], errors: serverErrors = {} }) {
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  
  const { data, setData, post, processing, errors } = useForm({
    username: user.username || '',
    email: user.email || '',
    password: '',
    full_name: user.full_name || '',
    organization: user.organization || '',
    role: user.role || '',
    groups: Array.isArray(user.groups) ? user.groups : [],
  })

  // Debug: Log the groups to console
  useEffect(() => {
    console.log('User groups (raw):', user.groups)
    console.log('Data groups:', data.groups)
    console.log('Groups available:', groups.map(g => ({ id: g.id, name: g.name })))
  }, [user.groups, data.groups, groups])

  const toggleGroup = (groupId) => {
    const current = data.groups || []
    const numGroupId = Number(groupId)
    // Check if already selected (handle both number and string comparisons)
    const isSelected = current.some(id => Number(id) === numGroupId)
    if (isSelected) {
      setData('groups', current.filter(id => Number(id) !== numGroupId))
    } else {
      setData('groups', [...current, numGroupId])
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const url = mode === 'add' ? '/settings/team/users/add/' : `/settings/team/users/${user.id}/edit/`
    const successMsg = mode === 'add' ? 'User created successfully!' : 'User updated successfully!'
    
    // Debug: Log what's being sent
    console.log('Submitting groups:', data.groups)
    
    toast.promise(
      new Promise((resolve, reject) => {
        post(url, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          forceFormData: true,
          preserveScroll: true,
          onSuccess: () => {
            router.visit('/settings/team/users/')
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: mode === 'add' ? 'Creating user...' : 'Updating user...',
        success: successMsg,
        error: 'Operation failed',
      }
    )
  }

  const handleNext = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (currentStep === 1) {
      if (!data.full_name || !data.email) {
        toast.error('Please fill in all required fields')
        return false
      }
      if (mode === 'add' && !data.password) {
        toast.error('Password is required')
        return false
      }
      setCurrentStep(2)
    }
    return false
  }

  const handleBack = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
    return false
  }

  const allErrors = { ...serverErrors, ...errors }

  return (
    <>
      <Head title={mode === 'add' ? 'Add User' : 'Edit User'} />
      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="team-users" />}

          <main className="flex-1 bg-gray-50">
            <div className=" border-b border-gray-200 px-6 py-4 flex items-center gap-3">
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
              <h1 className="text-xl font-semibold text-gray-800">
                {mode === 'add' ? 'Add User' : 'Edit User'}
              </h1>
            </div>

            <div className="flex gap-0">
              {/* Vertical Step Indicators */}
              <div className="w-64 flex-shrink-0  border-r border-gray-200 p-6">
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
                          <h4 className={`text-sm font-medium ${currentStep === 1 ? 'text-gray-900' : currentStep > 1 ? 'text-green-600' : 'text-gray-500'}`}>
                            Enter details
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">Basic user information</p>
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
                          currentStep === 2 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          2
                        </div>
                        <div className="flex-1 pt-1">
                          <h4 className={`text-sm font-medium ${currentStep === 2 ? 'text-gray-900' : 'text-gray-500'}`}>
                            Assign role & groups
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">Permissions and access</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Form */}
              <div className="flex-1  p-6">
                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
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

                        {mode === 'add' && (
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

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                          <Select
                            value={data.organization}
                            onChange={(value) => setData('organization', value)}
                            options={orgs}
                            placeholder="Select organization"
                            displayKey="name"
                            valueKey="id"
                            searchable={true}
                            allowClear={true}
                          />
                        </div>


                      </>
                    )}

                    {/* Step 2: Assign Role & Groups */}
                    {currentStep === 2 && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                          <Select
                            value={data.role}
                            onChange={(value) => setData('role', value)}
                            options={roles}
                            placeholder="Select role"
                            displayKey="name"
                            valueKey="id"
                            searchable={true}
                            allowClear={true}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Groups</label>
                          <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
                            {groups.length === 0 ? (
                              <p className="text-sm text-gray-500">No groups available</p>
                            ) : (
                              groups.map(group => {
                                // Ensure both values are numbers for comparison
                                const isChecked = data.groups.some(gId => Number(gId) === Number(group.id))
                                return (
                                  <div key={group.id} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`group-${group.id}`}
                                      checked={isChecked}
                                      onChange={() => toggleGroup(group.id)}
                                      className="rounded border-gray-300"
                                    />
                                    <label htmlFor={`group-${group.id}`} className="text-sm text-gray-700 cursor-pointer">
                                      {group.name}
                                      {group.description && <span className="text-gray-500 ml-1">- {group.description}</span>}
                                    </label>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div>
                        {currentStep > 1 && (
                          <button
                            type="button"
                            onClick={handleBack}
                            className={`px-4 py-2 rounded-md ${THEME.button.secondary}`}
                          >
                            Back
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          href="/settings/team/users/"
                          className={`px-4 py-2 rounded-md ${THEME.button.secondary}`}
                        >
                          Cancel
                        </Link>
                        {currentStep === 1 ? (
                          <button
                            type="button"
                            onClick={handleNext}
                            className={`px-4 py-2 rounded-md ${THEME.button.primary}`}
                          >
                            Next
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={processing}
                            className={`px-4 py-2 rounded-md ${THEME.button.primary} disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {mode === 'add' ? 'Create User' : 'Update User'}
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
