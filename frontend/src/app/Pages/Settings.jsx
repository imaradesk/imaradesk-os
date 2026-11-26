import React from 'react'
import { UserCircle2, Bell, Lock } from 'lucide-react'
import SettingsPage from '../components/settings/SettingsPage'
import {
  GeneralSettings,
  NotificationsSettings,
  SecuritySettings,
} from '../components/settings'

const ACCOUNT_SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'access', label: 'Sign-in & access' },
]

export default function Settings({ activeSection = 'general', business = {} }) {
  if (activeSection === 'general') {
    return (
      <SettingsPage
        title="Account"
        icon={UserCircle2}
        description="Your company profile and sign-in settings."
        sections={ACCOUNT_SECTIONS}
      >
        <GeneralSettings business={business} />
      </SettingsPage>
    )
  }

  if (activeSection === 'notifications') {
    return (
      <SettingsPage
        title="Notifications"
        icon={Bell}
        description="Choose which events send emails to your team, and get a weekly summary."
      >
        <NotificationsSettings />
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Security" icon={Lock}>
      <SecuritySettings />
    </SettingsPage>
  )
}
