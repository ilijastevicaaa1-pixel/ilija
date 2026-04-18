import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/apiFetch.js";

export default function SaasLogin() {
    const [email, setEmail] = useState("saas@test.com");
    const [password, setPassword] = useState("saas123");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await apiFetch("/api/saas/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });

            // Store saas_token
            localStorage.setItem("saas_token", res.token);
            alert("SaaS Login successful! Token stored.");
            navigate("/rozpocet"); // or dashboard
        } catch (err) {
            console.error(err);
            setError(err.message || "Login failed. Check backend :3001 running.");
        } finally {
            setLoading(false);
        }
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
            <h2>SaaS Budget Login</h2>
            <p>Test: saas@test.com / saas123</p>

            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: "100%", marginBottom: 12, padding: 8 }}
                disabled={loading}
            />

            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", marginBottom: 12, padding: 8 }}
                disabled={loading}
            />

            <button type="submit" style={{ width: "100%", padding: 10 }} disabled={loading}>
                {loading ? "Logging in..." : "SaaS Login"}
            </button>

            {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}

            <div style={{ marginTop: 20, fontSize: "0.9em", color: "#666" }}>
                Backend must run on :3001. Tables: User, Transaction, etc.
            </div>
        </form>
    );
}
