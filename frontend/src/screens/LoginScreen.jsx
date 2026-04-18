import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

import "../styles/login.css";

function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/api/login", {
        method: "POST",
        body: { email, password },
      });

      if (data.error) {
        setError(data.error);
        return;
      }

      if (!data.token) {
        setError(data.message || "Greška pri prijavi");
        return;
      }

      // 🔥 KLJUČNA IZMJENA — ŠALJEMO CEO OBJEKAT
      login(data);

      // 🔥 REDIRECT
      document.body.classList.remove('dashboard-background');
      navigate("/dashboard");

    } catch (err) {
      console.error(err);
      setError("Greška na serveru");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {loading && <div className="overlay"></div>}

        <h2 className="login-title">Prijava</h2>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email adresa"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="login-input"
          />

          <input
            type="password"
            placeholder="Lozinka"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="login-input"
          />

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Učitavanje..." : "Prijavi se"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginScreen;