import React, { useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import { Ellipsis, User, LogOut } from 'lucide-react'
import Modal, { ModalBody } from './Modal'
import ConfirmDialog from './ConfirmDialog'
import { useNavItems, navIcons, logout } from './SidebarNav'

// Primary tabs, in order. Anything else the user can reach lives under "More".
const PRIMARY = [
  { key: 'home', label: 'Home' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'knowledgebase', label: 'Articles' },
]

const isItemActive = (item, active) => active === item.key || (item.key === 'knowledgebase' && active === 'kb')

/**
 * Phone/tablet navigation (below `md`), replacing the desktop icon rail.
 * Tabs respect the same module/admin filtering as the rail via useNavItems.
 */
export default function MobileBottomNav({ active, theme = 'dark' }) {
  const dark = theme === 'dark'
  const { props } = usePage()
  const user = props.auth?.user
  const items = useNavItems()
  const [moreOpen, setMoreOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const byKey = Object.fromEntries(items.map((i) => [i.key, i]))
  const tabs = PRIMARY.filter((p) => byKey[p.key]).map((p) => ({ ...byKey[p.key], label: p.label }))
  const moreItems = items.filter((i) => !PRIMARY.some((p) => p.key === i.key))
  const moreActive = moreOpen || moreItems.some((i) => isItemActive(i, active))

  const tabClass = (isActive) => `flex-1 min-w-0 flex flex-col items-center justify-center gap-1 h-full text-[11px] font-medium transition-colors active:scale-95 ${
    isActive
      ? (dark ? 'text-white' : 'text-gray-900')
      : (dark ? 'text-gray-400' : 'text-gray-500')
  }`

  const iconWrap = (isActive) => `w-12 h-7 flex items-center justify-center rounded-full transition-colors ${
    isActive ? (dark ? 'bg-white/[0.14]' : 'bg-gray-100') : ''
  }`

  const rowClass = 'flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors'

  return (
    <>
      <nav
        aria-label="Primary"
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] ${
          dark ? 'bg-[#0c0f12] border-white/10' : 'bg-white border-gray-200'
        }`}
      >
        <div className="h-16 flex items-stretch px-1">
          {tabs.map((t) => {
            const isActive = isItemActive(t, active) && !moreOpen
            return (
              <Link key={t.key} href={t.href} aria-current={isActive ? 'page' : undefined} className={tabClass(isActive)}>
                <span className={iconWrap(isActive)}>{navIcons[t.key]}</span>
                <span className="truncate max-w-full">{t.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={tabClass(moreActive)}
          >
            <span className={iconWrap(moreActive)}><Ellipsis className="w-[19px] h-[19px]" strokeWidth={1.7} /></span>
            <span>More</span>
          </button>
        </div>
      </nav>

      <Modal isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="More" size="sm">
        <ModalBody className="!p-2">
          {moreItems.map((i) => {
            const isActive = isItemActive(i, active)
            return (
              <Link
                key={i.key}
                href={i.href}
                onClick={() => setMoreOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={`${rowClass} ${isActive ? 'bg-gray-100 font-medium text-gray-900' : ''}`}
              >
                <span className="text-gray-500">{navIcons[i.key]}</span>
                {i.title}
              </Link>
            )
          })}

          <div className="my-2 border-t border-gray-100" />

          <Link href="/profile/" onClick={() => setMoreOpen(false)} className={rowClass}>
            <User className="w-[19px] h-[19px] text-gray-500" strokeWidth={1.7} />
            <span className="flex-1 min-w-0">
              <span className="block">Profile</span>
              {user?.email && <span className="block text-xs text-gray-500 truncate">{user.email}</span>}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => { setMoreOpen(false); setConfirmLogout(true) }}
            className={`${rowClass} w-full text-red-600 hover:bg-red-50`}
          >
            <LogOut className="w-[19px] h-[19px]" strokeWidth={1.7} />
            Logout
          </button>
        </ModalBody>
      </Modal>

      <ConfirmDialog
        isOpen={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={logout}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
      />
    </>
  )
}
