// import React from 'react'
// import { Link, router } from '@inertiajs/react'
// import { 
//   Home, 
//   Ticket, 
//   ClipboardCheck, 
//   BookOpen, 
//   Bot, 
//   Users, 
//   Building2, 
//   BarChart3, 
//   Settings,
//   LogOut
// } from 'lucide-react'

// const iconClass = "w-6 h-6"

// const icons = {
//   home: <Home className={iconClass} />,
//   tickets: <Ticket className={iconClass} />,
//   tasks: <ClipboardCheck className={iconClass} />,
//   knowledgebase: <BookOpen className={iconClass} />,
//   ai: <Bot className={iconClass} />,
//   people: <Users className={iconClass} />,
//   building: <Building2 className={iconClass} />,
//   chart: <BarChart3 className={iconClass} />,
//   settings: <Settings className={iconClass} />,
// }

// export default function SidebarNav({ active = 'people' }) {
//   const items = [
//     { key: 'home', href: '/dashboard/', title: 'Home' },
//     { key: 'tickets', href: '/tickets', title: 'Tickets' },
//     { key: 'tasks', href: '/tasks', title: 'Tasks' },
//     { key: 'knowledgebase', href: '/knowledgebase', title: 'Knowledge Base' },
//     { key: 'ai', href: '/ai', title: 'AI Assistant' },
//     { key: 'people', href: '/people', title: 'People' },
//     { key: 'building', href: '/organizations', title: 'Organizations' },
//     { key: 'chart', href: '/reports', title: 'Reports' },
//     // { key: 'kali', href: '/reports', title: 'Reports' },
//     { key: 'settings', href: '/settings', title: 'Settings' },
//   ]
  
//   return (
//     <div className="w-[60px] bg-[#4a154b] text-gray-300 flex flex-col items-center py-3">
//       <div className="flex-1 flex flex-col space-y-4">
//         {items.map((i) => (
//           <Link
//             key={i.key}
//             href={i.href}
//             title={i.title}
//             className={`w-10 h-10 flex items-center justify-center rounded relative ${
//               active === i.key ? 'bg-[#6e3770] text-white' : 'hover:bg-[#5a235c] hover:text-white'
//             }`}
//           >
//             <span className="sr-only">{i.title}</span>
//             {icons[i.key]}
//             {i.badge > 0 && (
//               <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
//                 {i.badge > 99 ? '99+' : i.badge}
//               </span>
//             )}
//           </Link>
//         ))}
//       </div>
      
//       {/* Logout button at bottom */}
//       <button
//         onClick={() => {
//           router.post('/logout/', {}, {
//             headers: {
//               'X-CSRFToken': window.csrfToken,
//             },
//           })
//         }}
//         title="Logout"
//         className="w-10 h-10 flex items-center justify-center rounded hover:bg-[#5a235c] hover:text-white mt-auto"
//       >
//         <span className="sr-only">Logout</span>
//         <LogOut className={iconClass} />
//       </button>
//     </div>
//   )
// }
