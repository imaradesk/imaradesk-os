import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../../utils/axios'
import { useTheme } from '../ThemeContext'

const cardCache = new Map()

const initials = (name) => (name || '?').trim().slice(0, 1).toUpperCase()

const MentionCard = ({ userId, rect, onEnter, onLeave }) => {
  const { isDark } = useTheme()
  const [user, setUser] = useState(cardCache.get(userId) || null)
  const [loading, setLoading] = useState(!cardCache.has(userId))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const cached = cardCache.get(userId)
    setFailed(false)
    if (cached) {
      setUser(cached)
      setLoading(false)
      return undefined
    }

    let live = true
    let timer
    setUser(null)
    setLoading(true)
    const started = Date.now()
    const reveal = (fn) => {
      const wait = Math.max(0, 500 - (Date.now() - started))
      timer = setTimeout(() => { if (live) fn() }, wait)
    }

    api.get(`/tickets/mentions/${userId}/`)
      .then((res) => reveal(() => {
        cardCache.set(userId, res.data)
        setUser(res.data)
        setLoading(false)
      }))
      .catch(() => reveal(() => {
        setFailed(true)
        setLoading(false)
      }))
    return () => { live = false; clearTimeout(timer) }
  }, [userId])

  const width = 280
  const GAP = 8
  const triggerMid = rect.left + rect.width / 2
  const left = Math.min(Math.max(8, triggerMid - width / 2), window.innerWidth - width - 8)
  const below = rect.bottom + 200 < window.innerHeight
  const style = below
    ? { top: rect.bottom + GAP, left, width }
    : { bottom: window.innerHeight - rect.top + GAP, left, width }
  const arrowLeft = Math.max(16, Math.min(triggerMid - left - 9, width - 34))
  const arrowBase = { position: 'absolute', width: 0, height: 0, pointerEvents: 'none', left: arrowLeft }

  return createPortal(
    <div
      style={style}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`fixed z-[9999] ${isDark ? 'app-dark' : ''}`}
    >
      <div
        style={{
          background: 'var(--popover-bg, #fff)',
          border: '1px solid var(--popover-border, #e5e7eb)',
          borderRadius: 12,
          boxShadow: 'var(--popover-shadow, 0 4px 6px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.14))',
          overflow: 'hidden',
        }}
      >
        {failed && <div className="px-4 py-3 text-sm text-gray-500">User details unavailable</div>}
        {loading && (
          <div className="px-4 py-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-3.5 w-28 rounded bg-gray-200" />
                <div className="h-3 w-40 rounded bg-gray-100" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-3 w-12 rounded bg-gray-100" />
              <div className="h-3 w-20 rounded bg-gray-100" />
            </div>
          </div>
        )}
        {!loading && user && (
          <>
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#0B3D26] flex items-center justify-center text-sm font-semibold text-white">
                    {initials(user.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                  <div className="text-xs text-gray-500 truncate">{user.email || ''}</div>
                </div>
              </div>
            </div>
            {(user.job_title || user.role || user.groups?.length > 0) && (
              <div className="px-4 py-2.5 border-t border-gray-200 space-y-1.5">
                {(user.job_title || user.role) && (
                  <div className="text-xs text-gray-600">
                    <span className="text-gray-400">Role · </span>{user.job_title || user.role}
                  </div>
                )}
                {user.groups?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {user.groups.map((g) => (
                      <span key={g} className="px-1.5 py-0.5 rounded bg-gray-100 text-[11px] text-gray-600">{g}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {/* Pointer toward the mention: outer border arrow, then fill arrow */}
      <div style={{
        ...arrowBase,
        borderLeft: '9px solid transparent',
        borderRight: '9px solid transparent',
        ...(below
          ? { top: -9, borderBottom: '9px solid var(--popover-border, #e5e7eb)' }
          : { bottom: -9, borderTop: '9px solid var(--popover-border, #e5e7eb)' }),
      }} />
      <div style={{
        ...arrowBase,
        left: arrowLeft + 1,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        ...(below
          ? { top: -7, borderBottom: '8px solid var(--popover-bg, #fff)' }
          : { bottom: -7, borderTop: '8px solid var(--popover-bg, #fff)' }),
      }} />
    </div>,
    document.body
  )
}

// Renders comment HTML; @mentions are bold and show a user card on hover
const MentionHtml = ({ html, className = '' }) => {
  const [hover, setHover] = useState(null)
  const timer = useRef(null)
  const bodyRef = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  // Replace stored @usernames with the agent's real name. Older comments were
  // saved before mentions inserted names, so resolve them from the user card API.
  useEffect(() => {
    if (!html || !bodyRef.current) return
    let live = true
    const anchors = bodyRef.current.querySelectorAll('a[href^="#user-"]')
    anchors.forEach((anchor) => {
      const userId = Number(anchor.getAttribute('href').replace('#user-', ''))
      if (!userId) return
      const cached = cardCache.get(userId)
      if (cached?.name) {
        anchor.textContent = `@${cached.name}`
        return
      }
      api.get(`/tickets/mentions/${userId}/`)
        .then((res) => {
          cardCache.set(userId, res.data)
          if (live && res.data?.name) anchor.textContent = `@${res.data.name}`
        })
        .catch(() => {})
    })
    return () => { live = false }
  }, [html])

  const mentionOf = (e) => e.target.closest?.('a[href^="#user-"]')
  const cancel = () => clearTimeout(timer.current)
  const hideSoon = () => {
    cancel()
    timer.current = setTimeout(() => setHover(null), 150)
  }

  const onOver = (e) => {
    const a = mentionOf(e)
    if (!a) return
    const userId = Number(a.getAttribute('href').replace('#user-', ''))
    if (!userId) return
    cancel()
    timer.current = setTimeout(() => setHover({ userId, rect: a.getBoundingClientRect() }), 200)
  }

  return (
    <>
      <div
        ref={bodyRef}
        className={`mention-html ${className}`}
        onMouseOver={onOver}
        onMouseOut={(e) => mentionOf(e) && hideSoon()}
        onClick={(e) => mentionOf(e) && e.preventDefault()}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {hover && (
        <MentionCard userId={hover.userId} rect={hover.rect} onEnter={cancel} onLeave={hideSoon} />
      )}
    </>
  )
}

export default MentionHtml
