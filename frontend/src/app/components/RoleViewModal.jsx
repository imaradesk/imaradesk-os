import React, { useState, useEffect } from 'react'
import Modal, { ModalHeader, ModalBody } from './Modal'
import { COLORS } from '../constants/theme'
import { Shield } from 'lucide-react'

export default function RoleViewModal({ isOpen, onClose, roleId }) {
  const [activeTab, setActiveTab] = useState('users')
  const [loading, setLoading] = useState(true)
  const [roleData, setRoleData] = useState(null)

  useEffect(() => {
    if (isOpen && roleId) {
      setLoading(true)
      setActiveTab('users')
      // Fetch role details
      fetch(`/settings/team/roles/${roleId}/view/`)
        .then(res => res.json())
        .then(data => {
          setRoleData(data)
          setTimeout(() => setLoading(false), 500)
        })
        .catch(() => {
          setLoading(false)
          onClose()
        })
    }
  }, [isOpen, roleId])

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Group permissions by category for display
  const getPermissionsByCategory = () => {
    if (!roleData?.all_permissions || !roleData?.permissions) return {}
    
    const grouped = {}
    Object.entries(roleData.all_permissions).forEach(([category, perms]) => {
      const categoryPerms = perms.filter(p => roleData.permissions.includes(p.key))
      if (categoryPerms.length > 0) {
        grouped[category] = categoryPerms
      }
    })
    return grouped
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Role Details"
      maxWidth="max-w-4xl"
    >
      {loading ? (
        <RoleSkeleton />
      ) : roleData ? (
        <>
          {/* Role Info Section */}
          <ModalHeader>
            <div className="flex items-start gap-4">
              {/* Large Icon */}
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: COLORS.primary }}
              >
                <Shield className="w-10 h-10" />
              </div>
              
              {/* Name and Description */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-semibold text-gray-900">{roleData.name}</h3>
                  {roleData.is_system && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                      System Role
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mt-1">{roleData.description || 'No description provided'}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span>👥 {roleData.user_count || 0} users</span>
                  <span>🔐 {roleData.permissions?.length || 0} permissions</span>
                </div>
              </div>
            </div>
          </ModalHeader>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex px-6">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-[#4a154b] text-[#4a154b]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Users ({roleData.users?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'permissions'
                    ? 'border-[#4a154b] text-[#4a154b]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Permissions ({roleData.permissions?.length || 0})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <ModalBody className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 320px)' }}>
            {activeTab === 'users' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roleData.users?.length > 0 ? (
                  roleData.users.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    No users with this role
                  </div>
                )}
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="space-y-6">
                {Object.keys(getPermissionsByCategory()).length > 0 ? (
                  Object.entries(getPermissionsByCategory()).map(([category, perms]) => (
                    <div key={category}>
                      <h4 className="font-medium text-gray-900 text-sm uppercase tracking-wide mb-3">
                        {category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {perms.map((perm) => (
                          <div 
                            key={perm.key} 
                            className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200"
                          >
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-gray-700">{perm.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No permissions assigned to this role
                  </div>
                )}
              </div>
            )}
          </ModalBody>
        </>
      ) : null}
    </Modal>
  )
}

// User Card
function UserCard({ user }) {
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        {/* Avatar with status */}
        <div className="relative">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: '#5B5FC7' }}
          >
            {getInitials(user.full_name || user.username)}
          </div>
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColors[user.status || 'offline']}`} />
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{user.full_name || user.username}</div>
          <div className="text-sm text-gray-500 truncate">{user.email}</div>
        </div>

        {/* Agent Badge */}
        {user.is_agent && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Agent
            </span>
          </div>
        )}
      </div>

      {/* Additional Info */}
      {user.organization && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <span className="font-medium">Organization:</span> {user.organization}
        </div>
      )}
    </div>
  )
}

// Skeleton Loader
function RoleSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-200" />
          <div className="flex-1">
            <div className="h-7 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
            <div className="flex gap-4">
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
          </div>
        </div>
      </div>
      <div className="border-b border-gray-200">
        <div className="flex px-6 py-3 gap-4">
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
