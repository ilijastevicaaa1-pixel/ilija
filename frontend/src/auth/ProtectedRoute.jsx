import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Dok AuthProvider učitava user-a - SAKRIVENO
  if (loading) {
    return <div>Učitavanje...</div>;
  }

  // Ako user ne postoji
  if (!user || !user.token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
