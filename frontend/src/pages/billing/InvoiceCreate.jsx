import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getErrorMessage, http } from "../../api/client";
import Field, { inputClass } from "../../components/Field";
import { ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import PatientPicker from "../../components/PatientPicker";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { fmtDate, fmtTime } from "../../utils/format";

const blankItem = () => ({ itemDescription: "", quantity: "1", unitPrice: "", discountAmount: "0", taxAmount: "0" });
const num = (v) => (v === "" || isNaN(Number(v)) ? 0 : Number(v));
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function InvoiceCreate() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { money } = useSettings();

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [appointmentId, setAppointmentId] = useState(params.get("appointmentId") ?? "");
  const [items, setItems] = useState([blankItem()]);
  const [extraDiscount, setExtraDiscount] = useState("0");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  // Prefill the patient from ?patientId=
  useEffect(() => {
    const pid = params.get("patientId");
    if (pid) http.get(`/patients/${pid}`).then((p) => setPatient({ patientId: p.patientId, fullName: p.fullName, patientCode: p.patientCode, phone: p.phone })).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the patient's billable appointments whenever the patient changes.
  useEffect(() => {
    if (!patient) { setAppointments([]); setAppointmentId(""); return; }
    http.get(`/patients/${patient.patientId}/details`)
      .then((d) => setAppointments(d.appointments.filter((a) => !["Cancelled", "No Show"].includes(a.status))))
      .catch(() => setAppointments([]));
  }, [patient]);

  // Choosing an appointment adds the doctor's consultation fee as the first line (only if nothing typed yet).
  const pickAppointment = (value) => {
    setAppointmentId(value);
    const appt = appointments.find((a) => String(a.appointmentId) === value);
    if (appt && items.length === 1 && !items[0].itemDescription && !items[0].unitPrice) {
      setItems([{ ...blankItem(), itemDescription: `Consultation - ${appt.doctorName}`, unitPrice: String(appt.consultationFee) }]);
    }
  };
  useEffect(() => { if (appointments.length && appointmentId) pickAppointment(appointmentId); }, [appointments]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const subTotal = items.reduce((s, i) => s + round2(num(i.quantity) * num(i.unitPrice)), 0);
    const discount = items.reduce((s, i) => s + num(i.discountAmount), 0) + num(extraDiscount);
    const tax = items.reduce((s, i) => s + num(i.taxAmount), 0);
    return { subTotal, discount, tax, grand: subTotal - discount + tax };
  }, [items, extraDiscount]);

  const update = (i, k, v) => setItems((list) => list.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const lineTotal = (i) => round2(num(i.quantity) * num(i.unitPrice)) - num(i.discountAmount) + num(i.taxAmount);

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!patient) v.patient = "Select a patient.";
    items.forEach((i, idx) => {
      if (!i.itemDescription.trim()) v[`desc${idx}`] = "Required";
      if (num(i.quantity) <= 0) v[`qty${idx}`] = "> 0";
      if (i.unitPrice === "" || num(i.unitPrice) < 0) v[`price${idx}`] = "Required";
      if (lineTotal(i) < 0) v[`desc${idx}`] = "Discount exceeds line amount";
    });
    if (totals.grand < 0) v.total = "The discount cannot exceed the invoice amount.";
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    setServerError("");
    try {
      const inv = await http.post("/billing/invoices", {
        patientId: patient.patientId,
        appointmentId: appointmentId ? Number(appointmentId) : null,
        additionalDiscount: num(extraDiscount),
        items: items.map((i) => ({
          itemDescription: i.itemDescription.trim(), quantity: num(i.quantity), unitPrice: num(i.unitPrice),
          discountAmount: num(i.discountAmount), taxAmount: num(i.taxAmount),
        })),
      });
      toast.success(`Invoice ${inv.invoiceNo} created.`);
      navigate(`/billing/invoices/${inv.invoiceId}`);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Create invoice" subtitle="Add the services and items to bill."
        crumbs={[{ label: "Billing" }, { label: "Invoices", to: "/billing/invoices" }, { label: "Create" }]} />
      <form onSubmit={submit} noValidate>
        <div className="panel panel-body mb-3">
          <ErrorAlert message={serverError} />
          <div className="row g-3">
            <Field className="col-md-6" label="Patient" required error={errors.patient}>
              <PatientPicker value={patient} onChange={setPatient} invalid={!!errors.patient} />
            </Field>
            <Field className="col-md-6" label="Linked appointment" hint={!patient ? "Select a patient first." : appointments.length === 0 ? "This patient has no billable appointments." : "Optional."}>
              <select className="form-select" disabled={!appointments.length} value={appointmentId} onChange={(e) => pickAppointment(e.target.value)}>
                <option value="">Not linked to an appointment</option>
                {appointments.map((a) => (
                  <option key={a.appointmentId} value={a.appointmentId}>{a.appointmentNo} · {fmtDate(a.appointmentDate)} {fmtTime(a.startTime)} · {a.doctorName}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="panel mb-3">
          <div className="panel-body pb-2 d-flex justify-content-between align-items-center">
            <h2 className="panel-title m-0">Line items</h2>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setItems((l) => [...l, blankItem()])}><i className="bi bi-plus-lg me-1" />Add item</button>
          </div>
          <div className="table-responsive">
            <table className="table table-clean">
              <thead><tr><th style={{ minWidth: 220 }}>Description</th><th style={{ width: 90 }}>Qty</th><th style={{ width: 130 }}>Unit price</th><th style={{ width: 120 }}>Discount</th><th style={{ width: 110 }}>Tax</th><th className="text-end">Line total</th><th /></tr></thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={idx}>
                    <td>
                      <input className={inputClass(errors[`desc${idx}`])} value={i.itemDescription} maxLength={250} placeholder="e.g. Consultation, X-ray, Room charge" onChange={(e) => update(idx, "itemDescription", e.target.value)} />
                      {errors[`desc${idx}`] && <div className="text-danger small">{errors[`desc${idx}`]}</div>}
                    </td>
                    <td><input type="number" min="0.01" step="0.01" className={inputClass(errors[`qty${idx}`])} value={i.quantity} onChange={(e) => update(idx, "quantity", e.target.value)} /></td>
                    <td><input type="number" min="0" step="0.01" className={inputClass(errors[`price${idx}`])} value={i.unitPrice} onChange={(e) => update(idx, "unitPrice", e.target.value)} /></td>
                    <td><input type="number" min="0" step="0.01" className="form-control" value={i.discountAmount} onChange={(e) => update(idx, "discountAmount", e.target.value)} /></td>
                    <td><input type="number" min="0" step="0.01" className="form-control" value={i.taxAmount} onChange={(e) => update(idx, "taxAmount", e.target.value)} /></td>
                    <td className="text-end fw-semibold">{money(lineTotal(i))}</td>
                    <td className="text-end">
                      <button type="button" className="btn btn-outline-danger icon-btn" aria-label="Remove item" disabled={items.length === 1} onClick={() => setItems((l) => l.filter((_, k) => k !== idx))}><i className="bi bi-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="row g-3 justify-content-end">
          <div className="col-md-5 col-lg-4">
            <div className="panel panel-body">
              <div className="d-flex justify-content-between py-1"><span>Subtotal</span><span>{money(totals.subTotal)}</span></div>
              <div className="d-flex justify-content-between align-items-center py-1">
                <span>Extra discount</span>
                <input type="number" min="0" step="0.01" className="form-control form-control-sm text-end" style={{ width: 120 }} value={extraDiscount} onChange={(e) => setExtraDiscount(e.target.value)} aria-label="Extra discount" />
              </div>
              <div className="d-flex justify-content-between py-1"><span>Total discount</span><span>− {money(totals.discount)}</span></div>
              <div className="d-flex justify-content-between py-1"><span>Tax</span><span>{money(totals.tax)}</span></div>
              <hr />
              <div className="d-flex justify-content-between"><strong>Grand total</strong><strong className="display-font fs-4">{money(totals.grand)}</strong></div>
              {errors.total && <div className="text-danger small mt-2">{errors.total}</div>}
              <div className="d-flex gap-2 mt-3">
                <button type="button" className="btn btn-outline-secondary flex-fill" onClick={() => navigate(-1)}>Cancel</button>
                <button className="btn btn-primary flex-fill" disabled={saving}>{saving && <span className="spinner-border spinner-border-sm me-2" />}Create invoice</button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
