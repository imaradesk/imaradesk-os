import React, { useState, useRef, useEffect } from 'react'
import { router } from '@inertiajs/react'
import Button from '../../../components/Button'
import Avatar from '../../../components/Avatar'
import Select from '../SearchableSelect'

const statusColors = {
  new: 'bg-blue-100 text-blue-700',
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-purple-100 text-purple-700',
  pending: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
  merged: 'bg-slate-200 text-slate-700',
}

const priorityColors = {
  low: 'text-gray-600',
  normal: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
}

export default function TicketHeader({ 
  ticket, 
  currentUser, 
  onAssignToMe, 
  onStatusChange, 
  onResumeTicket,
  onMergeTicket 
}) {
  const isMerged = ticket?.is_merged
  const isOnHold = ticket?.status === 'pending' || ticket?.status === 'hold'
  const canAssign = !isMerged && (!ticket?.assignee || ticket?.assignee?.id !== currentUser?.id)
  const canMerge = !isMerged && ticket?.status !== 'closed'
  const canChangeStatus = !isMerged
  
  // More actions dropdown state
  const [showMoreActions, setShowMoreActions] = useState(false)
  const dropdownRef = useRef(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMoreActions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      {/* Merged Banner */}
      {isMerged && ticket?.merged_into && (
        <div className="mb-4 p-3 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-slate-700">
              This ticket has been merged into{' '}
              <button
                onClick={() => router.visit(`/tickets/${ticket.merged_into.id}`)}
                className="font-semibold text-[#4a154b] hover:underline"
              >
                {ticket.merged_into.ticket_number}
              </button>
              {' '}- {ticket.merged_into.title}
            </p>
            {ticket.merged_at && (
              <p className="text-xs text-slate-500 mt-0.5">Merged on {ticket.merged_at}</p>
            )}
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.visit('/tickets')}
          className="inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Tickets
        </Button>
      </div>
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-gray-500 font-medium text-lg">{ticket?.ticket_number}</span>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${isMerged ? statusColors.merged : (statusColors[ticket?.status] || 'bg-gray-100 text-gray-700')}`}>
              {isMerged ? 'Merged' : (ticket?.status_display || 'Open')}
            </span>
            {!isMerged && (
              <span className={`text-sm font-semibold ${priorityColors[ticket?.priority] || ''}`}>
                {ticket?.priority_display} Priority
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{ticket?.title}</h1>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Avatar 
                name={ticket?.is_guest_ticket ? ticket?.guest_name : ticket?.requester?.name} 
                size="sm" 
              />
              <div>
                <p className="text-xs text-gray-500">Requester</p>
                <p className="font-medium text-gray-900">
                  {ticket?.is_guest_ticket 
                    ? ticket?.guest_name || 'Guest' 
                    : ticket?.requester?.name || 'Unknown'}
                </p>
                {ticket?.is_guest_ticket && ticket?.guest_email && (
                  <p className="text-xs text-gray-500">{ticket.guest_email}</p>
                )}
              </div>
            </div>
            {ticket?.assignee && (
              <div className="flex items-center gap-2">
                <Avatar name={ticket.assignee.name} size="sm" />
                <div>
                  <p className="text-xs text-gray-500">Assignee</p>
                  <p className="font-medium text-gray-900">{ticket.assignee.name}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Type</p>
              <p className="font-medium text-gray-900">{ticket?.type_display}</p>
            </div>
            {ticket?.department && (
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="font-medium text-gray-900">{ticket.department}</p>
              </div>
            )}
          </div>
        </div>
        {!isMerged && (
          <div className="flex items-center gap-2">
            {canAssign && (
              <Button
                variant="primary"
                size="sm"
                onClick={onAssignToMe}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Assign to me
              </Button>
            )}
            {canChangeStatus && (
              <div className="w-48">
                <Select
                  value={ticket?.status || 'open'}
                  onChange={(value) => {
                    if (value === 'resume') {
                      onResumeTicket()
                    } else {
                      onStatusChange(value)
                    }
                  }}
                  options={
                    isOnHold
                      ? [{ id: 'resume', name: 'Resume' }]
                      : [
                          { id: 'new', name: 'New' },
                          { id: 'open', name: 'Open' },
                          { id: 'in_progress', name: 'In Progress' },
                          { id: 'pending', name: 'On Hold' },
                          { id: 'resolved', name: 'Resolved' },
                          { id: 'closed', name: 'Closed' },
                        ]
                  }
                  placeholder="Select status"
                  displayKey="name"
                  valueKey="id"
                  className="text-sm"
                />
              </div>
            )}
            
            {/* More Actions Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="px-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </Button>
              
              {showMoreActions && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    {canMerge && (
                      <button
                        onClick={() => {
                          setShowMoreActions(false)
                          onMergeTicket()
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Merge Ticket
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
