import { useState } from "react";
import { getErrorMessage, http } from "../../api/client";
import Field, { inputClass, selectClass } from "../../components/Field";
import { EmptyState, ErrorAlert, Loading } from "../../components/Feedback";
import Modal, { ConfirmModal } from "../../components/Modal";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useApi, useDebounce } from "../../hooks/useApi";
import { nullify } from "../../utils/format";

const EMPTY = { username: "", password: "", fullName: "", email: "", phone: "", roleId: "" };
const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,100}$/;

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [filters, setFilters] = useState({ search: "", roleId: "", isActive: "" });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | "new" | user
  const [resetFor, setResetFor] = useState(null);
  const [toggleFor, setToggleFor] = useState(null);
  const search = useDebounce(filters.search);

  const roles = useApi(() => http.get("/admin/roles"), []);
  const { data, loading, error, reload } = useApi(
    () => http.get("/admin/users", { ...filters, search, page, pageSize: 10 }),
    [search, filters.roleId, filters.isActive, page]
  );
  const set = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };

  return (
    <>
      <PageHeader title="Users" subtitle="Create staff accounts, assign roles and deactivate access." crumbs={[{ label: "Administration" }, { label: "Users" }]}>
        <button className="btn btn-primary" onClick={() => setEditing("new")}><i className="bi bi-person-plus me-1" />Add user</button>
      </PageHeader>

      <div className="panel">
        <div className="filter-bar row g-2">
          <div className="col-md-5"><input className="form-control" placeholder="Search name, username or email" aria-label="Search users" value={filters.search} onChange={set("search")} /></div>
          <div className="col-md-3">
            <select className="form-select" aria-label="Role" value={filters.roleId} onChange={set("roleId")}>
              <option value="">All roles</option>
              {roles.data?.map((r) => <option key={r.roleId} value={r.roleId}>{r.roleName}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-select" aria-label="Status" value={filters.isActive} onChange={set("isActive")}>
              <option value="">Any status</option><option value="true">Active</option><option value="false">Inactive</option>
            </select>
          </div>
        </div>

        <ErrorAlert message={error} onRetry={reload} />
        {loading && !data ? <Loading /> : data?.items.length === 0 ? <EmptyState icon="bi-person-x" title="No users match" /> : (
          <div className="table-responsive">
            <table className="table table-clean">
              <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Contact</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data?.items.map((u) => (
                  <tr key={u.userId}>
                    <td className="fw-semibold">{u.fullName}{u.userId === me.userId && <span className="text-muted fw-normal"> (you)</span>}</td>
                    <td>{u.username}</td>
                    <td>{u.roleName}</td>
                    <td>{u.email ?? "—"}<div className="small text-muted">{u.phone}</div></td>
                    <td><StatusPill status={u.isActive ? "Active" : "Inactive"} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-outline-secondary icon-btn" title="Edit" aria-label="Edit" onClick={() => setEditing(u)}><i className="bi bi-pencil" /></button>
                        <button className="btn btn-outline-secondary icon-btn" title="Reset password" aria-label="Reset password" onClick={() => setResetFor(u)}><i className="bi bi-key" /></button>
                        {u.userId !== me.userId && (
                          <button className={`btn icon-btn ${u.isActive ? "btn-outline-danger" : "btn-outline-success"}`} title={u.isActive ? "Deactivate" : "Reactivate"}
                            aria-label={u.isActive ? "Deactivate" : "Reactivate"} onClick={() => setToggleFor(u)}>
                            <i className={`bi ${u.isActive ? "bi-person-dash" : "bi-person-check"}`} />
                          </button>
                        )}
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

      {editing && <UserModal user={editing === "new" ? null : editing} roles={roles.data ?? []} onClose={() => setEditing(null)}
        onSaved={(msg) => { toast.success(msg); setEditing(null); reload(); }} />}
      {resetFor && <ResetModal user={resetFor} onClose={() => setResetFor(null)} onSaved={() => { toast.success("Password reset."); setResetFor(null); }} />}
      {toggleFor && <Toggle user={toggleFor} onClose={() => setToggleFor(null)} onDone={(msg) => { toast.success(msg); setToggleFor(null); reload(); }} />}
    </>
  );
}

function UserModal({ user, roles, onClose, onSaved }) {
  const editing = !!user;
  const [form, setForm] = useState(editing ? { ...EMPTY, username: user.username, fullName: user.fullName, email: user.email ?? "", phone: user.phone ?? "", roleId: String(user.roleId) } : EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    const v = {};
    if (!/^[A-Za-z0-9._-]{3,50}$/.test(form.username)) v.username = "3–50 letters, digits, dot, dash or underscore.";
    if (!form.fullName.trim()) v.fullName = "Full name is required.";
    if (!form.roleId) v.roleId = "Select a role.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) v.email = "Enter a valid email address.";
    if (!editing && !PASSWORD.test(form.password)) v.password = "At least 8 characters with letters and numbers.";
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    setServerError("");
    try {
      const body = nullify({ ...form, roleId: Number(form.roleId), password: editing ? null : form.password });
      if (editing) await http.put(`/admin/users/${user.userId}`, body);
      else await http.post("/admin/users", body);
      onSaved(editing ? "User updated." : "User created.");
    } catch (e) {
      setServerError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? "Edit user" : "Add user"} onClose={onClose} width={560}
      footer={<><button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving && <span className="spinner-border spinner-border-sm me-2" />}{editing ? "Save changes" : "Create user"}</button></>}>
      <ErrorAlert message={serverError} />
      <div className="row g-3">
        <Field className="col-md-6" label="Full name" required error={errors.fullName}><input className={inputClass(errors.fullName)} value={form.fullName} onChange={set("fullName")} maxLength={150} /></Field>
        <Field className="col-md-6" label="Username" required error={errors.username}><input className={inputClass(errors.username)} value={form.username} onChange={set("username")} autoComplete="off" /></Field>
        <Field className="col-md-6" label="Role" required error={errors.roleId}>
          <select className={selectClass(errors.roleId)} value={form.roleId} onChange={set("roleId")}>
            <option value="">Select…</option>{roles.map((r) => <option key={r.roleId} value={r.roleId}>{r.roleName}</option>)}
          </select>
        </Field>
        {!editing && <Field className="col-md-6" label="Temporary password" required error={errors.password}><input type="password" className={inputClass(errors.password)} value={form.password} onChange={set("password")} autoComplete="new-password" /></Field>}
        <Field className="col-md-6" label="Email" error={errors.email}><input className={inputClass(errors.email)} value={form.email} onChange={set("email")} maxLength={150} /></Field>
        <Field className="col-md-6" label="Phone"><input className="form-control" value={form.phone} onChange={set("phone")} maxLength={20} /></Field>
      </div>
    </Modal>
  );
}

function ResetModal({ user, onClose, onSaved }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!PASSWORD.test(password)) return setError("At least 8 characters with letters and numbers.");
    setSaving(true);
    try { await http.post(`/admin/users/${user.userId}/reset-password`, { newPassword: password }); onSaved(); }
    catch (e) { setError(getErrorMessage(e)); setSaving(false); }
  };
  return (
    <Modal title={`Reset password for ${user.fullName}`} onClose={onClose}
      footer={<><button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Reset password</button></>}>
      <ErrorAlert message={error} />
      <Field label="New password" required><input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
    </Modal>
  );
}

function Toggle({ user, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const go = async () => {
    setBusy(true);
    try { await http.patch(`/admin/users/${user.userId}/status`, { isActive: !user.isActive }); onDone(user.isActive ? "User deactivated." : "User reactivated."); }
    catch (e) { toast.error(getErrorMessage(e)); onClose(); }
  };
  return (
    <ConfirmModal title={user.isActive ? "Deactivate user?" : "Reactivate user?"} danger={user.isActive} busy={busy}
      message={user.isActive ? `${user.fullName} will no longer be able to sign in.` : `${user.fullName} will be able to sign in again.`}
      confirmLabel={user.isActive ? "Deactivate" : "Reactivate"} onConfirm={go} onClose={onClose} />
  );
}
