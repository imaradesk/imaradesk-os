import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import { Eye, Pencil, Plus, Trash2, UserPlus, Search, Loader2, Users } from 'lucide-react'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import { SettingsHeading } from '../components/settings/SettingsPage'
import GroupViewModal from '../components/GroupViewModal'
import GroupFormModal from '../components/team/GroupFormModal'
import Alert from '../components/Alert'
import Drawer, { DrawerBody, DrawerFooter } from '../components/Drawer'

export default function TeamGroups({ groups = [] }) {
  const [viewModal, setViewModal] = useState({ isOpen: false, groupId: null })
  // Add and edit share one modal: group is null when adding
  const [formModal, setFormModal] = useState({ isOpen: false, group: null })
  const [groupQuery, setGroupQuery] = useState('')
  const [addMemberDrawer, setAddMemberDrawer] = useState({ isOpen: false, groupId: null, groupName: '' })
  const [availableAgents, setAvailableAgents] = useState([])
  const [selectedAgents, setSelectedAgents] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleDelete = (groupId, groupName) => {
    if (!confirm(`Are you sure you want to delete the group "${groupName}"?`)) return
    
    toast.promise(
      new Promise((resolve, reject) => {
        router.post(`/administration/team/groups/${groupId}/delete/`, {}, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          preserveScroll: true,
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

  const handleViewGroup = (groupId) => {
    setViewModal({ isOpen: true, groupId })
  }

  const handleOpenAddMemberDrawer = async (groupId, groupName) => {
    setAddMemberDrawer({ isOpen: true, groupId, groupName })
    setSelectedAgents([])
    setSearchQuery('')
    setIsLoading(true)
    
    try {
      const response = await api.get(`/administration/team/groups/${groupId}/available-agents/`)
      setAvailableAgents(response.data.agents || [])
    } catch (error) {
      console.error('Error fetching available agents:', error)
      toast.error('Failed to load available agents')
      setAvailableAgents([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseAddMemberDrawer = () => {
    setAddMemberDrawer({ isOpen: false, groupId: null, groupName: '' })
    setAvailableAgents([])
    setSelectedAgents([])
    setSearchQuery('')
  }

  const toggleAgentSelection = (profileId) => {
    setSelectedAgents(prev => 
      prev.includes(profileId) 
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    )
  }

  const handleAddMembers = async () => {
    if (selectedAgents.length === 0) {
      toast.error('Please select at least one agent')
      return
    }
    
    setIsSaving(true)
    try {
      const response = await api.post(`/administration/team/groups/${addMemberDrawer.groupId}/add-members/`, { profile_ids: selectedAgents })
      
      const data = response.data
      
      if (data.success) {
        toast.success(data.message)
        handleCloseAddMemberDrawer()
        router.reload({ preserveScroll: true })
      } else {
        toast.error(data.error || 'Failed to add members')
      }
    } catch (error) {
      console.error('Error adding members:', error)
      toast.error('Failed to add members')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredAgents = availableAgents.filter(agent => {
    const query = searchQuery.toLowerCase()
    return (
      agent.full_name?.toLowerCase().includes(query) ||
      agent.email?.toLowerCase().includes(query) ||
      agent.username?.toLowerCase().includes(query)
    )
  })

  const groupTerm = groupQuery.trim().toLowerCase()
  const visibleGroups = groupTerm
    ? groups.filter(g => g.name.toLowerCase().includes(groupTerm) || (g.description || '').toLowerCase().includes(groupTerm))
    : groups

  return (
    <>
      <Head title="Team - Groups" />
      <AppShell active="settings" fixedHeight>
        <div className="flex flex-1 min-h-0 overflow-hidden">

          <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex flex-wrap items-center gap-3">
              <SettingsHeading section="team-groups">Groups</SettingsHeading>
            </div>

            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full space-y-6">
              <Alert
                type="info"
                title="What are groups?"
                message="Groups are teams of agents, such as Billing or Technical support. Tickets can be assigned to a group instead of a single person. An agent can belong to more than one group."
              />

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[12rem] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="search"
                    value={groupQuery}
                    onChange={(e) => setGroupQuery(e.target.value)}
                    placeholder="Search groups"
                    aria-label="Search groups"
                    className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFormModal({ isOpen: true, group: null })}
                  className="group ml-auto inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-medium shadow-sm transition-all active:scale-[0.97]"
                >
                  <Plus className="w-4 h-4 transition-transform group-hover:scale-110" /> Add group
                </button>
              </div>

              {groups.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Groups Found</h3>
                    <p className="mt-1 text-sm text-gray-500">Use <span className="font-medium">Add group</span> to create your first one.</p>
                  </div>
                </div>
              ) : visibleGroups.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg py-10 text-center">
                  <p className="text-sm font-medium text-gray-900">No groups match "{groupQuery.trim()}"</p>
                  <button type="button" onClick={() => setGroupQuery('')} className="mt-2 text-sm text-[#0B3D26] hover:underline">
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleGroups.map((group) => (
                    <div 
                      key={group.id} 
                      className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-[#0B3D26]/30 transition-all duration-200"
                    >
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2.5 rounded-lg bg-blue-50">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{group.name}</h3>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{group.description || 'No description'}</p>
                          </div>
                        </div>
                        
                        {/* Member Count Badge */}
                        <div className="flex items-center gap-2 py-3 border-t border-gray-100">
                          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">{group.member_count || 0}</span>
                            <span className="text-xs text-gray-500">members</span>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <button
                            onClick={() => handleOpenAddMemberDrawer(group.id, group.name)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Add Members
                          </button>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => handleViewGroup(group.id)}
                              className="p-1.5 text-gray-400 hover:text-[#0B3D26] hover:bg-[#0B3D26]/5 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setFormModal({ isOpen: true, group })}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(group.id, group.name)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Group View Modal */}
        <GroupViewModal
          isOpen={viewModal.isOpen}
          onClose={() => setViewModal({ isOpen: false, groupId: null })}
          groupId={viewModal.groupId}
        />

        {/* Add Members Drawer */}
        <Drawer
          isOpen={addMemberDrawer.isOpen}
          onClose={handleCloseAddMemberDrawer}
          title={`Add Members to ${addMemberDrawer.groupName}`}
          size="sm"
          floating
        >
          <DrawerBody>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0B3D26] focus:border-[#0B3D26]"
              />
            </div>

            {/* Agents List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {availableAgents.length === 0 
                  ? 'All agents are already members of this group'
                  : 'No agents match your search'
                }
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAgents.map((agent) => (
                  <label
                    key={agent.profile_id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAgents.includes(agent.profile_id)
                        ? 'border-[#0B3D26] bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgents.includes(agent.profile_id)}
                      onChange={() => toggleAgentSelection(agent.profile_id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#0B3D26] focus:ring-[#0B3D26]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{agent.full_name}</p>
                      <p className="text-sm text-gray-500 truncate">{agent.email}</p>
                    </div>
                    {agent.role && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {agent.role}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </DrawerBody>

          <DrawerFooter>
            <button
              onClick={handleCloseAddMemberDrawer}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMembers}
              disabled={selectedAgents.length === 0 || isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0B3D26] rounded-lg hover:bg-[#082C1B] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add {selectedAgents.length > 0 ? `(${selectedAgents.length})` : ''}
            </button>
          </DrawerFooter>
        </Drawer>

        <GroupFormModal
          isOpen={formModal.isOpen}
          group={formModal.group}
          onClose={() => setFormModal({ isOpen: false, group: null })}
          onSaved={() => router.reload({ only: ['groups'], preserveScroll: true })}
        />
      </AppShell>
    </>
  )
}
