import { useState } from "react";
import { Link } from "react-router-dom";
import { http } from "../../api/client";
import { EmptyState, ErrorAlert, Loading } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import StatusPill from "../../components/StatusPill";
import { useSettings } from "../../context/SettingsContext";
import { useApi } from "../../hooks/useApi";
import { addDaysIso, todayIso } from "../../utils/format";

export default function BillingReports() {
  const { money } = useSettings();
  const [range, setRange] = useState({ from: addDaysIso(todayIso(), -29), to: todayIso(), groupBy: "day" });
  const { data, loading, error, reload } = useApi(() => http.get("/billing/reports", range), [range.from, range.to, range.groupBy]);
  const set = (k) => (e) => setRange((r) => ({ ...r, [k]: e.target.value }));
  const maxValue = Math.max(1, ...(data?.rows ?? []).map((r) => Math.max(r.invoiced, r.collected)));

  return (
    <>
      <PageHeader title="Billing summary" subtitle="Invoices raised, money collected and what is still owed."
        crumbs={[{ label: "Billing" }, { label: "Summary" }]}>
        <button className="btn btn-outline-secondary" onClick={() => window.print()}><i className="bi bi-printer me-1" />Print</button>
      </PageHeader>

      <div className="panel mb-3">
        <div className="filter-bar row g-2 align-items-end">
          <div className="col-6 col-md-3"><label className="form-label">From</label><input type="date" className="form-control" value={range.from} max={range.to} onChange={set("from")} /></div>
          <div className="col-6 col-md-3"><label className="form-label">To</label><input type="date" className="form-control" value={range.to} min={range.from} max={todayIso()} onChange={set("to")} /></div>
          <div className="col-md-3"><label className="form-label">Group by</label>
            <select className="form-select" value={range.groupBy} onChange={set("groupBy")}><option value="day">Day</option><option value="month">Month</option></select>
          </div>
        </div>
      </div>

      <ErrorAlert message={error} onRetry={reload} />
      {loading && !data ? <Loading /> : data && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-md-4"><div className="panel kpi" style={{ "--c": "#1d5a8a" }}><div className="value">{money(data.totalInvoiced)}</div><div className="label">Invoiced in this period</div></div></div>
            <div className="col-md-4"><div className="panel kpi" style={{ "--c": "#2e8b67" }}><div className="value">{money(data.totalCollected)}</div><div className="label">Collected in this period</div></div></div>
            <div className="col-md-4"><div className="panel kpi" style={{ "--c": "#c8455b" }}><div className="value">{money(data.outstandingTotal)}</div><div className="label">Outstanding across all invoices</div></div></div>
          </div>

          <div className="panel mb-3">
            {data.rows.length === 0 ? <EmptyState icon="bi-bar-chart" title="No billing activity in this period" /> : (
              <div className="table-responsive">
                <table className="table table-clean">
                  <thead><tr><th>{range.groupBy === "month" ? "Month" : "Date"}</th><th className="text-end">Invoices</th><th className="text-end">Invoiced</th><th className="text-end">Collected</th><th style={{ minWidth: 180 }} /></tr></thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.period}>
                        <td className="fw-semibold">{r.period}</td>
                        <td className="text-end">{r.invoiceCount}</td>
                        <td className="text-end">{money(r.invoiced)}</td>
                        <td className="text-end">{money(r.collected)}</td>
                        <td>
                          <div style={{ height: 6, background: "#1d5a8a", width: `${(r.invoiced / maxValue) * 100}%`, borderRadius: 3, minWidth: r.invoiced ? 3 : 0 }} />
                          <div className="mt-1" style={{ height: 6, background: "#2e8b67", width: `${(r.collected / maxValue) * 100}%`, borderRadius: 3, minWidth: r.collected ? 3 : 0 }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-body pb-2"><h2 className="panel-title m-0">Largest outstanding balances</h2></div>
            {data.outstandingInvoices.length === 0 ? <EmptyState icon="bi-check2-circle" title="Nothing outstanding" hint="Every invoice is settled." /> : (
              <div className="table-responsive">
                <table className="table table-clean">
                  <thead><tr><th>Invoice</th><th>Patient</th><th className="text-end">Total</th><th className="text-end">Balance</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.outstandingInvoices.map((i) => (
                      <tr key={i.invoiceId}>
                        <td><Link to={`/billing/invoices/${i.invoiceId}`}>{i.invoiceNo}</Link></td>
                        <td>{i.patientName}</td>
                        <td className="text-end">{money(i.grandTotal)}</td>
                        <td className="text-end fw-semibold">{money(i.balance)}</td>
                        <td><StatusPill status={i.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
