import React, { useState, useEffect } from 'react'
import { Sparkles, FolderOpen, Loader, PauseCircle, CheckCircle, ArrowDown, Minus, ArrowUp, AlertTriangle, HelpCircle, AlertOctagon, Wrench, ClipboardList } from 'lucide-react'
import Drawer, { DrawerBody, DrawerFooter } from '../Drawer'
import { THEME } from '../../constants/theme'
import api from '../../../utils/axios'

// Assign Agent Drawer
export function AssignAgentDrawer({ isOpen, onClose, selectedTickets, onSuccess }) {
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchAgents()
    }
  }, [isOpen])

  const fetchAgents = async () => {
    setLoading(true)
    try {
      const response = await api.get('/tickets/agents/')
      setAgents(response.data.agents || [])
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedAgent) return
    
    setSubmitting(true)
    try {
      const response = await api.post('/tickets/bulk/assign-agent/', {
        ticket_ids: selectedTickets,
        agent_id: selectedAgent.id,
      })
      
      onSuccess?.(response.data.message)
      onClose()
    } catch (error) {
      console.error('Failed to assign agent:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Assign to Agent" width="max-w-md">
      <DrawerBody>
        <p className="text-sm text-gray-600 mb-4">
          Assign {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''} to an agent
        </p>
        
        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a154b]/20 focus:border-[#4a154b]"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Agent List */}
        <div className="space-y-2">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading agents...</div>
          ) : filteredAgents.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No agents found</div>
          ) : (
            filteredAgents.map(agent => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  selectedAgent?.id === agent.id
                    ? 'border-[#4a154b] bg-[#4a154b]/5'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#4a154b]/10 flex items-center justify-center text-[#4a154b] font-medium">
                  {agent.avatar_url ? (
                    <img src={agent.avatar_url} alt={agent.name} className="w-10 h-10 rounded-full" />
                  ) : (
                    agent.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">{agent.name}</div>
                  <div className="text-sm text-gray-500">{agent.email}</div>
                </div>
                {selectedAgent?.id === agent.id && (
                  <svg className="w-5 h-5 text-[#4a154b]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      </DrawerBody>
      
      <DrawerFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedAgent || submitting}
          className={`${THEME.button.primary} px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50`}
        >
          {submitting ? 'Assigning...' : 'Assign Agent'}
        </button>
      </DrawerFooter>
    </Drawer>
  )
}

// Assign Team Drawer
export function AssignTeamDrawer({ isOpen, onClose, selectedTickets, onSuccess }) {
  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchTeams()
    }
  }, [isOpen])

  const fetchTeams = async () => {
    setLoading(true)
    try {
      const response = await api.get('/tickets/teams/')
      setTeams(response.data.teams || [])
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedTeam) return
    
    setSubmitting(true)
    try {
      const response = await api.post('/tickets/bulk/assign-team/', {
        ticket_ids: selectedTickets,
        team_id: selectedTeam.id,
      })
      
      onSuccess?.(response.data.message)
      onClose()
    } catch (error) {
      console.error('Failed to assign team:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Assign to Team" width="max-w-md">
      <DrawerBody>
        <p className="text-sm text-gray-600 mb-4">
          Assign {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''} to a team
        </p>
        
        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a154b]/20 focus:border-[#4a154b]"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Team List */}
        <div className="space-y-2">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading teams...</div>
          ) : filteredTeams.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No teams found</div>
          ) : (
            filteredTeams.map(team => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  selectedTeam?.id === team.id
                    ? 'border-[#4a154b] bg-[#4a154b]/5'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">{team.name}</div>
                  {team.description && (
                    <div className="text-sm text-gray-500 truncate">{team.description}</div>
                  )}
                </div>
                {selectedTeam?.id === team.id && (
                  <svg className="w-5 h-5 text-[#4a154b]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      </DrawerBody>
      
      <DrawerFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedTeam || submitting}
          className={`${THEME.button.primary} px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50`}
        >
          {submitting ? 'Assigning...' : 'Assign Team'}
        </button>
      </DrawerFooter>
    </Drawer>
  )
}

// Change Status Drawer
export function ChangeStatusDrawer({ isOpen, onClose, selectedTickets, onSuccess }) {
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const statuses = [
    { id: 'new', label: 'New', icon: Sparkles },
    { id: 'open', label: 'Open', icon: FolderOpen },
    { id: 'in_progress', label: 'In Progress', icon: Loader },
    { id: 'pending', label: 'Pending', icon: PauseCircle },
    { id: 'resolved', label: 'Resolved', icon: CheckCircle },
  ]

  const handleSubmit = async () => {
    if (!selectedStatus) return
    
    setSubmitting(true)
    try {
      const response = await api.post('/tickets/bulk/change-status/', {
        ticket_ids: selectedTickets,
        status: selectedStatus.id,
      })
      
      onSuccess?.(response.data.message)
      onClose()
    } catch (error) {
      console.error('Failed to change status:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Change Status" width="max-w-md">
      <DrawerBody>
        <p className="text-sm text-gray-600 mb-4">
          Change status for {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''}
        </p>
        
        <div className="space-y-2">
          {statuses.map(status => (
            <button
              key={status.id}
              onClick={() => setSelectedStatus(status)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                selectedStatus?.id === status.id
                  ? 'border-[#4a154b] bg-[#4a154b]/5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <status.icon className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">
                {status.label}
              </span>
              <div className="flex-1" />
              {selectedStatus?.id === status.id && (
                <svg className="w-5 h-5 text-[#4a154b]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </DrawerBody>
      
      <DrawerFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedStatus || submitting}
          className={`${THEME.button.primary} px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50`}
        >
          {submitting ? 'Updating...' : 'Update Status'}
        </button>
      </DrawerFooter>
    </Drawer>
  )
}

// Change Priority Drawer
export function ChangePriorityDrawer({ isOpen, onClose, selectedTickets, onSuccess }) {
  const [selectedPriority, setSelectedPriority] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const priorities = [
    { id: 'low', label: 'Low', icon: ArrowDown, description: 'Non-urgent issues' },
    { id: 'normal', label: 'Normal', icon: Minus, description: 'Standard priority' },
    { id: 'high', label: 'High', icon: ArrowUp, description: 'Important issues' },
    { id: 'urgent', label: 'Urgent', icon: AlertTriangle, description: 'Critical - needs immediate attention' },
  ]

  const handleSubmit = async () => {
    if (!selectedPriority) return
    
    setSubmitting(true)
    try {
      const response = await api.post('/tickets/bulk/change-priority/', {
        ticket_ids: selectedTickets,
        priority: selectedPriority.id,
      })
      
      onSuccess?.(response.data.message)
      onClose()
    } catch (error) {
      console.error('Failed to change priority:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Change Priority" width="max-w-md">
      <DrawerBody>
        <p className="text-sm text-gray-600 mb-4">
          Change priority for {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''}
        </p>
        
        <div className="space-y-2">
          {priorities.map(priority => (
            <button
              key={priority.id}
              onClick={() => setSelectedPriority(priority)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                selectedPriority?.id === priority.id
                  ? 'border-[#4a154b] bg-[#4a154b]/5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <priority.icon className="w-5 h-5 text-gray-500" />
              <div className="flex-1 text-left">
                <div className="font-medium text-gray-900">{priority.label}</div>
                <div className="text-sm text-gray-500">{priority.description}</div>
              </div>
              <div className="flex-1" />
              {selectedPriority?.id === priority.id && (
                <svg className="w-5 h-5 text-[#4a154b]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </DrawerBody>
      
      <DrawerFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedPriority || submitting}
          className={`${THEME.button.primary} px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50`}
        >
          {submitting ? 'Updating...' : 'Update Priority'}
        </button>
      </DrawerFooter>
    </Drawer>
  )
}

// Change Type Drawer
export function ChangeTypeDrawer({ isOpen, onClose, selectedTickets, onSuccess }) {
  const [selectedType, setSelectedType] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const types = [
    { id: 'question', label: 'Question', icon: HelpCircle, description: 'General inquiry or question' },
    { id: 'incident', label: 'Incident', icon: AlertOctagon, description: 'Something is broken or not working' },
    { id: 'problem', label: 'Problem', icon: Wrench, description: 'Root cause of incidents' },
    { id: 'task', label: 'Task', icon: ClipboardList, description: 'Work to be done' },
  ]

  const handleSubmit = async () => {
    if (!selectedType) return
    
    setSubmitting(true)
    try {
      const response = await api.post('/tickets/bulk/change-type/', {
        ticket_ids: selectedTickets,
        type: selectedType.id,
      })
      
      onSuccess?.(response.data.message)
      onClose()
    } catch (error) {
      console.error('Failed to change type:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Change Type" width="max-w-md">
      <DrawerBody>
        <p className="text-sm text-gray-600 mb-4">
          Change type for {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''}
        </p>
        
        <div className="space-y-2">
          {types.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                selectedType?.id === type.id
                  ? 'border-[#4a154b] bg-[#4a154b]/5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <type.icon className="w-5 h-5 text-gray-500" />
              <div className="flex-1 text-left">
                <div className="font-medium text-gray-900">{type.label}</div>
                <div className="text-sm text-gray-500">{type.description}</div>
              </div>
              {selectedType?.id === type.id && (
                <svg className="w-5 h-5 text-[#4a154b]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </DrawerBody>
      
      <DrawerFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedType || submitting}
          className={`${THEME.button.primary} px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50`}
        >
          {submitting ? 'Updating...' : 'Update Type'}
        </button>
      </DrawerFooter>
    </Drawer>
  )
}

// Delete Confirmation Drawer
export function DeleteConfirmDrawer({ isOpen, onClose, selectedTickets, onSuccess }) {
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (confirmText !== 'DELETE') return
    
    setSubmitting(true)
    try {
      const response = await api.post('/tickets/bulk/delete/', {
        ticket_ids: selectedTickets,
      })
      
      onSuccess?.(response.data.message)
      onClose()
    } catch (error) {
      console.error('Failed to delete tickets:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Reset confirm text when drawer closes
  React.useEffect(() => {
    if (!isOpen) {
      setConfirmText('')
    }
  }, [isOpen])

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Delete Tickets" width="max-w-md" headerColor="bg-red-600">
      <DrawerBody>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-medium text-red-800">This action cannot be undone</h3>
              <p className="text-sm text-red-700 mt-1">
                You are about to permanently delete {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''}. 
                All associated comments, attachments, and activity history will be lost.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <span className="font-bold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>
      </DrawerBody>
      
      <DrawerFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={confirmText !== 'DELETE' || submitting}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {submitting ? 'Deleting...' : 'Delete Tickets'}
        </button>
      </DrawerFooter>
    </Drawer>
  )
}

// Merge Tickets Drawer
export function MergeTicketsDrawer({ isOpen, onClose, selectedTickets, onSuccess }) {
  const [primaryTicket, setPrimaryTicket] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [ticketDetails, setTicketDetails] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && selectedTickets.length >= 2) {
      // In a real implementation, you'd fetch ticket details here
      // For now, we'll use the IDs
      setTicketDetails(selectedTickets.map(id => ({ id, ticket_number: `Ticket #${id}` })))
      setPrimaryTicket(selectedTickets[0])
    }
  }, [isOpen, selectedTickets])

  const handleSubmit = async () => {
    if (!primaryTicket) return
    
    const secondaryTickets = selectedTickets.filter(id => id !== primaryTicket)
    
    setSubmitting(true)
    try {
      // Merge each secondary ticket into the primary
      for (const ticketUuid of secondaryTickets) {
        await api.post(`/tickets/${ticketUuid}/merge/`, {
          target_ticket_uuid: primaryTicket,
        })
      }
      
      onSuccess?.(`${secondaryTickets.length} ticket(s) merged`)
      onClose()
    } catch (error) {
      console.error('Failed to merge tickets:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Merge Tickets" width="max-w-md">
      <DrawerBody>
        <p className="text-sm text-gray-600 mb-4">
          Select the primary ticket to merge {selectedTickets.length} tickets into. 
          The other tickets will be closed and linked to the primary ticket.
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Ticket (Keep Open)</label>
          <div className="space-y-2">
            {selectedTickets.map(id => (
              <button
                key={id}
                onClick={() => setPrimaryTicket(id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  primaryTicket === id
                    ? 'border-[#4a154b] bg-[#4a154b]/5'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium text-gray-900">Ticket #{id}</span>
                <div className="flex-1" />
                {primaryTicket === id && (
                  <span className="text-xs bg-[#4a154b] text-white px-2 py-1 rounded">Primary</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Comments and attachments from merged tickets will be preserved in the activity log.
          </p>
        </div>
      </DrawerBody>
      
      <DrawerFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!primaryTicket || submitting}
          className={`${THEME.button.primary} px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50`}
        >
          {submitting ? 'Merging...' : 'Merge Tickets'}
        </button>
      </DrawerFooter>
    </Drawer>
  )
}
