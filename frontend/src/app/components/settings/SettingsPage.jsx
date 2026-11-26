import React, { useEffect, useState } from 'react'
import { Head } from '@inertiajs/react'
import AppShell from '../AppShell'

/**
 * Shared shell for the Workspace settings pages (Account, Notifications,
 * Security): breadcrumb header, page intro and an optional
 * in-page section nav (sticky rail on desktop, scrollable chips on mobile).
 */
export default function SettingsPage({ group = 'Workspace', title, description, icon: Icon, actions, headerActions, sections, children }) {
  const [activeId, setActiveId] = useState(sections?.[0]?.id)

  useEffect(() => {
    if (!sections?.length) return
    const root = document.getElementById('settings-scroll')
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { root, rootMargin: '-80px 0px -60% 0px' },
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  const jump = (id) => {
    setActiveId(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <Head title={`${title} · Settings`} />
      <AppShell active="settings" fixedHeight>
        <main id="settings-scroll" className="flex-1 min-w-0 bg-gray-50 overflow-y-auto scroll-smooth">
          {actions && (
            <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-end gap-3">
                <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
              </div>
            </header>
          )}

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex items-start gap-4 mb-6 sm:mb-8">
              {Icon && (
                <span className="hidden sm:flex w-11 h-11 rounded-xl bg-[#0B3D26]/[0.07] text-[#0B3D26] items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
                {description && <p className="mt-1 text-sm text-gray-500 max-w-2xl">{description}</p>}
              </div>
              {headerActions && <div className="flex items-center gap-2 flex-shrink-0 self-center">{headerActions}</div>}
            </div>

            {sections?.length ? (
              <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
                {/* Mobile: horizontal chips */}
                <nav aria-label="Sections" className="lg:hidden -mx-4 px-4 mb-6 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => jump(s.id)}
                      className={`flex-shrink-0 h-8 px-3 rounded-full text-sm border transition-colors ${
                        activeId === s.id ? 'bg-[#0B3D26] border-[#0B3D26] text-white' : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </nav>
                {/* Desktop: sticky rail */}
                <nav aria-label="Sections" className="hidden lg:block sticky top-20 self-start">
                  <ul className="space-y-0.5 border-l border-gray-200">
                    {sections.map((s) => (
                      <li key={s.id}>
                        <button
                          onClick={() => jump(s.id)}
                          className={`-ml-px w-full text-left pl-4 py-1.5 text-sm border-l-2 transition-colors ${
                            activeId === s.id
                              ? 'border-[#0B3D26] text-[#0B3D26] font-medium'
                              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="space-y-6 min-w-0">{children}</div>
              </div>
            ) : (
              <div className="space-y-6">{children}</div>
            )}
          </div>
        </main>
      </AppShell>
    </>
  )
}

/** A titled card. `tone="danger"` gives it a red edge. */
export function SettingsSection({ id, title, description, action, tone, children, flush = false }) {
  const danger = tone === 'danger'
  return (
    <section id={id} className={`scroll-mt-20 bg-white rounded-xl border shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${danger ? 'border-red-200' : 'border-gray-200'}`}>
      {(title || action) && (
        <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-5 sm:px-6 py-4 border-b ${danger ? 'border-red-100' : 'border-gray-100'}`}>
          <div className="min-w-0">
            <h2 className={`text-[15px] font-semibold ${danger ? 'text-red-700' : 'text-gray-900'}`}>{title}</h2>
            {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
          </div>
          {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={flush ? '' : 'px-5 sm:px-6 py-5'}>{children}</div>
    </section>
  )
}

/** Label + description on the left, control on the right; stacks on mobile. */
export function SettingsRow({ title, description, children, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-4 ${className}`}>
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        {description && <div className="mt-0.5 text-sm text-gray-500">{description}</div>}
      </div>
      {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
    </div>
  )
}

export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B3D26]/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-[#0B3D26]' : 'bg-gray-200'
      }`}
    >
      <span className={`toggle-knob inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

const BADGE_TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  red: 'bg-red-50 text-red-700 ring-red-600/15',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  gray: 'bg-gray-100 text-gray-600 ring-gray-500/10',
  brand: 'bg-[#0B3D26]/[0.07] text-[#0B3D26] ring-[#0B3D26]/15',
}

export function Badge({ tone = 'gray', dot, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-xs font-medium ring-1 ring-inset ${BADGE_TONES[tone]}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export const btn = {
  primary: 'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-medium text-white bg-[#0B3D26] hover:bg-[#14502F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  secondary: 'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  danger: 'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  dangerOutline: 'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
}

/**
 * Breadcrumb + title used in the header bar of the individual settings pages.
 * `section` is the admin nav id (e.g. "team-users"); the group and parent page
 * are looked up from ADMIN_NAV so sub-pages link back to their list.
 */
export function SettingsHeading({ section, children }) {
  return (
    <div className="min-w-0">
      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 truncate flex items-center gap-2">{children}</h1>
    </div>
  )
}
