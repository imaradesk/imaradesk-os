import React from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import Modal, { ModalBody, ModalButton } from './Modal'

/** Yes/no confirmation built on the shared Modal. */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmStyle = 'danger', // 'danger' or 'primary'
  icon,
  zIndex,
}) {
  const danger = confirmStyle === 'danger'

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon || (danger ? AlertTriangle : HelpCircle)}
      tone={danger ? 'danger' : 'default'}
      size="md"
      zIndex={zIndex}
      footer={(
        <>
          {/* Destructive actions focus Cancel so Enter can't confirm by accident */}
          <ModalButton variant="secondary" onClick={onClose} data-autofocus={danger || undefined}>{cancelText}</ModalButton>
          <ModalButton variant={danger ? 'danger' : 'primary'} onClick={handleConfirm} data-autofocus={!danger || undefined}>{confirmText}</ModalButton>
        </>
      )}
    >
      <ModalBody className="!py-5">
        {typeof message === 'string' ? <p className="text-sm text-gray-600">{message}</p> : message}
      </ModalBody>
    </Modal>
  )
}
