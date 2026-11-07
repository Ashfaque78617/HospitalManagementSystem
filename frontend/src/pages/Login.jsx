import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getErrorMessage, http } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { IMAGES, bg } from "../config/images";

const DEMO = [
  { label: "Admin", username: "admin", password: "Admin@123" },
  { label: "Receptionist", username: "reception", password: "Recep@123" },
  { label: "Billing staff", username: "billing", password: "Billing@123" },
  { label: "Doctor", username: "dr.sharma", password: "Doctor@123" },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hospital, setHospital] = useState("Hospital Management");

  useEffect(() => {
    http.get("/public/branding").then((b) => setHospital(b.hospitalName)).catch(() => {});
  }, []);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return setError("Enter your username and password.");
    setBusy(true);
    setError("");
    try {
      await login(form.username.trim(), form.password);
      navigate(location.state?.from?.pathname ?? "/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <section className="login-art" style={bg(IMAGES.login, "linear-gradient(180deg, rgba(7,47,55,.35), rgba(7,47,55,.92))")}>
        <h1>Every patient, on time and in order.</h1>
        <p>Appointments, patient records and billing for {hospital}, together in one calm workspace.</p>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submit} noValidate>
          <div className="d-flex align-items-center gap-2 mb-4">
            <span className="avatar" style={{ background: "var(--hms-teal)", color: "#fff" }}><i className="bi bi-hospital" /></span>
            <strong>{hospital}</strong>
          </div>
          <h2 className="h3 mb-1">Sign in</h2>
          <p className="text-muted">Use your staff account to continue.</p>

          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

          <div className="mb-3">
            <label className="form-label" htmlFor="username">Username</label>
            <input id="username" className="form-control form-control-lg" autoComplete="username" autoFocus
              value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" type="password" className="form-control form-control-lg" autoComplete="current-password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn btn-primary btn-lg w-100" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}Sign in
          </button>

          <div className="mt-4 pt-3 border-top">
            <div className="small text-muted mb-2">Demo accounts (fills the form for you)</div>
            <div className="d-flex flex-wrap gap-2">
              {DEMO.map((d) => (
                <button type="button" key={d.username} className="demo-chip" onClick={() => setForm({ username: d.username, password: d.password })}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
