import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import Modal, { ModalBody, ModalFooter } from '../components/Modal'
import DataTable from '../../components/DataTable'
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
              <p className="text-sm text-gray-600 mb-4">Manage email templates for notifications and communications</p>
              <DataTable
                data={displayTemplates}
                defaultPageSize={25}
                columns={[
                  {
                    key: 'name',
                    header: 'Template Name',
                    render: (template) => <div className="font-medium text-gray-900">{template.name}</div>,
                  },
                  {
                    key: 'subject',
                    header: 'Subject',
                    render: (template) => <div className="text-sm text-gray-600">{template.subject}</div>,
                  },
                  {
                    key: 'type',
                    header: 'Type',
                    render: (template) => (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 capitalize">
                        {template.type}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (template) => (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        template.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {template.status}
                      </span>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    sortable: false,
                    hideable: false,
                    render: (template) => (
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenTestModal(template); }}
                          disabled={testingTemplate === template.id}
                          className="text-sm text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          {testingTemplate === template.id ? 'Sending...' : 'Test'}
                        </button>
                        <Link 
                          href={`/settings/emails/templates/${template.id}/edit/`}
                          className="text-sm text-blue-600 hover:text-blue-900"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Edit
                        </Link>
                      </div>
                    ),
                  },
                ]}
              />
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
