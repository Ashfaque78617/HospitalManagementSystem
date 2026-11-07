import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getErrorMessage, http } from "../../api/client";
import { ErrorAlert, Loading } from "../../components/Feedback";
import { ConfirmModal } from "../../components/Modal";
import PageHeader from "../../components/PageHeader";
import StatusPill from "../../components/StatusPill";
import { ROLES, useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useApi } from "../../hooks/useApi";
import { ACTION_LABEL, FLOW, NEXT } from "../../utils/appointments";
import { fmtDate, fmtTime } from "../../utils/format";

export default function AppointmentDetails() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const toast = useToast();
  const { data: a, loading, error, reload } = useApi(() => http.get(`/appointments/${id}`), [id]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading && !a) return <Loading />;
  if (error) return <ErrorAlert message={error} onRetry={reload} />;

  const change = async (status) => {
    setBusy(true);
    try {
      await http.post(`/appointments/${id}/status`, { statusName: status });
      toast.success(`${a.appointmentNo} is now ${status}.`);
      reload();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const options = NEXT[a.status] ?? [];
  const forward = options.filter((s) => !["Cancelled", "No Show"].includes(s));
  const stop = options.filter((s) => ["Cancelled", "No Show"].includes(s));
  const stepIndex = FLOW.indexOf(a.status);

  return (
    <>
      <PageHeader title={a.appointmentNo} subtitle={`${fmtDate(a.appointmentDate)} · ${fmtTime(a.startTime)} – ${fmtTime(a.endTime)}`}
        crumbs={[{ label: "Appointments", to: "/appointments" }, { label: a.appointmentNo }]}>
        {hasRole(ROLES.Admin, ROLES.Receptionist) && a.status === "Scheduled" && (
          <Link to={`/appointments/${id}/edit`} className="btn btn-outline-primary"><i className="bi bi-calendar2-event me-1" />Reschedule</Link>
        )}
        {hasRole(ROLES.Admin) && a.status === "Completed" && (
          <Link to={`/billing/invoices/new?patientId=${a.patientId}&appointmentId=${a.appointmentId}`} className="btn btn-primary"><i className="bi bi-receipt me-1" />Create invoice</Link>
        )}
      </PageHeader>

      <div className="panel panel-body mb-3">
        <h2 className="panel-title">Visit progress</h2>
        {stepIndex === -1 ? (
          <div><StatusPill status={a.status} /> <span className="text-muted ms-2">This appointment is closed.</span></div>
        ) : (
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {FLOW.map((s, i) => (
              <span key={s} className={`pill ${i < stepIndex ? "pill-green" : i === stepIndex ? "pill-blue" : "pill-grey"}`}>{s}</span>
            ))}
          </div>
        )}
        {(forward.length > 0 || stop.length > 0) && (
          <div className="d-flex flex-wrap gap-2 mt-3">
            {forward.map((s, i) => (
              <button key={s} className={`btn ${i === 0 ? "btn-primary" : "btn-outline-primary"}`} disabled={busy} onClick={() => change(s)}>{ACTION_LABEL[s]}</button>
            ))}
            {stop.map((s) => (
              <button key={s} className="btn btn-outline-danger" disabled={busy} onClick={() => setConfirm(s)}>{ACTION_LABEL[s]}</button>
            ))}
          </div>
        )}
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="panel panel-body h-100">
            <h2 className="panel-title">Patient</h2>
            <div className="fw-semibold"><Link to={`/patients/${a.patientId}`}>{a.patientName}</Link></div>
            <div className="text-muted">{a.patientCode}</div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="panel panel-body h-100">
            <h2 className="panel-title">Doctor</h2>
            <div className="fw-semibold"><Link to={`/doctors/${a.doctorId}`}>{a.doctorName}</Link></div>
            <div className="text-muted">{a.specialization}</div>
          </div>
        </div>
        <div className="col-12">
          <div className="panel panel-body">
            <h2 className="panel-title">Visit details</h2>
            <dl className="row mb-0">
              <dt className="col-sm-3 text-muted fw-normal">Status</dt><dd className="col-sm-9"><StatusPill status={a.status} /></dd>
              <dt className="col-sm-3 text-muted fw-normal">Reason</dt><dd className="col-sm-9">{a.reason ?? "—"}</dd>
              <dt className="col-sm-3 text-muted fw-normal">Notes</dt><dd className="col-sm-9 mb-0">{a.notes ?? "—"}</dd>
            </dl>
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          title={`${ACTION_LABEL[confirm]}?`}
          message={confirm === "Cancelled" ? "The slot will be released for other patients. This cannot be undone." : "The patient will be marked as not having attended. This cannot be undone."}
          confirmLabel={ACTION_LABEL[confirm]} danger busy={busy} onConfirm={() => change(confirm)} onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
