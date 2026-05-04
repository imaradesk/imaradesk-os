import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import ConfirmDialog from '../components/ConfirmDialog'
import Drawer from '../components/Drawer'
import { Popover } from '../../components/Popover'
import { COLORS } from '../constants/theme'
import {
  GlobalOutlined,
  MailOutlined,
  ApiOutlined,
  SettingOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'

const ICON_MAP = {
  GlobalOutlined,
  MailOutlined,
  ApiOutlined,
}

function ChannelCard({ channel, onToggle, onConfigure }) {
  const Icon = ICON_MAP[channel.icon] || GlobalOutlined
  const isComingSoon = channel.status === 'coming_soon'

  return (
    <div className={`group bg-white border border-l-2 p-5 flex flex-col justify-between transition-colors ${
      channel.is_connected ? 'border-[#4a154b]/30' : 'border-gray-200'
    } ${isComingSoon ? 'opacity-60' : 'hover:border-l-[#4a154b]'}`}>
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Icon style={{ fontSize: 24, color: channel.icon_color }} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-800 text-sm">{channel.name}</h3>
                {isComingSoon ? (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Coming soon</span>
                ) : channel.is_connected ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Connected
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">Not connected</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">{channel.description}</p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {isComingSoon ? (
            <span className="text-xs text-gray-400 italic">Not yet available</span>
          ) : (
            <>
              <button
                onClick={() => onToggle(channel)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  channel.is_activated ? 'bg-[#4a154b]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    channel.is_activated ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-500">{channel.is_activated ? 'Enabled' : 'Disabled'}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {channel.is_connected && channel.inbox_count > 0 && (
            <span className="text-xs text-gray-400">{channel.inbox_count} inbox{channel.inbox_count !== 1 ? 'es' : ''}</span>
          )}
          {!isComingSoon && channel.channel_id === 'email' && (
            <button
              onClick={() => onConfigure && onConfigure(channel)}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Configure email integration"
            >
              <SettingOutlined style={{ fontSize: 16 }} />
            </button>
          )}
          {!isComingSoon && channel.channel_id === 'web' && (
            <Popover
              width={280}
              maxHeight={300}
              showArrow={true}
              trigger={({ toggle }) => (
                <button
                  onClick={toggle}
                  className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <InfoCircleOutlined style={{ fontSize: 16 }} />
                </button>
              )}
            >
              {({ close }) => (
                <div className="p-4">
                  <h4 className="font-semibold text-gray-800 text-sm mb-2">About Web Channel</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    The Web channel handles tickets created through:
                  </p>
                  <ul className="text-xs text-gray-600 mt-2 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-[#4a154b] mt-0.5">•</span>
                      <span><strong>Customer Portal</strong> – Tickets submitted by customers via the self-service portal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#4a154b] mt-0.5">•</span>
                      <span><strong>Agent Dashboard</strong> – Tickets created manually by agents on behalf of customers</span>
                    </li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-3 italic">
                    Disabling this channel will prevent new tickets from being created through these methods.
                  </p>
                </div>
              )}
            </Popover>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Channels({ channels = [] }) {
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const [channelsList, setChannelsList] = useState(channels)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, channel: null })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const emailChannel = channelsList.find(ch => ch.channel_id === 'email')
  const imapConnected = emailChannel?.connected_providers?.some(p => p.id === 'imap')
  const imapProvider = emailChannel?.connected_providers?.find(p => p.id === 'imap')

  const CHANNEL_INFO = {
    web: {
      enable: 'Enabling the Web channel allows customers to submit and track tickets through the customer portal and web interface.',
      disable: 'Disabling the Web channel will prevent customers from submitting tickets through the customer portal. Existing tickets will not be affected.',
    },
    email: {
      enable: 'Enabling the Email channel allows customers to create tickets by sending emails. Replies will be synced automatically.',
      disable: 'Disabling the Email channel will stop new tickets from being created via email. Existing tickets and email threads will remain intact.',
    },
  }

  const handleToggleRequest = (channel) => {
    setConfirmDialog({ isOpen: true, channel })
  }

  const handleToggleConfirm = async () => {
    const channel = confirmDialog.channel
    if (!channel) return

    try {
      const res = await api.post(`/api/channels/${channel.id}/toggle/`)
      if (res.data.success) {
        setChannelsList(prev =>
          prev.map(ch => ch.id === channel.id ? { ...ch, is_activated: res.data.is_activated } : ch)
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
      <Head title="Channels - Settings" />

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

      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="channels" />}

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
              <h1 className="text-xl font-semibold text-gray-800">Channels</h1>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-500 mb-6">
                Enable and configure the communication channels available for your inboxes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {channelsList.map(channel => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    onToggle={handleToggleRequest}
                    onConfigure={() => setDrawerOpen(true)}
                  />
                ))}
              </div>
            </div>
          </main>
        </div>
      </AppShell>

      {/* Email Provider Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Select Email Provider"
        width="max-w-sm"
      >
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-gray-500 mb-4">Choose a provider to configure email integration.</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setDrawerOpen(false)
                router.visit('/administration/integrations/email/imap/')
              }}
              className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#4a154b]/40 hover:shadow-sm transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#4a154b]/10 transition-colors">
                <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4a154b] transition-colors" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" fillOpacity="0.15"/>
                  <path d="M2 8L12 14L22 8" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M6 17H18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-800 group-hover:text-[#4a154b] transition-colors">Custom SMTP/IMAP</h3>
                  {imapConnected && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Connected{imapProvider?.count > 1 ? ` (${imapProvider.count})` : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Connect using your own mail server credentials</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-[#4a154b] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </Drawer>
    </>
  )
}
