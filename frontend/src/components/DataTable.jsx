import React, { useState, useMemo, useEffect } from 'react'
import { Popover } from './Popover'
import NoDataFound from './NoDataFound'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  skeletonRows = 5,
  // Server-side pagination props (if provided, disables client-side)
  serverPagination = null,
  onPageChange = null,
  // Default settings
  defaultPageSize = 10,
  defaultSortKey = null,
  defaultSortDir = 'asc',
  // Row click
  onRowClick = null,
  rowClassName = '',
}) {
  const [sortKey, setSortKey] = useState(defaultSortKey)
  const [sortDir, setSortDir] = useState(defaultSortDir)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [currentPage, setCurrentPage] = useState(1)
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    // Hide columns marked as defaultHidden
    return columns.filter(c => c.defaultHidden).map(c => c.key)
  })
  // Reset page when data, pageSize, or sort changes
  useEffect(() => {
    if (!serverPagination) setCurrentPage(1)
  }, [data, pageSize, sortKey, sortDir])

  const visibleColumns = columns.filter(c => !hiddenColumns.includes(c.key))

  // Client-side sorting
  const sortedData = useMemo(() => {
    if (!sortKey || serverPagination) return data
    const col = columns.find(c => c.key === sortKey)
    if (!col || col.sortable === false) return data

    return [...data].sort((a, b) => {
      const sortFn = col.sortFn
      let aVal, bVal
      if (sortFn) {
        return sortDir === 'asc' ? sortFn(a, b) : sortFn(b, a)
      }
      aVal = col.accessor ? col.accessor(a) : a[col.key]
      bVal = col.accessor ? col.accessor(b) : b[col.key]
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [data, sortKey, sortDir, columns, serverPagination])

  // Client-side pagination
  const isServerPaginated = !!serverPagination
  const totalItems = isServerPaginated ? (serverPagination.count || 0) : sortedData.length
  const totalPages = isServerPaginated
    ? (serverPagination.pages || 1)
    : Math.max(1, Math.ceil(sortedData.length / pageSize))
  const activePage = isServerPaginated ? (serverPagination.page || 1) : currentPage

  const paginatedData = useMemo(() => {
    if (isServerPaginated) return sortedData
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize, isServerPaginated])

  const handleSort = (col) => {
    if (col.sortable === false) return
    if (sortKey === col.key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(col.key)
      setSortDir('asc')
    }
  }

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return
    if (isServerPaginated && onPageChange) {
      onPageChange(page, pageSize)
    } else {
      setCurrentPage(page)
    }
  }

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize)
    if (isServerPaginated && onPageChange) {
      onPageChange(1, newSize)
    } else {
      setCurrentPage(1)
    }
  }

  const toggleColumn = (key) => {
    setHiddenColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const renderPageNumbers = () => {
    const pages = []
    for (let i = 1; i <= totalPages; i++) {
      const isNear = Math.abs(i - activePage) <= 2
      const isEdge = i === 1 || i === totalPages
      if (!isNear && !isEdge) {
        if (i === 2 || i === totalPages - 1) {
          pages.push(<span key={`e-${i}`} className="min-w-[32px] h-8 border-y border-r border-gray-300 inline-flex items-center justify-center text-gray-400 select-none text-sm">…</span>)
        }
        continue
      }
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`min-w-[32px] h-8 border-y border-r border-gray-300 text-sm font-medium transition-colors ${
            i === activePage
              ? 'bg-[#4a154b] text-white border-[#4a154b]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {i}
        </button>
      )
    }
    return pages
  }

  // Start/end item numbers for display
  const startItem = totalItems === 0 ? 0 : (activePage - 1) * pageSize + 1
  const endItem = Math.min(activePage * pageSize, totalItems)

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-gray-500">
          {loading ? 'Loading…' : `${totalItems} result${totalItems === 1 ? '' : 's'}`}
        </div>
        <div className="flex items-center gap-2">
          {/* Column visibility toggle */}
          <Popover
            width={220}
            maxHeight={320}
            showArrow={true}
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Toggle columns"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                <span className="hidden sm:inline">Columns</span>
              </button>
            )}
          >
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                Toggle Columns
              </div>
              {columns.filter(c => c.hideable !== false).map(col => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenColumns.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded border-gray-300 text-[#4a154b] focus:ring-[#4a154b]"
                  />
                  <span className="text-sm text-gray-700">{col.header}</span>
                </label>
              ))}
            </div>
          </Popover>
        </div>
      </div>

      {/* Table wrapper — horizontal scroll on small screens */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {visibleColumns.map(col => {
                const isSortable = col.sortable !== false
                const isSorted = sortKey === col.key
                return (
                  <th
                    key={col.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none ${
                      isSortable ? 'cursor-pointer hover:text-gray-700 hover:bg-gray-100 transition-colors' : ''
                    } ${col.headerClassName || ''}`}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => isSortable && handleSort(col)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {isSortable && (
                        <span className={`inline-flex flex-col leading-none ${isSorted ? 'text-[#4a154b]' : 'text-gray-300'}`}>
                          <svg className={`w-3 h-3 ${isSorted && sortDir === 'asc' ? 'text-[#4a154b]' : ''}`} viewBox="0 0 12 12" fill="currentColor">
                            <path d="M6 2L10 7H2L6 2Z" />
                          </svg>
                          <svg className={`w-3 h-3 -mt-0.5 ${isSorted && sortDir === 'desc' ? 'text-[#4a154b]' : ''}`} viewBox="0 0 12 12" fill="currentColor">
                            <path d="M6 10L2 5H10L6 10Z" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              [...Array(skeletonRows)].map((_, i) => (
                <tr key={`sk-${i}`}>
                  {visibleColumns.map(col => (
                    <td key={col.key} className="px-6 py-4">
                      {col.skeleton ? col.skeleton() : (
                        <div className="h-5 bg-gray-200 rounded animate-pulse" style={{ width: col.skeletonWidth || '60%' }} />
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length}>
                  <NoDataFound />
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${
                    typeof rowClassName === 'function' ? rowClassName(row) : rowClassName
                  }`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {visibleColumns.map(col => (
                    <td key={col.key} className={`px-6 py-4 text-sm ${col.cellClassName || ''}`}>
                      {col.render ? col.render(row, idx) : (col.accessor ? col.accessor(row) : row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: pagination + page size */}
      {!loading && totalItems > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Page size selector + info */}
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline">Show</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-gray-300"
              >
                {PAGE_SIZE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <span className="hidden sm:inline">per page</span>
            </div>
            <span className="text-gray-400">|</span>
            <span>{startItem}–{endItem} of {totalItems}</span>
          </div>

          {/* Page navigation — always show */}
          <div className="inline-flex items-center">
            <button
              onClick={() => handlePageChange(activePage - 1)}
              disabled={activePage <= 1}
              className="px-2.5 h-8 border border-gray-300 rounded-l-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {renderPageNumbers()}
            <button
              onClick={() => handlePageChange(activePage + 1)}
              disabled={activePage >= totalPages}
              className="px-2.5 h-8 border-y border-r border-gray-300 rounded-r-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
