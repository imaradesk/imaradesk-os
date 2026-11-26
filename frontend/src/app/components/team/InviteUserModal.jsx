import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Mail, Send, ShieldCheck, UserPlus, X } from 'lucide-react'
import Modal, { ModalButton } from '../Modal'
import { useUnsavedChanges } from '../../context/UnsavedChangesContext'

// Invite teammates by email and map them to a role. Each address gets an
// email with a /invite/<token>/ link (see accept_invite in core/views.py).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function InviteUserModal({ isOpen, onClose, onInvited, roles = [], existingEmails = [] }) {
  const [emails, setEmails] = useState([])
  const [draft, setDraft] = useState('')
  const [roleId, setRoleId] = useState(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef(null)
  const { guard } = useUnsavedChanges(isOpen && (emails.length > 0 || Boolean(draft.trim())))
  const close = () => guard(onClose)

  useEffect(() => {
    if (!isOpen) return
    setEmails([])
    setDraft('')
    setError('')
    setSending(false)
    setRoleId(roles[0]?.id ?? null)
  }, [isOpen])

  const taken = new Set(existingEmails.map((e) => (e || '').toLowerCase()))

  // Turn typed/pasted text into email chips; returns the full list, or null if something was invalid
  const commit = (text = draft) => {
    const parts = text.split(/[\s,;]+/).map((p) => p.trim().toLowerCase()).filter(Boolean)
    if (!parts.length) return emails
    const invalid = parts.find((p) => !EMAIL_RE.test(p))
    if (invalid) { setError(`“${invalid}” isn't a valid email address`); return null }
    const member = parts.find((p) => taken.has(p))
    if (member) { setError(`${member} is already on your team`); return null }
    const next = [...new Set([...emails, ...parts])]
    setEmails(next)
    setDraft('')
    setError('')
    return next
  }

  const handleKeyDown = (e) => {
    if (['Enter', ',', ' ', 'Tab'].includes(e.key) && draft.trim()) {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !draft && emails.length) {
      setEmails((prev) => prev.slice(0, -1))
    }
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const list = commit()
    if (!list) return
    if (!list.length) { setError('Add at least one email address'); inputRef.current?.focus(); return }
    if (!roleId) { setError('Choose a role'); return }

    setSending(true)
    try {
      const res = await fetch('/administration/team/users/invite/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.csrfToken },
        body: JSON.stringify({ emails: list, role_id: roleId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Could not send invites. Please try again.'); return }

      const { sent = [], skipped = [], failed = [] } = data
      const role = roles.find((r) => r.id === roleId)
      if (sent.length) {
        toast.success(`${sent.length === 1 ? `Invite sent to ${sent[0]}` : `${sent.length} invites sent`} as ${role?.name || 'a member'}`)
      }
      skipped.forEach((s) => toast(`${s.email}: ${s.reason}`, { icon: 'ℹ️' }))
      if (failed.length) {
        toast.error(`Couldn't email ${failed.join(', ')}. You can resend from Pending invites.`)
      }
      onInvited?.()
      onClose()
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const count = emails.length + (draft.trim() ? 1 : 0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Invite teammates"
      description="They'll get an email with a link to join your workspace."
      icon={UserPlus}
      size="lg"
      footer={
        <>
          <ModalButton variant="ghost" onClick={close}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={handleSubmit} loading={sending}>
            {!sending && <Send className="w-4 h-4" />}
            {count > 1 ? `Send ${count} invites` : 'Send invite'}
          </ModalButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label htmlFor="invite-emails" className="block text-sm font-medium text-gray-700 mb-1.5">Email addresses</label>
          <div
            onClick={() => inputRef.current?.focus()}
            className={`min-h-[2.75rem] flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-lg border bg-white cursor-text transition-shadow focus-within:ring-4 ${
              error ? 'border-red-300 focus-within:ring-red-500/10' : 'border-gray-200 focus-within:border-[#0B3D26] focus-within:ring-[#0B3D26]/10'
            }`}
          >
            <Mail className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" />
            {emails.map((email) => (
              <span key={email} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-[#0B3D26]/10 text-[#0B3D26] text-xs font-medium animate-portalPop">
                {email}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEmails((prev) => prev.filter((x) => x !== email)) }}
                  aria-label={`Remove ${email}`}
                  className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-[#0B3D26]/10"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              id="invite-emails"
              type="text"
              autoFocus
              autoComplete="off"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); if (error) setError('') }}
              onKeyDown={handleKeyDown}
              onBlur={() => draft.trim() && commit()}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text')
                if (/[\s,;]/.test(text.trim())) { e.preventDefault(); commit(text) }
              }}
              placeholder={emails.length ? 'Add another…' : 'name@company.com'}
              className="flex-1 min-w-[10rem] h-7 px-1 text-sm bg-transparent border-0 outline-none focus:ring-0 placeholder:text-gray-400"
            />
          </div>
          {error ? (
            <p className="mt-1.5 text-xs text-red-600 animate-fadeIn">{error}</p>
          ) : (
            <p className="mt-1.5 text-xs text-gray-500">Press Enter or comma to add. You can paste a list.</p>
          )}
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-1.5">Role</legend>
          {roles.length === 0 ? (
            <p className="text-sm text-gray-500">No roles found. Run the tenant seed to create the Administrator and Agent roles.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-0.5">
              {roles.map((role, i) => {
                const selected = roleId === role.id
                return (
                  <label
                    key={role.id}
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                    className={`relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 animate-portalRise ${
                      selected ? 'border-[#0B3D26] bg-[#0B3D26]/5 ring-2 ring-[#0B3D26]/15' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input type="radio" name="invite-role" className="sr-only" checked={selected} onChange={() => { setRoleId(role.id); setError('') }} />
                    <span className={`w-8 h-8 flex-shrink-0 rounded-lg inline-flex items-center justify-center transition-colors ${selected ? 'bg-[#0B3D26] text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900">{role.name}</span>
                      {role.description && <span className="block text-xs text-gray-500 line-clamp-2">{role.description}</span>}
                    </span>
                    {selected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0B3D26] text-white inline-flex items-center justify-center animate-portalPop">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </fieldset>
      </form>
    </Modal>
  )
}
