import React, { useState, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { THEME, COLORS } from '../constants/theme';
import DataTable from '../../components/DataTable';

export default function CustomerPortalHome({ portal_settings, categories, popular_articles, latest_articles, most_viewed_articles, announcements, user_tickets = [] }) {
  const { props } = usePage();
  const currentUser = props.auth?.user;
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollContainerRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.visit(`/portal/kb-search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // User stats based on actual tickets
  const userStats = {
    openTickets: user_tickets.filter(t => ['new', 'open'].includes(t.status)).length,
    inProgress: user_tickets.filter(t => t.status === 'in_progress').length,
    resolved: user_tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length,
  };

  // Combine KB articles for featured section (deduplicated by uuid)
  const featuredArticles = [
    ...(popular_articles || []),
    ...(latest_articles || []),
    ...(most_viewed_articles || [])
  ].filter((article, index, self) => 
    index === self.findIndex(a => a.uuid === article.uuid)
  ).slice(0, 8); // Limit to 8 articles

  const STATUS_LABELS = {
    new: { label: 'New', bg: 'bg-indigo-100', text: 'text-indigo-800' },
    open: { label: 'Open', bg: 'bg-blue-100', text: 'text-blue-800' },
    in_progress: { label: 'In Progress', bg: 'bg-purple-100', text: 'text-purple-800' },
    pending: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800' },
    resolved: { label: 'Resolved', bg: 'bg-green-100', text: 'text-green-800' },
    closed: { label: 'Closed', bg: 'bg-gray-100', text: 'text-gray-800' },
  };

  const PRIORITY_LABELS = {
    low: { label: 'Low', bg: 'bg-gray-100', text: 'text-gray-600' },
    normal: { label: 'Normal', bg: 'bg-blue-100', text: 'text-blue-600' },
    high: { label: 'High', bg: 'bg-orange-100', text: 'text-orange-600' },
    urgent: { label: 'Urgent', bg: 'bg-red-100', text: 'text-red-600' },
  };

  const scrollFeatured = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      <Head title={portal_settings?.portal_title || 'Portal'} />
      
      <div className="min-h-screen bg-gray-50 flex relative" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Overlay for mobile menu */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <aside className={`
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:sticky lg:top-0
          w-80 bg-white border-r border-gray-200
          flex flex-col
          h-full lg:h-screen
          transition-transform duration-300
          z-40
          overflow-y-auto
        `}>
          
          {/* Recent Activity */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <Link href="/portal/" className="text-2xl font-bold" style={{ color: COLORS.primary }}>
              {portal_settings.tenant_name || 'Customer Portal'}
            </Link>
            
            {/* Close button for mobile */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 rounded hover:bg-gray-100"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/portal/create-ticket/" className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm text-white rounded transition-colors" style={{ backgroundColor: COLORS.primary }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Ticket
              </Link>
              <Link href="/portal/track-ticket/" className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Track Ticket
              </Link>
            </div>
          </div>

          {/* Ticket Overview */}
          {currentUser && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Ticket Overview</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{userStats.openTickets}</div>
                <div className="text-xs text-gray-600 uppercase">Open</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{userStats.inProgress}</div>
                <div className="text-xs text-gray-600 uppercase">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{userStats.resolved}</div>
                <div className="text-xs text-gray-600 uppercase">Resolved</div>
              </div>
            </div>
          </div>
          )}

          {/* Help Resources */}
          <div className="p-6 bg-gray-100">
            <div className="bg-gray-600 px-4 py-2 mb-4 font-semibold text-sm text-white">
              HELP RESOURCES
            </div>
            <div className="space-y-3">
              <Link href="/portal/kb/" className="block border border-gray-200 rounded p-3 bg-white hover:shadow-sm transition-shadow">
                <h4 className="font-medium text-sm text-gray-900 mb-2">📚 Knowledge Base</h4>
                <div className="text-xs text-gray-600 mb-3">Browse helpful articles and guides</div>
                <span className="text-sm font-medium" style={{ color: COLORS.primary }}>
                  Browse Articles →
                </span>
              </Link>
              {/* <Link href="/portal/surveys/" className="block border border-gray-200 rounded p-3 bg-white hover:shadow-sm transition-shadow">
                <h4 className="font-medium text-sm text-gray-900 mb-2">📝 Customer Survey</h4>
                <div className="text-xs text-gray-600 mb-3">Help us improve by sharing your feedback</div>
                <span className="text-sm font-medium" style={{ color: COLORS.primary }}>
                  Take Survey →
                </span>
              </Link> */}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          {/* Hero Banner with Search */}
          <div className="relative py-8 md:py-10 lg:py-12 px-4 md:px-8 lg:px-12 overflow-hidden" style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)` }}>
            {/* Decorative Chevron Pattern */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-end opacity-30 hidden md:flex">
              {[...Array(7)].map((_, i) => (
                <svg key={i} className="h-full" style={{ width: '80px', marginLeft: '-20px' }} viewBox="0 0 100 500">
                  <polygon points="0,0 100,250 0,500" fill="white" opacity="0.3" />
                </svg>
              ))}
            </div>
            
            <div className="max-w-5xl relative z-10">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 md:mb-6">
                How can we help you today?
              </h1>
              
              <div className="relative max-w-3xl">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                  placeholder="Search knowledge base articles..."
                  className="w-full px-4 md:px-6 py-3 md:py-4 pr-12 rounded-lg text-gray-800 text-base md:text-lg focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-30 shadow-lg"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white transition-opacity hover:opacity-80"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* My Cases Section - Only show if user is logged in */}
          {currentUser && user_tickets.length > 0 && (
            <div className="bg-white px-4 md:px-8 lg:px-12 py-6 md:py-8 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">My Cases</h2>
                <Link 
                  href="/portal/track-ticket/" 
                  className="text-sm font-medium hover:underline"
                  style={{ color: COLORS.primary }}
                >
                  View All →
                </Link>
              </div>
              
              <DataTable
                data={user_tickets.slice(0, 5)}
                defaultPageSize={5}
                columns={[
                  {
                    key: 'ticket_number',
                    header: 'Ticket #',
                    render: (ticket) => (
                      <span className="text-sm font-medium" style={{ color: COLORS.primary }}>
                        #{ticket.ticket_number}
                      </span>
                    ),
                  },
                  {
                    key: 'title',
                    header: 'Subject',
                    render: (ticket) => (
                      <span className="text-sm text-gray-900 line-clamp-1">{ticket.title}</span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (ticket) => {
                      const status = STATUS_LABELS[ticket.status] || STATUS_LABELS.new;
                      return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      );
                    },
                  },
                  {
                    key: 'priority',
                    header: 'Priority',
                    render: (ticket) => {
                      const priority = PRIORITY_LABELS[ticket.priority] || PRIORITY_LABELS.normal;
                      return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.text}`}>
                          {priority.label}
                        </span>
                      );
                    },
                  },
                  {
                    key: 'created_at',
                    header: 'Created',
                    render: (ticket) => (
                      <span className="text-sm text-gray-500">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    ),
                  },
                  {
                    key: 'actions',
                    header: '',
                    sortable: false,
                    hideable: false,
                    render: (ticket) => (
                      <Link
                        href={`/portal/ticket/${ticket.ticket_number}/`}
                        className="text-sm font-medium hover:underline"
                        style={{ color: COLORS.primary }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </Link>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {/* Featured Section */}
          <div className="px-4 md:px-8 lg:px-12 py-6 md:py-8 flex-1 bg-gray-50 overflow-y-auto">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Featured</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => scrollFeatured('left')}
                  className="w-10 h-10 text-white rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: COLORS.primary }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = COLORS.primaryHover}
                  onMouseLeave={(e) => e.target.style.backgroundColor = COLORS.primary}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => scrollFeatured('right')}
                  className="w-10 h-10 text-white rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: COLORS.primary }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = COLORS.primaryHover}
                  onMouseLeave={(e) => e.target.style.backgroundColor = COLORS.primary}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div ref={scrollContainerRef} className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
              {/* Featured KB Articles */}
              {featuredArticles.length > 0 ? (
                featuredArticles.map((article, idx) => {
                  const colors = [
                    'from-blue-500 to-cyan-500',
                    'from-purple-600 to-purple-700',
                    'from-indigo-500 to-purple-600',
                    'from-red-500 to-red-600',
                    'from-green-500 to-teal-500',
                    'from-orange-500 to-red-500',
                    'from-pink-500 to-rose-600',
                    'from-cyan-400 to-blue-500'
                  ];
                  const color = colors[idx % colors.length];
                  
                  return (
                    <Link
                      key={article.uuid}
                      href={`/portal/kb/${article.uuid}/`}
                      className="flex-shrink-0 w-64 md:w-72 bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                    >
                      <div className={`h-48 ${!article.display_image ? 'bg-gray-100' : ''} flex items-center justify-center relative`}>
                        {article.display_image ? (
                          <img 
                            src={article.display_image} 
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        {article.views > 0 && (
                          <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-medium">
                            {article.views} views
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="text-xs text-gray-600 min-w-0">
                            <div className="font-medium truncate">
                              {article.author ? `By ${article.author}` : 'Support Team'}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">Article</div>
                        <h3 className="font-bold text-gray-900 mb-4 text-base leading-tight min-h-[44px] line-clamp-2">
                          {article.title}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {article.category || 'Knowledge Base'}
                          </span>
                          <span 
                            className="px-4 py-2 text-white rounded text-sm font-medium transition-colors cursor-pointer" 
                            style={{ backgroundColor: COLORS.primary }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = COLORS.primaryHover}
                            onMouseLeave={(e) => e.target.style.backgroundColor = COLORS.primary}
                          >
                            Read
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="text-gray-500 py-8">No articles available yet.</div>
              )}
            </div>
          </div>
        </main>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}