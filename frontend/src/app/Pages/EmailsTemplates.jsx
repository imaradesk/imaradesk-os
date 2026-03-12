import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import Modal, { ModalBody, ModalFooter } from '../components/Modal'
import { THEME } from '../constants/theme'

export default function EmailsTemplates({ templates = [], pagination = null }) {
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const [testingTemplate, setTestingTemplate] = useState(null)
  const [viewTemplate, setViewTemplate] = useState(null)
  const [testModal, setTestModal] = useState({ open: false, template: null })
  const [testEmail, setTestEmail] = useState('')
  
  const handleOpenTestModal = (template) => {
    setTestModal({ open: true, template })
    setTestEmail('')
  }
  
  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address')
      return
    }
    
    const template = testModal.template
    setTestingTemplate(template.id)
    
    try {
      const response = await fetch(`/settings/emails/templates/${template.id}/test/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken,
        },
        body: JSON.stringify({ email: testEmail }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
        setTestModal({ open: false, template: null })
        setTestEmail('')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error('Failed to send test email')
    } finally {
      setTestingTemplate(null)
    }
  }
  
  // Use database templates if available, otherwise show empty state
  const displayTemplates = templates.length > 0 ? templates : []

  return (
    <>
      <Head title="Email Templates - Settings" />
      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="emails-templates" />}
          
          <main className="flex-1 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!sidenavOpen && (
                  <button
                    className="p-2 rounded-md hover:bg-gray-100"
                    title="Show Settings Menu"
                    onClick={() => setSidenavOpen(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-500">
                      <path d="M13.5 6 21 12l-7.5 6v-4.5H3v-3h10.5V6z"/>
                    </svg>
                  </button>
                )}
                <h1 className="text-xl font-semibold text-gray-800">Email Templates</h1>
              </div>
              <button className={`${THEME.button.primary} px-4 py-2 rounded-lg flex items-center gap-2`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Template
              </button>
            </div>

            <div className="p-6">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-4">Manage email templates for notifications and communications</p>
                  
                  {displayTemplates.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 mb-4">No email templates found</p>
                      <p className="text-sm text-gray-400">Run: python manage.py coredesk --seed-email-templates</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {displayTemplates.map((template) => (
                            <tr key={template.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{template.name}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-600">{template.subject}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 capitalize">
                                  {template.type}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  template.status === 'active' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {template.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                <button 
                                  onClick={() => handleOpenTestModal(template)}
                                  disabled={testingTemplate === template.id}
                                  className="text-blue-600 hover:text-blue-900 mr-3 disabled:opacity-50"
                                >
                                  {testingTemplate === template.id ? 'Sending...' : 'Test'}
                                </button>
                                <Link 
                                  href={`/settings/emails/templates/${template.id}/edit/`}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  Edit
                                </Link>
                                {/* <button 
                                  onClick={() => setViewTemplate(template)}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  Preview
                                </button> */}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {/* Pagination */}
                  {pagination && pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => router.get(`/settings/emails/templates/?page=${pagination.current_page - 1}`)}
                          disabled={!pagination.has_previous}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => router.get(`/settings/emails/templates/?page=${pagination.current_page + 1}`)}
                          disabled={!pagination.has_next}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing page <span className="font-medium">{pagination.current_page}</span> of{' '}
                            <span className="font-medium">{pagination.total_pages}</span>
                            {' '}({pagination.total_count} total templates)
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                              onClick={() => router.get(`/settings/emails/templates/?page=${pagination.current_page - 1}`)}
                              disabled={!pagination.has_previous}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Previous</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                            {[...Array(pagination.total_pages)].map((_, idx) => {
                              const pageNum = idx + 1;
                              // Show first, last, current, and ±2 from current
                              if (
                                pageNum === 1 ||
                                pageNum === pagination.total_pages ||
                                (pageNum >= pagination.current_page - 2 && pageNum <= pagination.current_page + 2)
                              ) {
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => router.get(`/settings/emails/templates/?page=${pageNum}`)}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                      pageNum === pagination.current_page
                                        ? 'z-10 bg-[#4a154b] border-[#4a154b] text-white'
                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              } else if (
                                pageNum === pagination.current_page - 3 ||
                                pageNum === pagination.current_page + 3
                              ) {
                                return <span key={pageNum} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>;
                              }
                              return null;
                            })}
                            <button
                              onClick={() => router.get(`/settings/emails/templates/?page=${pagination.current_page + 1}`)}
                              disabled={!pagination.has_next}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Next</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </AppShell>

      {/* Test Email Modal */}
      <Modal
        isOpen={testModal.open}
        onClose={() => setTestModal({ open: false, template: null })}
        title="Test Email Template"
        maxWidth="max-w-md"
      >
        <ModalBody>
          <p className="text-sm text-gray-600 mb-4">
            Send a test email to verify the template renders correctly.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email address"
              autoFocus
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            onClick={() => setTestModal({ open: false, template: null })}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSendTestEmail}
            disabled={testingTemplate}
            className="px-4 py-2 bg-[#4a154b] text-white rounded-md hover:bg-[#0a2f33] disabled:opacity-50"
          >
            {testingTemplate ? 'Sending...' : 'Send Test'}
          </button>
        </ModalFooter>
      </Modal>

      {/* Preview Template Modal */}
      {/* <Modal
        isOpen={!!viewTemplate}
        onClose={() => setViewTemplate(null)}
        title={viewTemplate?.name || 'Template Preview'}
        maxWidth="max-w-4xl"
      >
        <ModalBody>
          {viewTemplate && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Subject</h3>
                <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                  {viewTemplate.subject}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">HTML Body</h3>
                <div className="border border-gray-200 rounded-md p-4 bg-white max-h-96 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: viewTemplate.body_html }} />
                </div>
              </div>
              
              {viewTemplate.available_variables && Object.keys(viewTemplate.available_variables).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Available Variables</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(viewTemplate.available_variables).map(([key, desc]) => (
                      <div key={key} className="text-xs">
                        <span className="font-mono text-blue-600">{`{{${key}}}`}</span>
                        <span className="text-gray-500"> - {desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <button
            onClick={() => setViewTemplate(null)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </ModalFooter>
      </Modal> */}
    </>
  )
}
