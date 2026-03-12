import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import Avatar from './Avatar'
import { COLORS } from '../app/constants/theme'

/**
 * Get caret (cursor) pixel coordinates in a textarea
 */
const getCaretCoordinates = (element, position) => {
  const div = document.createElement('div')
  const style = getComputedStyle(element)
  
  // Copy textarea styles to mirror div
  const properties = [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
    'letterSpacing', 'textTransform', 'wordSpacing', 'textIndent',
    'whiteSpace', 'wordBreak', 'overflowWrap', 'lineHeight',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'boxSizing'
  ]
  
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordWrap = 'break-word'
  div.style.overflow = 'hidden'
  div.style.width = `${element.offsetWidth}px`
  
  properties.forEach(prop => {
    div.style[prop] = style[prop]
  })
  
  // Create text content up to cursor position
  const text = element.value.substring(0, position)
  div.textContent = text
  
  // Add a span at cursor position to measure
  const span = document.createElement('span')
  span.textContent = element.value.substring(position) || '.'
  div.appendChild(span)
  
  document.body.appendChild(div)
  
  const coordinates = {
    top: span.offsetTop + parseInt(style.paddingTop),
    left: span.offsetLeft + parseInt(style.paddingLeft),
    height: parseInt(style.lineHeight) || parseInt(style.fontSize) * 1.2
  }
  
  document.body.removeChild(div)
  
  return coordinates
}

/**
 * MentionTextarea - A textarea component with @mention support
 * 
 * Features:
 * - Type @ to trigger user search
 * - Dropdown shows matching users  
 * - Selecting a user inserts @username
 * - Tracks mentioned user IDs for backend
 */
const MentionTextarea = forwardRef(({ 
  value = '',
  onChange,
  onMentionsChange,
  placeholder = '',
  rows = 4,
  className = '',
  label,
  error,
  disabled = false,
  ...props 
}, ref) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState(null) // null = not triggered, '' = just @ typed
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionTriggerPosition, setMentionTriggerPosition] = useState(null)
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 }) // Position near cursor
  const [mentions, setMentions] = useState([]) // Track mentioned users { id, username, name }
  
  const textareaRef = useRef(null)
  const dropdownRef = useRef(null)
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    getMentions: () => mentions.map(m => m.id),
    clearMentions: () => setMentions([]),
  }))
  
  // Search for users when search query changes (null = not triggered, '' = just @ typed)
  useEffect(() => {
    if (searchQuery === null) {
      setUsers([])
      setShowDropdown(false)
      return
    }
    
    const searchUsers = async () => {
      setLoading(true)
      try {
        // Empty query = show all users, otherwise search
        const url = searchQuery 
          ? `/tickets/mentions/search/?q=${encodeURIComponent(searchQuery)}&limit=8`
          : `/tickets/mentions/search/?limit=8`
        const response = await fetch(url)
        const data = await response.json()
        setUsers(data.users || [])
        setSelectedIndex(0)
        setShowDropdown(true)
      } catch (err) {
        console.error('Failed to search users:', err)
        setUsers([])
      } finally {
        setLoading(false)
      }
    }
    
    const debounce = setTimeout(searchUsers, 100)
    return () => clearTimeout(debounce)
  }, [searchQuery])
  
  // Notify parent when mentions change
  useEffect(() => {
    onMentionsChange?.(mentions.map(m => m.id))
  }, [mentions, onMentionsChange])
  
  // Find @mention trigger in text
  const findMentionTrigger = (text, cursorPos) => {
    // Look backwards from cursor to find @
    let start = cursorPos - 1
    while (start >= 0) {
      const char = text[start]
      if (char === '@') {
        // Found @, extract the query after it
        const query = text.slice(start + 1, cursorPos)
        // Only trigger if query doesn't contain spaces
        if (!query.includes(' ') && !query.includes('\n')) {
          return { start, query }
        }
        return null
      }
      // If we hit a space or newline, no @ trigger
      if (char === ' ' || char === '\n') {
        return null
      }
      start--
    }
    return null
  }
  
  const handleChange = (e) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart
    
    onChange?.(e)
    
    // Check for mention trigger
    const trigger = findMentionTrigger(newValue, cursorPos)
    if (trigger) {
      setSearchQuery(trigger.query)
      setMentionTriggerPosition(trigger.start)
      
      // Calculate dropdown position near the @ character
      if (textareaRef.current) {
        const coords = getCaretCoordinates(textareaRef.current, trigger.start)
        // Offset for the scroll position of textarea
        const scrollTop = textareaRef.current.scrollTop
        setDropdownCoords({
          top: coords.top - scrollTop + coords.height,
          left: coords.left
        })
      }
    } else {
      setSearchQuery(null)
      setShowDropdown(false)
      setMentionTriggerPosition(null)
    }
  }
  
  const handleKeyDown = (e) => {
    if (!showDropdown || users.length === 0) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % users.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + users.length) % users.length)
        break
      case 'Enter':
        if (showDropdown) {
          e.preventDefault()
          selectUser(users[selectedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSearchQuery('')
        break
      case 'Tab':
        if (showDropdown) {
          e.preventDefault()
          selectUser(users[selectedIndex])
        }
        break
    }
  }
  
  const selectUser = (user) => {
    if (!user || mentionTriggerPosition === null) return
    
    const textarea = textareaRef.current
    const cursorPos = textarea.selectionStart
    
    // Replace @query with @username
    const before = value.slice(0, mentionTriggerPosition)
    const after = value.slice(cursorPos)
    const mention = `@${user.username} `
    const newValue = before + mention + after
    
    // Update value
    const event = { target: { value: newValue } }
    onChange?.(event)
    
    // Add to mentions list if not already there
    if (!mentions.find(m => m.id === user.id)) {
      setMentions(prev => [...prev, { id: user.id, username: user.username, name: user.name }])
    }
    
    // Reset dropdown
    setShowDropdown(false)
    setSearchQuery(null)
    setMentionTriggerPosition(null)
    
    // Move cursor after the mention
    setTimeout(() => {
      const newCursorPos = mentionTriggerPosition + mention.length
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          textareaRef.current && !textareaRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Scroll selected item into view
  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      const selectedEl = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      selectedEl?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex, showDropdown])
  
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={`w-full px-3 py-2 border ${
            error ? 'border-red-500' : 'border-gray-300'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:border-transparent resize-none ${className}`}
          {...props}
        />
        
        {/* Mention dropdown - positioned relative to textarea */}
        {showDropdown && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 w-72 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
            style={{ 
              top: `${dropdownCoords.top}px`,
              left: `${Math.min(dropdownCoords.left, 100)}px` // Cap left position to avoid overflow
            }}
          >
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Searching...
            </div>
          ) : users.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No users found
            </div>
          ) : (
            <ul className="py-1">
              {users.map((user, index) => (
                <li
                  key={user.id}
                  data-index={index}
                  className={`px-3 py-2 cursor-pointer flex items-center gap-3 transition-colors ${
                    index === selectedIndex 
                      ? 'bg-[#4a154b]/10' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => selectUser(user)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <Avatar name={user.name} size="sm" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      @{user.username} {user.role && `• ${user.role}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {/* Mentioned users badges */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {mentions.map(mention => (
            <span 
              key={mention.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#4a154b]/10 text-[#4a154b] rounded-full text-xs"
            >
              @{mention.username}
              <button
                type="button"
                onClick={() => setMentions(prev => prev.filter(m => m.id !== mention.id))}
                className="hover:text-[#4a154b]/70 focus:outline-none"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
})

MentionTextarea.displayName = 'MentionTextarea'

export default MentionTextarea
