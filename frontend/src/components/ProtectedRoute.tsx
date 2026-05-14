import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Mobile number gate: redirect to profile-setup until mobile is set
  // (avoid redirect loop by not gating profile-setup itself)
  if (!user.mobile_number && location.pathname !== "/profile-setup") {
    return <Navigate to="/profile-setup" replace />;
  }
  if (!user.is_profile_complete && location.pathname !== "/profile-setup") {
    return <Navigate to="/profile-setup" replace />;
  }
  return <Outlet />;
}

export function RequireAuthNoProfileCheck() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RedirectIfAuthed() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (user && user.is_profile_complete && user.mobile_number) return <Navigate to="/groups" replace />;
  if (user) return <Navigate to="/profile-setup" replace />;
  return <Outlet />;
}
