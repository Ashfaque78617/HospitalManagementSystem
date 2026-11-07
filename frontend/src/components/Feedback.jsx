export function Loading({ label = "Loading…" }) {
  return (
    <div className="empty" role="status">
      <div className="spinner-border text-primary mb-2" aria-hidden="true" />
      <div>{label}</div>
    </div>
  );
}

export function EmptyState({ icon = "bi-inbox", title, hint, children }) {
  return (
    <div className="empty">
      <i className={`bi ${icon}`} />
      <div className="fw-semibold mt-2">{title}</div>
      {hint && <div className="small">{hint}</div>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function ErrorAlert({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
      <span><i className="bi bi-exclamation-triangle me-2" />{message}</span>
      {onRetry && <button className="btn btn-sm btn-outline-danger" onClick={onRetry}>Try again</button>}
    </div>
  );
}
