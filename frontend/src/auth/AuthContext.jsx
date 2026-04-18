import React, { createContext, useContext, useState, useEffect } from "react";
import LoadingScreen from "../components/LoadingScreen.jsx";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const tenantId = localStorage.getItem("tenantId");
    const role = localStorage.getItem("role");
    const email = localStorage.getItem("email");

    if (token && tenantId && role) {
      setUser({ token, tenantId, role, email });
    }

    setLoading(false);
  }, []);

  const login = ({ token, tenantId, role, email }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("tenantId", tenantId);
    localStorage.setItem("role", role);
    if (email) localStorage.setItem("email", email);

    setUser({ token, tenantId, role, email });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("tenantId");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    setUser(null);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ user, loading: false, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
