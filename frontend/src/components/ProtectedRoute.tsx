import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_profile_complete) return <Navigate to="/profile-setup" replace />;
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
  if (user && user.is_profile_complete) return <Navigate to="/groups" replace />;
  if (user && !user.is_profile_complete) return <Navigate to="/profile-setup" replace />;
  return <Outlet />;
}
