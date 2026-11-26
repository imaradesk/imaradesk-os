import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import {
  Activity, BookOpen, LifeBuoy, Menu, Moon, Plus, Search, Sun, X,
} from 'lucide-react'
import { ThemeProvider, useTheme } from '../ThemeContext'

// Shared chrome for every customer-facing portal page.
// Keeps the public portal visually aligned with the internal ticket screens:
// white surfaces, hairline borders, brand purple for primary actions. The root
// carries .app-light/.app-dark so pages pick up the same palette remap as the app.

const NAV_LINKS = [
  { href: '/portal/', label: 'Home', icon: LifeBuoy },
  { href: '/portal/kb/', label: 'Knowledge Base', icon: BookOpen },
  { href: '/portal/track-ticket/', label: 'Track Ticket', icon: Search },
  { href: '/portal/system-status/', label: 'System Status', icon: Activity },
]

// The shell remounts on every Inertia visit, so remember where the nav pill
// was and slide it from there to the new active link.
let lastPill = null

const isActive = (href, path) => (href === '/portal/' ? path === '/portal/' : path.startsWith(href.replace(/\/$/, '')))

function Brand({ name, compact = false }) {
  const label = name || 'Customer Portal'
  const initial = label.trim().charAt(0).toUpperCase()
  return (
    <Link href="/portal/" className="flex items-center gap-2.5 min-w-0 group">
      <span className="w-8 h-8 rounded-lg bg-[#0B3D26] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 shadow-sm transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105">
        {initial}
      </span>
      {!compact && (
        <span className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#0B3D26] transition-colors">
          {label}
        </span>
      )}
    </Link>
  )
}

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className="relative w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors overflow-hidden"
    >
      {/* key forces a remount so the icon animates in on every toggle */}
      <span key={isDark ? 'sun' : 'moon'} className="animate-portalSpinIn">
        {isDark ? <Sun className="w-[18px] h-[18px]" strokeWidth={1.75} /> : <Moon className="w-[18px] h-[18px]" strokeWidth={1.75} />}
      </span>
    </button>
  )
}

/** Desktop nav with a pill that slides to the active link */
function PortalNav({ path }) {
  const navRef = useRef(null)
  const [pill, setPill] = useState(lastPill)

  useLayoutEffect(() => {
    const measure = () => {
      const active = navRef.current?.querySelector('[data-active="true"]')
      lastPill = active ? { left: active.offsetLeft, width: active.offsetWidth } : null
      setPill(lastPill)
    }
    // Paint once at the previous position, then move so the transition runs
    const frame = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
    }
  }, [path])

  return (
    <nav ref={navRef} className="relative hidden md:flex items-center gap-1 ml-2" aria-label="Portal">
      {pill && (
        <span
          aria-hidden="true"
          className="absolute top-0 h-8 rounded-md bg-[#0B3D26]/10 transition-all duration-300 ease-smooth"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {NAV_LINKS.map(({ href, label }) => {
        const active = isActive(href, path)
        return (
          <Link
            key={href}
            href={href}
            data-active={active}
            aria-current={active ? 'page' : undefined}
            className={`relative h-8 px-3 inline-flex items-center rounded-md text-sm transition-colors ${
              active ? 'text-[#0B3D26] font-medium' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function PortalFrame({ tenantName, children, maxWidth }) {
  const { url, props } = usePage()
  const { isDark } = useTheme()
  const path = (url || '/portal/').split('?')[0]
  const user = props.auth?.user
  const name = tenantName || props.portal_settings?.tenant_name || props.portal_settings?.portal_title || 'Customer Portal'
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [path])

  return (
    <div className={`portal-root min-h-screen text-gray-900 flex flex-col transition-colors duration-300 ${isDark ? 'app-dark' : 'app-light'}`}>
      <header className={`portal-header sticky top-0 z-40 backdrop-blur-md border-b border-gray-200 transition-shadow duration-300 ${scrolled ? 'portal-header--scrolled' : ''}`}>
        <div className={`${maxWidth} mx-auto px-4 sm:px-6 h-14 flex items-center gap-6`}>
          <Brand name={name} />
          <PortalNav path={path} />

          <div className="ml-auto flex items-center gap-1.5">
            {user && (
              <Link
                href="/portal/#my-cases"
                className="hidden sm:inline-flex h-8 px-3 items-center rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                My tickets
              </Link>
            )}
            <ThemeToggle />
            <Link
              href="/portal/create-ticket/"
              className="hidden sm:inline-flex h-8 px-3 ml-1 items-center gap-1.5 rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white text-sm font-medium shadow-sm hover:shadow transition-all active:scale-[0.97]"
            >
              <Plus className="w-4 h-4" /> New ticket
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
            >
              <span key={menuOpen ? 'x' : 'menu'} className="animate-portalSpinIn">
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile menu: grid-rows trick animates height without measuring */}
        <div className={`md:hidden grid transition-[grid-template-rows] duration-300 ease-smooth ${menuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="border-t border-gray-200 px-4 py-2">
              {NAV_LINKS.map(({ href, label, icon: Icon }, i) => (
                <Link
                  key={href}
                  href={href}
                  style={menuOpen ? { animationDelay: `${i * 40}ms` } : undefined}
                  className={`${menuOpen ? 'animate-portalRise' : ''} flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-sm ${
                    isActive(href, path) ? 'bg-[#0B3D26]/10 text-[#0B3D26] font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 text-gray-400" /> {label}
                </Link>
              ))}
              <Link
                href="/portal/create-ticket/"
                className="mt-2 mb-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-[#0B3D26] text-white text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> New ticket
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 animate-portalRise">{children}</main>

      <footer className="border-t border-gray-200 bg-white mt-16">
        <div className={`${maxWidth} mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <Brand name={name} compact />
            <div>
              <p className="text-sm font-medium text-gray-900">{name}</p>
              <p className="text-xs text-gray-500">Customer support portal</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
            <Link href="/portal/kb/" className="hover:text-gray-900 transition-colors">Knowledge Base</Link>
            <Link href="/portal/track-ticket/" className="hover:text-gray-900 transition-colors">Track Ticket</Link>
            <Link href="/portal/system-status/" className="hover:text-gray-900 transition-colors">System Status</Link>
            <Link href="/portal/create-ticket/" className="hover:text-gray-900 transition-colors">New Ticket</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function PortalShell({ tenantName, children, maxWidth = 'max-w-6xl' }) {
  return (
    <ThemeProvider storageKey="imaradesk-portal-theme" fallback="system">
      <PortalFrame tenantName={tenantName} maxWidth={maxWidth}>{children}</PortalFrame>
    </ThemeProvider>
  )
}
