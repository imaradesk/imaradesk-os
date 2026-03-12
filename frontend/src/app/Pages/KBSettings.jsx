import React, { useState } from 'react'
import { Head, useForm } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import KBSidebar from '../components/KBSidebar'
import Button from '../../components/Button'
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

  const handleSubmit = (e) => {
    e.preventDefault()
    
    post('/knowledgebase/settings/update/', {
      onSuccess: () => {
        toast.success('Knowledge Base settings updated successfully')
      },
      onError: () => {
        toast.error('Failed to update settings')
      }
    })
  }

  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="mb-8">
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-start justify-between p-2">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-6 w-11 bg-gray-200 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  const Toggle = ({ label, name, description, disabled = false }) => {
    const handleToggle = () => {
      if (disabled) return
      
      const newValue = !data[name]
      
      // If turning off require_approval, also turn off dependent settings
      if (name === 'require_approval' && !newValue) {
        setData(prev => ({
          ...prev,
          require_approval: false,
          notify_approvers: false,
          notify_author_on_approval: false,
          notify_author_on_rejection: false,
        }))
      } else {
        setData(name, newValue)
      }
    }
    
    return (
    <div className={`flex items-start justify-between p-2 hover:bg-white rounded transition-colors ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:ring-offset-2 ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        } ${
          data[name] ? 'bg-[#4a154b]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            data[name] ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
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
              <h1 className="text-xl font-semibold text-gray-800">Knowledge Base Settings</h1>
              <Button
                onClick={handleSubmit}
                variant="primary"
                disabled={processing}
              >
                {processing ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            <div className="p-6">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-6">
                  {isLoading ? (
                    <LoadingSkeleton />
                  ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Access Control */}
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Access Control
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <Toggle 
                          label="Public Access"
                          name="public_access" 
                          description="Allow unauthenticated users to view published articles"
                        />
                        <Toggle 
                          label="Require Login to View"
                          name="require_login_to_view" 
                          description="Users must login to view any articles"
                        />
                        <Toggle 
                          label="Allow Article Rating"
                          name="allow_article_rating" 
                          description="Allow users to rate articles as helpful/not helpful"
                        />
                        <Toggle 
                          label="Allow Article Comments"
                          name="allow_article_comments" 
                          description="Allow users to comment on articles"
                        />
                      </div>
                    </div>

                    {/* Article Creation & Publishing */}
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Article Creation & Publishing
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <Toggle 
                          label="Require Approval"
                          name="require_approval" 
                          description="Require approval before articles are published"
                        />
                        <Toggle 
                          label="Auto-Publish on Approval"
                          name="auto_publish_on_approval" 
                          description="Automatically publish articles when approved"
                        />
                      </div>
                    </div>

                    {/* Approval Workflow */}
                    {data.require_approval && (
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Approval Workflow
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <Toggle 
                          label="Notify Approvers"
                          name="notify_approvers" 
                          description="Send email notifications to approvers"
                        />
                      </div>
                    </div>
                    )}

                    {/* Notifications */}
                    {data.require_approval && (
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notifications
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <Toggle 
                          label="Notify Author on Approval"
                          name="notify_author_on_approval" 
                          description="Send notification when article is approved"
                        />
                        <Toggle 
                          label="Notify Author on Rejection"
                          name="notify_author_on_rejection" 
                          description="Send notification when article is rejected"
                        />
                        
                      </div>
                    </div>
                    )}
                  </form>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </AppShell>
    </>
  )
}
