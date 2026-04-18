import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // 1) Dok loading traje → prazan ekran
  if (loading) return null;

  // 2) Ako nema usera → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3) Ako je user tu → prikaži stranu
  return children;
}

