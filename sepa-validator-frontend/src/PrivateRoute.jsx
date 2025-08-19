// src/PrivateRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./store/AuthContext";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null; // ou un spinner de chargement

  return user ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
