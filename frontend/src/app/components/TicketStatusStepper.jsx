import React from 'react'

const TicketStatusStepper = ({ currentStatus }) => {
  const statuses = [
    { id: 'new', label: 'New' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'pending', label: 'On Hold' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'closed', label: 'Closed' },
  ]

  const statusOrder = {
    new: 0,
    open: 0,
    in_progress: 1,
    pending: 2,
    resolved: 3,
    closed: 4,
  }

  const currentIndex = statusOrder[currentStatus] ?? 0

  return (
    <div className="w-full bg-white">
      <div className="flex w-full items-center overflow-hidden">
        {statuses.map((status, index) => {
          const isActive = index === currentIndex
          const isPast = index < currentIndex
          const isLast = index === statuses.length - 1

          return (
            <div key={status.id} className="flex-1">
              <div
                className={`
                  h-10 flex items-center justify-center text-sm font-medium
                  transition-all relative
                  ${isActive
                    ? 'bg-[#4a154b] text-white z-20'
                    : isPast
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-gray-100 text-gray-500'}
                `}
                style={{
                  clipPath: !isLast
                    ? 'polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%, 16px 50%)'
                    : 'none',
                  marginRight: !isLast ? '-16px' : 0,
                  borderRadius: isLast ? '6px' : '6px 0 0 6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {status.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TicketStatusStepper
