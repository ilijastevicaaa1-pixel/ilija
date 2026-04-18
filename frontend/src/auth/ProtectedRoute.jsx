import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // 1) Dok loading traje → prazan ekran
  if (loading) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, zIndex: 9999 }}>
        Učitavanje...
      </div>
    );
  }

  // 2) Ako nema usera → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3) Ako je user tu → prikaži stranu
  return children;
}

