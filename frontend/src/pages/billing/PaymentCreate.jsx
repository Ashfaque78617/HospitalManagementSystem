import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getErrorMessage, http } from "../../api/client";
import Field, { inputClass } from "../../components/Field";
import { ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import StatusPill from "../../components/StatusPill";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";

const METHODS = ["Cash", "Card", "UPI", "Online"];

export default function PaymentCreate() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { money } = useSettings();

  const [open, setOpen] = useState([]);
  const [invoiceId, setInvoiceId] = useState(params.get("invoiceId") ?? "");
  const [invoice, setInvoice] = useState(null);
  const [form, setForm] = useState({ amount: "", method: "Cash", reference: "", remarks: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  // Outstanding invoices for the picker
  useEffect(() => {
    Promise.all([
      http.get("/billing/invoices", { status: "Unpaid", pageSize: 100 }),
      http.get("/billing/invoices", { status: "Partially Paid", pageSize: 100 }),
    ]).then(([a, b]) => setOpen([...a.items, ...b.items].sort((x, y) => y.invoiceId - x.invoiceId))).catch((e) => setServerError(getErrorMessage(e)));
  }, []);

  // Load the chosen invoice and suggest paying the full balance
  useEffect(() => {
    if (!invoiceId) { setInvoice(null); return; }
    http.get(`/billing/invoices/${invoiceId}`)
      .then((inv) => { setInvoice(inv); setForm((f) => ({ ...f, amount: inv.balance > 0 ? String(inv.balance) : "" })); })
      .catch((e) => setServerError(getErrorMessage(e)));
  }, [invoiceId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    const amount = Number(form.amount);
    if (!invoice) v.invoice = "Select an invoice.";
    if (!form.amount || amount <= 0) v.amount = "Enter an amount greater than zero.";
    else if (invoice && amount > invoice.balance) v.amount = `Cannot exceed the balance of ${money(invoice.balance)}.`;
    if (form.method !== "Cash" && !form.reference.trim()) v.reference = "Enter the transaction reference.";
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    setServerError("");
    try {
      const res = await http.post("/billing/payments", {
        invoiceId: invoice.invoiceId, amount, paymentMethod: form.method,
        transactionReference: form.reference.trim() || null, remarks: form.remarks.trim() || null,
      });
      toast.success(res.status === "Paid" ? `Payment recorded. ${res.invoiceNo} is fully paid.` : `Payment recorded. ${money(res.balance)} still due.`);
      navigate(`/billing/invoices/${invoice.invoiceId}`);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Record payment" subtitle="Partial and full payments are both supported."
        crumbs={[{ label: "Billing" }, { label: "Payments" }, { label: "Record" }]} />
      <form className="row g-3" onSubmit={submit} noValidate>
        <div className="col-lg-7">
          <div className="panel panel-body">
            <ErrorAlert message={serverError} />
            <div className="row g-3">
              <Field className="col-12" label="Invoice" required error={errors.invoice}>
                <select className="form-select" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
                  <option value="">Select an outstanding invoice…</option>
                  {open.map((i) => <option key={i.invoiceId} value={i.invoiceId}>{i.invoiceNo} · {i.patientName} · due {money(i.balance)}</option>)}
                  {invoice && !open.some((i) => i.invoiceId === invoice.invoiceId) && <option value={invoice.invoiceId}>{invoice.invoiceNo}</option>}
                </select>
              </Field>
              <Field className="col-md-6" label="Amount" required error={errors.amount}>
                <input type="number" min="0.01" step="0.01" className={inputClass(errors.amount)} value={form.amount} onChange={set("amount")} />
              </Field>
              <Field className="col-md-6" label="Payment method" required>
                <select className="form-select" value={form.method} onChange={set("method")}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
              </Field>
              <Field className="col-12" label={form.method === "Cash" ? "Receipt reference (optional)" : "Transaction reference"} required={form.method !== "Cash"} error={errors.reference}>
                <input className={inputClass(errors.reference)} maxLength={100} value={form.reference} onChange={set("reference")} />
              </Field>
              <Field className="col-12" label="Remarks">
                <textarea className="form-control" rows={2} maxLength={500} value={form.remarks} onChange={set("remarks")} />
              </Field>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="panel panel-body h-100">
            <h2 className="panel-title">Invoice summary</h2>
            {!invoice ? <div className="text-muted">Pick an invoice to see what is owed.</div> : (
              <>
                <div className="d-flex justify-content-between mb-2"><span className="fw-semibold">{invoice.patientName}</span><StatusPill status={invoice.status} /></div>
                <div className="d-flex justify-content-between py-1"><span>Invoice total</span><span>{money(invoice.grandTotal)}</span></div>
                <div className="d-flex justify-content-between py-1"><span>Already paid</span><span className="text-success">{money(invoice.paidAmount)}</span></div>
                <hr className="my-2" />
                <div className="d-flex justify-content-between"><strong>Balance due</strong><strong className="text-danger">{money(invoice.balance)}</strong></div>
                {form.amount && Number(form.amount) > 0 && Number(form.amount) <= invoice.balance && (
                  <div className="small text-muted mt-3">After this payment: {money(invoice.balance - Number(form.amount))} remaining.</div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="col-12 d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving && <span className="spinner-border spinner-border-sm me-2" />}Record payment</button>
        </div>
      </form>
    </>
  );
}
