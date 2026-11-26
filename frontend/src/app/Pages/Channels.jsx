import React, { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from '@inertiajs/react'
import {
  Clock, Globe, Info, LayoutGrid, Mail, MessageSquare,
  Plug, Radio, Search, Send, Unplug, Webhook, X, Settings2,
} from 'lucide-react'
import api from '../../utils/axios'
import ConfirmDialog from '../components/ConfirmDialog'
import { Popover } from '../../components/Popover'
import { HIDDEN_CHANNELS } from '../components/SidebarNav'
import SettingsPage, { Toggle } from '../components/settings/SettingsPage'
import Tabs from '../components/Tabs'

// Channel icons come from the database as Ant Design names; map them to the
// lucide set used across settings so the tiles match the integrations grid.
const ICON_MAP = {
  GlobalOutlined: Globe,
  MailOutlined: Mail,
  MessageOutlined: MessageSquare,
  SendOutlined: Send,
  ApiOutlined: Webhook,
}

const isComingSoon = (channel) => channel.status === 'coming_soon'

const FILTERS = [
  { id: 'all', label: 'All', icon: LayoutGrid, match: () => true },
  { id: 'enabled', label: 'Enabled', icon: Plug, match: (c) => c.is_activated && !isComingSoon(c) },
  { id: 'disabled', label: 'Disabled', icon: Unplug, match: (c) => !c.is_activated && !isComingSoon(c) },
  { id: 'soon', label: 'Coming soon', icon: Clock, match: isComingSoon },
]

const TILE_SIZES = {
  sm: { box: 'w-9 h-9 rounded-lg', icon: 'w-4 h-4' },
  md: { box: 'w-12 h-12 rounded-xl', icon: 'w-5 h-5' },
}

/** Tinted tile that keeps each channel's own colour from the database. */
function ChannelTile({ channel, size = 'md', className = '' }) {
  const Icon = ICON_MAP[channel.icon] || Globe
  const s = TILE_SIZES[size]
  return (
    <span
      className={`${s.box} flex-shrink-0 inline-flex items-center justify-center shadow-sm ring-1 ring-inset ring-black/[0.04] ${className}`}
      style={{ backgroundColor: channel.icon_bg || '#f3f4f6', color: channel.icon_color || '#6b7280' }}
    >
      <Icon className={s.icon} strokeWidth={1.75} />
    </span>
  )
}

function SoonPill() {
  return (
    <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-amber-200 bg-amber-50 text-xs font-medium text-amber-700">
      <Clock className="w-3 h-3" /> Soon
    </span>
  )
}

/** Connection wins over activation: "Connected" means it has been configured. */
function ChannelPill({ channel }) {
  if (isComingSoon(channel)) return <SoonPill />

  if (channel.is_connected) {
    return (
      <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700">
        <span className="relative flex w-2 h-2">
          <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-60 animate-ping" />
          <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
        </span>
        Connected
      </span>
    )
  }

  if (channel.is_activated) {
    return (
      <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-[#0B3D26]/20 bg-[#0B3D26]/[0.07] text-xs font-medium text-[#0B3D26]">
        <span className="w-2 h-2 rounded-full bg-[#0B3D26]" />
        Enabled
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-gray-200 bg-gray-100 text-xs font-medium text-gray-500">
      <span className="w-2 h-2 rounded-full bg-gray-400" />
      Disabled
    </span>
  )
}

function ChannelSettings({ channel }) {
  if (isComingSoon(channel)) return null

  if (channel.channel_id === 'email') {
    return (
      <Link
        href="/administration/integrations/email/imap/"
        className="inline-flex items-center gap-1.5 h-8 px-2 rounded-lg text-xs font-medium text-gray-500 hover:text-[#0B3D26] hover:bg-gray-50 transition-colors"
      >
        Configure
        <Settings2 className="w-4 h-4" />
      </Link>
    )
  }

  if (channel.channel_id === 'web') {
    return (
      <Popover
        width={280}
        maxHeight={300}
        showArrow
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={toggle}
            title="About the web channel"
            className="inline-flex items-center gap-1.5 h-8 px-2 rounded-lg text-xs font-medium text-gray-500 hover:text-[#0B3D26] hover:bg-gray-50 transition-colors"
          >
            <span className="hidden sm:inline">Details</span>
            <Info className="w-4 h-4" />
          </button>
        )}
      >
        {() => (
          <div className="p-4">
            <h4 className="font-semibold text-gray-900 text-sm mb-2">About the web channel</h4>
            <p className="text-xs text-gray-600 leading-relaxed">The web channel handles tickets created through:</p>
            <ul className="text-xs text-gray-600 mt-2 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-[#0B3D26] mt-0.5">•</span>
                <span><strong>Customer portal</strong> – tickets submitted by customers via the self-service portal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0B3D26] mt-0.5">•</span>
                <span><strong>Agent dashboard</strong> – tickets created manually by agents on behalf of customers</span>
              </li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">
              Disabling this channel prevents new tickets from being created through these methods.
            </p>
          </div>
        )}
      </Popover>
    )
  }

  return null
}

