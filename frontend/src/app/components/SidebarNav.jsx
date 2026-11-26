import React, { useState, useRef, useMemo } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { 
  LayoutDashboard,
  TicketCheck,
  User,
  LibraryBig,
  ChartColumn,
  SlidersHorizontal,
  Settings,
  LogOut,
  Bell,
  ListTodo,
  Building2
} from 'lucide-react'
import Modal, { ModalBody, ModalFooter } from './Modal'
import { Popover } from '../../components/Popover'
import logoImg from '../assets/imaradesk-logo.png'
import questionImg from '../assets/question.jpg'
import { useInstalledModules } from '../context/InstalledModulesContext'
import api from '../../utils/axios'
import {
  GlobalOutlined,
  MailOutlined,
  MessageOutlined,
  SendOutlined,
  ApiOutlined,
} from '@ant-design/icons'

const CHANNEL_ICON_MAP = {
  GlobalOutlined,
  MailOutlined,
  MessageOutlined,
  SendOutlined,
  ApiOutlined,
}

// Channels backed by features that are not part of this edition
export const HIDDEN_CHANNELS = ['widget', 'slack', 'microsoft_teams', 'teams', 'telegram']

const getChannelState = (ch) => {
  if (ch.status === 'coming_soon') return { label: 'Coming soon', dot: 'bg-gray-300', text: 'text-gray-400' }
  if (!ch.is_activated) return { label: 'Disabled', dot: 'bg-gray-400', text: 'text-gray-500' }
  if (ch.is_connected || ch.is_integrated || ch.connected_providers?.length) {
    return { label: 'Connected', dot: 'bg-green-500', text: 'text-green-600' }
  }
  return { label: 'Enabled', dot: 'bg-amber-400', text: 'text-amber-600' }
}

const iconClass = "w-[19px] h-[19px]"

// Nav icons use a consistent 1.7 stroke for a crisp, modern outline.
// Each icon is chosen to read clearly at 19px inside the 40px rail tiles.
export const navIcons = {
  home: <LayoutDashboard className={iconClass} strokeWidth={1.7} />,
  tickets: <TicketCheck className={iconClass} strokeWidth={1.7} />,
  contacts: <User className={iconClass} strokeWidth={1.7} />,
  tasks: <ListTodo className={iconClass} strokeWidth={1.7} />,
  knowledgebase: <LibraryBig className={iconClass} strokeWidth={1.7} />,
  building: <Building2 className={iconClass} strokeWidth={1.7} />,
  chart: <ChartColumn className={iconClass} strokeWidth={1.7} />,
  settings: <SlidersHorizontal className={iconClass} strokeWidth={1.7} />,
}

const ALL_NAV_ITEMS = [
  { key: 'home', href: '/dashboard/', title: 'Dashboard', module: null },
  { key: 'tickets', href: '/tickets', title: 'Tickets', module: null },
  { key: 'tasks', href: '/tasks', title: 'Tasks', module: 'tasks' },
  { key: 'knowledgebase', href: '/knowledgebase', title: 'Knowledge Base', module: 'kb' },
  { key: 'chart', href: '/reports', title: 'Reports', module: null },
  { key: 'settings', href: '/administration', title: 'Settings', module: null, adminOnly: true },
]

// Nav items the current user can reach (installed modules, admin-only items).
// Shared by the desktop rail and the mobile bottom nav.
export function useNavItems() {
  const { props } = usePage()
  const user = props.auth?.user
  const { isModuleInstalled } = useInstalledModules()
  return useMemo(() => {
    return ALL_NAV_ITEMS.filter(item => {
      if (item.adminOnly && !user?.isAdmin) return false
      if (!item.module) return true
      return isModuleInstalled(item.module)
    })
  }, [isModuleInstalled, user?.isAdmin])
}

export async function logout() {
  try {
    await api.post('/logout/')
  } catch (e) {
    // pass
  }
  window.location.href = '/login/'
}

