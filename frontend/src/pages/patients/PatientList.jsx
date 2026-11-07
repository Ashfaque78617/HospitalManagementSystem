import { useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage, http } from "../../api/client";
import { EmptyState, ErrorAlert, Loading } from "../../components/Feedback";
import Hero from "../../components/Hero";
import { ConfirmModal } from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusPill from "../../components/StatusPill";
import { ROLES, useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { IMAGES } from "../../config/images";
import { useApi, useDebounce } from "../../hooks/useApi";
import { fmtDate } from "../../utils/format";

export default function PatientList() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const canEdit = hasRole(ROLES.Admin, ROLES.Receptionist);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("true");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const q = useDebounce(search);

  const { data, loading, error, reload } = useApi(
    () => http.get("/patients", { search: q, isActive: status, page, pageSize: 10 }),
    [q, status, page]
  );

  const toggle = async () => {
    setBusy(true);
    try {
      await http.patch(`/patients/${target.patientId}/status`, { isActive: !target.isActive });
      toast.success(target.isActive ? "Patient deactivated." : "Patient reactivated.");
      setTarget(null);
      reload();
    } catch (e) {
      toast.error(getErrorMessage(e));
      setTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Hero image={IMAGES.patients} title="Patients" subtitle="Find a patient, open their record or register someone new.">
        {canEdit && <Link to="/patients/new" className="btn btn-light"><i className="bi bi-person-plus me-1" />Register patient</Link>}
      </Hero>

      <div className="panel">
        <div className="filter-bar row g-2">
          <div className="col-md-7">
            <input className="form-control" placeholder="Search by name, phone or patient code" aria-label="Search patients"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="col-md-3">
            <select className="form-select" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="true">Active patients</option>
              <option value="false">Inactive patients</option>
              <option value="">All patients</option>
            </select>
          </div>
        </div>

        <ErrorAlert message={error} onRetry={reload} />
        {loading && !data ? <Loading /> : data?.items.length === 0 ? (
          <EmptyState icon="bi-person-x" title="No patients found" hint="Try a different search or filter.">
            {canEdit && <Link to="/patients/new" className="btn btn-primary btn-sm">Register patient</Link>}
          </EmptyState>
        ) : (
          <div className="table-responsive">
            <table className="table table-clean">
              <thead><tr><th>Code</th><th>Patient</th><th>Phone</th><th>Blood group</th><th>Registered</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data?.items.map((p) => (
                  <tr key={p.patientId}>
                    <td className="fw-semibold">{p.patientCode}</td>
                    <td>
                      <Link to={`/patients/${p.patientId}`} className="fw-semibold text-decoration-none">{p.fullName}</Link>
                      <div className="small text-muted">{[p.age != null && `${p.age} yrs`, p.gender].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td>{p.phone}</td>
                    <td>{p.bloodGroup ?? "—"}</td>
                    <td>{fmtDate(p.createdDate)}</td>
                    <td><StatusPill status={p.isActive ? "Active" : "Inactive"} /></td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/patients/${p.patientId}`} className="btn btn-outline-primary icon-btn" title="View" aria-label="View"><i className="bi bi-eye" /></Link>
                        {canEdit && <Link to={`/patients/${p.patientId}/edit`} className="btn btn-outline-secondary icon-btn" title="Edit" aria-label="Edit"><i className="bi bi-pencil" /></Link>}
                        {canEdit && (
                          <button className={`btn icon-btn ${p.isActive ? "btn-outline-danger" : "btn-outline-success"}`}
                            title={p.isActive ? "Deactivate" : "Reactivate"} aria-label={p.isActive ? "Deactivate" : "Reactivate"} onClick={() => setTarget(p)}>
                            <i className={`bi ${p.isActive ? "bi-person-dash" : "bi-person-check"}`} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination data={data} onPage={setPage} />
      </div>

      {target && (
        <ConfirmModal
          title={target.isActive ? "Deactivate patient?" : "Reactivate patient?"}
          message={target.isActive
            ? `${target.fullName} will no longer be selectable for new appointments or invoices. Their history stays intact.`
            : `${target.fullName} will be able to book appointments again.`}
          confirmLabel={target.isActive ? "Deactivate" : "Reactivate"}
          danger={target.isActive} busy={busy} onConfirm={toggle} onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}
