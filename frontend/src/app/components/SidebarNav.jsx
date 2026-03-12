import React, { useState, useRef } from 'react'
import { Link, router } from '@inertiajs/react'
import { 
  Home, 
  Ticket, 
  BookOpen, 
  BarChart3, 
  Settings,
  LogOut,
  HelpCircle
} from 'lucide-react'
import Modal, { ModalBody, ModalFooter } from './Modal'

const iconClass = "w-6 h-6"

const icons = {
  home: <Home className={iconClass} />,
  tickets: <Ticket className={iconClass} />,
  knowledgebase: <BookOpen className={iconClass} />,
  chart: <BarChart3 className={iconClass} />,
  settings: <Settings className={iconClass} />,
}

// Tooltip component for sidebar items
function SidebarTooltip({ children, label }) {
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState({ top: 0 })
  const triggerRef = useRef(null)

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({ top: rect.top + rect.height / 2 })
    }
    setShow(true)
  }

  return (
    <div 
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div 
          className="fixed left-[72px] px-3 py-1.5 bg-[#4a154b] text-white text-sm font-medium rounded-md whitespace-nowrap shadow-lg z-[60] animate-tooltip-fade"
          style={{ top: position.top, transform: 'translateY(-50%)' }}
        >
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-[#4a154b]" />
        </div>
      )}
      <style>{`
        @keyframes tooltipFade {
          from {
            opacity: 0;
            transform: translateY(-50%) translateX(4px);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
          }
        }
        .animate-tooltip-fade {
          animation: tooltipFade 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default function SidebarNav({ active = 'people' }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  
  const items = [
    { key: 'home', href: '/dashboard/', title: 'Home' },
    { key: 'tickets', href: '/tickets', title: 'Tickets' },
    { key: 'knowledgebase', href: '/knowledgebase', title: 'Knowledge Base' },
    { key: 'chart', href: '/reports', title: 'Reports' },
    { key: 'settings', href: '/settings', title: 'Settings' },
  ]

  const handleLogout = () => {
    router.post('/logout/', {}, {
      headers: {
        'X-CSRFToken': window.csrfToken,
      },
    })
  }
  
  return (
    <>
      <div className="w-[60px] bg-[#4a154b] text-gray-300 flex flex-col items-center py-3 fixed left-0 top-0 h-screen z-40">
        <div className="flex-1 flex flex-col space-y-4 overflow-y-auto">
          {items.map((i) => (
            <SidebarTooltip key={i.key} label={i.title}>
              <Link
                href={i.href}
                className={`w-10 h-10 flex items-center justify-center rounded relative ${
                  active === i.key ? 'bg-[#6e3770] text-white' : 'hover:bg-[#5a235c] hover:text-white'
                }`}
              >
                <span className="sr-only">{i.title}</span>
                {icons[i.key]}
                {i.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {i.badge > 99 ? '99+' : i.badge}
                  </span>
                )}
              </Link>
            </SidebarTooltip>
          ))}
        </div>
        
        {/* Logout button at bottom */}
        <SidebarTooltip label="Logout">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-10 h-10 flex items-center justify-center rounded hover:bg-[#5a235c] hover:text-white mt-auto"
          >
            <span className="sr-only">Logout</span>
            <LogOut className={iconClass} />
          </button>
        </SidebarTooltip>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Logout"
        maxWidth="max-w-md"
      >
        <ModalBody>
          <div className="flex justify-center mb-4">
            <HelpCircle className="w-24 h-24 text-[#4a154b]" />
          </div>
          <p className="text-gray-600 text-center">Are you sure you want to log out?</p>
        </ModalBody>
        <ModalFooter className="justify-end">
          <button
            onClick={() => setShowLogoutModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </ModalFooter>
      </Modal>
    </>
  )
}
