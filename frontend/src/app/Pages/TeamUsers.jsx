import React, { useState, useEffect } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import UserViewModal from '../components/UserViewModal'
import { THEME } from '../constants/theme'
import { Eye, Pencil, Trash2 } from 'lucide-react'

export default function TeamUsers({ users = [], pagination = {}, orgs = [], groups = [] }) {
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const [viewModal, setViewModal] = useState({ isOpen: false, userId: null })

  // Debug: Log users data
  useEffect(() => {
    console.log('TeamUsers - All users:', users)
    users.forEach(user => {
      console.log(`User ${user.name}: groups =`, user.groups)
    })
  }, [users])

  const handleViewUser = (userId) => {
    setViewModal({ isOpen: true, userId })
  }

  const handleDelete = (userId, userName) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return
    
    toast.promise(
      new Promise((resolve, reject) => {
        router.post(`/settings/team/users/${userId}/delete/`, {}, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          preserveScroll: true,
          onSuccess: () => resolve(),
          onError: () => reject(),
        })
      }),
      {
        loading: 'Deleting user...',
        success: 'User deleted successfully!',
        error: 'Failed to delete user',
      }
    )
  }

  return (
    
    <>
      <Head title="Team - Users" />
      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="team-users" />}

          <main className="flex-1 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
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
              <h1 className="text-xl font-semibold text-gray-800">Users</h1>
            </div>

            <div className="p-6">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Groups</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                          No users found. <Link href="/settings/team/users/" className={THEME.link}>Add your first user</Link>
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#e6f0f1] text-[#4a154b] flex items-center justify-center font-semibold text-sm">
                                {user.name.charAt(0)}
                              </div>
                              <span className="font-medium text-gray-900">{user.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs rounded-full bg-[#e6f0f1] text-[#4a154b]">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {user.groups && user.groups.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {user.groups.map((group) => (
                                  <span 
                                    key={group.id} 
                                    className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-300"
                                  >
                                    {group.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{user.organization || '—'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewUser(user.id)}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#4a154b]"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <Link 
                                href={`/settings/team/users/${user.id}/edit/`}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </Link>
                              <button 
                                onClick={() => handleDelete(user.id, user.name)}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>

        {/* Floating Action Button */}
        <Link href="/settings/team/users/add/" className={THEME.fab} title="Add User">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </Link>

        {/* User View Modal */}
        <UserViewModal
          isOpen={viewModal.isOpen}
          onClose={() => setViewModal({ isOpen: false, userId: null })}
          userId={viewModal.userId}
        />
      </AppShell>
    </>
  )
}
