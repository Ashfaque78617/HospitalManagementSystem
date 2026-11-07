import { useState } from "react";
import { http } from "../../api/client";
import { EmptyState, ErrorAlert, Loading } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import { useApi, useDebounce } from "../../hooks/useApi";
import { fmtDateTime } from "../../utils/format";

const TONE = { Login: "green", LoginFailed: "rose", Create: "blue", Update: "amber", Deactivate: "grey", Cancel: "rose", Payment: "green" };

export default function AuditLogs() {
  const [filters, setFilters] = useState({ search: "", action: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const search = useDebounce(filters.search);
  const actions = useApi(() => http.get("/admin/audit-logs/actions"), []);
  const { data, loading, error, reload } = useApi(
    () => http.get("/admin/audit-logs", { ...filters, search, page, pageSize: 20 }),
    [search, filters.action, filters.from, filters.to, page]
  );
  const set = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };

  return (
    <>
      <PageHeader title="Audit logs" subtitle="Sign-ins and important changes, newest first." crumbs={[{ label: "Administration" }, { label: "Audit logs" }]} />
      <div className="panel">
        <div className="filter-bar row g-2">
          <div className="col-md-4"><input className="form-control" placeholder="Search description, record or user" aria-label="Search" value={filters.search} onChange={set("search")} /></div>
          <div className="col-md-3">
            <select className="form-select" aria-label="Action" value={filters.action} onChange={set("action")}>
              <option value="">All actions</option>{actions.data?.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-2"><input type="date" className="form-control" aria-label="From" value={filters.from} onChange={set("from")} /></div>
          <div className="col-6 col-md-2"><input type="date" className="form-control" aria-label="To" value={filters.to} min={filters.from} onChange={set("to")} /></div>
        </div>
        <ErrorAlert message={error} onRetry={reload} />
        {loading && !data ? <Loading /> : data?.items.length === 0 ? <EmptyState icon="bi-journal-x" title="No log entries match" /> : (
          <div className="table-responsive">
            <table className="table table-clean">
              <thead><tr><th>When</th><th>User</th><th>Action</th><th>Record</th><th>Details</th><th>IP address</th></tr></thead>
              <tbody>
                {data?.items.map((l) => (
                  <tr key={l.auditLogId}>
                    <td className="text-nowrap">{fmtDateTime(l.createdDate)}</td>
                    <td>{l.userName ?? <span className="text-muted">System</span>}</td>
                    <td><span className={`pill pill-${TONE[l.action] ?? "grey"}`}>{l.action}</span></td>
                    <td>{l.entityName}{l.entityId ? ` #${l.entityId}` : ""}</td>
                    <td style={{ maxWidth: 360 }}>{l.description}</td>
                    <td className="text-muted">{l.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination data={data} onPage={setPage} />
      </div>
    </>
  );
}
