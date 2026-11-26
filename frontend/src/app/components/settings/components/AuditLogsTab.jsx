import React from 'react'
import { useTimezone } from '../../../context/TimezoneContext'
import DataTable from '../../../../components/DataTable'

export default function AuditLogsTab({ 
  logs = [], 
  loading = false, 
  pagination = null,
  onPageChange 
}) {
  const { formatDate } = useTimezone()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        {pagination && (
          <span className="text-sm text-gray-500">
            {pagination.totalItems} total entries
          </span>
        )}
      </div>
      <DataTable
        data={logs}
        loading={loading}
        columns={[
          {
            key: 'actionDisplay',
            label: 'Action',
            render: (row) => (
              <span className="font-medium text-gray-900">{row.actionDisplay}</span>
            ),
          },
          {
            key: 'browser',
            label: 'Device / Browser',
            render: (row) => (
              <div className="flex flex-col">
                <span>{row.browser || 'Unknown'}</span>
                <span className="text-xs text-gray-400">{row.os || ''}</span>
              </div>
            ),
          },
          {
            key: 'createdAt',
            label: 'Timestamp',
            render: (row) => (
              <span className="text-gray-500">
                {row.createdAt ? formatDate(row.createdAt) : '-'}
              </span>
            ),
          },
          {
            key: 'ipAddress',
            label: 'IP Address',
            render: (row) => (
              <span className="text-gray-500 font-mono text-xs">
                {row.ipAddress || '-'}
              </span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                row.status === 'success'
                  ? 'bg-green-100 text-green-800'
                  : row.status === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {row.status === 'success' ? 'Success' : row.status === 'failed' ? 'Failed' : 'Warning'}
              </span>
            ),
          },
        ]}
        serverPagination={pagination ? {
          page: pagination.page,
          pages: pagination.totalPages,
          count: pagination.totalItems,
        } : null}
        onPageChange={(page, pageSize) => onPageChange(page)}
      />
    </div>
  )
}
