import React from 'react'
import { Head, useForm, Link } from '@inertiajs/react'
import AppShell from '../components/AppShell'

export default function EditUser({ user, orgs = [], errors = {} }) {
  const { data, setData, post, processing } = useForm({
    full_name: user?.full_name || '',
    email: user?.email || '',
    is_agent: !!user?.is_agent,
    organization: user?.organization || '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    post(`/people/${user.id}/edit/`, {
      headers: {
        'X-CSRFToken': window.csrfToken,
      },
      forceFormData: true,
      preserveScroll: true,
    })
  }

  return (
    <>
      <Head title={`Edit ${user?.username || 'User'}`} />
      <AppShell active="people">
        <main className="flex-1">
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800">Edit User</h1>
            <div className="flex items-center gap-3">
              <Link href="/people/" className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Back to People</Link>
            </div>
          </div>

          <div className="p-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl">
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    {processing ? 'Saving…' : 'Save Changes'}
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
