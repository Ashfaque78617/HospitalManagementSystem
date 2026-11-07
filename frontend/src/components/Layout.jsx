import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ROLES, useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { IMAGES, bg } from "../config/images";
import { initials } from "../utils/format";

const { Admin, Receptionist, Billing, Doctor } = ROLES;
const ALL = [Admin, Receptionist, Billing, Doctor];

const NAV = [
  { title: "Overview", items: [{ to: "/", label: "Dashboard", icon: "bi-grid-1x2", roles: ALL, end: true }] },
  {
    title: "Care",
    items: [
      { to: "/patients", label: "Patients", icon: "bi-people", roles: ALL },
      { to: "/doctors", label: "Doctors", icon: "bi-heart-pulse", roles: ALL },
      { to: "/appointments", label: "Appointments", icon: "bi-calendar2-week", roles: [Admin, Receptionist, Doctor] },
    ],
  },
  {
    title: "Billing",
    items: [
      { to: "/billing/invoices", label: "Invoices", icon: "bi-receipt", roles: [Admin, Billing] },
      { to: "/billing/payments/create", label: "Record payment", icon: "bi-cash-coin", roles: [Admin, Billing] },
      { to: "/billing/reports", label: "Billing summary", icon: "bi-bar-chart-line", roles: [Admin, Billing] },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/admin/users", label: "Users", icon: "bi-person-gear", roles: [Admin] },
      { to: "/admin/roles", label: "Roles", icon: "bi-shield-check", roles: [Admin] },
      { to: "/admin/specializations", label: "Specializations", icon: "bi-bookmark-heart", roles: [Admin] },
      { to: "/admin/appointment-statuses", label: "Appointment statuses", icon: "bi-list-check", roles: [Admin] },
      { to: "/admin/audit-logs", label: "Audit logs", icon: "bi-journal-text", roles: [Admin] },
      { to: "/admin/settings", label: "System settings", icon: "bi-sliders", roles: [Admin] },
    ],
  },
];

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]);

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Main navigation">
        <div className="sidebar-brand" style={bg(IMAGES.sidebar, "linear-gradient(180deg, rgba(7,47,55,.72), rgba(7,47,55,.97))")}>
          <div className="logo"><i className="bi bi-hospital" /></div>
          <div className="name">{settings.HospitalName ?? "Hospital Management"}</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((section) => {
            const items = section.items.filter((i) => hasRole(...i.roles));
            if (!items.length) return null;
            return (
              <div key={section.title}>
                <div className="side-title">{section.title}</div>
                {items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}>
                    <i className={`bi ${i.icon}`} />{i.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-foot">{settings.HospitalPhone}</div>
      </aside>
      <div className={`scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="btn btn-outline-secondary d-lg-none" aria-label="Open menu" onClick={() => setOpen(true)}>
            <i className="bi bi-list" />
          </button>
          <div className="ms-auto d-flex align-items-center gap-3">
            <div className="text-end d-none d-sm-block lh-sm">
              <div className="fw-semibold">{user.fullName}</div>
              <div className="small text-muted">{user.role}</div>
            </div>
            <div className="avatar" aria-hidden="true">{initials(user.fullName)}</div>
            <button className="btn btn-outline-secondary btn-sm" onClick={signOut}>
              <i className="bi bi-box-arrow-right me-1" />Sign out
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
        <footer className="app-footer">
          © {new Date().getFullYear()} {settings.HospitalName ?? "Hospital Management System"}
        </footer>
      </div>
    </>
  );
}
