import React, { useEffect, useState } from 'react'
import { usePage } from '@inertiajs/react'
import toast from 'react-hot-toast'
import { Send } from 'lucide-react'
import api from '../../../utils/axios'
import Modal, { ModalBody, ModalFooter, ModalButton } from '../Modal'

// Sends the saved version of a template to one address, filled with sample data
export default function TestEmailModal({ template, onClose, note = null }) {
  const { auth } = usePage().props
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (template) setEmail(auth?.user?.email || '')
  }, [template])

  const send = async (e) => {
    e?.preventDefault()
    if (!email.trim()) {
      toast.error('Enter an email address')
      return
    }
    setSending(true)
    try {
      const { data } = await api.post(`/administration/emails/templates/${template.id}/test/`, { email: email.trim() })
      if (data.success) {
        toast.success(data.message)
        onClose()
      } else {
        toast.error(data.message || 'Failed to send test email')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send test email')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal isOpen={!!template} onClose={onClose} title="Send a test email" maxWidth="max-w-md">
      <form onSubmit={send}>
        <ModalBody>
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{template?.name}</span> will be sent with sample values in place of its variables, and "[TEST]" in front of the subject.
          </p>
          {note && <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{note}</p>}
          <label htmlFor="test-email" className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">Send to</label>
          <input
            id="test-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoFocus
            className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20 focus:border-[#0B3D26]"
          />
        </ModalBody>
        <ModalFooter>
          <ModalButton type="button" onClick={onClose}>Cancel</ModalButton>
          <ModalButton type="submit" variant="primary" loading={sending}>
            {!sending && <Send className="w-4 h-4" />} Send test
          </ModalButton>
        </ModalFooter>
      </form>
    </Modal>
  )
}
