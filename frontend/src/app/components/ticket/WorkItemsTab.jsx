import React from 'react'
import Button from '../../../components/Button'

export default function WorkItemsTab({ 
  workItems = [],
  onAddWorkItem,
  onEditWorkItem,
  onCompleteWorkItem
}) {
  if (workItems.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="mt-2 text-sm text-gray-500 mb-5">No work items yet</p>
        <Button
          variant="primary"
          size="md"
          onClick={onAddWorkItem}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add your first work item
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button
          variant="primary"
          size="sm"
          onClick={onAddWorkItem}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Work Item
        </Button>
      </div>

      <div className="space-y-3">
        {workItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{item.title}</h4>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    item.status === 'done' ? 'bg-green-100 text-green-700' :
                    item.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    item.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.status_display || item.status}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    item.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    item.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    item.priority === 'low' ? 'bg-gray-100 text-gray-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {item.priority_display || item.priority}
                  </span>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                )}
                {item.work_notes && (
                  <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-xs font-medium text-green-800 mb-1">Completion Notes:</p>
                    <p className="text-sm text-green-700">{item.work_notes}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {item.assignee && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{item.assignee.name}</span>
                    </div>
                  )}
                  {item.due_date && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Due: {item.due_date}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Created: {item.created_at}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                {item.status !== 'done' && (
                  <button
                    onClick={() => onCompleteWorkItem(item)}
                    className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                  >
                    Mark Complete
                  </button>
                )}
                <button
                  onClick={() => onEditWorkItem(item)}
                  className="text-sm text-[#4a154b] hover:text-[#0a2d31] font-medium"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
