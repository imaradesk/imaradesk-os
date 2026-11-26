import React from 'react'
import Drawer from '../../Drawer'
import Select from '../../SearchableSelect'
import { COLORS } from '../../../constants/theme'

const businessTypeOptions = [
  { id: 'Software', name: 'Software & Technology' },
  { id: 'Insurance', name: 'Insurance' },
  { id: 'Healthcare', name: 'Healthcare' },
  { id: 'Finance', name: 'Finance & Banking' },
  { id: 'Retail', name: 'Retail & E-commerce' },
  { id: 'Manufacturing', name: 'Manufacturing' },
  { id: 'Education', name: 'Education' },
  { id: 'Government', name: 'Government' },
  { id: 'Consulting', name: 'Consulting' },
  { id: 'NonProfit', name: 'Non-Profit' },
  { id: 'Other', name: 'Other' },
]

const orgSizeOptions = [
  { id: '1-10', name: '1-10 employees' },
  { id: '11-50', name: '11-50 employees' },
  { id: '51-200', name: '51-200 employees' },
  { id: '201-500', name: '201-500 employees' },
  { id: '501-1000', name: '501-1000 employees' },
  { id: '1001+', name: '1001+ employees' },
]

export default function EditWorkspaceDrawer({
  isOpen,
  onClose,
  companyName,
  setCompanyName,
  businessType,
  setBusinessType,
  orgSize,
  setOrgSize,
  companyDescription,
  setCompanyDescription,
  onSave,
  onCancel,
  isSaving,
}) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Workspace Details"
      size="md"
      floating
    >
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Company Name</label>
            <input 
              type="text" 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0B3D26] focus:border-[#0B3D26] transition-all duration-200 outline-none"
              value={companyName} 
              onChange={(e) => setCompanyName(e.target.value)} 
              placeholder="Enter company name" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Business Type</label>
            <Select
              value={businessType}
              onChange={setBusinessType}
              options={businessTypeOptions}
              placeholder="Select business type"
              displayKey="name"
              valueKey="id"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Organization Size</label>
            <Select
              value={orgSize}
              onChange={setOrgSize}
              options={orgSizeOptions}
              placeholder="Select organization size"
              displayKey="name"
              valueKey="id"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea 
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0B3D26] focus:border-[#0B3D26] transition-all duration-200 outline-none resize-none"
            rows="3" 
            value={companyDescription} 
            onChange={(e) => setCompanyDescription(e.target.value)} 
            placeholder="Brief description of your company"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: COLORS.primary }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Drawer>
  )
}

// Export options for reuse
export { businessTypeOptions, orgSizeOptions }
