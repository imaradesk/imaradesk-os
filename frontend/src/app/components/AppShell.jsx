import React from 'react'
import SidebarNav from './SidebarNav'
import MobileBottomNav from './MobileBottomNav'
import TopBar, { Breadcrumbs } from './TopBar'
import NetworkStatusModal from './NetworkStatusModal'
import { ThemeProvider, useTheme } from './ThemeContext'

/**
 * App frame: icon rail (bottom nav on small screens) + top bar + page content.
 *
 * `fixedHeight` locks the frame to the viewport so the page itself never
 * scrolls. Pages that use it (e.g. administration) render a fixed sidenav and
 * put their own scroll container on <main>. The top bar height is
 * accounted for automatically because the content area is a flex child.
 */
export default function AppShell({ active = 'tickets', children, topBarVariant = 'default', fixedHeight = false }) {
  return (
    <ThemeProvider>
      <AppShellContent active={active} topBarVariant={topBarVariant} fixedHeight={fixedHeight}>
        {children}
      </AppShellContent>
    </ThemeProvider>
  )
}

function AppShellContent({ active, children, topBarVariant = 'default', fixedHeight = false }) {
  const { theme, isDark, toggleTheme } = useTheme()
  return (
    <>
      <div className={`${fixedHeight ? 'h-screen max-md:h-dvh overflow-hidden' : 'min-h-screen'} ${isDark ? 'bg-[#0c0f12]' : 'bg-white'}`}>
        <SidebarNav active={active} theme={theme} />
        {/* Below md the rail is replaced by MobileBottomNav; pad the frame so content clears it */}
        <div className={`flex flex-col md:ml-[60px] pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 ${fixedHeight ? 'h-screen max-md:h-dvh' : 'min-h-screen'}`}>
          <TopBar variant={topBarVariant} theme={theme} onToggleTheme={toggleTheme} />
          <div className="flex-1 min-h-0 flex">
            <div className={`flex-1 min-w-0 flex flex-col rounded-t-2xl overflow-hidden ${
              isDark ? 'app-dark bg-[#15181c] border-t border-l border-r border-white/10' : 'app-light bg-gray-50 border-t border-l border-gray-200'
            }`}>
              <Breadcrumbs dark={isDark} />
              {children}
            </div>
          </div>
        </div>
        <MobileBottomNav active={active} theme={theme} />
      </div>
      <NetworkStatusModal />
    </>
  )
}
