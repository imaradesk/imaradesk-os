import React from 'react'
import SidebarNav from './SidebarNav'
import TopBar from './TopBar'
import NetworkStatusModal from './NetworkStatusModal'

export default function AppShell({ active = 'tickets', children, topBarVariant = 'default' }) {
  return (
    <>
      <div className="min-h-screen bg-gray-100">
        <SidebarNav active={active} />
        <div className="flex flex-col ml-[60px] min-h-screen">
          <TopBar variant={topBarVariant} />
          {children}
        </div>
      </div>
      <NetworkStatusModal />
    </>
  )
}
