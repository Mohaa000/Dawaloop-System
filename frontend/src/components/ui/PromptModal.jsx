import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

// A single-field text/email/textarea prompt, replacing native window.prompt()
// with something that matches the rest of the UI. The form only mounts while
// isOpen — that gives it a fresh useState('') each time instead of needing an
// effect to reset stale input from the previous open.
export default function PromptModal({ isOpen, onClose, title, ...formProps }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {isOpen && <PromptForm onClose={onClose} {...formProps} />}
    </Modal>
  );
}

function PromptForm({ onClose, label, placeholder, submitLabel = 'Save', multiline = false, type = 'text', onSubmit }) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(value.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-control border border-border bg-bg-base px-3 py-2.5 text-sm outline-none focus:border-primary';

  return (
    <form onSubmit={handleSubmit}>
      {label && <label className="mb-1.5 block text-xs font-semibold uppercase text-text-muted">{label}</label>}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={4}
          autoFocus
          className={inputClass}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className={inputClass}
        />
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting || !value.trim()}>{isSubmitting ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  );
}
