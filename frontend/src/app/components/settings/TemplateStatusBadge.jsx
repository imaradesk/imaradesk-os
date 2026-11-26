import React from 'react'

const STATUS_STYLES = {
  active: 'bg-green-50 text-green-700 ring-green-600/20',
  draft: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  archived: 'bg-gray-100 text-gray-600 ring-gray-500/20',
}

export default function TemplateStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLES[status] || STATUS_STYLES.archived}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}
