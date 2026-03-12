import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import SettingsSidenav from '../components/SettingsSidenav'
import Select from '../components/SearchableSelect'
import Alert from '../components/Alert'
import { THEME } from '../constants/theme'

export default function EditEmailTemplate({ template = null }) {
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const [errorAlert, setErrorAlert] = useState(null)
  
  const [formData, setFormData] = useState({
    name: template?.name || '',
    template_type: template?.template_type || '',
    subject: template?.subject || '',
    body_text: template?.body_text || '',
    status: template?.status || 'active',
  })

  const availableVariables = template?.available_variables || {}

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const url = `/settings/emails/templates/${template.id}/update/`
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken,
        },
        body: JSON.stringify(formData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Email template updated successfully!')
        router.visit('/settings/emails/templates/')
      } else {
        let errorMessage = ''
        if (data.errors && typeof data.errors === 'object') {
          const errorList = Object.keys(data.errors).map(key => {
            const errors = Array.isArray(data.errors[key]) ? data.errors[key] : [data.errors[key]]
            return `${key}: ${errors.join(', ')}`
          })
          errorMessage = errorList.join('. ')
        } else {
          errorMessage = data.message || 'Unknown error occurred'
        }
        setErrorAlert({ title: 'Failed to update template', message: errorMessage })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (error) {
      setErrorAlert({ 
        title: 'Failed to update template', 
        message: 'Please check your connection and try again.' 
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const insertVariable = (variable) => {
    const textarea = document.getElementById('body_text')
    const cursorPos = textarea.selectionStart
    const textBefore = formData.body_text.substring(0, cursorPos)
    const textAfter = formData.body_text.substring(cursorPos)
    const newText = textBefore + `{{${variable}}}` + textAfter
    setFormData({ ...formData, body_text: newText })
    
    // Focus back on textarea
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorPos + variable.length + 4, cursorPos + variable.length + 4)
    }, 0)
  }

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' },
  ]

  return (
    <>
      <Head title="Edit Email Template" />
      <AppShell active="settings">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          {sidenavOpen && <SettingsSidenav activeSection="emails-templates" />}

          <main className="flex-1 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
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
              <h1 className="text-xl font-semibold text-gray-800">Edit Email Template</h1>
            </div>

            <div className="p-6">
              {errorAlert && (
                <Alert
                  type="error"
                  title={errorAlert.title}
                  message={errorAlert.message}
                  onClose={() => setErrorAlert(null)}
                  className="mb-6"
                />
              )}

              <div className="max-w-4xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Details</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Template Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Template Type
                        </label>
                        <input
                          type="text"
                          value={formData.template_type}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Template type cannot be changed</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <Select
                          value={formData.status}
                          onChange={(value) => setFormData({ ...formData, status: value })}
                          options={statusOptions}
                          placeholder="Select status"
                          displayKey="label"
                          valueKey="value"
                          searchable={false}
                          allowClear={false}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Subject
                        </label>
                        <input
                          type="text"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Ticket #{{ticket_number}} Created"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Content</h2>
                    <p className="text-sm text-gray-500 mb-4">
                      Write your email content as plain text. The template will be automatically styled with a consistent header and footer.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Body
                        </label>
                        <textarea
                          id="body_text"
                          value={formData.body_text}
                          onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                          rows={14}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Hi {{customer_name}},

Your support ticket has been created successfully.

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}

We will respond as soon as possible.

Thank you,
{{company_name}} Support Team"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Use double line breaks for paragraphs. Variables like {"{{ticket_number}}"} will be replaced with actual values.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3">Available Variables</h3>
                    <p className="text-sm text-blue-700 mb-3">Click to insert into template:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(availableVariables).map((variable) => (
                        <button
                          key={variable}
                          type="button"
                          onClick={() => insertVariable(variable)}
                          className="px-3 py-1.5 bg-white border border-blue-300 rounded-md text-sm font-mono text-blue-700 hover:bg-blue-50 transition-colors"
                          title={availableVariables[variable]}
                        >
                          {`{{${variable}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <Link
                      href="/settings/emails/templates/"
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#4a154b] text-white rounded-md hover:bg-[#0a2f33]"
                    >
                      Update Template
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </main>
        </div>
      </AppShell>
    </>
  )
}
