import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Redirects to /login when signed out and to / when the role is not allowed. */
export default function ProtectedRoute({ roles = [], children }) {
  const { user, hasRole } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles.length && !hasRole(...roles)) return <Navigate to="/" replace />;
  return children;
}
