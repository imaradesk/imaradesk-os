import React, { useMemo, useState } from 'react'
import { Head, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import {
  Building2, ChevronLeft, ChevronRight, Eye, Pencil, Search, ShieldCheck, Trash2, UserPlus,
  Users, UsersRound, X,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { SettingsHeading } from '../components/settings/SettingsPage'
import UserViewModal from '../components/UserViewModal'
import InviteUserModal from '../components/team/InviteUserModal'
import PendingInvites from '../components/team/PendingInvites'
import UserEditModal from '../components/team/UserEditModal'

// Stable avatar tint per person
const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#10b981']
const avatarColor = (seed = '') => AVATAR_COLORS[[...seed].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_COLORS.length]

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || '?'

function Avatar({ user, size = 'md', className = '', style }) {
  const color = avatarColor(user.email || user.name)
  const box = size === 'lg' ? 'w-12 h-12 text-base' : size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
  return (
    <span
      className={`${box} flex-shrink-0 rounded-full inline-flex items-center justify-center font-semibold ${className}`}
      style={{ color, backgroundColor: `${color}1f`, ...style }}
    >
      {initials(user.name)}
    </span>
  )
}

function RolePill({ role }) {
  return (
    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-[#0B3D26]/10 text-[#0B3D26] text-[11px] font-medium whitespace-nowrap">
      <ShieldCheck className="w-3 h-3" /> {role}
    </span>
  )
}

function GroupChips({ groups = [], max = 2 }) {
  if (!groups.length) return <span className="text-xs text-gray-400">No groups</span>
  const rest = groups.length - max
  return (
    <div className="flex flex-wrap items-center gap-1">
      {groups.slice(0, max).map((group) => (
        <span key={group.id} className="inline-flex items-center h-6 px-2 rounded-md border border-gray-200 bg-gray-50 text-[11px] text-gray-600">
          {group.name}
        </span>
      ))}
      {rest > 0 && (
        <span title={groups.slice(max).map((g) => g.name).join(', ')} className="inline-flex items-center h-6 px-1.5 rounded-md bg-gray-100 text-[11px] text-gray-500">
          +{rest}
        </span>
      )}
    </div>
  )
}

function RowActions({ user, onView, onEdit, onDelete, className = '' }) {
  const base = 'w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 transition-colors'
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <button type="button" onClick={onView} className={`${base} hover:text-[#0B3D26] hover:bg-[#0B3D26]/5`} title="View" aria-label={`View ${user.name}`}>
        <Eye className="w-4 h-4" />
      </button>
      <button type="button" onClick={onEdit} className={`${base} hover:text-blue-600 hover:bg-blue-50`} title="Edit" aria-label={`Edit ${user.name}`}>
        <Pencil className="w-4 h-4" />
      </button>
      <button type="button" onClick={onDelete} className={`${base} hover:text-red-600 hover:bg-red-50`} title="Delete" aria-label={`Delete ${user.name}`}>
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function TeamUsers({ users = [], pagination = {}, roles = [], groups = [], invitations = [] }) {
  const [viewModal, setViewModal] = useState({ isOpen: false, userId: null })
  const [editUser, setEditUser] = useState(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const total = pagination.count ?? users.length
  const page = pagination.page || 1
  const pages = pagination.pages || 1

  const roleOptions = useMemo(() => {
    const counts = users.reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] || 0) + 1 }), {})
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [users])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) =>
      (roleFilter === 'all' || u.role === roleFilter) &&
      (!q || [u.name, u.email, u.organization, u.role, ...(u.groups || []).map((g) => g.name)]
        .some((field) => (field || '').toLowerCase().includes(q)))
    )
  }, [users, query, roleFilter])

  const handleViewUser = (userId) => {
    setViewModal({ isOpen: true, userId })
  }

  const handleDelete = (userId, userName) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return

    toast.promise(
      new Promise((resolve, reject) => {
        router.post(`/administration/team/users/${userId}/delete/`, {}, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          preserveScroll: true,
          onSuccess: () => resolve(),
          onError: () => reject(),
        })
      }),
      {
        loading: 'Deleting user...',
        success: 'User deleted successfully!',
        error: 'Failed to delete user',
      }
    )
  }

  const reloadInvites = () => router.reload({ only: ['invitations'], preserveScroll: true })

  const goToPage = (n) => router.get('/administration/team/users/', { page: n }, { preserveState: true, preserveScroll: true, only: ['users', 'pagination'] })

  const actionsFor = (user) => ({
    onView: () => handleViewUser(user.id),
    onEdit: () => setEditUser(user),
    onDelete: () => handleDelete(user.id, user.name),
  })

  const filtersActive = query || roleFilter !== 'all'

  return (
    <>
      <Head title="Team - Users" />
      <AppShell active="settings" fixedHeight>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex flex-wrap items-center gap-3">
              <SettingsHeading section="team-users">Users</SettingsHeading>
            </div>

            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full space-y-6">
              {/* Overview */}
              <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 animate-portalRise">
                <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#0B3D26]/10 blur-3xl" />
                <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <span className="w-11 h-11 rounded-xl bg-[#0B3D26] text-white inline-flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Users className="w-5 h-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <h1 className="text-lg font-semibold tracking-tight text-gray-900">Your team</h1>
                      <p className="mt-0.5 text-sm text-gray-500">Invite agents and admins, choose their role and keep access tidy.</p>
                      {users.length > 0 && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {users.slice(0, 6).map((u, i) => (
                              <Avatar key={u.id} user={u} size="sm" className="ring-2 ring-white animate-portalPop" style={{ animationDelay: `${i * 50}ms` }} />
                            ))}
                          </div>
                          {total > 6 && <span className="text-xs text-gray-500">+{total - 6} more</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:w-[22rem]">
                    <Stat icon={Users} label="Members" value={total} />
                    <Stat icon={ShieldCheck} label="Roles" value={roles.length} />
                    <Stat icon={UsersRound} label="Groups" value={groups.length} />
                  </div>
                </div>
              </section>

              <PendingInvites invitations={invitations} onChange={reloadInvites} />

              {/* Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setQuery('') }}
                    placeholder="Search name, email, group"
                    aria-label="Search users"
                    className="w-full h-9 pl-9 pr-8 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26] transition-shadow"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {roleOptions.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[['all', users.length], ...roleOptions].map(([role, count]) => {
                      const active = roleFilter === role
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setRoleFilter(role)}
                          aria-pressed={active}
                          className={`h-7 px-3 inline-flex items-center gap-1.5 rounded-full border text-xs transition-colors ${
                            active ? 'border-[#0B3D26] bg-[#0B3D26] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                          }`}
                        >
                          {role === 'all' ? 'All roles' : role}
                          <span className={`tabular-nums ${active ? 'text-white/70' : 'text-gray-400'}`}>{count}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="group md:ml-auto self-start md:self-auto inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-medium shadow-sm transition-all active:scale-[0.97]"
                >
                  <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" /> Invite users
                </button>
              </div>

              {/* Content */}
              {visible.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-14 px-6 text-center animate-portalRise">
                  <span className="mx-auto mb-3 w-12 h-12 rounded-xl bg-gray-100 text-gray-400 inline-flex items-center justify-center">
                    {filtersActive ? <Search className="w-6 h-6" strokeWidth={1.5} /> : <UserPlus className="w-6 h-6" strokeWidth={1.5} />}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900">{filtersActive ? 'No matching users' : 'No teammates yet'}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {filtersActive ? 'Try a different search or role.' : 'Invite your first teammate to start working together.'}
                  </p>
                  <div className="mt-4">
                    {filtersActive ? (
                      <button type="button" onClick={() => { setQuery(''); setRoleFilter('all') }} className="h-8 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        Clear filters
                      </button>
                    ) : (
                      <button type="button" onClick={() => setInviteOpen(true)} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-medium">
                        <UserPlus className="w-4 h-4" /> Invite users
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div key="list" className="rounded-2xl border border-gray-200 bg-white overflow-hidden animate-fadeIn">
                  <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-4 px-5 py-2.5 border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    <span>User</span><span>Role</span><span>Groups</span><span>Organization</span><span className="w-[8.5rem]" />
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {visible.map((user, index) => (
                      <li
                        key={user.id}
                        style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
                        className="group grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3 hover:bg-gray-50 transition-colors animate-portalRise"
                      >
                        <button type="button" onClick={() => handleViewUser(user.id)} className="flex items-center gap-3 min-w-0 text-left">
                          <Avatar user={user} className="transition-transform duration-300 group-hover:scale-105" />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-gray-900 truncate group-hover:text-[#0B3D26] transition-colors">{user.name}</span>
                            <span className="block text-xs text-gray-500 truncate">{user.email}</span>
                          </span>
                        </button>
                        <div className="hidden md:block"><RolePill role={user.role} /></div>
                        <div className="hidden md:block min-w-0"><GroupChips groups={user.groups} /></div>
                        <div className="hidden md:flex items-center gap-1.5 min-w-0 text-sm text-gray-600">
                          {user.organization ? (
                            <><Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /><span className="truncate">{user.organization}</span></>
                          ) : <span className="text-gray-400">—</span>}
                        </div>
                        <RowActions user={user} {...actionsFor(user)} className="md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity" />
                        <div className="md:hidden col-span-2 flex flex-wrap items-center gap-1.5 pl-12">
                          <RolePill role={user.role} />
                          <GroupChips groups={user.groups} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <p className="text-gray-500">
                    Page <span className="font-medium text-gray-900">{page}</span> of {pages} · {total} users
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!pagination.has_prev}
                      onClick={() => goToPage(page - 1)}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <button
                      type="button"
                      disabled={!pagination.has_next}
                      onClick={() => goToPage(page + 1)}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>

        <UserViewModal
          isOpen={viewModal.isOpen}
          onClose={() => setViewModal({ isOpen: false, userId: null })}
          userId={viewModal.userId}
        />

        <UserEditModal
          isOpen={!!editUser}
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => router.reload({ only: ['users', 'pagination'], preserveScroll: true })}
        />

        <InviteUserModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onInvited={reloadInvites}
          roles={roles}
          existingEmails={users.filter((u) => u.is_agent || u.role_id).map((u) => u.email)}
        />
      </AppShell>
    </>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 whitespace-nowrap">
        <Icon className="w-3.5 h-3.5 text-[#0B3D26]" strokeWidth={2} /> {label}
      </div>
      <p className="mt-1 text-xl font-semibold text-gray-900 tabular-nums">{value}</p>
    </div>
  )
}
