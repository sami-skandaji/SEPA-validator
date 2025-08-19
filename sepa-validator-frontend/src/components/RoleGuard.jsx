// src/components/RoleGuard.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

export default function RoleGuard({ need = "ADMIN", children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // ou spinner
  if (!user) return <Navigate to="/login" replace />;
  if (need && user.role !== need) return <Navigate to="/dashboard" replace />;
  return children;
}
