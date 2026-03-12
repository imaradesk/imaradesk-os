import React, { useState, useEffect } from 'react'
import { Head, Link, router, useForm } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import { THEME } from '../constants/theme'

export default function People({ activeTab = 'users', users = [], pagination = {}, orgs = [], roles = [], groups = [], permissions = {} }) {
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState('create') // 'create' or 'edit'
  const [editingUser, setEditingUser] = useState(null)
  
  // Debug: Log groups data
  useEffect(() => {
    console.log('Groups data:', groups)
  }, [groups])
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false)
  const [roleDrawerMode, setRoleDrawerMode] = useState('create')
  const [editingRole, setEditingRole] = useState(null)
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false)
  const [groupDrawerMode, setGroupDrawerMode] = useState('create')
  const [editingGroup, setEditingGroup] = useState(null)
  const [permDrawerOpen, setPermDrawerOpen] = useState(false)
  const [selectedUserForPerms, setSelectedUserForPerms] = useState(null)

  const { data, setData, post, processing, errors, reset } = useForm({
    username: '',
    email: '',
    password: '',
    full_name: '',
    is_agent: false,
    organization: '',
    groups: [],
  })

  const roleForm = useForm({
    name: '',
    description: '',
    permissions: [],
  })

  const groupForm = useForm({
    name: '',
    description: '',
  })

  const permForm = useForm({
    role: '',
    permissions: [],
  })

  useEffect(() => {
    const handleStart = () => setLoading(true)
    const handleFinish = () => setLoading(false)
    
    const removeStartListener = router.on('start', handleStart)
    const removeFinishListener = router.on('finish', handleFinish)
    
    return () => {
      removeStartListener()
      removeFinishListener()
    }
  }, [])

  const handlePageChange = (page) => {
    router.get(`/people/?page=${page}`, {}, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  const openCreateDrawer = () => {
    reset()
    setDrawerMode('create')
    setEditingUser(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = (user) => {
    setData({
      username: user.username || '',
      email: user.email || '',
      password: '',
      full_name: user.full_name || '',
      is_agent: user.is_agent || false,
      organization: user.organization || '',
      groups: user.groups?.map(g => g.id) || [],
    })
    setDrawerMode('edit')
    setEditingUser(user)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    reset()
    setEditingUser(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const url = drawerMode === 'create' ? '/people/add/' : `/people/${editingUser.id}/edit/`
    const loadingMsg = drawerMode === 'create' ? 'Creating user...' : 'Updating user...'
    const successMsg = drawerMode === 'create' ? 'User created successfully!' : 'User updated successfully!'
    
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
            closeDrawer()
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: loadingMsg,
        success: successMsg,
        error: 'Operation failed',
      }
    )
  }

  const handleDelete = (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    toast.promise(
      new Promise((resolve, reject) => {
        router.post(`/people/${userId}/delete/`, {}, {
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

  // Role management handlers
  const openCreateRoleDrawer = () => {
    roleForm.reset()
    setRoleDrawerMode('create')
    setEditingRole(null)
    setRoleDrawerOpen(true)
  }

  const openEditRoleDrawer = (role) => {
    roleForm.setData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
    })
    setRoleDrawerMode('edit')
    setEditingRole(role)
    setRoleDrawerOpen(true)
  }

  const closeRoleDrawer = () => {
    setRoleDrawerOpen(false)
    roleForm.reset()
    setEditingRole(null)
  }

  const handleRoleSubmit = (e) => {
    e.preventDefault()
    const url = roleDrawerMode === 'create' ? '/roles/new/' : `/roles/${editingRole.id}/edit/`
    roleForm.post(url, {
      headers: {
        'X-CSRFToken': window.csrfToken,
      },
      forceFormData: true,
      preserveScroll: true,
      preserveState: false,
      onSuccess: () => {
        closeRoleDrawer()
        router.reload({ only: ['roles', 'users', 'permissions'] })
      },
    })
  }

  const handleRoleDelete = (roleId) => {
    if (!confirm('Are you sure you want to delete this role?')) return
    router.post(`/roles/${roleId}/delete/`, {}, {
      headers: {
        'X-CSRFToken': window.csrfToken,
      },
      preserveScroll: true,
      preserveState: false,
      onSuccess: () => {
        router.reload({ only: ['roles', 'users'] })
      },
    })
  }

  // Group management handlers
  const openCreateGroupDrawer = () => {
    groupForm.reset()
    setGroupDrawerMode('create')
    setEditingGroup(null)
    setGroupDrawerOpen(true)
  }

  const openEditGroupDrawer = (group) => {
    groupForm.setData({
      name: group.name,
      description: group.description || '',
    })
    setGroupDrawerMode('edit')
    setEditingGroup(group)
    setGroupDrawerOpen(true)
  }

  const closeGroupDrawer = () => {
    setGroupDrawerOpen(false)
    groupForm.reset()
    setEditingGroup(null)
  }

  const handleGroupSubmit = (e) => {
    e.preventDefault()
    const url = groupDrawerMode === 'create' ? '/groups/new/' : `/groups/${editingGroup.id}/edit/`
    const loadingMsg = groupDrawerMode === 'create' ? 'Creating group...' : 'Updating group...'
    const successMsg = groupDrawerMode === 'create' ? 'Group created successfully!' : 'Group updated successfully!'
    
    toast.promise(
      new Promise((resolve, reject) => {
        groupForm.post(url, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          forceFormData: true,
          preserveScroll: true,
          preserveState: false,
          onSuccess: () => {
            closeGroupDrawer()
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: loadingMsg,
        success: successMsg,
        error: 'Operation failed',
      }
    )
  }

  const handleGroupDelete = (groupId) => {
    if (!confirm('Are you sure you want to delete this group?')) return
    toast.promise(
      new Promise((resolve, reject) => {
        router.post(`/groups/${groupId}/delete/`, {}, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          preserveScroll: true,
          preserveState: false,
          onSuccess: () => resolve(),
          onError: () => reject(),
        })
      }),
      {
        loading: 'Deleting group...',
        success: 'Group deleted successfully!',
        error: 'Failed to delete group',
      }
    )
  }

  const toggleGroup = (groupId) => {
    const current = data.groups || []
    if (current.includes(groupId)) {
      setData('groups', current.filter(id => id !== groupId))
    } else {
      setData('groups', [...current, groupId])
    }
  }

  // Permission assignment handlers
  const openPermDrawer = (user) => {
    setSelectedUserForPerms(user)
    permForm.setData({
      role: user.role_id || '',
      permissions: user.custom_permissions || [],
    })
    setPermDrawerOpen(true)
  }

  const closePermDrawer = () => {
    setPermDrawerOpen(false)
    setSelectedUserForPerms(null)
    permForm.reset()
  }

  const handlePermSubmit = (e) => {
    e.preventDefault()
    permForm.post(`/people/${selectedUserForPerms.id}/permissions/`, {
      headers: {
        'X-CSRFToken': window.csrfToken,
      },
      forceFormData: true,
      preserveScroll: true,
      preserveState: false,
      onSuccess: () => {
        closePermDrawer()
        router.reload({ only: ['users'] })
      },
    })
  }

  const togglePermission = (permCode) => {
    const current = roleForm.data.permissions || []
    if (current.includes(permCode)) {
      roleForm.setData('permissions', current.filter(p => p !== permCode))
    } else {
      roleForm.setData('permissions', [...current, permCode])
    }
  }

  const toggleUserPermission = (permCode) => {
    const current = permForm.data.permissions || []
    if (current.includes(permCode)) {
      permForm.setData('permissions', current.filter(p => p !== permCode))
    } else {
      permForm.setData('permissions', [...current, permCode])
    }
  }

  const currentPage = pagination.page || 1
  const totalPages = pagination.pages || 1
  const totalCount = pagination.count || 0
  const hasNext = pagination.has_next || false
  const hasPrev = pagination.has_prev || false

  return (
    <>
      <Head title="People" />
      <AppShell active="people">
        <main className="flex-1 bg-gray-50">
          <div className="bg-white border-b border-gray-200">
            <div className="px-6 py-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-800">People</h1>
              <div className="text-sm text-gray-600">
                {loading ? 'Loading…' : activeTab === 'users' ? `${pagination.total || users.length} user${(pagination.total || users.length) === 1 ? '' : 's'}` : ''}
              </div>
            </div>
            {/* Tabs */}
            <div className="px-6 flex gap-6 border-t border-gray-200">
              <Link
                href="/people/"
                className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'users'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Users
              </Link>
              <Link
                href="/people/roles/"
                className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'roles'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Roles
              </Link>
              <Link
                href="/people/permissions/"
                className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'permissions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Permissions
              </Link>
              <Link
                href="/people/groups/"
                className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'groups'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Groups
              </Link>
            </div>
          </div>

          {/* Users Tab */}
          {activeTab === 'users' && (
          <div className="p-6">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tickets</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    [...Array(10)].map((_, i) => (
                      <tr key={`sk-${i}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                          </div>
                        </td>
                        <td className="px-6 py-4"><div className="h-5 w-40 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-5 w-24 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-5 w-8 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-5 w-12 bg-gray-200 rounded animate-pulse" /></td>
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        No users found. <Link href="/people/add/" className={THEME.link}>Add your first user</Link>
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
                        <td className="px-6 py-4 text-sm text-gray-600">{user.organization || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.tickets}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Link href={`/people/${user.id}/permissions/`} className={`text-sm ${THEME.link}`}>Permissions</Link>
                            <Link href={`/people/${user.id}/edit/`} className="text-sm text-blue-600 hover:text-blue-700">Edit</Link>
                            <button onClick={() => handleDelete(user.id)} className="text-sm text-red-600 hover:text-red-700">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!hasPrev}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1
                        const isNearCurrent = Math.abs(page - currentPage) <= 2
                        const isFirstOrLast = page === 1 || page === totalPages
                        
                        if (!isNearCurrent && !isFirstOrLast) {
                          if (page === 2 || page === totalPages - 1) {
                            return <span key={page} className="px-2 text-gray-400">…</span>
                          }
                          return null
                        }
                        
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1.5 rounded-md text-sm ${
                              page === currentPage
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!hasNext}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Roles Tab */}
          {activeTab === 'roles' && (
          <div className="p-6">
            {roles.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-12 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Roles Found</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new role.</p>
                  <div className="mt-6">
                    <button onClick={openCreateRoleDrawer} className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md ${THEME.button.primary}`}>
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Create Role
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map((role) => (
                  <div key={role.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{role.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => openEditRoleDrawer(role)}
                        className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRoleDelete(role.id)}
                        className="px-3 py-2 border border-red-300 rounded-lg text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Groups Tab */}
          {activeTab === 'groups' && (
          <div className="p-6">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Members</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groups.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                        No groups found. <button onClick={openCreateGroupDrawer} className={THEME.link}>Create your first group</button>
                      </td>
                    </tr>
                  ) : (
                    groups.map((group) => (
                      <tr key={group.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#e6f0f1] text-[#4a154b] flex items-center justify-center font-semibold text-sm">
                              {group.name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900">{group.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{group.description || '—'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <span>{group.member_count || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button onClick={() => openEditGroupDrawer(group)} className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
                            <button onClick={() => handleGroupDelete(group.id)} className="text-sm text-red-600 hover:text-red-700">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
          <div className="p-6">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Permission Categories</h3>
                {Object.entries(permissions).map(([category, perms]) => (
                  <div key={category} className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {perms.map(([code, label]) => (
                        <div key={code} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg">
                          <svg className="w-5 h-5 text-[#4a154b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{label}</p>
                            <p className="text-xs text-gray-500">{code}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </main>

        {/* Drawer Overlay */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              {/* Background overlay */}
              <div 
                className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={closeDrawer}
              ></div>
              
              {/* Drawer panel */}
              <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                <div className="w-screen max-w-md">
                  <div className="h-full flex flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {drawerMode === 'create' ? 'Add User' : `Edit ${editingUser?.name || 'User'}`}
                        </h2>
                        <button
                          onClick={closeDrawer}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Form */}
                    <div className="flex-1 overflow-y-auto">
                      <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {drawerMode === 'create' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                            <input
                              type="text"
                              value={data.username}
                              onChange={(e) => setData('username', e.target.value)}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors?.username ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="jdoe"
                            />
                            {errors?.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                          <input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors?.email ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="jdoe@example.com"
                          />
                          {errors?.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                        </div>

                        {drawerMode === 'create' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                            <input
                              type="password"
                              value={data.password}
                              onChange={(e) => setData('password', e.target.value)}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors?.password ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="••••••••"
                            />
                            {errors?.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                          </div>
                        )}

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

                        <div className="flex items-center gap-2">
                          <input
                            id="is_agent"
                            type="checkbox"
                            checked={!!data.is_agent}
                            onChange={(e) => setData('is_agent', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="is_agent" className="text-sm text-gray-700">Agent</label>
                        </div>

                        {data.is_agent && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Agent Groups {groups?.length > 0 ? `(${groups.length} available)` : ''}
                            </label>
                            {groups && groups.length > 0 ? (
                              <div className="space-y-2 border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                                {groups.map((group) => (
                                  <label key={group.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <input
                                      type="checkbox"
                                      checked={data.groups?.includes(group.id) || false}
                                      onChange={() => toggleGroup(group.id)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                      <span className="text-sm font-medium text-gray-900">{group.name}</span>
                                      {group.description && (
                                        <p className="text-xs text-gray-500">{group.description}</p>
                                      )}
                                    </div>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-gray-200">
                                No groups available. <Link href="/people/groups/" className={THEME.link}>Create a group</Link> first.
                              </div>
                            )}
                          </div>
                        )}
                      </form>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={closeDrawer}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={processing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                      >
                        {processing ? 'Saving…' : drawerMode === 'create' ? 'Create User' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Role Drawer */}
        {roleDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeRoleDrawer}></div>
              <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                <div className="w-screen max-w-md">
                  <div className="h-full flex flex-col bg-white shadow-xl">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {roleDrawerMode === 'create' ? 'Create Role' : `Edit ${editingRole?.name || 'Role'}`}
                        </h2>
                        <button onClick={closeRoleDrawer} className="text-gray-400 hover:text-gray-500">
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <form onSubmit={handleRoleSubmit} className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
                          <input
                            type="text"
                            value={roleForm.data.name}
                            onChange={(e) => roleForm.setData('name', e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                            placeholder="Administrator"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={roleForm.data.description}
                            onChange={(e) => roleForm.setData('description', e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                            placeholder="Full system access..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
                          {Object.entries(permissions).map(([category, perms]) => (
                            <div key={category} className="mb-4">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{category}</h4>
                              <div className="space-y-2">
                                {perms.map(([code, label]) => (
                                  <label key={code} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={roleForm.data.permissions.includes(code)}
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
                      </form>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                      <button type="button" onClick={closeRoleDrawer} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        Cancel
                      </button>
                      <button onClick={handleRoleSubmit} disabled={roleForm.processing} className={`px-4 py-2 rounded-lg ${THEME.button.primary} disabled:opacity-50`}>
                        {roleForm.processing ? 'Saving…' : roleDrawerMode === 'create' ? 'Create Role' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Group Drawer */}
        {groupDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeGroupDrawer}></div>
              <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                <div className="w-screen max-w-md">
                  <div className="h-full flex flex-col bg-white shadow-xl">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {groupDrawerMode === 'create' ? 'Create Group' : `Edit ${editingGroup?.name || 'Group'}`}
                        </h2>
                        <button onClick={closeGroupDrawer} className="text-gray-400 hover:text-gray-500">
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <form onSubmit={handleGroupSubmit} className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
                          <input
                            type="text"
                            value={groupForm.data.name}
                            onChange={(e) => groupForm.setData('name', e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                            placeholder="Support Team"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={groupForm.data.description}
                            onChange={(e) => groupForm.setData('description', e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                            placeholder="Team responsible for customer support..."
                          />
                        </div>
                      </form>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                      <button type="button" onClick={closeGroupDrawer} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        Cancel
                      </button>
                      <button onClick={handleGroupSubmit} disabled={groupForm.processing} className={`px-4 py-2 rounded-lg ${THEME.button.primary} disabled:opacity-50`}>
                        {groupForm.processing ? 'Saving…' : groupDrawerMode === 'create' ? 'Create Group' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Permission Assignment Drawer */}
        {permDrawerOpen && selectedUserForPerms && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closePermDrawer}></div>
              <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                <div className="w-screen max-w-md">
                  <div className="h-full flex flex-col bg-white shadow-xl">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Permissions for {selectedUserForPerms.name}
                        </h2>
                        <button onClick={closePermDrawer} className="text-gray-400 hover:text-gray-500">
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <form onSubmit={handlePermSubmit} className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Assign Role</label>
                          <select
                            value={permForm.data.role}
                            onChange={(e) => permForm.setData('role', e.target.value)}
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
                                  <label key={code} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={permForm.data.permissions.includes(code)}
                                      onChange={() => toggleUserPermission(code)}
                                      className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                                    />
                                    <span className="text-sm text-gray-700">{label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </form>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                      <button type="button" onClick={closePermDrawer} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        Cancel
                      </button>
                      <button onClick={handlePermSubmit} disabled={permForm.processing} className={`px-4 py-2 rounded-lg ${THEME.button.primary} disabled:opacity-50`}>
                        {permForm.processing ? 'Saving…' : 'Save Permissions'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button */}
        {activeTab === 'users' && (
          <Link href="/people/add/" className={THEME.fab} title="Add Person">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </Link>
        )}
        {activeTab === 'roles' && (
          <button onClick={openCreateRoleDrawer} className={THEME.fab} title="Add Role">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
        {activeTab === 'groups' && (
          <button onClick={openCreateGroupDrawer} className={THEME.fab} title="Add Group">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </AppShell>
    </>
  )
}
