import { Navigate, Outlet, useLocation } from "react-router-dom";
import { homePathForRole, type Role } from "../api/client";
import { useAuth } from "./AuthContext";

type ProtectedRouteProps = {
  requireVerified?: boolean;
  roles?: Role[];
};

export function ProtectedRoute({
  requireVerified = false,
  roles,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-loader">Loading secure session...</div>;
  }

  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  if (requireVerified && !user.emailVerified) {
    return (
      <Navigate to="/verify-required" replace state={{ email: user.email }} />
    );
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <Outlet />;
}
