import React, { useState, useRef, useEffect } from 'react'

export default function Select({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select...",
  displayKey = "name",
  valueKey = "id",
  error = null,
  required = false,
  disabled = false,
  allowClear = true,
  searchable = false,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Find selected option
  const selectedOption = options.find(opt => opt[valueKey] === value)
  
  // Filter options based on search query (only if searchable)
  const filteredOptions = searchable ? options.filter(opt => {
    const displayValue = opt[displayKey]?.toString().toLowerCase() || ''
    const searchValue = searchQuery.toLowerCase()
    return displayValue.includes(searchValue)
  }) : options

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens (only if searchable)
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, searchable])

  const handleSelect = (option) => {
    onChange(option[valueKey])
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
    setSearchQuery('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left border rounded-md bg-white
          focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:border-transparent
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-[#4a154b]' : ''}
        `}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
            {selectedOption ? selectedOption[displayKey] : placeholder}
          </span>
          <div className="flex items-center gap-1">
            {/* Clear button */}
            {allowClear && value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 hover:bg-gray-200 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {/* Dropdown arrow */}
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
          {/* Search Input - Only show if searchable */}
          {searchable && (
            <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:border-transparent text-sm"
                />
                <svg 
                  className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto max-h-64">
            {filteredOptions.length > 0 ? (
              <ul className="py-1">
                {filteredOptions.map((option) => {
                  const isSelected = option[valueKey] === value
                  return (
                    <li key={option[valueKey]}>
                      <button
                        type="button"
                        onClick={() => handleSelect(option)}
                        className={`
                          w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors
                          ${isSelected ? 'bg-[#4a154b]/10 text-[#4a154b] font-medium' : 'text-gray-900'}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option[displayKey]}</span>
                          {isSelected && (
                            <svg className="w-4 h-4 text-[#4a154b]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        {/* Show secondary text if available (like email) */}
                        {option.email && (
                          <span className="block text-xs text-gray-500 mt-0.5">{option.email}</span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No results found</p>
                {searchQuery && (
                  <p className="text-xs mt-1">Try a different search term</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
