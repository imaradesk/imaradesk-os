import React, { useCallback, useEffect, useState } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { Popover } from '../../components/Popover'
import { Bell, Ticket, CheckSquare, MessageSquare, AtSign } from 'lucide-react'
import Tabs from './Tabs'
import api from '../../utils/axios'

const ICONS = { ticket: Ticket, task: CheckSquare, reply: MessageSquare, mention: AtSign }

// Read state lives in the browser: everything older than `seenAt`, plus ids opened since
const readState = (key) => {
  try {
    return { seenAt: 0, ids: [], ...JSON.parse(localStorage.getItem(key)) }
  } catch {
    return { seenAt: 0, ids: [] }
  }
}

const timeAgo = (iso) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
  const days = Math.floor(minutes / 1440)
  return days === 1 ? 'Yesterday' : `${days}d ago`
}

function useNotifications() {
  const userId = usePage().props.auth?.user?.id
  const key = `notifications_read_${userId}`
  const [feed, setFeed] = useState([])
  const [read, setRead] = useState(() => readState(key))

  const refresh = useCallback(() => {
    api.get('/api/notifications/')
      .then((res) => setFeed(res.data.notifications || []))
      .catch(() => {}) // the bell is not worth an error toast
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const save = (next) => {
    setRead(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* storage blocked */ }
  }

  const items = feed.map((n) => ({
    ...n,
    read: new Date(n.at).getTime() <= read.seenAt || read.ids.includes(n.id),
  }))

  return {
    items,
    refresh,
    markAllRead: () => save({ seenAt: Date.now(), ids: [] }),
    markRead: (id) => save({ ...read, ids: [...read.ids, id].slice(-100) }),
  }
}

function NotificationsPanel({ close, dark, items, refresh, markAllRead, markRead }) {
  const [tab, setTab] = useState('all')

  useEffect(() => { refresh() }, [refresh])

  const unreadCount = items.filter((n) => !n.read).length
  const visible = tab === 'unread' ? items.filter((n) => !n.read) : items

  const open = (n) => {
    markRead(n.id)
    close()
    router.visit(n.url)
  }

  const border = dark ? 'border-white/10' : 'border-gray-200'
  const rowBorder = dark ? 'border-white/5' : 'border-gray-100'

  return (
    <div className="flex flex-col" style={{ maxHeight: 420 }}>
      <div className={`flex items-center justify-between px-3 pt-2.5 pb-1.5`}>
        <p className="text-xs font-medium text-gray-400">Notifications</p>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs font-medium text-blue-500 hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      <div className={`px-3 pb-2 border-b ${border} ${dark ? 'app-dark' : ''}`}>
        <Tabs
          compact
          label="Filter notifications"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread', count: unreadCount },
          ]}
        />
      </div>

      <div className="overflow-y-auto flex-1">
        {visible.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">You're all caught up</div>
        ) : (
          visible.map((n) => {
            const Icon = ICONS[n.type] || Ticket
            return (
              <button
                key={n.id}
                onClick={() => open(n)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 text-left border-b ${rowBorder} transition-colors ${
                  dark ? 'hover:bg-white/10' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400 ${dark ? 'bg-white/5' : 'bg-gray-100'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${
                    n.read ? (dark ? 'text-gray-400' : 'text-gray-600') : (dark ? 'text-gray-100 font-medium' : 'text-gray-900 font-medium')
                  }`}>{n.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.at)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
              </button>
            )
          })
        )}
      </div>

      <Link
        href="/administration/notifications"
        onClick={close}
        className={`px-3 py-2.5 text-center text-xs font-medium border-t ${border} ${
          dark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        Notification settings
      </Link>
    </div>
  )
}

export default function NotificationsPopover({ dark, iconBtn }) {
  const notifications = useNotifications()
  const unread = notifications.items.some((n) => !n.read)

  return (
    <Popover
      width={380}
      maxHeight={420}
      showArrow={true}
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className={`relative w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors ${iconBtn}`}
          title="Notifications"
        >
          <Bell className="w-5 h-5" strokeWidth={1.75} />
          {unread && <span className={`absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ${dark ? 'ring-[#0c0f12]' : 'ring-white'}`} />}
        </button>
      )}
    >
      {({ close }) => <NotificationsPanel close={close} dark={dark} {...notifications} />}
    </Popover>
  )
}
