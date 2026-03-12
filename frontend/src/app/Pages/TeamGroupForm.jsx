import React, { useState } from 'react'
import { Head, useForm, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import { THEME } from '../constants/theme'

export default function TeamGroupForm({ mode = 'add', group = {}, errors: serverErrors = {} }) {
  const [sidenavOpen, setSidenavOpen] = useState(true)
  
  const { data, setData, post, processing, errors } = useForm({
    name: group.name || '',
    description: group.description || '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const url = mode === 'add' ? '/settings/team/groups/add/' : `/settings/team/groups/${group.id}/edit/`
    const successMsg = mode === 'add' ? 'Group created successfully!' : 'Group updated successfully!'
    
    toast.promise(
      new Promise((resolve, reject) => {
        post(url, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          forceFormData: true,
          preserveScroll: true,
          onSuccess: () => {
            router.visit('/settings/team/groups/')
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: mode === 'add' ? 'Creating group...' : 'Updating group...',
        success: successMsg,
        error: 'Operation failed',
      }
    )
  }

  const allErrors = { ...serverErrors, ...errors }

  return (
    <>
      <Head title={mode === 'add' ? 'Add Group' : 'Edit Group'} />
      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="team-groups" />}

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
                {mode === 'add' ? 'Add Group' : 'Edit Group'}
              </h1>
            </div>

            <div className="p-6 ">
              <div className="max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Group Name* <span className="text-xs text-gray-500">(required)</span>
                      </label>
                      <input
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          allErrors?.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter group name"
                      />
                      {allErrors?.name && <p className="mt-1 text-sm text-red-600">{allErrors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter group description"
                      />
                    </div>

                    {/* Actionsc */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      <Link
                        href="/settings/team/groups/"
                        className={`px-4 py-2 rounded-md ${THEME.button.secondary}`}
                      >
                        Cancel
                      </Link>
                      <button
                        type="submit"
                        disabled={processing}
                        className={`px-4 py-2 rounded-md ${THEME.button.primary} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {mode === 'add' ? 'Create Group' : 'Update Group'}
                      </button>
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
