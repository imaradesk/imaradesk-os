import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Link } from '@inertiajs/react'
import { Camera, Pencil, Copy, ExternalLink, KeyRound, ShieldCheck } from 'lucide-react'
import { useTimezone } from '../../context/TimezoneContext'
import api from '../../../utils/axios'
import {
  ProfileHeader,
  EditWorkspaceDrawer,
  ChangePasswordDrawer,
  AvatarUploadModal,
  businessTypeOptions,
  orgSizeOptions,
} from './components'
import { SettingsSection, SettingsRow, btn } from './SettingsPage'

const initials = (name) => {
  const words = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'WS'
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase()
}

function Field({ label, wide, children }) {
  return (
    <div className={`px-5 sm:px-6 py-3.5 border-b border-gray-100 sm:[&:nth-child(odd)]:border-r ${wide ? 'sm:col-span-2 sm:!border-r-0 border-b-0' : ''}`}>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 flex items-center gap-1 text-sm text-gray-900 min-w-0">{children}</dd>
    </div>
  )
}

function IconBtn({ label, onClick, children }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="p-1 rounded text-gray-400 hover:text-[#0B3D26] hover:bg-gray-100 transition-colors flex-shrink-0">
      {children}
    </button>
  )
}

export default function GeneralSettings({ business = {} }) {
  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [companyName, setCompanyName] = useState(business?.company_name || '')
  const [companyDescription, setCompanyDescription] = useState(business?.description || '')
  const [businessType, setBusinessType] = useState(business?.business_type || '')
  const [orgSize, setOrgSize] = useState(business?.org_size || '')
  const [isSaving, setIsSaving] = useState(false)
  
  // Password state
  const [showPasswordDrawer, setShowPasswordDrawer] = useState(false)
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  // Avatar state
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(business?.logo_url || '')
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false)

  // Timezone context
  const { formatDate } = useTimezone()

  // Sync with business prop
  useEffect(() => {
    setCompanyName(business?.company_name || '')
    setCompanyDescription(business?.description || '')
    setBusinessType(business?.business_type || '')
    setOrgSize(business?.org_size || '')
    setAvatarUrl(business?.logo_url || '')
  }, [business])

  // Label helpers
  const getBusinessTypeLabel = (value) => {
    const option = businessTypeOptions.find(opt => opt.id === value)
    return option?.name || value || 'Not set'
  }

  const getOrgSizeLabel = (value) => {
    const option = orgSizeOptions.find(opt => opt.id === value)
    return option?.name || value || 'Not set'
  }

  // Handlers
  const handleCancel = () => {
    setCompanyName(business?.company_name || '')
    setCompanyDescription(business?.description || '')
    setBusinessType(business?.business_type || '')
    setOrgSize(business?.org_size || '')
    setIsEditing(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await api.post('/administration/update-business/', {
        company_name: companyName,
        description: companyDescription,
        business_type: businessType,
        org_size: orgSize,
      })
      
      if (response.data.success) {
        toast.success('Company information saved successfully')
        setIsEditing(false)
      } else {
        toast.error(response.data.error || 'Failed to save company information')
      }
    } catch (error) {
      console.error('Error saving company info:', error)
      toast.error('Failed to save company information')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error('New passwords do not match')
      return
    }
    if (passwordData.new.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setIsChangingPassword(true)
    try {
      const response = await api.post('/profile/change-password/', {
        current_password: passwordData.current,
        new_password: passwordData.new,
      })
      if (response.data.success) {
        toast.success('Password changed successfully')
        setShowPasswordDrawer(false)
        setPasswordData({ current: '', new: '', confirm: '' })
      } else {
        toast.error(response.data.error || 'Failed to change password')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Called by the shared FileUpload: reports progress and throws on failure so it can show the error
  const handleAvatarUpload = async (file, { onProgress, signal }) => {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Could not read the selected file'))
      reader.readAsDataURL(file)
    })

    const response = await api.post('/administration/update-business-logo/', { logo: dataUrl }, {
      signal,
      onUploadProgress: (e) => onProgress(Math.round((e.loaded * 100) / (e.total || e.loaded || 1))),
    })

    if (!response.data.success) throw new Error(response.data.error || 'Failed to update logo')
    setAvatarUrl(response.data.logo_url || dataUrl)
    toast.success('Company logo updated successfully')
  }

  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true)
    try {
      const response = await api.post('/administration/remove-business-logo/')
      
      if (response.data.success) {
        setAvatarUrl('')
        setShowAvatarModal(false)
        toast.success('Company logo removed')
      } else {
        toast.error(response.data.error || 'Failed to remove logo')
      }
    } catch (error) {
      console.error('Error removing logo:', error)
      toast.error('Failed to remove logo')
    } finally {
      setIsRemovingAvatar(false)
    }
  }

  const copy = (text, message) => {
    navigator.clipboard.writeText(text)
    toast.success(message)
  }

  const portalUrl = `${window.location.origin}/portal`
  return (
    <>
      {/* Workspace profile */}
      <SettingsSection id="profile" flush>
        <div className="relative px-5 sm:px-6 pt-6 pb-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <button
            type="button"
            onClick={() => setShowAvatarModal(true)}
            className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#0B3D26] text-white flex items-center justify-center flex-shrink-0 ring-4 ring-white shadow-sm"
            aria-label="Change logo"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={companyName || 'Workspace logo'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl sm:text-2xl font-semibold tracking-wide">{initials(companyName)}</span>
            )}
            <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{companyName || 'Untitled workspace'}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {[getBusinessTypeLabel(businessType), getOrgSizeLabel(orgSize)].filter((v) => v && v !== 'Not set').join(' · ') || 'Add your business type and size'}
            </p>
          </div>
          <button onClick={() => setIsEditing(true)} className={`${btn.secondary} self-start sm:self-center`}>
            <Pencil className="w-4 h-4" /> Edit profile
          </button>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 border-t border-gray-100">
          <Field label="Created">{business?.created_on ? formatDate(business.created_on) : '—'}</Field>
          <Field label="Workspace URL">
            <span className="truncate">{business?.domain || window.location.host}</span>
          </Field>
          <Field label="Support email">
            <span className="truncate">{business?.help_email || 'Not configured'}</span>
            {business?.help_email && <IconBtn label="Copy email" onClick={() => copy(business.help_email, 'Email copied')}><Copy className="w-3.5 h-3.5" /></IconBtn>}
          </Field>
          <Field label="Customer portal">
            <span className="truncate">{portalUrl}</span>
            <IconBtn label="Copy portal link" onClick={() => copy(portalUrl, 'Portal link copied')}><Copy className="w-3.5 h-3.5" /></IconBtn>
            <a href={portalUrl} target="_blank" rel="noopener noreferrer" title="Open portal" className="p-1 rounded text-gray-400 hover:text-[#0B3D26] hover:bg-gray-100 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Field>
          <Field label="About" wide>
            <span className={companyDescription ? 'text-gray-700' : 'text-gray-400'}>{companyDescription || 'No description yet'}</span>
          </Field>
        </dl>
      </SettingsSection>

      {/* Sign-in & access */}
      <SettingsSection id="access" title="Sign-in & access" description="Keep the owner account secure." flush>
        <div className="divide-y divide-gray-100">
          <SettingsRow title="Password" description="Change the password you use to sign in.">
            <button onClick={() => setShowPasswordDrawer(true)} className={btn.secondary}>
              <KeyRound className="w-4 h-4" /> Change password
            </button>
          </SettingsRow>
          <SettingsRow title="Two-factor authentication" description="Require a code from email or an authenticator app when signing in.">
            <Link href="/administration/security/" className={btn.secondary}>
              <ShieldCheck className="w-4 h-4" /> Manage 2FA
            </Link>
          </SettingsRow>
        </div>
      </SettingsSection>

      {/* Drawers */}
      <EditWorkspaceDrawer
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        companyName={companyName}
        setCompanyName={setCompanyName}
        businessType={businessType}
        setBusinessType={setBusinessType}
        orgSize={orgSize}
        setOrgSize={setOrgSize}
        companyDescription={companyDescription}
        setCompanyDescription={setCompanyDescription}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
      />

      <ChangePasswordDrawer
        isOpen={showPasswordDrawer}
        onClose={() => setShowPasswordDrawer(false)}
        passwordData={passwordData}
        setPasswordData={setPasswordData}
        onSubmit={handleChangePassword}
        isChanging={isChangingPassword}
      />

      <AvatarUploadModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        avatarUrl={avatarUrl}
        onUpload={handleAvatarUpload}
        onRemove={handleRemoveAvatar}
        isRemoving={isRemovingAvatar}
      />

    </>
  )
}
