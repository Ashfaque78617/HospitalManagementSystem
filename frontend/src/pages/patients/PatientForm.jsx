import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getErrorMessage, http } from "../../api/client";
import Field, { inputClass, selectClass } from "../../components/Field";
import { ErrorAlert, Loading } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";
import { nullify, todayIso } from "../../utils/format";

const EMPTY = {
  firstName: "", lastName: "", dateOfBirth: "", gender: "", bloodGroup: "", phone: "", email: "",
  address: "", emergencyContactName: "", emergencyContactPhone: "",
};
const PHONE = /^[0-9+\-\s()]{7,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(f) {
  const e = {};
  if (!f.firstName.trim()) e.firstName = "First name is required.";
  if (!f.phone.trim()) e.phone = "Phone number is required.";
  else if (!PHONE.test(f.phone.trim())) e.phone = "Enter a valid phone number (7–20 digits).";
  if (f.email && !EMAIL.test(f.email)) e.email = "Enter a valid email address.";
  if (f.dateOfBirth && f.dateOfBirth > todayIso()) e.dateOfBirth = "Date of birth cannot be in the future.";
  if (f.emergencyContactPhone && !PHONE.test(f.emergencyContactPhone.trim())) e.emergencyContactPhone = "Enter a valid phone number.";
  return e;
}

export default function PatientForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    http.get(`/patients/${id}`)
      .then((p) => setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] ?? ""]))))
      .catch((e) => setServerError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    setServerError("");
    try {
      const body = nullify(form);
      const saved = editing ? await http.put(`/patients/${id}`, body) : await http.post("/patients", body);
      toast.success(editing ? "Patient details updated." : `Patient registered as ${saved.patientCode}.`);
      navigate(`/patients/${saved.patientId}`);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader
        title={editing ? "Edit patient" : "Register patient"}
        subtitle="Fields marked * are required."
        crumbs={[{ label: "Patients", to: "/patients" }, { label: editing ? "Edit" : "Register" }]}
      />
      <form className="panel panel-body" onSubmit={submit} noValidate>
        <ErrorAlert message={serverError} />
        <h2 className="panel-title">Personal details</h2>
        <div className="row g-3 mb-4">
          <Field className="col-md-6" label="First name" required error={errors.firstName}>
            <input className={inputClass(errors.firstName)} value={form.firstName} onChange={set("firstName")} maxLength={80} />
          </Field>
          <Field className="col-md-6" label="Last name">
            <input className="form-control" value={form.lastName} onChange={set("lastName")} maxLength={80} />
          </Field>
          <Field className="col-md-4" label="Date of birth" error={errors.dateOfBirth}>
            <input type="date" className={inputClass(errors.dateOfBirth)} value={form.dateOfBirth} max={todayIso()} onChange={set("dateOfBirth")} />
          </Field>
          <Field className="col-md-4" label="Gender">
            <select className={selectClass()} value={form.gender} onChange={set("gender")}>
              <option value="">Not specified</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </Field>
          <Field className="col-md-4" label="Blood group">
            <select className={selectClass()} value={form.bloodGroup} onChange={set("bloodGroup")}>
              <option value="">Unknown</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
        </div>

        <h2 className="panel-title">Contact</h2>
        <div className="row g-3 mb-4">
          <Field className="col-md-6" label="Phone" required error={errors.phone}>
            <input className={inputClass(errors.phone)} value={form.phone} onChange={set("phone")} maxLength={20} inputMode="tel" />
          </Field>
          <Field className="col-md-6" label="Email" error={errors.email}>
            <input type="email" className={inputClass(errors.email)} value={form.email} onChange={set("email")} maxLength={150} />
          </Field>
          <Field className="col-12" label="Address">
            <textarea className="form-control" rows={2} value={form.address} onChange={set("address")} maxLength={500} />
          </Field>
        </div>

        <h2 className="panel-title">Emergency contact</h2>
        <div className="row g-3 mb-4">
          <Field className="col-md-6" label="Contact name">
            <input className="form-control" value={form.emergencyContactName} onChange={set("emergencyContactName")} maxLength={150} />
          </Field>
          <Field className="col-md-6" label="Contact phone" error={errors.emergencyContactPhone}>
            <input className={inputClass(errors.emergencyContactPhone)} value={form.emergencyContactPhone} onChange={set("emergencyContactPhone")} maxLength={20} inputMode="tel" />
          </Field>
        </div>

        <div className="d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2" />}{editing ? "Save changes" : "Register patient"}
          </button>
        </div>
      </form>
    </>
  );
}
