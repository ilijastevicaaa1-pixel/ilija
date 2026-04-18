import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function RegisterScreen() {
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Greška pri registraciji");
      login({ token: data.token, tenantId: data.tenantId, role: "admin", email });
      navigate("/dashboard");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", background: "#fff", padding: 24, borderRadius: 8 }}>
      <h2>Registracija firme</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Naziv firme:<br />
            <input value={company} onChange={e => setCompany(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>Email:<br />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>Lozinka:<br />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
        </div>
        {error && <div style={{ color: "red", margin: 8 }}>{error}</div>}
          <button type="submit" disabled={loading}>Registruj</button>
      </form>
      <div style={{ marginTop: 16 }}>
        Već imate nalog? <a href="/login">Prijavite se</a>
      </div>
    </div>
  );
}
