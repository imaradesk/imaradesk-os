import React from 'react'
import { Head, useForm, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import { THEME } from '../constants/theme'

export default function UserPermissions({ user = {}, roles = [], permissions = {} }) {
  const { data, setData, post, processing } = useForm({
    role: user.role_id || '',
    permissions: user.custom_permissions || [],
  })

  const togglePermission = (permCode) => {
    const current = data.permissions || []
    if (current.includes(permCode)) {
      setData('permissions', current.filter(p => p !== permCode))
    } else {
      setData('permissions', [...current, permCode])
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    toast.promise(
      new Promise((resolve, reject) => {
        post(`/people/${user.id}/permissions/`, {
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
        loading: 'Saving permissions...',
        success: 'Permissions updated successfully!',
        error: 'Failed to update permissions',
      }
    )
  }

  return (
    <>
      <Head title={`Permissions for ${user.name}`} />
      <AppShell active="people">
        <main className="flex-1 bg-gray-50">
          <div className="bg-white border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex items-center gap-3">
                <Link href="/people/" className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <h1 className="text-xl font-semibold text-gray-800">
                  Permissions for {user.name}
                </h1>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign Role</label>
                  <select
                    value={data.role}
                    onChange={(e) => setData('role', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                  >
                    <option value="">— No Role —</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">User inherits all permissions from the selected role</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Additional Permissions</label>
                  <p className="text-xs text-gray-500 mb-3">Grant additional permissions beyond the role</p>
                  {Object.entries(permissions).map(([category, perms]) => (
                    <div key={category} className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{category}</h4>
                      <div className="space-y-2">
                        {perms.map(([code, label]) => (
                          <label key={code} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={data.permissions.includes(code)}
                              onChange={() => togglePermission(code)}
                              className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                            />
                            <span className="text-sm text-gray-700">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <Link
                    href="/people/"
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={processing}
                    className={`px-4 py-2 rounded-lg ${THEME.button.primary} disabled:opacity-50`}
                  >
                    {processing ? 'Saving…' : 'Save Permissions'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </AppShell>
    </>
  )
}
