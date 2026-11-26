import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { Search, ChevronRight } from 'lucide-react'
import AppShell from '../components/AppShell'
import { ADMIN_NAV } from '../components/SettingsSidenav'
import { useInstalledModules } from '../context/InstalledModulesContext'

// Sub-menus (Team, Emails) become their own cards in the grid
const GROUPS = ADMIN_NAV.map((group) => ({
  label: group.label,
  items: group.items.flatMap((item) => item.children || [item]),
}))

function SettingCard({ item }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className="group flex items-start gap-3.5 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#0B3D26]/40"
    >
      <span className="w-10 h-10 flex-shrink-0 rounded-lg bg-[#0B3D26]/[0.07] text-[#0B3D26] flex items-center justify-center transition-colors group-hover:bg-[#0B3D26] group-hover:text-white">
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-sm font-medium text-gray-900">
          {item.label}
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
        </span>
        {item.description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">{item.description}</span>
        )}
      </span>
    </Link>
  )
}

export default function SettingsHome() {
  const [query, setQuery] = useState('')
  const searchRef = useRef(null)
  const { isModuleInstalled } = useInstalledModules()

  // Hide cards for modules that aren't installed (e.g. Knowledge base)
  const available = useMemo(() => GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.module || isModuleInstalled(i.module)) }))
    .filter((g) => g.items.length > 0), [isModuleInstalled])

  // "/" focuses the search from anywhere on the page
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Every word typed must appear in the setting's name, description, keywords or group
  const groups = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return available
    return available
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => {
          const haystack = `${i.label} ${i.description || ''} ${(i.keywords || []).join(' ')} ${g.label}`.toLowerCase()
          return words.every((w) => haystack.includes(w))
        }),
      }))
      .filter((g) => g.items.length > 0)
  }, [query, available])

  const resultCount = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <>
      <Head title="Settings" />
      <AppShell active="settings" fixedHeight>
        <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your workspace, channels, support desk and people.</p>
            </div>

            <form
              role="search"
              className="relative mb-8"
              onSubmit={(e) => {
                e.preventDefault()
                const first = groups[0]?.items[0]
                if (first) router.visit(first.href)
              }}
            >
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
                placeholder="Search settings, e.g. SLA, users, SMTP…"
                aria-label="Search settings"
                className="w-full h-11 pl-10 pr-16 text-sm rounded-xl border border-gray-200 bg-white shadow-sm placeholder-gray-400 focus:outline-none focus:border-[#0B3D26] focus:ring-4 focus:ring-[#0B3D26]/10"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center h-6 px-1.5 rounded border border-gray-200 bg-gray-50 text-[11px] text-gray-500 font-sans">
                /
              </kbd>
              {query.trim() && (
                <p className="mt-2 text-xs text-gray-500" aria-live="polite">
                  {resultCount} {resultCount === 1 ? 'result' : 'results'}
                  {resultCount > 0 && ' · press Enter to open the first one'}
                </p>
              )}
            </form>

            {groups.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-500">No settings match “{query}”.</p>
            ) : (
              <div className="space-y-8">
                {groups.map((group) => (
                  <section key={group.label} aria-labelledby={`settings-${group.label}`}>
                    <h2
                      id={`settings-${group.label}`}
                      className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400"
                    >
                      {group.label}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.items.map((item) => <SettingCard key={item.id} item={item} />)}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </main>
      </AppShell>
    </>
  )
}
