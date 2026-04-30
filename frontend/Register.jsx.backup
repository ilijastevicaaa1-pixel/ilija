import { useState } from "react";
import axios from "axios";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
      // loading sakriven

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      // loading sakriven
        email,
        password
      // loading sakriven
      setSuccess(true);
    } catch (err) {
      setError("Registracija nije uspela");
    }
    setLoading(false);
  }

  return (
    <form
      onSubmit={handleRegister}
      style={{
        maxWidth: 320,
        margin: "80px auto",
        padding: 32,
        border: "1px solid #ccc",
        borderRadius: 8,
        background: "#fff"
      }}
    >
      <h2>Registracija</h2>
      <input
        type="text"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 12, padding: 8 }}
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Lozinka"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 12, padding: 8 }}
        disabled={loading}
      />
      <button type="submit" disabled={loading} style={{ width: "100%", padding: 8 }}>
        {loading ? "Registrujem..." : "Registruj se"}
      </button>
      {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}
      {success && <div style={{ color: "green", marginTop: 12 }}>Uspešna registracija! Prijavite se.</div>}
    </form>
  );
}
