import { useEffect } from "react";

export default function Modal({ title, onClose, children, footer, width = 520 }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-shell" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ "--w": `${width}px` }}>
        <header>
          <h2>{title}</h2>
          <button className="btn-close" aria-label="Close" onClick={onClose} />
        </header>
        <div className="body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, message, confirmLabel = "Confirm", danger, busy, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Keep as is</button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}{confirmLabel}
          </button>
        </>
      }
    >
      <p className="mb-0">{message}</p>
    </Modal>
  );
}
