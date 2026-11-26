import React, { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import { BookOpen, Check, ArrowUpRight } from 'lucide-react'
import SettingsPage, { SettingsSection, SettingsRow, Toggle, Badge, btn } from '../components/settings/SettingsPage'
import { Spinner } from '../components/kb/ui'

// Turning approval off also turns these off (mirrors kb_settings_update).
const APPROVAL_DEPENDENTS = ['notify_approvers', 'notify_author_on_approval', 'notify_author_on_rejection']

const SECTIONS = [
  { id: 'access', label: 'Access' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'publishing', label: 'Publishing' },
  { id: 'notifications', label: 'Approval notifications' },
]

export default function KBSettings({ settings = {} }) {
  const [data, setData] = useState({ ...settings })
  const [processing, setProcessing] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  // Each toggle saves immediately. router.post (not useForm().post) so the new values are sent, not the previous render's.
  const toggle = (name) => {
    const previous = data
    const next = { ...data, [name]: !data[name] }
    if (name === 'require_approval' && !next.require_approval) APPROVAL_DEPENDENTS.forEach((f) => { next[f] = false })
    setData(next)
    router.post('/knowledgebase/settings/update/', next, {
      preserveScroll: true,
      preserveState: true,
      onStart: () => setProcessing(true),
      onFinish: () => setProcessing(false),
      onSuccess: () => setSavedAt(Date.now()),
      onError: () => {
        setData(previous)
        toast.error('Failed to save settings')
      },
    })
  }

  const row = (name, title, description, disabled = false) => (
    <SettingsRow title={title} description={description} className={disabled ? 'opacity-60' : ''}>
      <Toggle checked={!!data[name]} onChange={() => toggle(name)} label={title} disabled={processing || disabled} />
    </SettingsRow>
  )

  return (
    <SettingsPage
      group="Knowledge base"
      title="Knowledge base"
      icon={BookOpen}
      description="Who can read articles in the support portal, how readers engage with them, and how new articles are reviewed. Changes save automatically."
      sections={SECTIONS}
      actions={(
        <span className={`inline-flex items-center gap-1.5 text-xs transition-opacity duration-300 ${processing || savedAt ? 'opacity-100' : 'opacity-0'}`} aria-live="polite">
          {processing
            ? <><Spinner className="w-3.5 h-3.5 text-gray-400" /> <span className="text-gray-500">Saving…</span></>
            : <><Check className="w-3.5 h-3.5 text-emerald-600" /> <span className="text-gray-500">Saved</span></>}
        </span>
      )}
      headerActions={(
        <Link href="/knowledgebase/articles/" className={btn.secondary}>
          Open knowledge base <ArrowUpRight className="w-4 h-4" />
        </Link>
      )}
    >
      <SettingsSection id="access" title="Access" description="Control who can read published articles in the support portal." flush>
        <div className="divide-y divide-gray-100">
          {row('public_access', 'Public access', 'Anyone can read published articles without signing in.')}
          {row('require_login_to_view', 'Require sign-in', 'Customers must sign in before they can view any article.')}
        </div>
      </SettingsSection>

      <SettingsSection id="engagement" title="Engagement" description="Let readers tell you which articles help." flush>
        <div className="divide-y divide-gray-100">
          {row('allow_article_rating', 'Article rating', 'Readers can mark articles as helpful or not helpful.')}
          {row('allow_article_comments', 'Article comments', 'Readers can comment on articles that allow it.')}
        </div>
      </SettingsSection>

      <SettingsSection
        id="publishing"
        title="Publishing"
        description="Review new and edited articles before they go live."
        action={<Badge tone={data.require_approval ? 'brand' : 'gray'} dot>{data.require_approval ? 'Approval on' : 'Approval off'}</Badge>}
        flush
      >
        <div className="divide-y divide-gray-100">
          {row('require_approval', 'Require approval', 'New and edited articles wait in Approvals until someone reviews them.')}
          {row('auto_publish_on_approval', 'Publish on approval', 'Approved articles are published straight away instead of returning to draft.')}
        </div>
      </SettingsSection>

      <SettingsSection
        id="notifications"
        title="Approval notifications"
        description={data.require_approval ? 'Emails sent during the review process.' : 'Turn on approval to use these.'}
        flush
      >
        <div className="divide-y divide-gray-100">
          {row('notify_approvers', 'Notify approvers', 'Email approvers when an article is waiting for review.', !data.require_approval)}
          {row('notify_author_on_approval', 'Notify author on approval', 'Let the author know when their article is approved.', !data.require_approval)}
          {row('notify_author_on_rejection', 'Notify author on rejection', 'Send the author the reason when their article is sent back.', !data.require_approval)}
        </div>
      </SettingsSection>
    </SettingsPage>
  )
}
