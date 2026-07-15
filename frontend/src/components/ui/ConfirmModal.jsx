import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

// A yes/no confirmation dialog, replacing native window.confirm() for
// destructive/impactful actions (archiving a patient, etc.).
export default function ConfirmModal({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'primary',
  onConfirm
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {isOpen && (
        <>
          <p className="text-sm text-text-muted">{description}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant={tone} onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? 'Working…' : confirmLabel}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
