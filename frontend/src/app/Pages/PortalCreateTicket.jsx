import React, { useState, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import toast from 'react-hot-toast';
import api from '../../utils/axios';
import RichEditor from '../components/RichEditor';

const THEME = {
  primary: '#4a154b',
  gradient: 'linear-gradient(135deg, #4a154b 0%, #165c66 100%)',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
];

export default function PortalCreateTicket({ suggest_kb, suggested_articles, tenant_name, webChannelActive = true }) {
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
  const [attachments, setAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Validate files
    const validFiles = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type.`);
        continue;
      }
      validFiles.push(file);
    }

    if (!validFiles.length) return;

    setUploadingFiles(true);
    const uploadedFiles = [];

    for (const file of validFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'ticket-attachments');

        const response = await api.post('/api/upload-file/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const result = response.data;
        if (result.success && result.file_url) {
          uploadedFiles.push({
            url: result.file_url,
            name: file.name,
            size: file.size,
            type: file.type,
          });
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploadedFiles.length > 0) {
      setAttachments(prev => [...prev, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
    }

    setUploadingFiles(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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
      const response = await api.post('/portal/submit-ticket/', {
        ...formData,
        attachments: attachments,
      });

      console.log('Response received:', response);
      console.log('Response status:', response.status);

      const data = response.data;
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
          <div className="max-w-md w-full rounded-lg p-8 text-center">
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
          {/* Web Channel Inactive Alert */}
          {!webChannelActive && (
            <div className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-amber-800">Ticket Submission Unavailable</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    We're currently not accepting new ticket submissions through this channel. Please try again later or contact us through an alternative method.
                  </p>
                  <Link 
                    href="/portal/"
                    className="inline-block mt-3 text-sm font-medium text-amber-800 underline hover:text-amber-900"
                  >
                    ← Return to Portal Home
                  </Link>
                </div>
              </div>
            </div>
          )}

          {webChannelActive && (
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
                    <RichEditor
                      value={formData.description}
                      onChange={(html) => setFormData(prev => ({ ...prev, description: html }))}
                      placeholder="Please provide as much detail as possible..."
                      minHeight={200}
                    />
                  </div>

                  {/* File Attachments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Attachments
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                      />
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M24 32V16m0 0l-6 6m6-6l6 6M8 40h32a2 2 0 002-2V10a2 2 0 00-2-2H8a2 2 0 00-2 2v28a2 2 0 002 2z" />
                      </svg>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingFiles}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
                          style={{ focusRingColor: THEME.primary }}
                        >
                          {uploadingFiles ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Choose Files
                            </>
                          )}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        PNG, JPG, GIF, PDF, DOC, XLS up to 10MB each
                      </p>
                    </div>

                    {/* Uploaded files list */}
                    {attachments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || uploadingFiles}
                    className={`w-full py-3 text-white rounded-lg font-medium transition-all ${
                      isSubmitting || uploadingFiles ? 'opacity-50 cursor-not-allowed' : ''
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
              <div className="-sm border-2 p-6" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderColor: THEME.primary }}>
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
              <div className="bg-white -sm border border-gray-200 p-6">
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
                <div className="bg-white -sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-3" style={{ color: THEME.primary }}>
                    📚 Helpful Articles
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Check if these articles solve your issue:
                  </p>
                  <div className="space-y-3">
                    {suggested_articles.map((article) => (
                      <Link
                        key={article.uuid}
                        href={`/portal/kb/${article.uuid}/`}
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
          )}
        </div>
      </div>
    </>
  );
}
