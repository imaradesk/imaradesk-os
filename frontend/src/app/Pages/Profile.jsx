import React, { useState, useCallback, useEffect } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import { THEME } from '../constants/theme'
import toast from 'react-hot-toast'
import ProfileAvatarDrawer from '../components/ProfileAvatarDrawer'
import AuditLogsTab from '../components/settings/components/AuditLogsTab'
import SecurityTab from '../components/settings/components/SecurityTab'
import StatusCard, { StatusCardSkeleton } from '../components/settings/components/StatusCard'

export default function Profile({ profile = {} }) {
  const { props } = usePage()
  const user = props.auth?.user || profile
  
  const [activeTab, setActiveTab] = useState('info') // 'info', 'password'
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || null)
  const [showAvatarDrawer, setShowAvatarDrawer] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    job_title: profile.job_title || '',
  })
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [passwordError, setPasswordError] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLogsLoading, setAuditLogsLoading] = useState(false)
  const [auditLogsPagination, setAuditLogsPagination] = useState(null)
  const [auditLogsPage, setAuditLogsPage] = useState(1)

  // Devices state
  const [devices, setDevices] = useState([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [devicesPagination, setDevicesPagination] = useState(null)
  const [devicesPage, setDevicesPage] = useState(1)

  // Stats state
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState({ open: 0, closed: 0, hold: 0, breached: 0 })
  
  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Fetch user stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const response = await api.get('/api/administration/user/stats/')
      if (response.data.success) {
        setStats(response.data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async (page = 1) => {
    setAuditLogsLoading(true)
    try {
      const response = await api.get(`/api/administration/user/audit-logs/?page=${page}&per_page=10`)
      if (response.data.success) {
        setAuditLogs(response.data.logs)
        setAuditLogsPagination(response.data.pagination)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setAuditLogsLoading(false)
    }
  }, [])

  // Fetch devices
  const fetchDevices = useCallback(async (page = 1) => {
    setDevicesLoading(true)
    try {
      const response = await api.get(`/api/administration/user/devices/?page=${page}&per_page=10`)
      if (response.data.success) {
        setDevices(response.data.devices)
        setDevicesPagination(response.data.pagination)
      }
    } catch (error) {
      console.error('Error fetching devices:', error)
    } finally {
      setDevicesLoading(false)
    }
  }, [])

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Fetch tab data when tab changes
  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs(auditLogsPage)
    } else if (activeTab === 'security') {
      fetchDevices(devicesPage)
    }
  }, [activeTab, auditLogsPage, devicesPage, fetchAuditLogs, fetchDevices])

  const handleAuditLogsPageChange = (page) => {
    setAuditLogsPage(page)
  }

  const handleDevicesPageChange = (page) => {
    setDevicesPage(page)
  }

  const handleRevokeDevice = async (deviceId) => {
    try {
      const response = await api.post(`/api/administration/user/devices/${deviceId}/revoke/`)
      if (response.data.success) {
        toast.success('Device revoked successfully')
        fetchDevices(devicesPage)
      } else {
        toast.error(response.data.error || 'Failed to revoke device')
      }
    } catch (error) {
      console.error('Error revoking device:', error)
      toast.error('Failed to revoke device')
    }
  }

  const handleSignOutAll = () => {
    toast.success('All devices signed out')
  }

  const handleAvatarUpload = async (base64Data) => {
    setIsUploadingAvatar(true)
    setUploadProgress(0)
    try {
      const response = await api.post('/profile/update-avatar/', { avatar: base64Data }, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || progressEvent.loaded))
          setUploadProgress(percent)
        }
      })
      
      const data = response.data
      
      if (data.success) {
        setAvatarUrl(data.avatar_url)
        setShowAvatarDrawer(false)
        toast.success('Profile picture updated')
      } else {
        toast.error(data.error || 'Failed to upload avatar')
      }
    } catch (error) {
      toast.error('Failed to upload avatar')
    } finally {
      setIsUploadingAvatar(false)
      setUploadProgress(0)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      const response = await api.post('/profile/remove-avatar/')
      
      const data = response.data
      
      if (data.success) {
        setAvatarUrl(null)
        setShowAvatarDrawer(false)
        toast.success('Profile picture removed')
      } else {
        toast.error(data.error || 'Failed to remove avatar')
      }
    } catch (error) {
      toast.error('Failed to remove avatar')
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const response = await api.post('/profile/update/', profileForm)
      
      const data = response.data
      
      if (data.success !== false) {
        toast.success('Profile updated successfully')
        setIsEditing(false)
        router.reload()
      } else {
        toast.error(data.error || 'Failed to update profile')
      }
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('Passwords do not match')
      return
    }
    
    if (passwordForm.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    
    setIsChangingPassword(true)
    
    try {
      const response = await api.post('/profile/change-password/', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      
      const data = response.data
      
      if (data.success !== false) {
        toast.success('Password changed successfully')
        setPasswordForm({
          current_password: '',
          new_password: '',
          confirm_password: '',
        })
      } else {
        setPasswordError(data.error || 'Failed to change password')
      }
    } catch (error) {
      setPasswordError('Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const fullName = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User'

  return (
    <AppShell active="settings">
      <Head title="Profile" />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div 
                onClick={() => setShowAvatarDrawer(true)}
                className="relative w-24 h-24 rounded-full bg-[#0B3D26] flex items-center justify-center text-3xl font-bold text-white shadow-lg cursor-pointer group overflow-hidden"
              >
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={fullName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(fullName)
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
              </div>
              
              {/* User Info */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                <p className="text-gray-500">{profile.email}</p>
                <div className="flex items-center gap-4 mt-2">
                  {profile.job_title && (
                    <span className="text-sm text-gray-600">{profile.job_title}</span>
                  )}
                  {profile.role && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-[#0B3D26]/10 text-[#0B3D26] rounded-full">
                      {profile.role}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Status Cards */}
          <div className="flex items-center gap-4 mb-6">
            {statsLoading ? (
              <>
                <StatusCardSkeleton />
                <StatusCardSkeleton />
                <StatusCardSkeleton />
                <StatusCardSkeleton />
              </>
            ) : (
              <>
                <StatusCard label="OPEN" count={stats.open} />
                <StatusCard label="CLOSED" count={stats.closed} />
                <StatusCard label="HOLD" count={stats.hold} />
                <StatusCard label="BREACHED" count={stats.breached} />
              </>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'info'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Personal Info
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'password'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Change Password
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'audit'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Audit Logs
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'security'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Security & Devices
            </button>
          </div>
          
          {/* Personal Info Tab */}
          {activeTab === 'info' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                  <p className="text-sm text-gray-500">Update your personal details</p>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg ${THEME.button.secondary}`}
                  >
                    Edit
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSaveProfile}>
                <div className="p-6 space-y-6">
                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileForm.first_name}
                          onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                        />
                      ) : (
                        <p className="text-gray-900">{profile.first_name || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileForm.last_name}
                          onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                        />
                      ) : (
                        <p className="text-gray-900">{profile.last_name || '-'}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.email || '-'}</p>
                    )}
                  </div>
                  
                  {/* Phone & Job Title */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                          placeholder="+1 (555) 000-0000"
                        />
                      ) : (
                        <p className="text-gray-900">{profile.phone || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Title
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileForm.job_title}
                          onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                          placeholder="e.g. Support Agent"
                        />
                      ) : (
                        <p className="text-gray-900">{profile.job_title || '-'}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Account Info (Read only) */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-4">Account Information</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <p className="text-gray-900">{profile.username || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <p className="text-gray-900">{profile.role || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                        <p className="text-gray-900">{profile.organization || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                        <p className="text-gray-900">{profile.date_joined || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                {isEditing && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false)
                        setProfileForm({
                          first_name: profile.first_name || '',
                          last_name: profile.last_name || '',
                          email: profile.email || '',
                          phone: profile.phone || '',
                          job_title: profile.job_title || '',
                        })
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${THEME.button.primary} disabled:opacity-50`}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}
          
          {/* Change Password Tab */}
          {activeTab === 'password' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                <p className="text-sm text-gray-500">Update your password to keep your account secure</p>
              </div>
              
              <form onSubmit={handleChangePassword}>
                <div className="p-6 space-y-6">
                  {passwordError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{passwordError}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                      required
                      minLength={8}
                    />
                    <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                      required
                    />
                  </div>
                </div>
                
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end rounded-b-xl">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className={`px-4 py-2 text-sm font-medium rounded-lg ${THEME.button.primary} disabled:opacity-50`}
                  >
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Audit Logs Tab */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <AuditLogsTab 
                logs={auditLogs} 
                loading={auditLogsLoading}
                pagination={auditLogsPagination}
                onPageChange={handleAuditLogsPageChange}
              />
            </div>
          )}

          {/* Security & Devices Tab */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <SecurityTab 
                devices={devices} 
                loading={devicesLoading}
                pagination={devicesPagination}
                onPageChange={handleDevicesPageChange}
                onRevokeDevice={handleRevokeDevice}
                onSignOutAll={handleSignOutAll} 
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Avatar Upload Drawer */}
      <ProfileAvatarDrawer
        isOpen={showAvatarDrawer}
        onClose={() => setShowAvatarDrawer(false)}
        avatarUrl={avatarUrl}
        onUpload={handleAvatarUpload}
        onRemove={handleRemoveAvatar}
        isUploading={isUploadingAvatar}
        uploadProgress={uploadProgress}
      />
    </AppShell>
  )
}
