import React, { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import { SettingsHeading } from '../components/settings/SettingsPage'
import ConfirmDialog from '../components/ConfirmDialog'
import AppIcon from '../components/marketplace/AppIcon'
import { THEME, COLORS } from '../constants/theme'
import { ArrowLeft, ExternalLink, Tag, Info, BookOpen, Download, Trash2 } from 'lucide-react'

const DOCS_URLS = {
  'tasks-projects': '',
  'customer-portal': '',
  'knowledge-base': '',
}

export default function MarketplaceAppDetail({ app }) {
  const [isInstalled, setIsInstalled] = useState(app.is_installed)
  const [processing, setProcessing] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null })

  const docsUrl = DOCS_URLS[app.slug] || ''

  const handleAction = (action) => {
    setConfirmDialog({ isOpen: true, action })
  }

  const handleConfirm = async () => {
    const { action } = confirmDialog
    setConfirmDialog({ isOpen: false, action: null })
    setProcessing(true)

    const url = action === 'install'
      ? `/administration/marketplace/install/${app.id}/`
      : `/administration/marketplace/uninstall/${app.id}/`
    const method = action === 'install' ? 'POST' : 'DELETE'

    toast.promise(
      fetch(url, { method, headers: { 'X-CSRFToken': window.csrfToken } }).then(async (res) => {
        const data = await res.json()
        if (data.success) {
          setIsInstalled(action === 'install')
          setProcessing(false)
          return data.message
        }
        setProcessing(false)
        throw new Error(data.message)
      }),
      {
        loading: action === 'install' ? 'Installing app...' : 'Uninstalling app...',
        success: (msg) => msg || (action === 'install' ? 'App installed!' : 'App uninstalled!'),
        error: (err) => err.message || 'Something went wrong',
      }
    )
  }

  const isComingSoon = app.status === 'coming_soon'

  return (
    <>
      <Head title={`${app.name} - Marketplace`} />
      <AppShell active="settings" fixedHeight>
        <div className="flex flex-1 min-h-0 overflow-hidden">

          <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full">
              {/* Back link */}
              <Link
                href="/administration/marketplace/"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Marketplace
              </Link>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-gray-200">
                  <div className="flex items-start gap-6">
                    <AppIcon app={app} size="lg" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-gray-900">{app.name}</h1>
                        {isComingSoon && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Coming soon</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{app.description}</p>

                      <div className="flex items-center gap-3 mt-5">
                        {!isComingSoon && (
                          isInstalled ? (
                            <button
                              onClick={() => handleAction('uninstall')}
                              disabled={processing}
                              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              Uninstall
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction('install')}
                              disabled={processing}
                              className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${THEME.button.primary}`}
                            >
                              <Download className="w-4 h-4" />
                              Install
                            </button>
                          )
                        )}
                        {docsUrl && (
                          <a
                            href={docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            <BookOpen className="w-4 h-4" />
                            View Docs
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 border-b border-gray-200">
                  <div className="p-5 flex items-center gap-3">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Version</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{app.version}</p>
                    </div>
                  </div>
                  <div className="p-5 flex items-center gap-3">
                    <Info className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Category</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5 capitalize">{app.category}</p>
                    </div>
                  </div>
                </div>

                {/* App Details */}
                <div className="p-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">App Details</h2>
                  <div className="prose prose-sm text-gray-600 max-w-none leading-relaxed">
                    <p>{app.long_description || app.description}</p>
                  </div>

                  {/* Status badge */}
                  <div className="mt-6 flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Status:</span>
                    {isComingSoon ? (
                      <span className="inline-flex items-center text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
                        Coming Soon
                      </span>
                    ) : isInstalled ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Installed
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
                        Not installed
                      </span>
                    )}
                  </div>
                </div>

                {/* Documentation link */}
                {docsUrl && (
                  <div className="px-8 pb-8">
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800">Documentation</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Learn how to set up and use {app.name} with Imaradesk.
                          </p>
                        </div>
                        <a
                          href={docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-white transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Docs
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, action: null })}
          onConfirm={handleConfirm}
          title={confirmDialog.action === 'install' ? 'Install App' : 'Uninstall App'}
          message={
            confirmDialog.action === 'install'
              ? `Install ${app.name}? It will be added to your workspace.`
              : `Are you sure you want to uninstall ${app.name}? All app data and settings will be removed permanently.`
          }
          confirmText={confirmDialog.action === 'install' ? 'Install' : 'Uninstall'}
          cancelText="Cancel"
          confirmStyle={confirmDialog.action === 'install' ? 'primary' : 'danger'}
        />
      </AppShell>
    </>
  )
}
