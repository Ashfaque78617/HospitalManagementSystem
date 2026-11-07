import { useState } from "react";
import { Link } from "react-router-dom";
import { http } from "../../api/client";
import { EmptyState, ErrorAlert, Loading } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import StatusPill from "../../components/StatusPill";
import { useSettings } from "../../context/SettingsContext";
import { useApi, useDebounce } from "../../hooks/useApi";
import { fmtDate } from "../../utils/format";

export default function InvoiceList() {
  const { money } = useSettings();
  const [filters, setFilters] = useState({ search: "", status: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const search = useDebounce(filters.search);
  const { data, loading, error, reload } = useApi(
    () => http.get("/billing/invoices", { ...filters, search, page, pageSize: 12 }),
    [search, filters.status, filters.from, filters.to, page]
  );
  const set = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };

  return (
    <>
      <PageHeader title="Invoices" subtitle="Search by patient, invoice number, date or payment status." crumbs={[{ label: "Billing" }, { label: "Invoices" }]}>
        <Link to="/billing/payments/create" className="btn btn-outline-primary"><i className="bi bi-cash-coin me-1" />Record payment</Link>
        <Link to="/billing/invoices/new" className="btn btn-primary"><i className="bi bi-plus-lg me-1" />Create invoice</Link>
      </PageHeader>

      <div className="panel">
        <div className="filter-bar row g-2">
          <div className="col-md-4"><input className="form-control" placeholder="Patient name, code or invoice no." aria-label="Search invoices" value={filters.search} onChange={set("search")} /></div>
          <div className="col-md-3">
            <select className="form-select" aria-label="Payment status" value={filters.status} onChange={set("status")}>
              <option value="">Any payment status</option>
              <option>Unpaid</option><option>Partially Paid</option><option>Paid</option><option>Cancelled</option>
            </select>
          </div>
          <div className="col-6 col-md-2"><input type="date" className="form-control" aria-label="From date" value={filters.from} onChange={set("from")} /></div>
          <div className="col-6 col-md-2"><input type="date" className="form-control" aria-label="To date" value={filters.to} min={filters.from} onChange={set("to")} /></div>
        </div>

        <ErrorAlert message={error} onRetry={reload} />
        {loading && !data ? <Loading /> : data?.items.length === 0 ? (
          <EmptyState icon="bi-receipt" title="No invoices found" hint="Change the filters or create a new invoice." />
        ) : (
          <div className="table-responsive">
            <table className="table table-clean">
              <thead><tr><th>Invoice</th><th>Date</th><th>Patient</th><th className="text-end">Total</th><th className="text-end">Paid</th><th className="text-end">Balance</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data?.items.map((i) => (
                  <tr key={i.invoiceId}>
                    <td><Link className="fw-semibold text-decoration-none" to={`/billing/invoices/${i.invoiceId}`}>{i.invoiceNo}</Link></td>
                    <td>{fmtDate(i.invoiceDate)}</td>
                    <td>{i.patientName}<div className="small text-muted">{i.patientCode}</div></td>
                    <td className="text-end">{money(i.grandTotal)}</td>
                    <td className="text-end">{money(i.paidAmount)}</td>
                    <td className={`text-end ${i.balance > 0 ? "fw-semibold" : ""}`}>{money(i.balance)}</td>
                    <td><StatusPill status={i.status} /></td>
                    <td className="text-end">
                      <div className="row-actions">
                        {(i.status === "Unpaid" || i.status === "Partially Paid") && (
                          <Link to={`/billing/payments/create?invoiceId=${i.invoiceId}`} className="btn btn-sm btn-outline-primary">Record payment</Link>
                        )}
                        <Link to={`/billing/invoices/${i.invoiceId}`} className="btn btn-outline-secondary icon-btn" aria-label="View invoice" title="View"><i className="bi bi-eye" /></Link>
                      </div>
                    </td>
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
