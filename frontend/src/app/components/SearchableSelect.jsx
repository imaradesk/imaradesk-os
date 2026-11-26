import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronsUpDown, Plus, Search, X } from 'lucide-react'
import { FLOATING_LAYER_ATTR } from '../../utils/floatingLayer'

const GAP = 6
const EDGE = 8
const ROW_HEIGHT = 36
const ROW_HEIGHT_WITH_EMAIL = 48
const SEARCH_HEIGHT = 45
const MAX_LIST_HEIGHT = 320
const MIN_WIDTH = 200
const MOBILE_QUERY = '(max-width: 639px)'

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia(MOBILE_QUERY).matches

const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500']

/** Initials avatar for people-like options (anything with an email). */
function OptionAvatar({ name = '' }) {
  const parts = name.trim().split(/\s+/)
  const letters = (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase() || '?'
  const color = AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
  return (
    <span className={`w-6 h-6 rounded-full ${color} text-white text-[10px] font-semibold inline-flex items-center justify-center flex-shrink-0`} aria-hidden="true">
      {letters}
    </span>
  )
}

/** Bold the part of `text` that matches the search query. */
function Highlight({ text, query }) {
  const value = text?.toString() ?? ''
  if (!query) return value
  const index = value.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return value
  return (
    <>
      {value.slice(0, index)}
      <mark className="bg-transparent text-inherit font-semibold underline decoration-[#0B3D26]/40 decoration-2 underline-offset-2">{value.slice(index, index + query.length)}</mark>
      {value.slice(index + query.length)}
    </>
  )
}

/**
 * Shared select. The dropdown is rendered in a portal with fixed positioning,
 * so parents with overflow hidden/auto (modals, drawers, popovers, boards)
 * can't clip it. It opens above the field when there is more room there and
 * becomes a bottom sheet on phones.
 */
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
  buttonClassName = "",
  optionIcon = null, // (option) => node, shown before the label in the list and on the button
  footerAction = null, // { label, icon?, onClick }: pinned action under the list, e.g. "Add type"
  compact = false, // h-8 field for filter bars
  ariaLabel = undefined,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [position, setPosition] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isDarkScope, setIsDarkScope] = useState(false)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)
  const listRef = useRef(null)
  const searchInputRef = useRef(null)

  const selectedOption = options.find(opt => opt[valueKey] === value)
  const custom = !!buttonClassName
  const hasEmails = options.some(opt => opt.email)

  // Search matches the label and, for people, their email
  const query = searchQuery.trim()
  const filteredOptions = searchable && query ? options.filter(opt => {
    const q = query.toLowerCase()
    return (opt[displayKey]?.toString().toLowerCase() || '').includes(q) || (opt.email?.toLowerCase() || '').includes(q)
  }) : options

  const close = useCallback(() => {
    setIsOpen(false)
    setSearchQuery('')
    setActiveIndex(-1)
    setPosition(null)
  }, [])

  const open = () => {
    if (disabled) return
    // The portal leaves the themed subtree, so carry the dark scope along
    setIsDarkScope(!!containerRef.current?.closest('.app-dark'))
    setIsMobile(isMobileViewport())
    setIsOpen(true)
  }

  // Place the dropdown below the field, or above it when there is more room there
  const reposition = useCallback(() => {
    if (!buttonRef.current) return
    const r = buttonRef.current.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth
    const searchHeight = searchable ? SEARCH_HEIGHT : 0
    const row = hasEmails ? ROW_HEIGHT_WITH_EMAIL : ROW_HEIGHT
    const spaceBelow = vh - r.bottom - GAP - EDGE
    const spaceAbove = r.top - GAP - EDGE
    const footerHeight = footerAction ? 41 : 0
    const wanted = Math.min(MAX_LIST_HEIGHT + searchHeight + footerHeight, row * Math.max(filteredOptions.length, 2) + searchHeight + footerHeight + 8)
    const placeAbove = spaceBelow < wanted && spaceAbove > spaceBelow
    const available = placeAbove ? spaceAbove : spaceBelow
    const width = Math.min(Math.max(r.width, MIN_WIDTH), vw - EDGE * 2)
    const left = Math.max(EDGE, Math.min(r.left, vw - width - EDGE))

    setPosition({
      left,
      width,
      placeAbove,
      top: placeAbove ? undefined : r.bottom + GAP,
      bottom: placeAbove ? vh - r.top + GAP : undefined,
      listMaxHeight: Math.max(120, Math.min(MAX_LIST_HEIGHT, available - searchHeight - footerHeight)),
    })
  }, [searchable, hasEmails, filteredOptions.length, footerAction])

  useLayoutEffect(() => {
    if (!isOpen || isMobile) return
    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [isOpen, isMobile, reposition])

  // Close dropdown when clicking outside (the dropdown lives in a portal)
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event) => {
      if (containerRef.current?.contains(event.target)) return
      if (dropdownRef.current?.contains(event.target)) return
      close()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, close])

  // Focus search input when dropdown opens (only if searchable)
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus({ preventScroll: true })
    }
  }, [isOpen, searchable, position, isMobile])

  // Start keyboard navigation at the selected option (or the first match while searching)
  useEffect(() => {
    if (!isOpen) return
    const selectedIndex = filteredOptions.findIndex(opt => opt[valueKey] === value)
    setActiveIndex(selectedIndex === -1 && query ? 0 : selectedIndex)
  }, [isOpen, searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    listRef.current.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleSelect = (option) => {
    onChange(option[valueKey])
    close()
    buttonRef.current?.focus({ preventScroll: true })
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
    setSearchQuery('')
  }

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        open()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation() // keep parent modals/drawers open
      close()
      buttonRef.current?.focus({ preventScroll: true })
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, filteredOptions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(filteredOptions.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredOptions[activeIndex]) handleSelect(filteredOptions[activeIndex])
    } else if (e.key === 'Tab') {
      close()
    }
  }

  const optionList = (
    <div ref={listRef} role="listbox" className="overflow-y-auto overscroll-contain p-1" style={isMobile ? { maxHeight: '60vh' } : { maxHeight: position?.listMaxHeight }}>
      {filteredOptions.length > 0 ? (
        <ul className="space-y-px">
          {filteredOptions.map((option, index) => {
            const isSelected = option[valueKey] === value
            const isActive = index === activeIndex
            return (
              <li key={option[valueKey]} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  data-index={index}
                  tabIndex={-1}
                  onClick={() => handleSelect(option)}
                  onMouseMove={() => { if (!isActive) setActiveIndex(index) }}
                  className={`
                    w-full flex items-center gap-2.5 px-2.5 rounded-md text-left text-sm transition-colors duration-100
                    ${isMobile ? 'min-h-[44px] py-2' : option.email ? 'py-1.5' : 'h-8'}
                    ${isActive ? 'bg-gray-100' : ''}
                    ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}
                  `}
                >
                  {optionIcon ? (
                    <span className="w-4 flex justify-center flex-shrink-0">{optionIcon(option)}</span>
                  ) : option.email ? (
                    <OptionAvatar name={option[displayKey]} />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate"><Highlight text={option[displayKey]} query={query} /></span>
                    {/* Secondary text for people-like options */}
                    {option.email && (
                      <span className="block text-xs font-normal text-gray-500 truncate"><Highlight text={option.email} query={query} /></span>
                    )}
                  </span>
                  <Check className={`w-4 h-4 flex-shrink-0 text-[#0B3D26] transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="px-3 py-6 text-center">
          <p className="text-sm text-gray-700">{options.length ? 'No matches' : 'No options'}</p>
          {query && <p className="text-xs text-gray-500 mt-0.5">Nothing found for “{query}”</p>}
        </div>
      )}
    </div>
  )

  const FooterIcon = footerAction?.icon || Plus
  const footer = footerAction && (
    <div className="border-t border-gray-100 p-1 flex-shrink-0">
      <button
        type="button"
        onClick={() => { close(); footerAction.onClick() }}
        className={`w-full flex items-center gap-2 px-2.5 rounded-md text-sm font-medium text-[#0B3D26] hover:bg-gray-100 transition-colors ${isMobile ? 'min-h-[44px]' : 'h-8'}`}
      >
        <FooterIcon className="w-4 h-4" aria-hidden="true" /> {footerAction.label}
      </button>
    </div>
  )

  const searchBox = searchable && (
    <div className="flex items-center gap-2 px-3 h-11 border-b border-gray-100 flex-shrink-0">
      <Search className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
      <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search…"
        aria-label="Search options"
        className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
      />
      {query ? (
        <button type="button" onClick={() => { setSearchQuery(''); searchInputRef.current?.focus() }} aria-label="Clear search" className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span className="text-[11px] tabular-nums text-gray-400">{options.length}</span>
      )}
    </div>
  )

  const floatingProps = { [FLOATING_LAYER_ATTR]: '' }

  const dropdown = isOpen && (isMobile ? (
    // Phones: bottom sheet with large touch targets
    <div {...floatingProps} className={`fixed inset-0 z-[10000] flex items-end ${isDarkScope ? 'app-dark' : ''}`}>
      <div className="absolute inset-0 bg-black/30 select-fade" onMouseDown={close} />
      <div ref={dropdownRef} className="select-sheet relative w-full bg-white rounded-t-2xl shadow-modal flex flex-col pb-[env(safe-area-inset-bottom)]">
        <div className="pt-2 flex justify-center" aria-hidden="true"><span className="w-9 h-1 rounded-full bg-gray-200" /></div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-sm font-semibold text-gray-900 truncate">{placeholder}</span>
          <button type="button" onClick={close} className="text-sm font-medium text-[#0B3D26]">Done</button>
        </div>
        {searchBox}
        {optionList}
        {footer}
      </div>
    </div>
  ) : position && (
    <div {...floatingProps} className={isDarkScope ? 'app-dark' : ''}>
      <div
        ref={dropdownRef}
        className={`select-pop fixed z-[10000] bg-white border border-gray-200 rounded-lg shadow-dropdown flex flex-col overflow-hidden ${position.placeAbove ? 'origin-bottom' : 'origin-top'}`}
        style={{ left: position.left, width: position.width, top: position.top, bottom: position.bottom }}
      >
        {searchBox}
        {optionList}
        {footer}
      </div>
    </div>
  ))

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        className={`
          group w-full ${compact ? 'h-8' : 'h-9'} pl-3 pr-2 text-left text-sm border rounded-md transition-[border-color,box-shadow] duration-150
          focus:outline-none
          ${custom ? buttonClassName : 'bg-white'}
          ${error
            ? 'border-red-400 focus-visible:ring-2 focus-visible:ring-red-500/20'
            : custom ? '' : `border-gray-300 focus-visible:border-[#0B3D26] focus-visible:ring-2 focus-visible:ring-[#0B3D26]/20 ${isOpen ? 'border-[#0B3D26] ring-2 ring-[#0B3D26]/20' : ''}`}
          ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : custom ? 'cursor-pointer' : 'cursor-pointer hover:border-gray-400'}
        `}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`min-w-0 flex items-center gap-2 ${selectedOption ? (custom ? 'text-inherit' : 'text-gray-900') : (custom ? 'text-inherit opacity-70' : 'text-gray-400')}`}>
            {selectedOption && (optionIcon
              ? <span className="flex-shrink-0">{optionIcon(selectedOption)}</span>
              : selectedOption.email && <span className="-ml-0.5 scale-[0.85]"><OptionAvatar name={selectedOption[displayKey]} /></span>)}
            <span className="truncate">{selectedOption ? selectedOption[displayKey] : placeholder}</span>
          </span>
          <span className="flex items-center gap-0.5 flex-shrink-0">
            {/* Clear button (a span: buttons can't be nested); revealed on hover/focus to keep the field quiet */}
            {allowClear && value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear selection"
                onClick={handleClear}
                className={`p-0.5 rounded transition-opacity opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 ${custom ? 'hover:bg-white/20' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronsUpDown className={`w-4 h-4 ${custom ? 'text-inherit opacity-70' : isOpen ? 'text-gray-600' : 'text-gray-400'}`} aria-hidden="true" />
          </span>
        </div>
      </button>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

      {dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}
