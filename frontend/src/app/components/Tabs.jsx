import React from 'react'
import { Link } from '@inertiajs/react'

/**
 * Segmented pill tabs: a soft tinted track with a raised white pill for the active tab.
 * tabs: [{ id, label, icon, count, href, disabled, title, flag }]
 * - icon: a component (e.g. lucide), an element, or a string such as an emoji
 * - href: renders the tab as an Inertia link instead of a button (onChange is optional then)
 * - flag: shows an amber dot; a string becomes its accessible label
 */
export default function Tabs({ tabs, active, onChange, compact = false, label, className = '' }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-gray-100/80 p-1 ring-1 ring-inset ring-gray-200/70 tabbar-track ${className}`}
    >
      {tabs.map(({ id, icon, label: text, count, href, disabled, title, flag }) => {
        const isActive = active === id
        const tabClass = `relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
          compact ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm'
        } ${
          isActive
            ? 'bg-white text-[#0B3D26] shadow-sm ring-1 ring-black/5 tabbar-active'
            : 'text-gray-500 hover:bg-white/60 hover:text-gray-900 tabbar-idle'
        }`
        const content = (
          <>
            <TabIcon icon={icon} className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${isActive ? 'text-[#0B3D26] tabbar-accent' : 'text-gray-400'}`} />
            {text}
            {count != null && (
              <span
                className={`min-w-[1.25rem] rounded-full px-1.5 text-center text-[11px] leading-5 tabular-nums transition-colors ${
                  isActive ? 'bg-[#0B3D26]/10 text-[#0B3D26] tabbar-accent tabbar-badge-active' : 'bg-gray-200/70 text-gray-500 tabbar-badge'
                }`}
              >
                {count}
              </span>
            )}
            {flag && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-label={typeof flag === 'string' ? flag : 'Needs attention'} />
            )}
          </>
        )

        if (href && !disabled) {
          return (
            <Link
              key={id}
              href={href}
              preserveScroll
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              title={title}
              onClick={onChange ? () => onChange(id) : undefined}
              className={tabClass}
            >
              {content}
            </Link>
          )
        }

        return (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={isActive}
            disabled={disabled}
            title={title}
            onClick={() => onChange?.(id)}
            className={tabClass}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}

function TabIcon({ icon, className }) {
  if (!icon) return null
  if (typeof icon === 'string' || React.isValidElement(icon)) {
    return <span className={`inline-flex items-center justify-center leading-none ${className}`}>{icon}</span>
  }
  const Icon = icon
  return <Icon className={className} />
}
