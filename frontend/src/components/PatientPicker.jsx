import { useEffect, useState } from "react";
import { http } from "../api/client";
import { useDebounce } from "../hooks/useApi";

/** Type-ahead search for patients. value = { patientId, fullName, patientCode } | null */
export default function PatientPicker({ value, onChange, disabled, invalid }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(term);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    http.get("/patients/lookup", { search: debounced }).then((r) => alive && setResults(r)).catch(() => {});
    return () => { alive = false; };
  }, [debounced, open]);

  if (value) {
    return (
      <div className="d-flex align-items-center justify-content-between border rounded px-3 py-2 bg-white">
        <div>
          <div className="fw-semibold">{value.fullName}</div>
          <div className="small text-muted">{value.patientCode}{value.phone ? ` · ${value.phone}` : ""}</div>
        </div>
        {!disabled && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onChange(null)}>Change</button>}
      </div>
    );
  }

  return (
    <div className="picker">
      <input
        className={`form-control ${invalid ? "is-invalid" : ""}`}
        placeholder="Search by name, phone or patient code"
        value={term}
        onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="picker-list">
          {results.length === 0 && <div className="p-3 text-muted small">No active patients match.</div>}
          {results.map((p) => (
            <button type="button" key={p.patientId} className="picker-item" onMouseDown={() => { onChange(p); setTerm(""); }}>
              <div className="fw-semibold">{p.fullName}</div>
              <div className="small text-muted">{p.patientCode} · {p.phone}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
