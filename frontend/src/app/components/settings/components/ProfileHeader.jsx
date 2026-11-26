import React from 'react'
import toast from 'react-hot-toast'
import StatusCard, { StatusCardSkeleton } from './StatusCard'
import { COLORS } from '../../../constants/theme'

// Get initials from company name
const getInitials = (name) => {
  if (!name) return 'CO'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  return (words[0][0] + words[1][0]).toUpperCase()
}

// Copy Icon
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
  </svg>
)

// External Link Icon
const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
)

// Lock Icon
const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
)

// Edit Icon
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
)

export default function ProfileHeader({
  companyName,
  avatarUrl,
  businessTypeLabel,
  orgSizeLabel,
  createdOn,
  description,
  supportEmail,
  portalUrl,
  statusCards = [],
  statusCardsLoading = false,
  onAvatarClick,
  onPasswordClick,
  onEditClick,
}) {
  const handleCopy = (text, message) => {
    navigator.clipboard.writeText(text)
    toast.success(message)
  }

  return (
    <div className="rounded-xl p-6">
      <div className="flex items-start gap-6">
        {/* Avatar Section with Change Password */}
        <div className="flex flex-col items-center gap-3">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center cursor-pointer group overflow-hidden"
            style={{ backgroundColor: COLORS.primary }}
            onClick={onAvatarClick}
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={companyName || 'Company'} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-white tracking-wide">
                {getInitials(companyName)}
              </span>
            )}
          </div>
          <button
            onClick={onPasswordClick}
            className="px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <LockIcon />
            Change Password
          </button>
        </div>

        {/* Workspace Details Grid */}
        <div className="flex-1 grid grid-cols-3 gap-x-8 gap-y-4">
          {/* Row 1 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Workspace Name</p>
            <p className="text-sm font-semibold text-gray-800">{companyName || 'Not set'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Business Type</p>
            <p className="text-sm text-gray-700">{businessTypeLabel}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Organization Size</p>
            <p className="text-sm text-gray-700">{orgSizeLabel}</p>
          </div>

          {/* Row 2 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Created On</p>
            <p className="text-sm text-gray-700">{createdOn || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">About</p>
            <p className="text-sm text-gray-700">{description || 'No description'}</p>
          </div>
          <div></div>

          {/* Row 3 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Support Email</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-700">{supportEmail || 'Not configured'}</p>
              {supportEmail && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(supportEmail, 'Email copied')
                  }}
                  className="p-1 text-gray-400 hover:text-[#0B3D26] hover:bg-purple-50 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  <CopyIcon />
                </button>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Customer Portal</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-700 truncate">{portalUrl}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopy(portalUrl, 'Portal link copied')
                }}
                className="p-1 text-gray-400 hover:text-[#0B3D26] hover:bg-purple-50 rounded transition-colors"
                title="Copy to clipboard"
              >
                <CopyIcon />
              </button>
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-gray-400 hover:text-[#0B3D26] hover:bg-purple-50 rounded transition-colors"
                title="Open portal"
              >
                <ExternalLinkIcon />
              </a>
            </div>
          </div>
          <div></div>
        </div>

        {/* Edit Button */}
        <button
          onClick={onEditClick}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 hover:shadow-md"
          style={{ backgroundColor: COLORS.primary, color: 'white' }}
        >
          <EditIcon />
          Edit
        </button>
      </div>

      {/* Status Cards */}
      {(statusCards.length > 0 || statusCardsLoading) && (
        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-200">
          {statusCardsLoading ? (
            <>
              <StatusCardSkeleton />
              <StatusCardSkeleton />
              <StatusCardSkeleton />
              <StatusCardSkeleton />
            </>
          ) : (
            statusCards.map((card) => (
              <StatusCard key={card.label} {...card} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
