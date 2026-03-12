import React, { useState, useEffect } from 'react'
import Modal, { ModalHeader, ModalBody } from './Modal'
import { COLORS } from '../constants/theme'
import { useTimezone } from '../context/TimezoneContext'

export default function UserViewModal({ isOpen, onClose, userId }) {
  const [activeTab, setActiveTab] = useState('info')
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const { formatDate } = useTimezone()

  useEffect(() => {
    if (isOpen && userId) {
      setLoading(true)
      fetch(`/settings/team/users/${userId}/view/`)
        .then(res => res.json())
        .then(data => {
          setUserData(data)
          setTimeout(() => setLoading(false), 1000) // Simulate loading
        })
        .catch(() => {
          setLoading(false)
          onClose()
        })
    }
  }, [isOpen, userId])

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Details"
      maxWidth="max-w-4xl"
    >
      {loading ? (
        <UserSkeleton />
      ) : userData ? (
        <>
          {/* User Info Section */}
          <ModalHeader>
            <div className="flex items-start gap-4">
              {/* Large Avatar with status */}
              <div className="relative">
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: '#5B5FC7' }}
                >
                  {getInitials(userData.full_name || userData.username)}
                </div>
                <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${statusColors[userData.status || 'offline']}`} />
              </div>
              
              {/* Name and Details */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {userData.full_name || userData.username}
                  </h3>
                  {userData.is_agent && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Agent
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mt-1">{userData.email}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  {userData.role && <span>👔 {userData.role}</span>}
                  {userData.organization && <span>🏢 {userData.organization}</span>}
                  <span>🎫 {userData.ticket_count || 0} tickets</span>
                  <span>📅 Joined {formatDate(userData.created_at)}</span>
                </div>
              </div>
            </div>
          </ModalHeader>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex px-6">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'info'
                    ? 'border-[#4a154b] text-[#4a154b]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Information
              </button>
              <button
                onClick={() => setActiveTab('tickets')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'tickets'
                    ? 'border-[#4a154b] text-[#4a154b]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Tickets ({userData.tickets?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'groups'
                    ? 'border-[#4a154b] text-[#4a154b]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Groups ({userData.groups?.length || 0})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <ModalBody className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 320px)' }}>
            {activeTab === 'info' && (
              <div className="space-y-6">
                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem label="Username" value={userData.username} />
                    <InfoItem label="Email" value={userData.email} />
                    <InfoItem label="Full Name" value={userData.full_name || '—'} />
                    <InfoItem label="Status" value={
                      <span className="capitalize flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusColors[userData.status || 'offline']}`} />
                        {userData.status || 'offline'}
                      </span>
                    } />
                  </div>
                </div>

                {/* Role & Organization */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Role & Organization</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem label="Role" value={userData.role || '—'} />
                    <InfoItem label="Organization" value={userData.organization || '—'} />
                    <InfoItem label="User Type" value={userData.is_agent ? 'Agent' : 'End User'} />
                  </div>
                </div>

                {/* Groups */}
                {userData.groups && userData.groups.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Member of Groups</h4>
                    <div className="flex flex-wrap gap-2">
                      {userData.groups.map((group) => (
                        <span
                          key={group.id}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                        >
                          👥 {group.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Permissions */}
                {userData.permissions && userData.permissions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Custom Permissions</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2">
                        {userData.permissions.map((permission, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {permission}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tickets' && (
              <div className="space-y-3">
                {userData.tickets?.length > 0 ? (
                  userData.tickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No tickets found
                  </div>
                )}
              </div>
            )}

            {activeTab === 'groups' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userData.groups?.length > 0 ? (
                  userData.groups.map((group) => (
                    <GroupCard key={group.id} group={group} />
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    Not a member of any groups
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

// Info Item Component
function InfoItem({ label, value }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  )
}

// Ticket Card Component
function TicketCard({ ticket }) {
  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700'
  }

  const statusColors = {
    open: 'bg-blue-100 text-blue-700',
    'in-progress': 'bg-purple-100 text-purple-700',
    pending: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">#{ticket.id}</span>
            <h4 className="font-medium text-gray-900 truncate">{ticket.title}</h4>
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[ticket.status] || 'bg-gray-100 text-gray-700'}`}>
              {ticket.status}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityColors[ticket.priority] || 'bg-gray-100 text-gray-700'}`}>
              {ticket.priority}
            </span>
            {ticket.created_at && (
              <span className="text-xs text-gray-500">
                {new Intl.DateTimeFormat('en-US', { timeZone: localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone }).format(new Date(ticket.created_at))}
              </span>
            )}
          </div>
        </div>

        <a
          href={`/tickets/${ticket.id}/`}
          className="ml-4 text-sm text-blue-600 hover:text-blue-700"
        >
          View
        </a>
      </div>
    </div>
  )
}

// Group Card Component
function GroupCard({ group }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
          style={{ backgroundColor: COLORS.primary }}
        >
          {group.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{group.name}</h4>
          <p className="text-sm text-gray-500 mt-1">{group.description || 'No description'}</p>
          {group.member_count !== undefined && (
            <div className="text-xs text-gray-400 mt-2">
              {group.member_count} members
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Skeleton Loader
function UserSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
            <div className="flex gap-4">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b border-gray-200 px-6 py-3">
        <div className="flex gap-4">
          <div className="h-5 bg-gray-200 rounded w-24"></div>
          <div className="h-5 bg-gray-200 rounded w-24"></div>
          <div className="h-5 bg-gray-200 rounded w-24"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-6 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