function ChannelCard({ channel, index, onToggle }) {
  const soon = isComingSoon(channel)
  const providers = channel.connected_providers || []

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
      className={`group relative flex flex-col rounded-2xl border bg-white p-5 animate-portalRise ${
        soon
          ? 'border-gray-200 cursor-default'
          : `portal-lift hover:shadow-card-hover hover:border-[#0B3D26]/30 ${channel.is_activated ? 'border-[#0B3D26]/30' : 'border-gray-200'}`
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <ChannelTile
          channel={channel}
          className={`transition-transform duration-300 ${soon ? 'opacity-60 grayscale' : 'group-hover:scale-105 group-hover:-rotate-3'}`}
        />
        <ChannelPill channel={channel} />
      </div>

      <h3 className="mt-4 font-semibold text-gray-900 group-hover:text-[#0B3D26] transition-colors">
        {channel.name}
      </h3>
      <p className="mt-1.5 text-sm text-gray-500 leading-relaxed line-clamp-2">{channel.description}</p>

      {/* Channel-specific setup state */}
      {providers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {providers.map((provider) => (
            <span
              key={provider.id || provider.name}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {provider.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4 flex items-center justify-between gap-3 border-t border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          {soon ? (
            <span className="text-xs text-gray-400">Not yet available</span>
          ) : (
            <>
              <Toggle
                checked={channel.is_activated}
                onChange={() => onToggle(channel)}
                label={`${channel.is_activated ? 'Disable' : 'Enable'} ${channel.name}`}
              />
              <span className="text-xs text-gray-500 truncate">
                {channel.is_activated ? 'Enabled' : 'Disabled'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!soon && channel.is_connected && channel.inbox_count > 0 && (
            <span className="hidden sm:inline text-xs text-gray-400 tabular-nums mr-1">
              {channel.inbox_count} inbox{channel.inbox_count !== 1 ? 'es' : ''}
            </span>
          )}
          <ChannelSettings channel={channel} />
        </div>
      </div>
    </article>
  )
}

export default function Channels({ channels = [] }) {
  const [channelsList, setChannelsList] = useState(() => channels.filter((c) => !HIDDEN_CHANNELS.includes(c.channel_id)))
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, channel: null })

  const CHANNEL_INFO = {
    web: {
      enable: 'Enabling the Web channel allows customers to submit and track tickets through the customer portal and web interface.',
      disable: 'Disabling the Web channel will prevent customers from submitting tickets through the customer portal. Existing tickets will not be affected.',
    },
    email: {
      enable: 'Enabling the Email channel allows customers to create tickets by sending emails. Replies will be synced automatically.',
      disable: 'Disabling the Email channel will stop new tickets from being created via email. Existing tickets and email threads will remain intact.',
    },
    webhooks: {
      enable: 'Enabling Webhooks allows you to send real-time ticket events to your custom endpoints for external integrations.',
      disable: 'Disabling Webhooks will stop sending events to your configured endpoints. Endpoint configurations will be preserved.',
    },
  }

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, channelsList.filter(f.match).length])),
    [channelsList]
  )

  const visible = useMemo(() => {
    const match = FILTERS.find((f) => f.id === filter).match
    const q = query.trim().toLowerCase()
    return channelsList.filter(
      (c) => match(c) && (!q || c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
    )
  }, [channelsList, filter, query])

  const enabledCount = channelsList.filter((c) => c.is_activated && !isComingSoon(c)).length
  const connectedCount = channelsList.filter((c) => c.is_connected).length

  const handleToggleRequest = (channel) => {
    setConfirmDialog({ isOpen: true, channel })
  }

  const handleToggleConfirm = async () => {
    const channel = confirmDialog.channel
    if (!channel) return

    try {
      const res = await api.post(`/api/channels/${channel.id}/toggle/`)
      if (res.data.success) {
        setChannelsList((prev) =>
          prev.map((ch) => (ch.id === channel.id ? { ...ch, is_activated: res.data.is_activated } : ch))
        )
        toast.success(res.data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update channel')
    }
  }

  const getConfirmMessage = () => {
    const channel = confirmDialog.channel
    if (!channel) return ''
    const info = CHANNEL_INFO[channel.channel_id]
    const action = channel.is_activated ? 'disable' : 'enable'
    return info?.[action] || `Are you sure you want to ${action} the ${channel.name} channel?`
  }

  return (
    <>
      <SettingsPage
        group="Channels & apps"
        title="Channels"
        icon={Radio}
        description="Turn customer conversations into tickets from every channel you support."
      >
        <div className="space-y-6">
          {/* Overview */}
          <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 animate-portalRise">
            <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#0B3D26]/10 blur-3xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <span className="w-11 h-11 rounded-xl bg-[#0B3D26] text-white inline-flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Radio className="w-5 h-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight text-gray-900">Every conversation, one inbox</h2>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Email and the customer portal create tickets in the same place, so nothing slips through.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:pl-5 sm:border-l border-gray-200">
                <div className="flex -space-x-2">
                  {channelsList.slice(0, 4).map((channel) => (
                    <ChannelTile key={channel.id} channel={channel} size="sm" className="ring-2 ring-white" />
                  ))}
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-900 tabular-nums">
                    {enabledCount}
                    <span className="text-sm font-normal text-gray-400"> / {channelsList.length}</span>
                  </p>
                  <p className="text-xs text-gray-500">channels enabled</p>
                </div>
              </div>
            </div>
          </section>

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <Tabs
              label="Filter channels"
              active={filter}
              onChange={setFilter}
              tabs={FILTERS.map((f) => ({ ...f, count: counts[f.id] }))}
            />

            <div className="relative md:ml-auto md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setQuery('') }}
                placeholder="Search channels"
                aria-label="Search channels"
                className="w-full h-9 pl-9 pr-8 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26] transition-shadow"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          {visible.length > 0 ? (
            <div key={filter} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map((channel, index) => (
                <ChannelCard key={channel.id} channel={channel} index={index} onToggle={handleToggleRequest} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-14 px-6 text-center animate-portalRise">
              <span className="mx-auto mb-3 w-12 h-12 rounded-xl bg-gray-100 text-gray-400 inline-flex items-center justify-center">
                <Unplug className="w-6 h-6" strokeWidth={1.5} />
              </span>
              <h3 className="text-sm font-semibold text-gray-900">No channels found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {query ? `Nothing matches “${query}”.` : 'Nothing in this view yet.'}
              </p>
              {(query || filter !== 'all') && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setFilter('all') }}
                  className="mt-4 h-8 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Footer summary */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {connectedCount} connected
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B3D26]" />
              {enabledCount} enabled
            </span>
            <span>Changes apply immediately to new conversations.</span>
          </div>

        </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, channel: null })}
        onConfirm={handleToggleConfirm}
        title={confirmDialog.channel?.is_activated ? `Disable ${confirmDialog.channel?.name}` : `Enable ${confirmDialog.channel?.name}`}
        message={getConfirmMessage()}
        confirmText={confirmDialog.channel?.is_activated ? 'Disable' : 'Enable'}
        cancelText="Cancel"
        confirmStyle={confirmDialog.channel?.is_activated ? 'danger' : 'primary'}
      />
      </SettingsPage>
    </>
  )
}
