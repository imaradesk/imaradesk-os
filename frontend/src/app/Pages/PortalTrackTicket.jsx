import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import {
  AlertCircle, Clock, Hash, LifeBuoy, Mail, Plus, Search,
} from 'lucide-react'
import api from '../../utils/axios'
import PortalShell from '../components/portal/PortalShell'
import PortalTicketView from '../components/portal/PortalTicketView'
import {
  BTN_PRIMARY, BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT, PortalHero,
  PortalStatusBadge,
} from '../components/portal/PortalUI'

const FIELD_LABEL = 'block text-xs font-medium text-gray-600 mb-1.5'

const STATUS_GUIDE = [
  { status: 'new', text: 'Just submitted and waiting for review.' },
  { status: 'in_progress', text: 'Our team is actively working on it.' },
  { status: 'pending', text: 'We are waiting on a response from you.' },
  { status: 'resolved', text: 'The issue has been resolved.' },
]

export default function PortalTrackTicket({ ticket, comments = [], activity_logs = [], search = {}, tenant_name }) {
  const [ticketNumber, setTicketNumber] = useState(search.ticket_number || '')
  const [email, setEmail] = useState(search.email || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localComments, setLocalComments] = useState(comments || [])

  const handleSearch = (e) => {
    e.preventDefault()
    router.get('/portal/track-ticket/', { ticket_number: ticketNumber, email })
  }

  const handleAddComment = async (message) => {
    if (isSubmitting) return false
    setIsSubmitting(true)

    try {
      const response = await api.post('/portal/add-comment/', {
        ticket_number: ticket.ticket_number,
        email: search.email,
        message,
      })

      if (response.data.success) {
        toast.success('Reply sent')
        setLocalComments((prev) => [...prev, response.data.comment])
        return true
      }

      toast.error(response.data.message || 'Failed to add reply')
      return false
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add reply. Please try again.')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const notFound = search.ticket_number && search.email && !ticket

  return (
    <>
      <Head title={ticket ? `Ticket ${ticket.ticket_number}` : 'Track ticket'} />

      <PortalShell tenantName={tenant_name}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
          {ticket ? (
            <PortalTicketView
              ticket={ticket}
              comments={localComments}
              activity_logs={activity_logs}
              backHref="/portal/"
              backLabel="Back to portal"
              onSubmitComment={handleAddComment}
              submitting={isSubmitting}
            >
              <div className="portal-tint rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Need more help?</h2>
                  <p className="mt-0.5 text-xs text-gray-600">
                    Reply above or browse our knowledge base for immediate answers.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href="/portal/kb/" className={BTN_SECONDARY}>Browse articles</Link>
                  <Link href="/portal/create-ticket/" className={BTN_PRIMARY}>
                    <Plus className="w-4 h-4" /> New ticket
                  </Link>
                </div>
              </div>
            </PortalTicketView>
          ) : (
            <>
              <PortalHero
                compact
                eyebrow="Ticket tracking"
                title="Track your ticket"
                description="Enter your ticket number and the email address you used to create it."
              />

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                <div className="lg:col-span-2">
                  <form onSubmit={handleSearch} className={`${PORTAL_CARD} p-5 sm:p-6 animate-portalRise`}>
                    <div className="space-y-4">
                      <div>
                        <label className={FIELD_LABEL} htmlFor="ticket-number">Ticket number <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="ticket-number"
                            type="text"
                            value={ticketNumber}
                            onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
                            placeholder="e.g. INC04E5B"
                            required
                            className={`${PORTAL_INPUT} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={FIELD_LABEL} htmlFor="ticket-email">Email address <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="ticket-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className={`${PORTAL_INPUT} pl-9`}
                          />
                        </div>
                      </div>

                      <button type="submit" className={`${BTN_PRIMARY} w-full`}>
                        <Search className="w-4 h-4" /> Track ticket
                      </button>
                    </div>
                  </form>

                  {notFound && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 animate-portalRise">
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h2 className="text-sm font-semibold text-amber-900">Ticket not found</h2>
                        <p className="mt-0.5 text-sm text-amber-700">
                          We could not find a ticket matching that number and email. Check both values and try again.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className={`${PORTAL_CARD} p-5`}>
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">What the statuses mean</h2>
                    <ul className="space-y-2.5">
                      {STATUS_GUIDE.map(({ status, text }) => (
                        <li key={status} className="flex items-start gap-2">
                          <span className="flex-shrink-0 mt-0.5"><PortalStatusBadge status={status} /></span>
                          <span className="text-xs text-gray-600 leading-relaxed">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="portal-tint rounded-2xl border p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <LifeBuoy className="w-4 h-4 text-[#0B3D26]" />
                      <h2 className="text-sm font-semibold text-gray-900">Where is my number?</h2>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Your ticket number was included in the confirmation email we sent when you created the request. Check your inbox or spam folder.
                    </p>
                    <Link href="/portal/create-ticket/" className={`${BTN_SECONDARY} mt-3 w-full`}>
                      <Plus className="w-4 h-4" /> Submit a new ticket
                    </Link>
                  </div>

                  <div className={`${PORTAL_CARD} p-5`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <h2 className="text-sm font-semibold text-gray-900">Business hours</h2>
                    </div>
                    <p className="text-xs text-gray-600">Monday – Friday<br />9:00 AM – 6:00 PM</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </PortalShell>
    </>
  )
}
