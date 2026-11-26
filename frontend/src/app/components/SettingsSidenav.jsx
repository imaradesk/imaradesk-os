import React from 'react'
import {
  Settings,
  UserCircle2,
  Bell,
  Lock,
  Package,
  LayoutGrid,
  User,
  Users,
  FileText,
  Mail,
  Clock,
  Radio,
  BookOpen,
} from 'lucide-react'

// Single source of truth for the administration navigation.
// Pages import this to derive titles instead of duplicating the list.
export const ADMIN_NAV = [
  {
    label: 'Workspace',
    items: [
      { id: 'general', label: 'Account', href: '/administration/general/', keywords: ['general', 'profile', 'business', 'company', 'logo', 'workspace', 'password'], description: 'Company profile, portal link and sign-in', icon: UserCircle2 },
      { id: 'notifications', label: 'Notifications', href: '/administration/notifications/', keywords: ['email', 'alerts', 'reports', 'weekly'], description: 'Choose which events send emails and alerts', icon: Bell },
      { id: 'security', label: 'Security', href: '/administration/security/', keywords: ['2fa', 'password', 'login', 'mfa', 'sessions', 'devices', 'audit'], description: 'Passwords, two-factor authentication and sessions', icon: Lock },
    ],
  },
  {
    label: 'Channels & apps',
    items: [
      { id: 'channels', label: 'Channels', href: '/administration/channels/', keywords: ['email', 'portal', 'web'], description: 'Email, the customer portal and other ways customers reach you', icon: Radio },
      { id: 'marketplace', label: 'Modules', href: '/administration/marketplace/', keywords: ['marketplace', 'apps', 'add-ons', 'install'], description: 'Browse and install add-on modules', icon: Package },
    ],
  },
  {
    label: 'Support desk',
    items: [
      { id: 'views', label: 'Views', href: '/administration/views/', keywords: ['filters', 'tickets', 'queues'], description: 'Saved ticket views, order and defaults', icon: LayoutGrid },
      { id: 'sla', label: 'SLA', href: '/administration/sla/', keywords: ['service level', 'business hours', 'holidays', 'response time'], description: 'Policies, business hours and holidays', icon: Clock, matchPrefix: 'sla' },
      {
        id: 'emails',
        label: 'Emails',
        icon: Mail,
        matchPrefix: 'emails',
        children: [
          { id: 'emails-templates', label: 'Email templates', href: '/administration/emails/templates/', keywords: ['email', 'notifications', 'content'], description: 'Customise the emails the helpdesk sends', icon: FileText },
          { id: 'emails-smtp', label: 'SMTP', href: '/administration/emails/smtp/', keywords: ['email', 'mail server', 'outgoing'], description: 'Outgoing mail server settings', icon: Mail },
        ],
      },
    ],
  },
  {
    label: 'Knowledge base',
    items: [
      // `module`: only shown when that module is installed
      { id: 'knowledge-base', label: 'Knowledge base', href: '/administration/knowledge-base/', module: 'kb', keywords: ['kb', 'articles', 'help center', 'portal', 'approval', 'comments', 'rating', 'public'], description: 'Portal access, ratings, comments and article approval', icon: BookOpen },
    ],
  },
  {
    label: 'People',
    items: [
      {
        id: 'team',
        label: 'Team',
        icon: Users,
        matchPrefix: 'team',
        children: [
          { id: 'team-users', label: 'Users', href: '/administration/team/users/', keywords: ['agents', 'admins', 'invite', 'members', 'people'], description: 'Invite and manage agents and admins', icon: User },
          { id: 'team-groups', label: 'Groups', href: '/administration/team/groups/', keywords: ['teams', 'assignment'], description: 'Teams that tickets can be assigned to', icon: Users },
        ],
      },
    ],
  },
]

export function findAdminNavItem(id) {
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      if (item.id === id) return item
      const child = item.children?.find((c) => c.id === id)
      if (child) return child
    }
  }
  return null
}

/** Group and top-level nav item for a section id (prefix-aware, e.g. "sla-holidays" → SLA). */
export function findAdminNavContext(id) {
  if (!id) return { group: null, item: null }
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      const child = item.children?.find((c) => c.id === id)
      if (child) return { group: group.label, item: child }
      if (item.id === id || (item.matchPrefix && id.startsWith(item.matchPrefix) && !item.children)) {
        return { group: group.label, item }
      }
    }
  }
  return { group: null, item: null }
}

/**
 * The administration side navigation was replaced by the grid on the
 * Settings home page (/administration/). Pages still render this component,
 * so it now renders nothing; ADMIN_NAV above remains the source of truth.
 */
export default function SettingsSidenav() {
  return null
}
