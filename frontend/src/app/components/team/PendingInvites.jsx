import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Clock, Loader2, MailPlus, RotateCw, ShieldCheck, X } from 'lucide-react'
import ConfirmDialog from '../ConfirmDialog'

// Pending team invitations with resend / revoke. Must render inside <AppShell>
// so the revoke confirmation picks up the theme.

const DAY = 24 * 60 * 60 * 1000

function expiryLabel(invite) {
  if (invite.is_expired) return 'Expired'
  const days = Math.ceil((new Date(invite.expires_at) - Date.now()) / DAY)
  return days <= 1 ? 'Expires today' : `Expires in ${days} days`
}

async function post(url) {
  const res = await fetch(url, { method: 'POST', headers: { 'X-CSRFToken': window.csrfToken } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

export default function PendingInvites({ invitations = [], onChange }) {
  const [busy, setBusy] = useState(null) // `${id}:resend` | `${id}:revoke`
  const [revoking, setRevoking] = useState(null)

  if (!invitations.length) return null

  const run = async (invite, action) => {
    setBusy(`${invite.id}:${action}`)
    try {
      await post(`/administration/team/invites/${invite.id}/${action}/`)
      toast.success(action === 'resend' ? `Invite resent to ${invite.email}` : `Invite for ${invite.email} revoked`)
      onChange?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white animate-portalRise [animation-delay:80ms]">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
        <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 inline-flex items-center justify-center">
          <MailPlus className="w-4 h-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Pending invites</h2>
          <p className="text-xs text-gray-500">Waiting for people to accept. Links expire after 7 days.</p>
        </div>
        <span className="ml-auto min-w-[1.5rem] h-6 px-2 rounded-full bg-amber-50 text-amber-700 text-xs font-medium inline-flex items-center justify-center tabular-nums">
          {invitations.length}
        </span>
      </div>

      <ul className="divide-y divide-gray-100">
        {invitations.map((invite, i) => {
          const resending = busy === `${invite.id}:resend`
          const removing = busy === `${invite.id}:revoke`
          return (
            <li
              key={invite.id}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className="group flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 animate-portalRise"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="w-9 h-9 flex-shrink-0 rounded-full border border-dashed border-gray-300 bg-gray-50 text-gray-400 inline-flex items-center justify-center">
                  <MailPlus className="w-4 h-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{invite.email}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                    {invite.invited_by && <span>Invited by {invite.invited_by}</span>}
                    <span className={`inline-flex items-center gap-1 ${invite.is_expired ? 'text-red-600' : ''}`}>
                      <Clock className="w-3 h-3" /> {expiryLabel(invite)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:ml-auto pl-12 sm:pl-0">
                {invite.role && (
                  <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-[#0B3D26]/10 text-[#0B3D26] text-[11px] font-medium whitespace-nowrap">
                    <ShieldCheck className="w-3 h-3" /> {invite.role}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => run(invite, 'resend')}
                  disabled={!!busy}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
                >
                  {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                  Resend
                </button>
                <button
                  type="button"
                  onClick={() => setRevoking(invite)}
                  disabled={!!busy}
                  aria-label={`Revoke invite for ${invite.email}`}
                  title="Revoke"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        isOpen={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={() => revoking && run(revoking, 'revoke')}
        title="Revoke invite?"
        message={revoking ? `The link sent to ${revoking.email} will stop working. You can invite them again later.` : ''}
        confirmText="Revoke invite"
      />
    </section>
  )
}
