import { useState } from "react";
import { getErrorMessage, http } from "../../api/client";
import Field, { inputClass } from "../../components/Field";
import { EmptyState, ErrorAlert, Loading } from "../../components/Feedback";
import Modal from "../../components/Modal";
import PageHeader from "../../components/PageHeader";
import StatusPill from "../../components/StatusPill";
import { useToast } from "../../context/ToastContext";
import { useApi } from "../../hooks/useApi";

/** Shared screen for small reference tables: list + add/edit modal. */
function LookupAdmin({ title, subtitle, singular, endpoint, idKey, nameKey, descKey, countKey, countLabel }) {
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => http.get(endpoint), [endpoint]);
  const [editing, setEditing] = useState(null);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} crumbs={[{ label: "Administration" }, { label: title }]}>
        <button className="btn btn-primary" onClick={() => setEditing({})}><i className="bi bi-plus-lg me-1" />Add {singular}</button>
      </PageHeader>
      <div className="panel">
        <ErrorAlert message={error} onRetry={reload} />
        {loading && !data ? <Loading /> : data?.length === 0 ? <EmptyState title={`No ${title.toLowerCase()} yet`} /> : (
          <div className="table-responsive">
            <table className="table table-clean">
              <thead><tr><th>Name</th>{descKey && <th>Description</th>}{countKey && <th>{countLabel}</th>}<th>Status</th><th /></tr></thead>
              <tbody>
                {data?.map((row) => (
                  <tr key={row[idKey]}>
                    <td className="fw-semibold">{row[nameKey]}</td>
                    {descKey && <td>{row[descKey] ?? "—"}</td>}
                    {countKey && <td>{row[countKey]}</td>}
                    <td><StatusPill status={row.isActive ? "Active" : "Inactive"} /></td>
                    <td className="text-end"><button className="btn btn-outline-secondary btn-sm" onClick={() => setEditing(row)}><i className="bi bi-pencil me-1" />Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && (
        <LookupModal item={editing} singular={singular} endpoint={endpoint} idKey={idKey} nameKey={nameKey} descKey={descKey}
          onClose={() => setEditing(null)} onSaved={(msg) => { toast.success(msg); setEditing(null); reload(); }} />
      )}
    </>
  );
}

function LookupModal({ item, singular, endpoint, idKey, nameKey, descKey, onClose, onSaved }) {
  const editing = item[idKey] != null;
  const [name, setName] = useState(item[nameKey] ?? "");
  const [description, setDescription] = useState(item[descKey] ?? "");
  const [isActive, setIsActive] = useState(item.isActive ?? true);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return setNameError("Name is required.");
    setSaving(true);
    setError("");
    const body = { [nameKey]: name.trim(), isActive, ...(descKey ? { [descKey]: description.trim() || null } : {}) };
    try {
      if (editing) await http.put(`${endpoint}/${item[idKey]}`, body);
      else await http.post(endpoint, body);
      onSaved(editing ? `${singular[0].toUpperCase()}${singular.slice(1)} updated.` : `${singular[0].toUpperCase()}${singular.slice(1)} added.`);
    } catch (e) {
      setError(getErrorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? `Edit ${singular}` : `Add ${singular}`} onClose={onClose}
      footer={<><button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></>}>
      <ErrorAlert message={error} />
      <div className="d-grid gap-3">
        <Field label="Name" required error={nameError}><input className={inputClass(nameError)} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        {descKey && <Field label="Description"><textarea className="form-control" rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>}
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" id="lookup-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <label className="form-check-label" htmlFor="lookup-active">Active (available in dropdowns)</label>
        </div>
      </div>
    </Modal>
  );
}

export const Specializations = () => (
  <LookupAdmin title="Specializations" subtitle="Medical fields doctors can be assigned to." singular="specialization"
    endpoint="/admin/specializations" idKey="specializationId" nameKey="specializationName" descKey="description" countKey="doctorCount" countLabel="Doctors" />
);

export const AppointmentStatuses = () => (
  <LookupAdmin title="Appointment statuses" subtitle="The built-in statuses drive the visit workflow and are locked; you can add extra labels." singular="status"
    endpoint="/admin/appointment-statuses" idKey="appointmentStatusId" nameKey="statusName" />
);
