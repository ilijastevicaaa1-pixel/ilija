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
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Ako backend vrati error
      if (data.error) {
        setError(data.error);
        return;
      }

      // Ako nema tokena, prijava nije uspela
      if (!data.token) {
        setError(data.message || "Greška pri prijavi");
        return;
      }

      // Uspešna prijava
      login(data.token);
      navigate("/bot-chat");

    } catch (err) {
      console.error(err);
      setError("Greška na serveru");
    } finally {
      setLoading(false);
    }
  };

  return (
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
        />

        <input
          type="password"
          placeholder="Lozinka"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
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

