import React, { useEffect, useRef, useState } from 'react'
import { Popover } from '../../../components/Popover'
import api from '../../../utils/axios'

const SKELETON_DELAY = 500
const cache = new Map()

const HTML_CONTENT = 'text-sm text-gray-700 leading-relaxed break-words [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_a]:text-[#0B3D26] [&_a]:underline [&_h1]:text-base [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 [&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded-md [&_pre]:whitespace-pre-wrap [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_img]:max-w-full [&_img]:rounded-md [&_table]:w-full [&_td]:border [&_td]:border-gray-200 [&_td]:p-1'

const looksLikeHtml = (text) => /<\/?[a-z][\s\S]*>/i.test(text || '')

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2.5" aria-label="Loading description">
      <div className="h-3 w-11/12 rounded bg-gray-200" />
      <div className="h-3 w-full rounded bg-gray-200" />
      <div className="h-3 w-4/5 rounded bg-gray-200" />
      <div className="h-3 w-2/3 rounded bg-gray-200" />
      <div className="h-3 w-3/4 rounded bg-gray-200" />
    </div>
  )
}

/**
 * Hover card that previews a ticket's description (rendered HTML).
 * Shows a skeleton for at least SKELETON_DELAY ms, then the content.
 */
export default function TicketPreviewPopover({ ticket, children, className = '' }) {
  const [state, setState] = useState({ loading: false, description: null, error: false })
  const timer = useRef(null)
  const openId = useRef(0)

  useEffect(() => () => clearTimeout(timer.current), [])

  const handleOpenChange = (isOpen) => {
    clearTimeout(timer.current)
    openId.current += 1
    if (!isOpen) return
    const id = openId.current

    setState({ loading: true, description: null, error: false })
    const minDelay = new Promise((r) => { timer.current = setTimeout(r, SKELETON_DELAY) })
    const request = cache.has(ticket.uuid)
      ? Promise.resolve(cache.get(ticket.uuid))
      : api.get(`/tickets/${ticket.uuid}/detail-api/`).then((res) => {
          const description = res.data?.ticket?.description || ''
          cache.set(ticket.uuid, description)
          return description
        })

    Promise.all([request, minDelay])
      .then(([description]) => {
        if (id === openId.current) setState({ loading: false, description, error: false })
      })
      .catch(() => {
        if (id === openId.current) setState({ loading: false, description: null, error: true })
      })
  }

  return (
    <Popover
      openOnHover
      hoverDelay={350}
      strategy="fixed"
      width={380}
      maxHeight={360}
      className={`max-w-full ${className}`}
      onOpenChange={handleOpenChange}
      trigger={() => children}
    >
      <div className="cursor-default" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
        <div className="px-4 pt-3 pb-2 border-b border-gray-200">
          <div className="text-xs text-gray-500 tabular-nums">{ticket.ticket_number}</div>
          <div className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{ticket.subject || 'No subject'}</div>
        </div>
        <div className="px-4 py-3 max-h-[280px] overflow-y-auto">
          {state.loading ? (
            <Skeleton />
          ) : state.error ? (
            <p className="text-sm text-gray-500">Couldn't load the description.</p>
          ) : !state.description || !state.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() && !/<img/i.test(state.description) ? (
            <p className="text-sm text-gray-400 italic">No description</p>
          ) : looksLikeHtml(state.description) ? (
            <div className={HTML_CONTENT} dangerouslySetInnerHTML={{ __html: state.description }} />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{state.description}</p>
          )}
        </div>
      </div>
    </Popover>
  )
}
