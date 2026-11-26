import React, { useState, useEffect } from 'react'
import { Head, Link, router, useForm } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import DataTable from '../../components/DataTable'
import { THEME } from '../constants/theme'
import Drawer, { DrawerBody } from '../components/Drawer'
import { UserPlus, UserCog, Users, ShieldCheck } from 'lucide-react'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import Tabs from '../components/Tabs'
import SimpleSelect from '../components/SimpleSelect'

export default function People({ activeTab = 'users', users = [], pagination = {}, orgs = [], roles = [], groups = [], permissions = {} }) {
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState('create') // 'create' or 'edit'
  const [editingUser, setEditingUser] = useState(null)
  
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false)
  const [groupDrawerMode, setGroupDrawerMode] = useState('create')
  const [editingGroup, setEditingGroup] = useState(null)
  const [permDrawerOpen, setPermDrawerOpen] = useState(false)
  const [selectedUserForPerms, setSelectedUserForPerms] = useState(null)

  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    first_name: '',
    last_name: '',
    is_agent: false,
    groups: [],
  })

  const groupForm = useForm({
    name: '',
    description: '',
  })

  const permForm = useForm({
    role: '',
    permissions: [],
  })

  const [userBaseline, setUserBaseline] = useState(null)
  const [groupBaseline, setGroupBaseline] = useState(null)
  const [permBaseline, setPermBaseline] = useState(null)
  const userDirty = drawerOpen && userBaseline && JSON.stringify(data) !== JSON.stringify(userBaseline)
  const groupDirty = groupDrawerOpen && groupBaseline && JSON.stringify(groupForm.data) !== JSON.stringify(groupBaseline)
  const permDirty = permDrawerOpen && permBaseline && JSON.stringify(permForm.data) !== JSON.stringify(permBaseline)
  const userGuard = useUnsavedChanges(userDirty)
  const groupGuard = useUnsavedChanges(groupDirty)
  const permGuard = useUnsavedChanges(permDirty)

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
    setUserBaseline({ email: '', first_name: '', last_name: '', is_agent: false, groups: [] })
    setDrawerMode('create')
    setEditingUser(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = (user) => {
    const next = {
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      is_agent: user.is_agent || false,
      groups: user.groups?.map(g => g.id) || [],
    }
    setData(next)
    setUserBaseline(next)
    setDrawerMode('edit')
    setEditingUser(user)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    reset()
    setEditingUser(null)
    setUserBaseline(null)
  }
  const requestCloseDrawer = () => userGuard.guard(closeDrawer)

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

  // Group management handlers
  const openCreateGroupDrawer = () => {
    groupForm.reset()
    setGroupBaseline({ name: '', description: '' })
    setGroupDrawerMode('create')
    setEditingGroup(null)
    setGroupDrawerOpen(true)
  }

  const openEditGroupDrawer = (group) => {
    const next = { name: group.name, description: group.description || '' }
    groupForm.setData(next)
    setGroupBaseline(next)
    setGroupDrawerMode('edit')
    setEditingGroup(group)
    setGroupDrawerOpen(true)
  }

  const closeGroupDrawer = () => {
    setGroupDrawerOpen(false)
    groupForm.reset()
    setEditingGroup(null)
    setGroupBaseline(null)
  }
  const requestCloseGroupDrawer = () => groupGuard.guard(closeGroupDrawer)

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
    const next = { role: user.role_id || '', permissions: user.custom_permissions || [] }
    setSelectedUserForPerms(user)
    permForm.setData(next)
    setPermBaseline(next)
    setPermDrawerOpen(true)
  }

  const closePermDrawer = () => {
    setPermDrawerOpen(false)
    setSelectedUserForPerms(null)
    permForm.reset()
    setPermBaseline(null)
  }
  const requestClosePermDrawer = () => permGuard.guard(closePermDrawer)

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
        permGuard.allowNextNavigation()
        router.reload({ only: ['users'] })
      },
    })
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
            <div className="px-6 py-2 border-t border-gray-200">
              <Tabs
                label="People sections"
                active={activeTab}
                tabs={[
                  { id: 'users', label: 'Users', href: '/people/' },
                  { id: 'permissions', label: 'Permissions', href: '/people/permissions/' },
                  { id: 'groups', label: 'Groups', href: '/people/groups/' },
                ]}
              />
            </div>
          </div>

          {/* Users Tab */}
          {activeTab === 'users' && (
          <div className="p-6">
            <DataTable
              loading={loading}
              skeletonRows={10}
              data={users}
              serverPagination={{ page: currentPage, pages: totalPages, count: totalCount, has_next: hasNext, has_prev: hasPrev }}
              onPageChange={(page) => handlePageChange(page)}
              defaultPageSize={10}
              defaultSortKey="name"
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  skeleton: () => (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ),
                  render: (user) => (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#e6f0f1] text-[#0B3D26] flex items-center justify-center font-semibold text-sm shrink-0">
                        {user.name?.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  ),
                },
                {
                  key: 'email',
                  header: 'Email',
                  cellClassName: 'text-gray-600',
                  skeletonWidth: '70%',
                },
                {
                  key: 'role',
                  header: 'Role',
                  render: (user) => (
                    <span className="px-2 py-1 text-xs rounded-full bg-[#e6f0f1] text-[#0B3D26]">
                      {user.role}
                    </span>
                  ),
                  skeletonWidth: '40%',
                },
                {
                  key: 'organization',
                  header: 'Organization',
                  cellClassName: 'text-gray-600',
                  render: (user) => user.organization || '—',
                  defaultHidden: false,
                },
                {
                  key: 'tickets',
                  header: 'Tickets',
                  cellClassName: 'text-gray-600',
                  skeletonWidth: '30%',
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  sortable: false,
                  hideable: false,
                  render: (user) => (
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); openPermDrawer(user) }} className={`text-sm ${THEME.link}`}>Permissions</button>
                      <button onClick={(e) => { e.stopPropagation(); openEditDrawer(user) }} className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(user.id) }} className="text-sm text-red-600 hover:text-red-700">Delete</button>
                    </div>
                  ),
                  skeletonWidth: '50%',
                },
              ]}
            />
          </div>
          )}

          {/* Groups Tab */}
          {activeTab === 'groups' && (
          <div className="p-6">
            <DataTable
              data={groups}
              defaultSortKey="name"
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  render: (group) => (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#e6f0f1] text-[#0B3D26] flex items-center justify-center font-semibold text-sm shrink-0">
                        {group.name?.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{group.name}</span>
                    </div>
                  ),
                },
                {
                  key: 'description',
                  header: 'Description',
                  cellClassName: 'text-gray-600',
                  render: (group) => group.description || '—',
                },
                {
                  key: 'member_count',
                  header: 'Members',
                  render: (group) => (
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>{group.member_count || 0}</span>
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  sortable: false,
                  hideable: false,
                  render: (group) => (
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); openEditGroupDrawer(group) }} className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); handleGroupDelete(group.id) }} className="text-sm text-red-600 hover:text-red-700">Delete</button>
                    </div>
                  ),
                },
              ]}
            />
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
                          <svg className="w-5 h-5 text-[#0B3D26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <Drawer
          isOpen={drawerOpen}
          onClose={requestCloseDrawer}
          title={drawerMode === 'create' ? 'Add User' : `Edit ${editingUser?.name || 'User'}`}
          description={drawerMode === 'create' ? 'Add a teammate' : editingUser?.email}
          icon={drawerMode === 'create' ? UserPlus : UserCog}
          size="sm"
          floating
          footer={(
            <>
              <span className="flex-1" />
              <button
                type="button"
                onClick={requestCloseDrawer}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={processing}
                className={`px-4 py-2 rounded-lg ${THEME.button.primary} disabled:opacity-50`}
              >
                {processing ? 'Saving…' : drawerMode === 'create' ? 'Create User' : 'Save Changes'}
              </button>
            </>
          )}
        >
          <DrawerBody noPadding>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {drawerMode === 'create' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Note:</span> A secure password will be auto-generated and sent to the user's email.
                  </p>
                </div>
              )}

              {drawerMode === 'edit' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
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
              )}

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
              {errors?.is_agent && <p className="text-sm text-red-600">{errors.is_agent}</p>}

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
          
          </DrawerBody>
        </Drawer>

        {/* Group Drawer */}
        <Drawer
          isOpen={groupDrawerOpen}
          onClose={requestCloseGroupDrawer}
          title={groupDrawerMode === 'create' ? 'Create Group' : `Edit ${editingGroup?.name || 'Group'}`}
          description="Groups organise agents for routing and permissions."
          icon={Users}
          size="sm"
          floating
          footer={(
            <>
              <span className="flex-1" />
              <button type="button" onClick={requestCloseGroupDrawer} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleGroupSubmit} disabled={groupForm.processing} className={`px-4 py-2 rounded-lg ${THEME.button.primary} disabled:opacity-50`}>
                {groupForm.processing ? 'Saving…' : groupDrawerMode === 'create' ? 'Create Group' : 'Save Changes'}
              </button>
            </>
          )}
        >
          <DrawerBody noPadding>
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
          
          </DrawerBody>
        </Drawer>

        {/* Permission Assignment Drawer */}
        <Drawer
          isOpen={permDrawerOpen && !!selectedUserForPerms}
          onClose={requestClosePermDrawer}
          title={`Permissions for ${selectedUserForPerms?.name}`}
          description="Pick a role, then grant any extra permissions."
          icon={ShieldCheck}
          size="sm"
          floating
          footer={(
            <>
              <span className="flex-1" />
              <button type="button" onClick={requestClosePermDrawer} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handlePermSubmit} disabled={permForm.processing} className={`px-4 py-2 rounded-lg ${THEME.button.primary} disabled:opacity-50`}>
                {permForm.processing ? 'Saving…' : 'Save Permissions'}
              </button>
            </>
          )}
        >
          <DrawerBody noPadding>
            <form onSubmit={handlePermSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Role</label>
                <SimpleSelect value={permForm.data.role} onChange={(value) => permForm.setData('role', value)} options={roles} emptyLabel="— No Role —" />
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
                            className="rounded border-gray-300 text-[#0B3D26] focus:ring-[#0B3D26]"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </form>
          
          </DrawerBody>
        </Drawer>

        {/* Floating Action Button */}
        {activeTab === 'users' && (
          <Link href="/people/add/" className={THEME.fab} title="Add Person">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </Link>
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
