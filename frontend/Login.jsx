import { useState } from "react";
import axios from "axios";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("http://localhost:3001/api/login", {
        email,
        password
      });

      localStorage.setItem("jwt", res.data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      setError("Pogrešan email ili lozinka");
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleLogin}
      style={{
        maxWidth: 320,
        margin: "80px auto",
        padding: 32,
        border: "1px solid #ccc",
        borderRadius: 8,
        background: "#fff"
      }}
    >
      <h2>Prijava</h2>

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

      <button type="submit" style={{ width: "100%", padding: 10 }} disabled={loading}>
        Prijava
      </button>

      {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}
    </form>
  );
}
