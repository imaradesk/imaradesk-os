import React from 'react'
import Drawer from '../../Drawer'
import { COLORS } from '../../../constants/theme'

export default function ChangePasswordDrawer({
  isOpen,
  onClose,
  passwordData,
  setPasswordData,
  onSubmit,
  isChanging,
}) {
  const handleClose = () => {
    setPasswordData({ current: '', new: '', confirm: '' })
    onClose()
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Password"
      size="sm"
      floating
    >
      <div className="p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Current Password</label>
          <input 
            type="password" 
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0B3D26] focus:border-[#0B3D26] transition-all duration-200 outline-none"
            value={passwordData.current}
            onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
            placeholder="Enter current password" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">New Password</label>
          <input 
            type="password" 
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0B3D26] focus:border-[#0B3D26] transition-all duration-200 outline-none"
            value={passwordData.new}
            onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
            placeholder="Enter new password" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
          <input 
            type="password" 
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0B3D26] focus:border-[#0B3D26] transition-all duration-200 outline-none"
            value={passwordData.confirm}
            onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
            placeholder="Confirm new password" 
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isChanging}
            className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: COLORS.primary }}
          >
            {isChanging ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </Drawer>
  )
}
