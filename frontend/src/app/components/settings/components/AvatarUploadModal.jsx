import React from 'react'
import { ImagePlus } from 'lucide-react'
import Modal, { ModalBody, ModalButton } from '../../Modal'
import FileUpload from '../../FileUpload'

const MAX_SIZE = 5 * 1024 * 1024

export default function AvatarUploadModal({
  isOpen,
  onClose,
  avatarUrl,
  onUpload,
  onRemove,
  isRemoving = false,
}) {
  // Let the finished progress bar show for a moment before closing
  const handleSuccess = () => setTimeout(onClose, 700)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update company logo"
      description="Shown across your workspace and customer portal."
      icon={ImagePlus}
      size="md"
      footer={<ModalButton onClick={onClose}>Close</ModalButton>}
    >
      <ModalBody className="space-y-5">
        {/* Remounts on each open so a previous upload never lingers */}
        <FileUpload
          accept="image/*"
          maxSize={MAX_SIZE}
          hint="PNG, JPG, GIF up to 5MB"
          onUpload={onUpload}
          onSuccess={handleSuccess}
        />

        {avatarUrl && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <img src={avatarUrl} alt="Current logo" className="w-12 h-12 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">Current logo</p>
              <p className="text-xs text-gray-500">Upload a new image above to replace it</p>
            </div>
            <ModalButton variant="ghost" onClick={onRemove} loading={isRemoving} className="!text-red-600 hover:!bg-red-50">
              Remove
            </ModalButton>
          </div>
        )}
      </ModalBody>
    </Modal>
  )
}
