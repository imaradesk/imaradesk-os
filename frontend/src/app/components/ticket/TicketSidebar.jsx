import React, { useState } from 'react'
import Select from '../SearchableSelect'

const priorityColors = {
  low: 'text-gray-600',
  normal: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
}

export default function TicketSidebar({ 
  ticket, 
  users = [], 
  groups = [], 
  attachments = [],
  onFieldUpdate,
  onViewAttachments
}) {
  const [editingField, setEditingField] = useState(null)

  const handleUpdate = (field, value) => {
    onFieldUpdate(field, value)
    setEditingField(null)
  }

  return (
    <aside className="lg:col-span-1 space-y-4">
      {/* Description */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket?.description}</p>
      </div>

      {/* Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Created:</dt>
            <dd className="text-gray-900 font-medium">{ticket?.created_at}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Updated:</dt>
            <dd className="text-gray-900 font-medium">{ticket?.updated_at}</dd>
          </div>

          {/* Assignee */}
          <div>
            <dt className="text-gray-600 mb-1">Assignee:</dt>
            {editingField === 'assignee' ? (
              <Select
                value={ticket?.assignee?.id || ''}
                onChange={(value) => handleUpdate('assignee', value || null)}
                options={users}
                placeholder="Unassigned"
                displayKey="name"
                valueKey="id"
                searchable={true}
                className="text-sm"
              />
            ) : (
              <dd
                onClick={() => setEditingField('assignee')}
                className="text-gray-900 font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
              >
                {ticket?.assignee?.name || 'Unassigned'}
              </dd>
            )}
          </div>

          {/* Assignment Group */}
          <div>
            <dt className="text-gray-600 mb-1">Assignment Group:</dt>
            {editingField === 'group' ? (
              <Select
                value={ticket?.group?.id || ''}
                onChange={(value) => handleUpdate('group', value || null)}
                options={groups.map(g => ({ ...g, name: `👥 ${g.name}` }))}
                placeholder="None"
                displayKey="name"
                valueKey="id"
                searchable={true}
                className="text-sm"
              />
            ) : (
              <dd
                onClick={() => setEditingField('group')}
                className="text-gray-900 font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
              >
                {ticket?.group ? `👥 ${ticket.group.name}` : 'None'}
              </dd>
            )}
          </div>

          {/* Type */}
          <div>
            <dt className="text-gray-600 mb-1">Type:</dt>
            {editingField === 'type' ? (
              <Select
                value={ticket?.type || 'question'}
                onChange={(value) => handleUpdate('type', value)}
                options={[
                  { id: 'question', name: 'Question' },
                  { id: 'incident', name: 'Incident' },
                  { id: 'problem', name: 'Problem' },
                  { id: 'task', name: 'Task' },
                ]}
                placeholder="Select type"
                displayKey="name"
                valueKey="id"
                className="text-sm"
              />
            ) : (
              <dd
                onClick={() => setEditingField('type')}
                className="text-gray-900 font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
              >
                {ticket?.type_display || 'Question'}
              </dd>
            )}
          </div>

          {/* Priority */}
          <div>
            <dt className="text-gray-600 mb-1">Priority:</dt>
            {editingField === 'priority' ? (
              <Select
                value={ticket?.priority || 'normal'}
                onChange={(value) => handleUpdate('priority', value)}
                options={[
                  { id: 'low', name: 'Low' },
                  { id: 'normal', name: 'Normal' },
                  { id: 'high', name: 'High' },
                  { id: 'urgent', name: 'Urgent' },
                ]}
                placeholder="Select priority"
                displayKey="name"
                valueKey="id"
                className="text-sm"
              />
            ) : (
              <dd
                onClick={() => setEditingField('priority')}
                className={`font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded ${priorityColors[ticket?.priority] || ''}`}
              >
                {ticket?.priority_display || 'Normal'}
              </dd>
            )}
          </div>

          {/* Watchers */}
          <div>
            <dt className="text-gray-600 mb-1">Watchers:</dt>
            {editingField === 'watchers' ? (
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                {users.map(user => (
                  <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      defaultChecked={ticket?.watchers?.some(w => w.id === user.id)}
                      onChange={(e) => {
                        const currentWatchers = ticket?.watchers?.map(w => w.id) || []
                        let newWatchers
                        if (e.target.checked) {
                          newWatchers = [...currentWatchers, user.id]
                        } else {
                          newWatchers = currentWatchers.filter(id => id !== user.id)
                        }
                        onFieldUpdate('watchers', newWatchers)
                      }}
                      className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                    />
                    <span className="text-sm text-gray-900">{user.name}</span>
                  </label>
                ))}
                <button
                  onClick={() => setEditingField(null)}
                  className="mt-2 text-xs text-gray-600 hover:text-gray-900 w-full text-left"
                >
                  Done
                </button>
              </div>
            ) : (
              <dd
                onClick={() => setEditingField('watchers')}
                className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
              >
                {ticket?.watchers && ticket.watchers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {ticket.watchers.map((w, i) => (
                      <span key={i} className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        {w.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">Click to add watchers</span>
                )}
              </dd>
            )}
          </div>

          {/* Tags */}
          <div>
            <dt className="text-gray-600 mb-1">Tags:</dt>
            {editingField === 'tags' ? (
              <input
                type="text"
                autoFocus
                defaultValue={ticket?.tags?.join(', ') || ''}
                onBlur={(e) => {
                  const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  handleUpdate('tags', tags)
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.target.blur()
                  }
                }}
                placeholder="Enter tags, separated by commas"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#4a154b]"
              />
            ) : (
              <dd
                onClick={() => setEditingField('tags')}
                className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
              >
                {ticket?.tags && ticket.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {ticket.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">Click to add tags</span>
                )}
              </dd>
            )}
          </div>
        </dl>
      </div>

      {/* Attachments Summary */}
      {attachments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Attachments ({attachments.length})</h3>
          <div className="space-y-2">
            {attachments.slice(0, 3).map(att => (
              <a
                key={att.id}
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-sm"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="flex-1 truncate text-gray-700">{att.file_name}</span>
              </a>
            ))}
            {attachments.length > 3 && (
              <button
                onClick={onViewAttachments}
                className="text-sm text-[#4a154b] hover:underline"
              >
                View all {attachments.length} attachments
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
