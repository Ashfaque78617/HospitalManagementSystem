import { http } from "../../api/client";
import { ErrorAlert, Loading } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import { useApi } from "../../hooks/useApi";

// Role-based access matrix (enforced in the API with [Authorize(Roles = ...)] and mirrored in the UI).
const MATRIX = [
  ["Patients - view", true, true, true, true],
  ["Patients - register / edit / deactivate", true, true, false, false],
  ["Doctors - view", true, true, true, true],
  ["Doctors - manage profile and schedule", true, false, false, false],
  ["Appointments - view", true, true, false, "Own only"],
  ["Appointments - book / reschedule", true, true, false, false],
  ["Appointments - check-in and status", true, true, false, "Own only"],
  ["Invoices and payments", true, false, true, false],
  ["Billing summary", true, false, true, false],
  ["Users, roles, reference data", true, false, false, false],
  ["Audit logs and system settings", true, false, false, false],
];
const COLS = ["Admin", "Receptionist", "Billing Staff", "Doctor"];

const Cell = ({ v }) => (typeof v === "string" ? <span className="pill pill-amber">{v}</span> : v ? <i className="bi bi-check-lg text-success fs-5" aria-label="Allowed" /> : <i className="bi bi-dash text-muted" aria-label="Not allowed" />);

export default function Roles() {
  const { data, loading, error, reload } = useApi(() => http.get("/admin/roles"), []);
  return (
    <>
      <PageHeader title="Roles" subtitle="The four built-in roles and what each one can do." crumbs={[{ label: "Administration" }, { label: "Roles" }]} />
      <ErrorAlert message={error} onRetry={reload} />
      {loading && !data ? <Loading /> : (
        <div className="row g-3 mb-3">
          {data?.map((r) => (
            <div className="col-sm-6 col-xl-3" key={r.roleId}>
              <div className="panel panel-body">
                <div className="text-muted small">Role</div>
                <div className="display-font fs-4">{r.roleName}</div>
                <div className="text-muted">{r.userCount} user{r.userCount === 1 ? "" : "s"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="panel">
        <div className="panel-body pb-2"><h2 className="panel-title m-0">Access matrix</h2></div>
        <div className="table-responsive">
          <table className="table table-clean text-center">
            <thead><tr><th className="text-start">Capability</th>{COLS.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {MATRIX.map(([label, ...cells]) => (
                <tr key={label}><td className="text-start">{label}</td>{cells.map((v, i) => <td key={i}><Cell v={v} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
