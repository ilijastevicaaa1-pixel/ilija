import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // 🔒 DODATO

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true); // 🔒 BLOKADA POČINJE

    try {
      const data = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (
        data.error ||
        data.message === "Korisnik ne postoji" ||
        data.message === "Pogrešna lozinka"
      ) {
        setError(data.message || "Greška pri prijavi");
        return;
      }

      login(data.token);
      navigate("/bot-chat");

    } catch (err) {
      console.error(err);
      setError("Greška na serveru");
    } finally {
      setLoading(false); // 🔒 BLOKADA SE GASI
    }
  };

  return (
    <div className="login-container">

      {/* 🔒 GLOBALNI OVERLAY KOJI BLOKIRA SVE */}
      {loading && <div className="overlay"></div>}

      <h2 className="login-title">Prijava</h2>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email adresa"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading} // 🔒 BLOKADA INPUTA
        />

        <input
          type="password"
          placeholder="Lozinka"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading} // 🔒 BLOKADA INPUTA
        />

        {error && (
          <div style={{ color: "red", marginBottom: 10 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Učitavanje..." : "Prijavi se"}
        </button>
      </form>
    </div>
  );
}

export default LoginScreen;
