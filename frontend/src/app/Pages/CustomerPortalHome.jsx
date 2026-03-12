import React, { useState, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { THEME, COLORS } from '../constants/theme';

export default function CustomerPortalHome({ portal_settings, categories, popular_articles, latest_articles, most_viewed_articles, announcements }) {
  const { props } = usePage();
  const currentUser = props.auth?.user || { first_name: 'Titus' };
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollContainerRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.visit(`/portal/kb-search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // User stats
  const userStats = {
    openTickets: 2,
    resolvedTickets: 15,
    totalTickets: 17,
    pendingTickets: 1,
    inProgress: 1,
    closedThisMonth: 8,
  };

  // Combine KB articles for featured section
  const featuredArticles = [
    ...(popular_articles || []),
    ...(latest_articles || []),
    ...(most_viewed_articles || [])
  ].slice(0, 8); // Limit to 8 articles

  // Welcome slides
  const slides = [
    {
      title: portal_settings?.portal_title || "Support Portal",
      description: "Welcome to your customer support portal. Get help, browse articles, and track your tickets.",
      icon: "🎯",
      number: 1,
      color: "from-gray-800 to-gray-900"
    },
    {
      title: "Get Help Fast",
      description: "Search our knowledge base or submit a ticket to get the support you need.",
      icon: "💬",
      number: 2,
      color: "from-blue-600 to-blue-700"
    },
    {
      title: "Knowledge Base",
      description: "Browse helpful articles and guides to find answers to common questions.",
      icon: "📚",
      number: 3,
      color: "from-purple-600 to-purple-700"
    },
    {
      title: "Track Tickets",
      description: "Monitor the status of your support requests and view ticket history.",
      icon: "📋",
      number: 4,
      color: "from-gray-600 to-gray-700"
    }
  ];

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
          fixed lg:static
          w-80 bg-white border-r border-gray-200
          flex flex-col
          h-full
          transition-transform duration-300
          z-40
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
              <Link href="/portal/create-ticket/" className="block w-full px-4 py-2 text-sm text-white text-center rounded transition-colors" style={{ backgroundColor: COLORS.primary }}>
                Create Ticket
              </Link>
              <Link href="/portal/kb/" className="block w-full px-4 py-2 text-sm text-center rounded border border-gray-300 hover:bg-gray-50 transition-colors">
                Browse KB
              </Link>
              <Link href="/portal/track-ticket/" className="block w-full px-4 py-2 text-sm text-center rounded border border-gray-300 hover:bg-gray-50 transition-colors">
                Track Ticket
              </Link>
            </div>
          </div>

          {/* Ticket Overview */}
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
                <div className="text-2xl font-bold text-gray-900 mb-1">{userStats.closedThisMonth}</div>
                <div className="text-xs text-gray-600 uppercase">Closed This Month</div>
              </div>
            </div>
          </div>

          {/* Open Tickets Section */}
          <div className="p-6 border-b border-gray-200 flex-1">
            <div className="px-4 py-2 mb-4 font-semibold text-sm text-white" style={{ backgroundColor: COLORS.primary }}>
              OPEN TICKETS
            </div>
            <div className="space-y-3">
              <div className="text-center py-8 text-gray-500 text-sm">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                </svg>
                <p>No open tickets</p>
                <Link href="/portal/create-ticket/" className="text-sm font-medium mt-2 inline-block" style={{ color: COLORS.primary }}>
                  Create your first ticket
                </Link>
              </div>
            </div>
          </div>

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
              <Link href="/portal/surveys/" className="block border border-gray-200 rounded p-3 bg-white hover:shadow-sm transition-shadow">
                <h4 className="font-medium text-sm text-gray-900 mb-2">📝 Customer Survey</h4>
                <div className="text-xs text-gray-600 mb-3">Help us improve by sharing your feedback</div>
                <span className="text-sm font-medium" style={{ color: COLORS.primary }}>
                  Take Survey →
                </span>
              </Link>
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

            {/* Slide Indicators */}
            <div className="flex justify-center gap-2 mt-6 md:mt-8 relative z-10">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    activeSlide === index ? 'w-8' : 'w-2'
                  }`}
                  style={{ backgroundColor: 'white', opacity: activeSlide === index ? 1 : 0.4 }}
                />
              ))}
            </div>
          </div>

          {/* Welcome Carousel */}
          <div className="bg-white px-4 md:px-8 lg:px-12 py-6 md:py-8 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl">
              {/* Main Featured Slide */}
              <div className={`md:col-span-1 lg:col-span-2 bg-gradient-to-br ${slides[activeSlide].color} rounded-2xl p-6 md:p-8 text-white relative overflow-hidden min-h-[280px] md:min-h-[320px] flex flex-col justify-between`}>
                <div className="absolute top-4 md:top-6 right-4 md:right-6 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-lg md:text-xl font-bold">
                  {slides[activeSlide].number}
                </div>
                <div>
                  <div className="text-5xl md:text-6xl lg:text-7xl mb-4 md:mb-6">{slides[activeSlide].icon}</div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 leading-tight">{slides[activeSlide].title}</h2>
                  <p className="text-white text-opacity-90 text-base md:text-lg leading-relaxed">{slides[activeSlide].description}</p>
                </div>
                {activeSlide === 0 && (
                  <div className="space-y-2 mt-4 md:mt-6 hidden md:block">
                    <p className="text-white text-opacity-90 text-sm">Need help? We're here for you 24/7.</p>
                    <div className="text-white text-opacity-90 text-sm space-y-1">
                      <p className="font-semibold text-white">Getting Started:</p>
                      <p><span className="font-semibold">Step 1:</span> Search our knowledge base for answers</p>
                      <p><span className="font-semibold">Step 2:</span> Browse articles by category</p>
                      <p><span className="font-semibold">Step 3:</span> Create a support ticket if needed</p>
                      <p><span className="font-semibold">Step 4:</span> Track your ticket status in real-time</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Slides */}
              {slides.filter((_, i) => i !== activeSlide).slice(0, 3).map((slide, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(slides.indexOf(slide))}
                  className={`${idx > 0 ? 'hidden lg:flex' : 'hidden md:flex'} bg-gradient-to-br ${slide.color} rounded-2xl p-6 text-white text-left hover:scale-105 transition-transform relative overflow-hidden min-h-[280px] md:min-h-[320px] flex-col justify-between`}
                >
                  <div>
                    <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-lg font-bold">
                      {slide.number}
                    </div>
                    <div className="text-5xl mb-4">{slide.icon}</div>
                    <h3 className="font-bold text-xl mb-3 leading-tight">{slide.title}</h3>
                    <p className="text-white text-opacity-80 text-sm leading-relaxed">{slide.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

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
                      key={article.id}
                      href={`/portal/kb/${article.id}/`}
                      className="flex-shrink-0 w-64 md:w-72 bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                    >
                      <div className={`h-48 bg-gradient-to-br ${color} flex items-center justify-center relative p-6`}>
                        <div className="text-white text-5xl">📄</div>
                        {article.views && (
                          <div className="absolute top-4 right-4 bg-white bg-opacity-20 px-3 py-1 rounded-full text-white text-xs font-medium">
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

              {/* Additional cards from categories if available */}
              {categories && categories.slice(0, 2).map((category) => (
                <div key={category.id} className="flex-shrink-0 w-64 md:w-72 bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                  <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-6xl">
                    {category.icon || '📚'}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0"></div>
                      <div className="text-xs text-gray-600 min-w-0">
                        <div className="font-medium truncate">Created by Support Team</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">Category</div>
                    <h3 className="font-bold text-gray-900 mb-4 text-base leading-tight min-h-[44px]">{category.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{category.article_count || 0} Articles</span>
                      <button 
                        className="px-4 py-2 text-white rounded text-sm font-medium transition-colors"
                        style={{ backgroundColor: COLORS.primary }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = COLORS.primaryHover}
                        onMouseLeave={(e) => e.target.style.backgroundColor = COLORS.primary}
                      >
                        Browse
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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