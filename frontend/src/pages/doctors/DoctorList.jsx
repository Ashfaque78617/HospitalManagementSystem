import { useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage, http } from "../../api/client";
import { EmptyState, ErrorAlert, Loading } from "../../components/Feedback";
import Hero from "../../components/Hero";
import { ConfirmModal } from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusPill from "../../components/StatusPill";
import { ROLES, useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { IMAGES } from "../../config/images";
import { useApi, useDebounce } from "../../hooks/useApi";
import { initials } from "../../utils/format";

export default function DoctorList() {
  const { hasRole } = useAuth();
  const { money } = useSettings();
  const toast = useToast();
  const isAdmin = hasRole(ROLES.Admin);
  const [search, setSearch] = useState("");
  const [spec, setSpec] = useState("");
  const [status, setStatus] = useState("true");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const q = useDebounce(search);

  const specs = useApi(() => http.get("/lookups/specializations"), []);
  const { data, loading, error, reload } = useApi(
    () => http.get("/doctors", { search: q, specializationId: spec, isActive: status, page, pageSize: 9 }),
    [q, spec, status, page]
  );

  const toggle = async () => {
    setBusy(true);
    try {
      await http.patch(`/doctors/${target.doctorId}/status`, { isActive: !target.isActive });
      toast.success(target.isActive ? "Doctor deactivated." : "Doctor reactivated.");
      reload();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
      setTarget(null);
    }
  };

  return (
    <>
      <Hero image={IMAGES.doctors} title="Doctors" subtitle="Specialists, their weekly hours and consultation fees.">
        {isAdmin && <Link to="/doctors/new" className="btn btn-light"><i className="bi bi-plus-lg me-1" />Add doctor</Link>}
      </Hero>

      <div className="panel mb-3">
        <div className="filter-bar row g-2">
          <div className="col-md-5">
            <input className="form-control" placeholder="Search by name or code" aria-label="Search doctors"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="col-md-4">
            <select className="form-select" aria-label="Specialization" value={spec} onChange={(e) => { setSpec(e.target.value); setPage(1); }}>
              <option value="">All specializations</option>
              {specs.data?.map((s) => <option key={s.specializationId} value={s.specializationId}>{s.specializationName}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-select" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="true">Active</option><option value="false">Inactive</option><option value="">All</option>
            </select>
          </div>
        </div>
      </div>

      <ErrorAlert message={error} onRetry={reload} />
      {loading && !data ? <Loading /> : data?.items.length === 0 ? (
        <div className="panel"><EmptyState icon="bi-person-x" title="No doctors match these filters" /></div>
      ) : (
        <div className="row g-3">
          {data?.items.map((d) => (
            <div className="col-md-6 col-xl-4" key={d.doctorId}>
              <div className="panel doctor-card">
                <div className="d-flex gap-3 align-items-center">
                  <div className="avatar">{initials(d.fullName)}</div>
                  <div className="flex-grow-1">
                    <Link to={`/doctors/${d.doctorId}`} className="fw-semibold text-decoration-none d-block">{d.fullName}</Link>
                    <div className="text-muted small">{d.specializationName}</div>
                  </div>
                  <StatusPill status={d.isActive ? "Active" : "Inactive"} />
                </div>
                <div className="small text-muted">
                  <div>{d.qualification ?? "Qualification not listed"}</div>
                  <div>{d.phone ?? "No phone"} · {d.doctorCode}</div>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-auto">
                  <div><span className="text-muted small">Consultation </span><strong>{money(d.consultationFee)}</strong></div>
                  <div className="row-actions">
                    <Link to={`/doctors/${d.doctorId}`} className="btn btn-outline-primary btn-sm">View</Link>
                    {isAdmin && <Link to={`/doctors/${d.doctorId}/edit`} className="btn btn-outline-secondary btn-sm">Edit</Link>}
                    {isAdmin && (
                      <button className={`btn btn-sm ${d.isActive ? "btn-outline-danger" : "btn-outline-success"}`} onClick={() => setTarget(d)}>
                        {d.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="panel mt-3"><Pagination data={data} onPage={setPage} /></div>

      {target && (
        <ConfirmModal
          title={target.isActive ? "Deactivate doctor?" : "Reactivate doctor?"}
          message={target.isActive ? `${target.fullName} will no longer appear when booking appointments.` : `${target.fullName} will be available for booking again.`}
          confirmLabel={target.isActive ? "Deactivate" : "Reactivate"} danger={target.isActive} busy={busy}
          onConfirm={toggle} onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}
