import React, { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import api from '../../utils/axios'
import PortalShell from '../components/portal/PortalShell'
import PortalTicketView from '../components/portal/PortalTicketView'
import { BTN_PRIMARY, BTN_SECONDARY } from '../components/portal/PortalUI'

export default function CustomerPortalTicketDetail({ ticket, comments = [], activity_logs = [], tenant_name }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localComments, setLocalComments] = useState(comments || [])

  const handleAddComment = async (message) => {
    if (isSubmitting) return false
    setIsSubmitting(true)

    try {
      const response = await api.post(`/portal/ticket/${ticket.ticket_number}/add-comment/`, { message })

      if (response.data.success) {
        toast.success('Reply sent')
        setLocalComments((prev) => [...prev, response.data.comment])
        return true
      }

      toast.error(response.data.message || 'Failed to add reply')
      return false
    } catch (error) {
      toast.error('Failed to add reply')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Head title={`Ticket ${ticket.ticket_number}`} />

      <PortalShell tenantName={tenant_name}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-4">
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
        </div>
      </PortalShell>
    </>
  )
}
