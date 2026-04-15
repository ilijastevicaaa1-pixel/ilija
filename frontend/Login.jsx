
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("https://knjigovodstvo-backend.onrender.com/api/login", {
        email,
        password
      });
      // Čuvanje tokena
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError("Pogrešan email ili lozinka");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
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

      {loading && <p>Učitavanje...</p>}
      {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}
      {/* Primer logout dugmeta */}
      {/* <button type="button" onClick={handleLogout}>Logout</button> */}
    </form>
  );
}
