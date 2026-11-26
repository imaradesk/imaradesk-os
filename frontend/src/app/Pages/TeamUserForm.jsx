import React, { useState } from 'react'
import { Head, useForm, Link, router } from '@inertiajs/react'
import { useDirtyState, useUnsavedChanges } from '../context/UnsavedChangesContext'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import { SettingsHeading } from '../components/settings/SettingsPage'
import Select from '../components/SearchableSelect'
import { THEME } from '../constants/theme'

export default function TeamUserForm({ organization = null, roles = [], groups = [], errors: serverErrors = {} }) {
  const [currentStep, setCurrentStep] = useState(1)

  const { data, setData, post, processing, errors } = useForm({
    email: '',
    full_name: '',
    role: '',
    groups: [],
  })
  const dirty = useDirtyState(data)
  const { allowNextNavigation } = useUnsavedChanges(dirty)


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

    toast.promise(
      new Promise((resolve, reject) => {
        post('/administration/team/users/add/', {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          forceFormData: true,
          preserveScroll: true,
          onSuccess: () => {
            allowNextNavigation()
            router.visit('/administration/team/users/')
            resolve()
          },
          onError: (errs) => reject(errs),
        })
      }),
      {
        loading: 'Creating user...',
        success: 'User created successfully!',
        error: (errs) => errs?.limit || 'Operation failed',
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
      <Head title="Add User" />
      <AppShell active="settings" fixedHeight>
        <div className="flex flex-1 min-h-0 overflow-hidden">

          <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex flex-wrap items-center gap-3 justify-between">
              <SettingsHeading section="team-users">
                Add User
              </SettingsHeading>
            </div>

            <div className="flex gap-0 max-w-6xl mx-auto w-full">
              {/* Vertical Step Indicators */}
              <div className="w-64 flex-shrink-0  border-r border-gray-200 p-6">
                <div className="sticky top-24">
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

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                          <input
                            type="text"
                            value={organization?.name || 'Default Organization'}
                            disabled
                            className="w-full px-3 py-2 border rounded-md bg-gray-100 text-gray-600 border-gray-300 cursor-not-allowed"
                          />
                          <p className="mt-1 text-xs text-gray-500">User will be added to your organization</p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-700">
                            <span className="font-medium">Note:</span> A secure password will be auto-generated and sent to the user's email.
                          </p>
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
                          href="/administration/team/users/"
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
                            Create User
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
