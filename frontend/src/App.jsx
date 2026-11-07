import { Link, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { ROLES } from "./context/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PatientList from "./pages/patients/PatientList";
import PatientForm from "./pages/patients/PatientForm";
import PatientDetails from "./pages/patients/PatientDetails";
import PatientHistory from "./pages/patients/PatientHistory";
import DoctorList from "./pages/doctors/DoctorList";
import DoctorForm from "./pages/doctors/DoctorForm";
import DoctorDetails from "./pages/doctors/DoctorDetails";
import DoctorSchedule from "./pages/doctors/DoctorSchedule";
import AppointmentList from "./pages/appointments/AppointmentList";
import AppointmentForm from "./pages/appointments/AppointmentForm";
import AppointmentDetails from "./pages/appointments/AppointmentDetails";
import InvoiceList from "./pages/billing/InvoiceList";
import InvoiceCreate from "./pages/billing/InvoiceCreate";
import InvoiceDetails from "./pages/billing/InvoiceDetails";
import PaymentCreate from "./pages/billing/PaymentCreate";
import BillingReports from "./pages/billing/BillingReports";
import Users from "./pages/admin/Users";
import Roles from "./pages/admin/Roles";
import { Specializations, AppointmentStatuses } from "./pages/admin/LookupPages";
import AuditLogs from "./pages/admin/AuditLogs";
import Settings from "./pages/admin/Settings";

const { Admin, Receptionist, Billing, Doctor } = ROLES;
const guard = (roles, el) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;

function NotFound() {
  return (
    <div className="empty">
      <i className="bi bi-compass" />
      <h1 className="h3 mt-2">We couldn't find that page</h1>
      <Link to="/" className="btn btn-primary mt-2">Back to dashboard</Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />

        <Route path="patients" element={<PatientList />} />
        <Route path="patients/new" element={guard([Admin, Receptionist], <PatientForm />)} />
        <Route path="patients/:id" element={<PatientDetails />} />
        <Route path="patients/:id/edit" element={guard([Admin, Receptionist], <PatientForm />)} />
        <Route path="patients/:id/history" element={<PatientHistory />} />

        <Route path="doctors" element={<DoctorList />} />
        <Route path="doctors/new" element={guard([Admin], <DoctorForm />)} />
        <Route path="doctors/:id" element={<DoctorDetails />} />
        <Route path="doctors/:id/edit" element={guard([Admin], <DoctorForm />)} />
        <Route path="doctors/:id/schedule" element={guard([Admin], <DoctorSchedule />)} />

        <Route path="appointments" element={guard([Admin, Receptionist, Doctor], <AppointmentList />)} />
        <Route path="appointments/new" element={guard([Admin, Receptionist], <AppointmentForm />)} />
        <Route path="appointments/:id" element={guard([Admin, Receptionist, Doctor], <AppointmentDetails />)} />
        <Route path="appointments/:id/edit" element={guard([Admin, Receptionist], <AppointmentForm />)} />
        <Route path="appointments/:id/checkin" element={guard([Admin, Receptionist, Doctor], <AppointmentDetails />)} />

        <Route path="billing/invoices" element={guard([Admin, Billing], <InvoiceList />)} />
        <Route path="billing/invoices/new" element={guard([Admin, Billing], <InvoiceCreate />)} />
        <Route path="billing/invoices/:id" element={guard([Admin, Billing], <InvoiceDetails />)} />
        <Route path="billing/payments/create" element={guard([Admin, Billing], <PaymentCreate />)} />
        <Route path="billing/reports" element={guard([Admin, Billing], <BillingReports />)} />

        <Route path="admin/users" element={guard([Admin], <Users />)} />
        <Route path="admin/roles" element={guard([Admin], <Roles />)} />
        <Route path="admin/specializations" element={guard([Admin], <Specializations />)} />
        <Route path="admin/appointment-statuses" element={guard([Admin], <AppointmentStatuses />)} />
        <Route path="admin/audit-logs" element={guard([Admin], <AuditLogs />)} />
        <Route path="admin/settings" element={guard([Admin], <Settings />)} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
