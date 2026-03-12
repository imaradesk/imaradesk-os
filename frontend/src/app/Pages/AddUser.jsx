import React, { useEffect } from 'react'
import { Head, useForm, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import { THEME } from '../constants/theme'

export default function AddUser({ orgs = [], errors = {}, old = {} }) {
  const { data, setData, post, processing } = useForm({
    username: old.username || '',
    email: old.email || '',
    password: old.password || '',
    full_name: old.full_name || '',
    is_agent: !!old.is_agent,
    organization: old.organization || '',
  })

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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={data.username}
                    onChange={(e) => setData('username', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors?.username ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="jdoe"
                  />
                  {errors?.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors?.password ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="••••••••"
                  />
                  {errors?.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={data.full_name}
                    onChange={(e) => setData('full_name', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                    placeholder="John Doe"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      id="is_agent"
                      type="checkbox"
                      checked={!!data.is_agent}
                      onChange={(e) => setData('is_agent', e.target.checked)}
                    />
                    <label htmlFor="is_agent" className="text-sm text-gray-700">Agent</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                    <select
                      value={data.organization}
                      onChange={(e) => setData('organization', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                    >
                      <option value="">— None —</option>
                      {orgs?.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button type="submit" disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                    {processing ? 'Saving…' : 'Create User'}
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
