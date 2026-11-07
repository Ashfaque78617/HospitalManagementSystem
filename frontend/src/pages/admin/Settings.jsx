import { useEffect, useState } from "react";
import { getErrorMessage, http } from "../../api/client";
import Field from "../../components/Field";
import { ErrorAlert, Loading } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";

const LABELS = {
  HospitalName: "Hospital name",
  HospitalPhone: "Phone",
  HospitalEmail: "Email",
  HospitalAddress: "Address",
  InvoicePrefix: "Invoice number prefix",
  CurrencySymbol: "Currency symbol",
  InvoiceFooter: "Invoice footer text",
};

export default function Settings() {
  const toast = useToast();
  const { refresh } = useSettings();
  const [items, setItems] = useState([]);
  const [values, setValues] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    http.get("/settings")
      .then((list) => { setItems(list); setValues(Object.fromEntries(list.map((s) => [s.settingKey, s.settingValue ?? ""]))); })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!values.HospitalName?.trim()) return setError("Hospital name is required.");
    setSaving(true);
    setError("");
    try {
      await http.put("/settings", { values });
      await refresh();
      toast.success("Settings saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="System settings" subtitle="Hospital details shown on the app header and printed invoices." crumbs={[{ label: "Administration" }, { label: "Settings" }]} />
      <form className="panel panel-body" onSubmit={save} style={{ maxWidth: 760 }}>
        <ErrorAlert message={error} />
        <div className="row g-3">
          {items.map((s) => (
            <Field key={s.settingKey} className={["HospitalAddress", "InvoiceFooter"].includes(s.settingKey) ? "col-12" : "col-md-6"}
              label={LABELS[s.settingKey] ?? s.settingKey} required={s.settingKey === "HospitalName"} hint={s.description}>
              <input className="form-control" maxLength={500} value={values[s.settingKey] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [s.settingKey]: e.target.value }))} />
            </Field>
          ))}
        </div>
        <div className="d-flex justify-content-end mt-4">
          <button className="btn btn-primary" disabled={saving}>{saving && <span className="spinner-border spinner-border-sm me-2" />}Save settings</button>
        </div>
      </form>
    </>
  );
}
