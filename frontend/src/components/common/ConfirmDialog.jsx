import Modal from './Modal';

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Confirm', tone = 'primary', loading }) {
  const toneClasses = {
    primary: 'bg-primary hover:bg-primary-dark',
    error: 'bg-error hover:bg-error/90',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-background">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${toneClasses[tone]}`}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink">{message}</p>
    </Modal>
  );
}
