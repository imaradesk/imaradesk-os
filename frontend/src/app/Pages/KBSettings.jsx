import React, { useState } from 'react'
import { Head, useForm } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import KBSidebar from '../components/KBSidebar'
import { COLORS } from '../constants/theme'
import { Lock, FileText, CheckCircle, Bell } from 'lucide-react'

export default function KBSettings({ settings, sidebar = { views: [] }, pendingCount = 0 }) {
  const [isLoading, setIsLoading] = useState(!settings)
  
  const { data, setData, post, processing } = useForm({
    ...settings
  })

  React.useEffect(() => {
    if (settings) {
      setIsLoading(false)
    }
  }, [settings])

  const saveSettings = (updatedData) => {
    post('/knowledgebase/settings/update/', {
      data: updatedData,
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Settings saved')
      },
      onError: () => {
        toast.error('Failed to save settings')
      }
    })
  }

  const handleToggle = (name) => {
    let updatedData
    if (name === 'require_approval' && data[name]) {
      updatedData = {
        ...data,
        require_approval: false,
        notify_approvers: false,
        notify_author_on_approval: false,
        notify_author_on_rejection: false,
      }
      setData(updatedData)
    } else {
      updatedData = { ...data, [name]: !data[name] }
      setData(name, !data[name])
    }
    saveSettings(updatedData)
  }

  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-8">
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="bg-gray-50 rounded-xl p-4 h-20"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  const Toggle = ({ enabled, onToggle, disabled }) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      disabled={disabled || processing}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${enabled ? '' : 'bg-gray-200'} ${(disabled || processing) ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={enabled ? { backgroundColor: COLORS.primary } : {}}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )

  const SettingCard = ({ name, title, description, disabled = false }) => {
    const isEnabled = data[name]
    
    return (
      <div className="group relative bg-gray-50 border border-gray-100 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:-translate-y-0.5">
        <div className={`absolute top-3 right-3 w-2 h-2 rounded-full transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
        
        <div className="pr-4">
          <div className="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h4 className="text-sm font-medium text-gray-900">{title}</h4>
          </div>
          
          <div className="overflow-hidden transition-all duration-200 max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100">
            <p className="text-xs text-gray-500 mb-3 leading-relaxed pl-6">{description}</p>
            <div className="flex items-center justify-between pl-6">
              <span className="text-xs text-gray-400">{isEnabled ? 'Enabled' : 'Disabled'}</span>
              <Toggle enabled={isEnabled} onToggle={() => handleToggle(name)} disabled={disabled} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head title="Knowledge Base Settings" />
      <AppShell active="knowledgebase">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          <KBSidebar views={sidebar.views} activePage="settings" pendingCount={pendingCount} />

          <main className="flex-1 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-800">Knowledge Base Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Hover over cards to see details and toggle settings</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Enabled
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                    Disabled
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {isLoading ? (
                <LoadingSkeleton />
              ) : (
              <form className="space-y-8">
                {/* Access Control */}
                <div className="space-y-3">
                  <div className="flex items-center pb-2 border-b border-gray-200 mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-800">Access Control</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <SettingCard name="public_access" title="Public Access" description="Allow unauthenticated users to view published articles" />
                    <SettingCard name="require_login_to_view" title="Require Login" description="Users must login to view any articles" />
                    <SettingCard name="allow_article_rating" title="Article Rating" description="Allow users to rate articles as helpful/not helpful" />
                    <SettingCard name="allow_article_comments" title="Article Comments" description="Allow users to comment on articles" />
                  </div>
                </div>

                {/* Article Creation & Publishing */}
                <div className="space-y-3">
                  <div className="flex items-center pb-2 border-b border-gray-200 mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-800">Article Creation & Publishing</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <SettingCard name="require_approval" title="Require Approval" description="Require approval before articles are published" />
                    <SettingCard name="auto_publish_on_approval" title="Auto-Publish" description="Automatically publish articles when approved" />
                  </div>
                </div>

                {/* Approval Workflow & Notifications */}
                {data.require_approval && (
                <div className="space-y-3">
                  <div className="flex items-center pb-2 border-b border-gray-200 mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                        <Bell className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-800">Approval Notifications</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <SettingCard name="notify_approvers" title="Notify Approvers" description="Send email notifications to approvers when articles need review" />
                    <SettingCard name="notify_author_on_approval" title="Notify on Approval" description="Send notification to author when article is approved" />
                    <SettingCard name="notify_author_on_rejection" title="Notify on Rejection" description="Send notification to author when article is rejected" />
                  </div>
                </div>
                )}
              </form>
              )}
            </div>
          </main>
        </div>
      </AppShell>
    </>
  )
}
