import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");
    const role = localStorage.getItem("role");
    const tenantId = localStorage.getItem("tenantId");
    if (token) {
      setUser({ token, email, role, tenantId });
    }
    setLoading(false);
  }, []);

  const login = (data) => {
    localStorage.setItem("token", data.token);
    if (data.email) localStorage.setItem("email", data.email);
    if (data.role) localStorage.setItem("role", data.role);
    if (data.tenantId) localStorage.setItem("tenantId", data.tenantId);
    setUser({
      token: data.token,
      email: data.email,
      role: data.role,
      tenantId: data.tenantId
    });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("tenantId");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
