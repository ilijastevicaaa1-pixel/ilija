import React, { createContext, useContext, useState, useEffect } from "react";

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
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'system-ui, sans-serif', zIndex: 99999 }}>
        <div style={{ width: 60, height: 60, border: '4px solid rgba(255,255,255,0.3)', borderRadius: '50%', borderTopColor: 'white', animation: 'spin 1s ease-in-out infinite' }} />
        <h2 style={{ marginTop: 24, fontSize: 28, fontWeight: 600 }}>Učitavanje aplikacije...</h2>
        <p style={{ marginTop: 8, opacity: 0.9 }}>Knjigovodstvo AI</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
