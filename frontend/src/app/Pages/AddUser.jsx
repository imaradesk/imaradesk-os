import React, { useEffect } from 'react'
import { Head, useForm, Link } from '@inertiajs/react'
import { useDirtyState, useUnsavedChanges } from '../context/UnsavedChangesContext'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import { THEME } from '../constants/theme'

export default function AddUser({ organization = null, errors = {}, old = {} }) {
  const { data, setData, post, processing } = useForm({
    email: old.email || '',
    first_name: old.first_name || '',
    last_name: old.last_name || '',
    is_agent: !!old.is_agent,
  })
  const dirty = useDirtyState(data)
  const { allowNextNavigation } = useUnsavedChanges(dirty)


  useEffect(() => {
    // Show error toasts for server validation errors
    const errorKeys = Object.keys(errors)
    if (errorKeys.length > 0) {
      errorKeys.forEach(key => {
        if (errors[key]) {
          toast.error(errors[key])
        }
      })
    }
  }, [errors])

  const handleSubmit = (e) => {
    e.preventDefault()
    toast.promise(
      new Promise((resolve, reject) => {
        post('/people/add/', {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          forceFormData: true,
          preserveScroll: true,
          onSuccess: () => {
            resolve()
            toast.success('User created successfully!')
          },
          onError: () => reject(),
        })
      }),
      {
        loading: 'Creating user...',
        success: 'User added!',
        error: 'Failed to create user',
      }
    )
  }

  return (
    <>
      <Head title="Add User" />
      <AppShell active="people">
        <main className="flex-1">
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800">Add User</h1>
            <div className="flex items-center gap-3">
              <Link href="/people/" className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Back to People</Link>
            </div>
          </div>

          <div className="p-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={data.first_name}
                      onChange={(e) => setData('first_name', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors?.first_name ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="John"
                    />
                    {errors?.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={data.last_name}
                      onChange={(e) => setData('last_name', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors?.last_name ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Doe"
                    />
                    {errors?.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors?.email ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="jdoe@example.com"
                  />
                  {errors?.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                  <input
                    type="text"
                    value={organization?.name || 'Default Organization'}
                    disabled
                    className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-600 border-gray-300 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">User will be added to your organization</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="is_agent"
                    type="checkbox"
                    checked={!!data.is_agent}
                    onChange={(e) => setData('is_agent', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_agent" className="text-sm text-gray-700">This user is an agent (support staff)</label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Note:</span> A secure password will be auto-generated and sent to the user's email along with login instructions.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                    {processing ? 'Creating...' : 'Create User'}
                  </button>
                  <Link href="/people/" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</Link>
                </div>
              </form>
            </div>
          </div>
        </main>
      </AppShell>
    </>
  )
}
