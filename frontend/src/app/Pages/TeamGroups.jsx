import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import { Eye, Pencil, Trash2, UserPlus, Search, Loader2 } from 'lucide-react'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import GroupViewModal from '../components/GroupViewModal'
import Drawer, { DrawerBody, DrawerFooter } from '../components/Drawer'
import { THEME } from '../constants/theme'

export default function TeamGroups({ groups = [] }) {
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const [viewModal, setViewModal] = useState({ isOpen: false, groupId: null })
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
        router.post(`/settings/team/groups/${groupId}/delete/`, {}, {
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
      const response = await fetch(`/settings/team/groups/${groupId}/available-agents/`, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      })
      const data = await response.json()
      setAvailableAgents(data.agents || [])
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
      const response = await fetch(`/settings/team/groups/${addMemberDrawer.groupId}/add-members/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': window.csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ profile_ids: selectedAgents }),
      })
      
      const data = await response.json()
      
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

  return (
    <>
      <Head title="Team - Groups" />
      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="team-groups" />}

          <main className="flex-1 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
              {!sidenavOpen && (
                <button
                  className="p-2 rounded-md hover:bg-gray-100"
                  title="Show Settings Menu"
                  onClick={() => setSidenavOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-500">
                    <path d="M13.5 6 21 12l-7.5 6v-4.5H3v-3h10.5V6z"/>
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-semibold text-gray-800">Groups</h1>
            </div>

            <div className="p-6">
              {groups.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Groups Found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new group.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups.map((group) => (
                    <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{group.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{group.description || 'No description'}</p>
                          <div className="mt-3">
                            <span className="text-xs text-gray-500">{group.member_count || 0} members</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => handleOpenAddMemberDrawer(group.id, group.name)}
                            className="p-1.5 rounded-md text-gray-500 hover:text-green-600 hover:bg-gray-100 transition-colors"
                            title="Add Members"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleViewGroup(group.id)}
                            className="p-1.5 rounded-md text-gray-500 hover:text-[#4a154b] hover:bg-gray-100 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link 
                            href={`/settings/team/groups/${group.id}/edit/`}
                            className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleDelete(group.id, group.name)}
                            className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-gray-100 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
          width="max-w-md"
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4a154b] focus:border-[#4a154b]"
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
                        ? 'border-[#4a154b] bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgents.includes(agent.profile_id)}
                      onChange={() => toggleAgentSelection(agent.profile_id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
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
              className="px-4 py-2 text-sm font-medium text-white bg-[#4a154b] rounded-lg hover:bg-[#3d1140] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add {selectedAgents.length > 0 ? `(${selectedAgents.length})` : ''}
            </button>
          </DrawerFooter>
        </Drawer>

        {/* Floating Action Button */}
        <Link href="/settings/team/groups/add/" className={THEME.fab} title="Add Group">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </Link>
      </AppShell>
    </>
  )
}
