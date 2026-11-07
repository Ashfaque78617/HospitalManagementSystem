import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getErrorMessage, http } from "../../api/client";
import Field, { inputClass, selectClass } from "../../components/Field";
import { ErrorAlert, Loading } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";
import { nullify } from "../../utils/format";

const EMPTY = { firstName: "", lastName: "", specializationId: "", userId: "", qualification: "", phone: "", email: "", consultationFee: "" };
const PHONE = /^[0-9+\-\s()]{7,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function DoctorForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [specs, setSpecs] = useState([]);
  const [doctorUsers, setDoctorUsers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, roles] = await Promise.all([http.get("/lookups/specializations"), http.get("/lookups/roles")]);
        setSpecs(s);
        const doctorRole = roles.find((r) => r.roleName === "Doctor");
        if (doctorRole) setDoctorUsers((await http.get("/admin/users", { roleId: doctorRole.roleId, isActive: true, pageSize: 100 })).items);
        if (editing) {
          const d = await http.get(`/doctors/${id}`);
          setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, d[k] ?? ""])));
        }
      } catch (e) {
        setServerError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!form.firstName.trim()) v.firstName = "First name is required.";
    if (!form.specializationId) v.specializationId = "Select a specialization.";
    if (form.consultationFee === "" || Number(form.consultationFee) < 0) v.consultationFee = "Enter a fee of 0 or more.";
    if (form.phone && !PHONE.test(form.phone)) v.phone = "Enter a valid phone number.";
    if (form.email && !EMAIL.test(form.email)) v.email = "Enter a valid email address.";
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    setServerError("");
    try {
      const body = nullify({
        ...form,
        specializationId: Number(form.specializationId),
        userId: form.userId ? Number(form.userId) : null,
        consultationFee: Number(form.consultationFee),
      });
      const saved = editing ? await http.put(`/doctors/${id}`, body) : await http.post("/doctors", body);
      toast.success(editing ? "Doctor updated." : `Doctor created as ${saved.doctorCode}. Next, set their weekly schedule.`);
      navigate(editing ? `/doctors/${id}` : `/doctors/${saved.doctorId}/schedule`);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title={editing ? "Edit doctor" : "Add doctor"} crumbs={[{ label: "Doctors", to: "/doctors" }, { label: editing ? "Edit" : "Add" }]} />
      <form className="panel panel-body" onSubmit={submit} noValidate>
        <ErrorAlert message={serverError} />
        <div className="row g-3 mb-4">
          <Field className="col-md-6" label="First name" required error={errors.firstName}>
            <input className={inputClass(errors.firstName)} value={form.firstName} onChange={set("firstName")} maxLength={80} />
          </Field>
          <Field className="col-md-6" label="Last name">
            <input className="form-control" value={form.lastName} onChange={set("lastName")} maxLength={80} />
          </Field>
          <Field className="col-md-6" label="Specialization" required error={errors.specializationId}>
            <select className={selectClass(errors.specializationId)} value={form.specializationId} onChange={set("specializationId")}>
              <option value="">Select…</option>
              {specs.map((s) => <option key={s.specializationId} value={s.specializationId}>{s.specializationName}</option>)}
            </select>
          </Field>
          <Field className="col-md-6" label="Consultation fee" required error={errors.consultationFee}>
            <input type="number" min="0" step="0.01" className={inputClass(errors.consultationFee)} value={form.consultationFee} onChange={set("consultationFee")} />
          </Field>
          <Field className="col-12" label="Qualification">
            <input className="form-control" value={form.qualification} onChange={set("qualification")} maxLength={200} placeholder="e.g. MBBS, MD" />
          </Field>
          <Field className="col-md-6" label="Phone" error={errors.phone}>
            <input className={inputClass(errors.phone)} value={form.phone} onChange={set("phone")} maxLength={20} />
          </Field>
          <Field className="col-md-6" label="Email" error={errors.email}>
            <input className={inputClass(errors.email)} value={form.email} onChange={set("email")} maxLength={150} />
          </Field>
          <Field className="col-12" label="Linked login account" hint="Optional. Lets this doctor sign in and see only their own appointments. Create the user first under Administration > Users.">
            <select className="form-select" value={form.userId} onChange={set("userId")}>
              <option value="">No login account</option>
              {doctorUsers.map((u) => <option key={u.userId} value={u.userId}>{u.fullName} ({u.username})</option>)}
            </select>
          </Field>
        </div>
        <div className="d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2" />}{editing ? "Save changes" : "Create doctor"}
          </button>
        </div>
      </form>
    </>
  );
}
