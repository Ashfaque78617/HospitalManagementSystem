import { useParams } from "react-router-dom";
import { http } from "../../api/client";
import { EmptyState, ErrorAlert, Loading } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import StatusPill from "../../components/StatusPill";
import { ROLES, useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useApi } from "../../hooks/useApi";

const STYLE = {
  Appointment: { icon: "bi-calendar-check", color: "#6a5acd" },
  Invoice: { icon: "bi-receipt", color: "#1d5a8a" },
  Payment: { icon: "bi-cash", color: "#2e8b67" },
};

export default function PatientHistory() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const { money } = useSettings();
  const patient = useApi(() => http.get(`/patients/${id}`), [id]);
  const { data, loading, error, reload } = useApi(() => http.get(`/patients/${id}/history`), [id]);

  // Doctors and receptionists do not handle money, so billing events stay hidden for them.
  const canSeeBilling = hasRole(ROLES.Admin, ROLES.Billing);
  const items = (data ?? []).filter((i) => canSeeBilling || i.type === "Appointment");

  return (
    <>
      <PageHeader
        title="Patient history"
        subtitle={patient.data ? `${patient.data.fullName} · ${patient.data.patientCode}` : ""}
        crumbs={[{ label: "Patients", to: "/patients" }, { label: patient.data?.fullName ?? "…", to: `/patients/${id}` }, { label: "History" }]}
      />
      <div className="panel panel-body">
        <ErrorAlert message={error} onRetry={reload} />
        {loading && !data ? <Loading /> : items.length === 0 ? (
          <EmptyState icon="bi-clock-history" title="No history yet" hint="Appointments and billing events will be listed here, newest first." />
        ) : (
          <ul className="timeline">
            {items.map((i) => {
              const s = STYLE[i.type];
              return (
                <li key={`${i.type}-${i.referenceId}`} style={{ "--c": s.color }}>
                  <span className="dot"><i className={`bi ${s.icon}`} /></span>
                  <div className="d-flex flex-wrap justify-content-between gap-2">
                    <div>
                      <div className="fw-semibold">{i.type}: {i.title}</div>
                      {i.description && <div className="text-muted small">{i.description}</div>}
                      <div className="small text-muted">{new Date(i.date).toLocaleString()}</div>
                    </div>
                    <div className="text-end">
                      {i.amount != null && <div className="fw-semibold">{money(i.amount)}</div>}
                      {i.status && <StatusPill status={i.status} />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
