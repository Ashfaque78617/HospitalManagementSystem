import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { http } from "../../api/client";
import { EmptyState, ErrorAlert, Loading } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import StatusPill from "../../components/StatusPill";
import { ROLES, useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useApi } from "../../hooks/useApi";
import { fmtDate, fmtTime, initials } from "../../utils/format";

function Info({ label, children }) {
  return (
    <div className="col-sm-6">
      <div className="small text-muted">{label}</div>
      <div>{children || "—"}</div>
    </div>
  );
}

export default function PatientDetails() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const { money } = useSettings();
  const [tab, setTab] = useState("appointments");
  const { data, loading, error, reload } = useApi(() => http.get(`/patients/${id}/details`), [id]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorAlert message={error} onRetry={reload} />;
  const { patient: p, appointments, invoices, summary } = data;

  return (
    <>
      <PageHeader title={p.fullName} subtitle={`${p.patientCode}`} crumbs={[{ label: "Patients", to: "/patients" }, { label: p.fullName }]}>
        <button className="btn btn-outline-secondary" onClick={() => window.print()}><i className="bi bi-printer me-1" />Print</button>
        <Link className="btn btn-outline-primary" to={`/patients/${id}/history`}><i className="bi bi-clock-history me-1" />Full history</Link>
        {hasRole(ROLES.Admin, ROLES.Receptionist) && p.isActive && (
          <>
            <Link className="btn btn-outline-primary" to={`/appointments/new?patientId=${id}`}><i className="bi bi-calendar-plus me-1" />Book appointment</Link>
            <Link className="btn btn-primary" to={`/patients/${id}/edit`}><i className="bi bi-pencil me-1" />Edit</Link>
          </>
        )}
        {hasRole(ROLES.Admin, ROLES.Billing) && p.isActive && (
          <Link className="btn btn-outline-primary" to={`/billing/invoices/new?patientId=${id}`}><i className="bi bi-receipt me-1" />New invoice</Link>
        )}
      </PageHeader>

      <div className="row g-3 mb-3">
        <div className="col-lg-7">
          <div className="panel panel-body h-100">
            <div className="d-flex gap-3 align-items-center mb-3">
              <div className="avatar lg">{initials(p.fullName)}</div>
              <div>
                <h2 className="h4 mb-1">{p.fullName}</h2>
                <StatusPill status={p.isActive ? "Active" : "Inactive"} />
              </div>
            </div>
            <div className="row g-3">
              <Info label="Age / gender">{[p.age != null && `${p.age} years`, p.gender].filter(Boolean).join(" · ")}</Info>
              <Info label="Date of birth">{p.dateOfBirth && fmtDate(p.dateOfBirth)}</Info>
              <Info label="Blood group">{p.bloodGroup}</Info>
              <Info label="Phone">{p.phone}</Info>
              <Info label="Email">{p.email}</Info>
              <Info label="Address">{p.address}</Info>
              <Info label="Emergency contact">{p.emergencyContactName && `${p.emergencyContactName}${p.emergencyContactPhone ? ` · ${p.emergencyContactPhone}` : ""}`}</Info>
              <Info label="Registered">{fmtDate(p.createdDate)}</Info>
            </div>
          </div>
        </div>

        {hasRole(ROLES.Admin, ROLES.Billing) && (
          <div className="col-lg-5">
            <div className="panel panel-body h-100">
              <h2 className="panel-title">Payment summary</h2>
              <div className="d-flex justify-content-between py-2 border-bottom"><span>Total billed</span><strong>{money(summary.totalBilled)}</strong></div>
              <div className="d-flex justify-content-between py-2 border-bottom"><span>Total paid</span><strong className="text-success">{money(summary.totalPaid)}</strong></div>
              <div className="d-flex justify-content-between py-2"><span>Outstanding</span><strong className={summary.outstanding > 0 ? "text-danger" : ""}>{money(summary.outstanding)}</strong></div>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <ul className="nav nav-tabs px-3 pt-2">
          <li className="nav-item"><button className={`nav-link ${tab === "appointments" ? "active" : ""}`} onClick={() => setTab("appointments")}>Appointments ({appointments.length})</button></li>
          {hasRole(ROLES.Admin, ROLES.Billing) && (
            <li className="nav-item"><button className={`nav-link ${tab === "invoices" ? "active" : ""}`} onClick={() => setTab("invoices")}>Invoices ({invoices.length})</button></li>
          )}
        </ul>

        {tab === "appointments" ? (
          appointments.length === 0 ? <EmptyState icon="bi-calendar-x" title="No appointments yet" /> : (
            <div className="table-responsive">
              <table className="table table-clean">
                <thead><tr><th>Appointment</th><th>When</th><th>Doctor</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.appointmentId}>
                      <td>{hasRole(ROLES.Billing) ? a.appointmentNo : <Link to={`/appointments/${a.appointmentId}`}>{a.appointmentNo}</Link>}</td>
                      <td>{fmtDate(a.appointmentDate)}<div className="small text-muted">{fmtTime(a.startTime)}</div></td>
                      <td>{a.doctorName}<div className="small text-muted">{a.specialization}</div></td>
                      <td>{a.reason ?? "—"}</td>
                      <td><StatusPill status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : invoices.length === 0 ? <EmptyState icon="bi-receipt" title="No invoices yet" /> : (
          <div className="table-responsive">
            <table className="table table-clean">
              <thead><tr><th>Invoice</th><th>Date</th><th className="text-end">Total</th><th className="text-end">Paid</th><th className="text-end">Balance</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.invoiceId}>
                    <td><Link to={`/billing/invoices/${i.invoiceId}`}>{i.invoiceNo}</Link></td>
                    <td>{fmtDate(i.invoiceDate)}</td>
                    <td className="text-end">{money(i.grandTotal)}</td>
                    <td className="text-end">{money(i.paidAmount)}</td>
                    <td className="text-end">{money(i.balance)}</td>
                    <td><StatusPill status={i.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
