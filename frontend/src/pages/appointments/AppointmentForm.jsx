import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getErrorMessage, http } from "../../api/client";
import Field, { inputClass, selectClass } from "../../components/Field";
import { ErrorAlert, Loading } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import PatientPicker from "../../components/PatientPicker";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { fmtTime, nullify, todayIso, toTimeParam } from "../../utils/format";

export default function AppointmentForm() {
  const { id } = useParams();
  const editing = !!id;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { money } = useSettings();

  const [patient, setPatient] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({ doctorId: params.get("doctorId") ?? "", date: todayIso(), startTime: "", reason: "", notes: "" });
  const [slots, setSlots] = useState(null); // null = not loaded yet
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Initial data: doctors, and either the appointment being edited or a prefilled patient.
  useEffect(() => {
    (async () => {
      try {
        setDoctors(await http.get("/doctors/lookup"));
        if (editing) {
          const a = await http.get(`/appointments/${id}`);
          setPatient({ patientId: a.patientId, fullName: a.patientName, patientCode: a.patientCode });
          setForm({ doctorId: String(a.doctorId), date: a.appointmentDate, startTime: a.startTime, reason: a.reason ?? "", notes: a.notes ?? "" });
        } else if (params.get("patientId")) {
          const p = await http.get(`/patients/${params.get("patientId")}`);
          setPatient({ patientId: p.patientId, fullName: p.fullName, patientCode: p.patientCode, phone: p.phone });
        }
      } catch (e) {
        setServerError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload available slots whenever doctor or date changes.
  useEffect(() => {
    if (!form.doctorId || !form.date) return setSlots(null);
    let alive = true;
    setSlotsLoading(true);
    http.get("/appointments/slots", { doctorId: form.doctorId, date: form.date, excludeAppointmentId: id })
      .then((s) => alive && setSlots(s))
      .catch((e) => alive && setServerError(getErrorMessage(e)))
      .finally(() => alive && setSlotsLoading(false));
    return () => { alive = false; };
  }, [form.doctorId, form.date, id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k !== "reason" && k !== "notes" ? { startTime: "" } : {}) }));
  const doctor = doctors.find((d) => String(d.doctorId) === String(form.doctorId));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!patient) v.patient = "Select a patient.";
    if (!form.doctorId) v.doctorId = "Select a doctor.";
    if (!form.date) v.date = "Select a date.";
    else if (form.date < todayIso()) v.date = "Choose today or a future date.";
    if (!form.startTime) v.startTime = "Pick a time slot.";
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    setServerError("");
    try {
      const body = nullify({
        patientId: patient.patientId, doctorId: Number(form.doctorId), appointmentDate: form.date,
        startTime: toTimeParam(form.startTime), reason: form.reason, notes: form.notes,
      });
      const saved = editing ? await http.put(`/appointments/${id}`, body) : await http.post("/appointments", body);
      toast.success(editing ? `${saved.appointmentNo} rescheduled.` : `Appointment ${saved.appointmentNo} booked.`);
      navigate(`/appointments/${saved.appointmentId}`);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title={editing ? "Reschedule appointment" : "Book appointment"} subtitle="Only open slots from the doctor's schedule can be chosen."
        crumbs={[{ label: "Appointments", to: "/appointments" }, { label: editing ? "Reschedule" : "Book" }]} />
      <form className="row g-3" onSubmit={submit} noValidate>
        <div className="col-lg-7">
          <div className="panel panel-body">
            <ErrorAlert message={serverError} />
            <div className="row g-3">
              <Field className="col-12" label="Patient" required error={errors.patient}>
                <PatientPicker value={patient} onChange={setPatient} disabled={editing} invalid={!!errors.patient} />
              </Field>
              <Field className="col-md-7" label="Doctor" required error={errors.doctorId}>
                <select className={selectClass(errors.doctorId)} value={form.doctorId} onChange={set("doctorId")}>
                  <option value="">Select a doctor…</option>
                  {doctors.map((d) => <option key={d.doctorId} value={d.doctorId}>{d.fullName} — {d.specializationName}</option>)}
                </select>
              </Field>
              <Field className="col-md-5" label="Date" required error={errors.date}>
                <input type="date" className={inputClass(errors.date)} min={todayIso()} value={form.date} onChange={set("date")} />
              </Field>
              <Field className="col-12" label="Reason for visit">
                <input className="form-control" maxLength={500} value={form.reason} onChange={set("reason")} placeholder="e.g. Follow-up, fever, check-up" />
              </Field>
              <Field className="col-12" label="Notes">
                <textarea className="form-control" rows={2} maxLength={1000} value={form.notes} onChange={set("notes")} />
              </Field>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="panel panel-body h-100">
            <h2 className="panel-title">Available times</h2>
            {doctor && <div className="small text-muted mb-2">Consultation fee {money(doctor.consultationFee)}</div>}
            {!form.doctorId || !form.date ? (
              <div className="text-muted">Choose a doctor and date to see open slots.</div>
            ) : slotsLoading ? (
              <div className="text-muted"><span className="spinner-border spinner-border-sm me-2" />Checking the schedule…</div>
            ) : slots && slots.length === 0 ? (
              <div className="alert alert-warning mb-0">This doctor does not work on the selected day. Try another date.</div>
            ) : (
              <div className="slot-grid" role="radiogroup" aria-label="Time slots">
                {slots?.map((s) => (
                  <button type="button" key={s.startTime} role="radio" aria-checked={form.startTime === s.startTime}
                    className={`slot ${form.startTime === s.startTime ? "active" : ""}`} disabled={!s.isAvailable}
                    onClick={() => setForm((f) => ({ ...f, startTime: s.startTime }))}>
                    {fmtTime(s.startTime)}
                  </button>
                ))}
              </div>
            )}
            {errors.startTime && <div className="text-danger small mt-2">{errors.startTime}</div>}
            <div className="small text-muted mt-3">Struck-through times are already booked, in the past, or the session is full.</div>
          </div>
        </div>

        <div className="col-12 d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2" />}{editing ? "Save new time" : "Book appointment"}
          </button>
        </div>
      </form>
    </>
  );
}
