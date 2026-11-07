import { Link } from "react-router-dom";
import { http } from "../api/client";
import Hero from "../components/Hero";
import StatusPill from "../components/StatusPill";
import { EmptyState, ErrorAlert, Loading } from "../components/Feedback";
import { ROLES, useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { IMAGES } from "../config/images";
import { useApi } from "../hooks/useApi";
import { fmtDate, fmtTime, greeting } from "../utils/format";

function Kpi({ icon, label, value, color }) {
  return (
    <div className="panel kpi" style={{ "--c": color }}>
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="value">{value}</div>
          <div className="label">{label}</div>
        </div>
        <i className={`bi ${icon}`} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const { money } = useSettings();
  const { data, loading, error, reload } = useApi(() => http.get("/dashboard"), []);

  const first = user.fullName.replace(/^Dr\.?\s+/i, "").split(" ")[0];
  const isDoctor = user.role === ROLES.Doctor;

  return (
    <>
      <Hero
        image={IMAGES.hero}
        title={`${greeting()}, ${isDoctor ? "Dr. " : ""}${first}`}
        subtitle={`${new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}. Here is how the hospital looks right now.`}
      >
        {hasRole(ROLES.Admin, ROLES.Receptionist) && (
          <>
            <Link to="/appointments/new" className="btn btn-light"><i className="bi bi-calendar-plus me-1" />Book appointment</Link>
            <Link to="/patients/new" className="btn btn-outline-light"><i className="bi bi-person-plus me-1" />Register patient</Link>
          </>
        )}
        {hasRole(ROLES.Admin, ROLES.Billing) && (
          <Link to="/billing/invoices/new" className="btn btn-outline-light"><i className="bi bi-receipt me-1" />Create invoice</Link>
        )}
        {isDoctor && <Link to="/appointments" className="btn btn-light"><i className="bi bi-calendar2-week me-1" />My appointments</Link>}
      </Hero>

      <ErrorAlert message={error} onRetry={reload} />
      {loading && !data && <Loading />}

      {data && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-6 col-xl-3"><Kpi icon="bi-people" label="Active patients" value={data.totalPatients} color="#0f5f6b" /></div>
            <div className="col-6 col-xl-3"><Kpi icon="bi-heart-pulse" label="Active doctors" value={data.totalDoctors} color="#2e8b67" /></div>
            <div className="col-6 col-xl-3"><Kpi icon="bi-calendar-check" label={isDoctor ? "My appointments today" : "Appointments today"} value={data.todaysAppointments} color="#6a5acd" /></div>
            <div className="col-6 col-xl-3"><Kpi icon="bi-hourglass-split" label="Waiting or not yet seen" value={data.pendingAppointments} color="#e3a02f" /></div>
            {data.showBilling && (
              <>
                <div className="col-6 col-xl-4"><Kpi icon="bi-receipt" label="Invoices today" value={data.todaysInvoices} color="#1d5a8a" /></div>
                <div className="col-6 col-xl-4"><Kpi icon="bi-cash-stack" label="Collected today" value={money(data.todaysCollections)} color="#2e8b67" /></div>
                <div className="col-12 col-xl-4"><Kpi icon="bi-exclamation-circle" label="Outstanding balance" value={money(data.outstandingAmount)} color="#c8455b" /></div>
              </>
            )}
          </div>

          <div className="row g-3">
            <div className="col-lg-8">
              <div className="panel h-100">
                <div className="panel-body pb-2 d-flex justify-content-between align-items-center">
                  <h2 className="panel-title m-0">Today's schedule</h2>
                  {hasRole(ROLES.Admin, ROLES.Receptionist, ROLES.Doctor) && <Link to="/appointments" className="small">View all</Link>}
                </div>
                {data.todaysSchedule.length === 0 ? (
                  <EmptyState icon="bi-calendar-x" title="No appointments today" hint="New bookings will appear here." />
                ) : (
                  <div className="table-responsive">
                    <table className="table table-clean">
                      <thead><tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Status</th></tr></thead>
                      <tbody>
                        {data.todaysSchedule.map((a) => (
                          <tr key={a.appointmentId}>
                            <td className="fw-semibold">{fmtTime(a.startTime)}</td>
                            <td><Link to={`/patients/${a.patientId}`}>{a.patientName}</Link></td>
                            <td>{a.doctorName}<div className="small text-muted">{a.specialization}</div></td>
                            <td><StatusPill status={a.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="col-lg-4 d-flex flex-column gap-3">
              <div className="panel panel-body">
                <h2 className="panel-title">Today by status</h2>
                {data.appointmentsByStatus.length === 0 ? (
                  <div className="text-muted small">Nothing booked yet.</div>
                ) : (
                  data.appointmentsByStatus.map((s) => (
                    <div key={s.status} className="d-flex justify-content-between align-items-center py-1">
                      <StatusPill status={s.status} /><strong>{s.count}</strong>
                    </div>
                  ))
                )}
              </div>

              {data.showBilling && (
                <div className="panel panel-body">
                  <h2 className="panel-title">Collections, last 7 days</h2>
                  <Bars points={data.collections} money={money} />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Bars({ points, money }) {
  const max = Math.max(...points.map((p) => p.amount), 1);
  return (
    <div className="bars" role="img" aria-label="Collections for the last seven days">
      {points.map((p, i) => (
        <div className="bar-col" key={i} title={money(p.amount)}>
          <div className={`bar ${i === points.length - 1 ? "today" : ""}`} style={{ height: `${(p.amount / max) * 100}%` }} />
          <span className="mt-1">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