// Tooltip component for sidebar items
function SidebarTooltip({ children, label }) {
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState({ top: 0 })
  const triggerRef = useRef(null)

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({ top: rect.top + rect.height / 2 })
    }
    setShow(true)
  }

  return (
    <div 
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
      className="flex justify-center"
    >
      {children}
      {show && (
        <div 
          className="fixed left-[68px] px-2.5 py-1.5 bg-gray-900/95 text-white text-[11px] font-medium tracking-wide rounded-lg whitespace-nowrap shadow-xl ring-1 ring-white/10 z-[100] pointer-events-none backdrop-blur-sm"
          style={{ top: position.top, transform: 'translateY(-50%)' }}
        >
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900/95" />
        </div>
      )}
    </div>
  )
}

export default function SidebarNav({ active = 'people', theme = 'dark' }) {
  const dark = theme === 'dark'
  const { props } = usePage()
  const user = props.auth?.user
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [channels, setChannels] = useState(null)

  const loadChannels = () => {
    api.get('/api/channels/status/')
      .then(res => setChannels((res.data.channels || []).filter(c => !HIDDEN_CHANNELS.includes(c.channel_id))))
      .catch(() => setChannels(prev => prev || []))
  }
  
  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const items = useNavItems()

  return (
    <>
      <div className={`w-[60px] hidden md:flex flex-col items-center pt-5 pb-3 fixed left-0 top-0 h-screen z-40 ${dark ? 'bg-[#0c0f12] text-gray-400' : 'bg-white text-gray-500'}`}>
        {/* Logo */}
        <Link href="/dashboard/" className={`w-10 h-10 mb-4 flex items-center justify-center flex-shrink-0 rounded-xl transition-all duration-200 ${dark ? 'hover:bg-white/[0.06]' : 'hover:bg-gray-100'}`}>
          <img src={logoImg} alt="Imaradesk" className="w-8 h-8 object-contain" />
        </Link>

        {/* Navigation items — neutral rail tiles with a quiet active pill */}
        <div className="flex-1 flex flex-col items-center gap-1.5 overflow-y-auto w-full no-scrollbar py-1">
          {items.map((i) => {
            const isActive = active === i.key || (i.key === 'knowledgebase' && active === 'kb')
            return (
              <SidebarTooltip key={i.key} label={i.title}>
                <Link
                  href={i.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group w-10 h-10 flex items-center justify-center relative transition-all duration-200 ease-out active:scale-95 ${
                    isActive
                      ? `rounded-xl ${dark ? 'bg-white/[0.14] text-white ring-1 ring-inset ring-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.25)]' : 'bg-gray-100 text-gray-900 ring-1 ring-inset ring-gray-200/80 shadow-sm'}`
                      : `rounded-xl ${dark ? 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`
                  }`}
                >
                  <span className="sr-only">{i.title}</span>
                  {isActive && (
                    <span className={`absolute -left-[10px] h-4 w-[2.5px] rounded-full ${dark ? 'bg-white/80' : 'bg-gray-900'}`} />
                  )}
                  <span className="transition-transform duration-200 ease-out group-hover:scale-105">
                    {navIcons[i.key]}
                  </span>
                  {i.badge > 0 && (
                    <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-semibold ring-2 ${dark ? 'ring-[#0c0f12]' : 'ring-white'}`}>
                      {i.badge > 99 ? '99+' : i.badge}
                    </span>
                  )}
                </Link>
              </SidebarTooltip>
            )
          })}
        </div>
        
        {/* Bottom controls: App switcher & User Avatar */}
        <div className={`flex flex-col items-center space-y-3 pt-3 border-t w-full mt-auto ${dark ? 'border-white/10' : 'border-gray-200'}`}>
          {/* 9-dot colorful app switcher grid — channels popover */}
          <Popover
            className={dark ? 'app-dark' : ''}
            width={300}
            maxHeight={460}
            showArrow={true}
            placement="right"
            onOpenChange={(isOpen) => isOpen && loadChannels()}
            trigger={({ toggle }) => (
              <SidebarTooltip label="Channels">
                <button
                  onClick={toggle}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${dark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                >
                  <div className="grid grid-cols-3 gap-1 p-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                  </div>
                </button>
              </SidebarTooltip>
            )}
          >
            {({ close }) => (
              <div className="py-2">
                <div className="px-4 py-2 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-900">Channels</div>
                  <div className="text-xs text-gray-500">Status of your communication channels</div>
                </div>

                <div className="py-1">
                  {channels === null ? (
                    <div className="px-4 py-2 space-y-3">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-gray-200 animate-pulse" />
                          <div className="flex-1 h-3 bg-gray-200 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : channels.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No channels configured</p>
                  ) : (
                    channels.map(ch => {
                      const Icon = CHANNEL_ICON_MAP[ch.icon] || GlobalOutlined
                      const state = getChannelState(ch)
                      // Channel setup is Administration: agents only see the status
                      const Row = user?.isAdmin ? Link : 'div'
                      const rowProps = user?.isAdmin ? { href: '/administration/channels/', onClick: close } : {}
                      return (
                        <Row
                          key={ch.id}
                          {...rowProps}
                          className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors ${ch.status === 'coming_soon' ? 'opacity-60' : ''}`}
                        >
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: ch.icon_bg || '#f3f4f6', color: ch.icon_color || '#6b7280' }}
                          >
                            <Icon style={{ fontSize: 14 }} />
                          </span>
                          <span className="flex-1 min-w-0 text-sm text-gray-700 truncate">{ch.name}</span>
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${state.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${state.dot}`} />
                            {state.label}
                          </span>
                        </Row>
                      )
                    })
                  )}
                </div>

                {user?.isAdmin && <div className="border-t border-gray-200 py-1">
                  <Link
                    href="/administration/channels/"
                    onClick={close}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-500" />
                    Manage channels
                  </Link>
                </div>}
              </div>
            )}
          </Popover>

          {/* User Avatar */}
          <Popover
            className={dark ? 'app-dark' : ''}
            width={280}
            maxHeight={500}
            showArrow={true}
            placement="right"
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-150 overflow-hidden ring-1 ${dark ? 'bg-white/15 text-white hover:bg-white/25 ring-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 ring-gray-200'}`}
                title={user?.name || 'Account'}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  getInitials(user?.name)
                )}
              </button>
            )}
          >
            {({ close }) => (
              <div className="py-2">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#0B3D26] flex items-center justify-center text-sm font-semibold text-white">
                        {getInitials(user?.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</div>
                      <div className="text-xs text-gray-500 truncate">{user?.email || ''}</div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="py-1">
                  <Link
                    href="/profile/"
                    onClick={close}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    Profile
                  </Link>
                  {user?.isAdmin && <Link
                    href="/administration"
                    onClick={close}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-500" />
                    Administration
                  </Link>}
                  {user?.isAdmin && <Link
                    href="/administration/notifications"
                    onClick={close}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Bell className="w-4 h-4 text-gray-500" />
                    Notifications
                  </Link>}
                </div>
                
                {/* Logout */}
                <div className="border-t border-gray-200 py-1">
                  <button
                    onClick={() => {
                      close()
                      setShowLogoutModal(true)
                    }}
                    className="flex items-center gap-3 px-4 py-2 w-full text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </Popover>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Logout"
        maxWidth="max-w-md"
      >
        <ModalBody>
          <div className="flex justify-center mb-4">
            <img src={questionImg} alt="" className="w-32 h-32 object-contain" />
          </div>
          <p className="text-gray-600 text-center">Are you sure you want to log out?</p>
        </ModalBody>
        <ModalFooter className="justify-end">
          <button
            onClick={() => setShowLogoutModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </ModalFooter>
      </Modal>
    </>
  )
}
