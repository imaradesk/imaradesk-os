import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
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

export default function PortalTicketView({ ticket, comments, activity_logs, search }) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localComments, setLocalComments] = useState(comments || []);
  const [activeTab, setActiveTab] = useState('comments');
  const { formatDateTime, formatShortDateTime } = useTimezone();

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
      <Head title={`Ticket ${ticket.ticket_number}`} />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header - Themed App Bar */}
        <header className="shadow-sm" style={{ background: THEME.primary }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="/portal/" className="text-2xl font-bold text-white">
                Customer Portal
              </Link>
              <Link
                href="/portal/track-ticket/"
                className="text-sm text-white hover:text-gray-200 transition-all"
              >
                ← Back to Track Ticket
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                          className={`relative pl-6 pb-6 border-l-2 ${
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
        </div>
      </div>
    </>
  );
}
