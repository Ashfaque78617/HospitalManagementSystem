import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getErrorMessage, http } from "../../api/client";
import { ErrorAlert, Loading } from "../../components/Feedback";
import { ConfirmModal } from "../../components/Modal";
import PageHeader from "../../components/PageHeader";
import StatusPill from "../../components/StatusPill";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { useApi } from "../../hooks/useApi";
import { fmtDate, fmtDateTime } from "../../utils/format";

export default function InvoiceDetails() {
  const { id } = useParams();
  const { money, settings } = useSettings();
  const toast = useToast();
  const { data: inv, loading, error, reload } = useApi(() => http.get(`/billing/invoices/${id}`), [id]);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading && !inv) return <Loading />;
  if (error) return <ErrorAlert message={error} onRetry={reload} />;

  const open = inv.status === "Unpaid" || inv.status === "Partially Paid";
  const canCancel = inv.status === "Unpaid" && inv.payments.length === 0;

  const cancel = async () => {
    setBusy(true);
    try {
      await http.post(`/billing/invoices/${id}/cancel`);
      toast.success(`Invoice ${inv.invoiceNo} cancelled.`);
      reload();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
      setConfirmCancel(false);
    }
  };

  return (
    <>
      <PageHeader title={inv.invoiceNo} subtitle={fmtDate(inv.invoiceDate)}
        crumbs={[{ label: "Billing" }, { label: "Invoices", to: "/billing/invoices" }, { label: inv.invoiceNo }]}>
        <button className="btn btn-outline-secondary" onClick={() => window.print()}><i className="bi bi-printer me-1" />Print</button>
        {open && <Link to={`/billing/payments/create?invoiceId=${id}`} className="btn btn-primary"><i className="bi bi-cash-coin me-1" />Record payment</Link>}
        {canCancel && <button className="btn btn-outline-danger" onClick={() => setConfirmCancel(true)}>Cancel invoice</button>}
      </PageHeader>

      <div className="panel invoice-sheet">
        <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
          <div>
            <div className="display-font fs-4">{settings.HospitalName}</div>
            <div className="text-muted small">{settings.HospitalAddress}</div>
            <div className="text-muted small">{[settings.HospitalPhone, settings.HospitalEmail].filter(Boolean).join(" · ")}</div>
          </div>
          <div className="text-md-end">
            <div className="fs-5 fw-semibold">Invoice {inv.invoiceNo}</div>
            <div className="text-muted small">Issued {fmtDateTime(inv.invoiceDate)}</div>
            <div className="mt-1"><StatusPill status={inv.status} /></div>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-sm-6">
            <div className="small text-muted">Billed to</div>
            <div className="fw-semibold"><Link to={`/patients/${inv.patientId}`} className="text-decoration-none">{inv.patientName}</Link></div>
            <div className="small">{inv.patientCode} · {inv.patientPhone}</div>
            {inv.patientAddress && <div className="small text-muted">{inv.patientAddress}</div>}
          </div>
          {inv.appointmentNo && (
            <div className="col-sm-6 text-sm-end">
              <div className="small text-muted">Appointment</div>
              <div className="fw-semibold">{inv.appointmentNo}</div>
            </div>
          )}
        </div>

        <div className="table-responsive">
          <table className="table table-clean">
            <thead><tr><th>Description</th><th className="text-end">Qty</th><th className="text-end">Unit price</th><th className="text-end">Discount</th><th className="text-end">Tax</th><th className="text-end">Amount</th></tr></thead>
            <tbody>
              {inv.items.map((i) => (
                <tr key={i.invoiceItemId}>
                  <td>{i.itemDescription}</td>
                  <td className="text-end">{i.quantity}</td>
                  <td className="text-end">{money(i.unitPrice)}</td>
                  <td className="text-end">{money(i.discountAmount)}</td>
                  <td className="text-end">{money(i.taxAmount)}</td>
                  <td className="text-end">{money(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row justify-content-end mt-3">
          <div className="col-sm-6 col-lg-4">
            <table className="w-100 totals">
              <tbody>
                <tr><td>Subtotal</td><td className="text-end">{money(inv.subTotal)}</td></tr>
                <tr><td>Discount</td><td className="text-end">− {money(inv.discountAmount)}</td></tr>
                <tr><td>Tax</td><td className="text-end">{money(inv.taxAmount)}</td></tr>
                <tr className="grand"><td className="pt-2"><strong>Total</strong></td><td className="text-end pt-2"><strong>{money(inv.grandTotal)}</strong></td></tr>
                <tr><td className="pt-2">Paid</td><td className="text-end pt-2 text-success">{money(inv.paidAmount)}</td></tr>
                <tr><td><strong>Balance due</strong></td><td className={`text-end fw-bold ${inv.balance > 0 ? "text-danger" : ""}`}>{money(inv.balance)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <h2 className="panel-title mt-4">Payments</h2>
        {inv.payments.length === 0 ? <div className="text-muted">No payments recorded yet.</div> : (
          <div className="table-responsive">
            <table className="table table-clean">
              <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Received by</th><th className="text-end">Amount</th></tr></thead>
              <tbody>
                {inv.payments.map((p) => (
                  <tr key={p.paymentId}>
                    <td>{fmtDateTime(p.paymentDate)}</td><td>{p.paymentMethod}</td><td>{p.transactionReference ?? "—"}</td><td>{p.receivedBy ?? "—"}</td>
                    <td className="text-end">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {settings.InvoiceFooter && <div className="text-center text-muted small mt-4">{settings.InvoiceFooter}</div>}
      </div>

      {confirmCancel && (
        <ConfirmModal title="Cancel this invoice?" message="A cancelled invoice cannot accept payments and is excluded from billing totals." confirmLabel="Cancel invoice"
          danger busy={busy} onConfirm={cancel} onClose={() => setConfirmCancel(false)} />
      )}
    </>
  );
}
