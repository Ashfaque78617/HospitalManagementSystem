import { useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage, http } from "../../api/client";
import { EmptyState, ErrorAlert, Loading } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import StatusPill from "../../components/StatusPill";
import { ROLES, useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useApi, useDebounce } from "../../hooks/useApi";
import { ACTION_LABEL, PRIMARY_ACTION } from "../../utils/appointments";
import { fmtDate, fmtTime, todayIso } from "../../utils/format";

export default function AppointmentList() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const canBook = hasRole(ROLES.Admin, ROLES.Receptionist);
  const isDoctor = hasRole(ROLES.Doctor);
  const [filters, setFilters] = useState({ from: todayIso(), to: "", doctorId: "", statusId: "", search: "" });
  const [page, setPage] = useState(1);
  const search = useDebounce(filters.search);

  const doctors = useApi(() => (isDoctor ? Promise.resolve([]) : http.get("/doctors/lookup")), [isDoctor]);
  const statuses = useApi(() => http.get("/lookups/appointment-statuses"), []);
  const { data, loading, error, reload } = useApi(
    () => http.get("/appointments", { ...filters, search, page, pageSize: 12 }),
    [filters.from, filters.to, filters.doctorId, filters.statusId, search, page]
  );

  const set = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };

  const advance = async (a, status) => {
    try {
      await http.post(`/appointments/${a.appointmentId}/status`, { statusName: status });
      toast.success(`${a.appointmentNo} is now ${status}.`);
      reload();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <>
      <PageHeader title="Appointments" subtitle={isDoctor ? "Your patients, in order." : "Book, move and track visits."} crumbs={[{ label: "Appointments" }]}>
        {canBook && <button className="btn btn-outline-secondary" onClick={() => { setFilters({ from: todayIso(), to: todayIso(), doctorId: "", statusId: "", search: "" }); setPage(1); }}>Today only</button>}
        {canBook && <Link to="/appointments/new" className="btn btn-primary"><i className="bi bi-calendar-plus me-1" />Book appointment</Link>}
      </PageHeader>

      <div className="panel">
        <div className="filter-bar row g-2">
          <div className="col-6 col-md-2"><input type="date" className="form-control" aria-label="From date" value={filters.from} onChange={set("from")} /></div>
          <div className="col-6 col-md-2"><input type="date" className="form-control" aria-label="To date" value={filters.to} min={filters.from} onChange={set("to")} /></div>
          {!isDoctor && (
            <div className="col-md-3">
              <select className="form-select" aria-label="Doctor" value={filters.doctorId} onChange={set("doctorId")}>
                <option value="">All doctors</option>
                {doctors.data?.map((d) => <option key={d.doctorId} value={d.doctorId}>{d.fullName}</option>)}
              </select>
            </div>
          )}
          <div className="col-md-2">
            <select className="form-select" aria-label="Status" value={filters.statusId} onChange={set("statusId")}>
              <option value="">Any status</option>
              {statuses.data?.map((s) => <option key={s.appointmentStatusId} value={s.appointmentStatusId}>{s.statusName}</option>)}
            </select>
          </div>
          <div className="col-md-3"><input className="form-control" placeholder="Patient name or appointment no." aria-label="Search" value={filters.search} onChange={set("search")} /></div>
        </div>

        <ErrorAlert message={error} onRetry={reload} />
        {loading && !data ? <Loading /> : data?.items.length === 0 ? (
          <EmptyState icon="bi-calendar-x" title="No appointments for these filters" hint="Widen the date range or clear the filters." />
        ) : (
          <div className="table-responsive">
            <table className="table table-clean">
              <thead><tr><th>No.</th><th>When</th><th>Patient</th>{!isDoctor && <th>Doctor</th>}<th>Reason</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data?.items.map((a) => {
                  const next = PRIMARY_ACTION[a.status];
                  return (
                    <tr key={a.appointmentId}>
                      <td><Link to={`/appointments/${a.appointmentId}`} className="fw-semibold text-decoration-none">{a.appointmentNo}</Link></td>
                      <td>{fmtDate(a.appointmentDate)}<div className="small text-muted">{fmtTime(a.startTime)} – {fmtTime(a.endTime)}</div></td>
                      <td><Link to={`/patients/${a.patientId}`}>{a.patientName}</Link><div className="small text-muted">{a.patientCode}</div></td>
                      {!isDoctor && <td>{a.doctorName}<div className="small text-muted">{a.specialization}</div></td>}
                      <td>{a.reason ?? "—"}</td>
                      <td><StatusPill status={a.status} /></td>
                      <td>
                        <div className="row-actions">
                          {next && <button className="btn btn-sm btn-outline-primary" onClick={() => advance(a, next)}>{ACTION_LABEL[next]}</button>}
                          <Link to={`/appointments/${a.appointmentId}`} className="btn btn-outline-secondary icon-btn" title="Details" aria-label="Details"><i className="bi bi-eye" /></Link>
                          {canBook && a.status === "Scheduled" && (
                            <Link to={`/appointments/${a.appointmentId}/edit`} className="btn btn-outline-secondary icon-btn" title="Reschedule" aria-label="Reschedule"><i className="bi bi-calendar2-event" /></Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination data={data} onPage={setPage} />
      </div>
    </>
  );
}
