import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import RoleViewModal from '../components/RoleViewModal'
import Drawer, { DrawerBody, DrawerFooter } from '../components/Drawer'
import { THEME } from '../constants/theme'
import { Eye, Pencil, Trash2, Shield } from 'lucide-react'

export default function TeamRoles({ roles = [], permissions = {} }) {
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const [viewModal, setViewModal] = useState({ isOpen: false, roleId: null })
  const [permDrawer, setPermDrawer] = useState({ isOpen: false, role: null, selectedPerms: [] })
  const [saving, setSaving] = useState(false)

  const handleViewRole = (roleId) => {
    setViewModal({ isOpen: true, roleId })
  }

  const handleOpenPermissions = (role) => {
    // Fetch current permissions
    fetch(`/settings/team/roles/${role.id}/view/`)
      .then(res => res.json())
      .then(data => {
        setPermDrawer({
          isOpen: true,
          role: data,
          selectedPerms: data.permissions || []
        })
      })
      .catch(() => {
        toast.error('Failed to load permissions')
      })
  }

  const togglePermission = (permKey) => {
    setPermDrawer(prev => {
      const current = prev.selectedPerms || []
      if (current.includes(permKey)) {
        return { ...prev, selectedPerms: current.filter(p => p !== permKey) }
      } else {
        return { ...prev, selectedPerms: [...current, permKey] }
      }
    })
  }

  const handleSavePermissions = () => {
    setSaving(true)
    const formData = new FormData()
    permDrawer.selectedPerms.forEach(perm => {
      formData.append('permissions', perm)
    })

    fetch(`/settings/team/roles/${permDrawer.role.id}/permissions/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': window.csrfToken,
      },
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Permissions updated successfully')
          setPermDrawer({ isOpen: false, role: null, selectedPerms: [] })
          router.reload({ only: ['roles'] })
        } else {
          toast.error(data.error || 'Failed to update permissions')
        }
      })
      .catch(() => {
        toast.error('Failed to update permissions')
      })
      .finally(() => {
        setSaving(false)
      })
  }

  const handleDelete = (roleId, roleName, isSystem) => {
    if (isSystem) {
      toast.error('System roles cannot be deleted')
      return
    }
    
    if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) return
    
    toast.promise(
      new Promise((resolve, reject) => {
        router.post(`/settings/team/roles/${roleId}/delete/`, {}, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          preserveScroll: true,
          onSuccess: () => resolve(),
          onError: () => reject(),
        })
      }),
      {
        loading: 'Deleting role...',
        success: 'Role deleted successfully!',
        error: 'Failed to delete role',
      }
    )
  }

  return (
    <>
      <Head title="Team - Roles" />
      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="team-roles" />}

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
              <h1 className="text-xl font-semibold text-gray-800">Roles</h1>
            </div>

            <div className="p-6">
              {roles.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Roles Found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new role.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles.map((role) => (
                    <div key={role.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{role.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{role.description || 'No description'}</p>
                          <div className="mt-3">
                            <span className="text-xs text-gray-500">{role.permissions?.length || 0} permissions</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => handleViewRole(role.id)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#4a154b]"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenPermissions(role)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-green-600"
                            title="Permissions"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <Link 
                            href={`/settings/team/roles/${role.id}/edit/`}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          {!role.is_system && (
                            <button 
                              onClick={() => handleDelete(role.id, role.name, role.is_system)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Floating Action Button */}
        <Link href="/settings/team/roles/add/" className={THEME.fab} title="Add Role">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </Link>
      </AppShell>

      {/* Role View Modal */}
      <RoleViewModal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, roleId: null })}
        roleId={viewModal.roleId}
      />

      {/* Permissions Drawer */}
      <Drawer
        isOpen={permDrawer.isOpen}
        onClose={() => setPermDrawer({ isOpen: false, role: null, selectedPerms: [] })}
        title={`Permissions - ${permDrawer.role?.name || ''}`}
        width="max-w-lg"
      >
        <DrawerBody>
          {permDrawer.role?.all_permissions ? (
            <div className="space-y-6">
              {Object.entries(permDrawer.role.all_permissions).map(([category, perms]) => (
                <div key={category}>
                  <h4 className="font-medium text-gray-900 text-sm uppercase tracking-wide mb-3">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {perms.map((perm) => {
                      const isChecked = permDrawer.selectedPerms.includes(perm.key)
                      return (
                        <div key={perm.key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`perm-${perm.key}`}
                            checked={isChecked}
                            onChange={() => togglePermission(perm.key)}
                            className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                          />
                          <label 
                            htmlFor={`perm-${perm.key}`} 
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {perm.label}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Loading permissions...
            </div>
          )}
        </DrawerBody>
        <DrawerFooter>
          <button
            onClick={() => setPermDrawer({ isOpen: false, role: null, selectedPerms: [] })}
            className={`px-4 py-2 rounded-md ${THEME.button.secondary}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={saving}
            className={`px-4 py-2 rounded-md ${THEME.button.primary} disabled:opacity-50`}
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </DrawerFooter>
      </Drawer>
    </>
  )
}
