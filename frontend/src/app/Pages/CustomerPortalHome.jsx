import React, { useState } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import {
  Activity, ArrowRight, BookOpen, LifeBuoy, Megaphone, Plus, Search, Ticket,
} from 'lucide-react'
import LucideIcon from '../components/LucideIcon'
import PortalShell from '../components/portal/PortalShell'
import {
  BTN_SECONDARY, PORTAL_CARD, PortalArticleCard, PortalEmpty, PortalHero,
  PortalPriorityBadge, PortalSearch, PortalSection, PortalStat, PortalStatusBadge, Reveal,
} from '../components/portal/PortalUI'

const QUICK_ACTIONS = [
  {
    href: '/portal/create-ticket/',
    icon: Plus,
    title: 'Create a ticket',
    description: 'Tell us what you need help with and we will get back to you.',
  },
  {
    href: '/portal/track-ticket/',
    icon: Search,
    title: 'Track a ticket',
    description: 'Check the status of an existing request with your ticket number.',
  },
  {
    href: '/portal/system-status/',
    icon: Activity,
    title: 'System status',
    description: 'See live availability for our services and recent incidents.',
  },
]

export default function CustomerPortalHome({
  portal_settings, categories = [], popular_articles = [], latest_articles = [],
  most_viewed_articles = [], announcements = [], user_tickets = [],
}) {
  const { props } = usePage()
  const currentUser = props.auth?.user
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.visit(`/portal/kb-search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const userStats = {
    openTickets: user_tickets.filter((t) => ['new', 'open'].includes(t.status)).length,
    inProgress: user_tickets.filter((t) => t.status === 'in_progress').length,
    resolved: user_tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length,
  }

  // Deduplicate across the three article lists the backend sends.
  const featuredArticles = [...popular_articles, ...latest_articles, ...most_viewed_articles]
    .filter((article, index, self) => index === self.findIndex((a) => a.uuid === article.uuid))
    .slice(0, 6)

  const tenantName = portal_settings?.tenant_name
  const portalTitle = portal_settings?.portal_title || 'Customer Portal'
  const firstName = currentUser?.first_name || currentUser?.name?.split(' ')[0]

  return (
    <>
      <Head title={portalTitle} />

      <PortalShell tenantName={tenantName}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
          <PortalHero
            eyebrow={currentUser ? `Welcome back${firstName ? `, ${firstName}` : ''}` : 'Customer support'}
            title={portal_settings?.portal_welcome_message || 'How can we help you today?'}
            description="Search our knowledge base, track an existing request, or start a new conversation with our support team."
          >
            <div className="max-w-xl">
              <PortalSearch
                size="lg"
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearch}
                placeholder="Search the knowledge base…"
              />
            </div>
           
          </PortalHero>

          {/* Quick actions */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map(({ href, icon: Icon, title, description }, i) => (
              <Reveal key={href} index={i + 2} step={70}>
              <Link
                href={href}
                className="portal-lift group block h-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-gray-300"
              >
                <div className="w-8 h-8 rounded-lg bg-[#0B3D26]/10 text-[#0B3D26] flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  {title}
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0B3D26] group-hover:translate-x-0.5 transition-all" />
                </h2>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{description}</p>
              </Link>
              </Reveal>
            ))}
          </div>

          {/* Logged-in overview + cases */}
          {currentUser && user_tickets.length > 0 && (
            <div id="my-cases" className="mt-10 scroll-mt-20">
              <PortalSection
                title="My cases"
                description="Requests you have submitted to our support team."
                action={
                  <span className="text-xs text-gray-400 tabular-nums">
                    {user_tickets.length} total
                  </span>
                }
              >
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <PortalStat label="Open" value={userStats.openTickets} accent={userStats.openTickets > 0} />
                  <PortalStat label="In progress" value={userStats.inProgress} />
                  <PortalStat label="Resolved" value={userStats.resolved} />
                </div>

                <div className={`${PORTAL_CARD} overflow-hidden`}>
                  <div className="hidden sm:grid grid-cols-[7rem_minmax(0,1fr)_7.5rem_6rem_6rem] gap-3 px-4 h-9 items-center border-b border-gray-200 bg-gray-50/60 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    <span>Ticket</span>
                    <span>Subject</span>
                    <span>Status</span>
                    <span>Priority</span>
                    <span className="text-right">Created</span>
                  </div>

                  <ul className="divide-y divide-gray-100">
                    {user_tickets.slice(0, 6).map((ticket, i) => (
                      <Reveal as="li" key={ticket.id || ticket.uuid} index={i} step={40}>
                        <Link
                          href={`/portal/ticket/${ticket.ticket_number}/`}
                          className="group grid grid-cols-1 sm:grid-cols-[7rem_minmax(0,1fr)_7.5rem_6rem_6rem] gap-1 sm:gap-3 px-4 py-3 hover:bg-gray-50 transition-colors items-center"
                        >
                          <span className="text-xs font-medium text-[#0B3D26] tabular-nums">#{ticket.ticket_number}</span>
                          <span className="text-sm text-gray-900 truncate group-hover:translate-x-0.5 transition-transform">{ticket.title}</span>
                          <span><PortalStatusBadge status={ticket.status} /></span>
                          <span><PortalPriorityBadge priority={ticket.priority} /></span>
                          <span className="text-xs text-gray-400 sm:text-right tabular-nums">
                            {new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </Link>
                      </Reveal>
                    ))}
                  </ul>
                </div>
              </PortalSection>
            </div>
          )}

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="mt-10">
              <div className="portal-tint rounded-2xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone className="w-4 h-4 text-[#0B3D26]" />
                  <h2 className="text-sm font-semibold text-gray-900">Announcements</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {announcements.map((item) => (
                    <Link
                      key={item.uuid}
                      href={`/portal/kb/${item.uuid}/`}
                      className="group rounded-xl bg-white border border-gray-200 px-3 py-2.5 hover:border-[#0B3D26]/30 transition-colors"
                    >
                      <p className="text-xs font-medium text-gray-900 line-clamp-2 group-hover:text-[#0B3D26]">{item.title}</p>
                      <p className="mt-1 text-[11px] text-gray-500 line-clamp-1">{item.category}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Knowledge base categories */}
          {portal_settings?.show_kb_in_portal && categories.length > 0 && (
            <div className="mt-10">
              <PortalSection
                title="Browse by topic"
                description="Find answers organised by area."
                action={
                  <Link href="/portal/kb/" className="inline-flex items-center gap-1 text-xs font-medium text-[#0B3D26] hover:underline">
                    All articles <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {categories.map((category, i) => (
                    <Reveal key={category.id} index={Math.min(i, 8)} step={40}>
                    <Link
                      href={`/portal/kb/?category=${category.id}`}
                      className="portal-lift group flex h-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm hover:shadow-md hover:border-gray-300"
                    >
                      <span className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-[#0B3D26]/10 group-hover:text-[#0B3D26] flex items-center justify-center flex-shrink-0 transition-colors">
                        <LucideIcon name={category.icon || 'Folder'} className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">{category.name}</span>
                        <span className="block text-[11px] text-gray-500">{category.article_count || 0} articles</span>
                      </span>
                    </Link>
                    </Reveal>
                  ))}
                </div>
              </PortalSection>
            </div>
          )}

          {/* Featured articles */}
          {portal_settings?.show_kb_in_portal && (
            <div className="mt-10">
              <PortalSection
                title="Popular articles"
                description="Answers our customers find most useful."
                action={
                  <Link href="/portal/kb/" className="inline-flex items-center gap-1 text-xs font-medium text-[#0B3D26] hover:underline">
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
              >
                {featuredArticles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {featuredArticles.map((article, i) => (
                      <Reveal key={article.uuid} index={i} step={60} className="flex">
                        <PortalArticleCard article={article} compact />
                      </Reveal>
                    ))}
                  </div>
                ) : (
                  <div className={PORTAL_CARD}>
                    <PortalEmpty
                      icon={BookOpen}
                      title="No articles yet"
                      description="Our knowledge base is being prepared. In the meantime, feel free to create a ticket."
                      action={<Link href="/portal/create-ticket/" className={BTN_SECONDARY}><Ticket className="w-4 h-4" /> Create a ticket</Link>}
                    />
                  </div>
                )}
              </PortalSection>
            </div>
          )}

          {/* Help footer prompt */}
          <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-[#0B3D26]/10 text-[#0B3D26] flex items-center justify-center flex-shrink-0">
                <LifeBuoy className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Still need help?</h2>
                <p className="text-xs text-gray-500 mt-0.5">Our support team usually replies within a few hours.</p>
              </div>
            </div>
            <Link href="/portal/create-ticket/" className={BTN_SECONDARY}>
              <Plus className="w-4 h-4" /> Start a request
            </Link>
          </div>
        </div>
      </PortalShell>
    </>
  )
}
