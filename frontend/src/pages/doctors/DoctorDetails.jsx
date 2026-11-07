import { Link, useParams } from "react-router-dom";
import { http } from "../../api/client";
import { EmptyState, ErrorAlert, Loading } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import StatusPill from "../../components/StatusPill";
import { ROLES, useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useApi } from "../../hooks/useApi";
import { DAYS, fmtDate, fmtTime, initials } from "../../utils/format";

export default function DoctorDetails() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const { money } = useSettings();
  const { data, loading, error, reload } = useApi(() => http.get(`/doctors/${id}/details`), [id]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorAlert message={error} onRetry={reload} />;
  const { doctor: d, schedules, upcomingAppointments } = data;
  const canSeeAppointments = hasRole(ROLES.Admin, ROLES.Receptionist);

  return (
    <>
      <PageHeader title={d.fullName} subtitle={`${d.specializationName} · ${d.doctorCode}`} crumbs={[{ label: "Doctors", to: "/doctors" }, { label: d.fullName }]}>
        {hasRole(ROLES.Admin) && (
          <>
            <Link to={`/doctors/${id}/schedule`} className="btn btn-outline-primary"><i className="bi bi-clock me-1" />Edit schedule</Link>
            <Link to={`/doctors/${id}/edit`} className="btn btn-primary"><i className="bi bi-pencil me-1" />Edit</Link>
          </>
        )}
        {hasRole(ROLES.Admin, ROLES.Receptionist) && d.isActive && (
          <Link to={`/appointments/new?doctorId=${id}`} className="btn btn-outline-primary"><i className="bi bi-calendar-plus me-1" />Book appointment</Link>
        )}
      </PageHeader>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="panel panel-body h-100">
            <div className="d-flex gap-3 align-items-center mb-3">
              <div className="avatar lg">{initials(d.fullName)}</div>
              <div><h2 className="h4 mb-1">{d.fullName}</h2><StatusPill status={d.isActive ? "Active" : "Inactive"} /></div>
            </div>
            <dl className="row mb-0">
              <dt className="col-5 text-muted fw-normal">Qualification</dt><dd className="col-7">{d.qualification ?? "—"}</dd>
              <dt className="col-5 text-muted fw-normal">Phone</dt><dd className="col-7">{d.phone ?? "—"}</dd>
              <dt className="col-5 text-muted fw-normal">Email</dt><dd className="col-7">{d.email ?? "—"}</dd>
              <dt className="col-5 text-muted fw-normal">Consultation fee</dt><dd className="col-7 fw-semibold">{money(d.consultationFee)}</dd>
              <dt className="col-5 text-muted fw-normal">Login account</dt><dd className="col-7">{d.userId ? "Linked" : "None"}</dd>
            </dl>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="panel h-100">
            <div className="panel-body pb-2"><h2 className="panel-title m-0">Weekly schedule</h2></div>
            {schedules.length === 0 ? (
              <EmptyState icon="bi-clock" title="No working hours set" hint="Patients cannot be booked until a schedule exists." />
            ) : (
              <div className="table-responsive">
                <table className="table table-clean">
                  <thead><tr><th>Day</th><th>Hours</th><th>Slot</th><th>Max</th><th /></tr></thead>
                  <tbody>
                    {schedules.map((s) => (
                      <tr key={s.scheduleId} className={s.isActive ? "" : "text-muted"}>
                        <td>{DAYS[s.dayOfWeek]}</td>
                        <td>{fmtTime(s.startTime)} – {fmtTime(s.endTime)}</td>
                        <td>{s.slotDurationMinutes} min</td>
                        <td>{s.maxAppointments ?? "—"}</td>
                        <td>{!s.isActive && <StatusPill status="Inactive" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {canSeeAppointments && (
          <div className="col-12">
            <div className="panel">
              <div className="panel-body pb-2"><h2 className="panel-title m-0">Upcoming appointments</h2></div>
              {upcomingAppointments.length === 0 ? <EmptyState icon="bi-calendar-x" title="No upcoming appointments" /> : (
                <div className="table-responsive">
                  <table className="table table-clean">
                    <thead><tr><th>When</th><th>Patient</th><th>Reason</th><th>Status</th></tr></thead>
                    <tbody>
                      {upcomingAppointments.map((a) => (
                        <tr key={a.appointmentId}>
                          <td>{fmtDate(a.appointmentDate)} · {fmtTime(a.startTime)}</td>
                          <td><Link to={`/patients/${a.patientId}`}>{a.patientName}</Link></td>
                          <td>{a.reason ?? "—"}</td>
                          <td><StatusPill status={a.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
