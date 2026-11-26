import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import {
  ArrowUpRight, CheckCircle2, Clock, Download, LayoutGrid, PackageCheck, PackageOpen, Search, Sparkles, X,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { SettingsHeading } from '../components/settings/SettingsPage'
import AppIcon from '../components/marketplace/AppIcon'
import Tabs from '../components/Tabs'

const isComingSoon = (app) => app.status === 'coming_soon'

const TABS = [
  { id: 'all', label: 'All', icon: LayoutGrid, match: () => true },
  { id: 'installed', label: 'Installed', icon: PackageCheck, match: (app) => app.is_installed },
  { id: 'available', label: 'Available', icon: Download, match: (app) => !app.is_installed && !isComingSoon(app) },
  { id: 'soon', label: 'Coming soon', icon: Clock, match: isComingSoon },
]

const titleCase = (value = '') => value.charAt(0).toUpperCase() + value.slice(1)

export default function Marketplace({ apps = [] }) {
  const [activeTab, setActiveTab] = useState('all')
  const [category, setCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef(null)

  // "/" focuses search, like the rest of the app's list pages
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const categories = useMemo(() => [...new Set(apps.map((app) => app.category).filter(Boolean))], [apps])
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((tab) => [tab.id, apps.filter(tab.match).length])),
    [apps]
  )

  const displayedApps = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab)
    const query = searchQuery.trim().toLowerCase()
    return apps.filter((app) =>
      tab.match(app) &&
      (category === 'all' || app.category === category) &&
      (!query || app.name.toLowerCase().includes(query) || app.description.toLowerCase().includes(query))
    )
  }, [apps, activeTab, category, searchQuery])

  const hasFilters = searchQuery || category !== 'all' || activeTab !== 'all'
  const clearFilters = () => { setSearchQuery(''); setCategory('all'); setActiveTab('all') }
  const installedPct = apps.length ? Math.round((counts.installed / apps.length) * 100) : 0

  return (
    <>
      <Head title="Marketplace - Settings" />
      <AppShell active="settings" fixedHeight>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex flex-wrap items-center gap-3">
              <SettingsHeading section="marketplace">Marketplace</SettingsHeading>
              <div className="relative ml-auto w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search modules"
                  aria-label="Search modules"
                  className="w-full h-9 pl-9 pr-9 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26] transition-shadow"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setSearchQuery(''); e.currentTarget.blur() } }}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 px-1.5 items-center rounded border border-gray-200 bg-gray-50 text-[10px] font-medium text-gray-400">/</kbd>
                )}
              </div>
            </div>

            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full space-y-6">
              {/* Overview */}
              <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 animate-portalRise">
                <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#0B3D26]/10 blur-3xl" />
                <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <span className="w-11 h-11 rounded-xl bg-[#0B3D26] text-white inline-flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Sparkles className="w-5 h-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <h1 className="text-lg font-semibold tracking-tight text-gray-900">Extend your helpdesk</h1>
                      <p className="mt-0.5 text-sm text-gray-500">
                        Add modules to Imaradesk as your team grows. Every module is free and ready the moment you install it.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:w-[22rem]">
                    <Stat icon={PackageCheck} label="Installed" value={counts.installed} tone="text-emerald-600" />
                    <Stat icon={PackageOpen} label="Available" value={counts.available} tone="text-[#0B3D26]" />
                    <Stat icon={Clock} label="Coming soon" value={counts.soon} tone="text-amber-600" />
                  </div>
                </div>

                
              </section>

              {/* Filters */}
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <Tabs
                  label="Filter by status"
                  active={activeTab}
                  onChange={setActiveTab}
                  tabs={TABS.map(({ id, label, icon }) => ({ id, label, icon, count: counts[id] }))}
                />

                {categories.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 md:ml-auto">
                    {['all', ...categories].map((cat) => {
                      const active = category === cat
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          aria-pressed={active}
                          className={`h-7 px-3 rounded-full border text-xs transition-colors ${
                            active
                              ? 'border-[#0B3D26] bg-[#0B3D26] text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                          }`}
                        >
                          {cat === 'all' ? 'All categories' : titleCase(cat)}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Apps grid */}
              {displayedApps.length > 0 ? (
                <div key={`${activeTab}-${category}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedApps.map((app, index) => (
                    <AppCard key={app.id} app={app} index={index} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-14 px-6 text-center animate-portalRise">
                  <span className="mx-auto mb-3 w-12 h-12 rounded-xl bg-gray-100 text-gray-400 inline-flex items-center justify-center">
                    <PackageOpen className="w-6 h-6" strokeWidth={1.5} />
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900">No modules found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery ? `Nothing matches “${searchQuery}”.` : 'There are no modules in this view yet.'}
                  </p>
                  {hasFilters && (
                    <button type="button" onClick={clearFilters} className="mt-4 h-8 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </AppShell>
    </>
  )
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 whitespace-nowrap">
        <Icon className={`w-3.5 h-3.5 ${tone}`} strokeWidth={2} /> {label}
      </div>
      <p className="mt-1 text-xl font-semibold text-gray-900 tabular-nums">{value}</p>
    </div>
  )
}

function StatusBadge({ app }) {
  if (isComingSoon(app)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-700">
        <Clock className="w-3 h-3" /> Soon
      </span>
    )
  }
  if (app.is_installed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 className="w-3 h-3" /> Installed
      </span>
    )
  }
  if (app.status === 'beta') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-[11px] font-medium text-sky-700">
        Beta
      </span>
    )
  }
  return null
}

function AppCard({ app, index }) {
  const soon = isComingSoon(app)
  const action = soon ? 'Learn more' : app.is_installed ? 'Manage' : 'Install'

  return (
    <Link
      href={`/administration/marketplace/app/${app.slug}/`}
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
      className={`group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 animate-portalRise portal-lift hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B3D26]/30 ${
        soon ? '' : 'hover:border-[#0B3D26]/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <AppIcon app={app} className={`transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${soon ? 'opacity-70' : ''}`} />
        <StatusBadge app={app} />
      </div>

      <h3 className="mt-4 font-semibold text-gray-900 group-hover:text-[#0B3D26] transition-colors">{app.name}</h3>
      <p className="mt-0.5 text-xs text-gray-400">
        {titleCase(app.category)}{app.version && ` · ${app.version}`}
      </p>
      <p className="mt-2.5 text-sm text-gray-600 leading-relaxed line-clamp-2">{app.description}</p>

      <div className="mt-auto pt-4 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {app.install_count > 0 && <>{app.install_count.toLocaleString()} installs</>}
        </span>
        <span className={`inline-flex items-center gap-0.5 text-xs font-medium transition-colors ${soon ? 'text-gray-400' : 'text-gray-500 group-hover:text-[#0B3D26]'}`}>
          {action}
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  )
}
