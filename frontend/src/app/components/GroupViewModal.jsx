import React, { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import Modal, { ModalHeader, ModalBody } from './Modal'
import { COLORS } from '../constants/theme'

export default function GroupViewModal({ isOpen, onClose, groupId }) {
  const [activeTab, setActiveTab] = useState('users')
  const [loading, setLoading] = useState(true)
  const [groupData, setGroupData] = useState(null)

  useEffect(() => {
    if (isOpen && groupId) {
      setLoading(true)
      // Fetch group details
      fetch(`/settings/team/groups/${groupId}/view/`)
        .then(res => res.json())
        .then(data => {
          setGroupData(data)
          setTimeout(() => setLoading(false), 1000) // Simulate loading
        })
        .catch(() => {
          setLoading(false)
          onClose()
        })
    }
  }, [isOpen, groupId])

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Group Details"
      maxWidth="max-w-4xl"
    >
      {loading ? (
        <GroupSkeleton />
      ) : groupData ? (
        <>
          {/* Group Info Section */}
          <ModalHeader>
            <div className="flex items-start gap-4">
              {/* Large Avatar */}
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: COLORS.primary }}
              >
                {getInitials(groupData.name)}
              </div>
              
              {/* Name and Description */}
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-gray-900">{groupData.name}</h3>
                <p className="text-gray-600 mt-1">{groupData.description || 'No description provided'}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span>👥 {groupData.member_count || 0} members</span>
                  <span>🎫 {groupData.ticket_count || 0} tickets</span>
                  <span>📅 Created {new Date(groupData.created_at).toLocaleDateString()}</span>
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
                Users ({groupData.users?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('tickets')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'tickets'
                    ? 'border-[#4a154b] text-[#4a154b]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Tickets ({groupData.tickets?.length || 0})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <ModalBody className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 320px)' }}>
            {activeTab === 'users' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupData.users?.length > 0 ? (
                  groupData.users.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    No users in this group
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tickets' && (
              <div className="space-y-3">
                {groupData.tickets?.length > 0 ? (
                  groupData.tickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No tickets assigned to this group
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

// Microsoft Teams-style User Card
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
          {user.role && (
            <div className="text-xs text-gray-400 mt-1">{user.role}</div>
          )}
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

// Ticket Card
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
            <h4 className="font-medium text-gray-900 truncate">{ticket.subject}</h4>
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[ticket.status] || 'bg-gray-100 text-gray-700'}`}>
              {ticket.status}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityColors[ticket.priority] || 'bg-gray-100 text-gray-700'}`}>
              {ticket.priority}
            </span>
            {ticket.assignee && (
              <span className="text-xs text-gray-500">
                Assigned to: {ticket.assignee}
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

// Skeleton Loader
function GroupSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
            <div className="flex gap-4">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b border-gray-200 px-6 py-3">
        <div className="flex gap-4">
          <div className="h-5 bg-gray-200 rounded w-24"></div>
          <div className="h-5 bg-gray-200 rounded w-24"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
