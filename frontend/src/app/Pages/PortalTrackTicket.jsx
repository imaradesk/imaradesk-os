import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import toast from 'react-hot-toast';
import { useTimezone } from '../context/TimezoneContext';

const THEME = {
  primary: '#4a154b',
  gradient: 'linear-gradient(135deg, #4a154b 0%, #165c66 100%)',
};

const STATUS_COLORS = {
  new: 'bg-indigo-100 text-indigo-800',
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  pending: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function PortalTrackTicket({ ticket, comments, activity_logs, search, tenant_name }) {
  const [ticketNumber, setTicketNumber] = useState(search.ticket_number || '');
  const [email, setEmail] = useState(search.email || '');
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localComments, setLocalComments] = useState(comments || []);
  const [activeTab, setActiveTab] = useState('comments');
  const { formatDateTime, formatShortDateTime } = useTimezone();

  const handleSearch = (e) => {
    e.preventDefault();
    router.get('/portal/track-ticket/', {
      ticket_number: ticketNumber,
      email: email,
    });
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      const response = await fetch('/portal/add-comment/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticket_number: ticket.ticket_number,
          email: search.email,
          message: newComment,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Comment added successfully');
        setNewComment('');
        setLocalComments([...localComments, data.comment]);
      } else {
        toast.error(data.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return formatDateTime(dateString);
  };

  const formatShortDate = (dateString) => {
    return formatShortDateTime(dateString);
  };

  return (
    <>
      <Head title={ticket ? `Ticket ${ticket.ticket_number}` : "Track Ticket"} />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header - Themed App Bar */}
        <header className="shadow-sm" style={{ background: THEME.primary }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="/portal/" className="text-2xl font-bold text-white">
                {tenant_name || 'Customer Portal'}
              </Link>
              <Link
                href="/portal/"
                className="text-sm text-white hover:text-gray-200 transition-all"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!ticket && (
            <>
              {/* Page Title */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2" style={{ color: THEME.primary }}>
                  Track Your Ticket
                </h1>
                <p className="text-gray-600">
                  Enter your ticket number and email address to view the status and updates
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Search Form */}
                <div className="lg:col-span-2">
                  <div className="p-6 mb-8">
                    <h2 className="text-xl font-bold mb-4" style={{ color: THEME.primary }}>
                      Find Your Ticket
                    </h2>
                    <form onSubmit={handleSearch} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ticket Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={ticketNumber}
                          onChange={(e) => setTicketNumber(e.target.value)}
                          placeholder="e.g., INC04E5B"
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                          style={{ focusRingColor: THEME.primary }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                          style={{ focusRingColor: THEME.primary }}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 text-white rounded-lg font-medium transition-all hover:opacity-90"
                        style={{ background: THEME.primary }}
                      >
                        🔍 Track Ticket
                      </button>
                    </form>
                  </div>

                  {search.ticket_number && search.email && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center mt-6">
                      <div className="text-4xl mb-4">⚠️</div>
                      <h3 className="text-lg font-semibold mb-2" style={{ color: THEME.primary }}>
                        Ticket Not Found
                      </h3>
                      <p className="text-sm text-gray-600">
                        We couldn't find a ticket matching the provided information. 
                        Please check your ticket number and email address and try again.
                      </p>
                    </div>
                  )}
                </div>

                {/* Sidebar with helpful info */}
                <div className="space-y-6">
                  {/* Status Guide */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: THEME.primary }}>
                      📊 Ticket Status Guide
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">New</span>
                        <p className="text-gray-600 flex-1">Just submitted, awaiting review</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">In Progress</span>
                        <p className="text-gray-600 flex-1">Being worked on by our team</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Pending</span>
                        <p className="text-gray-600 flex-1">Waiting for your response</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Resolved</span>
                        <p className="text-gray-600 flex-1">Issue has been resolved</p>
                      </div>
                    </div>
                  </div>

                  {/* Help Card */}
                  <div className="rounded-lg shadow-sm border-2 p-6" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderColor: THEME.primary }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">💡</span>
                      <h3 className="text-lg font-semibold" style={{ color: THEME.primary }}>
                        Need Help?
                      </h3>
                    </div>
                    <p className="text-sm text-gray-700 mb-4">
                      Your ticket number was sent to your email when you created the ticket. Check your inbox or spam folder.
                    </p>
                    <Link
                      href="/portal/create-ticket/"
                      className="block w-full py-2 text-center border-2 rounded-lg hover:bg-white transition-all text-sm font-medium"
                      style={{ borderColor: THEME.primary, color: THEME.primary }}
                    >
                      Submit New Ticket
                    </Link>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: THEME.primary }}>
                      📞 Other Ways to Reach Us
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Email Support</p>
                        <p className="text-gray-600">support@imaradesk.com</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Business Hours</p>
                        <p className="text-gray-600">Mon-Fri: 9AM - 6PM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {ticket && (
            <>
              {/* Ticket Header */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold" style={{ color: THEME.primary }}>
                          {ticket.subject}
                        </h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
                          {ticket.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Ticket #{ticket.ticket_number}
                      </p>
                    </div>
                    <span className={`px-4 py-2 rounded-lg text-sm font-medium ${PRIORITY_COLORS[ticket.priority]}`}>
                      {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
                    </span>
                  </div>

                  {/* Ticket Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Created</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(ticket.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(ticket.updated_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <p className="text-sm font-medium text-gray-900">
                        {ticket.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {ticket.description}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200">
                  <nav className="flex -mb-px">
                    <button
                      onClick={() => setActiveTab('comments')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'comments'
                          ? 'border-current text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      style={activeTab === 'comments' ? { borderColor: THEME.primary, color: THEME.primary } : {}}
                    >
                      Comments ({localComments.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('activity')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'activity'
                          ? 'border-current text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      style={activeTab === 'activity' ? { borderColor: THEME.primary, color: THEME.primary } : {}}
                    >
                      Activity ({activity_logs?.length || 0})
                    </button>
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'comments' && (
                    <div>
                      {/* Comments List */}
                      {localComments.length > 0 ? (
                        <div className="space-y-6 mb-8">
                          {localComments.map((comment) => (
                            <div
                              key={comment.id}
                              className={`relative pl-6 pb-6 border-l-2 last:pb-0 ${
                                comment.is_guest ? 'border-gray-300' : ''
                              }`}
                              style={!comment.is_guest ? { borderColor: THEME.primary } : {}}
                            >
                              <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2"
                                   style={comment.is_guest ? { borderColor: '#d1d5db' } : { borderColor: THEME.primary }}
                              />
                              <div className="bg-white rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm" style={!comment.is_guest ? { color: THEME.primary } : {}}>
                                      {comment.author}
                                    </span>
                                    {comment.is_guest ? (
                                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">You</span>
                                    ) : (
                                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Support Team</span>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500">{formatShortDate(comment.created_at)}</span>
                                </div>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{comment.message}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <p className="text-sm">No comments yet</p>
                        </div>
                      )}

                      {/* Add Comment Form */}
                      <div className="border-t border-gray-200 pt-6">
                        <h4 className="text-sm font-semibold mb-3 text-gray-700">Add a Comment</h4>
                        <form onSubmit={handleAddComment}>
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Type your message here..."
                            rows="4"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 resize-none"
                            style={{ focusRingColor: THEME.primary }}
                            disabled={isSubmitting}
                          />
                          <div className="flex justify-end mt-3">
                            <button
                              type="submit"
                              disabled={isSubmitting || !newComment.trim()}
                              className="px-6 py-2 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ background: THEME.primary }}
                            >
                              {isSubmitting ? 'Posting...' : 'Post Comment'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {activeTab === 'activity' && (
                    <div>
                      {activity_logs && activity_logs.length > 0 ? (
                        <div className="space-y-4">
                          {activity_logs.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.primary}20` }}>
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: THEME.primary }} />
                              </div>
                              <div className="flex-1 min-w-0 pt-1">
                                <p className="text-sm text-gray-700">{activity.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500">{activity.actor}</span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-500">{formatShortDate(activity.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-sm">No activity yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Help Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                <h3 className="text-lg font-semibold mb-2" style={{ color: THEME.primary }}>
                  Need More Help?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  If you have additional questions or need to provide more information, feel free to add comments above or browse our knowledge base.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/portal/"
                    className="inline-block px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg transition-all hover:bg-gray-50"
                  >
                    Browse Knowledge Base
                  </Link>
                  <Link
                    href="/portal/create-ticket/"
                    className="inline-block px-4 py-2 text-white rounded-lg transition-all"
                    style={{ background: THEME.primary }}
                  >
                    Create New Ticket
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
