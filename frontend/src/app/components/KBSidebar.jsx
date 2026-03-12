import React from 'react'
import { Link, router } from '@inertiajs/react'
import { Home, FolderOpen, FileText, CheckCircle, Settings, Files, Globe, Clock, FileEdit, AlertCircle, User } from 'lucide-react'

export default function KBSidebar({ views = [], currentView = 'all', activePage = 'articles', pendingCount = 0 }) {
  const handleViewChange = (viewId) => {
    router.get('/knowledgebase/articles/', { view: viewId }, { preserveState: true })
  }

  const viewIcons = {
    all: Files,
    published: Globe,
    pending: Clock,
    draft: FileEdit,
    rejected: AlertCircle,
    my_articles: User,
  }

  const quickActions = [
    { href: '/knowledgebase/', label: 'KB Home', icon: Home, id: 'home' },
    { href: '/knowledgebase/category/new/', label: 'Manage Categories', icon: FolderOpen, id: 'categories' },
    { href: '/knowledgebase/article/new/', label: 'New Article', icon: FileText, id: 'new-article' },
    { href: '/knowledgebase/approvals/', label: 'Pending Approvals', icon: CheckCircle, id: 'approvals', badge: pendingCount },
    { href: '/knowledgebase/settings/', label: 'KB Settings', icon: Settings, id: 'settings' },
  ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Views</h2>
        <nav className="space-y-1">
          {views.map((view) => {
            const ViewIcon = viewIcons[view.id] || Files
            return (
            <button
              key={view.id}
              onClick={() => handleViewChange(view.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                view.active
                  ? 'bg-[#4a154b] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <ViewIcon className="w-4 h-4" />
                {view.label}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                view.active ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {view.count}
              </span>
            </button>
          )})}
        </nav>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-200">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="space-y-2">
          {quickActions.map((action) => {
            const ActionIcon = action.icon
            return (
            <Link
              key={action.id}
              href={action.href}
              className={`flex items-center justify-between px-3 py-2 text-sm rounded-md ${
                activePage === action.id
                  ? 'bg-[#4a154b]/10 text-[#4a154b] font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <ActionIcon className="w-4 h-4" />
                {action.label}
              </span>
              {action.badge > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  {action.badge}
                </span>
              )}
            </Link>
          )})}
        </div>
      </div>
    </aside>
  )
}
