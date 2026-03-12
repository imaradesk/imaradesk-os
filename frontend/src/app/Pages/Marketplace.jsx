import React, { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import ConfirmDialog from '../components/ConfirmDialog'
import { THEME, COLORS } from '../constants/theme'
import { Globe, BookOpen, Package } from 'lucide-react'

// Map icon names to Lucide components
const iconMap = {
  'globe': Globe,
  'book-open': BookOpen,
}

const AppIcon = ({ iconName, className = "w-6 h-6" }) => {
  const IconComponent = iconMap[iconName] || Package
  return <IconComponent className={className} />
}

export default function Marketplace({ apps = [] }) {
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, appId: null, action: null, appName: '' })

  const installedApps = apps.filter(app => app.is_installed)
  const freeApps = apps.filter(app => app.is_free)
  const popularApps = apps.filter(app => app.install_count > 5000)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])
  const getDisplayedApps = () => {
    let filtered = apps
    switch(activeTab) {
      case 'installed':
        filtered = installedApps
        break
      case 'free':
        filtered = freeApps
        break
      case 'popular':
        filtered = popularApps
        break
      default:
        filtered = apps
    }
    
    if (searchQuery) {
      filtered = filtered.filter(app => 
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    return filtered
  }

  const handleInstallConfirm = (appId, appName, isFree) => {
    setConfirmDialog({ isOpen: true, appId, action: 'install', appName, isFree })
  }

  const handleUninstallConfirm = (appId, appName) => {
    setConfirmDialog({ isOpen: true, appId, action: 'uninstall', appName })
  }

  const handleConfirmAction = async () => {
    const { appId, action } = confirmDialog
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    
    if (action === 'install') {
      toast.promise(
        fetch(`/settings/marketplace/install/${appId}/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken,
          },
        }).then(async (response) => {
          const data = await response.json()
          if (data.success) {
            setTimeout(() => window.location.reload(), 1000)
            return data.message
          } else {
            throw new Error(data.message)
          }
        }),
        {
          loading: 'Installing app...',
          success: (message) => message || 'App installed successfully!',
          error: (err) => err.message || 'Failed to install app',
        }
      )
    } else if (action === 'uninstall') {
      toast.promise(
        fetch(`/settings/marketplace/uninstall/${appId}/`, {
          method: 'DELETE',
          headers: {
            'X-CSRFToken': csrfToken,
          },
        }).then(async (response) => {
          const data = await response.json()
          if (data.success) {
            setTimeout(() => window.location.reload(), 1000)
            return data.message
          } else {
            throw new Error(data.message)
          }
        }),
        {
          loading: 'Uninstalling app...',
          success: (message) => message || 'App uninstalled successfully!',
          error: (err) => err.message || 'Failed to uninstall app',
        }
      )
    }
  }

  return (
    <>
      <Head title="Marketplace - Settings" />
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, appId: null, action: null, appName: '' })}
        onConfirm={handleConfirmAction}
        title={confirmDialog.action === 'install' ? 'Install App' : 'Uninstall App'}
        message={
          confirmDialog.action === 'install' 
            ? confirmDialog.isFree
              ? `Install ${confirmDialog.appName}? This app is free and will be added to your workspace.`
              : `Install ${confirmDialog.appName}? You'll get a 14-day free trial, then $${apps.find(a => a.id === confirmDialog.appId)?.price || 0}/month.`
            : `Are you sure you want to uninstall ${confirmDialog.appName}? All app data and settings will be removed permanently.`
        }
        confirmText={confirmDialog.action === 'install' ? 'Install' : 'Uninstall'}
        cancelText="Cancel"
        confirmStyle={confirmDialog.action === 'install' ? 'primary' : 'danger'}
      />
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        .animate-bounce-slow {
          animation: bounce 2s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
      
      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="marketplace" />}
          
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
              <h1 className="text-xl font-semibold text-gray-800">Marketplace</h1>
            </div>

            <div className="p-6">
              {/* Info Banner */}
              <div className="mb-6 border border-blue-200 rounded-lg p-4 flex items-start gap-3" style={{ backgroundColor: '#e0f2fe' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">💡 Extend Your Ticketing System</h3>
                  <p className="text-sm text-blue-800">
                    Discover powerful apps to enhance ImaraDesk.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-6">
                  {/* Search Bar */}
                  <div className="mb-6">
                    <input
                      type="text"
                      placeholder="Search apps..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Tab Navigation */}
                  <div className="mb-6 border-b border-gray-200">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'all'
                            ? 'text-white rounded-t-lg'
                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        }`}
                        style={activeTab === 'all' ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : {}}
                      >
                        All Apps
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full" style={activeTab === 'all' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#e5e7eb' }}>
                          {apps.length}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('installed')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'installed'
                            ? 'text-white rounded-t-lg'
                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        }`}
                        style={activeTab === 'installed' ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : {}}
                      >
                        Installed
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full" style={activeTab === 'installed' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#e5e7eb' }}>
                          {installedApps.length}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('free')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'free'
                            ? 'text-white rounded-t-lg'
                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        }`}
                        style={activeTab === 'free' ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : {}}
                      >
                        Free
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full" style={activeTab === 'free' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#e5e7eb' }}>
                          {freeApps.length}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('popular')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'popular'
                            ? 'text-white rounded-t-lg'
                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        }`}
                        style={activeTab === 'popular' ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : {}}
                      >
                        Popular
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full" style={activeTab === 'popular' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#e5e7eb' }}>
                          {popularApps.length}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Apps Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                      // Skeleton Loading Cards
                      Array.from({ length: 6 }).map((_, index) => (
                        <SkeletonCard key={index} />
                      ))
                    ) : (
                      getDisplayedApps().map((app) => (
                        <AppCard key={app.id} app={app} onInstall={handleInstallConfirm} onUninstall={handleUninstallConfirm} />
                      ))
                    )}
                  </div>

                  {/* Empty State */}
                  {!isLoading && getDisplayedApps().length === 0 && (
                    <div className="text-center py-12">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-16 h-16 text-gray-400 mx-auto mb-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No apps found</h3>
                      <p className="text-sm text-gray-500">Try selecting a different tab or clearing your search</p>
                    </div>
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

function AppCard({ app, onInstall, onUninstall }) {
  const isInstalled = app.is_installed
  const isTrialExpired = app.is_trial_expired
  const trialDaysRemaining = app.trial_days_remaining

  const handleAction = () => {
    if (isInstalled) {
      onUninstall(app.id, app.name)
    } else {
      onInstall(app.id, app.name, app.is_free)
    }
  }

  const getInstallButtonText = () => {
    if (isInstalled) {
      if (isTrialExpired) return 'Upgrade'
      return 'Uninstall'
    }
    if (app.is_free) return 'Install Free'
    return 'Start Trial'
  }

  const getStatusBadge = () => {
    if (!isInstalled) return null
    
    if (isTrialExpired || app.subscription_status === 'expired') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
          Expired
        </span>
      )
    }
    if (app.subscription_status === 'trial' && trialDaysRemaining !== null) {
      const bgColor = trialDaysRemaining <= 3 ? '#fef3c7' : '#dbeafe'
      const textColor = trialDaysRemaining <= 3 ? '#92400e' : '#1e40af'
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: bgColor, color: textColor }}>
          {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left
        </span>
      )
    }
    if (app.subscription_status === 'active') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
          Active
        </span>
      )
    }
    return null
  }

  const handleButtonClick = () => {
    if (isInstalled && isTrialExpired) {
      // Redirect to upgrade/payment page
      window.location.href = `/settings/marketplace/?app=${app.slug}&upgrade=true`
    } else {
      handleAction()
    }
  }

  return (
    <div className={`bg-white border rounded-lg p-5 hover:shadow-lg transition-shadow duration-200 ${isTrialExpired ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f0f9ff' }}>
            <AppIcon iconName={app.icon} className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{app.name}</h3>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">{app.category}</p>
              {app.version && (
                <span className="text-xs text-gray-400">v{app.version}</span>
              )}
            </div>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{app.description}</p>

      {/* Trial expired warning */}
      {isInstalled && isTrialExpired && (
        <div className="mb-4 p-2 rounded bg-red-50 border border-red-100">
          <p className="text-xs text-red-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Trial expired - Upgrade to continue using
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          {app.is_free ? (
            <span className="text-lg font-bold" style={{ color: COLORS.primary }}>Free</span>
          ) : (
            <div>
              <span className="text-lg font-bold text-gray-900">${app.price}</span>
              <span className="text-sm text-gray-500">/mo</span>
            </div>
          )}
        </div>

        <button
          onClick={handleButtonClick}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isInstalled
              ? isTrialExpired
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              : 'text-white hover:opacity-90'
          }`}
          style={!isInstalled ? { backgroundColor: COLORS.primary } : {}}
        >
          {getInstallButtonText()}
        </button>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gray-200"></div>
          <div>
            <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 w-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          <div className="h-5 w-16 bg-gray-200 rounded mb-1"></div>
          <div className="h-3 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="h-9 w-24 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  )
}
