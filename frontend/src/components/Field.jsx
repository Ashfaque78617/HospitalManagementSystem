/** Labelled form control with inline validation message. */
export default function Field({ label, error, required, hint, children, className = "" }) {
  return (
    <div className={className}>
      <label className="form-label">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && !error && <div className="form-text">{hint}</div>}
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  );
}

export const inputClass = (error) => `form-control ${error ? "is-invalid" : ""}`;
export const selectClass = (error) => `form-select ${error ? "is-invalid" : ""}`;
