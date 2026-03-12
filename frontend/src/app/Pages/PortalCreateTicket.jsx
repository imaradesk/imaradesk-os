import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import toast from 'react-hot-toast';

const THEME = {
  primary: '#4a154b',
  gradient: 'linear-gradient(135deg, #4a154b 0%, #165c66 100%)',
};

export default function PortalCreateTicket({ suggest_kb, suggested_articles, tenant_name }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validate form
    if (!formData.name || !formData.email || !formData.subject || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (isSubmitting) {
      console.log('Already submitting, ignoring...');
      return;
    }
    
    setIsSubmitting(true);
    console.log('Submitting ticket with data:', formData);

    try {
      console.log('Making fetch request to /portal/submit-ticket/');
      const response = await fetch('/portal/submit-ticket/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      console.log('Response received:', response);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        setTicketCreated(true);
        setTicketNumber(data.ticket_number);
        toast.success('Ticket created successfully!');
      } else {
        toast.error(data.message || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Ticket submission error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (ticketCreated) {
    return (
      <>
        <Head title="Ticket Created" />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-4" style={{ color: THEME.primary }}>
              Ticket Created Successfully!
            </h1>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600 mb-2">Your Ticket Number:</p>
              <p className="text-2xl font-bold" style={{ color: THEME.primary }}>
                {ticketNumber}
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              A confirmation email has been sent to <strong>{formData.email}</strong>.
              You can use your ticket number to track the status of your request.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/portal/track-ticket/"
                className="px-6 py-2 text-white rounded-lg transition-all"
                style={{ background: THEME.primary }}
              >
                Track Ticket
              </Link>
              <Link
                href="/portal/"
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head title="Submit Ticket" />
      
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

        {/* Page Title Section */}
        <div className="py-8 px-4" style={{ background: THEME.primary }}>
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2">
              Submit a Support Ticket
            </h1>
            <p className="text-white opacity-90">
              We're here to help! Fill out the form below and our team will get back to you as soon as possible.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className=" rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold mb-4" style={{ color: THEME.primary }}>
                  Contact Information
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                      style={{ focusRingColor: THEME.primary }}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                      style={{ focusRingColor: THEME.primary }}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                      style={{ focusRingColor: THEME.primary }}
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                      style={{ focusRingColor: THEME.primary }}
                      placeholder="Brief description of your issue"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                      style={{ focusRingColor: THEME.primary }}
                      placeholder="Please provide as much detail as possible..."
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 text-white rounded-lg font-medium transition-all ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{ background: THEME.primary }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Facts */}
              <div className="rounded-lg shadow-sm border-2 p-6" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderColor: THEME.primary }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">⚡</span>
                  <h3 className="text-lg font-semibold" style={{ color: THEME.primary }}>
                    Fast Response
                  </h3>
                </div>
                <p className="text-sm text-gray-700">
                  Our average response time is under 2 hours during business hours.
                </p>
              </div>

              {/* Help Tips */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-3" style={{ color: THEME.primary }}>
                  💡 Tips for Faster Support
                </h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Be specific about your issue</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Include error messages if any</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Mention steps to reproduce the problem</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Attach screenshots if helpful</span>
                  </li>
                </ul>
              </div>

              {/* Suggested Articles */}
              {suggest_kb && suggested_articles.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-3" style={{ color: THEME.primary }}>
                    📚 Helpful Articles
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Check if these articles solve your issue:
                  </p>
                  <div className="space-y-3">
                    {suggested_articles.map((article) => (
                      <Link
                        key={article.id}
                        href={`/portal/kb/${article.id}/`}
                        className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                      >
                        <h4 className="text-sm font-medium mb-1" style={{ color: THEME.primary }}>
                          {article.title}
                        </h4>
                        <p className="text-xs text-gray-600">{article.excerpt}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
